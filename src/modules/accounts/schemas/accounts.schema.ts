import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schema';

export const accountTypes = ['balance', 'saving'] as const;
export type AccountType = (typeof accountTypes)[number];

export type AccountDocument = HydratedDocument<Account>;

// TODO Добавить валюту
@Schema({ timestamps: true, discriminatorKey: 'type' })
export class Account {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  type: AccountType;
}

export const AccountsSchema = SchemaFactory.createForClass(Account);
