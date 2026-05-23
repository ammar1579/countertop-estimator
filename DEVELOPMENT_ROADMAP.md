# Development Roadmap

## Phase 1: Local Development Foundation

- Replace Manus OAuth with email/password JWT auth.
- Commit a complete `.env.example` and clear local setup instructions.
- Keep the current React UI and tRPC architecture.
- Add production-safe middleware without changing the user workflow.

## Phase 2: Countertop Estimation Core

- Move all quote calculation authority to the server.
- Keep the canvas and line-item editing experience in the frontend.
- Add tests for waste factor, configurable tax rate, minimum charges, discounts, and revisions.
- Add TODO markers where quote calculation still needs richer domain rules.

## Phase 3: SaaS Readiness

- Add invite-based onboarding, password reset, email verification, and optional SSO.
- Add tenant/company scoping before multiple countertop shops use the same deployment.
- Add audit trails for pricing, orders, payments, user role changes, and quote revisions.
- Add exportable PDFs, email delivery, and quote acceptance tracking.

## Phase 4: Cloud Operations

- Deploy to Cloud Run with Cloud SQL MySQL.
- Add Cloud Build trigger for `main`.
- Add health checks, logging dashboards, error alerts, and database backups.
- Add staging and production environments with separate secrets and databases.
