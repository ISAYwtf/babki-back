import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountsSnapshotsService } from '../../accounts-snapshots/accounts-snapshots.service';
import { ListTransactionsQueryDto } from '../dto/list-transactions-query.dto';
import { Save, SaveDocument } from '../schemas/save.schema';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateSaveDto } from './dto/create-save.dto';
import { UpdateSaveDto } from './dto/update-save.dto';

@Injectable()
export class SavesService {
  constructor(
    @InjectModel(Save.name)
    private readonly saveModel: Model<SaveDocument>,
    private readonly snapshotsService: AccountsSnapshotsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(userId: string, createSaveDto: CreateSaveDto) {
    const foundIds = await this.transactionsService.ensureUserExists(
      userId,
      'saving',
    );
    const transactionDate =
      createSaveDto.transactionDate ?? new Date().toISOString();
    const foundSnapshot = await this.snapshotsService.findOrCreateByAccountId(
      userId,
      foundIds.accountId.toString(),
      transactionDate,
    );

    if (!foundSnapshot) {
      throw new NotFoundException(
        `Snapshot for account ${foundIds.accountId.toString()} not found.`,
      );
    }

    // TODO Обернуть в транзакцию
    const createdSave = await this.saveModel.create({
      userId: foundIds.userId,
      accountId: foundIds.accountId,
      snapshotId: foundSnapshot._id,
      ...createSaveDto,
    });
    await this.snapshotsService.recalculateSnapshotsFromDate(
      userId,
      foundSnapshot.accountId.toString(),
      { date: transactionDate },
      { amount: createSaveDto.amount },
    );
    await this.snapshotsService.recalculateSnapshotsFromDate(
      userId,
      createSaveDto.sourceAccountId,
      { date: transactionDate },
      { amount: -createSaveDto.amount },
    );

    return createdSave.toJSON();
  }

  // TODO Добавить сортировку в DTO
  async findAll(userId: string, query: ListTransactionsQueryDto) {
    return this.transactionsService.findAll(
      userId,
      { ...query, transactionType: 'save' },
      this.saveModel,
    );
  }

  async findRevenue(userId: string, query: ListTransactionsQueryDto) {
    return this.transactionsService.findRevenue(
      userId,
      { ...query, transactionType: 'save' },
      this.saveModel,
    );
  }

  async findOne(userId: string, transactionId: string) {
    return this.transactionsService.findOne(
      userId,
      transactionId,
      this.saveModel,
    );
  }

  // TODO Обернуть в транзакцию
  async update(
    userId: string,
    transactionId: string,
    updateIncomeDto: UpdateSaveDto,
  ) {
    const save = await this.findOne(userId, transactionId);

    if (!save) {
      throw new NotFoundException(`Save ${transactionId} not found`);
    }

    const updatePayload = Object.fromEntries(
      Object.entries({
        amount: updateIncomeDto.amount,
        description: updateIncomeDto.description,
      }).filter(([, value]) => value !== undefined),
    );

    if (updateIncomeDto.amount) {
      const diffAmount = updateIncomeDto.amount - save.amount;
      await this.snapshotsService.recalculateSnapshotsFromDate(
        userId,
        save.accountId.toString(),
        { date: save.transactionDate.toISOString() },
        { amount: diffAmount },
      );
    }

    // TODO Проверить с пустыми значениями для удаления
    const updatedSave = await this.saveModel
      .findByIdAndUpdate(
        transactionId,
        { $set: updatePayload },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .lean();

    if (!updatedSave) {
      throw new NotFoundException(
        `Save ${transactionId} for user ${userId} not found.`,
      );
    }

    return updatedSave;
  }
}
