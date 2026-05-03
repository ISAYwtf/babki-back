import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SavingSnapshots,
  SavingsSnapshotsSchema,
} from '../savings-snapshots/schemas/savings-snapshots.schema';
import { Saving, SavingsSchema } from '../savings/schemas/savings.schema';
import { SavingsTransactionsController } from './savings-transactions.controller';
import { SavingsTransactionsService } from './savings-transactions.service';
import {
  SavingTransaction,
  SavingTransactionSchema,
} from './schemas/saving-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavingTransaction.name, schema: SavingTransactionSchema },
      { name: SavingSnapshots.name, schema: SavingsSnapshotsSchema },
      { name: Saving.name, schema: SavingsSchema },
    ]),
  ],
  controllers: [SavingsTransactionsController],
  providers: [SavingsTransactionsService],
  exports: [SavingsTransactionsService, MongooseModule],
})
export class SavingsTransactionsModule {}
