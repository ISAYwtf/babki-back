import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExpenseCategory } from '../../expense-categories/schemas/expense-category.schema';
import { User } from '../../users/schemas/user.schema';

export type ExpenseLimitDocument = HydratedDocument<ExpenseLimit>;

@Schema({ timestamps: true })
export class ExpenseLimit {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: ExpenseCategory.name })
  categoryId: Types.ObjectId;

  @Prop({ required: true })
  startDate: string;

  @Prop({ required: true })
  endDate: string;

  @Prop({ required: true, type: Number, min: 0 })
  total: number;
}

export const ExpenseLimitSchema = SchemaFactory.createForClass(ExpenseLimit);
