import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateBalanceDto } from './dto/create-balance.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { Balance, BalanceDocument } from './schemas/balance.schema';

@Injectable()
export class BalancesService {
  constructor(
    @InjectModel(Balance.name)
    private readonly balanceModel: Model<BalanceDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByUserId(userId: string, asOfDate?: string) {
    const foundId = await this.ensureUserExists(userId);
    const requestedDate = asOfDate ? new Date(asOfDate) : new Date();

    const balance = await this.balanceModel
      .findOne({
        userId: foundId,
        asOfDate: { $lte: requestedDate },
      })
      .sort({ asOfDate: -1, _id: -1 })
      .lean()
      .exec();

    if (!balance) {
      throw new NotFoundException(`Balance for user ${userId} not found.`);
    }

    return balance;
  }

  /**
   * Creates a new dated balance snapshot for a user.
   */
  async addBalance(userId: string, createBalanceDto: CreateBalanceDto) {
    const foundId = await this.ensureUserExists(userId);
    const snapshotDate = new Date(createBalanceDto.asOfDate);

    const existingBalance = await this.balanceModel
      .findOne({ userId: foundId, asOfDate: snapshotDate })
      .lean()
      .exec();

    if (existingBalance) {
      throw new ConflictException(
        `Balance for user ${userId} on ${createBalanceDto.asOfDate} already exists.`,
      );
    }

    const createdBalance = await this.balanceModel.create({
      userId: foundId,
      ...createBalanceDto,
      asOfDate: snapshotDate,
    });
    return createdBalance.toObject();
  }

  /**
   * Updates an existing balance record for a user.
   */
  async updateBalance(
    userId: string,
    balanceId: string,
    updateBalanceDto: UpdateBalanceDto,
  ) {
    const foundId = await this.ensureUserExists(userId);
    const rawAsOfDate: unknown = (updateBalanceDto as { asOfDate?: unknown })
      .asOfDate;
    const normalizedAsOfDate =
      typeof rawAsOfDate === 'string' ? rawAsOfDate : undefined;

    try {
      const updatedBalance = await this.balanceModel
        .findOneAndUpdate(
          { _id: balanceId, userId: foundId },
          {
            ...updateBalanceDto,
            ...(normalizedAsOfDate
              ? { asOfDate: new Date(normalizedAsOfDate) }
              : {}),
          },
          {
            returnDocument: 'after',
            runValidators: true,
          },
        )
        .lean()
        .exec();

      if (!updatedBalance) {
        throw new NotFoundException(
          `Balance for user ${userId} not found. Cannot update.`,
        );
      }

      return updatedBalance;
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        const duplicateDate = normalizedAsOfDate ?? 'the requested date';
        throw new ConflictException(
          `Balance for user ${userId} on ${duplicateDate} already exists.`,
        );
      }

      throw error;
    }
  }

  /**
   * Deletes the balance record for a given user ID.
   */
  async deleteBalance(userId: string, balanceId: string) {
    const foundId = await this.ensureUserExists(userId);

    const result = await this.balanceModel.findOneAndDelete({
      _id: balanceId,
      userId: foundId,
    });

    if (!result) {
      throw new NotFoundException(
        `Balance for user ${userId} not found. Cannot delete.`,
      );
    }

    // Return a simple success identifier or the deleted document if needed
    return { message: `Balance for user ${userId} successfully deleted.` };
  }

  private async ensureUserExists(userId: string) {
    const exists = await this.userModel.exists({ _id: userId });

    if (!exists) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    return exists._id;
  }

  private isDuplicateKeyError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
