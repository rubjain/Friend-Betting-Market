# Architecture & behavior

A reference for how Agora is put together and how the prototype behaves. For a
high-level summary and run instructions, see the root [`README.md`](../README.md).

## What is included

- Landing page with CTA buttons and a simple 3-step explainer
- App Router pages for Landing, Markets, Market Detail, Friends, Portfolio, Create
  Market, Profile, and Admin
- Shared components for navigation, market cards, the betting panel, portfolio
  ledger, admin tables, and risk review
- Confirmation modals for risky admin actions (market resolution, account freezes,
  bonus removal, demo reset)
- Field-level validation states for market creation and bet placement
- Admin CSV exports for ledger and risk-review data
- Compact admin operations snapshot with balance mix, ledger-source bars,
  market-volume bars, and audit history
- Persisted light/dark mode toggle
- Sports-first market taxonomy for NBA, NFL, MLB, NHL, Soccer, College Sports,
  Combat Sports, Tennis, Golf, and Motorsports
- Interactive friend invites, pending-request handling, and market boost toggles
- Separate `withdrawable_balance` and `bonus_balance` treatment in the payout/ledger
  model
- Server-owned demo state via API routes, with `localStorage` retained for UI
  preferences and offline fallback

## Bonus and payout logic

- Social multiplier applies to the full normal payout
- Only the normal payout is withdrawable when funded by withdrawable balance
- Bonus-funded winnings return to bonus balance
- Mixed-fund winnings split normal payout proportionally between withdrawable and
  bonus balances
- Social boost excess always credits to bonus balance

## Database-first operation

When `DATABASE_URL` is set, the app uses Supabase Postgres via Prisma for users,
sessions, bets, markets, verification checks, and audit trails. Without it, the app
falls back to in-memory demo state for local development.

Bet placement, market submission, admin approval/rejection, lifecycle changes,
resolution, void/refund handling, admin funds, admin config, profile edits,
verification status updates, friend invites, friend request actions, social boosts,
risk actions, and admin CSV exports all use Prisma-backed services.

### Migrations

Run `npm run prisma:migrate:deploy` before deploy. Recent migrations add
`AGE`/`SANCTIONS` verification types (`0010`) and responsible-use user fields
(`0011`).

## Auth & compliance

- Signup → email verification → login (`/check-email`, `/verify-email`)
- Forgot/reset password, change password in Settings
- Identity and location verification in Settings → Compliance (U.S. state rules)
- Configure `EMAIL_USER`, `EMAIL_PASS`, `AGORA_SESSION_SECRET`, and `AGORA_APP_URL`
  for production
- Signup and database seeding store `scrypt`-hashed passwords (Node built-in
  `crypto`); login verifies them with constant-time comparison
- PostgreSQL-backed auth security covers durable login/signup/password-reset rate
  limits, expiring email-verification and password-reset tokens, session revocation
  after reset, and audit trails for completed resets
- The real-money compliance gates are documented in
  [`real-money-compliance-plan.md`](./real-money-compliance-plan.md)

## Prototype behaviors

- New market submissions move into a pending approval queue
- Admins can approve, reject, resolve, void, pause, and resume markets
- Resolution updates sample balances and bet history
- Market-card Yes/No buttons route into a review flow before final placement
- Friends can be invited, accepted, canceled, and added to a market's boost group
- Risk-review actions are modeled as admin-only demo controls for future fraud tooling
- Demo state can be reset from the admin dashboard
- Bet placement, resolution, submission, approval/rejection, friend actions, social
  boosts, admin config/funds, profile edits, and verification all go through API
  routes (with server-side validation) before falling back to the local reducer
- Market lifecycle, close/settlement timing, category resolution templates, and
  evidence/source placeholders are visible on market detail and admin history
- Portfolio ledger and admin audit history support filtering, sorting, and pagination
- Bonus-use limits and bonus payout caps are enforced in the payout engine and
  surfaced in admin controls
- Admin route access redirects non-admin users back to profile, using real session
  claims in API protections
- Confirmation dialogs support Escape-to-close and restore keyboard focus on close
- Primary navigation stays visible in narrow in-app/browser panels
- Voiding an active market refunds original open stakes by funding source with
  refund ledger entries
- Market submissions include an optional source/evidence URL that carries into
  pending review and approved market evidence
- Paused markets reject new bets in both the UI and API
- Friend boost actions feed a reusable risk engine for repeat boosts, dense
  clusters, and boost-pattern review signals
- Deposits/withdrawals have persisted payment transactions, ledger entries, and
  audit events when `DATABASE_URL` is configured; withdrawals are held in
  `PENDING_REVIEW`
- Category source-adapter contracts define required settlement fields by sport
- `prisma/schema.prisma` sketches the production data model for users, markets,
  bets, balances, ledger entries, friendships, boosts, admin config, risk reviews,
  resolutions, evidence links, audit trails, odds snapshots, orders, and AMM
  liquidity pools

## Project structure

- `app/` - Next.js routes
- `app/api/` - API routes for demo-state hydration, bet placement, market
  submission, profile/friend/admin actions, and CSV exports
- `components/` - shared shell, market, betting, portfolio, admin, and page components
- `context/AgoraContext.js` - localStorage hydration and demo state actions
- `lib/defaultState.js` - seed data
- `lib/marketMath.js` - payout, funding, and multiplier rules
- `lib/accounting.js` - ledger entry factories for deposits, bets, settlements, and
  admin adjustments
- `lib/exporters.js` - CSV export helpers for admin ledger and risk-review data
- `lib/marketTaxonomy.js` - category coverage, examples, and resolution requirements
- `lib/ledgerViews.js` - filtering, sorting, and pagination helpers for ledger/audit
- `lib/riskEngine.js` - social boost risk-signal helpers
- `lib/sourceAdapters.js` - settlement-source adapter contracts per market category
- `lib/server/auth.js` - request-session, signup/login/logout, persisted session, and
  admin-role helpers for API routes
- `lib/server/demoStore.js` - server-side demo store and API-safe mutations
- `lib/server/prisma.js` - Prisma client singleton and database feature flag
- `lib/server/dbState.js` - persisted demo seeding and UI state projection
- `lib/server/betService.js` - transactional bet placement
- `lib/server/marketService.js` - market submission, approval, lifecycle, resolution,
  payout, and refund workflows
- `lib/server/fundsService.js` - demo deposits and bonus grants
- `lib/server/adminConfigService.js` - admin policy updates
- `lib/server/profileService.js` - profile edits and verification checks
- `lib/server/friendService.js` - friendships and social boost toggles
- `lib/server/userRiskService.js` - freeze, risk-clear, and bonus-removal actions
- `lib/server/exportService.js` - ledger and risk-review CSV exports
- `lib/validation.js` - form validation rules for market submissions and bets
- `lib/formatters.js` - money, percent, and label formatting helpers
- `prisma/schema.prisma` - production database schema draft
- `prisma/migrations/` - Postgres migrations generated from the Prisma schema
- `tests/` - unit tests for payout math, ledger accounting, and server mutations
- `archive/legacy-prototype/` - original pre–Next.js prototype, kept for reference
