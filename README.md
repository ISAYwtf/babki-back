# babki-back

`babki-back` is a NestJS + TypeScript REST API for personal-finance data, backed by MongoDB via Mongoose. The codebase exposes versioned, JWT-protected endpoints for accounts, transactions, expense tracking, debt management, spending plans, and monthly/yearly summaries.

## What Is In The Repo

The application currently contains these functional areas:

- `auth`: register, login, JWT guards, `@Public()` and `@CurrentUser()` decorators
- `users`: profile read and update for the authenticated user
- `accounts`: base schema with two discriminators — `balance` and `saving`
- `accounts-snapshots`: one snapshot per account per month, tracks account balance over time
- `transactions`: base schema with three discriminators — `expense`, `income`, `save`
- `expense-categories`: shared category list, user-scoped
- `expense-limits`: per-category spending limits enriched with a `rest` field (limit total minus actual spend)
- `debts`: debt tracking with principal and remaining amounts
- `debt-transactions`: repayment history per debt
- `plans`: spending plans with a target date and amount; `POST /plans/:planId/close` atomically creates an expense transaction and marks the plan closed
- `reports`: monthly and yearly aggregations (`PeriodReport[]`)

Technical cross-cutting behavior:

- global request validation via Nest `ValidationPipe`
- MongoDB ObjectId validation via a custom pipe
- normalized error payloads via a global exception filter
- request logging via a global interceptor
- JWT authentication via a global `JwtAuthGuard` — every endpoint requires a valid token unless decorated with `@Public()`

## Tech Stack

- Node.js
- NestJS
- TypeScript
- MongoDB (must run as a replica set)
- Mongoose
- bcrypt (password hashing)
- passport + passport-jwt (JWT authentication)
- date-fns (date utilities)
- Jest for unit and e2e tests

## Authentication

Every endpoint requires a valid JWT Bearer token except `POST /auth/register` and `POST /auth/login`.

**Flow:**

1. `POST /auth/register` — create an account with email, password, first/last name, and currency
2. `POST /auth/login` — authenticate and receive `{ access_token }`
3. Include the token on all subsequent requests: `Authorization: Bearer <access_token>`

The JWT payload carries `{ sub: userId, email }`. Controllers access the authenticated user via the `@CurrentUser()` decorator — there is no `:userId` route parameter.

## Configuration

Runtime configuration is assembled from:

- environment variables in `.env`
- a JSON secrets file referenced by `SECRETS_FILE_PATH`

Example environment file from the repo:

```env
NODE_ENV=development
PORT=5001
API_PREFIX=api/v1
SECRETS_FILE_PATH=config/secrets/local.json
MONGO_DB_NAME=babki_db
```

Example secrets file from the repo:

```json
{
  "MONGO_AUTH_ENABLED": false,
  "MONGO_HOST": "localhost",
  "MONGO_PORT": 27017,
  "MONGO_USER": "babki_user",
  "MONGO_PASSWORD": "change-me",
  "MONGO_AUTH_SOURCE": "admin",
  "JWT_SECRET": "change-me"
}
```

How the app uses these values:

- `PORT`: HTTP port for the Nest app
- `API_PREFIX`: global API prefix, defaulting to `api/v1`
- `SECRETS_FILE_PATH`: path to the JSON file with Mongo connection settings
- `MONGO_DB_NAME`: required database name
- `MONGO_URI`: optional full Mongo connection string in the secrets file
- `MONGO_AUTH_ENABLED`: when `true`, the app builds an authenticated Mongo URI from host, port, user, password, and auth source
- `JWT_SECRET`: required in production; used to sign and verify JWT tokens

If `MONGO_DB_NAME` is missing, the service will fail at startup. In production, startup also fails if `JWT_SECRET` is absent.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create local environment files

Copy the example env file and adjust values if needed:

```bash
cp .env.example .env
```

Create the secrets file referenced by `SECRETS_FILE_PATH`. The repo includes `config/secrets/example.json` as a template:

```bash
cp config/secrets/example.json config/secrets/local.json
```

Set a `JWT_SECRET` value in `config/secrets/local.json`.

### 3. Start MongoDB as a replica set

The application uses multi-document transactions (`session.withTransaction()`), which require MongoDB to run as a **replica set**. The Docker Compose setup handles this automatically. For bare local installs:

```bash
mongod --replSet rs0
```

Then in the Mongo shell (run once on a fresh node):

```bash
rs.initiate()
```

Make sure MongoDB is reachable with the configured host, port, credentials, and database name.

### 4. Seed development data (optional)

```bash
NODE_ENV=development npm run seed
```

Populates the database with:

- test user: `test@test.com` / `Test1234!`
- balance and saving accounts
- expense categories (Food & Dining, Transport, Utilities, Entertainment, Shopping, Health)
- expense limits
- sample transactions from March–June 2026
- sample debts and plans

Only works when `NODE_ENV=development`.

### 5. Start the service

Development mode with file watching:

```bash
npm run start:dev
```

Normal local run:

```bash
npm run start
```

Production build and run:

```bash
npm run build
npm run start:prod
```

With the example `.env`, the API starts at:

```text
http://localhost:5001/api/v1
```

A simple health check is available at:

```text
http://localhost:5001/api/v1
```

Expected response:

```json
{
  "status": "ok",
  "service": "babki-api"
}
```

## API Overview

All routes are exposed under the configured global prefix (`api/v1` by default). All routes require a valid JWT Bearer token unless marked **public**.

### Auth (public)

```
POST /auth/register
POST /auth/login
```

### User profile

```
GET   /users/me
PATCH /users/me
```

### Accounts

```
POST   /balances
GET    /balances
POST   /savings
GET    /savings
DELETE /accounts/:accountId
GET    /accounts/:accountId/snapshots
```

### Transactions

```
POST  /expenses
GET   /expenses
GET   /expenses/:expenseId
PATCH /expenses/:expenseId

POST  /incomes
GET   /incomes
GET   /incomes/:incomeId
PATCH /incomes/:incomeId

POST  /saves
GET   /saves
GET   /saves/:saveId
PATCH /saves/:saveId

GET    /transactions
GET    /transactions/:transactionId
DELETE /transactions/:transactionId
```

### Expense categories and limits

```
POST   /expense-categories
GET    /expense-categories
GET    /expense-categories/:categoryId
PATCH  /expense-categories/:categoryId
DELETE /expense-categories/:categoryId

POST   /expense-limits
GET    /expense-limits
GET    /expense-limits/:limitId
PATCH  /expense-limits/:limitId
DELETE /expense-limits/:limitId
```

### Debts

```
POST   /debts
GET    /debts
GET    /debts/:debtId
PATCH  /debts/:debtId
DELETE /debts/:debtId
POST   /debts/:debtId/repayments
GET    /debts/:debtId/transactions
GET    /debts/:debtId/transactions/:debtTransactionId
```

### Plans

```
POST   /plans
GET    /plans
GET    /plans/:planId
PATCH  /plans/:planId
DELETE /plans/:planId
POST   /plans/:planId/close
```

### Reports

```
GET /reports/months
GET /reports/years
```

`/reports/months` and `/reports/years` return `PeriodReport[]` containing period, expenses, incomes, saves, balance, saving, and expensesByCategory. Both accept `categories` as a comma-separated string or a repeated query parameter.

## Architecture Notes

Request flow:

```text
HTTP request → JwtAuthGuard → controller → service → Mongoose model → MongoDB → JSON response
```

Data relationships:

- users are authenticated via JWT; there is no `:userId` route parameter — all data is scoped to the token's subject
- accounts (`balance` / `saving`) are owned by users via Mongoose discriminator pattern
- transactions (`expense` / `income` / `save`) reference `userId`, `accountId`, and `snapshotId`
- each transaction write requires a matching monthly `AccountSnapshot` (snapshot invariant); services call `findOrCreateByAccountId` before creating a transaction, then `recalculateSnapshotsFromDate` to propagate the amount delta forward
- `save` transactions move money between accounts — they debit the source `balance` and credit the `saving`; both snapshot chains are updated atomically in a single session
- expenses reference `categoryId`; plans reference `categoryId` and optionally link a closed expense via `expenseId`
- reports aggregate across all transaction types

Discriminator pattern: both `Account` and `Transaction` use Mongoose discriminators with `discriminatorKey: 'type'`. The base schema is registered first; sub-types are registered as discriminators in each module's `MongooseModule.forFeature` call.

Multi-document atomicity: services that touch more than one collection inject `@InjectConnection()` and wrap writes in `session.withTransaction()`. MongoDB must be running as a replica set for this to work.

Caller-managed sessions: `ExpensesService.create` and `IncomesService.create` accept an optional `ClientSession`. When a session is provided they join the caller's transaction; when omitted they self-manage. Use this pattern when combining expense/income creation with writes to another collection (for example, `PlansService.close`).

Not found in repo:

- background jobs or queues
- caching layer
- external API integrations
- migration tooling

## Docker Workflow

The repo includes a containerized local stack:

- `Dockerfile`: multi-stage production image for the NestJS API
- `docker-compose.yml`: starts the API together with MongoDB configured as a replica set
- `config/secrets/docker-compose.json`: Mongo connection settings used by the API container

### 1. Prepare environment files

The API container still reads `.env`, so create it if you have not already:

```bash
cp .env.example .env
```

The default Compose setup overrides `SECRETS_FILE_PATH` to use `config/secrets/docker-compose.json`, which is already included in the repo and points the API to the `mongo` service.

### 2. Build and start the containers

Start the full stack in the foreground:

```bash
docker compose up --build
```

Start it in the background:

```bash
docker compose up --build -d
```

The services exposed by default are:

- API: `http://localhost:5001/api/v1`
- MongoDB: `localhost:27017`

### 3. Useful Docker commands

Stop the stack:

```bash
docker compose down
```

Stop the stack and remove the MongoDB data volume:

```bash
docker compose down -v
```

View container logs:

```bash
docker compose logs -f api
docker compose logs -f mongo
```

Rebuild only the API image after code or dependency changes:

```bash
docker compose build api
```

### 4. Notes about the container setup

- MongoDB data is stored in the named Docker volume `mongo_data`.
- MongoDB is started as a single-node replica set inside the container so multi-document transactions work.
- The API container mounts `config/secrets/docker-compose.json` as a read-only file instead of baking secrets into the image.
- The API image runs as the non-root `node` user for better container security.
- `depends_on` with a health check delays API startup until MongoDB is ready to accept connections.

## Testing

Run unit tests:

```bash
npm run test
```

Run unit tests in watch mode:

```bash
npm run test:watch
```

Run test coverage:

```bash
npm run test:cov
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Run Jest in debug mode:

```bash
npm run test:debug
```

## Developer Workflow

Format source and test files:

```bash
npm run format
```

Run ESLint with autofix:

```bash
npm run lint
```

Useful startup/debug scripts from `package.json`:

- `npm run start:debug`: starts Nest in debug + watch mode
- `npm run build`: compiles the application into `dist/`

## Secrets And Local Safety

Recommended local workflow:

1. Keep real secrets in `config/secrets/local.json`.
2. Commit only templates such as `config/secrets/example.json`.
3. Point `SECRETS_FILE_PATH` at the correct local file for your environment.
4. Prefer `MONGO_URI` when you already have a managed Mongo connection string.

Notes:

- `.env.example` and `config/secrets/example.json` are templates, not production credentials.
- The repo does not include secret-management tooling, vault integration, or environment-specific deployment manifests.

## Troubleshooting

If the service fails during startup, check these first:

- MongoDB is running as a replica set and is reachable
- `MONGO_DB_NAME` is set in `.env`
- `SECRETS_FILE_PATH` points to an existing JSON file
- your Mongo auth settings match the actual database configuration
- `JWT_SECRET` is set in the secrets file (required in production)

If requests fail validation, the app is likely rejecting unknown fields, invalid ObjectIds, or invalid DTO values through the global validation pipe.

**401 Unauthorized on any endpoint:** include `Authorization: Bearer <access_token>` in the request header. Obtain a token from `POST /auth/login`.

**MongoServerError: Transaction numbers are only allowed on a replica set member:** MongoDB must be running as a replica set. See "Getting Started → Start MongoDB as a replica set". Using `docker compose up` handles this automatically.
