# babki-back

`babki-back` is a NestJS + TypeScript REST API for personal-finance data, backed by MongoDB via Mongoose. The codebase exposes versioned endpoints for users, balances, expenses, debts, expense categories, and monthly/yearly summaries.

## What Is In The Repo

The application currently contains these functional areas:

- `users`: create, list, search, update, and delete users
- `balances`: store one balance snapshot per user
- `expenses`: track dated expenses with categories and descriptions
- `debts`: track borrowers, debt principal, remaining amount, optional description, due date, and status
- `debt-transactions`: record debt repayment history for each debt
- `expense-categories`: manage shared categories for expenses
- `reports`: build monthly and yearly summary responses

Technical cross-cutting behavior:

- global request validation via Nest `ValidationPipe`
- MongoDB ObjectId validation via a custom pipe
- normalized error payloads via a global exception filter
- request logging via a global interceptor

## Tech Stack

- Node.js
- NestJS
- TypeScript
- MongoDB
- Mongoose
- Jest for unit and e2e tests

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
  "MONGO_AUTH_SOURCE": "admin"
}
```

How the app uses these values:

- `PORT`: HTTP port for the Nest app
- `API_PREFIX`: global API prefix, defaulting to `api/v1`
- `SECRETS_FILE_PATH`: path to the JSON file with Mongo connection settings
- `MONGO_DB_NAME`: required database name
- `MONGO_URI`: optional full Mongo connection string in the secrets file
- `MONGO_AUTH_ENABLED`: when `true`, the app builds an authenticated Mongo URI from host, port, user, password, and auth source

If `MONGO_DB_NAME` is missing, the service will fail at startup. If auth is enabled but the username or password is missing, startup will also fail.

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

Create the secrets file referenced by `SECRETS_FILE_PATH`. The repo includes `config/secrets/example.json` as a template.

```bash
cp config/secrets/example.json config/secrets/local.json
```

### 3. Start MongoDB

The application expects a MongoDB instance that matches the values from your `.env` and secrets file.

What is defined in repo:

- default host: `localhost`
- default port: `27017`
- default DB name from `.env.example`: `babki_db`
- default secrets file path: `config/secrets/local.json`

What is not defined in repo:

- a local database bootstrap script
- a seeded development dataset

That means you need to start MongoDB using your normal local workflow and make sure it is reachable with the configured host, port, credentials, and database name before starting the API.

### 4. Start the service

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

## Docker Workflow

The repo now includes a containerized local stack:

- `Dockerfile`: multi-stage production image for the NestJS API
- `docker-compose.yml`: starts the API together with MongoDB
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

## API Shape

The app wires these modules in `src/app.module.ts`:

- `UsersModule`
- `BalancesModule`
- `ExpenseCategoriesModule`
- `ExpensesModule`
- `DebtsModule`
- `ReportsModule`

Representative routes from the checked-in controllers:

- `GET /users`
- `POST /users`
- `GET /users/:userId/balance`
- `PUT /users/:userId/balance`
- `GET /users/:userId/expenses`
- `POST /users/:userId/expenses`
- `GET /users/:userId/debts`
- `POST /users/:userId/debts`
- `POST /users/:userId/debts/:debtId/repayments`
- `GET /users/:userId/debts/:debtId/transactions`
- `GET /users/:userId/debts/:debtId/transactions/:debtTransactionId`
- `GET /expense-categories`
- `POST /expense-categories`
- `GET /users/:userId/summaries/month`
- `GET /users/:userId/summaries/year`

All routes are exposed under the configured global prefix, which defaults to `api/v1`.

## Architecture Notes

Request flow:

```text
HTTP request -> controller -> service -> Mongoose model -> MongoDB -> JSON response
```

Data relationships visible in the repo:

- users are the parent entity
- balances, expenses, and debts are scoped by `userId`
- expenses reference `categoryId`
- reports aggregate balances, debts, expenses, and categories

Not found in repo:

- authentication or authorization
- background jobs or queues
- caching layer
- external API integrations
- migration tooling
- database seeding scripts

## Troubleshooting

If the service fails during startup, check these first:

- MongoDB is running and reachable
- `MONGO_DB_NAME` is set in `.env`
- `SECRETS_FILE_PATH` points to an existing JSON file
- your Mongo auth settings match the actual database configuration

If requests fail validation, the app is likely rejecting unknown fields, invalid ObjectIds, or invalid DTO values through the global validation pipe.
