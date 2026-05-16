import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { endOfDay, endOfMonth, startOfDay } from 'date-fns';
import { startOfMonth } from 'date-fns/startOfMonth';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { CreatePeriodDto } from './dto/create.dto';
import { FindAllPeriodsQueryDto } from './dto/find-all-query.dto';
import { FindPeriodQueryDto } from './dto/find-query.dto';
import { Period, PeriodDocument } from './schemas/periods.schema';

@Injectable()
export class PeriodsService {
  constructor(
    @InjectModel(Period.name)
    private readonly periodModel: Model<PeriodDocument>,
    private readonly usersService: UsersService,
  ) {}

  async findByParams(userId: string, query: FindAllPeriodsQueryDto) {
    const filter: {
      userId: Types.ObjectId;
      startDate?: { $gte: Date };
      endDate?: { $lte: Date };
    } = {
      userId: new Types.ObjectId(userId),
    };

    if (query.fromDate) {
      filter.startDate = { $gte: startOfDay(new Date(query.fromDate)) };
    }
    if (query.toDate) {
      filter.endDate = { $lte: endOfDay(new Date(query.toDate)) };
    }

    const entities = await this.periodModel
      .find(filter)
      .sort({ startDate: -1, endDate: -1, createdAt: -1 })
      .lean()
      .exec();

    if (!entities.length) {
      return [];
    }

    return entities;
  }

  async findOneByDate(userId: string, query: FindPeriodQueryDto) {
    const date = new Date(query.date);
    const entity = await this.periodModel
      .findOne({
        userId: new Types.ObjectId(userId),
        startDate: { $lte: date },
        endDate: { $gte: date },
      })
      .lean()
      .exec();

    if (!entity) {
      throw new NotFoundException(`Period for date ${query.date} not found.`);
    }

    return entity;
  }

  async findOrCreate(userId: string, query: FindPeriodQueryDto) {
    const date = new Date(query.date);
    const entity = await this.periodModel
      .findOne({
        userId: new Types.ObjectId(userId),
        startDate: { $lte: date },
        endDate: { $gte: date },
      })
      .lean()
      .exec();

    if (entity) {
      return entity;
    }

    return this.create(userId, {
      startDate: startOfMonth(date).toISOString(),
      endDate: endOfMonth(date).toISOString(),
    });
  }

  async findById(userId: string, periodId: string) {
    const entity = await this.periodModel
      .findOne({ _id: periodId, userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    if (!entity) {
      throw new NotFoundException(`Period ${periodId} not found.`);
    }

    return entity;
  }

  async create(userId: string, createPeriodDto: CreatePeriodDto) {
    const foundUserId = await this.usersService.ensureIdExists(userId);
    const startDate = new Date(createPeriodDto.startDate);
    const endDate = new Date(createPeriodDto.endDate);
    const filter = {
      $in: [startDate, endDate],
    };
    const existingPeriod = await this.periodModel
      .findOne({
        userId: foundUserId,
        startDate: filter,
        endDate: filter,
      })
      .lean();
    if (existingPeriod) {
      throw new ConflictException(
        `The dates overlap with the existing period from ${existingPeriod.startDate.toISOString()} to ${existingPeriod.endDate.toISOString()}`,
      );
    }

    const createdEntity = await this.periodModel.create({
      userId: foundUserId,
      startDate: startOfDay(startDate),
      endDate: endOfDay(endDate),
    });
    return createdEntity.toObject();
  }
}
