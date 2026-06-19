/**
 * Contract button copy and chart legend labels for YES / NO outcomes.
 */

/** ESPN tennis rows use full athlete names; UI buttons use surname only. */
function isIndividualPlayerLiveGame(linkedGame) {
  return String(linkedGame?.id ?? "").startsWith("espn_tennis_");
}

const COMPACT_LABEL_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "by",
  "if",
  "in",
  "is",
  "no",
  "of",
  "or",
  "the",
  "to",
  "will",
]);

function lastNameFromDisplayName(displayName) {
  const s = String(displayName ?? "").trim();
  if (!s) return "";
  const parts = s.split(/\s+/);
  return parts[parts.length - 1] || s;
}

function normalizeCompactWord(word) {
  return String(word ?? "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

/** Shorten long custom YES/NO strings for compact contract chips. */
function compactExplicitLabel(label) {
  const t = String(label ?? "").trim();
  if (t.length <= 18) return t;
  const words = t.split(/\s+/).filter(Boolean);
  const compactWords = words.filter((word) => !COMPACT_LABEL_STOPWORDS.has(normalizeCompactWord(word)));
  const phrase = (compactWords.length >= 2 ? compactWords : words).slice(0, 3).join(" ");
  if (phrase.length <= 18) return phrase;
  return `${phrase.slice(0, 15).trimEnd()}...`;
}

function h2hSideDisplay(linkedGame, side, shortSides) {
  const full = linkedGame[`${side}Team`];
  const abbr = String(linkedGame[`${side}Abbr`] ?? "").trim();
  if (isIndividualPlayerLiveGame(linkedGame)) {
    if (shortSides && abbr) return abbr;
    return lastNameFromDisplayName(full);
  }
  if (shortSides && abbr) return abbr;
  return full;
}

/**
 * @param {object} [options]
 * @param {boolean} [options.shortSides] When true, prefer ESPN `awayAbbr`/`homeAbbr` (team sports),
 *        tennis abbreviation field, or compact custom labels for market cards and buttons.
 */
export function getContractSideLabels(market, linkedGame, options = {}) {
  const shortSides = options.shortSides === true;
  const yes = market?.yesLabel?.trim();
  const no = market?.noLabel?.trim();
  if (yes && no) {
    return {
      yesLabel: shortSides ? compactExplicitLabel(yes) : yes,
      noLabel: shortSides ? compactExplicitLabel(no) : no,
    };
  }
  if (market?.h2h && linkedGame?.awayTeam && linkedGame?.homeTeam) {
    const pick = market.yesPicks === "home" ? "home" : "away";
    const other = pick === "home" ? "away" : "home";
    return {
      yesLabel: h2hSideDisplay(linkedGame, pick, shortSides),
      noLabel: h2hSideDisplay(linkedGame, other, shortSides),
    };
  }
  // ESPN-generated markets store team names in metadata (YES = away wins)
  const awayTeam = market?.metadata?.awayTeam;
  const homeTeam = market?.metadata?.homeTeam;
  if (awayTeam && homeTeam) {
    const awayAbbr = market?.metadata?.awayAbbr;
    const homeAbbr = market?.metadata?.homeAbbr;
    const isTennis = String(market?.id ?? "").startsWith("espn_tennis_");
    if (isTennis) {
      return {
        yesLabel: shortSides ? lastNameFromDisplayName(awayTeam) : awayTeam,
        noLabel: shortSides ? lastNameFromDisplayName(homeTeam) : homeTeam,
      };
    }
    return {
      yesLabel: shortSides && awayAbbr ? awayAbbr : awayTeam,
      noLabel: shortSides && homeAbbr ? homeAbbr : homeTeam,
    };
  }
  return { yesLabel: "Yes", noLabel: "No" };
}
