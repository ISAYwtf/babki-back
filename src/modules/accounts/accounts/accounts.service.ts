import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountsSnapshotsService } from 'src/modules/accounts-snapshots/accounts-snapshots.service';
import { AccountSnapshotsDocument } from 'src/modules/accounts-snapshots/schemas/accounts-snapshots.schema';
import { TransactionsService } from 'src/modules/transactions/transactions/transactions.service';
import { UsersService } from '../../users/users.service';
import { CreateAccountDto } from '../dto/create.dto';
import { FindAccountQueryDto } from '../dto/find-query.dto';
import {
  Account,
  AccountDocument,
  AccountType,
} from '../schemas/accounts.schema';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    private readonly usersService: UsersService,
    private readonly snapshotsService: AccountsSnapshotsService,
    private readonly transactionService: TransactionsService,
  ) {}

  async findByParams(userId: string, query: FindAccountQueryDto) {
    const foundUserId = await this.usersService.ensureIdExists(userId);
    const entities = await this.accountModel
      .find(this.buildFilter(foundUserId, query))
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!entities.length) {
      return [];
    }

    return this.buildResponse(entities, { toDate: query.toDate });
  }

  async create(
    userId: string,
    query: { type: AccountType },
    createAccountDto: CreateAccountDto,
  ) {
    const foundUserId = await this.usersService.ensureIdExists(userId);
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
    return this.buildResponse([createdEntity.toObject()], undefined, [
      { _id: createdEntity._id, documents: [snapshot] },
    ]);
  }

  async deleteEntity(userId: string, entityId: string) {
    const foundUserId = await this.usersService.ensureIdExists(userId);

    // TODO Обернуть в транзакцию
    await this.snapshotsService.deleteAllByAccountId(userId, entityId);
    await this.transactionService.deleteAllByAccountId(userId, entityId);
    await this.accountModel.findOneAndDelete({
      _id: entityId,
      userId: foundUserId,
    });

    return null;
  }

  async buildResponse(
    entities: AccountDocument[],
    query?: { toDate?: string },
    existingSnapshots?: {
      _id: Types.ObjectId;
      documents: AccountSnapshotsDocument[];
    }[],
  ) {
    const snapshotGroups =
      existingSnapshots ??
      (await this.snapshotsService.findAllByAccounts(
        entities.map((entity) => entity._id),
        query,
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
