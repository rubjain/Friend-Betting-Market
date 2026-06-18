# Public API v1 (paper-first model workflow)

The v1 API supports cookie-session auth for first-party app calls and Bearer API
keys for external clients. The full OpenAPI contract (including error `code`
fields) lives in [`docs/openapi.yaml`](./openapi.yaml).

## API key management

- `GET /api/v1/keys` lists keys for the signed-in user.
- `POST /api/v1/keys` creates a key and returns `plaintextKey` once.
- `DELETE /api/v1/keys` revokes a key by `apiKeyId`.

Scopes:

- `read:markets`
- `read:portfolio`
- `trade:paper`
- `trade:real`
- `manage:strategies`

## Trading and portfolio endpoints

- `GET /api/v1/markets`
- `GET /api/v1/markets/:marketId`
- `GET /api/v1/markets/:marketId/price-history`
- `GET /api/v1/live/games`
- `GET /api/v1/portfolio?mode=paper|real|all`
- `GET/POST/DELETE /api/v1/orders`
- `POST /api/v1/bets`
- `POST /api/v1/paper/reset`

`POST /api/v1/bets` accepts either a `betDraft` payload or a simplified stake
payload:

```json
{
  "marketId": "market_1",
  "side": "YES",
  "stake": 25,
  "mode": "paper"
}
```

## Strategy endpoints (paper practice → real promotion)

- `GET/POST /api/v1/strategies`
- `PATCH/DELETE /api/v1/strategies/:strategyId`
- `GET /api/v1/strategies/executions`
- `POST /api/v1/strategies/:strategyId/run` (ACTIVE strategies only)
- `POST /api/v1/strategies/:strategyId/promote` (creates REAL draft)
- `POST /api/v1/strategies/:strategyId/activate`
- `POST /api/v1/strategies/:strategyId/pause`

Scheduled automation for ACTIVE strategies:

```bash
npm run strategy:worker
# one tick then exit:
npm run strategy:worker:once
```

## Auth endpoints (production hardening)

- `POST /api/auth/verify-email` accepts `{ "token": "..." }` and marks the user's
  email verification check as verified.
- `POST /api/auth/password-reset` accepts `{ "identifier": "email-or-username" }`
  and creates a reset token. In development only, the token is returned in the
  response so the flow can be tested before an email provider is connected.
- `PATCH /api/auth/password-reset` accepts `{ "token": "...", "password": "new" }`,
  updates the password, revokes existing sessions, and writes an audit entry.
- `/verify-email` and `/forgot-password` expose those flows in the app UI for demo
  and QA.

Production still needs a real email provider before these tokens are user-facing.
Set `AGORA_APP_URL` and `AGORA_EMAIL_FROM` now so links can be generated
consistently when delivery is connected.

## Funding endpoints (payment-infrastructure hardening)

- `POST /api/funds/deposit` accepts `{ "amount": 25, "method": "bank" }`, creates a
  completed demo-ledger payment transaction, credits withdrawable balance, writes a
  ledger entry, and records an audit event.
- `POST /api/funds/withdraw` accepts `{ "amount": 25, "method": "bank" }`, creates a
  pending-review withdrawal transaction, holds withdrawable funds with a debit
  ledger entry, and records an audit event for admin review.

### Stripe (optional)

If you want real deposit collection via Stripe Checkout (instead of the demo
ledger), set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then POST to
`/api/funds/deposit` with `{ "amount": 25, "method": "stripe" }`. The API returns
`checkoutUrl`. Stripe calls `/api/webhooks/payments` and the app marks the
`PaymentTransaction` complete and credits withdrawable balance.

## Local API walkthrough

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000/developer` and sign in with
`test@example.com` / `password123`.

### Supabase setup for persistent API keys and strategies

1. Create `.env` from `.env.example`.
2. Set Supabase `DATABASE_URL` (Project Settings → Database → Connection string → URI).
3. Run:

```bash
npm run supabase:turn-on
```

Or step by step:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run db:verify
```

Without `DATABASE_URL`, keys and strategies still work in demo mode but are
in-memory and reset on restart.
