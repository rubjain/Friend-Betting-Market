/**
 * Colors for dual-outcome price charts: prefer real team colors when linked to a live game,
 * otherwise stable accents from outcome labels (countries, players, phrases).
 */

/** @type {Record<string, string>} Lowercase keys → brand-ish accent hex */
const ENTITY_ACCENTS = {
  usa: "#3C3B6E",
  "united states": "#3C3B6E",
  uswnt: "#3C3B6E",
  canada: "#D80621",
  mexico: "#006847",
  brazil: "#009B3A",
  argentina: "#75AADB",
  france: "#0055A4",
  germany: "#000000",
  spain: "#C60B1E",
  italy: "#008C45",
  england: "#CE1124",
  "united kingdom": "#012169",
  uk: "#012169",
  portugal: "#FF0000",
  netherlands: "#FF6B00",
  belgium: "#000000",
  croatia: "#FF0000",
  japan: "#BC002A",
  "south korea": "#0047A0",
  korea: "#0047A0",
  australia: "#FCD116",
  china: "#DE2910",
  india: "#FF671F",
  sweden: "#006AA7",
  norway: "#BA0C2F",
  denmark: "#C60C30",
  switzerland: "#FF0000",
  poland: "#DC143C",
  ukraine: "#0057B7",
  serbia: "#0C4076",
  greece: "#0D5EAF",
  turkey: "#E30A17",
  egypt: "#000000",
  nigeria: "#008751",
  "south africa": "#007A4D",
  morocco: "#C1272D",
  "saudi arabia": "#006C35",
  israel: "#0038B8",
  "new zealand": "#000000",
  ireland: "#169B62",
  scotland: "#0065BF",
  wales: "#C8102E",
  alcaraz: "#C60B1E",
  sinner: "#008C45",
  fritz: "#3C3B6E",
  "coco gauff": "#3C3B6E",
  gauff: "#3C3B6E",
};

function normalizeHex(raw) {
  if (raw == null || raw === "") {
    return null;
  }
  const s = String(raw).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
    return s.toUpperCase();
  }
  if (/^[0-9A-Fa-f]{6}$/.test(s)) {
    return `#${s.toUpperCase()}`;
  }
  return null;
}

function hexToRgb(hex) {
  const n = normalizeHex(hex);
  if (!n) {
    return null;
  }
  const v = parseInt(n.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function rgbDistance(a, b) {
  if (!a || !b) {
    return 999;
  }
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function hueFromHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return 0;
  }
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 1e-6) {
    return 0;
  }
  let h = 0;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }
  return (h * 360) % 360;
}

function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.min(100, Math.max(0, s)) / 100;
  const ll = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) {
    [rp, gp, bp] = [c, x, 0];
  } else if (hh < 120) {
    [rp, gp, bp] = [x, c, 0];
  } else if (hh < 180) {
    [rp, gp, bp] = [0, c, x];
  } else if (hh < 240) {
    [rp, gp, bp] = [0, x, c];
  } else if (hh < 300) {
    [rp, gp, bp] = [x, 0, c];
  } else {
    [rp, gp, bp] = [c, 0, x];
  }
  const r = Math.round((rp + m) * 255);
  const g = Math.round((gp + m) * 255);
  const b = Math.round((bp + m) * 255);
  const hr = r.toString(16).padStart(2, "0");
  const hg = g.toString(16).padStart(2, "0");
  const hb = b.toString(16).padStart(2, "0");
  return `#${hr}${hg}${hb}`.toUpperCase();
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Stable saturated color from arbitrary label (player name, prop phrase, etc.).
 */
export function accentColorFromLabel(label, salt = "") {
  const key = `${String(label || "").trim().toLowerCase()}${salt}`;
  if (!key.trim()) {
    return hslToHex(142, 65, 42);
  }
  const h = hashString(key) % 360;
  const s = 68 + (hashString(`${key}|s`) % 12);
  const l = 44 + (hashString(`${key}|l`) % 10);
  return hslToHex(h, s, l);
}

function tokenizeLabel(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function entityAccentFromLabel(label) {
  const tokens = tokenizeLabel(label);
  for (const t of tokens) {
    if (ENTITY_ACCENTS[t]) {
      return ENTITY_ACCENTS[t];
    }
  }
  const flat = tokens.join(" ");
  for (const [key, hex] of Object.entries(ENTITY_ACCENTS)) {
    if (flat.includes(key)) {
      return hex;
    }
  }
  return null;
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function scoreTeamLabelMatch(label, teamLong, abbr) {
  const l = String(label || "")
    .trim()
    .toLowerCase();
  const ln = norm(label);
  if (!ln) {
    return 0;
  }
  const t = String(teamLong || "")
    .trim()
    .toLowerCase();
  const a = String(abbr || "")
    .trim()
    .toLowerCase();
  let s = 0;
  if (a && (l === a || ln === norm(a))) {
    s += 130;
  }
  if (t && l === t) {
    s += 110;
  }
  if (t && (t.includes(l) || l.includes(t))) {
    s += 70;
  }
  const words = t.split(/\s+/).filter((w) => w.length >= 3);
  for (const w of words) {
    if (l.includes(w) || ln.includes(norm(w))) {
      s += 45;
    }
  }
  const lastWord = words[words.length - 1];
  if (lastWord && lastWord.length >= 4 && (l.includes(lastWord) || ln.includes(norm(lastWord)))) {
    s += 35;
  }
  return s;
}

/**
 * Match outcome label to home/away row using names, abbreviations, or substring overlap.
 */
export function teamColorForOutcomeLabel(label, linkedGame) {
  if (!linkedGame || !label) {
    return null;
  }
  const homeColor = normalizeHex(linkedGame.homeTeamColor);
  const awayColor = normalizeHex(linkedGame.awayTeamColor);
  const sh = scoreTeamLabelMatch(label, linkedGame.homeTeam, linkedGame.homeAbbr);
  const sa = scoreTeamLabelMatch(label, linkedGame.awayTeam, linkedGame.awayAbbr);
  if (sh > sa && homeColor) {
    return homeColor;
  }
  if (sa > sh && awayColor) {
    return awayColor;
  }
  if (sh && !sa && homeColor) {
    return homeColor;
  }
  if (sa && !sh && awayColor) {
    return awayColor;
  }
  return null;
}

function separateSimilar(a, b, labelB) {
  const minDist = 72;
  let outB = b;
  let rgbA = hexToRgb(a);
  let rgbB = hexToRgb(outB);
  if (rgbA && rgbB && rgbDistance(rgbA, rgbB) >= minDist && a !== outB) {
    return outB;
  }
  const baseHue = hueFromHex(a);
  for (let i = 1; i <= 8; i++) {
    const tryHue = (baseHue + i * 47) % 360;
    outB = hslToHex(tryHue, 70, 46);
    rgbB = hexToRgb(outB);
    if (rgbA && rgbB && rgbDistance(rgbA, rgbB) >= minDist && normalizeHex(a) !== normalizeHex(outB)) {
      return outB;
    }
  }
  return accentColorFromLabel(labelB, "|distinct");
}

/**
 * Stroke colors for YES (series `a`) and NO (`b`) lines on the market detail chart.
 */
export function getDualOutcomeChartColors(market, linkedGame, yesLabel, noLabel) {
  const y = String(yesLabel || "Yes").trim();
  const n = String(noLabel || "No").trim();

  let colorA = null;
  let colorB = null;

  if (market?.h2h && linkedGame?.homeTeam && linkedGame?.awayTeam) {
    const pick = market.yesPicks === "home" ? "home" : "away";
    const other = pick === "home" ? "away" : "home";
    colorA = normalizeHex(linkedGame[`${pick}TeamColor`]);
    colorB = normalizeHex(linkedGame[`${other}TeamColor`]);
  }

  colorA = colorA || teamColorForOutcomeLabel(y, linkedGame) || entityAccentFromLabel(y) || accentColorFromLabel(y, "|a");
  colorB = colorB || teamColorForOutcomeLabel(n, linkedGame) || entityAccentFromLabel(n) || accentColorFromLabel(n, "|b");

  colorB = separateSimilar(colorA, colorB, n);

  return {
    colorA: normalizeHex(colorA) || "#15803D",
    colorB: normalizeHex(colorB) || "#B91C1C",
  };
}
