import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Account } from './accounts.schema';

export type BalanceDocument = HydratedDocument<Balance>;

@Schema()
export class Balance extends Account {}

export const BalanceSchema = SchemaFactory.createForClass(Balance);
