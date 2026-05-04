import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AccountSnapshot,
  AccountsSnapshotsSchema,
} from '../accounts-snapshots/schemas/accounts-snapshots.schema';
import { Account, AccountsSchema } from '../accounts/schemas/accounts.schema';
import { AccountsTransactionsController } from './accounts-transactions.controller';
import { AccountsTransactionsService } from './accounts-transactions.service';
import {
  AccountTransaction,
  AccountTransactionSchema,
} from './schemas/account-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AccountTransaction.name, schema: AccountTransactionSchema },
      { name: AccountSnapshot.name, schema: AccountsSnapshotsSchema },
      { name: Account.name, schema: AccountsSchema },
    ]),
  ],
  controllers: [AccountsTransactionsController],
  providers: [AccountsTransactionsService],
  exports: [AccountsTransactionsService, MongooseModule],
})
export class AccountsTransactionsModule {}
