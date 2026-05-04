import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AccountSnapshot } from '../../accounts-snapshots/schemas/accounts-snapshots.schema';

export type AccountTransactionDocument = HydratedDocument<AccountTransaction>;

@Schema({ timestamps: true })
export class AccountTransaction {
  @Prop({ required: true, type: Types.ObjectId, ref: AccountSnapshot.name })
  snapshotId: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
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
