import { INestApplicationContext } from '@nestjs/common';
import { ExpenseLimitsService } from '../../modules/expense-limits/expense-limits.service';
import { CategoryMap } from './03-categories';
import { getSeedMonthRange } from './seed-date.utils';

export async function seedLimits(
  app: INestApplicationContext,
  userId: string,
  categories: CategoryMap,
  anchorDate: Date,
) {
  const limitsService = app.get(ExpenseLimitsService);
  const { startDate, endDate } = getSeedMonthRange(0, anchorDate);

  await limitsService.create(userId, {
    categoryId: categories['Food & Dining'],
    total: 65000,
    startDate,
    endDate,
  });

  await limitsService.create(userId, {
    categoryId: categories['Entertainment'],
    total: 25000,
    startDate,
    endDate,
  });
}
