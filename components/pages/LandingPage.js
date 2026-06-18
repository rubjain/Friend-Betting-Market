"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAgora } from "../../context/AgoraContext";
import { formatPercent, formatVolume, money } from "../../lib/formatters";
import {
  getLinkedLiveGame,
  getLiveGameClock,
  getMarketPipelineSummary,
} from "../../lib/marketAlgorithms";
import { buildMarketDualPriceSeries } from "../../lib/marketPriceSeries";
import { getContractSideLabels } from "../../lib/marketLabels";
import TerminalMarketCard from "../TerminalMarketCard";

function formatAxisTime(ms) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}

function RowChartTooltip({ active, payload, labelA = "YES", labelB = "NO", colorA, colorB }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const yesPoint = payload.find((item) => item.dataKey === "a");
  const noPoint = payload.find((item) => item.dataKey === "b");
  const yesValue = typeof yesPoint?.value === "number" ? yesPoint.value : row.a;
  const noValue = typeof noPoint?.value === "number" ? noPoint.value : row.b;
  return (
    <div className="top-market-row-tooltip">
      <div className="top-market-row-tooltip-time">{formatAxisTime(row.time)}</div>
      <div className="top-market-row-tooltip-line" style={{ "--top-market-tooltip-color": colorA }}>
        <span>{labelA}</span>
        <strong>{formatPercent(yesValue)}</strong>
      </div>
      <div className="top-market-row-tooltip-line" style={{ "--top-market-tooltip-color": colorB }}>
        <span>{labelB}</span>
        <strong>{formatPercent(noValue)}</strong>
      </div>
    </div>
  );
}

function TopMarketRow({ market, linkedGame, now, rowIndex }) {
  const router = useRouter();
  const { actions } = useAgora();
  const series = useMemo(() => buildMarketDualPriceSeries(market, linkedGame, now), [market, linkedGame, now]);
  const chartLabels = useMemo(
    () => getContractSideLabels(market, linkedGame, { shortSides: true }),
    [market, linkedGame],
  );
  const awayColor = linkedGame?.awayTeamColor || "var(--mt-yes, var(--accent))";
  const homeColor = linkedGame?.homeTeamColor || "var(--mt-no, var(--no))";
  const isLive = linkedGame?.status === "live";
  const isChartRight = rowIndex % 2 === 1;

  function placeQuickBet(side) {
    actions.prepareBet(market.id, side);
    router.push(`/markets/${market.id}`);
  }

  return (
    <article className={`top-market-row${isChartRight ? " top-market-row--chart-right" : ""}`}>
      <div className="top-market-row-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series.points} margin={{ top: 12, right: 12, left: 6, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={formatAxisTime}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value) => formatPercent(value)}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={(
                <RowChartTooltip
                  labelA={chartLabels.yesLabel}
                  labelB={chartLabels.noLabel}
                  colorA={awayColor}
                  colorB={homeColor}
                />
              )}
              cursor={{ stroke: "rgba(120,120,120,0.45)", strokeWidth: 1 }}
            />
            <Line type="monotone" dataKey="a" stroke={awayColor} strokeWidth={2.2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="b" stroke={homeColor} strokeWidth={2.2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="top-market-row-info">
        <div className="top-market-row-head">
          <div>
            <span className="market-category-kicker">{market.category}</span>
            <h3>{market.title}</h3>
          </div>
          <span className="top-market-row-badges">
            <span className="top-market-row-volume">{money(market.volume)} vol</span>
            {isLive ? <span className="market-live-badge">LIVE</span> : null}
          </span>
        </div>

        {linkedGame ? (
          <div className="top-market-row-scoreboard">
            <div>
              <span>{linkedGame.awayTeam}</span>
              <div className="top-market-score-stack">
                <strong>{linkedGame.awayScore}</strong>
                <button type="button" className="top-market-side-bet" onClick={() => placeQuickBet("YES")}>
                  {formatPercent(market.yesPrice)}
                </button>
              </div>
            </div>
            <div className="top-market-row-scoreboard-clock">{getLiveGameClock(linkedGame)}</div>
            <div>
              <span>{linkedGame.homeTeam}</span>
              <div className="top-market-score-stack">
                <strong>{linkedGame.homeScore}</strong>
                <button type="button" className="top-market-side-bet" onClick={() => placeQuickBet("NO")}>
                  {formatPercent(market.noPrice)}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="top-market-row-footer">
          <span>{linkedGame?.league || "Sports"} market</span>
          <Link className="btn btn-ghost btn-sm" href={`/markets/${market.id}`}>Open Market</Link>
        </div>
      </div>
    </article>
  );
}

export default function LandingPage() {
  const { state, selectors } = useAgora();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const landingData = useMemo(() => {
    const catalog = selectors.getMergedMarkets();
    const totalVolume = catalog.reduce((sum, market) => sum + Number(market.volume || 0), 0);
    const pipeline = getMarketPipelineSummary(catalog, state.liveGames);

    const liveMarkets = catalog.filter((m) => {
      const game = getLinkedLiveGame(m, state.liveGames);
      return game?.status === "live";
    });
    const upcomingMarkets = catalog
      .filter((m) => {
        const game = getLinkedLiveGame(m, state.liveGames);
        return !game || game.status === "scheduled";
      })
      .sort((a, b) => {
        const at = a.closeTime ? Date.parse(a.closeTime) : Infinity;
        const bt = b.closeTime ? Date.parse(b.closeTime) : Infinity;
        return at - bt;
      });

    const seen = new Set();
    const deduped = [...liveMarkets, ...upcomingMarkets].filter((m) => {
      const away = m.metadata?.awayTeam ?? m.title;
      const home = m.metadata?.homeTeam ?? m.title;
      const key = `${away}|${home}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const popularMarkets = deduped.slice(0, 12);
    const peakVolume = popularMarkets.reduce(
      (max, m) => Math.max(max, Number(m.volume || 0)),
      0,
    );

    // Featured "Top Markets" with price graphs: live-linked games ranked by
    // volume (live first), one row per matchup.
    const linkedCatalog = catalog
      .map((market) => ({ market, linkedGame: getLinkedLiveGame(market, state.liveGames) }))
      .filter((entry) => entry.linkedGame);
    const liveLinked = linkedCatalog.filter((entry) => entry.linkedGame.status === "live");
    const seenFeatured = new Set();
    const topMarkets = (liveLinked.length ? liveLinked : linkedCatalog)
      .sort((l, r) => Number(r.market.volume || 0) - Number(l.market.volume || 0))
      .filter((entry) => {
        const key = `${entry.market.metadata?.awayTeam ?? entry.market.title}|${entry.market.metadata?.homeTeam ?? entry.market.title}`;
        if (seenFeatured.has(key)) return false;
        seenFeatured.add(key);
        return true;
      })
      .slice(0, 4);

    return {
      totalVolume,
      pipeline,
      catalogCount: catalog.length,
      liveCount: liveMarkets.length,
      popularMarkets,
      peakVolume,
      topMarkets,
    };
  }, [state.liveGames, selectors]);

  const tickers = [
    { label: "TOTAL VOL", value: `$${formatVolume(landingData.totalVolume)}` },
    { label: "MARKETS", value: String(landingData.catalogCount).padStart(2, "0") },
    { label: "LIVE", value: String(landingData.liveCount).padStart(2, "0"), live: true },
    { label: "SPORTS", value: String(landingData.pipeline.categories).padStart(2, "0") },
    { label: "LIVE-LINKED", value: String(landingData.pipeline.liveLinked).padStart(2, "0") },
  ];

  return (
    <section className="page active market-terminal" aria-label="Market terminal">
      {/* Ticker rail — dense monospace status strip, not an airy hero */}
      <div className="mt-ticker" role="list" aria-label="Session statistics">
        <div className="mt-ticker-brand">
          <span className="mt-ticker-dot" aria-hidden="true" />
          AGORA<span className="mt-ticker-brand-sub">/TERMINAL</span>
        </div>
        <div className="mt-ticker-feed">
          {tickers.map((t) => (
            <div className="mt-ticker-item" role="listitem" key={t.label}>
              <span className="mt-ticker-label">{t.label}</span>
              <span className={`mt-ticker-value${t.live && Number(t.value) > 0 ? " is-live" : ""}`}>
                {t.value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-ticker-session">
          <span className="mt-ticker-pulse" aria-hidden="true" />
          PAPER · BETA
        </div>
      </div>

      {/* Command bar — replaces the centered hero with a tight terminal header */}
      <header className="mt-command">
        <div className="mt-command-headline">
          <h1>
            Trade what you <em>know.</em>
          </h1>
          <p>
            Binary YES/NO markets on live sport. Social boosts amplify paper winnings —
            no real capital at risk.
          </p>
        </div>
        <div className="mt-command-actions">
          <Link className="mt-btn mt-btn-primary" href="/markets">
            Open Markets <span aria-hidden="true">→</span>
          </Link>
          <Link className="mt-btn mt-btn-ghost" href="/developer">
            Developer API
          </Link>
        </div>
      </header>

      {/* Routing rail — three entry paths as terminal cells */}
      <nav className="mt-rail" aria-label="Beta paths">
        <Link className="mt-rail-cell" href="/markets">
          <span className="mt-rail-tag">01 · SPORTS</span>
          <strong>Find live-linked markets and place paper trades.</strong>
        </Link>
        <Link className="mt-rail-cell" href="/groups">
          <span className="mt-rail-tag">02 · FRIENDS</span>
          <strong>Create groups, compare leaderboards, boost together.</strong>
        </Link>
        <Link className="mt-rail-cell" href="/developer">
          <span className="mt-rail-tag">03 · MODELS</span>
          <strong>Connect external AI bots with scoped API keys.</strong>
        </Link>
      </nav>

      {/* Top Markets — featured rows with live YES/NO price graphs */}
      {landingData.topMarkets.length ? (
        <section className="mt-board mt-board--featured" aria-label="Top markets">
          <div className="mt-board-head">
            <h2>
              Top Markets <span className="mt-board-count">{landingData.topMarkets.length}</span>
            </h2>
            <Link className="mt-board-all" href="/markets">ALL MARKETS →</Link>
          </div>
          <div className="top-market-rows-wrap">
            {landingData.topMarkets.map((entry, index) => (
              <TopMarketRow
                key={entry.market.id}
                market={entry.market}
                linkedGame={entry.linkedGame}
                now={now}
                rowIndex={index}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Market grid — dense, data-first cards */}
      <section className="mt-board" aria-label="Popular markets">
        <div className="mt-board-head">
          <h2>
            Popular Markets <span className="mt-board-count">{landingData.popularMarkets.length}</span>
          </h2>
          <Link className="mt-board-all" href="/markets">
            ALL MARKETS →
          </Link>
        </div>

        {landingData.popularMarkets.length ? (
          <div className="mt-grid">
            {landingData.popularMarkets.map((market) => (
              <TerminalMarketCard
                key={market.id}
                market={market}
                liveGames={state.liveGames}
                peakVolume={landingData.peakVolume}
              />
            ))}
          </div>
        ) : (
          <div className="mt-empty">
            <strong>NO MARKETS ONLINE</strong>
            <span>ESPN feed syncs automatically — stand by.</span>
          </div>
        )}
      </section>
    </section>
  );
}

