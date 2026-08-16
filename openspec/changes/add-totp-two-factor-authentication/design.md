## Context

The API currently has one public `AuthController` whose class-level `@Public()` decorator exposes registration and password login. `AuthService.login` verifies bcrypt and immediately signs a long-lived access JWT containing `{ sub, email }`. The global JWT guard checks that the user still exists but has no session-revocation claim. User documents contain only profile data and a hidden password hash; there is no second-factor or centralized authentication-throttle state.

This change crosses authentication, users, configuration, persistence, and operational security. MongoDB already runs as a replica set, so transactions can provide the required one-time and concurrent-update guarantees without introducing Redis. See `proposal.md` for motivation and `specs/totp-two-factor-authentication/spec.md` for the behavioral contract.

## Goals / Non-Goals

**Goals:**

- Keep password-only behavior unchanged for users who do not enable TOTP.
- Make every login challenge, TOTP time step, and recovery code single-use under concurrent requests.
- Keep recoverable TOTP material encrypted outside normal user serialization and support key rotation.
- Revoke previously issued JWTs after any completed 2FA configuration change.
- Apply attempt limits consistently across processes and restarts.
- Keep cryptographic operations and lifecycle orchestration in independently testable components.
- Provide a deployment path that never allows an enrolled user to fall back to password-only authentication.

**Non-Goals:**

- WebAuthn/passkeys, SMS or email OTP, trusted devices, and remembered browsers.
- Administrator-assisted MFA reset or automated security notifications.
- Backend QR image generation; the frontend renders the QR from `otpauthUri`.
- Refresh tokens or a general session-management redesign.
- Making TOTP phishing-resistant; a future WebAuthn capability is required for that property.

## Decisions

### 1. Use a two-step login with a persisted opaque challenge

After password verification, a 2FA-enabled account receives a cryptographically random 32-byte base64url challenge token. MongoDB stores only its SHA-256 digest along with `userId`, `authVersion`, `failedAttempts`, `expiresAt`, and `consumedAt`. A unique digest index prevents collisions, and a TTL index removes expired records; application validation always checks `expiresAt` because TTL cleanup is asynchronous.

The challenge lives for five minutes, permits five failures, and is consumed in the same transaction as the accepted second factor. The response to password login contains only `requiresTwoFactor`, the opaque token, and expiration time.

Alternatives considered:

- A short-lived challenge JWT avoids one initial lookup but still needs server state for one-time consumption, attempt counting, and revocation. It also risks being confused with an access JWT.
- Supplying password and TOTP in one request makes clients know factor state in advance and tangles password, recovery, and second-factor limits.

### 2. Separate credentials from the user profile

Add `authVersion` to `User` with a default of zero and exclude it from normal profile selection. Add a separate `UserTwoFactor` collection with one unique document per user:

```text
UserTwoFactor
  userId                 unique
  status                 pending | enabled
  secretEnvelope         formatVersion, keyId, iv, ciphertext, authTag
  pendingExpiresAt       set only while pending
  recoveryCodes[]        keyId, digest
  lastAcceptedTimeStep
  failedWindowStartedAt
  failedAttempts
  blockedUntil
  timestamps
```

Absence of a document means disabled. A pending document expires after ten minutes through a partial TTL index on `pendingExpiresAt`; service logic also checks the timestamp. Confirmation unsets `pendingExpiresAt`, changes the status, stores recovery digests, and records the first accepted time step.

Keeping this material separate prevents accidental exposure through `UsersService.serializeUser` and gives credential lifecycle operations a focused aggregate. Embedding it in `User` was rejected because profile reads and updates are much more common and because hidden cryptographic fields become easier to select or serialize accidentally.

### 3. Split responsibilities into focused services

```text
AuthService
  password verification, login branch, access-token response
        |
        +-- TwoFactorService
        |     setup, confirm, disable, regenerate, transactional orchestration
        +-- AuthChallengeService
        |     issue, resolve, count failures, consume
        +-- AuthThrottleService
              password and account-level second-factor limits

TotpService                 RFC 6238 generation, URI, matched time step
SecretEncryptionService     AES-256-GCM envelope and encryption keyring
RecoveryCodeService         generation, normalization, keyed digests
SecurityAuditService        sanitized security events
```

`AuthService` remains responsible for the existing password flow and access-token response. `TwoFactorService` owns lifecycle transitions but delegates cryptographic primitives. Services accept a MongoDB `ClientSession` where a caller must compose them into one transaction, matching the repository's existing caller-managed session pattern.

The class-level `@Public()` must be removed from `AuthController`. Only registration, password login, and challenge completion are marked `@Public()` at method level; status and management endpoints remain behind the global JWT guard. A separate management controller is also acceptable if it preserves the exact public/protected boundary.

### 4. Use standard TOTP parameters and explicitly track replay

Use current `otplib` APIs with a 20-byte CSPRNG secret, HMAC-SHA-1, six digits, and a 30-second period. SHA-1 is used only as the RFC 6238 HMAC construction and maximizes authenticator compatibility. The provisioning URI includes an application issuer, the user's email as account label, and explicit algorithm, digits, and period values.

`TotpService.verify` returns the matched integer time step, not only a boolean. It evaluates the previous, current, and next steps and rejects any match whose step is less than or equal to `lastAcceptedTimeStep`. The final compare-and-update is conditional inside the transaction so concurrent submissions of one code cannot both succeed. Server clocks must be NTP-synchronized; widening the window beyond one step in each direction is not allowed.

### 5. Encrypt TOTP secrets with an authenticated, rotatable envelope

Encrypt the Base32 TOTP secret using AES-256-GCM with a fresh random 12-byte IV per encryption. The envelope stores a format version, key identifier, IV, ciphertext, and authentication tag. Associated authenticated data is a stable versioned string containing the credential purpose and user ID, such as `totp-secret:v1:<userId>`, so ciphertext cannot be moved between accounts undetected.

Configuration supplies an encryption keyring and an active key identifier. Each key is exactly 32 decoded bytes and lives outside MongoDB and source control. Reads select the key by stored `keyId`; an unknown identifier or failed authentication tag is a hard credential error. After successful verification, a credential encrypted by an inactive key is lazily re-encrypted with the active key as part of the next credential update. Old keys remain configured until no envelope references them.

Hashing the TOTP secret was rejected because the verifier must reproduce TOTP values. Using the JWT secret was rejected because independent purposes need independent keys and rotation schedules.

### 6. Generate high-entropy recovery codes and store only keyed digests

Generate ten codes from independent 16-byte CSPRNG values and encode them as case-insensitive Crockford Base32 strings grouped with hyphens for display. Normalization removes separators and canonicalizes case before verification. This preserves 128 bits of entropy while making manual transcription manageable.

Store `HMAC-SHA-256(recoveryKey, normalizedCode)` plus its key identifier. The recovery HMAC keyring is independent of encryption, throttle, and JWT keys. The active key signs new codes; stored `keyId` selects the verification key for old codes. Old HMAC keys remain until all corresponding codes are consumed or regenerated because a digest cannot be migrated without plaintext.

HMAC is preferred over password hashing because the codes are uniformly random and high entropy. A database-only compromise cannot test codes without the server key, while verification remains efficient. Plaintext codes exist only in the generation response and short-lived local variables.

### 7. Version access tokens instead of maintaining a JWT denylist

Every new JWT includes `authVersion`. `JwtStrategy` uses a dedicated user authentication-state query and rejects a token whose version differs from the stored value. Missing claims are interpreted as zero during migration, and existing users default to zero.

Enrollment confirmation, disabling, and recovery-code regeneration increment the version inside the same transaction as the credential change. JWT signing occurs only after commit and uses the newly returned version. Starting or replacing a pending enrollment does not increment the version because no active authentication state has changed.

A per-token denylist was rejected because configuration changes need to invalidate every existing JWT, not individual tokens, and a version counter achieves that with the user lookup the JWT strategy already performs.

### 8. Persist layered throttling in MongoDB

Challenge-level failures are stored on `AuthChallenge`. Account-level second-factor failures and `blockedUntil` are stored on `UserTwoFactor`, shared by login and management operations. Ten failures within 15 minutes block second-factor verification for 15 minutes; a successful complete authentication resets the account-level window.

Anonymous password limits use an `AuthRateLimit` collection keyed by `scope` plus `HMAC-SHA-256(throttleKey, normalizedSubject)`. Separate scopes cover normalized email and trusted client IP. Defaults are five failures per email and 50 per IP per 15 minutes, each followed by a 15-minute block, and remain runtime-configurable. The HMAC key is independent of every other key. TTL cleanup removes stale buckets, but enforcement checks timestamps explicitly.

Email and IP bucket updates occur together when possible. An unknown email follows the same bcrypt work using a fixed dummy hash and the same throttle path to reduce account-enumeration signals. The application uses `request.ip`; forwarded headers affect it only when an explicit trusted-proxy setting is configured.

In-memory limits were rejected because restarts and multiple instances bypass them. Redis was rejected for the first release because MongoDB transactions and atomic updates meet the expected load without new infrastructure.

### 9. Make all factor consumption and lifecycle transitions atomic

The following operations use MongoDB transactions and conditional writes:

- Confirm enrollment: verify pending state, conditionally record the matched step, enable the credential, store ten recovery digests, increment `authVersion`, and add an audit event.
- Complete with TOTP: conditionally advance `lastAcceptedTimeStep`, consume the challenge, reset the second-factor failure window, and add any required audit event.
- Complete with recovery: remove exactly one matching recovery digest, consume the challenge, reset the failure window, and record recovery use.
- Disable: verify password and factor, consume the factor where applicable, delete the credential, increment `authVersion`, and record disabling.
- Regenerate: verify password and TOTP, conditionally advance the time step, replace the entire recovery set, increment `authVersion`, and record regeneration.

When concurrent operations touch the same credential or challenge, write conflicts and conditional predicates ensure only one commits. Access tokens and plaintext recovery-code responses are produced only after commit. If a client loses the confirmation response, TOTP remains usable and the user can authenticate and regenerate recovery codes.

### 10. Use explicit DTOs and uniform authentication errors

New DTOs constrain TOTP to six decimal digits, recovery values to the normalized code alphabet and length, challenge tokens to the expected base64url form, and method to `totp | recovery`. Global whitelist validation continues rejecting extra fields.

Unknown email and wrong password share one `401` response. Unknown, expired, consumed, exhausted, and version-stale challenges share another uniform `401` response shape. Invalid TOTP and recovery values are indistinguishable. Rate limits return `429` with `Retry-After`; an already-enabled setup returns `409`.

The existing request logger records only method, URL, and duration and can remain unchanged. DTOs, exceptions, audit metadata, and any new diagnostic logging must never include raw request bodies or authentication material.

### 11. Record narrow security audit events

Add a `SecurityAuditEvent` collection for `two_factor.enrolled`, `two_factor.disabled`, `two_factor.blocked`, `recovery_code.used`, and `recovery_codes.regenerated`. Events include user ID, timestamp, event type, and sanitized request context such as trusted IP and user-agent. They exclude passwords, codes, key IDs, ciphertext, digests, challenges, and tokens. Audit writes that describe successful state changes join the same transaction as those changes.

## Risks / Trade-offs

- **[TOTP is phishable]** → State this limitation in product guidance and treat WebAuthn/passkeys as the future phishing-resistant factor.
- **[Server clock drift rejects valid codes or expands replay risk]** → Require NTP monitoring and keep the verification window fixed at one adjacent step in each direction.
- **[Loss of an encryption key locks enrolled users out]** → Back up and access-control the complete keyring; do not remove a key while database records reference it.
- **[Database transactions add latency to login]** → Keep documents and indexes narrow, transact only the one-time state transition, and sign JWTs after commit.
- **[Password IP limits can affect users behind NAT]** → Use a substantially higher configurable IP threshold than the per-email threshold and trust proxy headers only through explicit deployment configuration.
- **[Recovery codes can be lost when a successful response is not received]** → The configured authenticator remains usable, allowing the user to log in and regenerate a new set.
- **[TTL deletion is not immediate]** → Treat expiration timestamps as authoritative in application queries; TTL indexes are cleanup only.
- **[Rolling back to password-only code would bypass enrolled factors]** → Use the phased migration below and prohibit old authentication binaries once enrollment is enabled.
- **[Lazy encryption rotation may leave rarely used credentials on old keys]** → Track envelope key IDs operationally and retain old keys until usage reaches zero; add a controlled re-encryption job later if required.

## Migration Plan

1. Provision separate encryption, recovery-HMAC, and throttle-HMAC key material in every environment and verify backup/rotation procedures. Configure trusted proxies and server clock monitoring.
2. Deploy schema, indexes, JWT version compatibility, challenge enforcement, and all endpoints with creation of new TOTP enrollments disabled by configuration. The flag gates only `POST /auth/two-factor/setup`; it never bypasses confirmation of an existing unexpired setup, login enforcement, factor management, throttling, replay checks, or JWT version validation. Existing users and JWTs without `authVersion` continue as version zero.
3. Confirm all application instances run the new authentication code, run unit/integration/e2e verification against a MongoDB replica set, and exercise key-configuration startup failures.
4. Enable enrollment. From this point, do not roll authentication traffic back to a version that does not enforce TOTP. Emergency response is to disable login traffic and forward-fix, not to restore password-only behavior.
5. Monitor authentication failures, blocks, recovery use, MongoDB transaction conflicts, and distribution of encryption key IDs without logging authentication values.

Before enrollment is enabled, rollback consists of restoring the previous binary and leaving unused collections in place. After any credential is enabled, rollback is limited to a release that still understands and enforces `UserTwoFactor`; database documents and keyrings must be preserved.
