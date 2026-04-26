import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';
import { Income, IncomeSchema } from './schemas/income.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Income.name, schema: IncomeSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [IncomesController],
  providers: [IncomesService],
  exports: [IncomesService, MongooseModule],
})
export class IncomesModule {}
