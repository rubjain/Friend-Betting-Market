"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useAgora } from "../context/AgoraContext";
import { money } from "../lib/formatters";

const PERIODS = ["1D", "1W", "1M", "All"];
const ACCENT = "#F55D00";
const DANGER = "#ef4444";
const POSITIVE = "#22c55e";

export default function PortfolioChart() {
  const { selectors } = useAgora();
  const [period, setPeriod] = useState("All");
  const [includeBoosts, setIncludeBoosts] = useState(true);

  const allEntries = selectors.getLedgerEntries("all");

  const chartData = useMemo(() => {
    let entries = includeBoosts
      ? allEntries
      : allEntries.filter(
          (e) => e.source !== "social_boost" && e.currency_type !== "bonus",
        );

    entries = [...entries].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );

    let running = 0;
    let points = entries.map((entry) => {
      running +=
        entry.transaction_type === "credit" ? entry.amount : -entry.amount;
      return { time: entry.timestamp, balance: Math.round(running * 100) / 100 };
    });

    if (period !== "All") {
      const cutoff = new Date();
      if (period === "1D") cutoff.setDate(cutoff.getDate() - 1);
      if (period === "1W") cutoff.setDate(cutoff.getDate() - 7);
      if (period === "1M") cutoff.setMonth(cutoff.getMonth() - 1);
      const filtered = points.filter((p) => new Date(p.time) >= cutoff);
      if (filtered.length > 0) points = filtered;
    }

    return points;
  }, [allEntries, period, includeBoosts]);

  const startBalance = chartData[0]?.balance ?? 0;
  const endBalance = chartData[chartData.length - 1]?.balance ?? 0;
  const dollarChange = endBalance - startBalance;
  const pctChange =
    startBalance !== 0 ? (dollarChange / Math.abs(startBalance)) * 100 : 0;
  const isPositive = dollarChange >= 0;
  const lineColor = isPositive ? ACCENT : DANGER;
  const changeColor = isPositive ? POSITIVE : DANGER;
  const hasData = chartData.length > 1;

  function formatLabel(timestamp) {
    const d = new Date(timestamp);
    if (period === "1D")
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const xTicks =
    hasData
      ? [chartData[0].time, chartData[chartData.length - 1].time]
      : [];

  return (
    <div className="portfolio-chart-card">
      <div className="chart-header">
        <div className="chart-header-left">
          <span className="label">Portfolio performance</span>
          {hasData && (
            <span className="chart-change" style={{ color: changeColor }}>
              {dollarChange >= 0 ? "+" : ""}
              {money(dollarChange)}&nbsp;&nbsp;
              {pctChange >= 0 ? "+" : ""}
              {pctChange.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <div className="chart-controls">
        <div className="chart-period-pills" role="group" aria-label="Time period">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={`chart-period-pill${period === p ? " active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="chart-boost-pills" role="group" aria-label="Boost filter">
          <button
            type="button"
            className={`chart-boost-pill${includeBoosts ? " active" : ""}`}
            onClick={() => setIncludeBoosts(true)}
          >
            With Boosts
          </button>
          <button
            type="button"
            className={`chart-boost-pill${!includeBoosts ? " active" : ""}`}
            onClick={() => setIncludeBoosts(false)}
          >
            Without Boosts
          </button>
        </div>
      </div>

      <div className="chart-area">
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 4, left: 4, bottom: 0 }}
            >
              <XAxis
                dataKey="time"
                ticks={xTicks}
                tickFormatter={formatLabel}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <ReferenceLine y={0} stroke="#333" strokeWidth={1} />
              <Tooltip content={<ChartTooltip formatLabel={formatLabel} />} />
              <Line
                type="monotone"
                dataKey="balance"
                stroke={lineColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: lineColor, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            Place a bet to start tracking your portfolio performance.
          </div>
        )}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, formatLabel }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{formatLabel(label)}</div>
      <div className="chart-tooltip-value">{money(payload[0].value)}</div>
    </div>
  );
}
