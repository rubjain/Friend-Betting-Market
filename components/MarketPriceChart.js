"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildMarketDualPriceSeries } from "../lib/marketPriceSeries";
import { getContractSideLabels } from "../lib/marketLabels";
import { getDualOutcomeChartColors } from "../lib/marketChartColors";

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

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.getAttribute("data-theme") === "dark");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const labels = useMemo(() => getContractSideLabels(market, linkedGame), [market, linkedGame]);

  const lineColors = useMemo(
    () => getDualOutcomeChartColors(market, linkedGame, labels.yesLabel, labels.noLabel),
    [market, linkedGame, labels.yesLabel, labels.noLabel],
  );

  const series = useMemo(() => buildMarketDualPriceSeries(market, linkedGame, now), [market, linkedGame, now]);

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
      <div className="market-price-chart-frame">
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
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 5, fill: lineColors.colorA, stroke: lineColors.colorA }}
            />
            <Line
              type="monotone"
              dataKey="b"
              name="b"
              stroke={lineColors.colorB}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 5, fill: lineColors.colorB, stroke: lineColors.colorB }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="market-price-chart-footnote">
        Both outcome prices on one axis (same contract). Illustrative paths ending at current YES and NO; wire trade tape for
        production accuracy.
      </p>
    </div>
  );
}
