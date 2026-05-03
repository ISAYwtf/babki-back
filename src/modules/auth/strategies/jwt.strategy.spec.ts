import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const usersService = {
    findProfile: jest.fn(),
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

  it('returns the authenticated user from a valid payload', async () => {
    usersService.findProfile.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
    });

    await expect(
      strategy.validate({
        sub: '507f1f77bcf86cd799439011',
        email: 'ada@example.com',
      }),
    ).resolves.toEqual({
      userId: '507f1f77bcf86cd799439011',
      email: 'ada@example.com',
    });
  });

  it('rejects tokens for users that no longer exist', async () => {
    usersService.findProfile.mockRejectedValue(new NotFoundException());

    await expect(
      strategy.validate({
        sub: '507f1f77bcf86cd799439011',
        email: 'ada@example.com',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
