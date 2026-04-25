import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ParseObjectIdPipe } from '../src/common/pipes/parse-object-id.pipe';
import { BalancesController } from '../src/modules/balances/balances.controller';
import { BalancesService } from '../src/modules/balances/balances.service';
import { CreateBalanceDto } from '../src/modules/balances/dto/create-balance.dto';
import { FindBalanceQueryDto } from '../src/modules/balances/dto/find-balance-query.dto';
import { CreateDebtDto } from '../src/modules/debts/dto/create-debt.dto';
import { DebtsController } from '../src/modules/debts/debts.controller';
import { RepayDebtDto } from '../src/modules/debts/dto/repay-debt.dto';
import { DebtsService } from '../src/modules/debts/debts.service';
import { DebtTransactionsController } from '../src/modules/debt-transactions/debt-transactions.controller';
import { DebtTransactionsService } from '../src/modules/debt-transactions/debt-transactions.service';
import { CreateExpenseCategoryDto } from '../src/modules/expense-categories/dto/create-expense-category.dto';
import { ExpenseCategoriesController } from '../src/modules/expense-categories/expense-categories.controller';
import { ExpenseCategoriesService } from '../src/modules/expense-categories/expense-categories.service';
import { CreateExpenseDto } from '../src/modules/expenses/dto/create-expense.dto';
import { ExpensesController } from '../src/modules/expenses/expenses.controller';
import { ExpensesService } from '../src/modules/expenses/expenses.service';
import { MonthSummaryQueryDto } from '../src/modules/reports/dto/month-summary-query.dto';
import { YearSummaryQueryDto } from '../src/modules/reports/dto/year-summary-query.dto';
import { ReportsController } from '../src/modules/reports/reports.controller';
import { ReportsService } from '../src/modules/reports/reports.service';
import { CreateUserDto } from '../src/modules/users/dto/create-user.dto';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';

type UserRecord = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  currency: string;
  birthDate?: string;
  notes?: string;
};

type BalanceRecord = {
  userId: string;
  currentAccountAmount: number;
  savingsAmount: number;
  asOfDate: string;
};

type CategoryRecord = {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  isArchived: boolean;
};

type ExpenseRecord = {
  _id: string;
  userId: string;
  categoryId: string;
  amount: number;
  expenseDate: string;
  description?: string;
};

type DebtRecord = {
  _id: string;
  userId: string;
  debtor: string;
  principalAmount: number;
  remainingAmount: number;
  description?: string;
  dueDate?: string;
  status: 'active' | 'closed';
};

type DebtTransactionRecord = {
  _id: string;
  userId: string;
  debtId: string;
  repaymentAmount: number;
  transactionDate: string;
  description?: string;
};

function createObjectId(sequence: number) {
  return sequence.toString(16).padStart(24, '0');
}

type ClassType<T> = abstract new (...args: never[]) => T;

class FinanceStore {
  private sequence = 1;
  readonly users: UserRecord[] = [];
  readonly balances: BalanceRecord[] = [];
  readonly categories: CategoryRecord[] = [];
  readonly expenses: ExpenseRecord[] = [];
  readonly debts: DebtRecord[] = [];
  readonly debtTransactions: DebtTransactionRecord[] = [];

  nextId() {
    return createObjectId(this.sequence++);
  }
}

class UsersServiceStub {
  constructor(private readonly store: FinanceStore) {}

  create(payload: Omit<UserRecord, '_id'>) {
    const user = { _id: this.store.nextId(), ...payload };
    this.store.users.push(user);
    return user;
  }

  findAll() {
    return {
      items: [...this.store.users],
      total: this.store.users.length,
      page: 1,
      limit: 20,
    };
  }

  findOne(userId: string) {
    return this.store.users.find((user) => user._id === userId);
  }

  update(userId: string, payload: Partial<UserRecord>) {
    const user = this.store.users.find((item) => item._id === userId);
    Object.assign(user!, payload);
    return user;
  }

  remove(userId: string) {
    const index = this.store.users.findIndex((user) => user._id === userId);

    if (index >= 0) {
      this.store.users.splice(index, 1);
    }
  }
}

class BalancesServiceStub {
  constructor(private readonly store: FinanceStore) {}

  findByUserId(userId: string, asOfDate: string) {
    const requestedDate = new Date(asOfDate);

    return this.store.balances
      .filter(
        (balance) =>
          balance.userId === userId &&
          new Date(balance.asOfDate) <= requestedDate,
      )
      .sort((left, right) => right.asOfDate.localeCompare(left.asOfDate))[0];
  }

  addBalance(userId: string, payload: Omit<BalanceRecord, 'userId'>) {
    const existingBalance = this.store.balances.find(
      (balance) =>
        balance.userId === userId && balance.asOfDate === payload.asOfDate,
    );

    if (existingBalance) {
      throw new Error(
        `Balance for user ${userId} on ${payload.asOfDate} already exists.`,
      );
    }

    const balance = { userId, ...payload };
    this.store.balances.push(balance);
    return balance;
  }
}

class ExpenseCategoriesServiceStub {
  constructor(private readonly store: FinanceStore) {}

  create(
    userId: string,
    payload: Omit<CategoryRecord, '_id' | 'userId' | 'isArchived'> & {
      isArchived?: boolean;
    },
  ) {
    const category = {
      _id: this.store.nextId(),
      userId,
      isArchived: payload.isArchived ?? false,
      ...payload,
    };
    this.store.categories.push(category);
    return category;
  }

  findAll(userId: string) {
    return this.store.categories.filter((item) => item.userId === userId);
  }

  findOne(userId: string, categoryId: string) {
    return this.store.categories.find(
      (item) => item._id === categoryId && item.userId === userId,
    );
  }

  update(userId: string, categoryId: string, payload: Partial<CategoryRecord>) {
    const category = this.store.categories.find(
      (item) => item._id === categoryId && item.userId === userId,
    );
    Object.assign(category!, payload);
    return category;
  }

  remove(userId: string, categoryId: string) {
    const index = this.store.categories.findIndex(
      (item) => item._id === categoryId && item.userId === userId,
    );

    if (index >= 0) {
      this.store.categories.splice(index, 1);
    }
  }
}

class ExpensesServiceStub {
  constructor(private readonly store: FinanceStore) {}

  create(userId: string, payload: Omit<ExpenseRecord, '_id' | 'userId'>) {
    const expense = { _id: this.store.nextId(), userId, ...payload };
    this.store.expenses.push(expense);
    return this.findOne(userId, expense._id);
  }

  findAll(userId: string) {
    const items = this.store.expenses
      .filter((item) => item.userId === userId)
      .map((item) => this.attachCategory(item));

    return {
      items,
      total: items.length,
      page: 1,
      limit: 20,
    };
  }

  findOne(userId: string, expenseId: string) {
    const expense = this.store.expenses.find(
      (item) => item.userId === userId && item._id === expenseId,
    );
    return this.attachCategory(expense!);
  }

  update(userId: string, expenseId: string, payload: Partial<ExpenseRecord>) {
    const expense = this.store.expenses.find(
      (item) => item.userId === userId && item._id === expenseId,
    );
    Object.assign(expense!, payload);
    return this.attachCategory(expense!);
  }

  remove(userId: string, expenseId: string) {
    const index = this.store.expenses.findIndex(
      (item) => item.userId === userId && item._id === expenseId,
    );

    if (index >= 0) {
      this.store.expenses.splice(index, 1);
    }
  }

  private attachCategory(expense: ExpenseRecord) {
    const category = this.store.categories.find(
      (item) =>
        item._id === expense.categoryId && item.userId === expense.userId,
    );
    return { ...expense, categoryId: category };
  }
}

class DebtsServiceStub {
  constructor(private readonly store: FinanceStore) {}

  create(
    userId: string,
    payload: Omit<DebtRecord, '_id' | 'userId' | 'status'> & {
      status?: 'active' | 'closed';
    },
  ) {
    const debt = {
      _id: this.store.nextId(),
      userId,
      status: payload.status ?? 'active',
      ...payload,
    };
    this.store.debts.push(debt);
    return debt;
  }

  findAll(userId: string) {
    const items = this.store.debts.filter((item) => item.userId === userId);
    return {
      items,
      total: items.length,
      page: 1,
      limit: 20,
    };
  }

  findOne(userId: string, debtId: string) {
    return this.store.debts.find(
      (item) => item.userId === userId && item._id === debtId,
    );
  }

  update(userId: string, debtId: string, payload: Partial<DebtRecord>) {
    const debt = this.store.debts.find(
      (item) => item.userId === userId && item._id === debtId,
    );
    Object.assign(debt!, payload);
    return debt;
  }

  repay(
    userId: string,
    debtId: string,
    payload: {
      repaymentDate: string;
      repaymentAmount: number;
      description?: string;
    },
  ) {
    const debt = this.store.debts.find(
      (item) => item.userId === userId && item._id === debtId,
    );

    const transaction = {
      _id: this.store.nextId(),
      userId,
      debtId,
      transactionDate: payload.repaymentDate,
      repaymentAmount: payload.repaymentAmount,
      description: payload.description,
    };

    this.store.debtTransactions.push(transaction);
    debt!.remainingAmount = Number(
      (debt!.remainingAmount - payload.repaymentAmount).toFixed(2),
    );
    if (debt!.remainingAmount === 0) {
      debt!.status = 'closed';
    }

    return {
      debt,
      transaction,
    };
  }

  remove(userId: string, debtId: string) {
    const index = this.store.debts.findIndex(
      (item) => item.userId === userId && item._id === debtId,
    );

    if (index >= 0) {
      this.store.debts.splice(index, 1);
    }
  }
}

class DebtTransactionsServiceStub {
  constructor(private readonly store: FinanceStore) {}

  create(
    userId: string,
    debtId: string,
    payload: Omit<DebtTransactionRecord, '_id' | 'userId' | 'debtId'>,
  ) {
    const transaction = {
      _id: this.store.nextId(),
      userId,
      debtId,
      ...payload,
    };
    this.store.debtTransactions.push(transaction);
    return transaction;
  }

  findAll(userId: string, debtId: string) {
    const items = this.store.debtTransactions.filter(
      (item) => item.userId === userId && item.debtId === debtId,
    );
    return {
      items,
      total: items.length,
      page: 1,
      limit: 20,
    };
  }

  findOne(userId: string, debtId: string, debtTransactionId: string) {
    return this.store.debtTransactions.find(
      (item) =>
        item.userId === userId &&
        item.debtId === debtId &&
        item._id === debtTransactionId,
    );
  }

  update(
    userId: string,
    debtId: string,
    debtTransactionId: string,
    payload: Partial<DebtTransactionRecord>,
  ) {
    const transaction = this.store.debtTransactions.find(
      (item) =>
        item.userId === userId &&
        item.debtId === debtId &&
        item._id === debtTransactionId,
    );
    Object.assign(transaction!, payload);
    return transaction;
  }

  remove(userId: string, debtId: string, debtTransactionId: string) {
    const index = this.store.debtTransactions.findIndex(
      (item) =>
        item.userId === userId &&
        item.debtId === debtId &&
        item._id === debtTransactionId,
    );

    if (index >= 0) {
      this.store.debtTransactions.splice(index, 1);
    }
  }
}

class ReportsServiceStub {
  constructor(private readonly store: FinanceStore) {}

  getMonthlySummary(userId: string, year: number, month: number) {
    return this.buildSummary(userId, year, month);
  }

  getYearlySummary(userId: string, year: number) {
    return this.buildSummary(userId, year);
  }

  private buildSummary(userId: string, year: number, month?: number) {
    const periodEnd = month
      ? new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
      : new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    const balance = this.store.balances
      .filter(
        (item) =>
          item.userId === userId && new Date(item.asOfDate) <= periodEnd,
      )
      .sort((left, right) => right.asOfDate.localeCompare(left.asOfDate))[0];
    const expenses = this.store.expenses.filter((item) => {
      const expenseDate = new Date(item.expenseDate);
      const matchesYear = expenseDate.getUTCFullYear() === year;
      const matchesMonth =
        month === undefined || expenseDate.getUTCMonth() + 1 === month;
      return item.userId === userId && matchesYear && matchesMonth;
    });
    const activeDebts = this.store.debts.filter(
      (item) => item.userId === userId && item.status === 'active',
    );

    const expensesByCategory = Object.entries(
      expenses.reduce<
        Record<string, { totalAmount: number; expenseCount: number }>
      >((accumulator, expense) => {
        const bucket = accumulator[expense.categoryId] ?? {
          totalAmount: 0,
          expenseCount: 0,
        };
        bucket.totalAmount += expense.amount;
        bucket.expenseCount += 1;
        accumulator[expense.categoryId] = bucket;
        return accumulator;
      }, {}),
    ).map(([categoryId, totals]) => ({
      categoryId,
      categoryName:
        this.store.categories.find((item) => item._id === categoryId)?.name ??
        'Unknown',
      ...totals,
    }));

    return {
      period: {
        type: month ? 'month' : 'year',
        year,
        ...(month ? { month } : {}),
      },
      currentAccountAmount: balance?.currentAccountAmount ?? 0,
      savingsAmount: balance?.savingsAmount ?? 0,
      totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      expenseCount: expenses.length,
      expensesByCategory,
      totalActiveDebtRemaining: activeDebts.reduce(
        (sum, debt) => sum + debt.remainingAmount,
        0,
      ),
      activeDebtCount: activeDebts.length,
    };
  }
}

describe('Finance API integration flow', () => {
  let usersController: UsersController;
  let balancesController: BalancesController;
  let categoriesController: ExpenseCategoriesController;
  let expensesController: ExpensesController;
  let debtsController: DebtsController;
  let debtTransactionsController: DebtTransactionsController;
  let reportsController: ReportsController;
  let validationPipe: ValidationPipe;
  let objectIdPipe: ParseObjectIdPipe;

  const transformValue = async <T>(
    value: unknown,
    metatype: ClassType<T>,
    type: 'body' | 'query',
  ) =>
    (await validationPipe.transform(value, {
      type,
      metatype,
    })) as T;

  beforeEach(async () => {
    const store = new FinanceStore();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        UsersController,
        BalancesController,
        ExpenseCategoriesController,
        ExpensesController,
        DebtsController,
        DebtTransactionsController,
        ReportsController,
      ],
      providers: [
        { provide: UsersService, useValue: new UsersServiceStub(store) },
        { provide: BalancesService, useValue: new BalancesServiceStub(store) },
        {
          provide: ExpenseCategoriesService,
          useValue: new ExpenseCategoriesServiceStub(store),
        },
        { provide: ExpensesService, useValue: new ExpensesServiceStub(store) },
        { provide: DebtsService, useValue: new DebtsServiceStub(store) },
        {
          provide: DebtTransactionsService,
          useValue: new DebtTransactionsServiceStub(store),
        },
        { provide: ReportsService, useValue: new ReportsServiceStub(store) },
      ],
    }).compile();

    usersController = moduleFixture.get(UsersController);
    balancesController = moduleFixture.get(BalancesController);
    categoriesController = moduleFixture.get(ExpenseCategoriesController);
    expensesController = moduleFixture.get(ExpensesController);
    debtsController = moduleFixture.get(DebtsController);
    debtTransactionsController = moduleFixture.get(DebtTransactionsController);
    reportsController = moduleFixture.get(ReportsController);

    validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    });
    objectIdPipe = new ParseObjectIdPipe();
  });

  it('supports the main finance management flow', async () => {
    const createUserDto = await transformValue(
      {
        firstName: 'Anna',
        lastName: 'Ivanova',
        email: 'anna@example.com',
        currency: 'USD',
        birthDate: '1995-01-12',
        notes: 'Primary test user',
      },
      CreateUserDto,
      'body',
    );
    const user = usersController.create(createUserDto) as UserRecord;
    const userId = user._id;

    expect(objectIdPipe.transform(userId)).toBe(userId);

    expect(usersController.findAll({ page: 1, limit: 20 })).toMatchObject({
      total: 1,
      items: [expect.objectContaining({ _id: userId })],
    });
    expect(usersController.findOne(userId)).toMatchObject({ _id: userId });

    const balanceDto = await transformValue(
      {
        currentAccountAmount: 1200,
        savingsAmount: 4500,
        asOfDate: '2026-03-01',
      },
      CreateBalanceDto,
      'body',
    );
    await balancesController.add(userId, balanceDto);

    const balanceQuery = await transformValue(
      { asOfDate: '2026-03-15' },
      FindBalanceQueryDto,
      'query',
    );
    expect(balancesController.findByUserId(userId, balanceQuery)).toMatchObject(
      {
        currentAccountAmount: 1200,
        savingsAmount: 4500,
      },
    );

    const earlierBalanceDto = await transformValue(
      {
        currentAccountAmount: 900,
        savingsAmount: 3200,
        asOfDate: '2026-02-01',
      },
      CreateBalanceDto,
      'body',
    );
    await balancesController.add(userId, earlierBalanceDto);

    const categoryDto = await transformValue(
      {
        name: 'Food',
        description: 'Groceries and cafes',
        color: '#22AA66',
      },
      CreateExpenseCategoryDto,
      'body',
    );
    const category = categoriesController.create(
      userId,
      categoryDto,
    ) as CategoryRecord;
    const categoryId = category._id;

    expect(categoriesController.findAll(userId)).toHaveLength(1);
    expect(categoriesController.findOne(userId, categoryId)).toMatchObject({
      _id: categoryId,
    });

    const expenseDto = await transformValue(
      {
        categoryId,
        amount: 125.5,
        expenseDate: '2026-03-10',
        description: 'Weekly groceries',
      },
      CreateExpenseDto,
      'body',
    );
    const expense = expensesController.create(
      userId,
      expenseDto,
    ) as ExpenseRecord;

    expect(
      expensesController.findAll(userId, { page: 1, limit: 20 }),
    ).toMatchObject({
      total: 1,
    });
    expect(expensesController.findOne(userId, expense._id)).toBeDefined();

    const debtDto = await transformValue(
      {
        debtor: 'Credit card',
        principalAmount: 1000,
        remainingAmount: 400,
        description: 'Bank credit card debt',
        dueDate: '2026-04-15',
        status: 'active',
      },
      CreateDebtDto,
      'body',
    );
    const debt = debtsController.create(userId, debtDto) as DebtRecord;

    expect(
      debtsController.findAll(userId, { page: 1, limit: 20 }),
    ).toMatchObject({
      total: 1,
    });
    expect(debtsController.findOne(userId, debt._id)).toBeDefined();

    const partialRepaymentDto = await transformValue(
      {
        repaymentDate: '2026-03-20',
        repaymentAmount: 100,
        description: 'Debt repayment via debt API',
      },
      RepayDebtDto,
      'body',
    );
    const partialRepayment = debtsController.repay(
      userId,
      debt._id,
      partialRepaymentDto,
    ) as {
      debt: DebtRecord;
      transaction: DebtTransactionRecord;
    };
    expect(partialRepayment.transaction).toMatchObject({
      repaymentAmount: 100,
      transactionDate: '2026-03-20',
    });
    expect(partialRepayment.debt).toMatchObject({
      remainingAmount: 300,
      status: 'active',
    });
    expect(
      debtTransactionsController.findOne(
        userId,
        debt._id,
        partialRepayment.transaction._id,
      ),
    ).toMatchObject({
      repaymentAmount: 100,
      transactionDate: '2026-03-20',
    });

    const fullRepaymentDto = await transformValue(
      {
        repaymentDate: '2026-03-25',
        repaymentAmount: 300,
        description: 'Final repayment',
      },
      RepayDebtDto,
      'body',
    );
    const fullRepayment = debtsController.repay(
      userId,
      debt._id,
      fullRepaymentDto,
    ) as {
      debt: DebtRecord;
      transaction: DebtTransactionRecord;
    };
    expect(fullRepayment.debt).toMatchObject({
      remainingAmount: 0,
      status: 'closed',
    });
    expect(
      debtTransactionsController.findAll(userId, debt._id, {
        page: 1,
        limit: 20,
      }),
    ).toMatchObject({
      total: 2,
    });

    const monthSummaryQuery = await transformValue(
      { year: 2026, month: 3 },
      MonthSummaryQueryDto,
      'query',
    );
    const monthSummary = reportsController.getMonthlySummary(
      userId,
      monthSummaryQuery,
    ) as Awaited<ReturnType<ReportsController['getMonthlySummary']>>;

    expect(monthSummary.totalExpenses).toBe(125.5);
    expect(monthSummary.expenseCount).toBe(1);
    expect(monthSummary.totalActiveDebtRemaining).toBe(0);

    const yearSummaryQuery = await transformValue(
      { year: 2026 },
      YearSummaryQueryDto,
      'query',
    );
    const yearSummary = reportsController.getYearlySummary(
      userId,
      yearSummaryQuery,
    ) as Awaited<ReturnType<ReportsController['getYearlySummary']>>;

    expect(yearSummary.totalExpenses).toBe(125.5);
    expect(yearSummary.activeDebtCount).toBe(0);
    expect(yearSummary.currentAccountAmount).toBe(1200);
  });

  it('validates DTO payloads before controller execution', async () => {
    await expect(
      validationPipe.transform(
        {
          firstName: 'Invalid',
          lastName: 'User',
          email: 'bad-email',
          currency: 'USD',
        },
        {
          type: 'body',
          metatype: CreateUserDto,
        },
      ),
    ).rejects.toThrow();

    await expect(
      validationPipe.transform(
        {},
        {
          type: 'query',
          metatype: FindBalanceQueryDto,
        },
      ),
    ).resolves.toMatchObject({});

    expect(() => objectIdPipe.transform('not-a-valid-object-id')).toThrow();
  });
});
