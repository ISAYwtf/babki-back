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

  // ── 2025 ────────────────────────────────────────────────────────────────────

  // January 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-01-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 45000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-01-10T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 15000,
    categoryId: categories['Transport'],
    transactionDate: '2025-01-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 22000,
    categoryId: categories['Utilities'],
    transactionDate: '2025-01-20T00:00:00.000Z',
    description: 'Electricity + internet',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-01-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // February 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-02-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 42000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-02-08T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 12000,
    categoryId: categories['Transport'],
    transactionDate: '2025-02-10T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 18000,
    categoryId: categories['Utilities'],
    transactionDate: '2025-02-18T00:00:00.000Z',
    description: 'Electricity bill',
  });
  await expenses.create(userId, {
    amount: 15000,
    categoryId: categories['Health'],
    transactionDate: '2025-02-22T00:00:00.000Z',
    description: 'Dentist visit',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-02-26T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // March 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-03-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 50000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-03-10T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 18000,
    categoryId: categories['Transport'],
    transactionDate: '2025-03-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 35000,
    categoryId: categories['Shopping'],
    transactionDate: '2025-03-20T00:00:00.000Z',
    description: 'Spring clothes',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-03-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // April 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-04-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 55000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-04-08T00:00:00.000Z',
    description: 'Groceries + restaurants',
  });
  await expenses.create(userId, {
    amount: 15000,
    categoryId: categories['Transport'],
    transactionDate: '2025-04-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 20000,
    categoryId: categories['Entertainment'],
    transactionDate: '2025-04-20T00:00:00.000Z',
    description: 'Concerts and events',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-04-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // May 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-05-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 48000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-05-07T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 15000,
    categoryId: categories['Transport'],
    transactionDate: '2025-05-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 15000,
    categoryId: categories['Utilities'],
    transactionDate: '2025-05-18T00:00:00.000Z',
    description: 'Internet + electricity',
  });
  await expenses.create(userId, {
    amount: 12000,
    categoryId: categories['Entertainment'],
    transactionDate: '2025-05-25T00:00:00.000Z',
    description: 'Streaming subscriptions',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-05-30T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // June 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-06-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 60000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-06-05T00:00:00.000Z',
    description: 'Groceries + dining out',
  });
  await expenses.create(userId, {
    amount: 20000,
    categoryId: categories['Transport'],
    transactionDate: '2025-06-12T00:00:00.000Z',
    description: 'Monthly transit pass + taxi',
  });
  await expenses.create(userId, {
    amount: 45000,
    categoryId: categories['Shopping'],
    transactionDate: '2025-06-20T00:00:00.000Z',
    description: 'Summer wardrobe',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-06-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // July 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-07-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await incomes.create(userId, {
    amount: 120000,
    transactionDate: '2025-07-15T00:00:00.000Z',
    description: 'Freelance project bonus',
    source: 'Client',
  });
  await expenses.create(userId, {
    amount: 65000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-07-10T00:00:00.000Z',
    description: 'Vacation food + restaurants',
  });
  await expenses.create(userId, {
    amount: 25000,
    categoryId: categories['Transport'],
    transactionDate: '2025-07-12T00:00:00.000Z',
    description: 'Flights + transfers',
  });
  await expenses.create(userId, {
    amount: 80000,
    categoryId: categories['Entertainment'],
    transactionDate: '2025-07-20T00:00:00.000Z',
    description: 'Summer travel',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-07-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // August 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-08-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 50000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-08-08T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 15000,
    categoryId: categories['Transport'],
    transactionDate: '2025-08-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 20000,
    categoryId: categories['Utilities'],
    transactionDate: '2025-08-20T00:00:00.000Z',
    description: 'Electricity + internet',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-08-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // September 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-09-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 52000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-09-07T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 15000,
    categoryId: categories['Transport'],
    transactionDate: '2025-09-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 22000,
    categoryId: categories['Utilities'],
    transactionDate: '2025-09-18T00:00:00.000Z',
    description: 'Electricity + internet',
  });
  await expenses.create(userId, {
    amount: 20000,
    categoryId: categories['Health'],
    transactionDate: '2025-09-25T00:00:00.000Z',
    description: 'Annual medical checkup',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-09-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // October 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-10-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await incomes.create(userId, {
    amount: 80000,
    transactionDate: '2025-10-10T00:00:00.000Z',
    description: 'Year-end bonus',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 55000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-10-08T00:00:00.000Z',
    description: 'Groceries + restaurants',
  });
  await expenses.create(userId, {
    amount: 18000,
    categoryId: categories['Transport'],
    transactionDate: '2025-10-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 60000,
    categoryId: categories['Shopping'],
    transactionDate: '2025-10-20T00:00:00.000Z',
    description: 'Winter clothes',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-10-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // November 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-11-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 58000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-11-07T00:00:00.000Z',
    description: 'Groceries + restaurants',
  });
  await expenses.create(userId, {
    amount: 16000,
    categoryId: categories['Transport'],
    transactionDate: '2025-11-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 25000,
    categoryId: categories['Utilities'],
    transactionDate: '2025-11-18T00:00:00.000Z',
    description: 'Electricity + internet',
  });
  await expenses.create(userId, {
    amount: 15000,
    categoryId: categories['Entertainment'],
    transactionDate: '2025-11-25T00:00:00.000Z',
    description: 'Cinema + events',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-11-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // December 2025
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2025-12-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await incomes.create(userId, {
    amount: 50000,
    transactionDate: '2025-12-15T00:00:00.000Z',
    description: 'New Year bonus',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 70000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2025-12-10T00:00:00.000Z',
    description: 'Holiday groceries + restaurants',
  });
  await expenses.create(userId, {
    amount: 20000,
    categoryId: categories['Transport'],
    transactionDate: '2025-12-12T00:00:00.000Z',
    description: 'Taxi + transit',
  });
  await expenses.create(userId, {
    amount: 80000,
    categoryId: categories['Shopping'],
    transactionDate: '2025-12-20T00:00:00.000Z',
    description: 'New Year gifts',
  });
  await expenses.create(userId, {
    amount: 30000,
    categoryId: categories['Entertainment'],
    transactionDate: '2025-12-28T00:00:00.000Z',
    description: 'New Year events',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2025-12-29T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // ── January 2026 ─────────────────────────────────────────────────────────────
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2026-01-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 48000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2026-01-08T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 15000,
    categoryId: categories['Transport'],
    transactionDate: '2026-01-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 22000,
    categoryId: categories['Utilities'],
    transactionDate: '2026-01-20T00:00:00.000Z',
    description: 'Electricity + internet',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2026-01-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // ── February 2026 ────────────────────────────────────────────────────────────
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2026-02-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 44000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2026-02-08T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 12000,
    categoryId: categories['Transport'],
    transactionDate: '2026-02-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 10000,
    categoryId: categories['Entertainment'],
    transactionDate: '2026-02-20T00:00:00.000Z',
    description: 'Streaming subscriptions',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2026-02-26T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // ── March 2026 ──────────────────────────────────────────────────────────────
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2026-03-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 28000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2026-03-10T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 15000,
    categoryId: categories['Transport'],
    transactionDate: '2026-03-12T00:00:00.000Z',
    description: 'Monthly transit pass',
  });
  await expenses.create(userId, {
    amount: 20000,
    categoryId: categories['Utilities'],
    transactionDate: '2026-03-20T00:00:00.000Z',
    description: 'Electricity bill',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2026-03-25T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // ── April 2026 ──────────────────────────────────────────────────────────────
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2026-04-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 42000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2026-04-08T00:00:00.000Z',
    description: 'Groceries + restaurant',
  });
  await expenses.create(userId, {
    amount: 12000,
    categoryId: categories['Entertainment'],
    transactionDate: '2026-04-15T00:00:00.000Z',
    description: 'Cinema tickets',
  });
  await expenses.create(userId, {
    amount: 75000,
    categoryId: categories['Shopping'],
    transactionDate: '2026-04-20T00:00:00.000Z',
    description: 'Clothes',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2026-04-28T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // ── May 2026 ─────────────────────────────────────────────────────────────────
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2026-05-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 36000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2026-05-07T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 25000,
    categoryId: categories['Health'],
    transactionDate: '2026-05-14T00:00:00.000Z',
    description: 'Doctor visit',
  });
  await expenses.create(userId, {
    amount: 22000,
    categoryId: categories['Utilities'],
    transactionDate: '2026-05-22T00:00:00.000Z',
    description: 'Internet + electricity',
  });
  await expenses.create(userId, {
    amount: 9000,
    categoryId: categories['Entertainment'],
    transactionDate: '2026-05-25T00:00:00.000Z',
    description: 'Streaming subscriptions',
  });
  await saves.create(userId, {
    amount: 50000,
    sourceAccountId: balanceAccountId,
    transactionDate: '2026-05-30T00:00:00.000Z',
    description: 'Monthly savings',
  });

  // ── June 2026 (current, partial) ─────────────────────────────────────────────
  await incomes.create(userId, {
    amount: 350000,
    transactionDate: '2026-06-01T00:00:00.000Z',
    description: 'Salary',
    source: 'Employer',
  });
  await expenses.create(userId, {
    amount: 40000,
    categoryId: categories['Food & Dining'],
    transactionDate: '2026-06-03T00:00:00.000Z',
    description: 'Groceries',
  });
  await expenses.create(userId, {
    amount: 8000,
    categoryId: categories['Transport'],
    transactionDate: '2026-06-05T00:00:00.000Z',
    description: 'Taxi',
  });
}
