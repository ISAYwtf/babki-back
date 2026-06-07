import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AccountsSnapshotsService } from '../accounts-snapshots/accounts-snapshots.service';
import { AccountSnapshot } from '../accounts-snapshots/schemas/accounts-snapshots.schema';
import { AccountsService } from '../accounts/accounts/accounts.service';
import { Transaction } from '../transactions/schemas/transaction.schema';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const balanceAccountId = '507f1f77bcf86cd799439012';
  const savingAccountId = '507f1f77bcf86cd799439013';

  const accountsService = {
    findByParams: jest.fn(),
  };
  const snapshotsService = {
    findByUserId: jest.fn(),
  };
  const transactionModel = {
    aggregate: jest.fn(),
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
        { provide: getModelToken(Transaction.name), useValue: transactionModel },
        { provide: AccountsService, useValue: accountsService },
        { provide: AccountsSnapshotsService, useValue: snapshotsService },
        {
          provide: getModelToken(AccountSnapshot.name),
          useValue: snapshotsModel,
        },
      ],
    }).compile();

    service = moduleRef.get(ReportsService);
    mockAccounts();
    mockFirstSnapshot(new Date('2024-01-10T00:00:00.000Z'));
    mockSnapshots([]);
    transactionModel.aggregate.mockResolvedValue([]);
  });

  it('maps mixed transaction totals into filled monthly periods', async () => {
    transactionModel.aggregate.mockResolvedValue([
      { period: '2024-01', incomes: 1000, expenses: 250, saves: 100 },
      { period: '2024-03', incomes: 500, expenses: 75, saves: 25 },
    ]);
    mockSnapshots([
      {
        accountId: new Types.ObjectId(balanceAccountId),
        amount: 650,
        date: new Date('2024-01-31T00:00:00.000Z'),
      },
      {
        accountId: new Types.ObjectId(balanceAccountId),
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
        incomes: 1000,
        saves: 100,
        saving: 0,
        balance: 650,
      },
      {
        period: '2024-02',
        expenses: 0,
        incomes: 0,
        saves: 0,
        saving: 0,
        balance: 650,
      },
      {
        period: '2024-03',
        expenses: 75,
        incomes: 500,
        saves: 25,
        saving: 0,
        balance: 1050,
      },
    ]);
  });

  it('returns an empty monthly report when there is no data and no fromDate', async () => {
    mockFirstSnapshot(null);

    const result = await service.findMonthly(userId, {});

    expect(result).toEqual([]);
    expect(transactionModel.aggregate).not.toHaveBeenCalled();
    expect(snapshotsModel.find).not.toHaveBeenCalled();
  });

  it('uses the latest balance snapshot at the end of each month', async () => {
    transactionModel.aggregate.mockResolvedValue([
      { period: '2024-01', incomes: 100, expenses: 0, saves: 0 },
    ]);
    mockSnapshots([
      {
        accountId: new Types.ObjectId(balanceAccountId),
        amount: 100,
        date: new Date('2023-12-01T00:00:00.000Z'),
      },
      {
        accountId: new Types.ObjectId(balanceAccountId),
        amount: 150,
        date: new Date('2024-01-10T00:00:00.000Z'),
      },
      {
        accountId: new Types.ObjectId(balanceAccountId),
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
      incomes: 100,
      saves: 0,
      saving: 0,
      balance: 175,
    });
    expect(snapshotsModel.find).toHaveBeenCalledWith({
      accountId: {
        $in: [
          new Types.ObjectId(savingAccountId),
          new Types.ObjectId(balanceAccountId),
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      date: { $lte: expect.any(Date) },
    });
  });

  it('returns yearly reports only for years with transactions', async () => {
    transactionModel.aggregate.mockResolvedValue([
      { period: '2023', incomes: 1000, expenses: 300, saves: 200 },
      { period: '2025', incomes: 2000, expenses: 500, saves: 400 },
    ]);
    mockSnapshots([
      {
        accountId: new Types.ObjectId(balanceAccountId),
        amount: 800,
        date: new Date('2023-12-31T00:00:00.000Z'),
      },
      {
        accountId: new Types.ObjectId(balanceAccountId),
        amount: 1900,
        date: new Date('2025-12-01T00:00:00.000Z'),
      },
    ]);

    const result = await service.findYearly(userId);

    expect(result).toEqual([
      {
        period: '2023',
        expenses: 300,
        incomes: 1000,
        saves: 200,
        saving: 0,
        balance: 800,
      },
      {
        period: '2025',
        expenses: 500,
        incomes: 2000,
        saves: 400,
        saving: 0,
        balance: 1900,
      },
    ]);
  });

  function mockAccounts() {
    accountsService.findByParams.mockResolvedValue([
      { type: 'balance', _id: new Types.ObjectId(balanceAccountId) },
      { type: 'saving', _id: new Types.ObjectId(savingAccountId) },
    ]);
  }

  function mockFirstSnapshot(date: Date | null) {
    snapshotsService.findByUserId.mockResolvedValue(
      date ? [{ date }] : [],
    );
  }

  function mockSnapshots(
    snapshots: { accountId: Types.ObjectId; amount: number; date: Date }[],
  ) {
    const exec = jest.fn().mockResolvedValue(snapshots);
    const lean = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ lean });

    snapshotsModel.find.mockReturnValue({ sort });
  }
});
