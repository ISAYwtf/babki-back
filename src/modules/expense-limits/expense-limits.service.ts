import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { endOfDay, endOfMonth, startOfDay } from 'date-fns';
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

type FilterParams = {
  userId: string;
  limitId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  periodDate?: string;
};
type FilterResult = {
  _id?: string;
  userId: Types.ObjectId;
  categoryId?: Types.ObjectId;
  startDate?: { $lte: Date } | Date;
  endDate?: { $gte: Date } | Date;
};

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

    if (foundLimit.length) {
      throw new ConflictException(
        'An expense limit on this date already exists.',
      );
    }

    const startDate = createExpenseLimitDto.startDate
      ? startOfDay(createExpenseLimitDto.startDate)
      : startOfMonth(new Date());
    const endDate = endOfDay(
      createExpenseLimitDto.endDate ?? endOfMonth(new Date()),
    );

    const limit = await this.expenseLimitModel.create({
      ...createExpenseLimitDto,
      startDate,
      endDate,
      categoryId: foundCategory._id,
      userId: foundCategory.userId,
    });

    return this.buildResponse(limit.toObject());
  }

  async findAll(userId: string, queryDto: FindExpenseLimitQueryDto) {
    const limits = await this.expenseLimitModel
      .find(
        this.buildFilter({
          userId,
          categoryId: queryDto.categoryId,
          periodDate: queryDto.periodDate,
        }),
      )
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return Promise.all(limits.map((limit) => this.buildResponse(limit)));
  }

  async findOne(userId: string, limitId: string) {
    const limit = await this.expenseLimitModel
      .findOne(this.buildFilter({ limitId, userId }))
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
      startDate: limit.startDate.toString(),
      endDate: limit.endDate.toString(),
      categoryId: limit.categoryId.toString(),
    });

    return {
      ...limit,
      rest: limit.total - expenseRevenue,
    };
  }

  private buildFilter(params: FilterParams) {
    const filter: FilterResult = { userId: new Types.ObjectId(params.userId) };
    if (params.limitId) {
      filter._id = params.limitId;
    }
    if (params.categoryId) {
      filter.categoryId = new Types.ObjectId(params.categoryId);
    }
    if (params.periodDate) {
      const date = new Date(params.periodDate);
      filter.startDate = { $lte: date };
      filter.endDate = { $gte: date };
    }
    if (params.startDate && params.endDate) {
      filter.startDate = new Date(params.startDate);
      filter.endDate = endOfDay(new Date(params.endDate));
    }

    return filter;
  }

  private async findRevenue(
    userId: string,
    queryDto: FindExpenseLimitRevenueQueryDto,
  ) {
    try {
      const revenue = await this.expensesService.findRevenue(userId, {
        categoryId: queryDto.categoryId,
        transactionType: 'expense',
        fromDate: queryDto.startDate,
        toDate: queryDto.endDate,
      });
      return revenue.totalRevenue;
    } catch (_) {
      return 0;
    }
  }
}
