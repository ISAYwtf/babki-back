import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type BalanceDocument = HydratedDocument<Balance>;

@Schema({ timestamps: true })
export class Balance {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  currentAccountAmount: number;

  @Prop({ required: true, min: 0 })
  savingsAmount: number;

  @Prop({ required: true })
  asOfDate: Date;
}

export const BalanceSchema = SchemaFactory.createForClass(Balance);

BalanceSchema.index({ userId: 1, asOfDate: -1 });
BalanceSchema.index({ userId: 1, asOfDate: 1 }, { unique: true });
