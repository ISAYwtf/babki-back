import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { getPagination } from '../../common/utils/pagination.util';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateIncomeDto } from './dto/create-income.dto';
import { FindIncomeRevenueQueryDto } from './dto/find-income-revenue-query.dto';
import { ListIncomesQueryDto } from './dto/list-incomes-query.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { Income, IncomeDocument } from './schemas/income.schema';

@Injectable()
export class IncomesService {
  constructor(
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(userId: string, createIncomeDto: CreateIncomeDto) {
    const foundUserId = await this.ensureUserExists(userId);

    return await this.incomeModel.create({
      userId: foundUserId,
      ...createIncomeDto,
    });
  }

  // TODO Добавить сортировку в DTO
  async findAll(
    userId: string,
    query: ListIncomesQueryDto,
  ): Promise<PaginatedResponse<Income>> {
    const foundUserId = await this.ensureUserExists(userId);
    const { page, limit, skip } = getPagination(query);
    const filter = this.buildFilter(foundUserId, query);

    const [items, total] = await Promise.all([
      this.incomeModel
        .find(filter)
        .sort({ incomeDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.incomeModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findRevenue(userId: string, query: FindIncomeRevenueQueryDto) {
    const foundUserId = await this.ensureUserExists(userId);
    const filter = this.buildFilter(foundUserId, query);

    const aggregate = await this.incomeModel.aggregate<{
      _id: null;
      totalRevenue: number;
    }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
        },
      },
    ]);

    return {
      totalRevenue: aggregate[0]?.totalRevenue ?? 0,
      from: query.from,
      to: query.to,
    };
  }

  async findOne(userId: string, incomeId: string) {
    const foundUserId = await this.ensureUserExists(userId);

    const income = await this.incomeModel
      .findOne({
        _id: incomeId,
        userId: foundUserId,
      })
      .lean()
      .exec();

    if (!income) {
      throw new NotFoundException(
        `Income ${incomeId} for user ${userId} not found.`,
      );
    }

    return income;
  }

  async update(
    userId: string,
    incomeId: string,
    updateIncomeDto: UpdateIncomeDto,
  ) {
    const foundUserId = await this.ensureUserExists(userId);

    const income = await this.incomeModel
      .findOneAndUpdate(
        { _id: incomeId, userId: foundUserId },
        updateIncomeDto,
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .lean()
      .exec();

    if (!income) {
      throw new NotFoundException(
        `Income ${incomeId} for user ${userId} not found.`,
      );
    }

    return income;
  }

  async remove(userId: string, incomeId: string) {
    const foundUserId = await this.ensureUserExists(userId);

    const income = await this.incomeModel
      .findOneAndDelete({ _id: incomeId, userId: foundUserId })
      .exec();

    if (!income) {
      throw new NotFoundException(
        `Income ${incomeId} for user ${userId} not found.`,
      );
    }
  }

  private buildFilter(
    userId: Types.ObjectId,
    query: { from?: string; to?: string },
  ) {
    const filter: {
      userId: Types.ObjectId;
      incomeDate?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = { userId };

    if (query.from || query.to) {
      const incomeDateFilter: { $gte?: Date; $lte?: Date } = {};

      if (query.from) {
        incomeDateFilter.$gte = new Date(query.from);
      }

      if (query.to) {
        incomeDateFilter.$lte = new Date(query.to);
      }

      filter.incomeDate = incomeDateFilter;
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
}
