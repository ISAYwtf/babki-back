import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavingsTransactionsModule } from '../savings-transactions/savings-transactions.module';
import { Saving, SavingsSchema } from '../savings/schemas/savings.schema';
import {
  SavingSnapshots,
  SavingsSnapshotsSchema,
} from './schemas/savings-snapshots.schema';
import { SavingsSnapshotsController } from './savings-snapshots.controller';
import { SavingsSnapshotsService } from './savings-snapshots.service';

@Module({
  imports: [
    SavingsTransactionsModule,
    MongooseModule.forFeature([
      { name: SavingSnapshots.name, schema: SavingsSnapshotsSchema },
      { name: Saving.name, schema: SavingsSchema },
    ]),
  ],
  controllers: [SavingsSnapshotsController],
  providers: [SavingsSnapshotsService],
  exports: [MongooseModule, SavingsSnapshotsService],
})
export class SavingsSnapshotsModule {}
