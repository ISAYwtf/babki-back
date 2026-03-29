import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type DebtDocument = HydratedDocument<Debt>;
export const debtStatuses = ['active', 'closed'] as const;
export type DebtStatus = (typeof debtStatuses)[number];

@Schema({ timestamps: true })
export class Debt {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0.01 })
  principalAmount: number;

  @Prop({ required: true, min: 0 })
  remainingAmount: number;

  @Prop({ trim: true })
  creditor?: string;

  @Prop()
  dueDate?: Date;

  @Prop({ required: true, type: String, enum: debtStatuses, default: 'active' })
  status: DebtStatus;
}

export const DebtSchema = SchemaFactory.createForClass(Debt);

DebtSchema.index({ userId: 1, status: 1 });
