import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { BalancesService } from './balances.service';
import { Balance } from './schemas/balance.schema';

describe('BalancesService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const foundId = new Types.ObjectId(userId);
  const userModel = {
    exists: jest.fn(),
  };
  const balanceModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  let service: BalancesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        BalancesService,
        { provide: getModelToken(Balance.name), useValue: balanceModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = moduleRef.get(BalancesService);
    userModel.exists.mockResolvedValue({ _id: foundId });
  });

  it('returns the latest balance snapshot on or before the requested date', async () => {
    const exec = jest.fn().mockResolvedValue({
      currentAccountAmount: 1250,
      savingsAmount: 4300,
      asOfDate: new Date('2026-03-10T00:00:00.000Z'),
    });
    const lean = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ lean });

    balanceModel.findOne.mockReturnValue({ sort });

    const balance = await service.findByUserId(userId, '2026-03-31');

    expect(balanceModel.findOne).toHaveBeenCalledWith({
      userId: foundId,
      asOfDate: { $lte: new Date('2026-03-31T00:00:00.000Z') },
    });
    expect(sort).toHaveBeenCalledWith({ asOfDate: -1, _id: -1 });
    expect(balance).toMatchObject({
      currentAccountAmount: 1250,
      savingsAmount: 4300,
    });
  });

  it('uses the current date when no asOfDate is provided', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-25T12:00:00.000Z'));

    const exec = jest.fn().mockResolvedValue({
      currentAccountAmount: 1800,
      savingsAmount: 5200,
      asOfDate: new Date('2026-04-20T00:00:00.000Z'),
    });
    const lean = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ lean });

    balanceModel.findOne.mockReturnValue({ sort });

    const balance = await service.findByUserId(userId);

    expect(balanceModel.findOne).toHaveBeenCalledWith({
      userId: foundId,
      asOfDate: { $lte: new Date('2026-04-25T12:00:00.000Z') },
    });
    expect(balance).toMatchObject({
      currentAccountAmount: 1800,
      savingsAmount: 5200,
    });

    jest.useRealTimers();
  });

  it('throws when no historical balance exists on or before the requested date', async () => {
    const exec = jest.fn().mockResolvedValue(null);
    const lean = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ lean });

    balanceModel.findOne.mockReturnValue({ sort });

    await expect(
      service.findByUserId(userId, '2026-03-31'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a new balance snapshot when the date is unused', async () => {
    balanceModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });
    balanceModel.create.mockResolvedValue({
      toObject: jest.fn().mockReturnValue({
        currentAccountAmount: 100,
        savingsAmount: 200,
        asOfDate: new Date('2026-03-01T00:00:00.000Z'),
      }),
    });

    const created = await service.addBalance(userId, {
      currentAccountAmount: 100,
      savingsAmount: 200,
      asOfDate: '2026-03-01',
    });

    expect(balanceModel.findOne).toHaveBeenCalledWith({
      userId: foundId,
      asOfDate: new Date('2026-03-01T00:00:00.000Z'),
    });
    expect(balanceModel.create).toHaveBeenCalledWith({
      userId: foundId,
      currentAccountAmount: 100,
      savingsAmount: 200,
      asOfDate: new Date('2026-03-01T00:00:00.000Z'),
    });
    expect(created).toMatchObject({
      currentAccountAmount: 100,
      savingsAmount: 200,
    });
  });

  it('rejects a duplicate balance snapshot for the same asOfDate', async () => {
    balanceModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      }),
    });

    await expect(
      service.addBalance(userId, {
        currentAccountAmount: 100,
        savingsAmount: 200,
        asOfDate: '2026-03-01',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
