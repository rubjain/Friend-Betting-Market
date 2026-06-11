"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { money } from "../../lib/formatters";
import { SectionHead } from "../ui";

function formatPrice(cents) {
  return cents > 0 ? `${money(cents / 100)}/mo` : "Free paper beta";
}

export default function StrategiesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("subscribers");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const res = await fetch("/api/strategies");
      const payload = await res.json().catch(() => ({}));
      if (active) {
        setProfiles(payload.ok ? payload.profiles || [] : []);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const riskLevels = useMemo(
    () => Array.from(new Set(profiles.map((profile) => profile.riskLevel).filter(Boolean))),
    [profiles],
  );
  const filteredProfiles = useMemo(() => {
    const filtered = riskFilter === "all"
      ? profiles
      : profiles.filter((profile) => profile.riskLevel === riskFilter);
    return [...filtered].sort((a, b) => {
      if (sortBy === "roi") return (b.roiPct ?? 0) - (a.roiPct ?? 0);
      if (sortBy === "volume") return (b.copiedVolume ?? 0) - (a.copiedVolume ?? 0);
      return (b.subscriberCount ?? 0) - (a.subscriberCount ?? 0);
    });
  }, [profiles, riskFilter, sortBy]);

  return (
    <section className="page active strategy-marketplace-page">
      <SectionHead
        title="Strategy Marketplace"
        body="Follow paper trading strategies without seeing or owning the private bot logic."
      />
      <div className="strategy-marketplace-toolbar">
        <div className="portfolio-tabs strategy-filter-tabs">
          <button className={`portfolio-tab${riskFilter === "all" ? " active" : ""}`} type="button" onClick={() => setRiskFilter("all")}>
            All
          </button>
          {riskLevels.map((risk) => (
            <button className={`portfolio-tab${riskFilter === risk ? " active" : ""}`} type="button" key={risk} onClick={() => setRiskFilter(risk)}>
              {risk}
            </button>
          ))}
        </div>
        <div className="strategy-toolbar-actions">
          <select className="strategy-sort-select" value={sortBy} onChange={(e) => setSortBy(e.currentTarget.value)} aria-label="Sort strategies">
            <option value="subscribers">Most followers</option>
            <option value="roi">Highest ROI</option>
            <option value="volume">Most copied volume</option>
          </select>
          <Link className="btn btn-ghost" href="/strategies/subscriptions">My subscriptions</Link>
          <Link className="btn btn-secondary" href="/strategies/creator">Creator dashboard</Link>
        </div>
      </div>

      {loading ? (
        <div className="list-card">Loading strategies...</div>
      ) : filteredProfiles.length ? (
        <div className="strategy-card-grid">
          {filteredProfiles.map((profile) => (
            <StrategyCard profile={profile} key={profile.id} />
          ))}
        </div>
      ) : (
        <div className="list-card empty-note">
          No published paper strategies yet. <Link href="/developer">Create a bot</Link> or <Link href="/strategies/creator">publish one</Link>.
        </div>
      )}
    </section>
  );
}

function StrategyCard({ profile }) {
  return (
    <Link className="strategy-card" href={`/strategies/${profile.id}`}>
      <div className="strategy-card-head">
        <span className="paper-mode-pill">PAPER</span>
        <span className="strategy-price">{formatPrice(profile.priceCents)}</span>
      </div>
      <h3>{profile.name}</h3>
      <p>{profile.description}</p>
      <div className="strategy-stat-grid">
        <Stat label="ROI" value={`${profile.roiPct ?? 0}%`} />
        <Stat label="Win rate" value={`${profile.winRatePct ?? 0}%`} />
        <Stat label="Drawdown" value={`${profile.maxDrawdownPct ?? 0}%`} />
        <Stat label="Followers" value={profile.subscriberCount ?? 0} />
      </div>
      <div className="strategy-card-foot">
        <span>{profile.creator?.username || profile.creator?.name || "Creator"}</span>
        <span>{profile.riskLevel} risk</span>
      </div>
    </Link>
  );
}

function Stat({ label, value }) {
  return (
    <div className="strategy-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
