import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  AuthChallenge,
  AuthChallengeSchema,
} from './schemas/auth-challenge.schema';
import {
  AuthRateLimit,
  AuthRateLimitSchema,
} from './schemas/auth-rate-limit.schema';
import {
  SecurityAuditEvent,
  SecurityAuditEventSchema,
} from './schemas/security-audit-event.schema';
import {
  UserTwoFactor,
  UserTwoFactorSchema,
} from './schemas/user-two-factor.schema';
import { AuthChallengeService } from './services/auth-challenge.service';
import { AuthThrottleService } from './services/auth-throttle.service';
import { RecoveryCodeService } from './services/recovery-code.service';
import { SecretEncryptionService } from './services/secret-encryption.service';
import { SecurityAuditService } from './services/security-audit.service';
import { TotpService } from './services/totp.service';
import { TwoFactorService } from './services/two-factor.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: UserTwoFactor.name, schema: UserTwoFactorSchema },
      { name: AuthChallenge.name, schema: AuthChallengeSchema },
      { name: AuthRateLimit.name, schema: AuthRateLimitSchema },
      { name: SecurityAuditEvent.name, schema: SecurityAuditEventSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>(
            'jwt.expiresIn',
          ) as NonNullable<JwtModuleOptions['signOptions']>['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AuthChallengeService,
    AuthThrottleService,
    RecoveryCodeService,
    SecretEncryptionService,
    SecurityAuditService,
    TotpService,
    TwoFactorService,
  ],
})
export class AuthModule {}
