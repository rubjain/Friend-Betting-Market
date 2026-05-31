"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useAgora } from "../context/AgoraContext";

const STANDALONE_AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/account-recovery",
  "/verify-email",
]);

const IDLE_POLL_MS = 60_000;

/**
 * Polls `/api/live/games` every 5s while at least one game is live; otherwise on a slower cadence.
 */
export default function LiveGamesPoller() {
  const { hydrated, actions, state } = useAgora();
  const pathname = usePathname() || "";
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const hasLiveGame = useMemo(
    () => (state.liveGames || []).some((g) => g.status === "live"),
    [state.liveGames],
  );

  useEffect(() => {
    if (!hydrated || STANDALONE_AUTH_ROUTES.has(pathname)) {
      return undefined;
    }
    let canceled = false;
    async function pull() {
      try {
        const res = await fetch("/api/live/games", { cache: "no-store" });
        if (!res.ok || canceled) {
          return;
        }
        const data = await res.json();
        if (data?.games) {
          actionsRef.current.setLiveGames(data.games);
        }
      } catch {
        /* ignore offline */
      }
    }
    void pull();
    const intervalMs = hasLiveGame ? 5_000 : IDLE_POLL_MS;
    const id = window.setInterval(pull, intervalMs);
    return () => {
      canceled = true;
      window.clearInterval(id);
    };
  }, [hydrated, pathname, hasLiveGame]);

  return null;
}
