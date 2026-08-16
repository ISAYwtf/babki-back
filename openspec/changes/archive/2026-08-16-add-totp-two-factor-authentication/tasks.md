## 1. Configuration and Dependency Baseline

- [x] 1.1 Add failing cases to `src/config/configuration.spec.ts` for missing, malformed, short, and unknown-active-key entries in the TOTP encryption and recovery HMAC keyrings; add equivalent coverage for the 32-byte throttle HMAC key, enrollment feature flag, trusted-proxy setting, and authentication limit defaults.
- [x] 1.2 Implement typed parsing and fail-fast validation in `src/config/configuration.ts`, add non-secret example structure to `config/secrets/example.json`, and run `npm run test -- --runInBand configuration.spec.ts` until the configuration cases pass.
- [x] 1.3 Add `otplib` to `package.json` and `package-lock.json`, install the locked dependency, and verify its selected API supports 20-byte secrets, explicit SHA-1/6-digit/30-second settings, URI generation, and matching across an explicit three-step window.
- [x] 1.4 Wire the trusted-proxy configuration into `src/main.ts` so Express honors forwarded client IP only when explicitly configured, then add a focused bootstrap/configuration test or extracted helper test proving forwarded headers are ignored by default.

## 2. Persistence Models and Authentication State

- [x] 2.1 Create failing schema tests for `UserTwoFactor`, `AuthChallenge`, `AuthRateLimit`, and `SecurityAuditEvent` covering unique user/challenge keys, pending and challenge TTL indexes, hidden sensitive fields, defaults, and required enum values.
- [x] 2.2 Create `src/modules/auth/schemas/user-two-factor.schema.ts`, `auth-challenge.schema.ts`, `auth-rate-limit.schema.ts`, and `security-audit-event.schema.ts` with the fields and indexes from `design.md`, then run their focused Jest specs.
- [x] 2.3 Add failing `UsersService` tests for hidden `authVersion = 0`, password reauthentication by user ID, a minimal `UserAuthenticationState`, and an atomic version increment that accepts a `ClientSession`.
- [x] 2.4 Modify `src/modules/users/schemas/user.schema.ts` and `src/modules/users/users.service.ts` to provide `findAuthenticationState`, `findByIdWithPassword`, and `incrementAuthVersion`; ensure normal profile serialization never exposes `passwordHash` or `authVersion`, then run the users and existing auth tests.
- [x] 2.5 Register all new Mongoose models and providers in `src/modules/auth/auth.module.ts`, exporting only services needed outside the module, and compile with `npm run build` to catch dependency-injection errors.

## 3. Cryptographic Primitives

- [x] 3.1 Create `src/modules/auth/services/secret-encryption.service.spec.ts` with failing tests for AES-256-GCM round trips, random 12-byte IVs, user-bound AAD, tampered ciphertext/tag rejection, inactive-key decryption, unknown key IDs, and lazy-rotation metadata.
- [x] 3.2 Implement `SecretEncryptionService` and the `EncryptedSecretEnvelope` type in `src/modules/auth/services/secret-encryption.service.ts` using the configured keyring, then run the focused spec and verify no method logs key material or envelopes.
- [x] 3.3 Create `src/modules/auth/services/totp.service.spec.ts` with failing RFC 6238 vector tests plus project-policy cases for 20-byte secret generation, explicit `otpauth` URI parameters, `-1/0/+1` acceptance, out-of-window rejection, and returning the matched integer time step.
- [x] 3.4 Implement `TotpService` in `src/modules/auth/services/totp.service.ts` with injected or parameterized time for deterministic tests, explicit SHA-1/six-digit/30-second settings, and no window wider than three candidate steps; run the focused spec.
- [x] 3.5 Create `src/modules/auth/services/recovery-code.service.spec.ts` with failing tests for ten unique 16-byte-entropy Crockford Base32 codes, grouped display, case/separator normalization, HMAC-SHA-256 digests, key-ID selection, and invalid-format rejection.
- [x] 3.6 Implement `RecoveryCodeService` and `RecoveryCodeDigest` in `src/modules/auth/services/recovery-code.service.ts`, keeping plaintext values out of persisted types, then run the focused spec.

## 4. JWT Revocation and Existing Authentication

- [x] 4.1 Extend `src/modules/auth/strategies/jwt.strategy.spec.ts` first with failing cases for matching, stale, and missing-zero `authVersion` claims and for nonexistent users.
- [x] 4.2 Update `src/modules/auth/strategies/jwt.strategy.ts` and `src/modules/auth/interfaces/authenticated-user.interface.ts` to validate `authVersion` through `findAuthenticationState` while preserving zero-version compatibility; run the strategy spec.
- [x] 4.3 Extend `src/modules/auth/auth.service.spec.ts` with failing assertions that registration and password-only login sign `{ sub, email, authVersion }`, unknown-email login performs a dummy bcrypt comparison, and password failures remain indistinguishable.
- [x] 4.4 Refactor access-token construction in `src/modules/auth/auth.service.ts` to use the stored authentication state without exposing the version in profiles, add the fixed dummy password hash path, and run all existing auth tests.

## 5. Centralized Throttling and Login Challenges

- [x] 5.1 Create `src/modules/auth/services/auth-throttle.service.spec.ts` with failing cases for HMAC-keyed email/IP buckets, independent scopes, rolling failure windows, default and configured thresholds, reset-on-success, persistent `blockedUntil`, `Retry-After`, and second-factor account blocking after ten failures.
- [x] 5.2 Implement `AuthThrottleService` in `src/modules/auth/services/auth-throttle.service.ts` using atomic MongoDB updates and optional caller-managed sessions; ensure raw email and IP values are never stored, then run the focused spec.
- [x] 5.3 Create `src/modules/auth/services/auth-challenge.service.spec.ts` with failing cases for 32-byte base64url issuance, SHA-256-only persistence, five-minute expiry, five failed attempts, version binding, uniform invalid-state errors, and one-time conditional consumption.
- [x] 5.4 Implement `AuthChallengeService` in `src/modules/auth/services/auth-challenge.service.ts`, treating expiration fields as authoritative rather than relying on TTL cleanup, then run the focused spec.
- [x] 5.5 Add password-throttle cases to `src/modules/auth/auth.service.spec.ts` for normalized email and trusted IP, including `429` plus `Retry-After`, reset after successful password authentication, and identical handling for unknown users; integrate `AuthThrottleService` into password login and rerun the auth suite.

## 6. Security Auditing

- [x] 6.1 Create `src/modules/auth/services/security-audit.service.spec.ts` with failing cases for the five allowed event types, caller-managed sessions, sanitized IP/user-agent context, and recursive rejection or removal of passwords, TOTP data, recovery data, key IDs, ciphertext, digests, challenges, and tokens.
- [x] 6.2 Implement `SecurityAuditService` in `src/modules/auth/services/security-audit.service.ts` and use a narrow typed metadata contract rather than accepting arbitrary request bodies; run the focused spec.

## 7. Two-Factor Lifecycle Orchestration

- [x] 7.1 Create `src/modules/auth/services/two-factor.service.spec.ts` with failing status and setup cases: disabled/pending/enabled projections, password reauthentication, ten-minute pending expiry, encrypted 160-bit secret persistence, frontend `otpauthUri` response, replacement of pending enrollment, and `409` for enabled credentials.
- [x] 7.2 Implement `TwoFactorService.getStatus` and `startSetup` in `src/modules/auth/services/two-factor.service.ts`, including logical `disabled` status for expired pending records and an enrollment feature gate that blocks only new setup creation, then run the focused cases.
- [x] 7.3 Add failing confirmation cases to `two-factor.service.spec.ts` for invalid/expired pending setup, first-time-step replay recording, ten one-time recovery responses, transactional enablement, audit write, `authVersion` increment, post-commit replacement JWT, and rollback behavior.
- [x] 7.4 Implement transactional setup confirmation with `Connection.startSession`, caller-managed helpers, conditional time-step update, recovery digest persistence, and JWT signing only after commit; run the confirmation cases.
- [x] 7.5 Add failing two-factor login cases to `auth.service.spec.ts` and `two-factor.service.spec.ts` for password-to-challenge branching, TOTP completion, recovery completion, stale challenge version, user/challenge attempt counting, reset on success, uniform `401` responses, and concurrent single-winner semantics.
- [x] 7.6 Implement the password login branch plus transactional TOTP/recovery challenge completion, atomically advancing `lastAcceptedTimeStep` or removing one recovery digest together with challenge consumption; run both focused suites.
- [x] 7.7 Add failing disable cases to `two-factor.service.spec.ts` for password plus TOTP, password plus recovery, incomplete step-up rejection, credential deletion, version increment, audit event, replacement JWT, and rollback preserving the enabled credential.
- [x] 7.8 Implement transactional disabling so factor verification/consumption, credential removal, version increment, and audit insertion commit together; run the disable cases.
- [x] 7.9 Add failing recovery-regeneration cases to `two-factor.service.spec.ts` for password-plus-TOTP only, rejection of recovery authorization, old-set invalidation, ten replacement codes, time-step advancement, version increment, audit insertion, and replacement JWT.
- [x] 7.10 Implement transactional recovery-code regeneration and run the complete `TwoFactorService` spec, checking that plaintext codes survive only in the post-commit response.

## 8. HTTP Contracts and Authorization Boundary

- [x] 8.1 Create DTO specs for exact six-digit TOTP values, recovery-code normalization and alphabet, base64url challenge length, `totp | recovery` method selection, password requirements, and global rejection of unexpected fields.
- [x] 8.2 Add `two-factor-login.dto.ts`, `two-factor-setup.dto.ts`, `confirm-two-factor-setup.dto.ts`, `disable-two-factor.dto.ts`, and `regenerate-recovery-codes.dto.ts` under `src/modules/auth/dto/`, then run the DTO specs.
- [x] 8.3 Add controller tests that prove only register, password login, and `POST /auth/login/two-factor` carry public metadata while status, setup, confirmation, disable, and regeneration require the global JWT guard.
- [x] 8.4 Remove the class-level `@Public()` from `src/modules/auth/auth.controller.ts`, add method-level public decorators, implement the six agreed routes and sanitized request-context extraction, and run controller plus auth tests.
- [x] 8.5 Verify every endpoint response matches the spec exactly: no profile/access token before challenge completion, no QR image, plaintext setup secret only while pending, recovery plaintext only on generation, safe status projection, uniform `401`, setup `409`, and throttling `429` with `Retry-After`.

## 9. Transactional Integration and End-to-End Coverage

- [x] 9.1 Add MongoDB-replica-set integration support for authentication tests and write failing tests that concurrently reuse one challenge, one TOTP time step, and one recovery code, asserting exactly one transaction commits in each case.
- [x] 9.2 Complete any conditional filters/session propagation needed for the concurrency tests and run the integration suite against an isolated test database until all single-use guarantees pass.
- [x] 9.3 Create `test/two-factor.e2e-spec.ts` covering setup/confirm, stale-JWT rejection, password/challenge/TOTP login, password/challenge/recovery login, recovery regeneration, disabling, password-only login afterward, uniform invalid-state responses, persistence of blocks across application restart, and proof that disabling new enrollment never bypasses existing or already-pending factors.
- [x] 9.4 Run `npm run test:e2e -- --runInBand` against a MongoDB replica set and fix only behavior required by the approved spec; confirm test cleanup never targets a non-test database.

## 10. Documentation, Security Review, and Release Gate

- [x] 10.1 Update `README.md`, `.env.example`, and `config/secrets/example.json` with endpoint flows, frontend QR responsibility, independent key-generation guidance, keyring rotation/backup rules, NTP/TLS/trusted-proxy requirements, throttle defaults, and the enrollment feature gate without adding usable secrets.
- [x] 10.2 Add tests or static assertions that user profiles, exceptions, request logs, and audit records never contain password hashes, `authVersion`, TOTP values or envelopes, recovery values or digests, challenges or digests, or access tokens.
- [x] 10.3 Run `npm run test -- --runInBand`, `npm run test:e2e -- --runInBand`, `npm run build`, and `npm run lint`; inspect all outputs and resolve failures before marking the change implemented.
- [x] 10.4 Perform the phased release check: deploy with enrollment disabled, verify every instance enforces the new login path and zero-version JWT compatibility, then enable enrollment and document that rollback to password-only binaries is prohibited once any credential is enabled.
