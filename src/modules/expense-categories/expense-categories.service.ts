import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
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
  ) {}

  async create(createExpenseCategoryDto: CreateExpenseCategoryDto) {
    try {
      const category = await this.expenseCategoryModel.create(
        createExpenseCategoryDto,
      );

      return category.toObject();
    } catch (error) {
      this.handleDuplicateName(error);
    }
  }

  async findAll() {
    return this.expenseCategoryModel.find().sort({ name: 1 }).lean().exec();
  }

  async findOne(categoryId: string) {
    const category = await this.expenseCategoryModel
      .findById(categoryId)
      .lean()
      .exec();

    if (!category) {
      throw new NotFoundException(`Expense category ${categoryId} not found.`);
    }

    return category;
  }

  async update(
    categoryId: string,
    updateExpenseCategoryDto: UpdateExpenseCategoryDto,
  ) {
    try {
      const category = await this.expenseCategoryModel
        .findByIdAndUpdate(categoryId, updateExpenseCategoryDto, {
          new: true,
          runValidators: true,
        })
        .lean()
        .exec();

      if (!category) {
        throw new NotFoundException(
          `Expense category ${categoryId} not found.`,
        );
      }

      return category;
    } catch (error) {
      this.handleDuplicateName(error);
    }
  }

  async remove(categoryId: string) {
    await this.findOne(categoryId);

    const linkedExpenses = await this.expenseModel.countDocuments({
      categoryId,
    });

    if (linkedExpenses) {
      throw new ConflictException(
        'Cannot delete an expense category linked to expenses.',
      );
    }

    await this.expenseCategoryModel.findByIdAndDelete(categoryId).exec();
  }

  private handleDuplicateName(error: unknown): never {
    if ((error as { code?: number }).code === 11000) {
      throw new ConflictException(
        'An expense category with this name already exists.',
      );
    }

    throw error;
  }
}
