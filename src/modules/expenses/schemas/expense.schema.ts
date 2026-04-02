import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExpenseCategory } from '../../expense-categories/schemas/expense-category.schema';
import { User } from '../../users/schemas/user.schema';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({ timestamps: true })
export class Expense {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: ExpenseCategory.name })
  categoryId: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true })
  expenseDate: Date;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  merchant?: string;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ userId: 1, expenseDate: -1 });
ExpenseSchema.index({ categoryId: 1 });
