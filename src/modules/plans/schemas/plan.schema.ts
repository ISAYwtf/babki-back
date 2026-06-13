import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExpenseCategory } from '../../expense-categories/schemas/expense-category.schema';
import { Expense } from '../../transactions/schemas/expense.schema';
import { User } from '../../users/schemas/user.schema';

export type PlanDocument = HydratedDocument<Plan>;
export const planStatuses = ['active', 'closed'] as const;
export type PlanStatus = (typeof planStatuses)[number];

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 500 })
  description: string;

  @Prop({ required: true })
  targetDate: Date;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true, type: Types.ObjectId, ref: ExpenseCategory.name })
  categoryId: Types.ObjectId;

  @Prop({ required: true, type: String, enum: planStatuses, default: 'active' })
  status: PlanStatus;

  @Prop()
  closedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: Expense.name })
  expenseId?: Types.ObjectId;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

PlanSchema.index({ userId: 1, status: 1 });
PlanSchema.index({ userId: 1, targetDate: 1 });
