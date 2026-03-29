import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Balance, BalanceSchema } from './schemas/balance.schema';
import { BalancesController } from './balances.controller';
import { BalancesService } from './balances.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Balance.name, schema: BalanceSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BalancesController],
  providers: [BalancesService],
  exports: [MongooseModule, BalancesService],
})
export class BalancesModule {}
