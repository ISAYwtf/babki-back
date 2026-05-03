import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { getPagination } from '../../common/utils/pagination.util';
import {
  SavingSnapshots,
  SavingSnapshotsDocument,
} from '../savings-snapshots/schemas/savings-snapshots.schema';
import { Saving, SavingDocument } from '../savings/schemas/savings.schema';
import { CreateSavingSnapshotTransactionDto } from './dto/create.dto';
import { ListSavingTransactionsQueryDto } from './dto/list-saving-transactions-query.dto';
import {
  SavingTransaction,
  SavingTransactionDocument,
} from './schemas/saving-transaction.schema';

@Injectable()
export class SavingsTransactionsService {
  constructor(
    @InjectModel(SavingTransaction.name)
    private readonly savingTransactionModel: Model<SavingTransactionDocument>,
    @InjectModel(SavingSnapshots.name)
    private readonly snapshotsModel: Model<SavingSnapshotsDocument>,
    @InjectModel(Saving.name)
    private readonly savingsModel: Model<SavingDocument>,
  ) {}

  async findAll(
    userId: string,
    snapshotId: string,
    query: ListSavingTransactionsQueryDto,
  ): Promise<PaginatedResponse<SavingTransaction>> {
    const foundSnapshotId = await this.ensureSnapshotExists(userId, snapshotId);

    const { page, limit, skip } = getPagination(query);
    const filter = {
      snapshotId: foundSnapshotId,
    };

    const [items, total] = await Promise.all([
      this.savingTransactionModel
        .find(filter)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.savingTransactionModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(
    userId: string,
    snapshotId: string,
    savingTransactionId: string,
  ) {
    const foundSnapshotId = await this.ensureSnapshotExists(userId, snapshotId);

    const savingTransaction = await this.savingTransactionModel
      .findOne({
        _id: savingTransactionId,
        snapshotId: foundSnapshotId,
      })
      .lean()
      .exec();

    if (!savingTransaction) {
      throw new NotFoundException(
        `Saving transaction ${savingTransactionId} for snapshot ${snapshotId} not found.`,
      );
    }

    return savingTransaction;
  }

  async create(
    userId: string,
    createTransactionDto: CreateSavingSnapshotTransactionDto,
  ) {
    const foundSnapshotId = await this.ensureSnapshotExists(
      userId,
      createTransactionDto.snapshotId,
    );

    const transaction = await this.savingTransactionModel.create({
      snapshotId: foundSnapshotId,
      transactionDate: createTransactionDto.transactionDate,
      amount: createTransactionDto.amount,
    });

    return transaction.toObject();
  }

  async deleteAllBySnapshotIds(snapshotIds: Types.ObjectId[]) {
    await this.savingTransactionModel.deleteMany({
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

    const saving = await this.savingsModel.exists({
      _id: snapshot.savingId,
      userId: new Types.ObjectId(userId),
    });

    if (!saving) {
      throw new NotFoundException(`Snapshot ${snapshotId} not found.`);
    }

    return snapshot._id;
  }
}
