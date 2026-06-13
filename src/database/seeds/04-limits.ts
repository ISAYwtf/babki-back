import { INestApplicationContext } from '@nestjs/common';
import { ExpenseLimitsService } from '../../modules/expense-limits/expense-limits.service';
import { CategoryMap } from './03-categories';

export async function seedLimits(
  app: INestApplicationContext,
  userId: string,
  categories: CategoryMap,
) {
  const limitsService = app.get(ExpenseLimitsService);

  await limitsService.create(userId, {
    categoryId: categories['Food & Dining'],
    total: 65000,
  });

  await limitsService.create(userId, {
    categoryId: categories['Entertainment'],
    total: 25000,
  });
}
