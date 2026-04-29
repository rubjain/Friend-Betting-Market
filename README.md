# FriendMarket MVP

This is a responsive Next.js MVP for a social prediction market product: a sports-betting-style app where friends can place predictions together and use social boosts to increase bonus-side upside. It keeps the original localStorage-backed demo behavior while moving the app into routes, components, and reusable payout/accounting modules.

## What is included

- Landing page with CTA buttons and a simple 3-step explainer
- App Router pages for Landing, Markets, Market Detail, Friends, Portfolio, Create Market, Profile, and Admin
- Shared components for navigation, market cards, the betting panel, portfolio ledger, admin tables, and risk review
- Confirmation modals for risky admin actions like market resolution, account freezes, bonus removal, and demo reset
- Field-level validation states for market creation and bet placement
- Admin CSV exports for ledger and risk-review data
- Compact admin operations snapshot with balance mix, ledger-source bars, market-volume bars, and audit history
- Persisted light/dark mode toggle
- Central market taxonomy for Sports, Politics, Weather, Crypto, Finance, Tech, and Culture
- Interactive friend invites, pending-request handling, and market boost toggles
- Separate `withdrawable_balance` and `bonus_balance` treatment in the sample payout and ledger model
- Server-owned demo state exposed through API routes, with `localStorage` retained for UI preferences and offline fallback
- Working admin controls for boost policy, bonus usage, approvals, and market resolution
- Bet placement now deducts from the chosen balance mix and writes ledger entries
- Market resolution now settles matching bets back into withdrawable and bonus balances by funding ratio
- Friend boosts now update market multiplier previews and recent activity in the demo state
- Portfolio ledger filters for withdrawable, bonus, boost, and admin transactions
- Admin risk-review queue with freeze, clear-review, and bonus-removal demo actions

## Bonus and payout logic in this prototype

- Social multiplier applies to the full normal payout
- Only the normal payout is withdrawable when funded by withdrawable balance
- Bonus-funded winnings return to bonus balance
- Mixed-fund winnings split normal payout proportionally between withdrawable and bonus balances
- Social boost excess always credits to bonus balance

## Prototype behaviors

- New market submissions move into a pending approval queue
- Admins can approve, reject, and resolve markets
- Resolution updates sample balances and bet history
- Market-card Yes/No buttons route into review flow before final placement
- Friends can be invited, accepted, canceled, and added to the selected market's boost group
- Risk-review actions are modeled as admin-only demo controls for future fraud tooling
- Demo state can be reset from the admin dashboard
- Bet placement and market resolution now go through API routes before falling back to the local demo reducer
- Market submission, approval, and rejection now go through API routes with server-side submission validation
- Friend invites, request actions, and social boost changes now go through API routes with server-side duplicate and max-group checks
- Admin config, demo deposits, demo bonus grants, account freezes, risk clearing, and bonus removal now go through API routes
- Profile editing and demo verification status actions now go through API routes
- Market lifecycle, close/settlement timing, category resolution templates, and evidence/source placeholders are visible on market detail and admin resolution history
- Portfolio ledger and admin audit history now support filtering, sorting, and pagination
- Bonus-use limits and bonus payout caps are enforced in the payout engine and surfaced in admin controls
- Admin route access now redirects non-admin users back to profile, with real session claims used by API protections
- Confirmation dialogs now support Escape-to-close and restore keyboard focus after closing
- Primary navigation stays visible in narrow in-app/browser panels so Markets, Friends, Portfolio, Create, and Profile are always directly reachable
- Admins can void active markets and refund original open stakes by funding source with refund ledger entries
- Market submissions now include an optional source/evidence URL that carries into pending admin review and approved market evidence
- Admins can pause and resume active markets; paused markets reject new bets in both the UI and API
- Friend boost actions now feed a reusable risk engine for repeat boosts, dense clusters, and boost-pattern review signals
- Login, logout, signup, persisted user sessions, and a dev-only admin shortcut provide the first real auth foundation
- Category source-adapter contracts now define required settlement fields for Sports, Politics, Weather, Crypto, Finance, Tech, and Culture
- `prisma/schema.prisma` sketches the production data model for users, markets, bets, balances, ledger entries, friendships, boosts, admin config, risk reviews, resolutions, evidence links, audit trails, odds snapshots, orders, and AMM liquidity pools
- `docs/real-money-compliance-plan.md` captures the compliance gates that must be complete before withdrawable play funds become real money

## Run locally

Install dependencies and start the Next dev server:

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:3000`.

To run against a local Postgres database, copy `.env.example` to `.env`, set `DATABASE_URL`, then run:

```bash
npm run prisma:generate
npm run prisma:migrate
```

When `DATABASE_URL` is present, `/api/session` hydrates from persisted users and sessions, while `/api/demo-state` remains available for reset/fallback workflows. Bet placement, market submission, admin approval/rejection, lifecycle changes, resolution, void/refund handling, admin funds, admin config, profile edits, verification status updates, friend invites, friend request actions, social boosts, risk actions, and admin CSV exports all use Prisma-backed services. Without `DATABASE_URL`, the existing in-memory demo store remains the fallback.

Set `FRIENDMARKET_SESSION_SECRET` to a long random value before sharing any environment. To expose the temporary admin toggle locally, set `FRIENDMARKET_DEV_ADMIN_SHORTCUT=1`; keep it disabled outside local development.

For a production verification build:

```bash
npm run build
```

For payout and ledger rule tests:

```bash
npm test
```

To run both tests and the production build:

```bash
npm run check
```

To sync all local project changes to GitHub:

```bash
npm run sync
```

That command stages non-ignored files, commits with an auto timestamp if needed, rebases on top of `origin/main`, and pushes. This repo also uses `.githooks/post-commit`, so ordinary `git commit` calls push automatically after the commit succeeds.

The old `index.html` and `app.js` prototype files are still present as migration reference. The active app entry point is the Next.js `app/` directory, and the migrated app still reuses `styles.css` as its global stylesheet. The dev server uses webpack mode to match the verified production build path.

## Current structure

- `app/` - Next.js routes
- `app/api/` - API routes for demo-state hydration, bet placement, market submission, profile actions, friend actions, admin config, admin funds, admin user actions, admin market actions, and admin CSV exports
- `components/` - shared shell, market, betting, portfolio, admin, and page components
- `context/FriendMarketContext.js` - localStorage hydration and demo state actions
- `lib/defaultState.js` - seed data
- `lib/marketMath.js` - payout, funding, and multiplier rules
- `lib/accounting.js` - ledger entry factories for deposits, bets, settlements, and admin adjustments
- `lib/exporters.js` - CSV export helpers for admin ledger and risk-review data
- `lib/marketTaxonomy.js` - category coverage, examples, and resolution requirements
- `lib/ledgerViews.js` - reusable filtering, sorting, and pagination helpers for ledger/audit tables
- `lib/riskEngine.js` - reusable social boost risk-signal helpers
- `lib/sourceAdapters.js` - settlement-source adapter contracts for each market category
- `lib/server/auth.js` - request-session, signup/login/logout, persisted session, and admin-role helpers for API routes
- `lib/server/demoStore.js` - server-side demo store and API-safe bet/settlement mutations
- `lib/server/prisma.js` - Prisma client singleton and database feature flag
- `lib/server/dbState.js` - persisted demo seeding and UI state projection
- `lib/server/betService.js` - database-backed transactional bet placement
- `lib/server/marketService.js` - persisted market submission, approval, lifecycle, resolution, payout, and refund workflows
- `lib/server/fundsService.js` - persisted demo deposits and bonus grants
- `lib/server/adminConfigService.js` - persisted admin policy updates
- `lib/server/profileService.js` - persisted profile edits and verification checks
- `lib/server/friendService.js` - persisted friendships and social boost toggles
- `lib/server/userRiskService.js` - persisted freeze, risk-clear, and bonus-removal actions
- `lib/server/exportService.js` - persisted ledger and risk-review CSV exports
- `lib/validation.js` - form validation rules for market submissions and bets
- `lib/formatters.js` - money, percent, and label formatting helpers
- `prisma/schema.prisma` - first production database schema draft
- `prisma/migrations/0001_initial/migration.sql` - initial Postgres migration generated from the Prisma schema
- `tests/` - unit tests for payout math, ledger accounting, and server demo mutations
