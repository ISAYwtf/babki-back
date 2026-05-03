import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { startOfMonth } from 'date-fns/startOfMonth';
import { Model } from 'mongoose';
import { SavingsSnapshotsService } from '../savings-snapshots/savings-snapshots.service';
import { SavingSnapshotsDocument } from '../savings-snapshots/schemas/savings-snapshots.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateSavingDto } from './dto/create.dto';
import { UpdateSavingQueryDto } from './dto/update-query.dto';
import { UpdateSavingDto } from './dto/update.dto';
import { Saving, SavingDocument } from './schemas/savings.schema';

@Injectable()
export class SavingsService {
  constructor(
    @InjectModel(Saving.name)
    private readonly savingModel: Model<SavingDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly snapshotsService: SavingsSnapshotsService,
  ) {}

  async findByUserId(userId: string) {
    const foundUserId = await this.ensureUserExists(userId);
    const entity = await this.savingModel
      .findOne({ userId: foundUserId })
      .lean()
      .exec();

    if (!entity) {
      throw new NotFoundException(`Saving for user ${userId} not found.`);
    }

    return await this.buildResponse(entity);
  }

  // TODO Изменить после добавление отличительных полей (например, валюта)
  async create(userId: string, createSavingDto: CreateSavingDto) {
    const foundUserId = await this.ensureUserExists(userId);

    const existingEntity = await this.savingModel
      .findOne({ userId: foundUserId })
      .lean();

    if (existingEntity) {
      return await this.buildResponse(existingEntity);
    }

    // TODO Обернуть в транзакцию
    const createdEntity = await this.savingModel.create({
      userId: foundUserId,
    });
    const snapshot = await this.snapshotsService.create(
      userId,
      createdEntity._id.toString(),
      {
        amount: createSavingDto.amount ?? 0,
        date: startOfMonth(new Date()).toISOString(),
      },
    );
    return await this.buildResponse(createdEntity.toObject(), [snapshot]);
  }

  async deleteEntity(userId: string, entityId: string) {
    const foundUserId = await this.ensureUserExists(userId);

    // TODO Обернуть в транзакцию
    await this.snapshotsService.deleteAllBySavingId(userId, entityId);
    await this.savingModel.findOneAndDelete({
      _id: entityId,
      userId: foundUserId,
    });

    return null;
  }

  async updateAmount(
    userId: string,
    entityId: string,
    queryDto: UpdateSavingQueryDto,
    updateSavingDto: UpdateSavingDto,
  ) {
    await this.snapshotsService.recalculateSnapshotsFromDate(
      userId,
      entityId,
      queryDto,
      updateSavingDto,
    );
    return await this.findByUserId(userId);
  }

  private async ensureUserExists(userId: string) {
    const userEntity = await this.userModel.exists({ _id: userId });

    if (!userEntity) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    return userEntity._id;
  }

  private async buildResponse(
    entity: SavingDocument,
    existingSnapshots?: SavingSnapshotsDocument[],
  ) {
    const snapshots =
      existingSnapshots ??
      (await this.snapshotsService.findAllBySavingId(entity._id.toString()));

    return {
      ...entity,
      amount: snapshots[0]?.amount ?? 0,
      timeline: snapshots,
    };
  }
}
