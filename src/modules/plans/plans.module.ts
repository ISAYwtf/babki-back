import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
} from '../expense-categories/schemas/expense-category.schema';
import { TransactionsModule } from '../transactions/transactions.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [
    TransactionsModule,
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: User.name, schema: UserSchema },
      { name: ExpenseCategory.name, schema: ExpenseCategorySchema },
    ]),
  ],
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
