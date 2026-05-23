# Production Checklist

## Required Before First Public Deploy

- [x] Use Node.js 22 LTS locally and in Cloud Run.
- [x] Set `DATABASE_URL` to a MySQL-compatible database for local development.
- [x] Run `pnpm drizzle-kit migrate` against the local database.
- [x] Set local `JWT_SECRET` from `openssl rand -hex 32`.
- [ ] Set `CORS_ORIGINS` to the production domain.
- [ ] Keep `ALLOW_SIGNUPS=false` after creating the initial admin user.
- [x] Add production cookie controls for `COOKIE_SECURE` and `COOKIE_SAME_SITE`.
- [x] Add `TRUST_PROXY=1` support for Cloud Run.
- [x] Confirm local `/health` returns `200`.
- [x] Confirm protected app routes redirect to `/login`.
- [x] Confirm quote totals are recomputed by the server.
- [ ] Confirm Cloud SQL service account has `roles/cloudsql.client`.
- [ ] Confirm Cloud Build service account can write Artifact Registry and deploy Cloud Run.

## Operational Follow-Ups

- [ ] Add invite-only user management for production onboarding.
- [ ] Add password reset and email verification before customer launch.
- [ ] Add audit logging for quote/order/payment changes.
- [ ] Add automated database backups and restore drills.
- [ ] Add uptime checks against `/health`.
- [ ] Add error reporting and request tracing.
- [ ] Add CI to run `pnpm check`, `pnpm test`, and `pnpm build` on every PR.
