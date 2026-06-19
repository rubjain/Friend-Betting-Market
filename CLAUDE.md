# Agora — Project Memory

## What is Agora
Social paper-money sports prediction market (Kalshi/Polymarket-style). Binary YES/NO contracts on live sports. Friends can boost each other's upside, compete on leaderboards, and external bots trade via a public API. **No real money** — paper trading only for now; real-money compliance plan documented in `docs/real-money-compliance-plan.md`.

**Stack:** Next.js (webpack dev: `npm run dev --webpack`), Prisma ORM, Supabase Postgres (pooler URL), React context for client state.

## Running the app
```bash
cd ~/agora && npm run dev
```
Runs on `http://localhost:3000`. If port conflict: `lsof -ti :3000 | xargs kill -9`.

## Database
- **Supabase Postgres** — DATABASE_URL is in `.env` and `.env.local`
- Password: `Agora2725haste`
- Prisma schema: `prisma/schema.prisma` (27 models)
- Run migrations: `npm run prisma:migrate`

## Key architecture decisions
- **ESPN game ID = Market ID** — `espn_nba_401234567` is used directly as the market ID. This is how the live score rail auto-connects and deduplication works.
- **YES = away team wins, NO = home team wins** — convention used everywhere (odds, labels, resolution).
- **All live bets are `isPaper: true`** — funded from PAPER wallet (not WITHDRAWABLE/BONUS).
- **State flow:** server (`/api/session` → `getDatabaseState`) → client `AgoraContext` → `getMergedMarkets()` combines DB markets with synthetic game markets.
- **Only `espn_`-prefixed markets are shown** — both server-side filter in `dbState.js` and client-side in `AgoraContext.js` (`mergeStoredState`). Old seed markets are cleaned up via `cleanupLegacySeedMarkets`.

## Live data pipeline
1. **`lib/server/espnMarketSync.js`** — runs on every `getDatabaseState` call (debounced 3 min). Fetches ESPN games for next 7 days, upserts as DB markets, auto-resolves finals.
2. **`lib/server/oddsApiClient.js`** — The Odds API for tennis + MLB. Key: `ODDS_API_KEY` in env. 6h cache. 500 req/month free tier.
3. **Pricing priority:** ESPN live win-prob → ESPN DraftKings moneyline → Odds API → 50/50 fallback.
4. **Auto-resolution:** final score → YES (away wins) / NO (home wins) / VOID (tie/draw) / null (0-0, leave paused).

## Auto-resolution (core trading loop)
- `espnMarketSync.js` calls `resolveFinalGameMarket()` when `game.status === "final"`
- Uses dynamic `import("./marketService.js")` to avoid dbState→espnMarketSync→marketService→dbState cycle
- **Paper-aware settlement** in `marketService.js`: winning paper bets credit PAPER wallet with `boostedPayout` (stake × AMM odds + social bonus). Losing bets marked LOST. Voided bets refunded to PAPER.

## Market display
- Titles: `Away @ Home` (team sports), `Player vs. Player` (tennis)
- YES/NO buttons show team abbreviations + percent (e.g. "LAD 63% / ARI 37%") via `lib/marketLabels.js` metadata fallback
- Live games always sort to top of Markets page regardless of sort mode
- Matchup-level deduplication in `mergeGameMarkets` — prefers live/real-odds market when same fixture appears twice

## Navigation structure
- **Social** flyout: Friends, Groups, Leaderboard
- **Manage funds** flyout: Deposit, Withdraw
- **Settings** flyout: Account, Balances, Appearance, Referrals, Transaction history
- **Legal** flyout: Terms, Privacy
- Top-level: Home, Markets, Portfolio, Create, Developer, Profile, FAQ

## Key files
| File | Purpose |
|------|---------|
| `lib/server/espnMarketSync.js` | ESPN → DB sync + auto-resolution |
| `lib/server/oddsApiClient.js` | The Odds API integration (tennis, MLB) |
| `lib/server/dbState.js` | Main state builder; cleanup; espn_ filter |
| `lib/server/marketService.js` | Bet resolution; paper-aware settlement |
| `lib/gameMarkets.js` | Synthetic markets; matchup dedup |
| `lib/marketAlgorithms.js` | `getLinkedLiveGame` (exact-ID for espn_ markets) |
| `lib/marketLabels.js` | YES/NO team name labels |
| `context/AgoraContext.js` | Client state; `getMergedMarkets`; `mergeStoredState` |
| `components/AppShell.js` | Nav structure |
| `components/pages/MarketsPage.js` | Browse/filter/sort UI |
| `components/pages/LandingPage.js` | Home page with Popular Markets grid |

## Known remaining gaps / next priorities
1. **Schedule `/api/cron/espn-sync`** — inline sync is off by default (`AGORA_ESPN_SYNC_INLINE=0`); configure Vercel cron + `CRON_SECRET`.
2. **ML strategy inference is stubbed** — rule-based bots work, ML doesn't (`lib/strategies/mlInference.js`).
3. **Configure production email** — set `EMAIL_USER`/`EMAIL_PASS`; nodemailer sends verification/reset/recovery mail when configured.
4. **Real-money vendors** — replace beta identity/location flows with certified KYC + geolocation providers before `AGORA_REAL_MONEY_MODE=1` (`lib/server/complianceProviders.js`).
5. **Stripe reconciliation** — checkout webhooks exist; chargeback/dispute and payout reconciliation still need ops tooling.

## Auth & compliance (implemented)
- Email verification (6-digit code + link), forgot/reset password, change password in Settings
- Identity + location verification with U.S. state rules in Settings → Compliance (`lib/stateCompliance.js`)
- Responsible-use settings persisted on User: daily deposit limit + self-exclusion (`/api/profile/responsible-use`)
- Mutating API routes require authenticated sessions; admin-only DB reset in hosted beta

## What NOT to do
- **Never push to git unless user explicitly says to push**
- Never modify git config
- API key (`ODDS_API_KEY`) and DB password in `.env`/`.env.local` — do not commit or expose
- Do not use Turbopack (`next dev --turbopack`) — Stripe module fails; use `--webpack`

## Branch
`codex-auth-database-hardening` on `https://github.com/rubjain/Friend-Betting-Market.git`
