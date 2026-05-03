import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Debt } from '../../debts/schemas/debt.schema';

export type DebtTransactionDocument = HydratedDocument<DebtTransaction>;

@Schema({ timestamps: true })
export class DebtTransaction {
  @Prop({ required: true, type: Types.ObjectId, ref: Debt.name })
  debtId: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  repaymentAmount: number;

  @Prop({ required: true })
  transactionDate: Date;

  @Prop({ trim: true })
  description?: string;
}

export const DebtTransactionSchema =
  SchemaFactory.createForClass(DebtTransaction);

DebtTransactionSchema.index({ userId: 1, debtId: 1, transactionDate: -1 });
