import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DebtTransaction,
  DebtTransactionSchema,
} from '../debt-transactions/schemas/debt-transaction.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Debt, DebtSchema } from './schemas/debt.schema';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Debt.name, schema: DebtSchema },
      { name: User.name, schema: UserSchema },
      { name: DebtTransaction.name, schema: DebtTransactionSchema },
    ]),
  ],
  controllers: [DebtsController],
  providers: [DebtsService],
  exports: [DebtsService, MongooseModule],
})
export class DebtsModule {}
