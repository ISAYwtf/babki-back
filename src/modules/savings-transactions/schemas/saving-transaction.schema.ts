import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SavingSnapshots } from '../../savings-snapshots/schemas/savings-snapshots.schema';

export type SavingTransactionDocument = HydratedDocument<SavingTransaction>;

@Schema({ timestamps: true })
export class SavingTransaction {
  @Prop({ required: true, type: Types.ObjectId, ref: SavingSnapshots.name })
  snapshotId: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true })
  transactionDate: Date;

  @Prop({ trim: true })
  description?: string;
}

export const SavingTransactionSchema =
  SchemaFactory.createForClass(SavingTransaction);

SavingTransactionSchema.index({
  userId: 1,
  snapshotId: 1,
  transactionDate: -1,
});
