import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TwoFactorStatus = 'pending' | 'enabled';

@Schema({ _id: false })
export class EncryptedSecretEnvelope {
  @Prop({ required: true, enum: [1] })
  formatVersion: 1;

  @Prop({ required: true })
  keyId: string;

  @Prop({ required: true })
  iv: string;

  @Prop({ required: true })
  ciphertext: string;

  @Prop({ required: true })
  authTag: string;
}

const EncryptedSecretEnvelopeSchema = SchemaFactory.createForClass(
  EncryptedSecretEnvelope,
);

@Schema({ _id: false })
export class RecoveryCodeDigest {
  @Prop({ required: true })
  keyId: string;

  @Prop({ required: true })
  digest: string;
}

const RecoveryCodeDigestSchema =
  SchemaFactory.createForClass(RecoveryCodeDigest);

@Schema({ timestamps: true })
export class UserTwoFactor {
  @Prop({ required: true, unique: true, index: true, type: Types.ObjectId })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['pending', 'enabled'] })
  status: TwoFactorStatus;

  @Prop({
    required: true,
    select: false,
    type: EncryptedSecretEnvelopeSchema,
  })
  secretEnvelope: EncryptedSecretEnvelope;

  @Prop({ select: false })
  pendingExpiresAt?: Date;

  @Prop({
    default: [],
    select: false,
    type: [RecoveryCodeDigestSchema],
  })
  recoveryCodes: RecoveryCodeDigest[];

  @Prop({ select: false })
  lastAcceptedTimeStep?: number;

  @Prop({ select: false })
  failedWindowStartedAt?: Date;

  @Prop({ default: 0, select: false })
  failedAttempts: number;

  @Prop({ select: false })
  blockedUntil?: Date;
}

export const UserTwoFactorSchema = SchemaFactory.createForClass(UserTwoFactor);

UserTwoFactorSchema.index(
  { pendingExpiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: 'pending' },
  },
);

export type UserTwoFactorDocument = HydratedDocument<UserTwoFactor>;
