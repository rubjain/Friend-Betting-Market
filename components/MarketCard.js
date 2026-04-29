"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFriendMarket } from "../context/FriendMarketContext";
import { money } from "../lib/formatters";
import { InfoRow } from "./ui";

export default function MarketCard({ market }) {
  const router = useRouter();
  const { actions } = useFriendMarket();

  function prepare(side) {
    actions.prepareBet(market.id, side);
    router.push(`/markets/${market.id}`);
  }

  return (
    <article className="market-card">
      <div className="market-top">
        <div>
          <div className="pill">{market.category}</div>
          <h4>{market.title}</h4>
        </div>
        <Link className="btn btn-ghost" href={`/markets/${market.id}`}>
          View
        </Link>
      </div>
      <p>{market.description}</p>
      <div className="info-list">
        <InfoRow label="Volume" value={money(market.volume)} mutedClass="market-meta" />
        <InfoRow label="End date" value={market.endDate} mutedClass="market-meta" />
        <InfoRow label="Bonus eligible" value={market.eligibleForBonus ? "Yes" : "No"} mutedClass="market-meta" />
      </div>
      <div className="market-actions">
        <button className="btn btn-success" type="button" onClick={() => prepare("YES")}>
          Bet Yes
        </button>
        <button className="btn btn-danger" type="button" onClick={() => prepare("NO")}>
          Bet No
        </button>
        <Link className="btn btn-secondary" href="/friends" onClick={() => actions.setSelectedMarket(market.id)}>
          Invite Friends
        </Link>
      </div>
    </article>
  );
}
