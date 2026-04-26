import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Balance, BalanceDocument } from '../balances/schemas/balance.schema';
import { Debt, DebtDocument } from '../debts/schemas/debt.schema';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from '../expense-categories/schemas/expense-category.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { Income, IncomeDocument } from '../incomes/schemas/income.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Balance.name)
    private readonly balanceModel: Model<BalanceDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
    @InjectModel(Debt.name) private readonly debtModel: Model<DebtDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly expenseCategoryModel: Model<ExpenseCategoryDocument>,
  ) {}

  async getMonthlySummary(userId: string, year: number, month: number) {
    const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return this.buildSummary(userId, 'month', from, to, { year, month });
  }

  async getYearlySummary(userId: string, year: number) {
    const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    return this.buildSummary(userId, 'year', from, to, { year });
  }

  private async buildSummary(
    userId: string,
    type: 'month' | 'year',
    from: Date,
    to: Date,
    period: Record<string, number>,
  ) {
    await this.ensureUserExists(userId);

    const objectUserId = new Types.ObjectId(userId);

    const [balance, debtAggregate, expenseAggregate, incomeAggregate] =
      await Promise.all([
        this.balanceModel
          .findOne({
            userId: objectUserId,
            asOfDate: { $lte: to },
          })
          .sort({ asOfDate: -1, _id: -1 })
          .lean()
          .exec(),
        this.debtModel.aggregate<{
          totalActiveDebtRemaining: number;
          activeDebtCount: number;
        }>([
          { $match: { userId: objectUserId, status: 'active' } },
          {
            $group: {
              _id: null,
              totalActiveDebtRemaining: { $sum: '$remainingAmount' },
              activeDebtCount: { $sum: 1 },
            },
          },
        ]),
        this.expenseModel.aggregate<{
          _id: Types.ObjectId;
          totalAmount: number;
          expenseCount: number;
        }>([
          {
            $match: {
              userId: objectUserId,
              expenseDate: { $gte: from, $lte: to },
            },
          },
          {
            $group: {
              _id: '$categoryId',
              totalAmount: { $sum: '$amount' },
              expenseCount: { $sum: 1 },
            },
          },
        ]),
        this.incomeModel.aggregate<{
          _id: null;
          totalIncome: number;
          incomeCount: number;
        }>([
          {
            $match: {
              userId: objectUserId,
              incomeDate: { $gte: from, $lte: to },
            },
          },
          {
            $group: {
              _id: null,
              totalIncome: { $sum: '$amount' },
              incomeCount: { $sum: 1 },
            },
          },
        ]),
      ]);

    const categoryIds = expenseAggregate.map((item) => item._id);
    const categories = categoryIds.length
      ? await this.expenseCategoryModel
          .find({ _id: { $in: categoryIds } })
          .lean()
          .exec()
      : [];
    const categoryMap = new Map(
      categories.map((category) => [String(category._id), category.name]),
    );

    const expensesByCategory = expenseAggregate.map((item) => ({
      categoryId: item._id,
      categoryName: categoryMap.get(String(item._id)) ?? 'Unknown',
      totalAmount: item.totalAmount,
      expenseCount: item.expenseCount,
    }));

    const totals = expenseAggregate.reduce(
      (accumulator, item) => {
        accumulator.totalExpenses += item.totalAmount;
        accumulator.expenseCount += item.expenseCount;

        return accumulator;
      },
      { totalExpenses: 0, expenseCount: 0 },
    );
    const activeDebtSummary = debtAggregate[0] ?? {
      totalActiveDebtRemaining: 0,
      activeDebtCount: 0,
    };
    const incomeSummary = incomeAggregate[0] ?? {
      totalIncome: 0,
      incomeCount: 0,
    };

    return {
      period: {
        type,
        ...period,
        from,
        to,
      },
      currentAccountAmount: balance?.currentAccountAmount ?? 0,
      savingsAmount: balance?.savingsAmount ?? 0,
      totalIncome: incomeSummary.totalIncome,
      incomeCount: incomeSummary.incomeCount,
      totalExpenses: totals.totalExpenses,
      expenseCount: totals.expenseCount,
      netCashflow: incomeSummary.totalIncome - totals.totalExpenses,
      expensesByCategory,
      totalActiveDebtRemaining: activeDebtSummary.totalActiveDebtRemaining,
      activeDebtCount: activeDebtSummary.activeDebtCount,
    };
  }

  private async ensureUserExists(userId: string) {
    const exists = await this.userModel.exists({ _id: userId });

    if (!exists) {
      throw new NotFoundException(`User ${userId} not found.`);
    }
  }
}
