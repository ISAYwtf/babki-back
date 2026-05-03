import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SavingsTransactionsService } from '../savings-transactions/savings-transactions.service';
import { Saving, SavingDocument } from '../savings/schemas/savings.schema';
import { CreateSavingSnapshotDto } from './dto/create-snapshot.dto';
import { UpdateSavingSnapshotQueryDto } from './dto/update-snapshot-query.dto';
import { UpdateSavingSnapshotDto } from './dto/update-snapshot.dto';
import {
  SavingSnapshots,
  SavingSnapshotsDocument,
} from './schemas/savings-snapshots.schema';

@Injectable()
export class SavingsSnapshotsService {
  constructor(
    @InjectModel(SavingSnapshots.name)
    private readonly snapshotsModel: Model<SavingSnapshotsDocument>,
    @InjectModel(Saving.name)
    private readonly savingsModel: Model<SavingDocument>,
    private readonly savingTransactionService: SavingsTransactionsService,
  ) {}

  async findBySavingId(userId: string, savingId: string, date?: string) {
    const foundSavingId = await this.ensureSavingExists(userId, savingId);
    const requestedDate = date ? new Date(date) : new Date();

    const entity = await this.snapshotsModel
      .findOne({
        savingId: foundSavingId,
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
    savingId: string,
    createSnapshotDto: CreateSavingSnapshotDto,
  ) {
    const foundSavingId = await this.ensureSavingExists(userId, savingId);
    const snapshotDate = new Date(createSnapshotDto.date);

    const existingEntity = await this.snapshotsModel
      .findOne({ savingId: foundSavingId, date: snapshotDate })
      .lean()
      .exec();

    if (existingEntity) {
      throw new ConflictException(
        `Snapshot for saving ${savingId} on ${createSnapshotDto.date} already exists.`,
      );
    }

    return await this.snapshotsModel.create({
      savingId: foundSavingId,
      ...createSnapshotDto,
      date: snapshotDate,
    });
  }

  async recalculateSnapshotsFromDate(
    userId: string,
    savingId: string,
    queryDto: UpdateSavingSnapshotQueryDto,
    updateSavingDto: UpdateSavingSnapshotDto,
  ) {
    const entity = await this.snapshotsModel
      .findOne({
        savingId: new Types.ObjectId(savingId),
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

    const foundSavingId = await this.ensureSavingExists(userId, savingId);

    // TODO Обернуть в транзакцию
    await this.savingTransactionService.create(userId, {
      snapshotId: entity._id.toString(),
      transactionDate: queryDto.date,
      amount: updateSavingDto.amount,
    });

    await this.snapshotsModel.updateMany(
      { savingId: foundSavingId, date: { $gte: entity.date } },
      [
        {
          $set: {
            amount: { $add: ['$amount', updateSavingDto.amount] },
          },
        },
      ],
      { updatePipeline: true },
    );
  }

  async deleteEntity(userId: string, savingId: string, entityId: string) {
    const foundSavingId = await this.ensureSavingExists(userId, savingId);

    // TODO Обернуть в транзакцию
    await this.savingTransactionService.deleteAllBySnapshotIds([
      new Types.ObjectId(entityId),
    ]);
    await this.snapshotsModel.findOneAndDelete({
      _id: entityId,
      savingId: foundSavingId,
    });

    return null;
  }

  async deleteAllBySavingId(userId: string, savingId: string) {
    const foundSavingId = await this.ensureSavingExists(userId, savingId);
    const snapshots = (await this.snapshotsModel
      .find({ savingId: foundSavingId })
      .select('_id')) as Types.ObjectId[];

    await this.savingTransactionService.deleteAllBySnapshotIds(
      snapshots.map((snapshot) => snapshot._id),
    );

    await this.snapshotsModel.deleteMany({ savingId: foundSavingId });
  }

  // TODO Параметры сортировки и пагинации
  findAllBySavingId(savingId: string) {
    return this.snapshotsModel
      .find({ savingId: new Types.ObjectId(savingId) })
      .limit(20)
      .sort({ date: -1 })
      .lean();
  }

  private async ensureSavingExists(userId: string, savingId: string) {
    const savingEntity = await this.savingsModel.exists({
      _id: savingId,
      userId: new Types.ObjectId(userId),
    });

    if (!savingEntity) {
      throw new NotFoundException(
        `Saving ${savingId} for user ${userId} not found.`,
      );
    }

    return savingEntity._id;
  }
}
