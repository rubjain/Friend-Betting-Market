"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAgora } from "../../context/AgoraContext";
import { formatVolume, money } from "../../lib/formatters";
import {
  getLinkedLiveGame,
  getLiveGameClock,
  getMarketPipelineSummary,
} from "../../lib/marketAlgorithms";
import { getContractSideLabels } from "../../lib/marketLabels";

// In-session memory of last-seen YES probability per market. Lets us surface a
// REAL probability shift (the move observed since the previous live poll)
// without inventing data or needing a backend price-history field.
const probabilityMemory = new Map();

function pct(value) {
  return `${Math.round((Number(value) || 0) * 100)}`;
}

export default function LandingPage() {
  const { state, selectors } = useAgora();

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

    return {
      totalVolume,
      pipeline,
      catalogCount: catalog.length,
      liveCount: liveMarkets.length,
      popularMarkets,
      peakVolume,
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

function TerminalMarketCard({ market, liveGames, peakVolume }) {
  const router = useRouter();
  const { actions } = useAgora();
  const linkedGame = getLinkedLiveGame(market, liveGames);
  const { yesLabel, noLabel } = useMemo(
    () => getContractSideLabels(market, linkedGame, { shortSides: true }),
    [market, linkedGame],
  );

  const yes = Number(market.yesPrice) || 0;
  const no = Number(market.noPrice) || 0;
  const leadingIsYes = yes >= no;
  const leadPct = leadingIsYes ? yes : no;
  const leadLabel = leadingIsYes ? yesLabel : noLabel;
  const trailLabel = leadingIsYes ? noLabel : yesLabel;
  const trailPct = leadingIsYes ? no : yes;

  // Real in-session probability shift (signed, in points).
  const previous = probabilityMemory.get(market.id);
  const shift = previous == null ? 0 : Math.round((yes - previous) * 100);
  useEffect(() => {
    probabilityMemory.set(market.id, yes);
  }, [market.id, yes]);

  const isLive = linkedGame?.status === "live";
  const volPct = peakVolume > 0 ? Math.max(4, (Number(market.volume || 0) / peakVolume) * 100) : 0;
  const shiftDir = shift > 0 ? "up" : shift < 0 ? "down" : "flat";

  function prepare(side) {
    actions.prepareBet(market.id, side);
    router.push(`/markets/${market.id}`);
  }

  return (
    <article
      className={`mt-card${isLive ? " is-live" : ""}`}
      data-lead={leadingIsYes ? "yes" : "no"}
      style={{ "--vol": `${volPct}%`, "--yes": `${pct(yes)}%` }}
    >
      <Link
        href={`/markets/${market.id}`}
        className="mt-card-link"
        aria-label={`View market: ${market.title}`}
        prefetch
      />

      <div className="mt-card-top">
        <span className="mt-card-cat">{market.category}</span>
        <span className="mt-card-flags">
          <span className={`mt-shift mt-shift--${shiftDir}`} title="Move since last tick">
            {shiftDir === "up" ? "▲" : shiftDir === "down" ? "▼" : "—"}
            {shift !== 0 ? ` ${Math.abs(shift)}` : " 0.0"}
          </span>
          {isLive ? (
            <span className="mt-flag mt-flag-live">
              <span className="mt-flag-dot" aria-hidden="true" />
              LIVE
            </span>
          ) : null}
          {market.status && market.status !== "active" ? (
            <span className="mt-flag mt-flag-status">{market.status}</span>
          ) : null}
        </span>
      </div>

      <h3 className="mt-card-title" title={market.title}>
        {market.title}
      </h3>

      {linkedGame ? (
        <div className="mt-card-score" title={`${linkedGame.league} — ${getLiveGameClock(linkedGame)}`}>
          <span className="mt-card-clock">
            {isLive ? "● " : ""}
            {linkedGame.league} · {getLiveGameClock(linkedGame)}
          </span>
          <span className="mt-card-line">
            {linkedGame.awayTeam} {linkedGame.awayScore} — {linkedGame.homeTeam} {linkedGame.homeScore}
          </span>
        </div>
      ) : (
        <div className="mt-card-score mt-card-score--empty" aria-hidden="true" />
      )}

      {/* Both outcomes shown as buyable options — display-serif probabilities */}
      <div className="mt-options" role="group" aria-label="Outcomes">
        <button
          type="button"
          className={`mt-opt mt-opt-yes${leadingIsYes ? " is-lead" : ""}`}
          onClick={() => prepare("YES")}
          aria-label={`Buy ${yesLabel} at ${pct(yes)} percent`}
        >
          <span className="mt-opt-side" title={yesLabel}>{yesLabel}</span>
          <span className="mt-opt-figure">
            {pct(yes)}<i>%</i>
          </span>
          <span className="mt-opt-buy">BUY →</span>
        </button>
        <button
          type="button"
          className={`mt-opt mt-opt-no${!leadingIsYes ? " is-lead" : ""}`}
          onClick={() => prepare("NO")}
          aria-label={`Buy ${noLabel} at ${pct(no)} percent`}
        >
          <span className="mt-opt-side" title={noLabel}>{noLabel}</span>
          <span className="mt-opt-figure">
            {pct(no)}<i>%</i>
          </span>
          <span className="mt-opt-buy">BUY →</span>
        </button>
      </div>

      {/* Split bar visualizing YES vs NO conviction */}
      <div className="mt-bar" role="img" aria-label={`${leadLabel} ${pct(leadPct)} percent versus ${trailLabel} ${pct(trailPct)} percent`}>
        <span className="mt-bar-yes" />
        <span className="mt-bar-no" />
      </div>

      {/* Footer — monospace market data with a real relative-volume bar */}
      <div className="mt-card-foot">
        <div className="mt-foot-vol">
          <span className="mt-foot-label">VOL</span>
          <span className="mt-foot-track">
            <span className="mt-foot-fill" />
          </span>
          <span className="mt-foot-num">{money(market.volume)}</span>
        </div>
        <span className="mt-foot-boosts">{market.friendsBoosting || 0}× BOOST</span>
      </div>
    </article>
  );
}
