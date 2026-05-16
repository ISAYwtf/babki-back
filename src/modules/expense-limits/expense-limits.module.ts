import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpenseCategoriesModule } from '../expense-categories/expense-categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import {
  ExpenseLimit,
  ExpenseLimitSchema,
} from './schemas/expense-limit.schema';
import { ExpenseLimitsController } from './expense-limits.controller';
import { ExpenseLimitsService } from './expense-limits.service';

@Module({
  imports: [
    TransactionsModule,
    ExpenseCategoriesModule,
    MongooseModule.forFeature([
      { name: ExpenseLimit.name, schema: ExpenseLimitSchema },
    ]),
  ],
  controllers: [ExpenseLimitsController],
  providers: [ExpenseLimitsService],
  exports: [ExpenseLimitsService, MongooseModule],
})
export class ExpenseLimitsModule {}
