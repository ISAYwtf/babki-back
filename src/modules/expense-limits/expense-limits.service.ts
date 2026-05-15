import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { endOfMonth } from 'date-fns';
import { startOfMonth } from 'date-fns/startOfMonth';
import { Model, Types } from 'mongoose';
import { ExpenseCategoriesService } from '../expense-categories/expense-categories.service';
import { ExpensesService } from '../transactions/expenses/expenses.service';
import { CreateExpenseLimitDto } from './dto/create.dto';
import { FindExpenseLimitQueryDto } from './dto/find-query.dto';
import { FindExpenseLimitRevenueQueryDto } from './dto/find-revenue-query.dto';
import { UpdateExpenseLimitDto } from './dto/update.dto';
import {
  ExpenseLimit,
  ExpenseLimitDocument,
} from './schemas/expense-limit.schema';

@Injectable()
export class ExpenseLimitsService {
  constructor(
    @InjectModel(ExpenseLimit.name)
    private readonly expenseLimitModel: Model<ExpenseLimitDocument>,
    private readonly expensesService: ExpensesService,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  async create(userId: string, createExpenseLimitDto: CreateExpenseLimitDto) {
    const foundCategory = await this.expenseCategoriesService.findOne(
      userId,
      createExpenseLimitDto.categoryId,
    );

    const foundLimit = await this.findAll(userId, {
      categoryId: createExpenseLimitDto.categoryId,
      periodDate: new Date().toISOString(),
    });

    if (foundLimit) {
      throw new ConflictException(
        'An expense limit with this name already exists.',
      );
    }

    const limit = await this.expenseLimitModel.create({
      ...createExpenseLimitDto,
      startDate: startOfMonth(new Date()).toISOString(),
      endDate: endOfMonth(new Date()).toISOString(),
      categoryId: foundCategory._id,
      userId: foundCategory.userId,
    });

    return this.buildResponse(limit.toObject());
  }

  async findAll(userId: string, queryDto: FindExpenseLimitQueryDto) {
    const limits = await this.expenseLimitModel
      .find({
        userId: new Types.ObjectId(userId),
        startDate: { $gte: queryDto.periodDate },
        endDate: { $lte: queryDto.periodDate },
      })
      .sort({ startDate: -1, endDate: -1, createdAt: -1 })
      .lean()
      .exec();

    return Promise.all(limits.map((limit) => this.buildResponse(limit)));
  }

  async findOne(userId: string, limitId: string) {
    const limit = await this.expenseLimitModel
      .findOne({
        _id: limitId,
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();

    if (!limit) {
      throw new NotFoundException(
        `Expense limit ${limitId} for user ${userId} not found.`,
      );
    }

    return this.buildResponse(limit);
  }

  async update(
    userId: string,
    limitId: string,
    updateExpenseLimitDto: UpdateExpenseLimitDto,
  ) {
    const limit = await this.expenseLimitModel
      .findOneAndUpdate(
        { _id: limitId, userId: new Types.ObjectId(userId) },
        updateExpenseLimitDto,
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .lean()
      .exec();

    if (!limit) {
      throw new NotFoundException(
        `Expense limit ${limitId} for user ${userId} not found.`,
      );
    }

    return this.buildResponse(limit);
  }

  async deleteEntity(userId: string, limitId: string) {
    await this.expenseLimitModel
      .deleteOne({ _id: limitId, userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
  }

  private async buildResponse(limit: ExpenseLimitDocument) {
    const expenseRevenue = await this.findRevenue(limit.userId.toString(), {
      startDate: limit.startDate,
      endDate: limit.endDate,
      categoryId: limit.categoryId.toString(),
    });

    return {
      ...limit,
      rest: limit.total - expenseRevenue.totalRevenue,
    };
  }

  private async findRevenue(
    userId: string,
    queryDto: FindExpenseLimitRevenueQueryDto,
  ) {
    return this.expensesService.findRevenue(userId, {
      categoryId: queryDto.categoryId,
      transactionType: 'expense',
      fromDate: queryDto.startDate,
      toDate: queryDto.endDate,
    });
  }
}
