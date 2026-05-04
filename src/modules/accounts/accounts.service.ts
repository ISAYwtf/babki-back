import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { startOfMonth } from 'date-fns/startOfMonth';
import { Model } from 'mongoose';
import { AccountsSnapshotsService } from '../accounts-snapshots/accounts-snapshots.service';
import { AccountSnapshotsDocument } from '../accounts-snapshots/schemas/accounts-snapshots.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateAccountDto } from './dto/create.dto';
import { UpdateAccountQueryDto } from './dto/update-query.dto';
import { UpdateAccountDto } from './dto/update.dto';
import { Account, AccountDocument } from './schemas/accounts.schema';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly snapshotsService: AccountsSnapshotsService,
  ) {}

  async findByUserId(userId: string) {
    const foundUserId = await this.ensureUserExists(userId);
    const entity = await this.accountModel
      .findOne({ userId: foundUserId })
      .lean()
      .exec();

    if (!entity) {
      throw new NotFoundException(`Account for user ${userId} not found.`);
    }

    return await this.buildResponse(entity);
  }

  // TODO Изменить после добавление отличительных полей (например, валюта)
  async create(userId: string, createAccountDto: CreateAccountDto) {
    const foundUserId = await this.ensureUserExists(userId);

    const existingEntity = await this.accountModel
      .findOne({ userId: foundUserId })
      .lean();

    if (existingEntity) {
      return await this.buildResponse(existingEntity);
    }

    // TODO Обернуть в транзакцию
    const createdEntity = await this.accountModel.create({
      userId: foundUserId,
    });
    const snapshot = await this.snapshotsService.create(
      userId,
      createdEntity._id.toString(),
      {
        amount: createAccountDto.amount ?? 0,
        date: startOfMonth(new Date()).toISOString(),
      },
    );
    return await this.buildResponse(createdEntity.toObject(), [snapshot]);
  }

  async updateAmount(
    userId: string,
    entityId: string,
    queryDto: UpdateAccountQueryDto,
    updateAccountDto: UpdateAccountDto,
  ) {
    await this.snapshotsService.recalculateSnapshotsFromDate(
      userId,
      entityId,
      queryDto,
      updateAccountDto,
    );
    return await this.findByUserId(userId);
  }

  async deleteEntity(userId: string, entityId: string) {
    const foundUserId = await this.ensureUserExists(userId);

    // TODO Обернуть в транзакцию
    await this.snapshotsService.deleteAllBySavingId(userId, entityId);
    await this.accountModel.findOneAndDelete({
      _id: entityId,
      userId: foundUserId,
    });

    return null;
  }

  private async ensureUserExists(userId: string) {
    const exists = await this.userModel.exists({ _id: userId });

    if (!exists) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    return exists._id;
  }

  private async buildResponse(
    entity: AccountDocument,
    existingSnapshots?: AccountSnapshotsDocument[],
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

  private isDuplicateKeyError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
