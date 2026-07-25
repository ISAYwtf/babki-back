# Repository Guidelines

## Project Structure & Module Organization

This is a NestJS + TypeScript REST API backed by MongoDB/Mongoose. Application code lives in `src/`. Feature domains are under `src/modules/`, including `auth`, `accounts`, `transactions`, `expense-limits`, `debts`, `plans`, and `reports`. Shared DTOs, pipes, interfaces, and helpers live in `src/common/`; runtime configuration is in `src/config/`; seed scripts are in `src/database/`. Unit tests are colocated as `*.spec.ts`. E2E Jest configuration lives in `test/jest-e2e.json`. Docker and local secrets examples are in `docker-compose.yml` and `config/secrets/`.

## Build, Test, and Development Commands

- `npm run start:dev`: start Nest in watch mode for local development.
- `npm run build`: compile TypeScript into `dist/`.
- `npm run start:prod`: run the compiled app from `dist/main`.
- `npm run lint`: run ESLint with autofix across TypeScript sources.
- `npm run format`: format `src/**/*.ts` and `test/**/*.ts` with Prettier.
- `npm run test`: run unit tests with Jest.
- `npm run test:cov`: run Jest with coverage output in `coverage/`.
- `npm run test:e2e`: run E2E tests using `test/jest-e2e.json`.
- `NODE_ENV=development npm run seed`: populate development MongoDB data.

## Coding Style & Naming Conventions

Use TypeScript and standard NestJS patterns: `*.module.ts`, `*.controller.ts`, `*.service.ts`, DTOs under `dto/`, and Mongoose schemas under `schemas/`. Prettier enforces single quotes and trailing commas. ESLint uses type-aware TypeScript rules, ignores `*.spec.ts`, allows `any`, warns on floating promises and unsafe arguments, and permits unused variables prefixed with `_`.

## Testing Guidelines

Jest unit tests are discovered by `.*\.spec\.ts$` under `src/`. Place new tests beside the code they verify, for example `src/modules/reports/reports.service.spec.ts`. Prefer service-level tests for business rules and controller/e2e tests for request behavior. Run `npm run test` before submitting changes.

## Commit & Pull Request Guidelines

Recent commits use short, past-tense summaries such as `Added Plans API`, `Fixed security issues`, and `Updated seeds for data consistency`. Follow that style: one concise line describing the user-visible change. Pull requests should include a brief description, test results, related issue links when available, and notes about database, seed, or configuration changes. Include screenshots only when API docs or generated visual artifacts change.

## Security & Configuration Tips

Do not commit local secrets. Copy `.env.example` to `.env` and `config/secrets/example.json` to a local secrets file. MongoDB must run as a replica set because multi-document transactions are used. Keep `JWT_SECRET` set outside production defaults.
