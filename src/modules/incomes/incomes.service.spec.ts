import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { IncomesService } from './incomes.service';
import { Income } from './schemas/income.schema';

describe('IncomesService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const incomeId = '507f1f77bcf86cd799439012';
  const foundUserId = new Types.ObjectId(userId);
  const userModel = {
    exists: jest.fn(),
  };
  const incomeModel = {
    create: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  let service: IncomesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        IncomesService,
        { provide: getModelToken(Income.name), useValue: incomeModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = moduleRef.get(IncomesService);
    userModel.exists.mockResolvedValue({ _id: foundUserId });
  });

  it('creates an income for an existing user', async () => {
    incomeModel.create.mockResolvedValue({
      amount: 500,
      incomeDate: new Date('2026-04-05T00:00:00.000Z'),
      description: 'Salary',
      source: 'Employer',
    });

    const income = await service.create(userId, {
      amount: 500,
      incomeDate: '2026-04-05',
      description: 'Salary',
      source: 'Employer',
    });

    expect(incomeModel.create).toHaveBeenCalledWith({
      userId: foundUserId,
      amount: 500,
      incomeDate: '2026-04-05',
      description: 'Salary',
      source: 'Employer',
    });
    expect(income).toMatchObject({
      amount: 500,
      source: 'Employer',
    });
  });

  it('throws when creating an income for an unknown user', async () => {
    userModel.exists.mockResolvedValue(false);

    await expect(
      service.create(userId, {
        amount: 500,
        incomeDate: '2026-04-05',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists incomes for a period with pagination and sorting', async () => {
    const exec = jest
      .fn()
      .mockResolvedValue([
        { amount: 700, incomeDate: new Date('2026-04-10T00:00:00.000Z') },
      ]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });

    incomeModel.find.mockReturnValue({ sort });
    incomeModel.countDocuments.mockResolvedValue(1);

    const result = await service.findAll(userId, {
      from: '2026-04-01',
      to: '2026-04-30',
      page: 2,
      limit: 10,
    });

    expect(incomeModel.find).toHaveBeenCalledWith({
      userId: foundUserId,
      incomeDate: {
        $gte: new Date('2026-04-01T00:00:00.000Z'),
        $lte: new Date('2026-04-30T00:00:00.000Z'),
      },
    });
    expect(sort).toHaveBeenCalledWith({ incomeDate: -1, createdAt: -1 });
    expect(skip).toHaveBeenCalledWith(10);
    expect(limit).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      items: [
        { amount: 700, incomeDate: new Date('2026-04-10T00:00:00.000Z') },
      ],
      total: 1,
      page: 2,
      limit: 10,
    });
  });

  it('returns the total revenue for a period', async () => {
    incomeModel.aggregate.mockResolvedValue([
      { _id: null, totalRevenue: 1200.5 },
    ]);

    const result = await service.findRevenue(userId, {
      from: '2026-04-01',
      to: '2026-04-30',
    });

    expect(incomeModel.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          userId: foundUserId,
          incomeDate: {
            $gte: new Date('2026-04-01T00:00:00.000Z'),
            $lte: new Date('2026-04-30T00:00:00.000Z'),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
        },
      },
    ]);
    expect(result).toEqual({
      totalRevenue: 1200.5,
      from: '2026-04-01',
      to: '2026-04-30',
    });
  });

  it('returns zero revenue when no incomes match the period', async () => {
    incomeModel.aggregate.mockResolvedValue([]);

    const result = await service.findRevenue(userId, {
      from: '2026-04-01',
      to: '2026-04-30',
    });

    expect(result).toEqual({
      totalRevenue: 0,
      from: '2026-04-01',
      to: '2026-04-30',
    });
  });

  it('returns a specific income for the user', async () => {
    incomeModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: incomeId,
          amount: 500,
        }),
      }),
    });

    const income = await service.findOne(userId, incomeId);

    expect(incomeModel.findOne).toHaveBeenCalledWith({
      _id: incomeId,
      userId: foundUserId,
    });
    expect(income).toMatchObject({ amount: 500 });
  });

  it('throws when an income does not belong to the user', async () => {
    incomeModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(service.findOne(userId, incomeId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates an income partially', async () => {
    incomeModel.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: incomeId,
          source: 'Updated source',
        }),
      }),
    });

    const updated = await service.update(userId, incomeId, {
      source: 'Updated source',
    });

    expect(incomeModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: incomeId, userId: foundUserId },
      { source: 'Updated source' },
      { returnDocument: 'after', runValidators: true },
    );
    expect(updated).toMatchObject({ source: 'Updated source' });
  });

  it('hard deletes an existing income', async () => {
    incomeModel.findOneAndDelete.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: incomeId }),
    });

    await service.remove(userId, incomeId);

    expect(incomeModel.findOneAndDelete).toHaveBeenCalledWith({
      _id: incomeId,
      userId: foundUserId,
    });
  });
});
