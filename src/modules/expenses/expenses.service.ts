import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { getPagination } from '../../common/utils/pagination.util';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from '../expense-categories/schemas/expense-category.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense, ExpenseDocument } from './schemas/expense.schema';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly expenseCategoryModel: Model<ExpenseCategoryDocument>,
  ) {}

  async create(userId: string, createExpenseDto: CreateExpenseDto) {
    await Promise.all([
      this.ensureUserExists(userId),
      this.ensureCategoryExists(createExpenseDto.categoryId),
    ]);

    const expense = await this.expenseModel.create({
      userId: new Types.ObjectId(userId),
      categoryId: new Types.ObjectId(createExpenseDto.categoryId),
      amount: createExpenseDto.amount,
      expenseDate: createExpenseDto.expenseDate,
      description: createExpenseDto.description,
    });

    return this.findOne(userId, expense.id);
  }

  async findAll(
    userId: string,
    query: ListExpensesQueryDto,
  ): Promise<PaginatedResponse<Expense>> {
    await this.ensureUserExists(userId);

    const { page, limit, skip } = getPagination(query);
    const filter = this.buildFilter(userId, query);

    const [items, total] = await Promise.all([
      this.expenseModel
        .find(filter)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('categoryId')
        .lean()
        .exec(),
      this.expenseModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(userId: string, expenseId: string) {
    await this.ensureUserExists(userId);

    const expense = await this.expenseModel
      .findOne({ _id: expenseId, userId })
      .populate('categoryId')
      .lean()
      .exec();

    if (!expense) {
      throw new NotFoundException(
        `Expense ${expenseId} for user ${userId} not found.`,
      );
    }

    return expense;
  }

  async update(
    userId: string,
    expenseId: string,
    updateExpenseDto: UpdateExpenseDto,
  ) {
    await this.ensureUserExists(userId);

    if (updateExpenseDto.categoryId) {
      await this.ensureCategoryExists(updateExpenseDto.categoryId);
    }

    const expense = await this.expenseModel
      .findOneAndUpdate(
        { _id: expenseId, userId },
        {
          ...updateExpenseDto,
          ...(updateExpenseDto.categoryId
            ? { categoryId: new Types.ObjectId(updateExpenseDto.categoryId) }
            : {}),
        },
        { new: true, runValidators: true },
      )
      .populate('categoryId')
      .lean()
      .exec();

    if (!expense) {
      throw new NotFoundException(
        `Expense ${expenseId} for user ${userId} not found.`,
      );
    }

    return expense;
  }

  async remove(userId: string, expenseId: string) {
    await this.ensureUserExists(userId);

    const expense = await this.expenseModel
      .findOneAndDelete({ _id: expenseId, userId })
      .exec();

    if (!expense) {
      throw new NotFoundException(
        `Expense ${expenseId} for user ${userId} not found.`,
      );
    }
  }

  private buildFilter(userId: string, query: ListExpensesQueryDto) {
    const filter: {
      userId: string;
      categoryId?: string;
      expenseDate?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = { userId };

    if (query.categoryId) {
      filter.categoryId = query.categoryId;
    }

    if (query.from || query.to) {
      const expenseDateFilter: { $gte?: Date; $lte?: Date } = {};

      if (query.from) {
        expenseDateFilter.$gte = new Date(query.from);
      }

      if (query.to) {
        expenseDateFilter.$lte = new Date(query.to);
      }

      filter.expenseDate = expenseDateFilter;
    }

    return filter;
  }

  private async ensureUserExists(userId: string) {
    const exists = await this.userModel.exists({ _id: userId });

    if (!exists) {
      throw new NotFoundException(`User ${userId} not found.`);
    }
  }

  private async ensureCategoryExists(categoryId: string) {
    const exists = await this.expenseCategoryModel.exists({ _id: categoryId });

    if (!exists) {
      throw new NotFoundException(`Expense category ${categoryId} not found.`);
    }
  }
}
