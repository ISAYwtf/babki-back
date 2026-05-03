import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { getPagination } from '../../common/utils/pagination.util';
import { Debt, DebtDocument } from '../debts/schemas/debt.schema';
import { ListDebtTransactionsQueryDto } from './dto/list-debt-transactions-query.dto';
import {
  DebtTransaction,
  DebtTransactionDocument,
} from './schemas/debt-transaction.schema';

@Injectable()
export class DebtTransactionsService {
  constructor(
    @InjectModel(DebtTransaction.name)
    private readonly debtTransactionModel: Model<DebtTransactionDocument>,
    @InjectModel(Debt.name) private readonly debtModel: Model<DebtDocument>,
  ) {}

  async findAll(
    userId: string,
    debtId: string,
    query: ListDebtTransactionsQueryDto,
  ): Promise<PaginatedResponse<DebtTransaction>> {
    await this.ensureDebtExists(userId, debtId);

    const { page, limit, skip } = getPagination(query);
    const filter = {
      debtId: new Types.ObjectId(debtId),
    };

    const [items, total] = await Promise.all([
      this.debtTransactionModel
        .find(filter)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.debtTransactionModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(userId: string, debtId: string, debtTransactionId: string) {
    await this.ensureDebtExists(userId, debtId);

    const debtTransaction = await this.debtTransactionModel
      .findOne({
        _id: debtTransactionId,
        debtId: new Types.ObjectId(debtId),
      })
      .lean()
      .exec();

    if (!debtTransaction) {
      throw new NotFoundException(
        `Debt transaction ${debtTransactionId} for debt ${debtId} not found.`,
      );
    }

    return debtTransaction;
  }

  private async ensureDebtExists(userId: string, debtId: string) {
    const found = await this.debtModel.exists({
      _id: debtId,
      userId: new Types.ObjectId(userId),
    });

    if (!found) {
      throw new NotFoundException(`Debt ${debtId} is not found.`);
    }
  }
}
