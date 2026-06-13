import { INestApplicationContext } from '@nestjs/common';
import { PlansService } from '../../modules/plans/plans.service';
import { CategoryMap } from './03-categories';

export async function seedPlans(
  app: INestApplicationContext,
  userId: string,
  categories: CategoryMap,
) {
  const plansService = app.get(PlansService);

  // --- Active plans ---

  await plansService.create(userId, {
    description: 'Buy a MacBook Pro',
    targetDate: '2026-08-01T00:00:00.000Z',
    amount: 850000,
    categoryId: categories['Shopping'],
  });

  await plansService.create(userId, {
    description: 'Summer vacation fund',
    targetDate: '2026-07-01T00:00:00.000Z',
    amount: 350000,
    categoryId: categories['Entertainment'],
  });

  await plansService.create(userId, {
    description: 'Annual medical checkup',
    targetDate: '2026-06-30T00:00:00.000Z',
    amount: 45000,
    categoryId: categories['Health'],
  });

  // Target date in the past — plan is overdue but still active
  await plansService.create(userId, {
    description: 'Replace old bicycle',
    targetDate: '2026-05-01T00:00:00.000Z',
    amount: 80000,
    categoryId: categories['Transport'],
  });

  // --- Closed plans ---

  // Closed early (before target date), same amount as planned
  const smartphone = await plansService.create(userId, {
    description: 'Buy a new smartphone',
    targetDate: '2026-05-01T00:00:00.000Z',
    amount: 250000,
    categoryId: categories['Shopping'],
  });
  await plansService.close(userId, String(smartphone._id), {
    closingDate: '2026-04-25T00:00:00.000Z',
  });

  // Closed on time, description overridden
  const internet = await plansService.create(userId, {
    description: 'Home internet upgrade',
    targetDate: '2026-04-01T00:00:00.000Z',
    amount: 35000,
    categoryId: categories['Utilities'],
  });
  await plansService.close(userId, String(internet._id), {
    closingDate: '2026-04-01T00:00:00.000Z',
    description: 'Bought new router and switched plan',
  });

  // Closed late (after target date), amount overridden (spent more than planned)
  const dinner = await plansService.create(userId, {
    description: 'Birthday dinner',
    targetDate: '2026-03-15T00:00:00.000Z',
    amount: 22000,
    categoryId: categories['Food & Dining'],
  });
  await plansService.close(userId, String(dinner._id), {
    closingDate: '2026-03-20T00:00:00.000Z',
    amount: 25000,
  });
}
