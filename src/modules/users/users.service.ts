import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { getPagination } from '../../common/utils/pagination.util';
import { Balance } from '../balances/schemas/balance.schema';
import { Debt } from '../debts/schemas/debt.schema';
import { Expense } from '../expenses/schemas/expense.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Balance.name) private readonly balanceModel: Model<Balance>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<Expense>,
    @InjectModel(Debt.name) private readonly debtModel: Model<Debt>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const user = await this.userModel.create({
        ...createUserDto,
        email: createUserDto.email.toLowerCase(),
      });

      return user.toObject();
    } catch (error) {
      this.handleDuplicateEmail(error);
    }
  }

  async findAll(query: ListUsersQueryDto): Promise<PaginatedResponse<User>> {
    const { page, limit, skip } = getPagination(query);
    const filter = this.buildFilter(query.search);

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(userId: string) {
    const user = await this.userModel.findById(userId).lean().exec();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    return user;
  }

  async update(userId: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.userModel
        .findByIdAndUpdate(
          userId,
          {
            ...updateUserDto,
            ...(updateUserDto.email
              ? { email: updateUserDto.email.toLowerCase() }
              : {}),
          },
          { new: true, runValidators: true },
        )
        .lean()
        .exec();

      if (!user) {
        throw new NotFoundException(`User ${userId} not found.`);
      }

      return user;
    } catch (error) {
      this.handleDuplicateEmail(error);
    }
  }

  async remove(userId: string) {
    await this.ensureUserExists(userId);

    const [balanceCount, expenseCount, debtCount] = await Promise.all([
      this.balanceModel.countDocuments({ userId }),
      this.expenseModel.countDocuments({ userId }),
      this.debtModel.countDocuments({ userId }),
    ]);

    if (balanceCount || expenseCount || debtCount) {
      throw new ConflictException(
        'Cannot delete a user with linked balance, expense, or debt records.',
      );
    }

    await this.userModel.findByIdAndDelete(userId).exec();
  }

  async ensureUserExists(userId: string) {
    const exists = await this.userModel.exists({ _id: userId });

    if (!exists) {
      throw new NotFoundException(`User ${userId} not found.`);
    }
  }

  private buildFilter(search?: string) {
    if (!search) {
      return {};
    }

    const expression = new RegExp(search, 'i');

    return {
      $or: [
        { firstName: expression },
        { lastName: expression },
        { email: expression },
      ],
    };
  }

  private handleDuplicateEmail(error: unknown): never {
    if ((error as { code?: number }).code === 11000) {
      throw new ConflictException('A user with this email already exists.');
    }

    throw error;
  }
}
