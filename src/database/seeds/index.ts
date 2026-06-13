import { INestApplicationContext } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { seedUsers } from './01-users';
import { seedAccounts } from './02-accounts';
import { seedCategories } from './03-categories';
import { seedTransactions } from './05-transactions';
import { seedLimits } from './04-limits';
import { seedDebts } from './06-debts';
import { seedPlans } from './07-plans';

const COLLECTIONS = [
  'users',
  'accounts',
  'accountsnapshots',
  'transactions',
  'expensecategories',
  'expenselimits',
  'debts',
  'debttransactions',
  'plans',
];

async function clearDatabase(connection: Connection) {
  for (const name of COLLECTIONS) {
    await connection.collection(name).deleteMany({});
  }
  console.log('🗑️  Database cleared');
}

export async function runSeeders(app: INestApplicationContext) {
  const connection = app.get<Connection>(getConnectionToken());
  await clearDatabase(connection);

  const { userId } = await seedUsers(app);
  console.log(`👤 User seeded  (id: ${userId})`);

  const { balanceAccountId, savingAccountId } = await seedAccounts(app, userId);
  console.log(
    `🏦 Accounts seeded  (balance: ${balanceAccountId}, saving: ${savingAccountId})`,
  );

  const categories = await seedCategories(app, userId);
  console.log(
    `🏷️  Categories seeded  (${Object.keys(categories).length} total)`,
  );

  await seedTransactions(app, userId, balanceAccountId, categories);
  console.log('💸 Transactions seeded  (97 total)');

  await seedLimits(app, userId, categories);
  console.log('📊 Limits seeded  (2 total)');

  await seedDebts(app, userId);
  console.log('💳 Debts seeded  (2 total)');

  await seedPlans(app, userId, categories);
  console.log('📋 Plans seeded  (7 total)');
}
