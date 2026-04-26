import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from './schemas/expense-category.schema';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectModel(ExpenseCategory.name)
    private readonly expenseCategoryModel: Model<ExpenseCategoryDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(
    userId: string,
    createExpenseCategoryDto: CreateExpenseCategoryDto,
  ) {
    await this.ensureUserExists(userId);

    try {
      const category = await this.expenseCategoryModel.create({
        ...createExpenseCategoryDto,
        userId: new Types.ObjectId(userId),
      });

      return category.toObject();
    } catch (error) {
      this.handleDuplicateName(error);
    }
  }

  async findAll(userId: string) {
    await this.ensureUserExists(userId);

    return this.expenseCategoryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ name: 1 })
      .lean()
      .exec();
  }

  async findOne(userId: string, categoryId: string) {
    const category = await this.expenseCategoryModel
      .findOne({
        _id: new Types.ObjectId(categoryId),
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();

    if (!category) {
      throw new NotFoundException(
        `Expense category ${categoryId} for user ${userId} not found.`,
      );
    }

    return category;
  }

  async update(
    userId: string,
    categoryId: string,
    updateExpenseCategoryDto: UpdateExpenseCategoryDto,
  ) {
    try {
      const category = await this.expenseCategoryModel
        .findOneAndUpdate(
          { _id: categoryId, userId: new Types.ObjectId(userId) },
          updateExpenseCategoryDto,
          {
            returnDocument: 'after',
            runValidators: true,
          },
        )
        .lean()
        .exec();

      if (!category) {
        throw new NotFoundException(
          `Expense category ${categoryId} for user ${userId} not found.`,
        );
      }

      return category;
    } catch (error) {
      this.handleDuplicateName(error);
    }
  }

  async remove(userId: string, categoryId: string) {
    const foundCategory = await this.findOne(userId, categoryId);

    const linkedExpenses = await this.expenseModel.countDocuments({
      userId: foundCategory.userId,
      category: foundCategory._id,
    });

    if (linkedExpenses) {
      throw new ConflictException(
        'Cannot delete an expense category linked to expenses.',
      );
    }

    await this.expenseCategoryModel
      .deleteOne({ _id: foundCategory._id, userId: foundCategory.userId })
      .lean()
      .exec();
  }

  private handleDuplicateName(error: unknown): never {
    if ((error as { code?: number }).code === 11000) {
      throw new ConflictException(
        'An expense category with this name already exists.',
      );
    }

    throw error;
  }

  private async ensureUserExists(userId: string) {
    const exists = await this.userModel.exists({ _id: userId });

    if (!exists) {
      throw new NotFoundException(`User ${userId} not found.`);
    }
  }
}
