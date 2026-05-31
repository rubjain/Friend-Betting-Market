# Visual QA Checklist (Pass/Fail)

Use after `npm run dev` at `http://127.0.0.1:3000`. Demo login: `test@example.com` / `password123`.

Breakpoints: mobile ~375px, tablet ~768px, desktop 1024px+.

| Area | Check | Mobile | Tablet | Desktop |
|------|-------|--------|--------|---------|
| Nav | Links wrap cleanly; no overlap with balance | | | |
| Markets | Card spacing and list rhythm feel even | | | |
| Market detail | Bet form fields align; buttons not cramped | | | |
| Portfolio | Stack cards have consistent padding | | | |
| Developer | No nested cards; forms use developer grid | | | |
| Developer | Flash banner readable and not clipped | | | |
| Developer | API Playground code blocks wrap without overflow | | | |
| Developer | Strategy row actions wrap without overlap | | | |
| Settings | Command grid stacks on small screens | | | |

## Developer workflow (functional + visual)

1. Open `/developer`.
2. Create API key; copy plaintext key once.
3. Create ACTIVE paper strategy.
4. Run strategy; confirm flash success.
5. Promote to real; confirm new `(real)` row appears as DRAFT.
6. Activate real strategy; Run; confirm execution log updates.

## Screenshot baselines (optional)

Capture and store under `docs/screenshots/` when ready:

- `developer-desktop.png`
- `developer-mobile.png`
- `markets-desktop.png`
- `portfolio-desktop.png`
