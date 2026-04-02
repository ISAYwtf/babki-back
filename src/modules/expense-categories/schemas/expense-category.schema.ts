import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ExpenseCategoryDocument = HydratedDocument<ExpenseCategory>;

@Schema({ timestamps: true })
export class ExpenseCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  color?: string;

  @Prop({ default: false })
  isArchived: boolean;
}

export const ExpenseCategorySchema =
  SchemaFactory.createForClass(ExpenseCategory);

ExpenseCategorySchema.index({ userId: 1, name: 1 }, { unique: true });
ExpenseCategorySchema.index({ userId: 1 });
