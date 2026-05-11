import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountsSnapshotsService } from 'src/modules/accounts-snapshots/accounts-snapshots.service';
import { AccountSnapshotsDocument } from 'src/modules/accounts-snapshots/schemas/accounts-snapshots.schema';
import { TransactionsService } from 'src/modules/transactions/transactions/transactions.service';
import { User, UserDocument } from 'src/modules/users/schemas/user.schema';
import { CreateAccountDto } from '../dto/create.dto';
import { FindAccountQueryDto } from '../dto/find-query.dto';
import {
  Account,
  AccountDocument,
  AccountType,
} from '../schemas/accounts.schema';
import { Balance, BalanceDocument } from '../schemas/balances.schema';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Balance.name)
    private readonly balanceModel: Model<BalanceDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly snapshotsService: AccountsSnapshotsService,
    private readonly transactionService: TransactionsService,
  ) {}

  async findByParams(userId: string, query: FindAccountQueryDto) {
    const foundUserId = await this.ensureUserExists(userId);
    const entities = await this.accountModel
      .find(this.buildFilter(foundUserId, query))
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!entities.length) {
      throw new NotFoundException(`Accounts for user ${userId} not found.`);
    }

    return this.buildResponse(entities);
  }

  async create(
    userId: string,
    query: { type: AccountType },
    createAccountDto: CreateAccountDto,
  ) {
    const foundUserId = await this.ensureUserExists(userId);
    const existingEntity = await this.accountModel
      .findOne(this.buildFilter(foundUserId, query))
      .lean();
    if (existingEntity) {
      return this.buildResponse([existingEntity]);
    }

    // TODO Обернуть в транзакцию
    const createdEntity = await this.accountModel.create({
      userId: foundUserId,
      type: query.type,
    });
    const snapshot = await this.snapshotsService.create(
      userId,
      createdEntity._id.toString(),
      {
        amount: createAccountDto.amount ?? 0,
        date: new Date(),
      },
    );
    return this.buildResponse(
      [createdEntity.toObject()],
      [{ _id: createdEntity._id, documents: [snapshot] }],
    );
  }

  async deleteEntity(userId: string, entityId: string) {
    const foundUserId = await this.ensureUserExists(userId);

    // TODO Обернуть в транзакцию
    await this.snapshotsService.deleteAllByAccountId(userId, entityId);
    await this.transactionService.deleteAllByAccountId(userId, entityId);
    await this.accountModel.findOneAndDelete({
      _id: entityId,
      userId: foundUserId,
    });

    return null;
  }

  async ensureUserExists(userId: string) {
    const exists = await this.userModel.exists({ _id: userId });

    if (!exists) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    return exists._id;
  }

  async buildResponse(
    entities: AccountDocument[],
    existingSnapshots?: {
      _id: Types.ObjectId;
      documents: AccountSnapshotsDocument[];
    }[],
  ) {
    const snapshotGroups =
      existingSnapshots ??
      (await this.snapshotsService.findAllByAccounts(
        entities.map((entity) => entity._id),
      ));

    return entities.map((entity) => {
      const entitySnapshots: AccountSnapshotsDocument[] =
        snapshotGroups.find(
          (group) => group._id.toString() === entity._id.toString(),
        )?.documents ?? [];
      return {
        ...entity,
        amount: entitySnapshots[0]?.amount ?? 0,
        timeline: entitySnapshots,
      };
    });
  }

  private buildFilter(userId: Types.ObjectId, params: FindAccountQueryDto) {
    const filter: {
      userId: Types.ObjectId;
      type?: AccountType;
    } = { userId };

    if (params.type) {
      filter.type = params.type;
    }

    return filter;
  }
}
