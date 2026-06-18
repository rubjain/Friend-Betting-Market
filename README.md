# Agora

A social, paper-money sports prediction market (Kalshi/Polymarket-style) built with
Next.js. Friends place YES/NO predictions on live sports, boost each other's upside
with social multipliers, and compete on leaderboards. External bots can trade via a
public API. **No real money** — paper trading only; the real-money compliance plan
is documented separately.

## Quick start

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:3000`. The dev server runs in webpack mode to match the
verified production build path (do not use Turbopack).

To sign in to the developer/API console, open `/developer` with
`test@example.com` / `password123`.

## Database (optional)

The app runs in-memory by default. To use a real Postgres database, copy
`.env.example` to `.env`, set `DATABASE_URL`, then run:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run db:verify
```

Supabase (pooler URL) is recommended for development; Railway also works. See
[`docs/architecture.md`](docs/architecture.md#database-first-operation) for details.

## Common commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the Next.js dev server (webpack) |
| `npm run build` | Production build |
| `npm test` | Payout/ledger/server unit tests |
| `npm run check` | Run tests + production build |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run prisma:migrate` | Apply database migrations |
| `npm run strategy:worker` | Run the strategy automation worker |

## Configuration

Set `AGORA_SESSION_SECRET` to a long random value before sharing any environment.
For the hosted paper-money beta, use Vercel + Supabase, set `AGORA_PUBLIC_BETA=1`,
keep `AGORA_REAL_MONEY_MODE=0`, and verify `/api/health` before release. To expose
the temporary local admin toggle, set `AGORA_DEV_ADMIN_SHORTCUT=1` (keep it disabled
outside local development).

## Project layout

- `app/` — Next.js routes and API handlers
- `components/` — shared UI components
- `context/` — client state (`AgoraContext`)
- `lib/` — payout math, accounting, services, and server integrations
- `prisma/` — schema and migrations
- `tests/` / `e2e/` — unit and end-to-end tests
- `docs/` — architecture, API, runbooks, and compliance docs
- `styles.css` — global stylesheet (imported by `app/layout.js`)
- `archive/legacy-prototype/` — original pre–Next.js prototype (reference only)

## Documentation

| Doc | Contents |
|-----|----------|
| [`docs/architecture.md`](docs/architecture.md) | Features, payout logic, behaviors, and full file map |
| [`docs/api.md`](docs/api.md) | Public API v1, auth, and funding endpoints |
| [`docs/openapi.yaml`](docs/openapi.yaml) | OpenAPI contract |
| [`docs/public-beta-runbook.md`](docs/public-beta-runbook.md) | Launch checklist and rollback notes |
| [`docs/real-money-compliance-plan.md`](docs/real-money-compliance-plan.md) | Compliance gates before real money |
| [`docs/visual-qa-checklist.md`](docs/visual-qa-checklist.md) | Visual spacing/QA checklist |

## Git workflow

Pushes go through a feature branch and a GitHub pull request — avoid pushing review
-worthy work straight to the default branch. `npm run sync` stages non-ignored
files, commits with a timestamp if needed, rebases on `origin/main`, and pushes.
Note that `.githooks/post-commit` pushes automatically after a successful commit.
