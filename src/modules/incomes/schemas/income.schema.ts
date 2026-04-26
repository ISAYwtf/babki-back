import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type IncomeDocument = HydratedDocument<Income>;

@Schema({ timestamps: true })
export class Income {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true })
  incomeDate: Date;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  source?: string;
}

export const IncomeSchema = SchemaFactory.createForClass(Income);

IncomeSchema.index({ userId: 1, incomeDate: -1 });
