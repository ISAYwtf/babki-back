import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AccountSnapshot } from '../accounts-snapshots/schemas/accounts-snapshots.schema';
import { Account } from '../accounts/schemas/accounts.schema';
import { Transaction } from '../transactions/schemas/transaction.schema';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const balanceAccountId = '507f1f77bcf86cd799439012';
  const accountModel = {
    findOne: jest.fn(),
  };
  const transactionModel = {
    aggregate: jest.fn(),
    findOne: jest.fn(),
  };
  const snapshotsModel = {
    find: jest.fn(),
  };

  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: transactionModel,
        },
        { provide: getModelToken(Account.name), useValue: accountModel },
        {
          provide: getModelToken(AccountSnapshot.name),
          useValue: snapshotsModel,
        },
      ],
    }).compile();

    service = moduleRef.get(ReportsService);
    mockBalanceAccount();
    mockFirstTransaction(new Date('2024-01-10T00:00:00.000Z'));
    mockSnapshots([]);
  });

  it('maps mixed transaction totals into filled monthly periods', async () => {
    transactionModel.aggregate.mockResolvedValue([
      { period: '2024-01', income: 1000, expenses: 250, savings: 100 },
      { period: '2024-03', income: 500, expenses: 75, savings: 25 },
    ]);
    mockSnapshots([
      {
        amount: 650,
        date: new Date('2024-01-31T00:00:00.000Z'),
      },
      {
        amount: 1050,
        date: new Date('2024-03-15T00:00:00.000Z'),
      },
    ]);

    const result = await service.findMonthly(userId, {
      fromDate: '2024-01-15',
      toDate: '2024-03-02',
    });

    expect(result).toEqual([
      {
        period: '2024-01',
        expenses: 250,
        income: 1000,
        savings: 100,
        balance: 650,
      },
      {
        period: '2024-02',
        expenses: 0,
        incomes: 0,
        savings: 0,
        balance: 650,
      },
      {
        period: '2024-03',
        expenses: 75,
        incomes: 500,
        savings: 25,
        balance: 1050,
      },
    ]);
  });

  it('returns an empty monthly report when there is no data and no fromDate', async () => {
    mockFirstTransaction(null);

    const result = await service.findMonthly(userId, {});

    expect(result).toEqual([]);
    expect(transactionModel.aggregate).not.toHaveBeenCalled();
    expect(snapshotsModel.find).not.toHaveBeenCalled();
  });

  it('uses the latest balance snapshot at the end of each month', async () => {
    transactionModel.aggregate.mockResolvedValue([
      { period: '2024-01', income: 100, expenses: 0, savings: 0 },
    ]);
    mockSnapshots([
      {
        amount: 100,
        date: new Date('2023-12-01T00:00:00.000Z'),
      },
      {
        amount: 150,
        date: new Date('2024-01-10T00:00:00.000Z'),
      },
      {
        amount: 175,
        date: new Date('2024-01-31T00:00:00.000Z'),
      },
    ]);

    const result = await service.findMonthly(userId, {
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
    });

    expect(result[0]).toEqual({
      period: '2024-01',
      expenses: 0,
      income: 100,
      savings: 0,
      balance: 175,
    });
    expect(snapshotsModel.find).toHaveBeenCalledWith({
      accountId: new Types.ObjectId(balanceAccountId),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      date: { $lte: expect.any(Date) },
    });
  });

  it('returns yearly reports only for years with transactions', async () => {
    transactionModel.aggregate.mockResolvedValue([
      { period: '2023', income: 1000, expenses: 300, savings: 200 },
      { period: '2025', income: 2000, expenses: 500, savings: 400 },
    ]);
    mockSnapshots([
      {
        amount: 800,
        date: new Date('2023-12-31T00:00:00.000Z'),
      },
      {
        amount: 1900,
        date: new Date('2025-12-01T00:00:00.000Z'),
      },
    ]);

    const result = await service.findYearly(userId);

    expect(result).toEqual([
      {
        period: '2023',
        expenses: 300,
        income: 1000,
        savings: 200,
        balance: 800,
      },
      {
        period: '2025',
        expenses: 500,
        incomes: 2000,
        savings: 400,
        balance: 1900,
      },
    ]);
  });

  function mockBalanceAccount() {
    const exec = jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(balanceAccountId),
    });
    const lean = jest.fn().mockReturnValue({ exec });
    const select = jest.fn().mockReturnValue({ lean });

    accountModel.findOne.mockReturnValue({ select });
  }

  function mockFirstTransaction(transactionDate: Date | null) {
    const exec = jest
      .fn()
      .mockResolvedValue(transactionDate ? { transactionDate } : null);
    const lean = jest.fn().mockReturnValue({ exec });
    const select = jest.fn().mockReturnValue({ lean });
    const sort = jest.fn().mockReturnValue({ select });

    transactionModel.findOne.mockReturnValue({ sort });
  }

  function mockSnapshots(snapshots: { amount: number; date: Date }[]) {
    const exec = jest.fn().mockResolvedValue(snapshots);
    const lean = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ lean });

    snapshotsModel.find.mockReturnValue({ sort });
  }
});
