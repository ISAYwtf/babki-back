import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { AccountsSnapshotsService } from 'src/modules/accounts-snapshots/accounts-snapshots.service';
import { getPagination } from 'src/common/utils/pagination.util';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from 'src/modules/expense-categories/schemas/expense-category.schema';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly expenseCategoryModel: Model<ExpenseCategoryDocument>,
    private readonly snapshotsService: AccountsSnapshotsService,
    private readonly transactionsService: TransactionsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(
    userId: string,
    createExpenseDto: CreateExpenseDto,
    session?: ClientSession,
  ) {
    const [foundIds, foundCategoryId] = await Promise.all([
      this.transactionsService.ensureUserExists(userId),
      this.ensureCategoryExists(userId, createExpenseDto.categoryId),
    ]);

    // Validation reads run outside the caller's session intentionally — they are
    // read-only and stable, and neither TransactionsService nor ensureCategoryExists
    // accepts a session parameter.
    if (session) {
      return this._doCreate(
        userId,
        foundIds,
        foundCategoryId,
        createExpenseDto,
        session,
      );
    }

    const s = await this.connection.startSession();
    try {
      return await s.withTransaction(() =>
        this._doCreate(userId, foundIds, foundCategoryId, createExpenseDto, s),
      );
    } finally {
      await s.endSession();
    }
  }

  private async _doCreate(
    userId: string,
    foundIds: { userId: Types.ObjectId; accountId: Types.ObjectId },
    foundCategoryId: Types.ObjectId,
    createExpenseDto: CreateExpenseDto,
    session: ClientSession,
  ) {
    const foundSnapshot = await this.snapshotsService.findOrCreateByAccountId(
      userId,
      foundIds.accountId.toString(),
      createExpenseDto.transactionDate,
      session,
    );

    if (!foundSnapshot) {
      throw new NotFoundException(
        `Snapshot for account ${foundIds.accountId.toString()} not found.`,
      );
    }

    const [expense] = await this.expenseModel.create(
      [
        {
          userId: foundIds.userId,
          accountId: foundIds.accountId,
          snapshotId: foundSnapshot._id,
          category: foundCategoryId,
          amount: createExpenseDto.amount,
          transactionDate: createExpenseDto.transactionDate,
          description: createExpenseDto.description,
          merchant: createExpenseDto.merchant,
          items: createExpenseDto.items ?? [],
        },
      ],
      { session },
    );

    await this.snapshotsService.recalculateSnapshotsFromDate(
      userId,
      foundSnapshot.accountId.toString(),
      { date: createExpenseDto.transactionDate },
      { amount: -createExpenseDto.amount },
      session,
    );

    return expense.populate('category');
  }

  // TODO Добавить сортировку в DTO
  async findAll(userId: string, query: ListExpensesQueryDto) {
    const foundIds = await this.transactionsService.ensureUserExists(userId);

    const { page, limit, skip } = getPagination(query);
    const filter = this.buildFilter(foundIds.userId, query);

    const [items, total] = await Promise.all([
      this.expenseModel
        .find(filter)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category')
        .lean()
        .exec(),
      this.expenseModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async countByFilters(
    userId: string,
    query: Omit<ListExpensesQueryDto, keyof PaginationQueryDto>,
  ) {
    const filter = this.buildFilter(new Types.ObjectId(userId), query);
    return this.expenseModel.countDocuments(filter);
  }

  async findOne(userId: string, expenseId: string) {
    const foundIds = await this.transactionsService.ensureUserExists(userId);
    const foundExpense = await this.expenseModel
      .findOne({
        _id: expenseId,
        userId: foundIds.userId,
      })
      .populate('category')
      .lean();

    if (!foundExpense) {
      throw new NotFoundException(
        `Expense ${expenseId} for user ${userId} not found.`,
      );
    }

    return foundExpense;
  }

  async findRevenue(userId: string, query: ListExpensesQueryDto) {
    return this.transactionsService.findRevenue(
      userId,
      query,
      this.expenseModel,
    );
  }

  async update(
    userId: string,
    expenseId: string,
    updateExpenseDto: UpdateExpenseDto,
  ) {
    const expense = await this.findOne(userId, expenseId);

    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found.`);
    }

    const foundCategoryId = updateExpenseDto.categoryId
      ? await this.ensureCategoryExists(userId, updateExpenseDto.categoryId)
      : undefined;
    const updatePayload = Object.fromEntries(
      Object.entries({
        amount: updateExpenseDto.amount,
        description: updateExpenseDto.description,
        merchant: updateExpenseDto.merchant,
        items: updateExpenseDto.items,
        category: foundCategoryId,
      }).filter(([, value]) => value !== undefined),
    );

    const s = await this.connection.startSession();
    try {
      return await s.withTransaction(async () => {
        if (updateExpenseDto.amount) {
          const diffAmount = updateExpenseDto.amount - expense.amount;
          await this.snapshotsService.recalculateSnapshotsFromDate(
            userId,
            expense.accountId.toString(),
            { date: expense.transactionDate.toISOString() },
            { amount: diffAmount },
            s,
          );
        }

        // TODO Проверить с пустыми значениями для удаления
        const updatedExpense = await this.expenseModel
          .findOneAndUpdate(
            { _id: expenseId, userId: new Types.ObjectId(userId) },
            { $set: updatePayload },
            {
              returnDocument: 'after',
              runValidators: true,
              session: s,
            },
          )
          .populate('category')
          .lean();

        if (!updatedExpense) {
          throw new NotFoundException(
            `Expense ${expenseId} for user ${userId} not found.`,
          );
        }

        return updatedExpense;
      });
    } finally {
      await s.endSession();
    }
  }

  private buildFilter(
    userId: Types.ObjectId,
    query: Partial<ListExpensesQueryDto>,
  ) {
    const filter: { category?: Types.ObjectId } = {};

    if (query.categoryId) {
      filter.category = new Types.ObjectId(query.categoryId);
    }

    return {
      ...this.transactionsService.buildFilter(userId, query),
      ...filter,
    };
  }

  private async ensureCategoryExists(userId: string, categoryId: string) {
    const foundCategory = await this.expenseCategoryModel.exists({
      _id: categoryId,
      userId: new Types.ObjectId(userId),
    });

    if (!foundCategory) {
      throw new NotFoundException(
        `Expense category ${categoryId} for user ${userId} not found.`,
      );
    }

    return foundCategory._id;
  }
}
