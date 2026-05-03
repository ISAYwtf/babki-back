import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Account } from '../accounts/schemas/accounts.schema';
import { Debt } from '../debts/schemas/debt.schema';
import { ExpenseCategory } from '../expense-categories/schemas/expense-category.schema';
import { Expense } from '../expenses/schemas/expense.schema';
import { Income } from '../incomes/schemas/income.schema';
import { User } from '../users/schemas/user.schema';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const userModel = {
    exists: jest.fn(),
  };
  const accountModel = {
    findOne: jest.fn(),
  };
  const expenseModel = {
    aggregate: jest.fn(),
  };
  const incomeModel = {
    aggregate: jest.fn(),
  };
  const debtModel = {
    aggregate: jest.fn(),
  };
  const expenseCategoryModel = {
    find: jest.fn(),
  };

  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Account.name), useValue: accountModel },
        { provide: getModelToken(Expense.name), useValue: expenseModel },
        { provide: getModelToken(Income.name), useValue: incomeModel },
        { provide: getModelToken(Debt.name), useValue: debtModel },
        {
          provide: getModelToken(ExpenseCategory.name),
          useValue: expenseCategoryModel,
        },
      ],
    }).compile();

    service = moduleRef.get(ReportsService);
  });

  it('builds a monthly summary from accounts, incomes, expenses, and debts', async () => {
    const categoryId = new Types.ObjectId();
    const lean = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        amount: 1250,
      }),
    });
    const sort = jest.fn().mockReturnValue({ lean });

    userModel.exists.mockResolvedValue(true);
    accountModel.findOne.mockReturnValue({
      sort,
    });
    debtModel.aggregate.mockResolvedValue([
      { totalActiveDebtRemaining: 500, activeDebtCount: 2 },
    ]);
    incomeModel.aggregate.mockResolvedValue([
      { _id: null, totalIncome: 1500, incomeCount: 2 },
    ]);
    expenseModel.aggregate.mockResolvedValue([
      { _id: categoryId, totalAmount: 280, expenseCount: 3 },
    ]);
    expenseCategoryModel.find.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ _id: categoryId, name: 'Food' }]),
      }),
    });

    const summary = await service.getMonthlySummary(
      '507f1f77bcf86cd799439011',
      2026,
      3,
    );

    expect(summary.amount).toBe(1250);
    expect(summary.totalIncome).toBe(1500);
    expect(summary.incomeCount).toBe(2);
    expect(summary.totalExpenses).toBe(280);
    expect(summary.expenseCount).toBe(3);
    expect(summary.netCashflow).toBe(1220);
    expect(summary.expensesByCategory).toEqual([
      {
        categoryId,
        categoryName: 'Food',
        totalAmount: 280,
        expenseCount: 3,
      },
    ]);
    expect(expenseModel.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
          expenseDate: {
            $gte: new Date(Date.UTC(2026, 2, 1, 0, 0, 0, 0)),
            $lte: new Date(Date.UTC(2026, 2, 31, 23, 59, 59, 999)),
          },
        },
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          expenseCount: { $sum: 1 },
        },
      },
    ]);
    expect(summary.totalActiveDebtRemaining).toBe(500);
    expect(summary.activeDebtCount).toBe(2);
    expect(accountModel.findOne).toHaveBeenCalledWith({
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      asOfDate: { $lte: new Date(Date.UTC(2026, 2, 31, 23, 59, 59, 999)) },
    });
    expect(sort).toHaveBeenCalledWith({ asOfDate: -1, _id: -1 });
  });

  it('uses the latest account snapshot on or before the end of the year', async () => {
    const lean = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        amount: 2200,
      }),
    });
    const sort = jest.fn().mockReturnValue({ lean });

    userModel.exists.mockResolvedValue(true);
    accountModel.findOne.mockReturnValue({ sort });
    debtModel.aggregate.mockResolvedValue([]);
    incomeModel.aggregate.mockResolvedValue([]);
    expenseModel.aggregate.mockResolvedValue([]);

    const summary = await service.getYearlySummary(
      '507f1f77bcf86cd799439011',
      2026,
    );

    expect(summary.amount).toBe(2200);
    expect(summary.totalIncome).toBe(0);
    expect(summary.incomeCount).toBe(0);
    expect(summary.netCashflow).toBe(0);
    expect(accountModel.findOne).toHaveBeenCalledWith({
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      asOfDate: { $lte: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)) },
    });
  });

  it('throws when building a summary for an unknown user', async () => {
    userModel.exists.mockResolvedValue(false);

    await expect(
      service.getYearlySummary('507f1f77bcf86cd799439011', 2026),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
