import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Saving } from '../../savings/schemas/savings.schema';

export type SavingSnapshotsDocument = HydratedDocument<SavingSnapshots>;

@Schema({ timestamps: true })
export class SavingSnapshots {
  @Prop({ required: true, type: Types.ObjectId, ref: Saving.name })
  savingId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true })
  date: Date;
}

export const SavingsSnapshotsSchema =
  SchemaFactory.createForClass(SavingSnapshots);

SavingsSnapshotsSchema.index({ savingId: 1, date: -1 });
SavingsSnapshotsSchema.index({ savingId: 1, date: 1 }, { unique: true });
