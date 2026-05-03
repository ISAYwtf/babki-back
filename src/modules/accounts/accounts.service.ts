import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account, AccountDocument } from './schemas/accounts.schema';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByUserId(userId: string, asOfDate?: string) {
    const foundId = await this.ensureUserExists(userId);
    const requestedDate = asOfDate ? new Date(asOfDate) : new Date();

    const account = await this.accountModel
      .findOne({
        userId: foundId,
        asOfDate: { $lte: requestedDate },
      })
      .sort({ asOfDate: -1, _id: -1 })
      .lean()
      .exec();

    if (!account) {
      return null;
    }

    return account;
  }

  /**
   * Creates a new dated balance snapshot for a user.
   */
  async addAccount(userId: string, createAccountDto: CreateAccountDto) {
    const foundId = await this.ensureUserExists(userId);
    const snapshotDate = new Date(createAccountDto.asOfDate);

    const existingAccount = await this.accountModel
      .findOne({ userId: foundId, asOfDate: snapshotDate })
      .lean()
      .exec();

    if (existingAccount) {
      throw new ConflictException(
        `Account for user ${userId} on ${createAccountDto.asOfDate} already exists.`,
      );
    }

    const createdAccount = await this.accountModel.create({
      userId: foundId,
      ...createAccountDto,
      asOfDate: snapshotDate,
    });
    return createdAccount.toObject();
  }

  /**
   * Updates an existing balance record for a user.
   */
  async updateAccount(
    userId: string,
    accountId: string,
    updateAccountDto: UpdateAccountDto,
  ) {
    const foundId = await this.ensureUserExists(userId);
    const rawAsOfDate: unknown = (updateAccountDto as { asOfDate?: unknown })
      .asOfDate;
    const normalizedAsOfDate =
      typeof rawAsOfDate === 'string' ? rawAsOfDate : undefined;

    try {
      const updatedAccount = await this.accountModel
        .findOneAndUpdate(
          { _id: accountId, userId: foundId },
          {
            ...updateAccountDto,
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

      if (!updatedAccount) {
        throw new NotFoundException(
          `Account for user ${userId} not found. Cannot update.`,
        );
      }

      return updatedAccount;
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        const duplicateDate = normalizedAsOfDate ?? 'the requested date';
        throw new ConflictException(
          `Account for user ${userId} on ${duplicateDate} already exists.`,
        );
      }

      throw error;
    }
  }

  /**
   * Deletes the balance record for a given user ID.
   */
  async deleteAccount(userId: string, accountId: string) {
    const foundId = await this.ensureUserExists(userId);

    const result = await this.accountModel.findOneAndDelete({
      _id: accountId,
      userId: foundId,
    });

    if (!result) {
      throw new NotFoundException(
        `Account for user ${userId} not found. Cannot delete.`,
      );
    }

    return null;
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
