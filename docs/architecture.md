# Architecture

Quick Quartz is a full-stack countertop estimating and sales management app. It is built as a Vite React dashboard backed by an Express/tRPC API, Drizzle ORM, and MySQL.

## Runtime Shape

- `client/` contains the React application, routes, page components, hooks, and shadcn/Radix UI components.
- `server/` contains the Express server, tRPC router, auth/session handling, database access functions, and pricing engine.
- `shared/` re-exports schema and shared error types for cross-package imports.
- `drizzle/` contains the database schema, relations, migration SQL, and migration metadata.
- `scripts/` contains operational scripts such as production migrations and admin promotion.

In development, `pnpm dev` runs `server/_core/index.ts` with `tsx watch`. The Express server mounts the tRPC API and, in development, integrates Vite middleware for the frontend. Production builds place frontend assets and bundled server code in `dist/`.

## Frontend

The frontend is a React 19 dashboard using TypeScript, Vite, Tailwind CSS, and shadcn/Radix UI primitives. Page-level screens live in `client/src/pages/` and cover:

- Authentication: login and registration.
- Sales workflow: clients, quotes, quote builder, quote detail, orders, and order detail.
- Administration and operations: price lists, inventory, analytics, settings, and user/admin flows.

The frontend talks to the backend through the tRPC client in `client/src/lib/trpc.ts`. Auth state is exposed through hooks under `client/src/_core/hooks/`.

## Backend

The backend is organized around `server/_core/` and `server/routers.ts`.

- `server/_core/index.ts` starts the HTTP server.
- `server/_core/env.ts` reads and validates runtime configuration.
- `server/_core/auth.ts` handles local email/password registration, login, JWT sessions, and role assignment.
- `server/_core/cookies.ts` centralizes session cookie options.
- `server/_core/trpc.ts` defines public and protected tRPC procedures.
- `server/_core/systemRouter.ts` exposes system endpoints such as health checks.
- `server/routers.ts` defines the application API surface.
- `server/db.ts` contains database queries and persistence operations.

Most application procedures are protected. Admin-only actions use an `adminProcedure` guard that requires `ctx.user.role === "admin"`.

## Data Model

The primary tables are defined in `drizzle/schema.ts`:

- `users`: local auth identity, email, password hash, role, and sign-in timestamps.
- `clients`: customer profile, contact info, address, lead source, notes, and creator.
- `priceLists`: named price books with revision, active flag, waste factor, and tax rate.
- `priceListItems`: material, edge, splash, accessory, and fixture prices.
- `quotes`: quote header, client, salesperson, status, revision, totals, signature, and drawing data.
- `quoteLineItems`: quote line details and server-computed line totals.
- `quoteRevisions`: quote revision snapshots and change log entries.
- `quoteEmailLogs`: outbound quote email tracking.
- `orders`: converted quote sales with project status, payment status, totals, and dates.
- `orderLineItems`: immutable order line item snapshots copied from quote line items at conversion.
- `payments`: recorded order payments.
- `inventory`: slab/color inventory and low-stock settings.

The database connection is created lazily from `DATABASE_URL` through Drizzle's MySQL driver.

## Main Workflows

1. A user registers or logs in with local email/password auth.
2. A protected session is stored in the `app_session_id` HTTP-only cookie.
3. A salesperson creates or updates clients.
4. A quote is created against a client and price list.
5. Quote line items are saved through `quotes.saveLineItems`.
6. The server recomputes line totals, subtotal, tax, total, and material square feet before persisting totals.
7. Quote revisions and email logs can be recorded.
8. A quote can be converted to an order, copying quote totals, snapshotting quote line items, and linking the order to the source quote.
9. Order detail line items are read from `orderLineItems`, not from mutable quote line items.
10. Payments update order `amountPaid` and payment status.
11. Analytics aggregate quotes, orders, revenue, conversion, salesperson metrics, and low-stock inventory.

## Build And Delivery

The production build runs:

```sh
vite build
esbuild server/_core/index.ts
esbuild scripts/promote-admin.ts
esbuild scripts/migrate.ts
```

The repository includes Google Cloud Run deployment assets and launch checklists. Runtime configuration is documented in `.env.example`; required production values include `DATABASE_URL`, a strong `JWT_SECRET`, CORS origins, secure cookie settings, and signup/admin controls.

## Quality Gates

Current local and CI checks include:

- `pnpm lint`
- `pnpm check`
- `pnpm test`
- `pnpm build`

Vitest covers pricing behavior, auth logout, and core Quick Quartz behavior.
