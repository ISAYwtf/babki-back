import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const passwordHash = await bcrypt.hash(
      registerDto.password,
      PASSWORD_SALT_ROUNDS,
    );
    const user = await this.usersService.createWithPassword(
      {
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        email: registerDto.email,
        currency: registerDto.currency,
        birthDate: registerDto.birthDate,
        notes: registerDto.notes,
      },
      passwordHash,
    );

    return this.buildAuthResponse({
      userId: String(user._id),
      email: user.email,
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordsMatch = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordsMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse({
      userId: String(user._id),
      email: user.email,
    });
  }

  private async buildAuthResponse(user: AuthenticatedUser) {
    const profile = await this.usersService.findProfile(user.userId);
    const accessToken = await this.jwtService.signAsync({
      sub: user.userId,
      email: user.email,
    });

    return {
      accessToken,
      user: profile,
    };
  }
}
