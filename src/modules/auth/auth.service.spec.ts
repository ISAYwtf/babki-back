import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const profile = {
    _id: userId,
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    currency: 'USD',
  };
  const usersService = {
    createWithPassword: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findProfile: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
  };

  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    usersService.findProfile.mockResolvedValue(profile);
    jwtService.signAsync.mockResolvedValue('signed.jwt.token');
  });

  it('registers users with a hashed password and returns an access token', async () => {
    let capturedPasswordHash = '';
    usersService.createWithPassword.mockImplementation(
      (_createUserDto: unknown, passwordHash: string) => {
        capturedPasswordHash = passwordHash;

        return Promise.resolve(profile);
      },
    );

    const result = await service.register({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'Ada@Example.com',
      password: 'password123',
      currency: 'USD',
    });

    expect(usersService.createWithPassword).toHaveBeenCalledWith(
      {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'Ada@Example.com',
        currency: 'USD',
        birthDate: undefined,
        notes: undefined,
      },
      expect.any(String),
    );
    expect(capturedPasswordHash).not.toBe('password123');
    await expect(
      bcrypt.compare('password123', capturedPasswordHash),
    ).resolves.toBe(true);
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: userId,
      email: profile.email,
    });
    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      user: profile,
    });
  });

  it('bubbles duplicate email conflicts from user creation', async () => {
    usersService.createWithPassword.mockRejectedValue(
      new ConflictException('A user with this email already exists.'),
    );

    await expect(
      service.register({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        password: 'password123',
        currency: 'USD',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with a valid password', async () => {
    const passwordHash = await bcrypt.hash('password123', 4);
    usersService.findByEmailWithPassword.mockResolvedValue({
      ...profile,
      passwordHash,
    });

    const result = await service.login({
      email: 'ada@example.com',
      password: 'password123',
    });

    expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith(
      'ada@example.com',
    );
    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      user: profile,
    });
  });

  it('rejects login without revealing whether the email exists', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login when the password is invalid', async () => {
    const passwordHash = await bcrypt.hash('password123', 4);
    usersService.findByEmailWithPassword.mockResolvedValue({
      ...profile,
      passwordHash,
    });

    await expect(
      service.login({
        email: 'ada@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
