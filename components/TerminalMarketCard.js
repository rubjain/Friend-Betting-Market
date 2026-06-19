"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAgora } from "../context/AgoraContext";
import { money } from "../lib/formatters";
import { getLinkedLiveGame, getLiveGameClock } from "../lib/marketAlgorithms";
import { getContractSideLabels } from "../lib/marketLabels";

// In-session memory of last-seen YES probability per market. Lets us surface a
// real probability shift observed since the previous live poll.
const probabilityMemory = new Map();

function pct(value) {
  return `${Math.round((Number(value) || 0) * 100)}`;
}

export default function TerminalMarketCard({ market, liveGames, peakVolume = 0 }) {
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
            {shiftDir === "up" ? "\u25B2" : shiftDir === "down" ? "\u25BC" : "\u2014"}
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
        <div className="mt-card-score" title={`${linkedGame.league} - ${getLiveGameClock(linkedGame)}`}>
          <span className="mt-card-clock">
            {isLive ? "\u25CF " : ""}
            {linkedGame.league} {"\u00B7"} {getLiveGameClock(linkedGame)}
          </span>
          <span className="mt-card-line">
            {linkedGame.awayTeam} {linkedGame.awayScore} {"\u2014"} {linkedGame.homeTeam} {linkedGame.homeScore}
          </span>
        </div>
      ) : (
        <div className="mt-card-score mt-card-score--empty" aria-hidden="true" />
      )}

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
          <span className="mt-opt-buy">BUY &rarr;</span>
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
          <span className="mt-opt-buy">BUY &rarr;</span>
        </button>
      </div>

      <div className="mt-bar" role="img" aria-label={`${leadLabel} ${pct(leadPct)} percent versus ${trailLabel} ${pct(trailPct)} percent`}>
        <span className="mt-bar-yes" />
        <span className="mt-bar-no" />
      </div>

      <div className="mt-card-foot">
        <div className="mt-foot-vol">
          <span className="mt-foot-label">VOL</span>
          <span className="mt-foot-track">
            <span className="mt-foot-fill" />
          </span>
          <span className="mt-foot-num">{money(market.volume)}</span>
        </div>
        <span className="mt-foot-boosts">{market.friendsBoosting || 0}{"\u00D7"} BOOST</span>
      </div>
    </article>
  );
}
