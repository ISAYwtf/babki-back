import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type AccountDocument = HydratedDocument<Account>;

// TODO Добавить валюту
@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true })
  asOfDate: Date;
}

export const AccountsSchema = SchemaFactory.createForClass(Account);

AccountsSchema.index({ userId: 1, asOfDate: -1 });
AccountsSchema.index({ userId: 1, asOfDate: 1 }, { unique: true });
