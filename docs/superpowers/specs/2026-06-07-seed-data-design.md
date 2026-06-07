# Seed Data System Design

**Date:** 2026-06-07  
**Topic:** Dev database seeding for quick scenario testing

---

## 1. Goal

Provide a single `npm run seed` command that wipes the dev database and populates it with a realistic, multi-month dataset covering every module: users, accounts, snapshots, transactions (income/expense/save), expense categories, expense limits, debts, and debt repayments.

---

## 2. Architecture

**Approach: NestJS ApplicationContext + existing services**

Bootstrap the NestJS app without an HTTP server via `NestFactory.createApplicationContext(AppModule)`, retrieve services from the DI container, and call them in dependency order. This ensures the snapshot invariant (`findOrCreateByAccountId` + `recalculateSnapshotsFromDate`) is automatically maintained by the real service code.

**Account creation exception:** `AccountsService.create()` inserts an initial snapshot dated `new Date()` (today). That snapshot would shadow the correct month-end balance when querying the current state. To avoid this, accounts are inserted directly via the Mongoose `Account` model — no initial snapshot is created, and all snapshots are built organically by the transaction seeders.

---

## 3. File Layout

```
src/database/
  seed.ts                  ← standalone bootstrap script (no HTTP)
  seeds/
    index.ts               ← clear DB, run seeders in order, log summary
    01-users.ts            ← test user
    02-accounts.ts         ← balance + saving accounts (direct model insert)
    03-categories.ts       ← 6 expense categories
    04-limits.ts           ← 2 expense limits for current month
    05-transactions.ts     ← all transactions in chronological order
    06-debts.ts            ← 2 debts + repayment history
```

**npm script** added to `package.json`:
```json
"seed": "ts-node -r tsconfig-paths/register src/database/seed.ts"
```

---

## 4. Environment Guard

`seed.ts` throws immediately if `NODE_ENV !== 'development'` (or NODE_ENV is unset). This prevents accidental runs against staging/production.

---

## 5. DB Clearing

`seeds/index.ts` drops all seeded collections before running seeders:
`users`, `accounts`, `accountsnapshots`, `transactions`, `expensecategories`, `expenselimits`, `debts`, `debttransactions`

Achieved via `mongoose.connection.collection(name).deleteMany({})` on each collection.

---

## 6. Test User

| Field | Value |
|---|---|
| firstName | Alex |
| lastName | Testov |
| email | `test@test.com` |
| password | `Test1234!` |

Created via `UsersService.createWithPassword()` + `bcrypt.hash()` (12 rounds, matching `AuthService`).

---

## 7. Accounts

Two accounts, inserted directly into the `Account` collection with `type` discriminator key:

| Type | Purpose |
|---|---|
| `balance` | Main checking account |
| `saving` | Vacation fund |

No initial snapshots — these are built by the transaction seeder.

---

## 8. Expense Categories

6 categories created via `ExpenseCategoriesService.create()`:

| Name | Color |
|---|---|
| Food & Dining | `#FF6B6B` |
| Transport | `#4ECDC4` |
| Entertainment | `#45B7D1` |
| Utilities | `#FFA07A` |
| Health | `#98D8C8` |
| Shopping | `#DDA0DD` |

---

## 9. Expense Limits (current month, June 2026)

Created via `ExpenseLimitsService.create()` — `startDate`/`endDate` omitted so the service defaults to the current month. Created after transactions so the `rest` field in the response reflects actual spend.

| Category | Limit | Actual Spend | Status |
|---|---|---|---|
| Food & Dining | 500 | 420 | Near limit (84%) |
| Entertainment | 200 | 90 | Within limit (45%) |

---

## 10. Transactions (chronological)

All created via `IncomesService.create()`, `ExpensesService.create()`, `SavesService.create()`. The services handle snapshot creation and propagation automatically.

### March 2026

| # | Type | Amount | Category / Note | Date |
|---|---|---|---|---|
| 1 | income | +5000 | Salary | 2026-03-01 |
| 2 | expense | -300 | Food & Dining | 2026-03-10 |
| 3 | expense | -150 | Transport | 2026-03-12 |
| 4 | expense | -200 | Utilities | 2026-03-20 |
| 5 | save | -500 | → Savings | 2026-03-25 |

**Net March: +3850. Balance snapshot (Mar-01): 3850. Saving snapshot (Mar-01): 500.**

### April 2026

| # | Type | Amount | Category / Note | Date |
|---|---|---|---|---|
| 6 | income | +5000 | Salary | 2026-04-01 |
| 7 | expense | -450 | Food & Dining | 2026-04-08 |
| 8 | expense | -120 | Entertainment | 2026-04-15 |
| 9 | expense | -800 | Shopping | 2026-04-20 |
| 10 | save | -500 | → Savings | 2026-04-28 |

**Net April: +3130. Balance snapshot (Apr-01): 6980. Saving snapshot (Apr-01): 1000.**

### May 2026

| # | Type | Amount | Category / Note | Date |
|---|---|---|---|---|
| 11 | income | +5000 | Salary | 2026-05-01 |
| 12 | expense | -380 | Food & Dining | 2026-05-07 |
| 13 | expense | -250 | Health | 2026-05-14 |
| 14 | expense | -220 | Utilities | 2026-05-22 |
| 15 | expense | -90 | Entertainment | 2026-05-25 |
| 16 | save | -500 | → Savings | 2026-05-30 |

**Net May: +3560. Balance snapshot (May-01): 10540. Saving snapshot (May-01): 1500.**

### June 2026 (current, partial)

| # | Type | Amount | Category / Note | Date |
|---|---|---|---|---|
| 17 | income | +5000 | Salary | 2026-06-01 |
| 18 | expense | -420 | Food & Dining | 2026-06-03 |
| 19 | expense | -80 | Transport | 2026-06-05 |

**Net June so far: +4500. Balance snapshot (Jun-01): 15040. Saving remains 1500.**

---

## 11. Debts

Created via `DebtsService.create()` then repaid via `DebtsService.repay()` (with `isIncome: false`).

### Debt 1 — "Артур" (active)

- principalAmount: 500, remainingAmount starts at 500
- Repayment 1: 200 on 2026-04-10 → remaining 300
- Repayment 2: 100 on 2026-05-15 → remaining 200
- Final status: active, remaining: 200

### Debt 2 — "Мария" (closed)

- principalAmount: 1000, remainingAmount starts at 1000
- Repayment: 1000 on 2026-03-20 → remaining 0, status: closed

---

## 12. Services Used (DI resolution order)

```
app.get(UsersService)
app.get(getModelToken(Account.name))        ← direct model for accounts
app.get(ExpenseCategoriesService)
app.get(ExpenseLimitsService)
app.get(IncomesService)
app.get(ExpensesService)
app.get(SavesService)
app.get(DebtsService)
```

Each seeder file exports an async function `(app: INestApplicationContext) => SeedResult` and returns a summary object (IDs + counts) passed to the next seeder as context.

---

## 13. Error Handling

If any seeder step throws, the error propagates, `app.close()` is called in a `finally` block, and the process exits with code 1.

---

## 14. Out of Scope

- No rollback / partial-seed recovery
- No dry-run mode
- No configurable data volume
- No multiple test users
