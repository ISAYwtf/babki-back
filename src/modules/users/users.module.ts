import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountsSchema } from '../accounts/schemas/accounts.schema';
import { Debt, DebtSchema } from '../debts/schemas/debt.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { Income, IncomeSchema } from '../incomes/schemas/income.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Account.name, schema: AccountsSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Income.name, schema: IncomeSchema },
      { name: Debt.name, schema: DebtSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
