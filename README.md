# Quick Quartz Countertop Estimator

Quick Quartz is a production-oriented countertop estimating and sales management app for countertop shops. It uses a React dashboard, Express, tRPC, Drizzle ORM, and MySQL.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS, shadcn/Radix UI
- Express 4 and tRPC 11
- Drizzle ORM with MySQL
- JWT email/password auth with `admin` and `user` roles
- Vitest for server behavior tests
- Google Cloud Run deployment assets

## Local Development

Prerequisites:

- Node.js 22 LTS. This repo includes `.nvmrc`.
- pnpm 10.x.
- MySQL. On this Mac, Homebrew MySQL is installed and running.

Setup:

```bash
pnpm install
cp .env.example .env
openssl rand -hex 32
```

Put the generated secret into `JWT_SECRET` in `.env`, then create the local database:

```bash
mysql -u root -ppassword -e "CREATE DATABASE IF NOT EXISTS quickquartz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
pnpm drizzle-kit migrate
mysql -u root -ppassword quickquartz < seed.sql
pnpm dev
```

The app runs at `http://localhost:3000`.

First account:

- With the default local `.env`, sign up from `/login`.
- The first registered account becomes `admin` when `ALLOW_FIRST_USER_ADMIN=true`.
- Set `ALLOW_SIGNUPS=false` after creating production users.

## Scripts

```bash
pnpm dev                  # Start local dev server
pnpm check                # TypeScript check
pnpm test                 # Vitest tests
pnpm build                # Production build
pnpm start                # Run built production server
pnpm promote-admin EMAIL  # Promote an existing user to admin
pnpm migrate:prod         # Run bundled migrations without Drizzle CLI
pnpm drizzle-kit migrate  # Apply migrations
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Apply Drizzle migrations
```

## Environment

Use `.env.example` as the source of truth. Required runtime values:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGINS`

Production defaults should include:

```env
NODE_ENV=production
ALLOW_SIGNUPS=false
ALLOW_FIRST_USER_ADMIN=false
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
TRUST_PROXY=1
```

## Auth

The app uses local JWT email/password auth backed by the `users` table. The auth session is stored in the `app_session_id` HTTP-only cookie. Roles are preserved through the existing `role` enum:

- `admin`
- `user`

Admin-only tRPC procedures use `adminProcedure`.

## Pricing

The frontend still previews quote totals while a user edits a quote, but persisted quote totals are recomputed on the server in `server/pricing.ts` when line items are saved. This prevents clients from becoming the source of truth for subtotal, tax, total, and material square footage.

TODO: Extend the server pricing engine with countertop-specific rules for waste factor, minimum charges, discounts, jurisdiction-specific tax, and locked quote revisions.

## Health Check

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"ok":true,"service":"quick-quartz"}
```

## Deployment

See `DEPLOYMENT.md` for Google Cloud Run and Cloud SQL instructions.
See `GITHUB_LAUNCH_CHECKLIST.md` and `GOOGLE_CLOUD_LAUNCH_CHECKLIST.md` for launch steps.
