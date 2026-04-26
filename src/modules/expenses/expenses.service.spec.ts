import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ExpenseCategory } from '../expense-categories/schemas/expense-category.schema';
import { User } from '../users/schemas/user.schema';
import { ExpensesService } from './expenses.service';
import { Expense } from './schemas/expense.schema';

describe('ExpensesService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const expenseId = '507f1f77bcf86cd799439012';
  const categoryId = '507f1f77bcf86cd799439013';
  const foundUserId = new Types.ObjectId(userId);
  const foundCategoryId = new Types.ObjectId(categoryId);
  const userModel = {
    exists: jest.fn(),
  };
  const expenseCategoryModel = {
    exists: jest.fn(),
  };
  const expenseModel = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  let service: ExpensesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: getModelToken(Expense.name), useValue: expenseModel },
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: getModelToken(ExpenseCategory.name),
          useValue: expenseCategoryModel,
        },
      ],
    }).compile();

    service = moduleRef.get(ExpensesService);
    userModel.exists.mockResolvedValue({ _id: foundUserId });
    expenseCategoryModel.exists.mockResolvedValue({ _id: foundCategoryId });
  });

  it('creates an expense and returns the populated category with default items', async () => {
    expenseModel.create.mockResolvedValue({
      _id: new Types.ObjectId(expenseId),
    });
    expenseModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: expenseId,
            userId: foundUserId,
            category: { _id: foundCategoryId, name: 'Food' },
            amount: 125.5,
            expenseDate: new Date('2026-03-10T00:00:00.000Z'),
          }),
        }),
      }),
    });

    const result = await service.create(userId, {
      categoryId,
      amount: 125.5,
      expenseDate: '2026-03-10',
      description: 'Weekly groceries',
    });

    expect(expenseModel.create).toHaveBeenCalledWith({
      userId: foundUserId,
      category: foundCategoryId,
      amount: 125.5,
      expenseDate: '2026-03-10',
      description: 'Weekly groceries',
      merchant: undefined,
      items: [],
    });
    expect(result).toMatchObject({
      amount: 125.5,
      category: { name: 'Food' },
      items: [],
    });
    expect(result).not.toHaveProperty('categoryId');
  });

  it('lists expenses using the renamed category filter and normalizes items', async () => {
    const exec = jest.fn().mockResolvedValue([
      {
        _id: expenseId,
        category: { _id: foundCategoryId, name: 'Food' },
        amount: 40,
      },
    ]);
    const lean = jest.fn().mockReturnValue({ exec });
    const populate = jest.fn().mockReturnValue({ lean });
    const limit = jest.fn().mockReturnValue({ populate });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });

    expenseModel.find.mockReturnValue({ sort });
    expenseModel.countDocuments.mockResolvedValue(1);

    const result = await service.findAll(userId, {
      categoryId,
      page: 1,
      limit: 20,
    });

    expect(expenseModel.find).toHaveBeenCalledWith({
      userId: foundUserId,
      category: foundCategoryId,
    });
    expect(populate).toHaveBeenCalledWith('category');
    expect(result).toEqual({
      items: [
        {
          _id: expenseId,
          category: { _id: foundCategoryId, name: 'Food' },
          amount: 40,
          items: [],
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('updates items and category while keeping the response normalized', async () => {
    expenseModel.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: expenseId,
        }),
      }),
    });
    expenseModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: expenseId,
            category: { _id: foundCategoryId, name: 'Food' },
            items: [{ name: 'Milk', price: 3.5, quantity: 2 }],
          }),
        }),
      }),
    });

    const result = await service.update(userId, expenseId, {
      categoryId,
      items: [{ name: 'Milk', price: 3.5, quantity: 2 }],
    });

    expect(expenseModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expenseId, userId: foundUserId },
      {
        category: foundCategoryId,
        items: [{ name: 'Milk', price: 3.5, quantity: 2 }],
      },
      { returnDocument: 'after', runValidators: true },
    );
    expect(result).toMatchObject({
      category: { name: 'Food' },
      items: [{ name: 'Milk', price: 3.5, quantity: 2 }],
    });
  });

  it('throws when an expense is not found after creation lookup', async () => {
    expenseModel.create.mockResolvedValue({
      _id: new Types.ObjectId(expenseId),
    });
    expenseModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    await expect(
      service.create(userId, {
        categoryId,
        amount: 125.5,
        expenseDate: '2026-03-10',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
