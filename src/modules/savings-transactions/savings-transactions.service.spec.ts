import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { SavingSnapshots } from '../savings-snapshots/schemas/savings-snapshots.schema';
import { Saving } from '../savings/schemas/savings.schema';
import { SavingTransaction } from './schemas/saving-transaction.schema';
import { SavingsTransactionsService } from './savings-transactions.service';

describe('SavingsTransactionsService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const savingId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const snapshotId = '507f1f77bcf86cd799439013';
  const transactionId = '507f1f77bcf86cd799439014';
  const snapshotsModel = {
    findById: jest.fn(),
  };
  const savingsModel = {
    exists: jest.fn(),
  };
  const savingTransactionModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
  };

  let service: SavingsTransactionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SavingsTransactionsService,
        {
          provide: getModelToken(SavingTransaction.name),
          useValue: savingTransactionModel,
        },
        {
          provide: getModelToken(SavingSnapshots.name),
          useValue: snapshotsModel,
        },
        { provide: getModelToken(Saving.name), useValue: savingsModel },
      ],
    }).compile();

    service = moduleRef.get(SavingsTransactionsService);
  });

  it('lists transactions only when the snapshot belongs to the user saving', async () => {
    snapshotsModel.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(snapshotId),
          savingId,
        }),
      }),
    });
    savingsModel.exists.mockResolvedValue({ _id: savingId });
    const exec = jest.fn().mockResolvedValue([{ _id: transactionId }]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    savingTransactionModel.find.mockReturnValue({ sort });
    savingTransactionModel.countDocuments.mockResolvedValue(1);

    const result = await service.findAll(userId, snapshotId, {
      page: 1,
      limit: 20,
    });

    expect(savingsModel.exists).toHaveBeenCalledWith({
      _id: savingId,
      userId: new Types.ObjectId(userId),
    });
    expect(savingTransactionModel.find).toHaveBeenCalledWith({
      savingSnapshotId: new Types.ObjectId(snapshotId),
    });
    expect(result.total).toBe(1);
  });

  it('blocks access when the snapshot belongs to another user', async () => {
    snapshotsModel.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(snapshotId),
          savingId,
        }),
      }),
    });
    savingsModel.exists.mockResolvedValue(null);

    await expect(
      service.findOne(userId, snapshotId, transactionId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(savingTransactionModel.findOne).not.toHaveBeenCalled();
  });
});
