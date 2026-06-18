function hashString(input) {
  let h = 1779033703;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function windowBounds(linkedGame, nowMs) {
  const gameStart = linkedGame?.startTime ? Date.parse(linkedGame.startTime) : NaN;
  let startMs;
  if (linkedGame && Number.isFinite(gameStart)) {
    startMs = gameStart;
  } else {
    startMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  }
  if (startMs >= nowMs) {
    startMs = nowMs - 2 * 60 * 60 * 1000;
  }
  const duration = Math.max(nowMs - startMs, 60_000);
  const pointCount = clamp(Math.round(duration / (8 * 60 * 1000)), 16, 96);
  return { startMs, duration, pointCount };
}

/**
 * Dual outcome prices on one chart (both sides). Paths end at current YES and NO contract prices.
 */
export function buildMarketDualPriceSeries(market, linkedGame, nowMs = Date.now()) {
  const yesEnd = clamp(Number(market?.yesPrice) || 0.5, 0.02, 0.98);
  const noEnd = clamp(Number(market?.noPrice) || 0.5, 0.02, 0.98);

  const { startMs, duration, pointCount } = windowBounds(linkedGame, nowMs);
  const seed = hashString(`${market?.id ?? "m"}:${Math.floor(startMs / 3600000)}`);
  const rndYes = mulberry32(seed);
  const rndNo = mulberry32(seed ^ 0x9e3779b9);
  const jitterAmp = linkedGame?.status === "live" ? 0.07 : 0.045;

  let startYes = clamp(yesEnd + (rndYes() - 0.5) * 0.34, 0.03, 0.97);
  let startNo = clamp(noEnd + (rndNo() - 0.5) * 0.34, 0.03, 0.97);

  if (yesEnd > startYes && rndYes() > 0.55) {
    startYes = clamp(yesEnd - rndYes() * 0.12, 0.03, yesEnd - 0.02);
  } else if (yesEnd < startYes && rndYes() > 0.55) {
    startYes = clamp(yesEnd + rndYes() * 0.12, yesEnd + 0.02, 0.97);
  }
  if (noEnd > startNo && rndNo() > 0.55) {
    startNo = clamp(noEnd - rndNo() * 0.12, 0.03, noEnd - 0.02);
  } else if (noEnd < startNo && rndNo() > 0.55) {
    startNo = clamp(noEnd + rndNo() * 0.12, noEnd + 0.02, 0.97);
  }

  const points = [];
  let peakA = Math.max(startYes, yesEnd);
  let troughA = Math.min(startYes, yesEnd);
  let peakB = Math.max(startNo, noEnd);
  let troughB = Math.min(startNo, noEnd);

  for (let i = 0; i < pointCount; i++) {
    const u = pointCount === 1 ? 1 : i / (pointCount - 1);
    const t = Math.round(startMs + duration * u);

    let yVal =
      startYes + (yesEnd - startYes) * smoothstep(0, 1, u) +
      (rndYes() - 0.5) * jitterAmp * (1 - Math.abs(u - 0.55));
    let nVal =
      startNo + (noEnd - startNo) * smoothstep(0, 1, u) +
      (rndNo() - 0.5) * jitterAmp * (1 - Math.abs(u - 0.48));

    if (i === pointCount - 1) {
      yVal = yesEnd;
      nVal = noEnd;
    } else {
      yVal = clamp(yVal, 0.02, 0.98);
      nVal = clamp(nVal, 0.02, 0.98);
    }

    peakA = Math.max(peakA, yVal);
    troughA = Math.min(troughA, yVal);
    peakB = Math.max(peakB, nVal);
    troughB = Math.min(troughB, nVal);
    points.push({ time: t, a: yVal, b: nVal });
  }

  const windowLabel =
    linkedGame && Number.isFinite(Date.parse(linkedGame.startTime ?? ""))
      ? "Since game start"
      : "Last 7 days (estimated)";

  return {
    points,
    startMs,
    endMs: nowMs,
    changeA: yesEnd - (points[0]?.a ?? startYes),
    changeB: noEnd - (points[0]?.b ?? startNo),
    peakA,
    troughA,
    peakB,
    troughB,
    windowLabel,
  };
}

/** @deprecated Use buildMarketDualPriceSeries — kept for older imports */
export function buildMarketYesPriceSeries(market, linkedGame, nowMs = Date.now()) {
  const dual = buildMarketDualPriceSeries(market, linkedGame, nowMs);
  const points = dual.points.map((p) => ({ time: p.time, yes: p.a }));
  return {
    points,
    startMs: dual.startMs,
    endMs: dual.endMs,
    startPrice: points[0]?.yes,
    endPrice: market?.yesPrice,
    change: dual.changeA,
    peak: dual.peakA,
    trough: dual.troughA,
    windowLabel: dual.windowLabel,
  };
}
