import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { AccountsSnapshotsModule } from './modules/accounts-snapshots/accounts-snapshots.module';
import { AccountsTransactionsModule } from './modules/accounts-transactions/accounts-transactions.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { DebtTransactionsModule } from './modules/debt-transactions/debt-transactions.module';
import { DebtsModule } from './modules/debts/debts.module';
import { ExpenseCategoriesModule } from './modules/expense-categories/expense-categories.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { IncomesModule } from './modules/incomes/incomes.module';
import { SavingsTransactionsModule } from './modules/savings-transactions/savings-transactions.module';
import { SavingsSnapshotsModule } from './modules/savings-snapshots/savings-snapshots.module';
import { SavingsModule } from './modules/savings/savings.module';
import { UsersModule } from './modules/users/users.module';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('mongo.uri'),
      }),
    }),
    AuthModule,
    UsersModule,
    AccountsModule,
    AccountsSnapshotsModule,
    AccountsTransactionsModule,
    ExpenseCategoriesModule,
    ExpensesModule,
    IncomesModule,
    DebtsModule,
    DebtTransactionsModule,
    SavingsModule,
    SavingsSnapshotsModule,
    SavingsTransactionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
