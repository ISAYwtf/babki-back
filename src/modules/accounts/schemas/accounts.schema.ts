import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type AccountDocument = HydratedDocument<Account>;

// TODO Добавить валюту
@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name, unique: true })
  userId: Types.ObjectId;
}

export const AccountsSchema = SchemaFactory.createForClass(Account);

AccountsSchema.index({ userId: 1 }, { unique: true });
