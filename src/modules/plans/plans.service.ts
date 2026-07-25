import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { getPagination } from '../../common/utils/pagination.util';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from '../expense-categories/schemas/expense-category.schema';
import { ExpensesService } from '../transactions/expenses/expenses.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ClosePlanDto } from './dto/close-plan.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { ListPlansQueryDto } from './dto/list-plans-query.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan, PlanDocument, PlanStatus } from './schemas/plan.schema';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private readonly planModel: Model<PlanDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly expenseCategoryModel: Model<ExpenseCategoryDocument>,
    private readonly expensesService: ExpensesService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(userId: string, createPlanDto: CreatePlanDto) {
    const foundUserId = await this.ensureUserExists(userId);
    await this.ensureCategoryExists(userId, createPlanDto.categoryId);

    const plan = await this.planModel.create({
      userId: foundUserId,
      ...createPlanDto,
    });

    return plan.toObject();
  }

  async findAll(
    userId: string,
    query: ListPlansQueryDto,
  ): Promise<PaginatedResponse<Plan>> {
    const foundUserId = await this.ensureUserExists(userId);
    const { page, limit, skip } = getPagination(query);

    const filter: { userId: Types.ObjectId; status?: PlanStatus } = {
      userId: foundUserId,
    };
    if (query.status) {
      filter.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.planModel
        .find(filter)
        .sort({ targetDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.planModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(userId: string, planId: string) {
    const foundUserId = await this.ensureUserExists(userId);

    const plan = await this.planModel
      .findOne({ _id: planId, userId: foundUserId })
      .lean()
      .exec();

    if (!plan) {
      throw new NotFoundException(
        `Plan ${planId} for user ${userId} not found.`,
      );
    }

    return plan;
  }

  async update(userId: string, planId: string, updatePlanDto: UpdatePlanDto) {
    const foundUserId = await this.ensureUserExists(userId);

    const currentPlan = await this.planModel
      .findOne({ _id: planId, userId: foundUserId })
      .lean()
      .exec();

    if (!currentPlan) {
      throw new NotFoundException(
        `Plan ${planId} for user ${userId} not found.`,
      );
    }

    if (currentPlan.status === 'closed') {
      throw new BadRequestException('Cannot update a closed plan.');
    }

    if (updatePlanDto.categoryId) {
      await this.ensureCategoryExists(userId, updatePlanDto.categoryId);
    }

    const updatePayload = Object.fromEntries(
      Object.entries({
        description: updatePlanDto.description,
        targetDate: updatePlanDto.targetDate,
        amount: updatePlanDto.amount,
        categoryId: updatePlanDto.categoryId,
      }).filter(([, value]) => value !== undefined),
    );

    return this.planModel
      .findOneAndUpdate({ _id: planId, userId: foundUserId }, updatePayload, {
        returnDocument: 'after',
        runValidators: true,
      })
      .lean()
      .exec();
  }

  async remove(userId: string, planId: string) {
    const foundUserId = await this.ensureUserExists(userId);

    const deleted = await this.planModel
      .findOneAndDelete({ _id: planId, userId: foundUserId })
      .exec();

    if (!deleted) {
      throw new NotFoundException(
        `Plan ${planId} for user ${userId} not found.`,
      );
    }
  }

  async close(userId: string, planId: string, closePlanDto: ClosePlanDto) {
    const foundUserId = await this.ensureUserExists(userId);

    const plan = await this.planModel
      .findOne({ _id: planId, userId: foundUserId })
      .lean()
      .exec();

    if (!plan) {
      throw new NotFoundException(
        `Plan ${planId} for user ${userId} not found.`,
      );
    }

    if (plan.status === 'closed') {
      throw new BadRequestException('Plan is already closed.');
    }

    const transactionDate =
      closePlanDto.closingDate ?? new Date().toISOString();
    const amount = closePlanDto.amount ?? plan.amount;
    const description = closePlanDto.description ?? plan.description;

    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(async () => {
        const expense = await this.expensesService.create(
          userId,
          {
            categoryId: plan.categoryId.toString(),
            amount,
            transactionDate,
            description,
          },
          session,
        );

        const closedPlan = await this.planModel
          .findOneAndUpdate(
            { _id: planId, userId: foundUserId, status: 'active' },
            {
              status: 'closed',
              closedAt: new Date(),
              expenseId: expense._id,
            },
            { returnDocument: 'after', runValidators: true, session },
          )
          .lean()
          .exec();

        if (!closedPlan) {
          throw new BadRequestException('Plan is already closed.');
        }

        return closedPlan;
      });
    } finally {
      await session.endSession();
    }
  }

  private async ensureUserExists(userId: string) {
    const found = await this.userModel.exists({ _id: userId });

    if (!found) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    return found._id;
  }

  private async ensureCategoryExists(userId: string, categoryId: string) {
    const found = await this.expenseCategoryModel.exists({
      _id: categoryId,
      userId: new Types.ObjectId(userId),
    });

    if (!found) {
      throw new NotFoundException(
        `Expense category ${categoryId} for user ${userId} not found.`,
      );
    }

    return found._id;
  }
}
