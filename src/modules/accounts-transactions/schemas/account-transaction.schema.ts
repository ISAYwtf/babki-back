import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AccountSnapshot } from '../../accounts-snapshots/schemas/accounts-snapshots.schema';
import { Account } from '../../accounts/schemas/accounts.schema';

export const transactionTypes = ['income', 'expense', 'saving'] as const;
export type TransactionType = (typeof transactionTypes)[number];

export type AccountTransactionDocument = HydratedDocument<AccountTransaction>;

@Schema({ timestamps: true })
export class AccountTransaction {
  @Prop({ required: true, type: Types.ObjectId, ref: AccountSnapshot.name })
  snapshotId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: Account.name })
  accountId: Types.ObjectId;

  @Prop({ required: true, type: String, enum: transactionTypes })
  type: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  transactionDate: Date;

  @Prop({ trim: true })
  description?: string;
}

export const AccountTransactionSchema =
  SchemaFactory.createForClass(AccountTransaction);

AccountTransactionSchema.index({
  userId: 1,
  snapshotId: 1,
  transactionDate: -1,
});
