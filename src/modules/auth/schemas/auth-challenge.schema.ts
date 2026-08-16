import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class AuthChallenge {
  @Prop({ required: true, unique: true, select: false })
  tokenDigest: string;

  @Prop({ required: true, index: true, type: Types.ObjectId })
  userId: Types.ObjectId;

  @Prop({ required: true })
  authVersion: number;

  @Prop({ default: 0 })
  failedAttempts: number;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  consumedAt?: Date | null;
}

export const AuthChallengeSchema = SchemaFactory.createForClass(AuthChallenge);
AuthChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AuthChallengeDocument = HydratedDocument<AuthChallenge>;
