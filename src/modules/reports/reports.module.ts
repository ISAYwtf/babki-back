import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountsSchema } from '../accounts/schemas/accounts.schema';
import { Debt, DebtSchema } from '../debts/schemas/debt.schema';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
} from '../expense-categories/schemas/expense-category.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { Income, IncomeSchema } from '../incomes/schemas/income.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Account.name, schema: AccountsSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Income.name, schema: IncomeSchema },
      { name: Debt.name, schema: DebtSchema },
      { name: ExpenseCategory.name, schema: ExpenseCategorySchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
