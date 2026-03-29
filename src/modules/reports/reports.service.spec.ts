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

    userModel.exists.mockResolvedValue(true);
    balanceModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          currentAccountAmount: 1250,
          savingsAmount: 4300,
        }),
      }),
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
  });

  it('throws when building a summary for an unknown user', async () => {
    userModel.exists.mockResolvedValue(false);

    await expect(
      service.getYearlySummary('507f1f77bcf86cd799439011', 2026),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
