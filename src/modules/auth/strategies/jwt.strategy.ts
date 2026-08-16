import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

type JwtPayload = {
  sub: string;
  email: string;
  authVersion?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const tokenAuthVersion = payload.authVersion ?? 0;
    try {
      const state = await this.usersService.findAuthenticationState(
        payload.sub,
      );
      if (state.authVersion !== tokenAuthVersion) {
        throw new UnauthorizedException();
      }

      return state;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
