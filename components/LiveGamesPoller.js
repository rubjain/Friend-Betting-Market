"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useFriendMarket } from "../context/FriendMarketContext";

const STANDALONE_AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/account-recovery",
  "/verify-email",
]);

/**
 * Polls `/api/live/games` (ESPN-backed when available) about every 5s to refresh the live scoreboard.
 */
export default function LiveGamesPoller() {
  const { hydrated, actions } = useFriendMarket();
  const pathname = usePathname() || "";
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

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
    const id = window.setInterval(pull, 5_000);
    return () => {
      canceled = true;
      window.clearInterval(id);
    };
  }, [hydrated, pathname]);

  return null;
}
