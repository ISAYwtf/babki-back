import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsModule } from '../transactions/transactions.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
} from './schemas/expense-category.schema';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseCategoriesService } from './expense-categories.service';

@Module({
  imports: [
    TransactionsModule,
    MongooseModule.forFeature([
      { name: ExpenseCategory.name, schema: ExpenseCategorySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ExpenseCategoriesController],
  providers: [ExpenseCategoriesService],
  exports: [ExpenseCategoriesService, MongooseModule],
})
export class ExpenseCategoriesModule {}
