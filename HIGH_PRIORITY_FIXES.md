# High Priority Fixes

Audit date: 2026-05-23

## Blockers Found And Addressed

- Removed platform OAuth and replaced it with JWT email/password auth.
- Removed the platform runtime plugin and debug collector from Vite.
- Added runtime environment validation in `server/_core/env.ts`.
- Added plain HTTP `GET /health`.
- Changed production port handling to bind the configured `PORT` on `0.0.0.0`.
- Added server-side quote total calculation in `server/pricing.ts`.
- Added `.env.example`.
- Removed placeholder analytics variables and the template page title from `client/index.html`.
- Replaced the deployment docs and Cloud Build config for Cloud Run.

## Completed Fix Order

1. Replaced platform OAuth with local JWT email/password auth backed by MySQL.
2. Added server-side pricing calculation and use it when quote line items are saved.
3. Added environment validation, health check, logging, CORS, rate limiting, and security headers.
4. Removed unused platform runtime/plugin/debug/storage/auth references from active code.
5. Refreshed deployment assets: `.env.example`, README, deployment docs, Dockerfile, Cloud Build, `.dockerignore`, `.nvmrc`.
6. Verified `pnpm check`, `pnpm test`, `pnpm build`, migrations, and local server startup.

## Baseline Results

- `pnpm` was not installed locally; installed `pnpm@10.4.1` globally to match `packageManager`.
- `pnpm install` completed successfully.
- `pnpm check` passed before fixes.
- `pnpm test` passed before fixes: 33 tests.
- `pnpm build` passed before fixes, with Vite warnings for analytics placeholders and CSS import order.
- Homebrew MySQL was installed and started locally.
- `pnpm drizzle-kit migrate` now applies successfully against local MySQL.
- `seed.sql` was applied locally: 3 price lists and 88 price list items.
- Docker is still not installed on this Mac, so container build verification is pending until Docker Desktop or another Docker daemon is available.
