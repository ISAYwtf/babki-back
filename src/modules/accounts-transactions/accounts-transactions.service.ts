import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { getPagination } from '../../common/utils/pagination.util';
import {
  AccountSnapshot,
  AccountSnapshotsDocument,
} from '../accounts-snapshots/schemas/accounts-snapshots.schema';
import { Account, AccountDocument } from '../accounts/schemas/accounts.schema';
import { CreateAccountSnapshotTransactionDto } from './dto/create.dto';
import { ListAccountTransactionsQueryDto } from './dto/list-transactions-query.dto';
import {
  AccountTransaction,
  AccountTransactionDocument,
} from './schemas/account-transaction.schema';

@Injectable()
export class AccountsTransactionsService {
  constructor(
    @InjectModel(AccountTransaction.name)
    private readonly transactionModel: Model<AccountTransactionDocument>,
    @InjectModel(AccountSnapshot.name)
    private readonly snapshotsModel: Model<AccountSnapshotsDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
  ) {}

  async findAll(
    userId: string,
    snapshotId: string,
    query: ListAccountTransactionsQueryDto,
  ): Promise<PaginatedResponse<AccountTransaction>> {
    const foundSnapshot = await this.ensureSnapshotExists(userId, snapshotId);

    const { page, limit, skip } = getPagination(query);
    const filter = {
      snapshotId: foundSnapshot._id,
    };

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(userId: string, snapshotId: string, transactionId: string) {
    const foundSnapshot = await this.ensureSnapshotExists(userId, snapshotId);

    const accountTransaction = await this.transactionModel
      .findOne({
        _id: transactionId,
        snapshotId: foundSnapshot._id,
      })
      .lean()
      .exec();

    if (!accountTransaction) {
      throw new NotFoundException(
        `Account transaction ${transactionId} for snapshot ${snapshotId} not found.`,
      );
    }

    return accountTransaction;
  }

  async create(
    userId: string,
    createTransactionDto: CreateAccountSnapshotTransactionDto,
  ) {
    const foundSnapshot = await this.ensureSnapshotExists(
      userId,
      createTransactionDto.snapshotId,
    );

    const fallbackTransactionType =
      createTransactionDto.amount > 0 ? 'income' : 'expense';

    const transaction = await this.transactionModel.create({
      snapshotId: foundSnapshot._id,
      accountId: foundSnapshot.accountId,
      transactionDate: createTransactionDto.transactionDate,
      amount: createTransactionDto.amount,
      type: createTransactionDto.type ?? fallbackTransactionType,
    });

    return transaction.toObject();
  }

  async deleteAllBySnapshotIds(snapshotIds: Types.ObjectId[]) {
    await this.transactionModel.deleteMany({
      snapshotId: {
        $in: snapshotIds,
      },
    });
  }

  private async ensureSnapshotExists(userId: string, snapshotId: string) {
    const snapshot = await this.snapshotsModel
      .findById(snapshotId)
      .lean()
      .exec();

    if (!snapshot) {
      throw new NotFoundException(`Snapshot ${snapshotId} not found.`);
    }

    const account = await this.accountModel.exists({
      _id: snapshot.accountId,
      userId: new Types.ObjectId(userId),
    });

    if (!account) {
      throw new NotFoundException(
        `Account ${snapshot.accountId.toString()} not found.`,
      );
    }

    return snapshot;
  }
}
