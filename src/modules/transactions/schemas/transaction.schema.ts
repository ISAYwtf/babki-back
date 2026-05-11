import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AccountSnapshot } from 'src/modules/accounts-snapshots/schemas/accounts-snapshots.schema';
import { Account } from 'src/modules/accounts/schemas/accounts.schema';
import { User } from '../../users/schemas/user.schema';

export const transactionTypes = ['income', 'expense', 'save'] as const;
export type TransactionType = (typeof transactionTypes)[number];

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true, discriminatorKey: 'type' })
export class Transaction {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: AccountSnapshot.name })
  snapshotId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: Account.name })
  accountId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  transactionDate: Date;

  @Prop({ trim: true })
  description?: string;

  type: TransactionType;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({
  userId: 1,
  snapshotId: 1,
  transactionDate: -1,
});
