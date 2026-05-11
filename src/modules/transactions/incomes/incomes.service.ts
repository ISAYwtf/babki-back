import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountsSnapshotsService } from '../../accounts-snapshots/accounts-snapshots.service';
import { ListTransactionsQueryDto } from '../dto/list-transactions-query.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { Income, IncomeDocument } from '../schemas/income.schema';
import { UpdateIncomeDto } from './dto/update-income.dto';

@Injectable()
export class IncomesService {
  constructor(
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
    private readonly snapshotsService: AccountsSnapshotsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(userId: string, createIncomeDto: CreateIncomeDto) {
    const foundIds = await this.transactionsService.ensureUserExists(userId);
    const foundSnapshot = await this.snapshotsService.findOrCreateByAccountId(
      userId,
      foundIds.accountId.toString(),
      createIncomeDto.transactionDate,
    );

    if (!foundSnapshot) {
      throw new NotFoundException(
        `Snapshot for account ${foundIds.accountId.toString()} not found.`,
      );
    }

    // TODO Обернуть в транзакцию
    const createdIncome = await this.incomeModel.create({
      userId: foundIds.userId,
      accountId: foundIds.accountId,
      snapshotId: foundSnapshot._id,
      ...createIncomeDto,
    });
    await this.snapshotsService.recalculateSnapshotsFromDate(
      userId,
      foundSnapshot.accountId.toString(),
      { date: createIncomeDto.transactionDate },
      { amount: createIncomeDto.amount },
    );

    return createdIncome.toJSON();
  }

  async findAll(userId: string, query: ListTransactionsQueryDto) {
    return this.transactionsService.findAll(userId, query, this.incomeModel);
  }

  async findRevenue(userId: string, query: ListTransactionsQueryDto) {
    return this.transactionsService.findRevenue(
      userId,
      query,
      this.incomeModel,
    );
  }

  async findOne(userId: string, incomeId: string) {
    return this.transactionsService.findOne(userId, incomeId, this.incomeModel);
  }

  // TODO Обернуть в транзакцию
  async update(
    userId: string,
    transactionId: string,
    updateIncomeDto: UpdateIncomeDto,
  ) {
    const income = await this.findOne(userId, transactionId);

    if (!income) {
      throw new NotFoundException(`Income ${transactionId} not found`);
    }

    const updatePayload = Object.fromEntries(
      Object.entries({
        amount: updateIncomeDto.amount,
        description: updateIncomeDto.description,
        source: updateIncomeDto.source,
      }).filter(([, value]) => value !== undefined),
    );

    if (updateIncomeDto.amount) {
      const diffAmount = updateIncomeDto.amount - income.amount;
      await this.snapshotsService.recalculateSnapshotsFromDate(
        userId,
        income.accountId.toString(),
        { date: income.transactionDate.toISOString() },
        { amount: diffAmount },
      );
    }

    // TODO Проверить с пустыми значениями для удаления
    const updatedIncome = await this.incomeModel
      .findByIdAndUpdate(
        transactionId,
        { $set: updatePayload },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .lean();

    if (!updatedIncome) {
      throw new NotFoundException(
        `Income ${transactionId} for user ${userId} not found.`,
      );
    }

    return updatedIncome;
  }
}
