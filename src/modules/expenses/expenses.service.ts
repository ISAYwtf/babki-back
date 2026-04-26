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

type SerializedExpense = Omit<Expense, 'category'> & {
  _id: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
  category: Record<string, unknown> | Types.ObjectId;
  items: Expense['items'];
};

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
    const [foundUserId, foundCategoryId] = await Promise.all([
      this.ensureUserExists(userId),
      this.ensureCategoryExists(userId, createExpenseDto.categoryId),
    ]);

    const expense = await this.expenseModel.create({
      userId: foundUserId,
      category: foundCategoryId,
      amount: createExpenseDto.amount,
      expenseDate: createExpenseDto.expenseDate,
      description: createExpenseDto.description,
      merchant: createExpenseDto.merchant,
      items: createExpenseDto.items ?? [],
    });

    return this.findSerializedExpenseOrFail(foundUserId, expense._id);
  }

  async findAll(
    userId: string,
    query: ListExpensesQueryDto,
  ): Promise<PaginatedResponse<SerializedExpense>> {
    await this.ensureUserExists(userId);

    const { page, limit, skip } = getPagination(query);
    const filter = this.buildFilter(userId, query);

    const [items, total] = await Promise.all([
      this.expenseModel
        .find(filter)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category')
        .lean()
        .exec(),
      this.expenseModel.countDocuments(filter),
    ]);

    return {
      items: items.map((item) => this.serializeExpense(item)),
      total,
      page,
      limit,
    };
  }

  async findOne(userId: string, expenseId: string) {
    const foundUserId = await this.ensureUserExists(userId);

    return this.findSerializedExpenseOrFail(foundUserId, expenseId, userId);
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
    const updatePayload = Object.fromEntries(
      Object.entries({
        amount: updateExpenseDto.amount,
        expenseDate: updateExpenseDto.expenseDate,
        description: updateExpenseDto.description,
        merchant: updateExpenseDto.merchant,
        items: updateExpenseDto.items,
        ...(foundCategoryId ? { category: foundCategoryId } : {}),
      }).filter(([, value]) => value !== undefined),
    );

    const expense = await this.expenseModel
      .findOneAndUpdate(
        { _id: expenseId, userId: foundUserId },
        updatePayload,
        { returnDocument: 'after', runValidators: true },
      )
      .lean()
      .exec();

    if (!expense) {
      throw new NotFoundException(
        `Expense ${expenseId} for user ${userId} not found.`,
      );
    }

    return this.findSerializedExpenseOrFail(foundUserId, expense._id, userId);
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
      category?: Types.ObjectId;
      expenseDate?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = { userId: new Types.ObjectId(userId) };

    if (query.categoryId) {
      filter.category = new Types.ObjectId(query.categoryId);
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

  private async findSerializedExpenseOrFail(
    userId: Types.ObjectId,
    expenseId: string | Types.ObjectId,
    rawUserId = String(userId),
  ) {
    const expense = await this.expenseModel
      .findOne({
        _id: expenseId,
        userId,
      })
      .populate('category')
      .lean()
      .exec();

    if (!expense) {
      throw new NotFoundException(
        `Expense ${String(expenseId)} for user ${rawUserId} not found.`,
      );
    }

    return this.serializeExpense(expense);
  }

  private serializeExpense(
    expense: Partial<SerializedExpense>,
  ): SerializedExpense {
    return {
      ...(expense as SerializedExpense),
      items: expense.items ?? [],
    };
  }
}
