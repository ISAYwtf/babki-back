import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { getPagination } from '../../common/utils/pagination.util';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateDebtDto } from './dto/create-debt.dto';
import { ListDebtsQueryDto } from './dto/list-debts-query.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { Debt, DebtDocument } from './schemas/debt.schema';

@Injectable()
export class DebtsService {
  constructor(
    @InjectModel(Debt.name) private readonly debtModel: Model<DebtDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(userId: string, createDebtDto: CreateDebtDto) {
    await this.ensureUserExists(userId);
    this.validateAmounts(
      createDebtDto.principalAmount,
      createDebtDto.remainingAmount,
    );

    const debt = await this.debtModel.create({
      userId: new Types.ObjectId(userId),
      ...createDebtDto,
    });

    return debt.toObject();
  }

  async findAll(
    userId: string,
    query: ListDebtsQueryDto,
  ): Promise<PaginatedResponse<Debt>> {
    await this.ensureUserExists(userId);

    const { page, limit, skip } = getPagination(query);
    const filter: {
      userId: string;
      status?: 'active' | 'closed';
    } = { userId };

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
    await this.ensureUserExists(userId);

    const debt = await this.debtModel
      .findOne({ _id: debtId, userId })
      .lean()
      .exec();

    if (!debt) {
      throw new NotFoundException(
        `Debt ${debtId} for user ${userId} not found.`,
      );
    }

    return debt;
  }

  async update(userId: string, debtId: string, updateDebtDto: UpdateDebtDto) {
    await this.ensureUserExists(userId);

    const currentDebt = await this.debtModel
      .findOne({ _id: debtId, userId })
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
      .findOneAndUpdate({ _id: debtId, userId }, updateDebtDto, {
        new: true,
        runValidators: true,
      })
      .lean()
      .exec();
  }

  async remove(userId: string, debtId: string) {
    await this.ensureUserExists(userId);

    const debt = await this.debtModel
      .findOneAndDelete({ _id: debtId, userId })
      .exec();

    if (!debt) {
      throw new NotFoundException(
        `Debt ${debtId} for user ${userId} not found.`,
      );
    }
  }

  private async ensureUserExists(userId: string) {
    const exists = await this.userModel.exists({ _id: userId });

    if (!exists) {
      throw new NotFoundException(`User ${userId} not found.`);
    }
  }

  private validateAmounts(principalAmount: number, remainingAmount: number) {
    if (remainingAmount > principalAmount) {
      throw new BadRequestException(
        'Remaining debt amount cannot exceed the principal amount.',
      );
    }
  }
}
