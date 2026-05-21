"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildMarketDualPriceSeries } from "../lib/marketPriceSeries";
import { getContractSideLabels } from "../lib/marketLabels";
import { getDualOutcomeChartColors } from "../lib/marketChartColors";

const WINDOWS = [
  { key: "1d", label: "1D" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "all", label: "All" },
];

function formatAxisTime(ms, compact) {
  return new Intl.DateTimeFormat(undefined, {
    month: compact ? "numeric" : "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

function ChartTooltip({ active, payload, labelA, labelB, colorA, colorB }) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload;
  if (!row) {
    return null;
  }
  const a = payload.find((p) => p.dataKey === "a");
  const b = payload.find((p) => p.dataKey === "b");
  return (
    <div className="market-chart-tooltip">
      <div className="market-chart-tooltip-time">{formatAxisTime(row.time, false)}</div>
      <div className="market-chart-tooltip-row">
        <span className="market-chart-tooltip-dot" style={{ background: colorA }} />
        {labelA} <strong>{Math.round((a?.value ?? row.a) * 100)}¢</strong>
      </div>
      <div className="market-chart-tooltip-row">
        <span className="market-chart-tooltip-dot" style={{ background: colorB }} />
        {labelB} <strong>{Math.round((b?.value ?? row.b) * 100)}¢</strong>
      </div>
    </div>
  );
}

export default function MarketPriceChart({ market, linkedGame }) {
  const [now, setNow] = useState(() => Date.now());
  const [dark, setDark] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState("7d");
  const [realSnapshots, setRealSnapshots] = useState(null); // null = loading, [] = none

  const labels = useMemo(() => getContractSideLabels(market, linkedGame), [market, linkedGame]);
  const lineColors = useMemo(
    () => getDualOutcomeChartColors(market, linkedGame, labels.yesLabel, labels.noLabel),
    [market, linkedGame, labels.yesLabel, labels.noLabel],
  );

  // Tick every 30s so the "now" anchor stays fresh
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Track theme
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.getAttribute("data-theme") === "dark");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Fetch real price history from the API
  const fetchHistory = useCallback(async (win) => {
    if (!market?.id) return;
    setRealSnapshots(null);
    try {
      const res = await fetch(`/api/markets/${market.id}/price-history?window=${win}`);
      if (res.ok) {
        const data = await res.json();
        setRealSnapshots(data.snapshots || []);
      } else {
        setRealSnapshots([]);
      }
    } catch {
      setRealSnapshots([]);
    }
  }, [market?.id]);

  useEffect(() => {
    fetchHistory(selectedWindow);
  }, [fetchHistory, selectedWindow]);

  // Build chart series from real snapshots when available (≥ 2 points),
  // otherwise fall back to the simulated path.
  const series = useMemo(() => {
    if (realSnapshots && realSnapshots.length >= 2) {
      // Ensure the final point always reflects the current live price
      const last = realSnapshots[realSnapshots.length - 1];
      const currentYes = Number(market.yesPrice) || last.y;
      const currentNo = Number(market.noPrice) || last.n;

      const points = [
        ...realSnapshots.map((s) => ({ time: s.t, a: s.y, b: s.n })),
      ];
      // If the last snapshot price differs from current price, append a "now" point
      if (Math.abs(last.y - currentYes) > 0.0001 || Math.abs(last.n - currentNo) > 0.0001) {
        points.push({ time: now, a: currentYes, b: currentNo });
      }

      const firstA = points[0]?.a ?? 0.5;
      const firstB = points[0]?.b ?? 0.5;
      const startMs = points[0]?.time ?? now;
      const windowLabels = { "1d": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" };

      return {
        points,
        startMs,
        endMs: now,
        changeA: currentYes - firstA,
        changeB: currentNo - firstB,
        peakA: Math.max(...points.map((p) => p.a)),
        troughA: Math.min(...points.map((p) => p.a)),
        peakB: Math.max(...points.map((p) => p.b)),
        troughB: Math.min(...points.map((p) => p.b)),
        windowLabel: windowLabels[selectedWindow] ?? "Price history",
        isReal: true,
      };
    }
    // Fall back to simulated series
    const fallback = buildMarketDualPriceSeries(market, linkedGame, now);
    return { ...fallback, isReal: false };
  }, [realSnapshots, market, linkedGame, now, selectedWindow]);

  const gridStroke = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
  const axisStroke = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";

  const deltaA =
    series.changeA === 0 ? "flat" : `${series.changeA > 0 ? "+" : ""}${Math.round(series.changeA * 100)}¢`;
  const deltaB =
    series.changeB === 0 ? "flat" : `${series.changeB > 0 ? "+" : ""}${Math.round(series.changeB * 100)}¢`;

  return (
    <div className="market-price-chart">
      <div className="market-price-chart-head">
        <div>
          <h3 className="market-price-chart-title">Both sides</h3>
          <p className="market-price-chart-caption">{series.windowLabel}</p>
        </div>
        <div className="market-price-chart-stats market-price-chart-stats--dual">
          <div>
            <span className="market-price-chart-legend-line" style={{ color: lineColors.colorA }}>
              {labels.yesLabel}
            </span>
            <span className={`market-price-chart-delta ${series.changeA >= 0 ? "up" : "down"}`}>{deltaA}</span>
          </div>
          <div>
            <span className="market-price-chart-legend-line" style={{ color: lineColors.colorB }}>
              {labels.noLabel}
            </span>
            <span className={`market-price-chart-delta ${series.changeB >= 0 ? "up" : "down"}`}>{deltaB}</span>
          </div>
        </div>
      </div>
      {/* Window selector */}
      <div className="market-chart-window-row" role="group" aria-label="Chart time window">
        {WINDOWS.map((w) => (
          <button
            key={w.key}
            type="button"
            className={`market-chart-window-btn${selectedWindow === w.key ? " active" : ""}`}
            onClick={() => setSelectedWindow(w.key)}
          >
            {w.label}
          </button>
        ))}
      </div>
      <div className="market-price-chart-frame">
        {realSnapshots === null ? (
          <div className="market-chart-loading" aria-label="Loading chart">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series.points} margin={{ top: 12, right: 12, left: -6, bottom: 4 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => formatAxisTime(v, true)}
                stroke={axisStroke}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={{ stroke: axisStroke }}
              />
              <YAxis
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tickFormatter={(v) => `${Math.round(v * 100)}¢`}
                stroke={axisStroke}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={{ stroke: axisStroke }}
                width={44}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    labelA={labels.yesLabel}
                    labelB={labels.noLabel}
                    colorA={lineColors.colorA}
                    colorB={lineColors.colorB}
                  />
                }
                cursor={{ stroke: "rgba(128,128,128,0.35)" }}
              />
              <Line
                type="monotone"
                dataKey="a"
                name="a"
                stroke={lineColors.colorA}
                strokeWidth={2}
                dot={series.isReal && series.points.length <= 30}
                isAnimationActive={false}
                activeDot={{ r: 5, fill: lineColors.colorA, stroke: lineColors.colorA }}
              />
              <Line
                type="monotone"
                dataKey="b"
                name="b"
                stroke={lineColors.colorB}
                strokeWidth={2}
                dot={series.isReal && series.points.length <= 30}
                isAnimationActive={false}
                activeDot={{ r: 5, fill: lineColors.colorB, stroke: lineColors.colorB }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {!series.isReal && (
        <p className="market-price-chart-footnote">
          No trades yet — showing an illustrative path. Prices will update as bets are placed.
        </p>
      )}
    </div>
  );
}
