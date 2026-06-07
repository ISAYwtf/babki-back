import { INestApplicationContext } from '@nestjs/common';
import { DebtsService } from '../../modules/debts/debts.service';

export async function seedDebts(app: INestApplicationContext, userId: string) {
  const debtsService = app.get(DebtsService);

  // Debt 1 — Артур: active, 2 partial repayments, 200 remaining
  const debtArtur = await debtsService.create(userId, {
    debtor: 'Артур',
    principalAmount: 500,
    remainingAmount: 500,
    description: 'Loan for car repair',
    dueDate: '2026-09-01T00:00:00.000Z',
  });
  await debtsService.repay(userId, String(debtArtur._id), {
    repaymentDate: '2026-04-10T00:00:00.000Z',
    amount: 200,
    description: 'First repayment',
    isIncome: false,
  });
  await debtsService.repay(userId, String(debtArtur._id), {
    repaymentDate: '2026-05-15T00:00:00.000Z',
    amount: 100,
    description: 'Second repayment',
    isIncome: false,
  });

  // Debt 2 — Мария: fully repaid → status auto-set to 'closed'
  const debtMaria = await debtsService.create(userId, {
    debtor: 'Мария',
    principalAmount: 1000,
    remainingAmount: 1000,
    description: 'Loan for vacation',
  });
  await debtsService.repay(userId, String(debtMaria._id), {
    repaymentDate: '2026-03-20T00:00:00.000Z',
    amount: 1000,
    description: 'Full repayment',
    isIncome: false,
  });
}
