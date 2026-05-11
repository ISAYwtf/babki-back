import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { getPagination } from 'src/common/utils/pagination.util';
import {
  Account,
  AccountDocument,
  AccountType,
} from 'src/modules/accounts/schemas/accounts.schema';
import { AccountsSnapshotsService } from '../../accounts-snapshots/accounts-snapshots.service';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { ListTransactionsQueryDto } from '../dto/list-transactions-query.dto';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
} from '../schemas/transaction.schema';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    private readonly snapshotService: AccountsSnapshotsService,
  ) {}

  async findAll(
    userId: string,
    query: ListTransactionsQueryDto,
    model: Model<Transaction> = this.transactionModel,
  ) {
    const foundIds = await this.ensureUserExists(
      userId,
      query.transactionType === 'save' ? 'saving' : undefined,
    );
    const { page, limit, skip } = getPagination(query);
    const filter = this.buildFilter(foundIds.userId, query);

    const [items, total] = await Promise.all([
      model
        .find(filter)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      model.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(
    userId: string,
    transactionId: string,
    model: Model<Transaction> = this.transactionModel,
  ) {
    const accountTransaction = await model
      .findOne({
        _id: transactionId,
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();

    if (!accountTransaction) {
      throw new NotFoundException(
        `Transaction ${transactionId} for user ${userId} not found.`,
      );
    }

    return accountTransaction;
  }

  async findRevenue(
    userId: string,
    query: ListTransactionsQueryDto,
    model: Model<Transaction> = this.transactionModel,
  ) {
    const foundIds = await this.ensureUserExists(
      userId,
      query.transactionType === 'save' ? 'saving' : undefined,
    );
    const filter = this.buildFilter(foundIds.userId, query);

    const aggregate = await model.aggregate<{
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
      ...query,
      totalRevenue: aggregate[0]?.totalRevenue ?? 0,
    };
  }

  // TODO Обернуть в транзакцию
  async delete(userId: string, transactionId: string) {
    await this.ensureUserExists(userId);
    const transaction =
      await this.transactionModel.findByIdAndDelete(transactionId);

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    const diffAmount =
      transaction.type === 'income' ? -transaction.amount : transaction.amount;

    await this.snapshotService.recalculateSnapshotsFromDate(
      userId,
      transaction.accountId.toString(),
      { date: transaction.transactionDate.toISOString() },
      { amount: diffAmount },
    );

    return null;
  }

  async deleteAllByAccountId(userId: string, accountId: string) {
    await this.transactionModel.deleteMany({
      userId: new Types.ObjectId(userId),
      accountId: new Types.ObjectId(accountId),
    });
  }

  buildFilter(
    userId: Types.ObjectId,
    query: Pick<
      ListTransactionsQueryDto,
      'snapshotId' | 'accountId' | 'fromDate' | 'toDate' | 'transactionType'
    >,
  ) {
    const filter: {
      userId: Types.ObjectId;
      type?: TransactionType;
      transactionDate?: {
        $gte?: Date;
        $lte?: Date;
      };
      snapshotId?: Types.ObjectId;
      accountId?: Types.ObjectId;
    } = { userId };

    if (query.snapshotId) {
      filter.snapshotId = new Types.ObjectId(query.snapshotId);
    }

    if (query.accountId) {
      filter.accountId = new Types.ObjectId(query.accountId);
    }

    if (query.transactionType) {
      filter.type = query.transactionType;
    }

    if (query.fromDate || query.toDate) {
      const incomeDateFilter: { $gte?: Date; $lte?: Date } = {};

      if (query.fromDate) {
        incomeDateFilter.$gte = new Date(query.fromDate);
      }

      if (query.toDate) {
        incomeDateFilter.$lte = new Date(query.toDate);
      }

      filter.transactionDate = incomeDateFilter;
    }

    return filter;
  }

  async ensureUserExists(userId: string, accountType: AccountType = 'balance') {
    const foundUser = await this.userModel.exists({ _id: userId });

    if (!foundUser) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    const account = await this.accountModel.exists({
      userId: foundUser._id,
      type: accountType,
    });

    if (!account) {
      throw new NotFoundException(`Account for user ${userId} not found.`);
    }

    return {
      userId: foundUser._id,
      accountId: account._id,
    };
  }
}
