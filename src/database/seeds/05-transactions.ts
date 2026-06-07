import { INestApplicationContext } from '@nestjs/common';
import { IncomesService } from '../../modules/transactions/incomes/incomes.service';
import { ExpensesService } from '../../modules/transactions/expenses/expenses.service';
import { SavesService } from '../../modules/transactions/saves/saves.service';
import { CategoryMap } from './03-categories';

export async function seedTransactions(
  app: INestApplicationContext,
  userId: string,
  balanceAccountId: string,
  categories: CategoryMap,
) {
  const incomes = app.get(IncomesService);
  const expenses = app.get(ExpensesService);
  const saves = app.get(SavesService);

  // ── March 2026 ──────────────────────────────────────────────────────────
  await incomes.create(userId, {
    amount: 5000,
    transactionDate: '2026-03-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 300,
    categoryId: categories['Food & Dining'],
    transactionDate: '2026-03-10T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 150,
    categoryId: categories['Transport'],
    transactionDate: '2026-03-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 200,
    categoryId: categories['Utilities'],
    transactionDate: '2026-03-20T00:00:00.000Z',
    description: 'Electricity bill',
  });
  await saves.create(userId, {
    amount: 500,
    sourceAccountId: balanceAccountId,
    transactionDate: '2026-03-25T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // ── April 2026 ──────────────────────────────────────────────────────────
  await incomes.create(userId, {
    amount: 5000,
    transactionDate: '2026-04-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 450,
    categoryId: categories['Food & Dining'],
    transactionDate: '2026-04-08T00:00:00.000Z',
    description: 'Groceries + restaurant',
  });
  await expenses.create(userId, {
    amount: 120,
    categoryId: categories['Entertainment'],
    transactionDate: '2026-04-15T00:00:00.000Z',
    description: 'Cinema tickets',
  });
  await expenses.create(userId, {
    amount: 800,
    categoryId: categories['Shopping'],
    transactionDate: '2026-04-20T00:00:00.000Z',
    description: 'Clothes',
  });
  await saves.create(userId, {
    amount: 500,
    sourceAccountId: balanceAccountId,
    transactionDate: '2026-04-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // ── May 2026 ─────────────────────────────────────────────────────────────
  await incomes.create(userId, {
    amount: 5000,
    transactionDate: '2026-05-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 380,
    categoryId: categories['Food & Dining'],
    transactionDate: '2026-05-07T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 250,
    categoryId: categories['Health'],
    transactionDate: '2026-05-14T00:00:00.000Z',
    description: 'Doctor visit',
  });
  await expenses.create(userId, {
    amount: 220,
    categoryId: categories['Utilities'],
    transactionDate: '2026-05-22T00:00:00.000Z',
    description: 'Internet + electricity',
  });
  await expenses.create(userId, {
    amount: 90,
    categoryId: categories['Entertainment'],
    transactionDate: '2026-05-25T00:00:00.000Z',
    description: 'Streaming subscriptions',
  });
  await saves.create(userId, {
    amount: 500,
    sourceAccountId: balanceAccountId,
    transactionDate: '2026-05-30T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // ── June 2026 (current, partial) ─────────────────────────────────────────
  await incomes.create(userId, {
    amount: 5000,
    transactionDate: '2026-06-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 420,
    categoryId: categories['Food & Dining'],
    transactionDate: '2026-06-03T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 80,
    categoryId: categories['Transport'],
    transactionDate: '2026-06-05T00:00:00.000Z',
    description: 'Taxi',
  });
}
