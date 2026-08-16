import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthRateLimitScope = 'password_email' | 'password_ip';

@Schema({ timestamps: true })
export class AuthRateLimit {
  @Prop({ required: true, enum: ['password_email', 'password_ip'] })
  scope: AuthRateLimitScope;

  @Prop({ required: true, select: false })
  subjectDigest: string;

  @Prop({ required: true })
  windowStartedAt: Date;

  @Prop({ default: 0 })
  failedAttempts: number;

  @Prop()
  blockedUntil?: Date;

  @Prop({ required: true })
  expiresAt: Date;
}

export const AuthRateLimitSchema = SchemaFactory.createForClass(AuthRateLimit);
AuthRateLimitSchema.index({ scope: 1, subjectDigest: 1 }, { unique: true });
AuthRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AuthRateLimitDocument = HydratedDocument<AuthRateLimit>;
