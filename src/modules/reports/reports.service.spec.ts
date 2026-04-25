import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Balance } from '../balances/schemas/balance.schema';
import { Debt } from '../debts/schemas/debt.schema';
import { ExpenseCategory } from '../expense-categories/schemas/expense-category.schema';
import { Expense } from '../expenses/schemas/expense.schema';
import { User } from '../users/schemas/user.schema';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const userModel = {
    exists: jest.fn(),
  };
  const balanceModel = {
    findOne: jest.fn(),
  };
  const expenseModel = {
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
        { provide: getModelToken(Balance.name), useValue: balanceModel },
        { provide: getModelToken(Expense.name), useValue: expenseModel },
        { provide: getModelToken(Debt.name), useValue: debtModel },
        {
          provide: getModelToken(ExpenseCategory.name),
          useValue: expenseCategoryModel,
        },
      ],
    }).compile();

    service = moduleRef.get(ReportsService);
  });

  it('builds a monthly summary from balances, expenses, and debts', async () => {
    const categoryId = new Types.ObjectId();
    const lean = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        currentAccountAmount: 1250,
        savingsAmount: 4300,
      }),
    });
    const sort = jest.fn().mockReturnValue({ lean });

    userModel.exists.mockResolvedValue(true);
    balanceModel.findOne.mockReturnValue({
      sort,
    });
    debtModel.aggregate.mockResolvedValue([
      { totalActiveDebtRemaining: 500, activeDebtCount: 2 },
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

    expect(summary.currentAccountAmount).toBe(1250);
    expect(summary.savingsAmount).toBe(4300);
    expect(summary.totalExpenses).toBe(280);
    expect(summary.expenseCount).toBe(3);
    expect(summary.expensesByCategory).toEqual([
      {
        categoryId,
        categoryName: 'Food',
        totalAmount: 280,
        expenseCount: 3,
      },
    ]);
    expect(summary.totalActiveDebtRemaining).toBe(500);
    expect(summary.activeDebtCount).toBe(2);
    expect(balanceModel.findOne).toHaveBeenCalledWith({
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      asOfDate: { $lte: new Date(Date.UTC(2026, 2, 31, 23, 59, 59, 999)) },
    });
    expect(sort).toHaveBeenCalledWith({ asOfDate: -1, _id: -1 });
  });

  it('uses the latest balance snapshot on or before the end of the year', async () => {
    const lean = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        currentAccountAmount: 2200,
        savingsAmount: 5100,
      }),
    });
    const sort = jest.fn().mockReturnValue({ lean });

    userModel.exists.mockResolvedValue(true);
    balanceModel.findOne.mockReturnValue({ sort });
    debtModel.aggregate.mockResolvedValue([]);
    expenseModel.aggregate.mockResolvedValue([]);

    const summary = await service.getYearlySummary(
      '507f1f77bcf86cd799439011',
      2026,
    );

    expect(summary.currentAccountAmount).toBe(2200);
    expect(summary.savingsAmount).toBe(5100);
    expect(balanceModel.findOne).toHaveBeenCalledWith({
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
