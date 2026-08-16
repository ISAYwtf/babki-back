import { AuthChallengeSchema } from './auth-challenge.schema';
import { AuthRateLimitSchema } from './auth-rate-limit.schema';
import { SecurityAuditEventSchema } from './security-audit-event.schema';
import { UserTwoFactorSchema } from './user-two-factor.schema';

describe('authentication persistence schemas', () => {
  it('keeps one hidden two-factor credential per user and expires pending setup', () => {
    expect(UserTwoFactorSchema.path('userId').options.unique).toBe(true);
    expect(UserTwoFactorSchema.path('status').options.enum).toEqual([
      'pending',
      'enabled',
    ]);
    expect(UserTwoFactorSchema.path('secretEnvelope').options.select).toBe(
      false,
    );
    expect(UserTwoFactorSchema.path('recoveryCodes').options.select).toBe(
      false,
    );
    expect(UserTwoFactorSchema.path('failedAttempts').options.default).toBe(0);
    expect(UserTwoFactorSchema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { pendingExpiresAt: 1 },
          expect.objectContaining({
            expireAfterSeconds: 0,
            partialFilterExpression: { status: 'pending' },
          }),
        ],
      ]),
    );
  });

  it('stores only a unique hidden challenge digest and expires challenges', () => {
    expect(AuthChallengeSchema.path('tokenDigest').options).toMatchObject({
      unique: true,
      select: false,
    });
    expect(AuthChallengeSchema.path('failedAttempts').options.default).toBe(0);
    expect(AuthChallengeSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
      ]),
    );
  });

  it('uses independent unique rate-limit scopes and TTL cleanup', () => {
    expect(AuthRateLimitSchema.path('scope').options.enum).toEqual([
      'password_email',
      'password_ip',
    ]);
    expect(AuthRateLimitSchema.path('subjectDigest').options.select).toBe(
      false,
    );
    expect(AuthRateLimitSchema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { scope: 1, subjectDigest: 1 },
          expect.objectContaining({ unique: true }),
        ],
        [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
      ]),
    );
  });

  it('restricts security audit events to the approved event vocabulary', () => {
    expect(SecurityAuditEventSchema.path('type').options.enum).toEqual([
      'two_factor.enrolled',
      'two_factor.disabled',
      'two_factor.blocked',
      'recovery_code.used',
      'recovery_codes.regenerated',
    ]);
    expect(SecurityAuditEventSchema.path('userId').options.required).toBe(true);
  });
});
