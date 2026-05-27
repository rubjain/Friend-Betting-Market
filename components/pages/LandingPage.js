"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAgora } from "../../context/AgoraContext";
import { formatPercent, money } from "../../lib/formatters";
import { getLinkedLiveGame, getLiveGameClock, getMarketPipelineSummary } from "../../lib/marketAlgorithms";
import { buildMarketDualPriceSeries } from "../../lib/marketPriceSeries";

function formatAxisTime(ms) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

function RowChartTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload;
  if (!row) {
    return null;
  }
  const yesPoint = payload.find((item) => item.dataKey === "a");
  const noPoint = payload.find((item) => item.dataKey === "b");
  const yesValue = typeof yesPoint?.value === "number" ? yesPoint.value : row.a;
  const noValue = typeof noPoint?.value === "number" ? noPoint.value : row.b;
  return (
    <div className="top-market-row-tooltip">
      <div className="top-market-row-tooltip-time">{formatAxisTime(row.time)}</div>
      <div className="top-market-row-tooltip-line">
        YES <strong>{formatPercent(yesValue)}</strong>
      </div>
      <div className="top-market-row-tooltip-line">
        NO <strong>{formatPercent(noValue)}</strong>
      </div>
    </div>
  );
}

function TopMarketRow({ market, linkedGame, now, activityTick, rowIndex }) {
  const router = useRouter();
  const { actions } = useAgora();
  const series = useMemo(() => buildMarketDualPriceSeries(market, linkedGame, now), [market, linkedGame, now]);
  const awayColor = linkedGame?.awayTeamColor || "var(--accent)";
  const homeColor = linkedGame?.homeTeamColor || "var(--accent-2)";
  const isLive = linkedGame?.status === "live";
  const isChartRight = rowIndex % 2 === 0;
  const activityFeed = useMemo(() => {
    const tradeActivity = (market.recentActivity || []).map(
      (item) => `${item.user}: ${item.action}${item.amount ? ` (${money(item.amount)})` : ""}`,
    );
    const gameUpdates = linkedGame?.updates || [];
    const merged = [...tradeActivity, ...gameUpdates];
    return merged.length ? merged : ["No live market chatter yet."];
  }, [linkedGame?.updates, market.recentActivity]);
  const activeActivity = activityFeed[(activityTick + rowIndex) % activityFeed.length];
  function placeQuickBet(side) {
    actions.prepareBet(market.id, side);
    router.push(`/markets/${market.id}`);
  }

  return (
    <article className={`top-market-row${isChartRight ? " top-market-row--chart-right" : ""}`}>
      <div className="top-market-row-chart">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={series.points} margin={{ top: 8, right: 8, left: 8, bottom: 6 }}>
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
            <Tooltip content={<RowChartTooltip />} cursor={{ stroke: "rgba(120,120,120,0.45)", strokeWidth: 1 }} />
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
              <strong>{linkedGame.awayScore}</strong>
              <button
                type="button"
                className="top-market-side-bet"
                style={{ "--side-color": awayColor }}
                onClick={() => placeQuickBet("YES")}
              >
                {formatPercent(market.yesPrice)}
              </button>
            </div>
            <div className="top-market-row-scoreboard-clock">{getLiveGameClock(linkedGame)}</div>
            <div>
              <span>{linkedGame.homeTeam}</span>
              <strong>{linkedGame.homeScore}</strong>
              <button
                type="button"
                className="top-market-side-bet"
                style={{ "--side-color": homeColor }}
                onClick={() => placeQuickBet("NO")}
              >
                {formatPercent(market.noPrice)}
              </button>
            </div>
          </div>
        ) : null}

        <div className="top-market-row-ticker" aria-live="polite">
          <strong>Live feed</strong>
          <span>{activeActivity}</span>
        </div>

        <div className="top-market-row-footer">
          <span>{linkedGame?.league || "Sports"} market</span>
          <Link className="btn btn-ghost btn-sm" href={`/markets/${market.id}`}>
            Open Market
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function LandingPage() {
  const { state, selectors } = useAgora();
  const [now, setNow] = useState(() => Date.now());
  const [activityTick, setActivityTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActivityTick((current) => current + 1);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  const landingData = useMemo(() => {
    const catalog = selectors.getMergedMarkets();
    const totalVolume = catalog.reduce((sum, market) => sum + Number(market.volume || 0), 0);
    const pipeline = getMarketPipelineSummary(catalog, state.liveGames);
    const linkedCatalog = catalog
      .map((market) => ({ market, linkedGame: getLinkedLiveGame(market, state.liveGames) }))
      .filter((entry) => entry.linkedGame);
    const liveLinked = linkedCatalog.filter((entry) => entry.linkedGame.status === "live");
    const rankedPool = (liveLinked.length ? liveLinked : linkedCatalog)
      .sort((left, right) => Number(right.market.volume || 0) - Number(left.market.volume || 0))
      .slice(0, 12);

    return {
      totalVolume,
      pipeline,
      catalogCount: catalog.length,
      topLiveMarkets: rankedPool,
    };
  }, [state.liveGames, selectors]);

  return (
    <section className="page active landing-page">
      <div className="hero-section">
        <p className="hero-eyebrow">Paper-money public beta</p>
        <h2 className="hero-headline">Trade what you know. Boost with friends.</h2>
        <p className="hero-sub">
          Binary YES/NO markets on live sports you follow. Social boosts amplify paper winnings; no real money is at stake.
        </p>
        <div className="hero-ctas">
          <Link className="btn btn-primary" href="/markets">Browse Markets</Link>
          <Link className="btn btn-secondary" href="/developer">Developer API</Link>
        </div>
      </div>

      <div className="landing-stats">
        <div className="landing-stat">
          <span className="landing-stat-label">Markets</span>
          <strong className="landing-stat-value">{landingData.catalogCount}</strong>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Total volume</span>
          <strong className="landing-stat-value">{money(landingData.totalVolume)}</strong>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Sports</span>
          <strong className="landing-stat-value">{landingData.pipeline.categories}</strong>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Live-linked</span>
          <strong className="landing-stat-value">{landingData.pipeline.liveLinked}</strong>
        </div>
      </div>

      <section className="landing-beta-grid" aria-label="Beta paths">
        <Link className="list-card landing-beta-card" href="/markets">
          <span className="label">Sports users</span>
          <strong>Find live-linked markets and place paper trades.</strong>
        </Link>
        <Link className="list-card landing-beta-card" href="/groups">
          <span className="label">Friends beta</span>
          <strong>Create groups, compare leaderboards, and boost together.</strong>
        </Link>
        <Link className="list-card landing-beta-card" href="/developer">
          <span className="label">Model builders</span>
          <strong>Connect external AI bots with scoped API keys.</strong>
        </Link>
      </section>

      <section>
        <div className="section-head">
          <div>
            <h3>Top Live Markets</h3>
            <p>One row per game: graph on the left, live score + percentages on the right.</p>
          </div>
          <Link className="btn btn-ghost" href="/markets">All Markets</Link>
        </div>
        <div className="top-market-rows-wrap">
          {landingData.topLiveMarkets.length ? (
            landingData.topLiveMarkets.map((entry, index) => (
              <TopMarketRow
                key={entry.market.id}
                market={entry.market}
                linkedGame={entry.linkedGame}
                now={now}
                activityTick={activityTick}
                rowIndex={index}
              />
            ))
          ) : (
            <article className="card top-market-empty">
              <h4>No live-linked markets yet</h4>
              <p>As soon as live feeds connect, your top active game rows will appear here.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}
