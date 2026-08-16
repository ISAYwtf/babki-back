# Repository Guidelines

## Project Overview

`babki-back` is a NestJS 11 REST API written in TypeScript and backed by MongoDB through Mongoose. It manages personal-finance data such as accounts, transactions, expense categories and limits, debts, plans, snapshots, and reports. The API uses a global JWT guard; routes are protected unless explicitly marked with `@Public()`.

## Repository Layout

- `src/modules/` contains domain modules. Keep controllers, services, DTOs, schemas, interfaces, and module wiring inside the owning domain.
- `src/common/` contains cross-domain DTOs, filters, interceptors, interfaces, pipes, and utilities.
- `src/config/` contains runtime configuration parsing and trusted-proxy setup.
- `src/database/` contains seed orchestration and deterministic development fixtures.
- `test/` contains end-to-end tests and `test/jest-e2e.json`.
- `config/secrets/` contains secret-file examples. Local generated secret files must remain untracked.
- `docs/` contains deployment notes and implementation/design documents.
- `openspec/` contains OpenSpec configuration and change artifacts.
- `scripts/` contains repository maintenance scripts such as secret generation.

Unit tests are colocated with production files as `*.spec.ts`. End-to-end tests use `*.e2e-spec.ts` under `test/`.

## Common Commands

- `npm install` installs locked dependencies from `package-lock.json`.
- `npm run start:dev` runs Nest in watch mode.
- `npm run start` runs the application without watch mode.
- `npm run build` compiles the application to `dist/`.
- `npm run start:prod` runs `dist/main` after a successful build.
- `npm run lint` runs ESLint with automatic fixes; review the resulting diff because this command mutates files.
- `npm run format` formats TypeScript files under `src/` and `test/` with Prettier.
- `npm run test` runs Jest unit tests discovered under `src/`.
- `npm run test:watch` runs unit tests interactively.
- `npm run test:cov` writes coverage output to `coverage/`.
- `npm run test:e2e` runs the end-to-end suite configured by `test/jest-e2e.json`.
- `NODE_ENV=development npm run seed` loads development fixtures.
- `npm run secrets:generate` creates the secret JSON selected by `SECRETS_FILE_PATH` and refuses to overwrite an existing file.

## Architecture and Implementation Conventions

Follow standard NestJS naming: `*.module.ts`, `*.controller.ts`, `*.service.ts`, DTOs in `dto/`, Mongoose schemas in `schemas/`, and focused interfaces in `interfaces/`. Prefer dependency injection and keep controllers thin; business rules and database coordination belong in services.

The application uses Mongoose discriminators for account and transaction variants. Preserve existing discriminator fields and model registration patterns when extending those domains. Multi-document workflows use MongoDB transactions, so local and deployed MongoDB instances must run as a replica set.

All routes are mounted below the configured API prefix (`api/v1` by default). Global bootstrap behavior includes strict DTO validation, implicit transformation, rejection of unknown fields, normalized HTTP errors, request logging, and trusted-proxy configuration. Do not bypass these global mechanisms with route-specific ad hoc replacements.

Authentication state is user-scoped. Controllers should obtain the authenticated identity through `@CurrentUser()` rather than accepting a user ID from clients. Public endpoints must be deliberately decorated with `@Public()`; do not weaken the global guard. Changes to two-factor authentication, recovery codes, throttling, encryption, or `authVersion` require focused security regression tests.

## Style and Type Safety

Prettier is the formatting authority: use single quotes, trailing commas, and its default indentation. ESLint uses type-aware TypeScript rules. Prefix intentionally unused variables or parameters with `_`. Resolve floating-promise and unsafe-argument warnings instead of suppressing them unless there is a documented reason.

Use `src/...` imports where that improves clarity and matches nearby code. Keep DTO validation explicit with `class-validator` and transformation behavior compatible with the global `ValidationPipe`. Avoid `any` in new code even though the repository does not forbid it globally.

## Testing and Verification

Add focused service tests for business rules and controller or end-to-end tests for HTTP contracts, authentication boundaries, validation, and global error behavior. Keep dates, generated codes, and seed fixtures deterministic. When fixing a bug, add a regression test that fails without the fix.

Run the narrowest relevant test while iterating. Before handing off a code change, run the affected tests and `npm run build`; run `npm run test` and `npm run test:e2e` when the change crosses modules or affects global behavior. Report the exact commands and results. No numeric coverage threshold is configured, but new behavior should be meaningfully covered.

## Configuration and Secrets

Each runtime uses a general `.env` file plus one JSON secret file selected by `SECRETS_FILE_PATH`. Start from `.env.example`, `.env.docker.example`, or `.env.production.example` and the matching example under `config/secrets/`. Do not commit `.env`, local secret JSON files, credentials, JWT secrets, recovery/TOTP key material, or production connection strings.

Keep non-secret deployment settings in `.env` and secret material in the selected JSON file. `SECRETS_FILE_PATH` must remain relative to the project root and must not use parent-directory traversal. Configuration errors should fail fast during startup. Production requires strong externally managed keys and an explicit `JWT_SECRET`.

## Git and Pull Requests

Preserve unrelated working-tree changes and never overwrite user work outside the requested scope. Keep commits focused and use the repository's concise past-tense style, for example `Added Plans API`, `Fixed security issues`, or `Refactored seeds`.

Pull requests should describe user-visible behavior, list verification commands and results, link related issues or OpenSpec changes, and call out migrations or changes to schemas, seeds, secrets, environment variables, authentication, and deployment. Include screenshots only for rendered documentation or other visual output.
