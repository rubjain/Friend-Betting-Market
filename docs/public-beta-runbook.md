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

## Custom domain go-live

When your domain DNS is pointed at Vercel:

1. Add the custom domain in the Vercel project and wait for TLS provisioning.
2. Set `AGORA_APP_URL` to `https://yourdomain.com` (no trailing slash).
3. Confirm Supabase `DATABASE_URL` and `DIRECT_URL` on Vercel match production.
4. Run `npm run prisma:migrate:deploy` and `npm run db:verify` against production.
5. Deploy and confirm `GET /api/health` returns `ok: true` on the custom domain.
6. Run the account onboarding and bot/API smoke tests below on that origin.
7. Share `/developer` and `docs/openapi.yaml` with external bot builders.

## Release Checklist

1. Run `npm ci`.
2. Run `npm run prisma:validate`.
3. Run `npm test`.
4. Run `npm run build`.
5. Run `npm run prisma:migrate:deploy` against Supabase.
6. Run `npm run prisma:seed` only for non-production seed/reset environments.
7. Run `npm run db:verify`.
8. Visit `/api/health`; it must return `ok: true`.
9. Verify signup, email verification, login, paper bet placement, developer API key creation, and admin market resolution in the deployed environment.

## Operational Rules

- Do not enable `AGORA_REAL_MONEY_MODE=1` in the public beta.
- Do not enable `AGORA_FORCE_DEMO_MODE=1` in Vercel; it is only for local access when a saved database URL is broken.
- Do not enable `AGORA_DEV_ADMIN_SHORTCUT=1` in Vercel.
- Treat `/api/health` failures as deploy blockers.
- Use Supabase backups before migrations and before any bulk admin operation.
- Keep `DATABASE_URL` and `DIRECT_URL` out of logs, screenshots, and support messages.
- If ESPN is unavailable, the app may fall back to demo live games; admin-created markets and manual resolution remain the dependable path.

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
3. Do not enable `AGORA_FORCE_DEMO_MODE=1` on Vercel except for emergency read-only diagnosis.
4. Confirm `/api/health` returns `ok: true` before re-sharing the URL.

## Real-Money Blockers

Before real-money features are enabled, complete jurisdiction classification, KYC/age/sanctions/geofencing, responsible-use controls, payment and payout reconciliation, chargeback handling, tax reporting, immutable audit retention, support procedures, suspicious-activity review, dispute escalation, and qualified counsel review. Do not set `STRIPE_SECRET_KEY` or `AGORA_REAL_MONEY_MODE=1` until that review is complete.
