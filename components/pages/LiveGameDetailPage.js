"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MarketGamePanel from "../MarketGamePanel";
import BettingPanel from "../BettingPanel";
import { useAgora } from "../../context/AgoraContext";
import { EmptyState } from "../ui";

export default function LiveGameDetailPage({ gameId: gameIdProp }) {
  const { state, selectors } = useAgora();
  const decodedId = decodeURIComponent(gameIdProp || "");

  const fromContext = useMemo(
    () => state.liveGames.find((g) => g.id === decodedId) ?? null,
    [state.liveGames, decodedId],
  );

  const [fetchedGame, setFetchedGame] = useState(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    if (fromContext) {
      setFetchedGame(null);
      setFetchAttempted(false);
      return undefined;
    }
    let canceled = false;
    (async () => {
      try {
        const res = await fetch("/api/live/games", { cache: "no-store" });
        if (!res.ok || canceled) {
          return;
        }
        const data = await res.json();
        const g = data.games?.find((x) => x.id === decodedId) ?? null;
        if (!canceled) {
          setFetchedGame(g);
          setFetchAttempted(true);
        }
      } catch {
        if (!canceled) {
          setFetchedGame(null);
          setFetchAttempted(true);
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, [decodedId, fromContext]);

  const game = fromContext ?? fetchedGame;

  const linkedMarket = useMemo(() => {
    if (!game) {
      return null;
    }
    return selectors.getMergedMarkets().find((m) => m.liveGameId === game.id || m.id === game.id) ?? null;
  }, [game, selectors]);

  if (!game && fetchAttempted) {
    return (
      <section className="page active">
        <EmptyState title="Game not found" body="It may have dropped off the board or the link is outdated." />
        <Link className="btn btn-secondary btn-sm" href="/markets" style={{ marginTop: 16 }}>
          Back to markets
        </Link>
      </section>
    );
  }

  if (!game) {
    return (
      <section className="page active">
        <p className="caption">Loading game…</p>
      </section>
    );
  }

  return (
    <section className="page active market-detail">
      <div className="market-detail-topbar">
        <div className="market-detail-badges">
          <span className="market-detail-category">{game.league}</span>
          {game.status === "live" ? (
            <span className="market-detail-live-badge" role="status">
              Live
            </span>
          ) : null}
        </div>
        <Link className="btn btn-secondary btn-sm" href="/markets">
          Back to markets
        </Link>
      </div>

      <MarketGamePanel
        game={game}
        bettingPanel={
          linkedMarket ? (
            <div className="live-game-betting-slot">
              <p className="live-game-betting-market-link caption">
                <Link href={`/markets/${linkedMarket.id}`}>View full market page →</Link>
              </p>
              <BettingPanel market={linkedMarket} linkedGame={game} />
            </div>
          ) : null
        }
      />
    </section>
  );
}
