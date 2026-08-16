import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthChallengeService } from './auth-challenge.service';

describe('AuthChallengeService', () => {
  const model = {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const service = new AuthChallengeService(
    model as never,
    new ConfigService({
      twoFactor: { challengeTtlSeconds: 300 },
      authLimits: { challengeFailures: 5 },
    }),
  );

  beforeEach(() => jest.clearAllMocks());

  it('issues a 32-byte opaque token while persisting only its digest', async () => {
    model.create.mockResolvedValue({});

    const result = await service.issue(
      '507f1f77bcf86cd799439011',
      3,
      new Date('2026-01-01T00:00:00Z'),
    );

    expect(Buffer.from(result.challengeToken, 'base64url')).toHaveLength(32);
    expect(result.expiresAt).toEqual(new Date('2026-01-01T00:05:00Z'));
    const persisted = model.create.mock.calls[0][0];
    expect(persisted.tokenDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(persisted)).not.toContain(result.challengeToken);
  });

  it.each(['unknown', 'expired', 'consumed', 'exhausted', 'stale'])(
    'uses one unauthorized response for an %s challenge',
    async () => {
      model.findOne.mockReturnValue({
        select: () => ({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
      });

      await expect(
        service.resolve('a'.repeat(43), new Date('2026-01-01T00:00:00Z')),
      ).rejects.toEqual(
        new UnauthorizedException('Invalid authentication challenge.'),
      );
    },
  );

  it('resolves the stored user and version from the opaque token', async () => {
    const stored = {
      userId: '507f1f77bcf86cd799439011',
      authVersion: 3,
    };
    model.findOne.mockReturnValue({
      select: () => ({ lean: () => ({ exec: () => Promise.resolve(stored) }) }),
    });

    await expect(
      service.resolve('a'.repeat(43), new Date('2026-01-01T00:00:00Z')),
    ).resolves.toEqual(stored);
    expect(model.findOne.mock.calls[0][0]).not.toHaveProperty('authVersion');
  });

  it('consumes an active challenge only through a conditional update', async () => {
    model.findOneAndUpdate.mockResolvedValue({ _id: 'challenge-id' });
    const session = {} as never;

    await service.consume(
      'a'.repeat(43),
      '507f1f77bcf86cd799439011',
      3,
      session,
      new Date('2026-01-01T00:00:00Z'),
    );

    expect(model.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
      userId: '507f1f77bcf86cd799439011',
      authVersion: 3,
      consumedAt: null,
      failedAttempts: { $lt: 5 },
      expiresAt: { $gt: new Date('2026-01-01T00:00:00Z') },
    });
  });
});
