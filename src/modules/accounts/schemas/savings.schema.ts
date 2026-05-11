import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Account } from './accounts.schema';

export type SavingDocument = HydratedDocument<Saving>;

@Schema()
export class Saving extends Account {}

export const SavingsSchema = SchemaFactory.createForClass(Saving);
