import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Transaction } from './transaction.schema';

@Schema()
export class Income extends Transaction {
  @Prop({ trim: true })
  source?: string;
}

export const IncomeSchema = SchemaFactory.createForClass(Income);

export type IncomeDocument = HydratedDocument<Income>;
