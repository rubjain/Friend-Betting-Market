# Agora Public Beta Runbook

Agora's first launch is paper-money only. Real-money deposits, withdrawals, real trading, and real strategy execution stay disabled until legal, compliance, payments, tax, and operations review approve a separate rollout.

## Required Hosted Stack

- Vercel for the Next.js app.
- Supabase Postgres for persistent state.
- ESPN public scoreboard first, with deterministic demo fallback if the provider fails.
- External AI/model bots only: users run models outside Agora and call `/api/v1` with scoped API keys.

## Required Environment

- `DATABASE_URL`: Supabase pooled Postgres URL.
- `DIRECT_URL`: Supabase direct Postgres URL for migrations.
- `AGORA_SESSION_SECRET`: long random secret, not the local default.
- `AGORA_APP_URL`: deployed app origin.
- `AGORA_EMAIL_FROM`: sender name/address for user emails.
- `EMAIL_USER` and `EMAIL_PASS`: email delivery credentials.
- `AGORA_PUBLIC_BETA=1`: hosted beta mode; demo fallback becomes local-only.
- `AGORA_FORCE_DEMO_MODE=0`: never force demo mode in hosted beta.
- `AGORA_REAL_MONEY_MODE=0`: must remain off for beta.
- `AGORA_DEV_ADMIN_SHORTCUT=0`: must remain off outside local development.
- `AGORA_ADMIN_LEVELS_JSON`: configure scoped admin permissions for beta admins.
- `AGORA_DISABLE_ESPN=0`: use ESPN first unless provider testing requires fallback.
- `CRON_SECRET`: long random Bearer token for `/api/cron/espn-sync` and `/api/cron/strategy-worker`.
- `AGORA_STRATEGY_MARKETPLACE_ENABLED=1`: enable strategy marketplace APIs and UI.
- `AGORA_STRATEGY_MAX_ALLOCATION_PCT=50`: upper bound for subscriber allocation setting.
- `AGORA_STRATEGY_COPY_MIN_STAKE=0.5`: minimum copied trade stake to execute.

## Custom domain go-live

When your domain DNS is pointed at Vercel:

1. Add the custom domain in the Vercel project and wait for TLS provisioning.
2. Set `AGORA_APP_URL` to `https://yourdomain.com` (no trailing slash).
3. Confirm Supabase `DATABASE_URL` and `DIRECT_URL` on Vercel match production.
4. Run `npm run prisma:migrate:deploy` and `npm run db:verify` against production.
5. For strategy marketplace billing releases, run `npm run marketplace:backfill` after migrations.
6. Deploy and confirm `GET /api/health` returns `ok: true` on the custom domain.
7. Run the account onboarding and bot/API smoke tests below on that origin.
8. Share `/developer` and `docs/openapi.yaml` with external bot builders.

## Release Checklist

1. Run `npm ci`.
2. Run `npm run prisma:validate`.
3. Run `npm test`.
4. Run `npm run test:e2e` (demo mode). Playwright starts an isolated test server on port `3100`, writes artifacts to the OS temp folder by default to avoid OneDrive file locks, and only reuses an existing server when `PLAYWRIGHT_REUSE_SERVER=1` is set. Override with `PLAYWRIGHT_TEST_PORT`, `PLAYWRIGHT_TEST_BASE_URL`, or `PLAYWRIGHT_OUTPUT_DIR` only when needed. Optionally run database e2e with `E2E_USE_DATABASE=1 npm run test:e2e:db` when Postgres is configured.
5. Run `npm run build`.
6. Run `npm run prisma:migrate:deploy` against Supabase.
7. Run `npm run marketplace:backfill` for billing-related releases.
8. Run `npm run db:verify`.
9. Run `npm run prisma:seed` only for non-production seed/reset environments.
10. Visit `/api/health`; it must return `ok: true`.
11. Verify signup, email verification, login, paper bet placement, developer API key creation, and admin market resolution in the deployed environment.

## Operational Rules

- Do not enable `AGORA_REAL_MONEY_MODE=1` in the public beta.
- Do not enable `AGORA_FORCE_DEMO_MODE=1` in Vercel; it is only for local access when a saved database URL is broken.
- Do not enable `AGORA_DEV_ADMIN_SHORTCUT=1` in Vercel.
- Treat `/api/health` failures as deploy blockers.
- Use Supabase backups before migrations and before any bulk admin operation.
- Keep `DATABASE_URL` and `DIRECT_URL` out of logs, screenshots, and support messages.
- If ESPN is unavailable, the app may fall back to demo live games; admin-created markets and manual resolution remain the dependable path.
- Vercel schedules `GET /api/cron/espn-sync` every 15 minutes and `GET /api/cron/strategy-worker` every 5 minutes; both require Bearer `CRON_SECRET`.
- Keep `AGORA_ESPN_SYNC_INLINE=0` in production so ESPN sync runs through cron instead of ordinary page loads.
- Treat `sync.summary.errors > 0` from `/api/cron/espn-sync` responses as an investigation trigger.
- Keep strategy moderation queue clear so submitted profiles are explicitly approved or rejected before publication.
- Creator payout snapshots should be generated and reviewed on a fixed cadence (daily/weekly) before any transfer operations.

## Bot and API operating model

- External models and bots call `/api/v1` with Bearer API keys created at `/developer` (cookie session) or `POST /api/v1/keys` after login.
- Recommended scopes for paper bots: `read:markets`, `read:portfolio`, `trade:paper`, `manage:strategies`.
- Paper trades use `POST /api/v1/bets` with `"mode": "paper"` or limit orders via `/api/v1/orders`.
- Rule-based strategies: `POST /api/v1/strategies` with `type: RULES`, then `POST .../activate` and `POST .../run`, or schedule `npm run strategy:worker` against the deployed app.
- `type: ML` is not implemented yet; use external inference plus direct bet/order calls.
- `POST /api/v1/paper/reset` is for controlled test accounts only, not routine end-user flows.

## Account onboarding smoke test

1. Sign up on the live domain with a new email.
2. Open the verification link from email (`AGORA_APP_URL` must match the domain).
3. Log in and confirm paper balance in portfolio/settings.
4. Place a paper bet in the UI.
5. Create an API key on `/developer` and run the copied curl examples against the same origin.

## Rollback

1. In Vercel, redeploy the previous production deployment.
2. If a migration caused data issues, restore the Supabase backup taken before `prisma:migrate:deploy`.
3. Re-run `npm run marketplace:backfill` only after validating restored data and billing tables.
4. Do not enable `AGORA_FORCE_DEMO_MODE=1` on Vercel except for emergency read-only diagnosis.
5. Confirm `/api/health` returns `ok: true` before re-sharing the URL.

## Incident Triage (Beta)

1. If webhook failures spike, rotate `STRIPE_WEBHOOK_SECRET`/compliance webhook secrets and replay only verified events.
2. If creator payouts enter `HELD`, use admin payout reconciliation queue to resolve failed invoices before disbursing.
3. If ESPN sync errors persist for >30 minutes, pause affected markets and rely on manual resolution workflows.

## Real-Money Blockers

Before real-money features are enabled, complete jurisdiction classification, KYC/age/sanctions/geofencing, responsible-use controls, payment and payout reconciliation, chargeback handling, tax reporting, immutable audit retention, support procedures, suspicious-activity review, dispute escalation, and qualified counsel review. Do not set `STRIPE_SECRET_KEY` or `AGORA_REAL_MONEY_MODE=1` until that review is complete.
