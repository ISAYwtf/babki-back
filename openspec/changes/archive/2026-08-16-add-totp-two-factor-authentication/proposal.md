## Why

Password-only authentication leaves financial accounts exposed when credentials are reused, phished, or leaked. Users need an optional, self-service second factor that is secure to enroll, use, recover, rotate, and disable without creating an MFA bypass path.

## What Changes

- Add optional TOTP enrollment with an `otpauth` URI and Base32 secret for frontend-generated QR codes.
- Require confirmation of a newly enrolled authenticator before enabling 2FA and return one-time recovery codes after confirmation.
- Split login for 2FA-enabled users into password verification followed by a short-lived, single-use opaque challenge completed with TOTP or a recovery code.
- Add authenticated endpoints to inspect 2FA status, disable 2FA, and regenerate recovery codes with password and second-factor reauthentication.
- Revoke existing access tokens whenever 2FA configuration changes by versioning user authentication state.
- Encrypt TOTP secrets at rest with a rotatable application keyring, store only keyed digests of recovery codes and non-reversible digests of challenge tokens, and prevent accepted TOTP periods from being replayed.
- Persist password and second-factor throttling state in MongoDB so limits apply across processes and restarts.
- Add security audit events for enrollment, disabling, blocking, and recovery-code use without logging authentication secrets.

## Capabilities

### New Capabilities

- `totp-two-factor-authentication`: Optional TOTP enrollment, two-step login, recovery codes, factor management, token revocation, replay protection, and authentication throttling.

### Modified Capabilities

None. The repository has no existing OpenSpec authentication capability; the new capability specifies both the added behavior and the affected login contract.

## Impact

- Affects the `auth` and `users` modules, JWT payload validation, runtime secret configuration, request DTOs, and authentication tests.
- Adds MongoDB persistence and indexes for 2FA state, login challenges, throttling, and security audit events.
- Adds a TOTP library such as `otplib`; QR image generation remains a frontend responsibility.
- Requires a MongoDB replica set for atomic authentication transitions, synchronized server time, TLS at the ingress, and explicit trusted-proxy configuration when client IP throttling is enabled.
- Introduces separate encryption and HMAC keys that must be managed independently of `JWT_SECRET`.
