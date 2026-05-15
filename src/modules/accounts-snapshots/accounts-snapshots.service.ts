import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { startOfMonth } from 'date-fns/startOfMonth';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../accounts/schemas/accounts.schema';
import { CreateAccountSnapshotDto } from './dto/create.dto';
import { UpdateAccountSnapshotQueryDto } from './dto/update-query.dto';
import { UpdateAccountSnapshotDto } from './dto/update.dto';
import {
  AccountSnapshot,
  AccountSnapshotsDocument,
} from './schemas/accounts-snapshots.schema';

@Injectable()
export class AccountsSnapshotsService {
  constructor(
    @InjectModel(AccountSnapshot.name)
    private readonly snapshotsModel: Model<AccountSnapshotsDocument>,
    @InjectModel(Account.name)
    private readonly accountsModel: Model<AccountDocument>,
  ) {}

  async findByAccountId(userId: string, accountId: string, date?: string) {
    const foundAccountId = await this.ensureAccountExists(userId, accountId);
    const requestedDate = date ? new Date(date) : new Date();

    const entity = await this.snapshotsModel
      .findOne({
        accountId: foundAccountId,
        date: { $lte: requestedDate },
      })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    if (!entity) {
      return null;
    }

    return entity;
  }

  async findOrCreateByAccountId(
    userId: string,
    accountId: string,
    date?: string,
  ) {
    const foundSnapshot = await this.findByAccountId(userId, accountId, date);
    const resolvedDate = date ? new Date(date) : new Date();
    if (
      !foundSnapshot ||
      foundSnapshot.date.getMonth() !== resolvedDate.getMonth()
    ) {
      const createdSnapshot = await this.snapshotsModel.create({
        accountId: new Types.ObjectId(accountId),
        amount: foundSnapshot?.amount ?? 0,
        date: startOfMonth(resolvedDate),
      });
      return createdSnapshot.toObject();
    }
    return foundSnapshot;
  }

  async create(
    userId: string,
    accountId: string,
    createSnapshotDto: CreateAccountSnapshotDto,
  ) {
    const createDtoInstance = plainToInstance(
      CreateAccountSnapshotDto,
      createSnapshotDto,
    );
    const foundAccountId = await this.ensureAccountExists(userId, accountId);

    const existingEntity = await this.snapshotsModel
      .findOne({ accountId: foundAccountId, date: createDtoInstance.date })
      .lean()
      .exec();

    if (existingEntity) {
      throw new ConflictException(
        `Snapshot for account ${accountId} on ${createSnapshotDto.date.toISOString()} already exists.`,
      );
    }

    return await this.snapshotsModel.create({
      accountId: foundAccountId,
      ...createDtoInstance,
    });
  }

  async recalculateSnapshotsFromDate(
    userId: string,
    accountId: string,
    queryDto: UpdateAccountSnapshotQueryDto,
    updateDto: UpdateAccountSnapshotDto,
  ) {
    const entity = await this.snapshotsModel
      .findOne({
        accountId: new Types.ObjectId(accountId),
        date: { $lte: queryDto.date },
      })
      .sort({ date: -1, createdAt: -1 })
      .lean()
      .exec();

    if (!entity) {
      throw new NotFoundException(
        `Snapshot for date ${queryDto.date} not found.`,
      );
    }

    const foundAccountId = await this.ensureAccountExists(userId, accountId);

    await this.snapshotsModel.updateMany(
      { accountId: foundAccountId, date: { $gte: entity.date } },
      [
        {
          $set: {
            amount: { $add: ['$amount', updateDto.amount] },
          },
        },
      ],
      { updatePipeline: true, runValidators: true },
    );
  }

  async deleteAllByAccountId(userId: string, accountId: string) {
    const foundAccountId = await this.ensureAccountExists(userId, accountId);
    await this.snapshotsModel.deleteMany({ accountId: foundAccountId });
  }

  // TODO Параметры сортировки и пагинации
  async findAllByAccounts(accountIds: Types.ObjectId[]) {
    return this.snapshotsModel.aggregate<{
      _id: Types.ObjectId;
      documents: AccountSnapshotsDocument[];
    }>([
      { $match: { accountId: { $in: accountIds } } },
      {
        $group: {
          _id: '$accountId',
          documents: {
            $topN: {
              n: 20,
              sortBy: { date: -1, createdAt: -1 },
              output: '$$ROOT',
            },
          },
        },
      },
    ]);
  }

  private async ensureAccountExists(userId: string, accountId: string) {
    const accountEntity = await this.accountsModel.exists({
      _id: accountId,
      userId: new Types.ObjectId(userId),
    });

    if (!accountEntity) {
      throw new NotFoundException(
        `Account ${accountId} for user ${userId} not found.`,
      );
    }

    return accountEntity._id;
  }
}
