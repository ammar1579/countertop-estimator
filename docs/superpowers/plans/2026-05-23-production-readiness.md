# Countertop Estimator Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Manus platform dependencies and prepare the app for local development, GitHub, and initial Google Cloud Run deployment.

**Architecture:** Keep the existing React, Express, tRPC, Drizzle, and MySQL architecture. Replace Manus OAuth with first-party JWT email/password sessions and move quote total authority to server-side pricing code.

**Tech Stack:** React 19, Vite 7, Express 4, tRPC 11, Drizzle ORM, MySQL, jose JWT, bcryptjs, helmet, cors, express-rate-limit, Vitest.

---

### Task 1: Auth Replacement

**Files:**
- Modify: `drizzle/schema.ts`
- Modify: `server/db.ts`
- Create: `server/_core/auth.ts`
- Modify: `server/_core/context.ts`
- Modify: `server/routers.ts`
- Modify: `client/src/pages/Login.tsx`
- Modify: `client/src/_core/hooks/useAuth.ts`

- [ ] Add failing tests for `auth.register` and `auth.login`.
- [ ] Add `passwordHash` to users and generate a migration.
- [ ] Implement email/password registration and login.
- [ ] Sign JWT sessions in `app_session_id`.
- [ ] Preserve `admin` and `user` roles.
- [ ] Remove Manus OAuth routes and frontend login URL generation.

### Task 2: Server-Side Quote Pricing

**Files:**
- Create: `server/pricing.ts`
- Modify: `server/routers.ts`
- Modify: `client/src/pages/QuoteBuilder.tsx`

- [ ] Add failing pricing tests for subtotal, tax, total, and material square feet.
- [ ] Implement reusable pricing calculation with configurable tax rate.
- [ ] Recompute persisted totals on `quotes.saveLineItems`.
- [ ] Leave the frontend summary as a preview, not the source of truth.

### Task 3: Production Middleware

**Files:**
- Modify: `server/_core/env.ts`
- Modify: `server/_core/index.ts`
- Create: `server/_core/http.ts`
- Modify: `server/_core/cookies.ts`

- [ ] Add runtime env validation.
- [ ] Add `GET /health`.
- [ ] Add request logging.
- [ ] Add Helmet security headers.
- [ ] Add configured CORS.
- [ ] Add global and auth-specific rate limits.
- [ ] Set proxy/cookie behavior for Cloud Run.

### Task 4: Remove Manus Runtime Surface

**Files:**
- Modify: `vite.config.ts`
- Delete: Manus OAuth/runtime helper files that are no longer imported.
- Modify: `package.json`

- [ ] Remove `vite-plugin-manus-runtime`.
- [ ] Remove Manus debug collector.
- [ ] Remove Manus-specific env names from docs and examples.
- [ ] Remove unused Manus UI components/routes.

### Task 5: Deployment Assets

**Files:**
- Create: `.env.example`
- Create: `.dockerignore`
- Create: `.nvmrc`
- Modify: `.gitignore`
- Modify: `Dockerfile`
- Modify: `cloudbuild.yaml`
- Rewrite: `README.md`
- Create: `DEPLOYMENT.md`

- [ ] Document local MySQL setup.
- [ ] Document Cloud SQL socket connection format.
- [ ] Ensure Cloud Run listens on `PORT`.
- [ ] Ensure static frontend assets serve from `dist/public`.
- [ ] Verify Docker build when Docker is available.

### Task 6: Verification

- [ ] Run `pnpm install`.
- [ ] Run `pnpm drizzle-kit generate`.
- [ ] Run `pnpm check`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
- [ ] Start `pnpm dev` and check `/health`.
- [ ] Record any blocked checks that depend on missing local MySQL or Docker.
