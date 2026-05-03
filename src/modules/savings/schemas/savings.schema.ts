import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type SavingDocument = HydratedDocument<Saving>;

// TODO Добавить валюту
@Schema({ timestamps: true })
export class Saving {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name, unique: true })
  userId: Types.ObjectId;
}

export const SavingsSchema = SchemaFactory.createForClass(Saving);

SavingsSchema.index({ userId: 1 }, { unique: true });
