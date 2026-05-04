import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountsTransactionsService } from '../accounts-transactions/accounts-transactions.service';
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
    private readonly transactionsService: AccountsTransactionsService,
  ) {}

  async findByAccountId(userId: string, accountId: string, date?: string) {
    const foundAccountId = await this.ensureAccountExists(userId, accountId);
    const requestedDate = date ? new Date(date) : new Date();

    const entity = await this.snapshotsModel
      .findOne({
        accountId: foundAccountId,
        date: { $lte: requestedDate },
      })
      .sort({ date: -1 })
      .lean();

    if (!entity) {
      return null;
    }

    return entity;
  }

  async create(
    userId: string,
    accountId: string,
    createSnapshotDto: CreateAccountSnapshotDto,
  ) {
    const foundAccountId = await this.ensureAccountExists(userId, accountId);
    const snapshotDate = new Date(createSnapshotDto.date);

    const existingEntity = await this.snapshotsModel
      .findOne({ accountId: foundAccountId, date: snapshotDate })
      .lean()
      .exec();

    if (existingEntity) {
      throw new ConflictException(
        `Snapshot for account ${accountId} on ${createSnapshotDto.date} already exists.`,
      );
    }

    return await this.snapshotsModel.create({
      accountId: foundAccountId,
      ...createSnapshotDto,
      date: snapshotDate,
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
      .sort({ date: -1 })
      .lean()
      .exec();

    if (!entity) {
      throw new NotFoundException(
        `Snapshot for date ${queryDto.date} not found.`,
      );
    }

    const foundAccountId = await this.ensureAccountExists(userId, accountId);

    // TODO Обернуть в транзакцию
    await this.transactionsService.create(userId, {
      snapshotId: entity._id.toString(),
      transactionDate: queryDto.date,
      amount: updateDto.amount,
    });

    await this.snapshotsModel.updateMany(
      { accountId: foundAccountId, date: { $gte: entity.date } },
      [
        {
          $set: {
            amount: { $add: ['$amount', updateDto.amount] },
          },
        },
      ],
      { updatePipeline: true },
    );
  }

  async deleteEntity(userId: string, accountId: string, entityId: string) {
    const foundAccountId = await this.ensureAccountExists(userId, accountId);

    // TODO Обернуть в транзакцию
    await this.transactionsService.deleteAllBySnapshotIds([
      new Types.ObjectId(entityId),
    ]);
    await this.snapshotsModel.findOneAndDelete({
      _id: entityId,
      accountId: foundAccountId,
    });

    return null;
  }

  async deleteAllBySavingId(userId: string, accountId: string) {
    const foundAccountId = await this.ensureAccountExists(userId, accountId);
    const snapshots = (await this.snapshotsModel
      .find({ accountId: foundAccountId })
      .select('_id')) as Types.ObjectId[];

    await this.transactionsService.deleteAllBySnapshotIds(
      snapshots.map((snapshot) => snapshot._id),
    );

    await this.snapshotsModel.deleteMany({ accountId: foundAccountId });
  }

  // TODO Параметры сортировки и пагинации
  findAllBySavingId(accountId: string) {
    return this.snapshotsModel
      .find({ accountId: new Types.ObjectId(accountId) })
      .limit(20)
      .sort({ date: -1 })
      .lean();
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
