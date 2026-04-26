import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExpenseCategory } from '../../expense-categories/schemas/expense-category.schema';
import { User } from '../../users/schemas/user.schema';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({ _id: false })
export class ExpenseItem {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0.01 })
  price: number;

  @Prop({ required: true, min: Number.EPSILON })
  quantity: number;
}

export const ExpenseItemSchema = SchemaFactory.createForClass(ExpenseItem);

@Schema({ timestamps: true })
export class Expense {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: ExpenseCategory.name })
  category: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true })
  expenseDate: Date;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  merchant?: string;

  @Prop({ type: [ExpenseItemSchema], default: [] })
  items: ExpenseItem[];
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ userId: 1, expenseDate: -1 });
ExpenseSchema.index({ category: 1 });
