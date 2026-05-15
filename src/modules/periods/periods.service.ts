import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
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
    const entities = await this.periodModel
      .find({
        userId: new Types.ObjectId(userId),
        startDate: {
          $gte: query.fromDate ? new Date(query.fromDate) : undefined,
        },
        endDate: {
          $lte: query.toDate ? new Date(query.toDate) : undefined,
        },
      })
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
      startDate,
      endDate,
    });
    return createdEntity.toObject();
  }
}
