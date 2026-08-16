import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const usersService = {
    findAuthenticationState: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };

  let strategy: JwtStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  it('returns the authenticated user when token version matches', async () => {
    usersService.findAuthenticationState.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      email: 'ada@example.com',
      authVersion: 3,
    });

    await expect(
      strategy.validate({
        sub: '507f1f77bcf86cd799439011',
        email: 'ada@example.com',
        authVersion: 3,
      }),
    ).resolves.toEqual({
      userId: '507f1f77bcf86cd799439011',
      email: 'ada@example.com',
      authVersion: 3,
    });
  });

  it('treats a missing token version as zero during migration', async () => {
    usersService.findAuthenticationState.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      email: 'ada@example.com',
      authVersion: 0,
    });

    await expect(
      strategy.validate({
        sub: '507f1f77bcf86cd799439011',
        email: 'ada@example.com',
      }),
    ).resolves.toMatchObject({ authVersion: 0 });
  });

  it('rejects a stale token version', async () => {
    usersService.findAuthenticationState.mockResolvedValue({
      userId: '507f1f77bcf86cd799439011',
      email: 'ada@example.com',
      authVersion: 4,
    });

    await expect(
      strategy.validate({
        sub: '507f1f77bcf86cd799439011',
        email: 'ada@example.com',
        authVersion: 3,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tokens for users that no longer exist', async () => {
    usersService.findAuthenticationState.mockRejectedValue(
      new NotFoundException(),
    );

    await expect(
      strategy.validate({
        sub: '507f1f77bcf86cd799439011',
        email: 'ada@example.com',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
