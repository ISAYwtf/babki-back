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
      this.ensureCategoryExists(userId, createExpenseDto.categoryId),
    ]);

    return await this.expenseModel.create({
      userId: new Types.ObjectId(userId),
      categoryId: new Types.ObjectId(createExpenseDto.categoryId),
      amount: createExpenseDto.amount,
      expenseDate: createExpenseDto.expenseDate,
      description: createExpenseDto.description,
      merchant: createExpenseDto.merchant,
    });
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
      .findOne({
        _id: expenseId,
        userId: new Types.ObjectId(userId),
      })
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
    const foundUserId = await this.ensureUserExists(userId);

    const foundCategoryId = updateExpenseDto.categoryId
      ? await this.ensureCategoryExists(userId, updateExpenseDto.categoryId)
      : null;

    const expense = await this.expenseModel
      .findOneAndUpdate(
        { _id: expenseId, userId: foundUserId },
        {
          ...updateExpenseDto,
          ...(foundCategoryId ? { categoryId: foundCategoryId } : {}),
        },
        { returnDocument: 'after', runValidators: true },
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
    const foundId = await this.ensureUserExists(userId);

    const expense = await this.expenseModel
      .findOneAndDelete({ _id: expenseId, userId: foundId })
      .exec();

    if (!expense) {
      throw new NotFoundException(
        `Expense ${expenseId} for user ${userId} not found.`,
      );
    }
  }

  private buildFilter(userId: string, query: ListExpensesQueryDto) {
    const filter: {
      userId: Types.ObjectId;
      categoryId?: Types.ObjectId;
      expenseDate?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = { userId: new Types.ObjectId(userId) };

    if (query.categoryId) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
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
    const found = await this.userModel.exists({ _id: userId });

    if (!found) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    return found._id;
  }

  private async ensureCategoryExists(userId: string, categoryId: string) {
    const found = await this.expenseCategoryModel.exists({
      _id: categoryId,
      userId: new Types.ObjectId(userId),
    });

    if (!found) {
      throw new NotFoundException(
        `Expense category ${categoryId} for user ${userId} not found.`,
      );
    }

    return found._id;
  }
}
