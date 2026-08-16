import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac } from 'node:crypto';
import type { ClientSession, Model } from 'mongoose';
import {
  AuthRateLimit,
  AuthRateLimitDocument,
  AuthRateLimitScope,
} from '../schemas/auth-rate-limit.schema';
import {
  UserTwoFactor,
  UserTwoFactorDocument,
} from '../schemas/user-two-factor.schema';

type AuthLimits = {
  windowSeconds: number;
  blockSeconds: number;
  passwordEmailFailures: number;
  passwordIpFailures: number;
  secondFactorFailures: number;
};

export class AuthRateLimitException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super('Too many authentication attempts.', HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class AuthThrottleService {
  private readonly key: Buffer;
  private readonly limits: AuthLimits;

  constructor(
    @InjectModel(AuthRateLimit.name)
    private readonly rateLimitModel: Model<AuthRateLimitDocument>,
    @InjectModel(UserTwoFactor.name)
    private readonly twoFactorModel: Model<UserTwoFactorDocument>,
    configService: ConfigService,
  ) {
    this.key = configService.getOrThrow<Buffer>('security.throttleHmacKey');
    this.limits = configService.getOrThrow<AuthLimits>('authLimits');
  }

  async assertPasswordAllowed(email: string, ip: string, now = new Date()) {
    const subjects = this.passwordSubjects(email, ip);
    const records = await this.rateLimitModel
      .find({ $or: subjects })
      .select('+subjectDigest')
      .lean()
      .exec();
    const blockedUntil = records
      .map((record) => record.blockedUntil)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (blockedUntil && blockedUntil > now) {
      throw new AuthRateLimitException(
        Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000),
      );
    }
  }

  async recordPasswordFailure(email: string, ip: string, now = new Date()) {
    const subjects = this.passwordSubjects(email, ip);
    await Promise.all(
      subjects.map((subject) =>
        this.recordRateLimitFailure(
          subject.scope,
          subject.subjectDigest,
          subject.scope === 'password_email'
            ? this.limits.passwordEmailFailures
            : this.limits.passwordIpFailures,
          now,
        ),
      ),
    );
  }

  async resetPasswordFailures(email: string, ip: string) {
    await this.rateLimitModel.deleteMany({
      $or: this.passwordSubjects(email, ip),
    });
  }

  async assertSecondFactorAllowed(userId: string, now = new Date()) {
    const credential = await this.twoFactorModel
      .findOne({ userId })
      .select('+blockedUntil')
      .lean()
      .exec();
    if (credential?.blockedUntil && credential.blockedUntil > now) {
      throw new AuthRateLimitException(
        Math.ceil((credential.blockedUntil.getTime() - now.getTime()) / 1000),
      );
    }
  }

  async recordSecondFactorFailure(
    userId: string,
    now = new Date(),
    session?: ClientSession,
  ) {
    const windowStart = new Date(
      now.getTime() - this.limits.windowSeconds * 1000,
    );
    const blockedUntil = new Date(
      now.getTime() + this.limits.blockSeconds * 1000,
    );
    return this.twoFactorModel.findOneAndUpdate(
      { userId },
      [
        {
          $set: {
            failedAttempts: {
              $cond: [
                { $lt: ['$failedWindowStartedAt', windowStart] },
                1,
                { $add: [{ $ifNull: ['$failedAttempts', 0] }, 1] },
              ],
            },
            failedWindowStartedAt: {
              $cond: [
                { $lt: ['$failedWindowStartedAt', windowStart] },
                now,
                { $ifNull: ['$failedWindowStartedAt', now] },
              ],
            },
          },
        },
        {
          $set: {
            blockedUntil: {
              $cond: [
                { $gte: ['$failedAttempts', this.limits.secondFactorFailures] },
                blockedUntil,
                '$blockedUntil',
              ],
            },
          },
        },
      ],
      { returnDocument: 'after', session, updatePipeline: true },
    );
  }

  async resetSecondFactorFailures(userId: string, session?: ClientSession) {
    await this.twoFactorModel.updateOne(
      { userId },
      {
        $set: { failedAttempts: 0 },
        $unset: { blockedUntil: 1, failedWindowStartedAt: 1 },
      },
      { session },
    );
  }

  private passwordSubjects(email: string, ip: string) {
    return [
      {
        scope: 'password_email' as const,
        subjectDigest: this.digest(
          'password_email',
          email.trim().toLowerCase(),
        ),
      },
      {
        scope: 'password_ip' as const,
        subjectDigest: this.digest('password_ip', ip),
      },
    ];
  }

  private digest(scope: AuthRateLimitScope, subject: string) {
    return createHmac('sha256', this.key)
      .update(`${scope}:${subject}`, 'utf8')
      .digest('hex');
  }

  private recordRateLimitFailure(
    scope: AuthRateLimitScope,
    subjectDigest: string,
    limit: number,
    now: Date,
  ) {
    const windowStart = new Date(
      now.getTime() - this.limits.windowSeconds * 1000,
    );
    const blockedUntil = new Date(
      now.getTime() + this.limits.blockSeconds * 1000,
    );
    return this.rateLimitModel.findOneAndUpdate(
      { scope, subjectDigest },
      [
        {
          $set: {
            scope,
            subjectDigest,
            failedAttempts: {
              $cond: [
                { $lt: ['$windowStartedAt', windowStart] },
                1,
                { $add: [{ $ifNull: ['$failedAttempts', 0] }, 1] },
              ],
            },
            windowStartedAt: {
              $cond: [
                { $lt: ['$windowStartedAt', windowStart] },
                now,
                { $ifNull: ['$windowStartedAt', now] },
              ],
            },
          },
        },
        {
          $set: {
            blockedUntil: {
              $cond: [
                { $gte: ['$failedAttempts', limit] },
                blockedUntil,
                '$blockedUntil',
              ],
            },
            expiresAt: blockedUntil,
          },
        },
      ],
      { upsert: true, returnDocument: 'after', updatePipeline: true },
    );
  }
}
