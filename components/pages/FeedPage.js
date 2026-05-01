"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { SectionHead } from "../ui";

const POLL_INTERVAL = 30_000;

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function FeedItem({ item }) {
  return (
    <Link className="feed-item" href={`/markets/${item.marketId}`}>
      <div className="feed-item-avatar" aria-hidden="true">
        {getInitials(item.friendName)}
      </div>
      <div className="feed-item-body">
        <p className="feed-item-text">
          <strong>{item.friendName}</strong>
          {" bet "}
          <span className={`feed-item-side feed-item-side--${item.side.toLowerCase()}`}>
            {item.side}
          </span>
          {" on "}
          <span className="feed-item-market">{item.marketTitle}</span>
        </p>
        <span className="feed-item-time caption">{timeAgo(item.placedAt)}</span>
      </div>
    </Link>
  );
}

export default function FeedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/feed/friends");
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to load feed.");
      setItems(json.items);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    intervalRef.current = setInterval(fetchFeed, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchFeed]);

  return (
    <section className="page active">
      <SectionHead
        title="Friend Activity"
        body="What your friends have been betting on in the last 24 hours."
      />

      {error && (
        <div className="note-banner" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <div className="feed-card">
        {loading ? (
          <div className="feed-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="feed-skeleton">
                <div className="skeleton-avatar" />
                <div className="skeleton-lines">
                  <div className="skeleton-line skeleton-line--long" />
                  <div className="skeleton-line skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="feed-empty">
            <strong>No activity yet.</strong>
            <p>When your friends place bets, they'll show up here. Add more friends to see their activity.</p>
            <Link className="btn btn-primary" href="/friends" style={{ marginTop: "12px", display: "inline-block" }}>
              Add Friends
            </Link>
          </div>
        ) : (
          <div className="feed-list">
            {items.map((item) => (
              <FeedItem key={item.id} item={item} />
            ))}
          </div>
        )}

        {lastUpdated && !loading && (
          <div className="feed-footer caption">
            Updates every 30 seconds - Last refreshed {timeAgo(lastUpdated.toISOString())}
          </div>
        )}
      </div>
    </section>
  );
}
