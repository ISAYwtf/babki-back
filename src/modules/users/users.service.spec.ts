import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Account } from '../accounts/schemas/accounts.schema';
import { Debt } from '../debts/schemas/debt.schema';
import { Expense } from '../expenses/schemas/expense.schema';
import { Income } from '../incomes/schemas/income.schema';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const userModel = {
    exists: jest.fn(),
    findByIdAndDelete: jest.fn().mockReturnValue({ exec: jest.fn() }),
  };
  const accountModel = {
    countDocuments: jest.fn(),
  };
  const expenseModel = {
    countDocuments: jest.fn(),
  };
  const incomeModel = {
    countDocuments: jest.fn(),
  };
  const debtModel = {
    countDocuments: jest.fn(),
  };

  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Account.name), useValue: accountModel },
        { provide: getModelToken(Expense.name), useValue: expenseModel },
        { provide: getModelToken(Income.name), useValue: incomeModel },
        { provide: getModelToken(Debt.name), useValue: debtModel },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('blocks deleting users with dependent records', async () => {
    userModel.exists.mockResolvedValue(true);
    accountModel.countDocuments.mockResolvedValue(1);
    expenseModel.countDocuments.mockResolvedValue(0);
    incomeModel.countDocuments.mockResolvedValue(0);
    debtModel.countDocuments.mockResolvedValue(0);

    await expect(
      service.remove('507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when user does not exist', async () => {
    userModel.exists.mockResolvedValue(false);

    await expect(
      service.remove('507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
