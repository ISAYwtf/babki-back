import { INestApplicationContext } from '@nestjs/common';
import { DebtsService } from '../../modules/debts/debts.service';
import { ExpenseLimitsService } from '../../modules/expense-limits/expense-limits.service';
import { PlansService } from '../../modules/plans/plans.service';
import { ExpensesService } from '../../modules/transactions/expenses/expenses.service';
import { IncomesService } from '../../modules/transactions/incomes/incomes.service';
import { SavesService } from '../../modules/transactions/saves/saves.service';
import { CategoryMap } from './03-categories';
import { seedLimits } from './04-limits';
import { seedTransactions } from './05-transactions';
import { seedDebts } from './06-debts';
import { seedPlans } from './07-plans';

const anchorDate = new Date('2030-03-08T18:30:00.000Z');
const userId = '507f1f77bcf86cd799439011';
const balanceAccountId = '507f1f77bcf86cd799439012';
const categories: CategoryMap = {
  'Food & Dining': '507f1f77bcf86cd799439021',
  Transport: '507f1f77bcf86cd799439022',
  Entertainment: '507f1f77bcf86cd799439023',
  Utilities: '507f1f77bcf86cd799439024',
  Health: '507f1f77bcf86cd799439025',
  Shopping: '507f1f77bcf86cd799439026',
};

function createApp(providers: Map<unknown, unknown>) {
  return {
    get: jest.fn((token: unknown) => providers.get(token)),
  } as unknown as INestApplicationContext;
}

describe('dynamic seed dates', () => {
  it('creates a 20-month transaction window ending with a full anchor month', async () => {
    const incomes = { create: jest.fn().mockResolvedValue({}) };
    const expenses = { create: jest.fn().mockResolvedValue({}) };
    const saves = { create: jest.fn().mockResolvedValue({}) };
    const app = createApp(
      new Map<unknown, unknown>([
        [IncomesService, incomes],
        [ExpensesService, expenses],
        [SavesService, saves],
      ]),
    );

    await seedTransactions(
      app,
      userId,
      balanceAccountId,
      categories,
      anchorDate,
    );

    const calls = [
      ...incomes.create.mock.calls,
      ...expenses.create.mock.calls,
      ...saves.create.mock.calls,
    ];
    const dates = calls
      .map((call) => (call[1] as { transactionDate: string }).transactionDate)
      .sort();
    const anchorMonthCalls = dates.filter((date) => date.startsWith('2030-03'));

    expect(calls).toHaveLength(116);
    expect(dates[0]).toBe('2028-08-01T00:00:00.000Z');
    expect(dates.at(-1)).toBe('2030-03-28T00:00:00.000Z');
    expect(anchorMonthCalls).toHaveLength(8);
  });

  it('creates valid transaction dates for every anchor month', async () => {
    const incomes = { create: jest.fn().mockResolvedValue({}) };
    const expenses = { create: jest.fn().mockResolvedValue({}) };
    const saves = { create: jest.fn().mockResolvedValue({}) };
    const app = createApp(
      new Map<unknown, unknown>([
        [IncomesService, incomes],
        [ExpensesService, expenses],
        [SavesService, saves],
      ]),
    );

    for (let month = 0; month < 12; month += 1) {
      await expect(
        seedTransactions(
          app,
          userId,
          balanceAccountId,
          categories,
          new Date(Date.UTC(2030, month, 8)),
        ),
      ).resolves.toBeUndefined();
    }
  });

  it('creates limits for the anchor month with meaningful remainders', async () => {
    const limits = { create: jest.fn().mockResolvedValue({}) };
    const app = createApp(
      new Map<unknown, unknown>([[ExpenseLimitsService, limits]]),
    );

    await seedLimits(app, userId, categories, anchorDate);

    expect(limits.create.mock.calls.map((call) => call[1])).toEqual([
      {
        categoryId: categories['Food & Dining'],
        total: 65000,
        startDate: '2030-03-01T00:00:00.000Z',
        endDate: '2030-03-31T00:00:00.000Z',
      },
      {
        categoryId: categories['Entertainment'],
        total: 25000,
        startDate: '2030-03-01T00:00:00.000Z',
        endDate: '2030-03-31T00:00:00.000Z',
      },
    ]);
  });

  it('keeps one current debt active and one recent debt closed', async () => {
    const debts = {
      create: jest
        .fn()
        .mockResolvedValueOnce({ _id: 'artur' })
        .mockResolvedValueOnce({ _id: 'maria' }),
      repay: jest.fn().mockResolvedValue({}),
    };
    const app = createApp(new Map<unknown, unknown>([[DebtsService, debts]]));

    await seedDebts(app, userId, anchorDate);

    expect(debts.create.mock.calls[0][1]).toMatchObject({
      dueDate: '2030-05-01T00:00:00.000Z',
    });
    expect(debts.repay.mock.calls.map((call) => call[2])).toEqual([
      {
        repaymentDate: '2029-11-10T00:00:00.000Z',
        amount: 20000,
        description: 'First repayment',
        isIncome: false,
      },
      {
        repaymentDate: '2030-01-15T00:00:00.000Z',
        amount: 10000,
        description: 'Second repayment',
        isIncome: false,
      },
      {
        repaymentDate: '2030-03-05T00:00:00.000Z',
        amount: 5000,
        description: 'Current month repayment',
        isIncome: false,
      },
      {
        repaymentDate: '2029-12-20T00:00:00.000Z',
        amount: 100000,
        description: 'Full repayment',
        isIncome: false,
      },
    ]);
  });

  it('preserves future, overdue, and closed plan scenarios', async () => {
    const plans = {
      create: jest.fn().mockResolvedValue({ _id: 'plan-id' }),
      close: jest.fn().mockResolvedValue({}),
    };
    const app = createApp(new Map<unknown, unknown>([[PlansService, plans]]));

    await seedPlans(app, userId, categories, anchorDate);

    expect(
      plans.create.mock.calls.map(
        (call) => (call[1] as { targetDate: string }).targetDate,
      ),
    ).toEqual([
      '2030-06-01T00:00:00.000Z',
      '2030-05-01T00:00:00.000Z',
      '2030-04-20T00:00:00.000Z',
      '2030-02-01T00:00:00.000Z',
      '2030-01-20T00:00:00.000Z',
      '2029-12-15T00:00:00.000Z',
      '2029-11-10T00:00:00.000Z',
    ]);
    expect(plans.close.mock.calls.map((call) => call[2])).toEqual([
      { closingDate: '2030-01-15T00:00:00.000Z' },
      {
        closingDate: '2029-12-15T00:00:00.000Z',
        description: 'Bought new router and switched plan',
      },
      {
        closingDate: '2029-11-15T00:00:00.000Z',
        amount: 25000,
      },
    ]);
  });
});
