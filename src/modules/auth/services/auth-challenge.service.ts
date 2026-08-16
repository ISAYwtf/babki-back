import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
import type { ClientSession, Model } from 'mongoose';
import {
  AuthChallenge,
  AuthChallengeDocument,
} from '../schemas/auth-challenge.schema';

const INVALID_CHALLENGE = 'Invalid authentication challenge.';

@Injectable()
export class AuthChallengeService {
  private readonly ttlSeconds: number;
  private readonly maxFailures: number;

  constructor(
    @InjectModel(AuthChallenge.name)
    private readonly challengeModel: Model<AuthChallengeDocument>,
    configService: ConfigService,
  ) {
    this.ttlSeconds = configService.getOrThrow<number>(
      'twoFactor.challengeTtlSeconds',
    );
    this.maxFailures = configService.getOrThrow<number>(
      'authLimits.challengeFailures',
    );
  }

  async issue(userId: string, authVersion: number, now = new Date()) {
    const challengeToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);
    await this.challengeModel.create({
      tokenDigest: this.digest(challengeToken),
      userId,
      authVersion,
      failedAttempts: 0,
      expiresAt,
      consumedAt: null,
    });
    return { requiresTwoFactor: true as const, challengeToken, expiresAt };
  }

  async resolve(token: string, now = new Date()) {
    const challenge = await this.challengeModel
      .findOne({
        tokenDigest: this.digest(token),
        consumedAt: null,
        failedAttempts: { $lt: this.maxFailures },
        expiresAt: { $gt: now },
      })
      .select('+tokenDigest')
      .lean()
      .exec();
    if (!challenge) {
      throw new UnauthorizedException(INVALID_CHALLENGE);
    }
    return challenge;
  }

  async recordFailure(token: string, now = new Date()) {
    const challenge = await this.challengeModel.findOneAndUpdate(
      {
        tokenDigest: this.digest(token),
        consumedAt: null,
        failedAttempts: { $lt: this.maxFailures },
        expiresAt: { $gt: now },
      },
      { $inc: { failedAttempts: 1 } },
      { returnDocument: 'after' },
    );
    if (!challenge) {
      throw new UnauthorizedException(INVALID_CHALLENGE);
    }
  }

  async consume(
    token: string,
    userId: string,
    authVersion: number,
    session: ClientSession,
    now = new Date(),
  ) {
    const challenge = await this.challengeModel.findOneAndUpdate(
      {
        tokenDigest: this.digest(token),
        userId,
        authVersion,
        consumedAt: null,
        failedAttempts: { $lt: this.maxFailures },
        expiresAt: { $gt: now },
      },
      { $set: { consumedAt: now } },
      { returnDocument: 'after', session },
    );
    if (!challenge) {
      throw new UnauthorizedException(INVALID_CHALLENGE);
    }
    return challenge;
  }

  private digest(token: string) {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
