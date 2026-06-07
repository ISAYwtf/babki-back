import { INestApplicationContext } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account } from '../../modules/accounts/schemas/accounts.schema';

export async function seedAccounts(
  app: INestApplicationContext,
  userId: string,
) {
  const accountModel = app.get<Model<Account>>(getModelToken(Account.name));

  const [balance, saving] = await Promise.all([
    accountModel.create({
      userId: new Types.ObjectId(userId),
      type: 'balance',
    }),
    accountModel.create({ userId: new Types.ObjectId(userId), type: 'saving' }),
  ]);

  return {
    balanceAccountId: balance._id.toString(),
    savingAccountId: saving._id.toString(),
  };
}
