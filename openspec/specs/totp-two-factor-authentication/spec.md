# totp-two-factor-authentication Specification

## Purpose

Defines a secure, optional, self-service TOTP second factor for enrollment, authentication, recovery, lifecycle management, and access-token revocation.

## Requirements

### Requirement: Users can inspect their two-factor status

The system SHALL expose `GET /auth/two-factor` to authenticated users and SHALL return only the factor state (`disabled`, `pending`, or `enabled`) and the number of unused recovery codes. The response MUST NOT expose a TOTP secret, encrypted secret material, recovery-code digests, or challenge data.

#### Scenario: User has no TOTP configuration

- **WHEN** an authenticated user without a two-factor credential requests their status
- **THEN** the system returns `disabled` and zero remaining recovery codes

#### Scenario: User has enabled TOTP

- **WHEN** an authenticated user with an enabled credential requests their status
- **THEN** the system returns `enabled` and the current number of unused recovery codes

#### Scenario: Pending enrollment has expired

- **WHEN** an authenticated user whose pending enrollment has expired requests their status
- **THEN** the system returns `disabled` and zero remaining recovery codes

### Requirement: Users can start TOTP enrollment securely

The system SHALL expose `POST /auth/two-factor/setup` to authenticated users and SHALL require the user's current password. A successful request SHALL create or replace an unexpired pending enrollment, return an `otpauth` URI, the Base32 secret for manual entry, and the enrollment expiration time, and SHALL NOT return a QR image. Pending enrollment SHALL expire after 10 minutes. The system SHALL reject the request with `409 Conflict` when TOTP is already enabled.

#### Scenario: Enrollment starts successfully

- **WHEN** an authenticated user without enabled TOTP supplies their correct password
- **THEN** the system returns the temporary provisioning values needed for the frontend to render a QR code

#### Scenario: Password reauthentication fails

- **WHEN** an authenticated user supplies an incorrect password to the setup endpoint
- **THEN** the system rejects the request without creating or replacing a pending enrollment

#### Scenario: TOTP is already enabled

- **WHEN** an authenticated user with enabled TOTP starts another enrollment
- **THEN** the system returns `409 Conflict` without replacing the active credential

#### Scenario: Enrollment rollout is disabled

- **WHEN** enrollment is disabled by runtime configuration and an eligible user starts setup
- **THEN** the system rejects creation of a new pending enrollment without changing any existing credential

### Requirement: Pending enrollment must be confirmed

The system SHALL expose `POST /auth/two-factor/setup/confirm` to authenticated users and SHALL enable TOTP only after accepting a valid TOTP generated from the pending secret. Confirmation SHALL atomically enable the credential, record the accepted TOTP time step, generate ten recovery codes, increment the user's authentication version, and invalidate the pending enrollment. The response SHALL return the recovery codes exactly once and SHALL include a replacement access token carrying the new authentication version.

#### Scenario: Valid confirmation enables TOTP

- **WHEN** an authenticated user submits a valid code before the pending enrollment expires
- **THEN** the system enables TOTP, returns ten recovery codes and a replacement access token, and rejects the access token used to confirm enrollment on future requests

#### Scenario: Invalid confirmation leaves enrollment pending

- **WHEN** an authenticated user submits an invalid TOTP for an unexpired pending enrollment
- **THEN** the system rejects the request and does not enable TOTP or create recovery codes

#### Scenario: Pending enrollment has expired

- **WHEN** an authenticated user attempts to confirm an expired pending enrollment
- **THEN** the system rejects the request and requires a new setup operation

### Requirement: Password login branches according to factor state

After validating credentials at `POST /auth/login`, the system SHALL return the normal access-token response when TOTP is disabled. When TOTP is enabled, the system SHALL instead return `requiresTwoFactor: true`, a short-lived opaque `challengeToken`, and `expiresAt`, and MUST NOT return an access token or user profile at this stage.

#### Scenario: User without TOTP logs in

- **WHEN** a user with TOTP disabled supplies a valid email and password
- **THEN** the system returns an access token and user profile

#### Scenario: User with TOTP logs in

- **WHEN** a user with TOTP enabled supplies a valid email and password
- **THEN** the system returns only a two-factor challenge and its expiration metadata

#### Scenario: Primary credentials are invalid

- **WHEN** a login request contains an unknown email or incorrect password
- **THEN** the system returns the same `401 Unauthorized` status and response shape in both cases

### Requirement: Login challenges are short-lived and single-use

A two-factor login challenge SHALL expire after five minutes, SHALL permit at most five failed second-factor attempts, SHALL be usable only once, and SHALL be bound to the user and authentication version that existed after password verification. Expired, exhausted, consumed, or version-stale challenges MUST NOT issue an access token.

#### Scenario: Challenge expires

- **WHEN** a second-factor code is submitted more than five minutes after the challenge was created
- **THEN** the system returns `401 Unauthorized` and does not issue an access token

#### Scenario: Challenge is replayed

- **WHEN** a previously completed challenge is submitted again
- **THEN** the system returns `401 Unauthorized` and does not issue another access token

#### Scenario: Authentication state changes during login

- **WHEN** the user's authentication version changes after a challenge is created
- **THEN** the system rejects that challenge even if the supplied second factor is valid

### Requirement: Users can complete login with TOTP or recovery

The system SHALL expose `POST /auth/login/two-factor` as a public endpoint accepting a challenge token, a method of `totp` or `recovery`, and the corresponding code. A successful request SHALL atomically consume the challenge and the accepted factor, then return the normal access-token and user-profile response.

#### Scenario: TOTP completes login

- **WHEN** a user submits a valid, unused TOTP for an active challenge using method `totp`
- **THEN** the system consumes the challenge and returns an access token and user profile

#### Scenario: Recovery code completes login

- **WHEN** a user submits a valid, unused recovery code for an active challenge using method `recovery`
- **THEN** the system consumes both the challenge and recovery code and returns an access token and user profile

#### Scenario: Concurrent challenge completion

- **WHEN** multiple requests concurrently submit a valid factor for the same challenge
- **THEN** exactly one request succeeds and at most one access token is issued

### Requirement: TOTP verification is interoperable and replay-resistant

The system SHALL use RFC 6238 TOTP with a unique cryptographically random 160-bit secret per credential, HMAC-SHA-1, six digits, and a 30-second period. Verification SHALL accept only the previous, current, or next time step relative to synchronized server time and SHALL accept a time step no more than once for a credential.

#### Scenario: Authenticator code is within the clock-skew window

- **WHEN** a valid code belongs to the previous, current, or next 30-second time step and that step has not been accepted before
- **THEN** the system accepts the code

#### Scenario: Authenticator code is outside the clock-skew window

- **WHEN** a valid code belongs to a time step outside the allowed window
- **THEN** the system rejects the code

#### Scenario: Accepted TOTP is replayed

- **WHEN** the same accepted time step is submitted again, including through a concurrent request
- **THEN** the system rejects every later use of that time step

### Requirement: Recovery codes are strong and single-use

Enabling TOTP SHALL generate ten independently random recovery codes with at least 128 bits of entropy each. Plaintext recovery codes SHALL be returned only upon generation, SHALL support a case-insensitive grouped display format, and SHALL never be retrievable later. Each recovery code SHALL be accepted at most once.

#### Scenario: Recovery codes are displayed after enrollment

- **WHEN** pending enrollment is confirmed successfully
- **THEN** the response contains ten distinct plaintext recovery codes and later status requests contain only their remaining count

#### Scenario: Recovery code is reused

- **WHEN** a recovery code that previously completed login or disabled TOTP is submitted again
- **THEN** the system rejects the code

### Requirement: Users can disable TOTP with step-up authentication

The system SHALL expose `POST /auth/two-factor/disable` to authenticated users and SHALL require the current password plus either a current TOTP or an unused recovery code. Successful disabling SHALL atomically remove the two-factor credential and recovery codes, increment the user's authentication version, record a security event, and return a replacement access token.

#### Scenario: TOTP is disabled with a current code

- **WHEN** an authenticated user supplies the correct password and a valid unused TOTP
- **THEN** the system disables TOTP, invalidates existing access tokens, and returns a replacement access token

#### Scenario: TOTP is disabled with a recovery code

- **WHEN** an authenticated user supplies the correct password and a valid unused recovery code
- **THEN** the system consumes the recovery code, disables TOTP, and invalidates existing access tokens

#### Scenario: Step-up authentication is incomplete

- **WHEN** the password or second factor is invalid
- **THEN** the system leaves the credential enabled and returns an authentication error

### Requirement: Users can regenerate recovery codes

The system SHALL expose `POST /auth/two-factor/recovery/regenerate` to authenticated users and SHALL require the current password and a current TOTP. Successful regeneration SHALL atomically invalidate every old recovery code, create ten replacement codes, increment the user's authentication version, record a security event, and return the plaintext replacement codes once with a replacement access token. A recovery code MUST NOT authorize regeneration.

#### Scenario: Recovery codes are regenerated

- **WHEN** an authenticated user supplies the correct password and a valid unused TOTP
- **THEN** the system returns ten replacement recovery codes and a replacement access token and rejects all earlier access tokens and recovery codes

#### Scenario: Recovery code is offered for regeneration

- **WHEN** an authenticated user attempts to authorize regeneration with a recovery code
- **THEN** the system rejects the request without changing the recovery-code set

### Requirement: Access tokens reflect authentication-state changes

Every newly issued access token SHALL carry the user's current authentication version, and protected requests SHALL compare that claim with the current stored version. Confirming enrollment, disabling TOTP, and regenerating recovery codes SHALL each increment the version. During migration, a token without the claim SHALL be treated as version zero, and existing users SHALL default to version zero.

#### Scenario: Token version is current

- **WHEN** a protected request presents a valid access token whose authentication version matches the user
- **THEN** authentication proceeds normally

#### Scenario: Token version is stale

- **WHEN** a protected request presents an otherwise valid access token whose authentication version no longer matches the user
- **THEN** the system returns `401 Unauthorized`

### Requirement: Authentication attempts are centrally rate-limited

Password and second-factor failures SHALL be tracked in MongoDB so limits apply across application instances and restarts. Each challenge SHALL allow at most five failures. A user SHALL be blocked from second-factor verification for 15 minutes after ten second-factor failures within 15 minutes, and creating a new challenge MUST NOT clear this limit. Password failures SHALL use separately configurable limits keyed by a non-reversible representation of normalized email and by trusted client IP. A blocked request SHALL return `429 Too Many Requests` with `Retry-After`.

#### Scenario: Challenge attempt limit is exhausted

- **WHEN** five invalid second factors are submitted for one challenge
- **THEN** the challenge becomes unusable even if a later code is valid

#### Scenario: User-level second-factor limit is exhausted

- **WHEN** ten second-factor failures are recorded for a user within 15 minutes
- **THEN** all second-factor verification for that user is rejected with `429 Too Many Requests` for 15 minutes

#### Scenario: Application restarts during a block

- **WHEN** an application process restarts while an authentication subject is blocked
- **THEN** the block remains effective for its remaining duration

### Requirement: Authentication secrets are protected

TOTP secrets SHALL be encrypted with authenticated encryption before persistence and SHALL be decryptable only with a configured, versioned server key. Recovery codes SHALL be stored only as keyed, non-reversible digests, and challenge tokens SHALL be stored only as non-reversible digests. Encryption, recovery-code digest, throttle-identifier, and JWT signing keys SHALL be independent. The application SHALL fail startup when required key material is absent, malformed, or not 256 bits where a 256-bit key is required.

#### Scenario: Authentication database is read without application keys

- **WHEN** an attacker obtains persisted two-factor, recovery, challenge, and throttle records without server key material
- **THEN** the records do not reveal plaintext TOTP secrets, recovery codes, challenge tokens, email addresses, or passwords

#### Scenario: Cryptographic configuration is invalid

- **WHEN** the application starts with a missing active key, invalid Base64 key, unknown active key identifier, or invalid key length
- **THEN** startup fails with a configuration error before accepting requests

### Requirement: Authentication failures and audit data do not expose secrets

Authentication endpoints SHALL use indistinguishable `401 Unauthorized` responses for equivalent credential failures and SHALL NOT reveal whether a challenge is expired, consumed, exhausted, or unknown. Request logs, error responses, and security audit events MUST NOT contain passwords, TOTP values, plaintext or encrypted TOTP secrets, recovery codes or digests, challenge tokens or digests, or access tokens. Security audit events SHALL record enrollment, disabling, factor blocking, recovery-code use, and recovery-code regeneration with actor, event type, timestamp, and non-secret request context.

#### Scenario: Invalid challenge states are probed

- **WHEN** callers submit unknown, expired, consumed, exhausted, or stale challenge tokens
- **THEN** every case returns the same `401 Unauthorized` response shape

#### Scenario: Security event is recorded

- **WHEN** a security-sensitive two-factor lifecycle event succeeds or a factor becomes blocked
- **THEN** an audit event is stored without any authentication secret or token value

### Requirement: Enrollment rollout controls cannot bypass enabled factors

The system SHALL support disabling creation of new pending TOTP enrollments during phased rollout. This control MUST NOT disable confirmation of an already-created unexpired pending enrollment, second-factor login, recovery login, status inspection, disabling, regeneration, replay protection, rate limiting, or access-token version enforcement for existing credentials.

#### Scenario: Existing credential while enrollment is disabled

- **WHEN** enrollment is disabled by configuration and a user with enabled TOTP supplies a valid password
- **THEN** the system still requires and verifies the second factor before issuing an access token

#### Scenario: Existing pending enrollment while rollout closes

- **WHEN** enrollment is disabled after a user obtained an unexpired pending setup
- **THEN** the user can still confirm that setup until its original expiration time
