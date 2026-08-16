import { ConfigService } from '@nestjs/config';
import {
  AuthRateLimitException,
  AuthThrottleService,
} from './auth-throttle.service';

describe('AuthThrottleService', () => {
  const rateLimitModel = {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
  };
  const twoFactorModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  };
  const service = new AuthThrottleService(
    rateLimitModel as never,
    twoFactorModel as never,
    new ConfigService({
      security: { throttleHmacKey: Buffer.alloc(32, 7) },
      authLimits: {
        windowSeconds: 900,
        blockSeconds: 900,
        passwordEmailFailures: 5,
        passwordIpFailures: 50,
        secondFactorFailures: 10,
      },
    }),
  );

  beforeEach(() => jest.clearAllMocks());

  it('persists independent keyed identifiers instead of raw email and IP', async () => {
    rateLimitModel.findOneAndUpdate.mockResolvedValue({});

    await service.recordPasswordFailure(
      ' Ada@Example.com ',
      '203.0.113.10',
      new Date('2026-01-01T00:00:00Z'),
    );

    const calls = JSON.stringify(rateLimitModel.findOneAndUpdate.mock.calls);
    expect(calls).not.toContain('ada@example.com');
    expect(calls).not.toContain('203.0.113.10');
    const [emailFilter] = rateLimitModel.findOneAndUpdate.mock.calls[0];
    const [ipFilter] = rateLimitModel.findOneAndUpdate.mock.calls[1];
    expect(emailFilter.scope).toBe('password_email');
    expect(ipFilter.scope).toBe('password_ip');
    expect(emailFilter.subjectDigest).not.toBe(ipFilter.subjectDigest);
  });

  it('returns a retry duration for a persisted password block', async () => {
    rateLimitModel.find.mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: () =>
            Promise.resolve([
              { blockedUntil: new Date('2026-01-01T00:10:00Z') },
            ]),
        }),
      }),
    });

    const error = await service
      .assertPasswordAllowed(
        'ada@example.com',
        '203.0.113.10',
        new Date('2026-01-01T00:00:00Z'),
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthRateLimitException);
    expect((error as AuthRateLimitException).retryAfterSeconds).toBe(600);
  });

  it('persists a second-factor block after the configured failure threshold', async () => {
    const session = {} as never;
    twoFactorModel.findOneAndUpdate.mockResolvedValue({
      failedAttempts: 10,
      blockedUntil: new Date('2026-01-01T00:15:00Z'),
    });

    const result = await service.recordSecondFactorFailure(
      '507f1f77bcf86cd799439011',
      new Date('2026-01-01T00:00:00Z'),
      session,
    );

    const update = twoFactorModel.findOneAndUpdate.mock.calls[0][1];
    expect(JSON.stringify(update)).toContain('blockedUntil');
    expect(twoFactorModel.findOneAndUpdate.mock.calls[0][2]).toEqual({
      returnDocument: 'after',
      session,
      updatePipeline: true,
    });
    expect(result).toMatchObject({ failedAttempts: 10 });
  });

  it('resets second-factor failures after complete authentication', async () => {
    twoFactorModel.updateOne.mockResolvedValue({ acknowledged: true });

    await service.resetSecondFactorFailures('507f1f77bcf86cd799439011');

    expect(twoFactorModel.updateOne.mock.calls[0][1]).toEqual({
      $set: { failedAttempts: 0 },
      $unset: { blockedUntil: 1, failedWindowStartedAt: 1 },
    });
  });
});
