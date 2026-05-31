"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const RANGE_LABELS = ["LIVE", "1H", "ALL"];

function filterByRange(history, range) {
  if (!history.length) return history;
  if (range === "LIVE") return history.slice(-30);
  if (range === "1H") {
    const cutoff = Date.now() - 60 * 60 * 1000;
    const filtered = history.filter((h) => h.ts >= cutoff);
    return filtered.length > 0 ? filtered : history.slice(-60);
  }
  return history;
}

function formatTick(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function TennisWinProbChart({ history = [], p1Name = "Player 1", p2Name = "Player 2", volume }) {
  const [range, setRange] = useState("LIVE");

  const data = useMemo(() => {
    const filtered = filterByRange(history, range);
    return filtered.map((h) => ({
      ts: h.ts,
      p1: Math.round(h.p1 * 100),
      p2: Math.round(h.p2 * 100),
    }));
  }, [history, range]);

  const lastP1 = data.length ? data[data.length - 1].p1 : null;
  const lastP2 = data.length ? data[data.length - 1].p2 : null;

  const p1Short = p1Name.split(" ").pop();
  const p2Short = p2Name.split(" ").pop();

  return (
    <div className="tpc-root">
      <div className="tpc-header">
        <span className="tpc-title">Win probability</span>
        <div className="tpc-range-tabs">
          {RANGE_LABELS.map((r) => (
            <button
              key={r}
              type="button"
              className={`tpc-range-btn${range === r ? " tpc-range-btn--active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="tpc-chart-wrap">
        {data.length < 2 ? (
          <div className="tpc-empty">Probability history builds as the match progresses</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 8, right: 80, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="ts"
                tickFormatter={formatTick}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[25, 50, 75, 100]}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <ReferenceLine y={25} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <ReferenceLine y={50} stroke="rgba(255,255,255,0.10)" strokeDasharray="4 4" />
              <ReferenceLine y={75} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={formatTick}
                formatter={(val, name) => [`${val}%`, name === "p1" ? p1Short : p2Short]}
              />
              <Line
                type="monotone"
                dataKey="p1"
                stroke="#F55D00"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#F55D00" }}
                label={
                  data.length > 1
                    ? <EndLabel value={lastP1} color="#F55D00" name={p1Short} />
                    : false
                }
              />
              <Line
                type="monotone"
                dataKey="p2"
                stroke="#94a3b8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#94a3b8" }}
                label={
                  data.length > 1
                    ? <EndLabel value={lastP2} color="#94a3b8" name={p2Short} />
                    : false
                }
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {volume ? (
        <div className="tpc-footer">
          <span className="tpc-vol">{volume} vol</span>
        </div>
      ) : null}
    </div>
  );
}

function EndLabel({ viewBox, value, color, name }) {
  if (!viewBox || value == null) return null;
  const { x, y } = viewBox;
  return (
    <text x={x + 6} y={y + 4} fill={color} fontSize={11} fontWeight={600}>
      {name} {value}%
    </text>
  );
}
