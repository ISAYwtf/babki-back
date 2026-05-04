import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsTransactionsModule } from '../accounts-transactions/accounts-transactions.module';
import { Account, AccountsSchema } from '../accounts/schemas/accounts.schema';
import {
  AccountSnapshot,
  AccountsSnapshotsSchema,
} from './schemas/accounts-snapshots.schema';
import { AccountsSnapshotsController } from './accounts-snapshots.controller';
import { AccountsSnapshotsService } from './accounts-snapshots.service';

@Module({
  imports: [
    AccountsTransactionsModule,
    MongooseModule.forFeature([
      { name: AccountSnapshot.name, schema: AccountsSnapshotsSchema },
      { name: Account.name, schema: AccountsSchema },
    ]),
  ],
  controllers: [AccountsSnapshotsController],
  providers: [AccountsSnapshotsService],
  exports: [MongooseModule, AccountsSnapshotsService],
})
export class AccountsSnapshotsModule {}
