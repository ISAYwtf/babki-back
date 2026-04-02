import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UpsertBalanceDto } from './dto/upsert-balance.dto';
import { Balance, BalanceDocument } from './schemas/balance.schema';

@Injectable()
export class BalancesService {
  constructor(
    @InjectModel(Balance.name)
    private readonly balanceModel: Model<BalanceDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByUserId(userId: string) {
    const foundId = await this.ensureUserExists(userId);

    const balance = await this.balanceModel
      .findOne({ userId: foundId })
      .lean()
      .exec();

    if (!balance) {
      throw new NotFoundException(`Balance for user ${userId} not found.`);
    }

    return balance;
  }

  async upsert(userId: string, upsertBalanceDto: UpsertBalanceDto) {
    await this.ensureUserExists(userId);

    try {
      return await this.balanceModel
        .findOneAndUpdate(
          { userId: new Types.ObjectId(userId) },
          {
            userId: new Types.ObjectId(userId),
            ...upsertBalanceDto,
          },
          {
            returnDocument: 'after',
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        )
        .lean()
        .exec();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          `Balance for user ${userId} already exists.`,
        );
      }

      throw error;
    }
  }

  private async ensureUserExists(userId: string) {
    const exists = await this.userModel.exists({ _id: userId });

    if (!exists) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    return exists._id;
  }
}
