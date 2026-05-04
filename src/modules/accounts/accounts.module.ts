import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsSnapshotsModule } from '../accounts-snapshots/accounts-snapshots.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Account, AccountsSchema } from './schemas/accounts.schema';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [
    AccountsSnapshotsModule,
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountsSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [MongooseModule, AccountsService],
})
export class AccountsModule {}
