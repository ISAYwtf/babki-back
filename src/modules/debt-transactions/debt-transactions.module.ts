import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Debt, DebtSchema } from '../debts/schemas/debt.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { DebtTransactionsController } from './debt-transactions.controller';
import { DebtTransactionsService } from './debt-transactions.service';
import {
  DebtTransaction,
  DebtTransactionSchema,
} from './schemas/debt-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DebtTransaction.name, schema: DebtTransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Debt.name, schema: DebtSchema },
    ]),
  ],
  controllers: [DebtTransactionsController],
  providers: [DebtTransactionsService],
  exports: [DebtTransactionsService, MongooseModule],
})
export class DebtTransactionsModule {}
