import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExpenseCategoryDocument = HydratedDocument<ExpenseCategory>;

@Schema({ timestamps: true })
export class ExpenseCategory {
  @Prop({ required: true, trim: true, unique: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  color?: string;

  @Prop({ default: false })
  isArchived: boolean;
}

export const ExpenseCategorySchema =
  SchemaFactory.createForClass(ExpenseCategory);

ExpenseCategorySchema.index({ name: 1 }, { unique: true });
