import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { getPagination } from '../../common/utils/pagination.util';
import {
  DebtTransaction,
  DebtTransactionDocument,
} from '../debt-transactions/schemas/debt-transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateDebtDto } from './dto/create-debt.dto';
import { ListDebtsQueryDto } from './dto/list-debts-query.dto';
import { RepayDebtDto } from './dto/repay-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { Debt, DebtDocument } from './schemas/debt.schema';

@Injectable()
export class DebtsService {
  constructor(
    @InjectModel(Debt.name) private readonly debtModel: Model<DebtDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(DebtTransaction.name)
    private readonly debtTransactionModel: Model<DebtTransactionDocument>,
  ) {}

  async create(userId: string, createDebtDto: CreateDebtDto) {
    const foundUserId = await this.ensureUserExists(userId);
    this.validateAmounts(
      createDebtDto.principalAmount,
      createDebtDto.remainingAmount,
    );

    const debt = await this.debtModel.create({
      userId: foundUserId,
      ...createDebtDto,
    });

    return debt.toObject();
  }

  async findAll(
    userId: string,
    query: ListDebtsQueryDto,
  ): Promise<PaginatedResponse<Debt>> {
    const foundUserId = await this.ensureUserExists(userId);

    const { page, limit, skip } = getPagination(query);
    const filter: {
      userId: Types.ObjectId;
      status?: 'active' | 'closed';
    } = { userId: foundUserId };

    if (query.status) {
      filter.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.debtModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.debtModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(userId: string, debtId: string) {
    const foundUserId = await this.ensureUserExists(userId);

    const debt = await this.debtModel
      .findOne({ _id: debtId, userId: foundUserId })
      .lean()
      .exec();

    if (!debt) {
      throw new NotFoundException(
        `Debt ${debtId} for user ${userId} not found.`,
      );
    }

    return debt;
  }

  // TODO There may be a discrepancy between the data in the transactions and the current document
  async update(userId: string, debtId: string, updateDebtDto: UpdateDebtDto) {
    const foundUserId = await this.ensureUserExists(userId);

    const currentDebt = await this.debtModel
      .findOne({ _id: debtId, userId: foundUserId })
      .lean()
      .exec();

    if (!currentDebt) {
      throw new NotFoundException(
        `Debt ${debtId} for user ${userId} not found.`,
      );
    }

    const principal =
      updateDebtDto.principalAmount ?? currentDebt.principalAmount;
    const remaining =
      updateDebtDto.remainingAmount ?? currentDebt.remainingAmount;

    this.validateAmounts(principal, remaining);

    return this.debtModel
      .findOneAndUpdate({ _id: debtId, userId: foundUserId }, updateDebtDto, {
        returnDocument: 'after',
        runValidators: true,
      })
      .lean()
      .exec();
  }

  async repay(userId: string, debtId: string, repayDebtDto: RepayDebtDto) {
    const foundUserId = await this.ensureUserExists(userId);

    const currentDebt = await this.debtModel
      .findOne({ _id: debtId, userId: foundUserId })
      .lean()
      .exec();

    if (!currentDebt) {
      throw new NotFoundException(
        `Debt ${debtId} for user ${userId} not found.`,
      );
    }

    if (currentDebt.status === 'closed') {
      throw new BadRequestException(
        'Cannot record a repayment for a closed debt.',
      );
    }

    if (repayDebtDto.repaymentAmount > currentDebt.remainingAmount) {
      throw new BadRequestException(
        'Repayment amount cannot exceed the remaining debt amount.',
      );
    }

    await this.debtTransactionModel.create({
      userId: foundUserId,
      debtId: new Types.ObjectId(debtId),
      transactionDate: repayDebtDto.repaymentDate,
      repaymentAmount: repayDebtDto.repaymentAmount,
      description: repayDebtDto.description,
    });

    const remainingAmount =
      Math.round(
        (currentDebt.remainingAmount - repayDebtDto.repaymentAmount) * 100,
      ) / 100;
    const status = remainingAmount === 0 ? 'closed' : currentDebt.status;

    const debt = await this.debtModel
      .findOneAndUpdate(
        { _id: debtId, userId: foundUserId },
        { remainingAmount, status },
        { returnDocument: 'after', runValidators: true },
      )
      .lean()
      .exec();

    if (!debt) {
      throw new NotFoundException(
        `Debt ${debtId} for user ${userId} not found.`,
      );
    }

    return debt;
  }

  async remove(userId: string, debtId: string) {
    const foundUserId = await this.ensureUserExists(userId);

    const deletedDebt = await this.debtModel
      .findOneAndDelete({ _id: debtId, userId: foundUserId })
      .exec();

    if (!deletedDebt) {
      throw new NotFoundException(
        `Debt ${debtId} for user ${userId} not found.`,
      );
    }

    await this.debtTransactionModel.deleteMany({
      userId: foundUserId,
      debtId: new Types.ObjectId(debtId),
    });
  }

  private async ensureUserExists(userId: string) {
    const found = await this.userModel.exists({ _id: userId });

    if (!found) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    return found._id;
  }

  // TODO Send the surplus to the current account/savings
  private validateAmounts(principalAmount: number, remainingAmount: number) {
    if (remainingAmount > principalAmount) {
      throw new BadRequestException(
        'Remaining debt amount cannot exceed the principal amount.',
      );
    }
  }
}
