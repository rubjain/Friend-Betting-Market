import { getResolutionTemplate } from "./marketTaxonomy.js";
import { MARKET_SIDE_LABELS } from "./marketSideLabelsSeed.js";

export const STORAGE_KEY = "friendmarket-mvp-state";

function withResolutionDefaults(market, overrides = {}) {
  const template = getResolutionTemplate(market.category);
  const presetLabels = MARKET_SIDE_LABELS[market.id] ?? {};
  return {
    status: "active",
    closeTime: `${market.endDate}T23:59:00Z`,
    settlementTime: null,
    resolutionTemplate: template.template,
    resolutionChecklist: template.checklist,
    evidenceLinks: [
      {
        label: template.evidenceSource,
        url: "",
        sourceType: "planned",
      },
    ],
    ...presetLabels,
    ...market,
    ...overrides,
  };
}

export const defaultState = {
  flashMessage: "",
  mobileNavOpen: false,
  theme: "light",
  auth: {
    authenticated: false,
    devAdminShortcut: false,
  },
  friendInviteDraft: "",
  ledgerFilter: "all",
  filters: {
    query: "",
    category: "all",
  },
  currentUser: {
    id: "user_1",
    name: "Test User",
    username: "@test",
    email: "test@example.com",
    isAdmin: false,
    withdrawable_balance: 100,
    bonus_balance: 0,
    play_credit_balance: 100,
    settings: {
      bonusMarketEligibility: "eligible_only",
      betBonusUsage: "partial",
      emailVerificationStatus: "pending",
      phoneVerificationStatus: "placeholder",
      identityVerificationStatus: "placeholder",
      paymentVerificationStatus: "placeholder",
      deviceVerificationStatus: "placeholder",
      riskStatus: "clear",
    },
  },
  fundingDrafts: {
    depositAmount: 25,
    withdrawAmount: 20,
    referralCode: "ARUSH25",
  },
  referrals: {
    code: "ARUSH25",
    reward: 10,
    pendingInvites: 0,
    completedReferrals: 0,
    history: [],
  },
  adminConfig: {
    socialBoostsEnabled: true,
    maxGroupSize: 5,
    multiplierPerFriend: 0.05,
    maxMultiplier: 1.2,
    maxBonusPayoutPerUser: 250,
    maxBonusPayoutPerMarket: 800,
    dailyBonusPayoutLimit: 2500,
    bonusFundsEligibility: "eligible_only",
    bonusUsageMode: "partial",
    maxBonusStakePercent: 50,
    bonusLiability: 4820,
  },
  liveGames: [
    {
      id: "game_cavs_raptors",
      shortName: "Cavaliers",
      league: "NBA",
      status: "live",
      period: "Q3",
      clock: "7:12",
      homeTeam: "Raptors",
      homeAbbr: "TOR",
      awayTeam: "Cavaliers",
      awayAbbr: "CLE",
      homeScore: 88,
      awayScore: 91,
      venue: "Scotiabank Arena · Toronto",
      startTime: "2026-05-03T23:00:00Z",
      feedStatus: "Demo NBA scoreboard (wire ESPN/NBA.com-style layout in production)",
      broadcast: "National TV · simulated tick every ~15s via /api/live/games",
      boxScore: {
        away: {
          linescore: [29, 27, 28, null],
          totals: {
            fg: "36-79",
            fgPct: "45.6",
            tp: "14-36",
            ft: "15-18",
            reb: 41,
            ast: 24,
            to: 11,
          },
        },
        home: {
          linescore: [26, 24, 26, null],
          totals: {
            fg: "34-76",
            fgPct: "44.7",
            tp: "11-31",
            ft: "13-16",
            reb: 39,
            ast: 21,
            to: 13,
          },
        },
      },
      topPerformers: [
        { name: "Donovan Mitchell", team: "CLE", line: "31 pts, 6 ast, 4 reb" },
        { name: "Scottie Barnes", team: "TOR", line: "22 pts, 9 reb, 5 ast" },
        { name: "Darius Garland", team: "CLE", line: "17 pts, 8 ast" },
      ],
      updates: [
        "Q3 7:12: Garland probe draws help; Mobley seals weak-side rebound.",
        "Q3 8:01: Barnes cuts deficit with corner three — Raptors within one possession.",
        "Halftime: Cavaliers 56-50; Mitchell 18 pts on 7-12 FG.",
      ],
    },
    {
      id: "game_knicks_celtics",
      shortName: "Knicks",
      league: "NBA",
      status: "live",
      period: "Q3",
      clock: "6:42",
      homeTeam: "Knicks",
      awayTeam: "Celtics",
      homeScore: 78,
      awayScore: 74,
      startTime: "2026-04-29T23:30:00Z",
      feedStatus: "Simulated official box score feed",
      updates: [
        "Q3 6:42: Knicks lead 78-74; model keeps playoff path leaning YES.",
        "Q2 halftime: injury feed unchanged; price movement stayed inside 3 points.",
      ],
    },
    {
      id: "game_mets_braves",
      shortName: "Mets",
      league: "MLB",
      status: "scheduled",
      period: "Pregame",
      clock: "7:10 PM ET",
      homeTeam: "Mets",
      awayTeam: "Braves",
      homeScore: 0,
      awayScore: 0,
      startTime: "2026-04-30T23:10:00Z",
      feedStatus: "Scheduled data pull",
      updates: [
        "Probable pitchers loaded; first-score model awaiting confirmed lineups.",
        "Weather check queued for first pitch window.",
      ],
    },
    {
      id: "game_world_cup_final",
      shortName: "World Cup",
      league: "FIFA",
      status: "scheduled",
      period: "Final",
      clock: "TBD",
      homeTeam: "Finalist A",
      awayTeam: "Finalist B",
      homeScore: 0,
      awayScore: 0,
      startTime: "2026-07-19T22:00:00Z",
      feedStatus: "Awaiting official match feed",
      updates: [
        "Market linked to FIFA final feed placeholder.",
        "Pregame volatility model will activate when finalists are known.",
      ],
    },
  ],
  selectedMarketId: "market_1",
  betDraft: {
    side: "YES",
    stake: 10,
    withdrawableShare: 10,
    bonusShare: 0,
  },
  markets: [
    withResolutionDefaults({
      id: "market_1",
      title: "Will the Knicks make the 2026 Eastern Conference Finals?",
      category: "NBA",
      volume: 12400,
      endDate: "2026-05-21",
      yesPrice: 0.54,
      noPrice: 0.46,
      liveGameId: "game_knicks_celtics",
      algorithm: {
        model: "Elo playoff path + injury report inputs",
        dataFeeds: ["NBA official box score", "Series bracket state", "Team rating prior"],
        refreshCadence: "Every live game update",
      },
      resolutionRule:
        "Resolves YES if the Knicks officially qualify for the 2026 Eastern Conference Finals. Resolves NO once they are eliminated before that round.",
      evidenceLinks: [
        {
          label: "NBA official scores",
          url: "https://www.nba.com/games",
          sourceType: "official",
        },
        {
          label: "NBA standings and playoff bracket",
          url: "https://www.nba.com/standings",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Place a social prediction on whether the Knicks will reach the 2026 Eastern Conference Finals. Friend boosts increase only the bonus portion of winnings.",
      recentActivity: [
        { user: "Maya", action: "Bet YES", amount: 12, time: "5 min ago" },
        { user: "Theo", action: "Invited 2 friends", amount: 0, time: "18 min ago" },
        { user: "Jordan", action: "Bet NO", amount: 18, time: "40 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_nba_cavs_raptors_live",
      title: "Toronto vs Cleveland",
      category: "NBA",
      volume: 92400,
      endDate: "2026-05-04",
      yesPrice: 0.52,
      noPrice: 0.48,
      liveGameId: "game_cavs_raptors",
      algorithm: {
        model: "Live moneyline + pace index + foul-trouble tracker",
        dataFeeds: ["NBA live box score", "Official play-by-play", "In-game efficiency"],
        refreshCadence: "Every live tick (~15s demo)",
      },
      resolutionRule:
        "Resolves to the winning side once the game is final: Cleveland if the Cavaliers win, Toronto if the Raptors win. Void only under league void rules.",
      evidenceLinks: [
        {
          label: "NBA.com game page",
          url: "https://www.nba.com/games",
          sourceType: "official",
        },
        {
          label: "ESPN NBA scoreboard",
          url: "https://www.espn.com/nba/scoreboard",
          sourceType: "aggregator",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 4,
      friendGroup: ["Maya", "Jordan"],
      description:
        "Head-to-head matchup contract: choose Cleveland or Toronto. Prices track live ESPN scoreboard and play-by-play updates.",
      recentActivity: [
        { user: "Live desk", action: "Spread tightened after TOR run", amount: 0, time: "Just now" },
        { user: "Noah", action: "Bet YES", amount: 40, time: "4 min ago" },
        { user: "Ava", action: "Bet NO", amount: 25, time: "11 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_2",
      title: "Will the Dodgers win the NL West in 2026?",
      category: "MLB",
      volume: 30120,
      endDate: "2026-05-31",
      yesPrice: 0.49,
      noPrice: 0.51,
      algorithm: {
        model: "Division projection + roster strength",
        dataFeeds: ["MLB standings", "Official schedule", "Injury report"],
        refreshCadence: "Daily during the regular season",
      },
      resolutionRule:
        "Resolves YES if the Dodgers officially finish first in the NL West in the 2026 regular season. Resolves NO otherwise.",
      evidenceLinks: [
        {
          label: "MLB standings",
          url: "https://www.mlb.com/standings",
          sourceType: "official",
        },
        {
          label: "MLB schedule",
          url: "https://www.mlb.com/schedule",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Season-long MLB division market with official standings as the settlement source.",
      recentActivity: [
        { user: "Noah", action: "Bet YES", amount: 20, time: "8 min ago" },
        { user: "Riley", action: "Bet NO", amount: 7, time: "22 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_3",
      title: "Will the Lakers win their next playoff game?",
      category: "NBA",
      volume: 18900,
      endDate: "2026-06-30",
      yesPrice: 0.57,
      noPrice: 0.43,
      algorithm: {
        model: "Playoff matchup rating + injury report",
        dataFeeds: ["NBA official box score", "Team injury report", "Series state"],
        refreshCadence: "Every injury and game update",
      },
      resolutionRule:
        "Resolves YES if the Lakers win their next officially scheduled playoff game. Resolves NO if they lose.",
      evidenceLinks: [
        {
          label: "NBA official scores",
          url: "https://www.nba.com/games",
          sourceType: "official",
        },
        {
          label: "NBA playoff bracket",
          url: "https://www.nba.com/playoffs",
          sourceType: "official",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "NBA playoff market with official final score settlement and injury-report inputs.",
      recentActivity: [
        { user: "Owen", action: "Bet YES", amount: 9, time: "12 min ago" },
        { user: "Lena", action: "Invited 1 friend", amount: 0, time: "1 hr ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_4",
      title: "Will the Rams score 24 or more points in their season opener?",
      category: "NFL",
      volume: 8200,
      endDate: "2026-05-15",
      yesPrice: 0.41,
      noPrice: 0.59,
      algorithm: {
        model: "Opponent-adjusted offense + opener rest model",
        dataFeeds: ["NFL schedule", "Official gamebook", "Injury report"],
        refreshCadence: "Daily, then live on game day",
      },
      resolutionRule:
        "Resolves YES if the Rams score 24 or more points in their first regular-season game. Resolves NO if they score 23 or fewer.",
      evidenceLinks: [
        {
          label: "NFL scores",
          url: "https://www.nfl.com/scores/",
          sourceType: "official",
        },
        {
          label: "NOAA climate data",
          url: "https://www.ncei.noaa.gov/",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "NFL team-total market using the official gamebook and final scoring summary.",
      recentActivity: [
        { user: "Maya", action: "Bet YES", amount: 6, time: "14 min ago" },
        { user: "Ava", action: "Watched injury report", amount: 0, time: "1 hr ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_5",
      title: "Will USC win its next ranked matchup?",
      category: "College Sports",
      volume: 14600,
      endDate: "2026-08-01",
      yesPrice: 0.35,
      noPrice: 0.65,
      algorithm: {
        model: "College rating + matchup form",
        dataFeeds: ["Official school schedule", "Conference standings", "Box score feed"],
        refreshCadence: "Daily, then live on game day",
      },
      resolutionRule:
        "Resolves YES if USC wins its next game against a ranked opponent. Resolves NO if USC loses that matchup.",
      evidenceLinks: [
        {
          label: "NCAA scores",
          url: "https://www.ncaa.com/scoreboard",
          sourceType: "official",
        },
        {
          label: "USC athletics schedule",
          url: "https://usctrojans.com/calendar",
          sourceType: "official",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "College sports market using official school or NCAA results for settlement.",
      recentActivity: [
        { user: "Jordan", action: "Bet NO", amount: 15, time: "25 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_6",
      title: "Will the 2026 World Cup final go to extra time?",
      category: "Soccer",
      volume: 22100,
      endDate: "2026-07-19",
      yesPrice: 0.28,
      noPrice: 0.72,
      liveGameId: "game_world_cup_final",
      algorithm: {
        model: "Historic extra-time rate + matchup volatility",
        dataFeeds: ["FIFA match feed", "Tournament bracket", "Regulation xG estimate"],
        refreshCadence: "Pregame and live match events",
      },
      resolutionRule:
        "Resolves YES if the 2026 World Cup final is tied after regulation and proceeds to extra time. Resolves NO if the match ends in regulation.",
      evidenceLinks: [
        {
          label: "FIFA match centre",
          url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Sports template for global events, with final match state and official match report as the intended resolution source.",
      recentActivity: [
        { user: "Theo", action: "Bet YES", amount: 8, time: "34 min ago" },
        { user: "Jordan", action: "Joined boost group", amount: 0, time: "48 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_7",
      title: "Will the Mets score first against the Braves tomorrow?",
      category: "MLB",
      volume: 6100,
      endDate: "2026-04-30",
      yesPrice: 0.47,
      noPrice: 0.53,
      liveGameId: "game_mets_braves",
      algorithm: {
        model: "Starting pitcher split + park factor",
        dataFeeds: ["MLB probable pitchers", "Official gamecast", "Weather at first pitch"],
        refreshCadence: "Pregame lineup lock, then every inning",
      },
      resolutionRule:
        "Resolves YES if the Mets are credited with the first run of the official game. Resolves NO if the Braves score first.",
      evidenceLinks: [
        {
          label: "MLB scoreboard",
          url: "https://www.mlb.com/scores",
          sourceType: "official",
        },
        {
          label: "MLB probable pitchers",
          url: "https://www.mlb.com/probable-pitchers",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Live-game template for first-score markets, wired for inning-by-inning tracking and official scorer confirmation.",
      recentActivity: [
        { user: "Ava", action: "Bet YES", amount: 9, time: "7 min ago" },
        { user: "Noah", action: "Joined boost group", amount: 0, time: "19 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_8",
      title: "Will the Rangers win their next playoff game?",
      category: "NHL",
      volume: 17450,
      endDate: "2026-05-12",
      yesPrice: 0.44,
      noPrice: 0.56,
      algorithm: {
        model: "Goal differential + goalie form",
        dataFeeds: ["NHL official gamecenter", "Line combinations", "Goalie confirmation"],
        refreshCadence: "Every lineup and game update",
      },
      resolutionRule:
        "Resolves YES if the Rangers win their next officially scheduled playoff game. Resolves NO if they lose.",
      evidenceLinks: [
        {
          label: "NHL scores",
          url: "https://www.nhl.com/scores",
          sourceType: "official",
        },
        {
          label: "NHL standings",
          url: "https://www.nhl.com/standings",
          sourceType: "official",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "NHL playoff market with official gamecenter settlement and lineup inputs.",
      recentActivity: [
        { user: "Jordan", action: "Bet NO", amount: 14, time: "31 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_9",
      title: "Will the next UFC title fight go the distance?",
      category: "Combat Sports",
      volume: 9300,
      endDate: "2026-05-10",
      yesPrice: 0.38,
      noPrice: 0.62,
      algorithm: {
        model: "Fighter style matchup + historical decision rate",
        dataFeeds: ["Official promotion results", "Fight card", "Athletic commission record"],
        refreshCadence: "Daily until fight night",
      },
      resolutionRule:
        "Resolves YES if the next UFC title fight reaches the final bell and is decided by judges. Resolves NO if it ends before the final bell.",
      evidenceLinks: [
        {
          label: "UFC results",
          url: "https://www.ufc.com/events",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Combat sports market with method-of-victory settlement from official fight results.",
      recentActivity: [
        { user: "Sofia", action: "Bet YES", amount: 5, time: "16 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_10",
      title: "Will the Warriors win their next home game by 8 or more points?",
      category: "NBA",
      volume: 11850,
      endDate: "2026-05-02",
      yesPrice: 0.52,
      noPrice: 0.48,
      algorithm: {
        model: "Spread market blend + team rest model",
        dataFeeds: ["NBA official schedule", "Injury report", "Closing spread consensus"],
        refreshCadence: "Every injury and line movement update",
      },
      resolutionRule:
        "Resolves YES if the Warriors win their next scheduled home game by 8 or more points. Resolves NO if they win by 7 or fewer, lose, or the game is voided by admin postponement policy.",
      evidenceLinks: [
        {
          label: "NBA schedule",
          url: "https://www.nba.com/schedule",
          sourceType: "official",
        },
        {
          label: "NBA injury report",
          url: "https://official.nba.com/nba-injury-report-2025-26-season/",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Point-margin sports market that combines official final score settlement with a model watching injury and rest inputs.",
      recentActivity: [
        { user: "Maya", action: "Bet YES", amount: 11, time: "9 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_11",
      title: "Will the Yankees hit two or more home runs in their next game?",
      category: "MLB",
      volume: 25720,
      endDate: "2026-06-30",
      yesPrice: 0.46,
      noPrice: 0.54,
      algorithm: {
        model: "Power profile + opposing starter split",
        dataFeeds: ["MLB official box score", "Probable pitchers", "Lineup card"],
        refreshCadence: "Pregame lineup lock, then every plate appearance",
      },
      resolutionRule:
        "Resolves YES if the Yankees hit two or more official home runs in their next game. Resolves NO if they hit one or zero.",
      evidenceLinks: [
        {
          label: "MLB Yankees schedule",
          url: "https://www.mlb.com/yankees/schedule",
          sourceType: "official",
        },
        {
          label: "MLB box scores",
          url: "https://www.mlb.com/scores",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "MLB team prop market settled from official home run totals in the box score.",
      recentActivity: [
        { user: "Riley", action: "Bet NO", amount: 13, time: "21 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_12",
      title: "Will the 49ers win the NFC West?",
      category: "NFL",
      volume: 33200,
      endDate: "2026-06-17",
      yesPrice: 0.61,
      noPrice: 0.39,
      algorithm: {
        model: "Division strength + team rating",
        dataFeeds: ["NFL standings", "Official schedule", "Injury report"],
        refreshCadence: "Daily during the regular season",
      },
      resolutionRule:
        "Resolves YES if the 49ers officially finish first in the NFC West. Resolves NO otherwise.",
      evidenceLinks: [
        {
          label: "NFL standings",
          url: "https://www.nfl.com/standings/",
          sourceType: "official",
        },
        {
          label: "NFL schedule",
          url: "https://www.nfl.com/schedules/",
          sourceType: "official",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Rates market with official FOMC settlement, clear target-range language, and meeting-day live update hooks.",
      recentActivity: [
        { user: "Jordan", action: "Watched market", amount: 0, time: "27 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_13",
      title: "Will the Wimbledon men's final go five sets?",
      category: "Tennis",
      volume: 7600,
      endDate: "2026-07-22",
      yesPrice: 0.33,
      noPrice: 0.67,
      algorithm: {
        model: "Player serve hold + tournament form",
        dataFeeds: ["Official tournament result", "ATP/WTA match stats", "Draw state"],
        refreshCadence: "Every match update",
      },
      resolutionRule:
        "Resolves YES if the Wimbledon men's singles final is completed in five sets. Resolves NO if it ends in fewer than five sets.",
      evidenceLinks: [
        {
          label: "Wimbledon results",
          url: "https://www.wimbledon.com/en_GB/scores/index.html",
          sourceType: "official",
        },
        {
          label: "ATP results",
          url: "https://www.atptour.com/en/scores",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Tennis match market using official tournament scoring and completed set count.",
      recentActivity: [
        { user: "Lena", action: "Bet NO", amount: 6, time: "44 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_14",
      title: "Will the Chiefs win their season opener?",
      category: "NFL",
      volume: 16240,
      endDate: "2026-09-10",
      yesPrice: 0.58,
      noPrice: 0.42,
      algorithm: {
        model: "Team rating + opener rest model",
        dataFeeds: ["NFL schedule", "Official gamebook", "Injury report"],
        refreshCadence: "Daily, then live on game day",
      },
      resolutionRule:
        "Resolves YES if Kansas City wins its first regular-season game of the 2026 NFL season. Resolves NO for a loss or tie.",
      evidenceLinks: [
        {
          label: "NFL scores",
          url: "https://www.nfl.com/scores/",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Opening-night NFL market with official final score settlement and injury-report inputs before kickoff.",
      recentActivity: [
        { user: "Theo", action: "Bet YES", amount: 10, time: "11 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_15",
      title: "Will the Masters winner finish at 10-under par or better?",
      category: "Golf",
      volume: 20180,
      endDate: "2026-09-30",
      yesPrice: 0.37,
      noPrice: 0.63,
      algorithm: {
        model: "Course fit + scoring conditions",
        dataFeeds: ["Official Masters leaderboard", "Round scoring", "Weather delay status"],
        refreshCadence: "Every leaderboard update",
      },
      resolutionRule:
        "Resolves YES if the official Masters winner finishes the tournament at 10-under par or better. Resolves NO otherwise.",
      evidenceLinks: [
        {
          label: "Masters leaderboard",
          url: "https://www.masters.com/en_US/scores/index.html",
          sourceType: "official",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Golf tournament market settled from the official final leaderboard.",
      recentActivity: [
        { user: "Owen", action: "Bet NO", amount: 12, time: "24 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_16",
      title: "Will the Formula 1 pole sitter win the race?",
      category: "Motorsports",
      volume: 5400,
      endDate: "2026-05-25",
      yesPrice: 0.46,
      noPrice: 0.54,
      algorithm: {
        model: "Track position + tire strategy",
        dataFeeds: ["Official race classification", "Qualifying result", "Timing sheet"],
        refreshCadence: "Every session update",
      },
      resolutionRule:
        "Resolves YES if the official pole sitter wins the Formula 1 race. Resolves NO if any other driver wins.",
      evidenceLinks: [
        {
          label: "Formula 1 results",
          url: "https://www.formula1.com/en/results.html",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Motorsports race market using official qualifying and final classification.",
      recentActivity: [
        { user: "Ava", action: "Bet YES", amount: 5, time: "39 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_17",
      title: "Will Duke reach the Final Four?",
      category: "College Sports",
      volume: 28750,
      endDate: "2026-06-30",
      yesPrice: 0.43,
      noPrice: 0.57,
      algorithm: {
        model: "Tournament path + team efficiency",
        dataFeeds: ["NCAA bracket", "Official box scores", "Team rating prior"],
        refreshCadence: "Every tournament game update",
      },
      resolutionRule:
        "Resolves YES if Duke officially reaches the men's NCAA Final Four. Resolves NO if Duke is eliminated before that round.",
      evidenceLinks: [
        {
          label: "NCAA men's basketball bracket",
          url: "https://www.ncaa.com/march-madness-live/bracket",
          sourceType: "official",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Equity index market using the official close and a clear all-time-high comparison rule.",
      recentActivity: [
        { user: "Jordan", action: "Bet NO", amount: 18, time: "17 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_18",
      title: "Will the USWNT win its next tournament opener?",
      category: "Soccer",
      volume: 12880,
      endDate: "2026-09-20",
      yesPrice: 0.55,
      noPrice: 0.45,
      algorithm: {
        model: "International rating + squad availability",
        dataFeeds: ["Official match report", "Tournament schedule", "Lineup report"],
        refreshCadence: "Daily, then live on match day",
      },
      resolutionRule:
        "Resolves YES if the USWNT wins its next tournament-opening match. Resolves NO for a draw or loss.",
      evidenceLinks: [
        {
          label: "U.S. Soccer schedule",
          url: "https://www.ussoccer.com/schedule-tickets",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Soccer match market using official federation or tournament match reports.",
      recentActivity: [
        { user: "Sofia", action: "Watched market", amount: 0, time: "51 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_19",
      title: "Will Bitcoin close above $95,000 on any Friday in Q2 2026?",
      category: "Crypto",
      volume: 41200,
      endDate: "2026-06-30",
      yesPrice: 0.42,
      noPrice: 0.58,
      algorithm: {
        model: "Volatility surface + ETF flow sentiment",
        dataFeeds: ["Reference exchange index", "On-chain settlement calendar", "Macro calendar"],
        refreshCadence: "End of week NY close",
      },
      resolutionRule:
        "Resolves YES if the reference BTC/USD index used in market rules prints a weekly close above $95,000 on any Friday in Q2 2026. Resolves NO otherwise.",
      evidenceLinks: [
        {
          label: "Coin Metrics reference documentation",
          url: "https://coinmetrics.io/",
          sourceType: "vendor",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Crypto weekly close market with a defined index and UTC/NY close alignment for settlement.",
      recentActivity: [
        { user: "Noah", action: "Bet YES", amount: 22, time: "3 min ago" },
        { user: "Maya", action: "Bet NO", amount: 14, time: "19 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_20",
      title: "Will the S&P 500 set a new all-time high before September 2026?",
      category: "Finance",
      volume: 35500,
      endDate: "2026-08-31",
      yesPrice: 0.51,
      noPrice: 0.49,
      algorithm: {
        model: "Breadth + rates path + earnings revision impulse",
        dataFeeds: ["Official index vendor close", "FOMC calendar", "Top constituents earnings"],
        refreshCadence: "Daily cash session close",
      },
      resolutionRule:
        "Resolves YES if the S&P 500 cash index exceeds its prior all-time high on any U.S. trading day before 2026-09-01. Resolves NO if that threshold is not reached.",
      evidenceLinks: [
        {
          label: "S&P Dow Jones Indices",
          url: "https://www.spglobal.com/spdji/en/",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Index milestone market using the official vendor published level at the regular cash close.",
      recentActivity: [
        { user: "Jordan", action: "Bet YES", amount: 30, time: "12 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_21",
      title: "Will NYC Central Park hit 90°F on any day in July 2026?",
      category: "Weather",
      volume: 9800,
      endDate: "2026-07-31",
      yesPrice: 0.36,
      noPrice: 0.64,
      algorithm: {
        model: "Climate normals + short-range heat dome risk",
        dataFeeds: ["NWS daily climate report", "Model heat peaks", "Urban heat island adjustment note"],
        refreshCadence: "Daily NWS verification",
      },
      resolutionRule:
        "Resolves YES if the official NWS daily climate report for Central Park, NY records a maximum temperature of 90°F or higher on any calendar day in July 2026.",
      evidenceLinks: [
        {
          label: "NWS NOWData / climate reports",
          url: "https://www.weather.gov/wrh/climate",
          sourceType: "official",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Weather threshold market tied to a named NWS station and published daily maximum.",
      recentActivity: [
        { user: "Ava", action: "Bet NO", amount: 8, time: "41 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_22",
      title: "Will Ethereum mainnet Pectra-related upgrade timelines stay on track through June 2026?",
      category: "Crypto",
      volume: 15300,
      endDate: "2026-06-30",
      yesPrice: 0.48,
      noPrice: 0.52,
      algorithm: {
        model: "Client release cadence + devnet stability signals",
        dataFeeds: ["Ethereum Foundation blog", "Client release tags", "Public all-core-devs summaries"],
        refreshCadence: "Weekly roadmap check",
      },
      resolutionRule:
        "Resolves YES if all milestones listed in the market description for Pectra rollout remain scheduled or completed on time through 2026-06-30. Resolves NO if an official delay beyond that window is announced.",
      evidenceLinks: [
        {
          label: "Ethereum Foundation",
          url: "https://ethereum.org/",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Process-style crypto market anchored to public roadmap posts, not investment advice.",
      recentActivity: [
        { user: "Theo", action: "Bet YES", amount: 7, time: "28 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_23",
      title: "Will the 2026 U.S. midterm generic ballot polling average move 3+ points toward either party by Labor Day?",
      category: "Politics",
      volume: 18900,
      endDate: "2026-09-07",
      yesPrice: 0.29,
      noPrice: 0.71,
      algorithm: {
        model: "Poll aggregator drift + house effects monitor",
        dataFeeds: ["Named aggregator methodology page", "Top-line generic ballot series", "Field dates"],
        refreshCadence: "When new qualifying polls release",
      },
      resolutionRule:
        "Resolves YES if the named high-quality polling average for the generic U.S. House ballot moves by 3.0 percentage points or more in either direction between the start date and Labor Day 2026. Resolves NO if movement stays below that threshold.",
      evidenceLinks: [
        {
          label: "Cook Political Report",
          url: "https://www.cookpolitical.com/",
          sourceType: "analyst",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Political polling-movement market; settlement uses the methodology page linked in admin evidence at creation.",
      recentActivity: [
        { user: "Lena", action: "Bet NO", amount: 11, time: "33 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_24",
      title: "Will the 2-year Treasury yield finish a week below 3.5% in Q2 2026?",
      category: "Finance",
      volume: 26400,
      endDate: "2026-06-30",
      yesPrice: 0.44,
      noPrice: 0.56,
      algorithm: {
        model: "Curve mode + Fed path implied from forwards",
        dataFeeds: ["Treasury published CMT yields", "FOMC statement calendar", "Inflation surprise index"],
        refreshCadence: "Weekly official CMT update",
      },
      resolutionRule:
        "Resolves YES if the U.S. Treasury constant maturity yield for the 2-year note closes a week at or below 3.50% on any week-ending date in Q2 2026 using the published daily series. Resolves NO otherwise.",
      evidenceLinks: [
        {
          label: "U.S. Treasury yield curve rates",
          url: "https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Rates market with official Treasury published levels and a clear weekly close definition.",
      recentActivity: [
        { user: "Owen", action: "Bet YES", amount: 19, time: "6 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_25",
      title: "Will Inter Miami win MLS Cup 2026?",
      category: "Soccer",
      volume: 84200,
      endDate: "2026-11-30",
      yesPrice: 0.27,
      noPrice: 0.73,
      algorithm: {
        model: "MLS playoff bracket + squad depth index",
        dataFeeds: ["MLS official results", "Playoff schedule", "Injury report"],
        refreshCadence: "After each playoff round",
      },
      resolutionRule:
        "Resolves YES if Inter Miami CF wins MLS Cup 2026 per MLS official competition rules. Resolves NO if another club wins.",
      evidenceLinks: [
        { label: "MLS scores", url: "https://www.mlssoccer.com/schedule/scores", sourceType: "official" },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description: "Season-long MLS trophy market; closes after Cup final.",
      recentActivity: [{ user: "Sofia", action: "Bet YES", amount: 14, time: "2 min ago" }],
    }),
    withResolutionDefaults({
      id: "market_26",
      title: "Will Liverpool win the 2026-27 Premier League?",
      category: "Soccer",
      volume: 95600,
      endDate: "2027-05-31",
      yesPrice: 0.31,
      noPrice: 0.69,
      algorithm: {
        model: "EPL projection + schedule strength",
        dataFeeds: ["Premier League table", "Official results"],
        refreshCadence: "Weekly during season",
      },
      resolutionRule:
        "Resolves YES if Liverpool finishes first in the 2026-27 EPL table. Resolves NO otherwise.",
      evidenceLinks: [
        { label: "Premier League standings", url: "https://www.premierleague.com/en/tables", sourceType: "official" },
      ],
      eligibleForBonus: true,
      friendsBoosting: 1,
      friendGroup: ["Jordan"],
      description: "English Premier League champion market for the full campaign.",
      recentActivity: [{ user: "Theo", action: "Bet NO", amount: 20, time: "18 min ago" }],
    }),
    withResolutionDefaults({
      id: "market_27",
      title: "Will Real Madrid win the 2026-27 UEFA Champions League?",
      category: "Soccer",
      volume: 121400,
      endDate: "2027-06-30",
      yesPrice: 0.22,
      noPrice: 0.78,
      algorithm: {
        model: "Knockout path simulation + squad rating",
        dataFeeds: ["UEFA results", "Draw outcomes"],
        refreshCadence: "Each knockout round",
      },
      resolutionRule:
        "Resolves YES if Real Madrid wins the 2026-27 UEFA Champions League final. Resolves NO if another club lifts the trophy.",
      evidenceLinks: [
        { label: "UEFA Champions League", url: "https://www.uefa.com/uefachampionsleague/", sourceType: "official" },
      ],
      eligibleForBonus: true,
      friendsBoosting: 2,
      friendGroup: ["Maya", "Noah"],
      description: "European club championship futures — settlement from UEFA official results.",
      recentActivity: [{ user: "Live desk", action: "Odds drift after draw", amount: 0, time: "Just now" }],
    }),
    withResolutionDefaults({
      id: "market_28",
      title: "Will Barcelona win the 2026-27 La Liga title?",
      category: "Soccer",
      volume: 78400,
      endDate: "2027-05-31",
      yesPrice: 0.36,
      noPrice: 0.64,
      algorithm: {
        model: "Domestic table projection",
        dataFeeds: ["La Liga standings", "Official results"],
        refreshCadence: "Weekly during season",
      },
      resolutionRule:
        "Resolves YES if FC Barcelona finishes first in the 2026-27 La Liga table. Resolves NO otherwise.",
      evidenceLinks: [
        { label: "La Liga standings", url: "https://www.laliga.com/en-GB/laliga-easports/standing", sourceType: "official" },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description: "Spain La Liga champion contract running through the regular season.",
      recentActivity: [{ user: "Ava", action: "Bet YES", amount: 11, time: "42 min ago" }],
    }),
    withResolutionDefaults({
      id: "market_29",
      title: "Will Inter Milan win the 2026-27 Serie A title?",
      category: "Soccer",
      volume: 59800,
      endDate: "2027-05-31",
      yesPrice: 0.29,
      noPrice: 0.71,
      algorithm: {
        model: "Serie A rating + fixture congestion",
        dataFeeds: ["Serie A standings", "Official results"],
        refreshCadence: "Weekly during season",
      },
      resolutionRule:
        "Resolves YES if Inter Milan finishes first in the 2026-27 Serie A table. Resolves NO otherwise.",
      evidenceLinks: [
        { label: "Serie A standings", url: "https://www.legaseriea.it/en/serie-a/classifica", sourceType: "official" },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description: "Italy Serie A scudetto futures.",
      recentActivity: [{ user: "Riley", action: "Bet NO", amount: 8, time: "3 hr ago" }],
    }),
    withResolutionDefaults({
      id: "market_30",
      title: "Will Portland Thorns FC win the 2026 NWSL Championship?",
      category: "Soccer",
      volume: 21400,
      endDate: "2026-11-28",
      yesPrice: 0.18,
      noPrice: 0.82,
      algorithm: {
        model: "NWSL playoff bracket model",
        dataFeeds: ["NWSL official results", "Playoff bracket"],
        refreshCadence: "Each postseason match",
      },
      resolutionRule:
        "Resolves YES if Portland Thorns FC wins the 2026 NWSL Championship final. Resolves NO if another club wins.",
      evidenceLinks: [
        { label: "NWSL schedule & scores", url: "https://www.nwslsoccer.com/schedule", sourceType: "official" },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description: "NWSL postseason trophy market.",
      recentActivity: [{ user: "Lena", action: "Bet YES", amount: 6, time: "55 min ago" }],
    }),
    withResolutionDefaults({
      id: "market_31",
      title: "Will Palmeiras win the 2026 Brasileirão Série A?",
      category: "Soccer",
      volume: 38900,
      endDate: "2026-12-08",
      yesPrice: 0.24,
      noPrice: 0.76,
      algorithm: {
        model: "Domestic strength + Copa overlap adjustment",
        dataFeeds: ["CBF/CBF-adjacent official table", "Club fixtures"],
        refreshCadence: "Weekly match rounds",
      },
      resolutionRule:
        "Resolves YES if Sociedade Esportiva Palmeiras finishes first in the 2026 Brasileirão Série A table. Resolves NO otherwise.",
      evidenceLinks: [
        { label: "Globo Esporte Brasileirão", url: "https://ge.globo.com/futebol/brasileirao-serie-a/", sourceType: "aggregator" },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description: "Brazil top-flight champion futures.",
      recentActivity: [{ user: "Jordan", action: "Watched market", amount: 0, time: "1 hr ago" }],
    }),
    withResolutionDefaults({
      id: "market_32",
      title: "Will Carlos Alcaraz win Wimbledon 2026 (men's singles)?",
      category: "Tennis",
      volume: 67300,
      endDate: "2026-07-19",
      yesPrice: 0.41,
      noPrice: 0.59,
      algorithm: {
        model: "Grass ELO + draw simulation",
        dataFeeds: ["ATP draws", "Official results"],
        refreshCadence: "Each round",
      },
      resolutionRule:
        "Resolves YES if Carlos Alcaraz wins the gentlemen's singles title at Wimbledon 2026. Resolves NO otherwise.",
      evidenceLinks: [
        { label: "Wimbledon results", url: "https://www.wimbledon.com/en_GB/scores/index.html", sourceType: "official" },
      ],
      eligibleForBonus: true,
      friendsBoosting: 3,
      friendGroup: ["Maya", "Theo", "Ava"],
      description: "Grand Slam futures — settlement from official championship match.",
      recentActivity: [{ user: "Noah", action: "Bet YES", amount: 25, time: "12 min ago" }],
    }),
    withResolutionDefaults({
      id: "market_33",
      title: "Will Jannik Sinner win the 2026 US Open (men's singles)?",
      category: "Tennis",
      volume: 71200,
      endDate: "2026-09-13",
      yesPrice: 0.38,
      noPrice: 0.62,
      algorithm: {
        model: "Hard-court strength + rest calendar",
        dataFeeds: ["ATP official results", "US Open bracket"],
        refreshCadence: "Each round",
      },
      resolutionRule:
        "Resolves YES if Jannik Sinner wins the 2026 US Open men's singles title. Resolves NO otherwise.",
      evidenceLinks: [
        { label: "US Open scores", url: "https://www.usopen.org/en_US/scores/index.html", sourceType: "official" },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description: "Hard-court major futures closing after the final.",
      recentActivity: [{ user: "Owen", action: "Bet NO", amount: 15, time: "33 min ago" }],
    }),
    withResolutionDefaults({
      id: "market_34",
      title: "Will Taylor Fritz win the 2027 Miami Open (men's singles)?",
      category: "Tennis",
      volume: 28400,
      endDate: "2027-04-05",
      yesPrice: 0.14,
      noPrice: 0.86,
      algorithm: {
        model: "Sunshine swing projection",
        dataFeeds: ["ATP Masters draws", "Official results"],
        refreshCadence: "During tournament week",
      },
      resolutionRule:
        "Resolves YES if Taylor Fritz wins the 2027 Miami Open men's singles title. Resolves NO otherwise.",
      evidenceLinks: [
        { label: "ATP Miami tournament", url: "https://www.atptour.com/en/tournaments/miami/403/overview", sourceType: "official" },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description: "Future ATP Masters 1000 outright scheduled ahead of the draw.",
      recentActivity: [{ user: "Sofia", action: "Bet YES", amount: 5, time: "2 days ago" }],
    }),
    withResolutionDefaults({
      id: "market_35",
      title: "Will Edmonton win the 2026 Stanley Cup?",
      category: "NHL",
      volume: 91800,
      endDate: "2026-06-30",
      yesPrice: 0.19,
      noPrice: 0.81,
      algorithm: {
        model: "Playoff path + goalie health index",
        dataFeeds: ["NHL official results", "Bracket state"],
        refreshCadence: "Each playoff round",
      },
      resolutionRule:
        "Resolves YES if the Edmonton Oilers win the 2026 Stanley Cup Finals. Resolves NO if another team wins.",
      evidenceLinks: [
        { label: "NHL Stanley Cup playoffs", url: "https://www.nhl.com/playoffs", sourceType: "official" },
      ],
      eligibleForBonus: true,
      friendsBoosting: 1,
      friendGroup: ["Jordan"],
      description: "NHL championship futures contract.",
      recentActivity: [{ user: "Maya", action: "Bet YES", amount: 30, time: "8 min ago" }],
    }),
    withResolutionDefaults({
      id: "market_36",
      title: "Will Coco Gauff win the 2027 Australian Open (women's singles)?",
      category: "Tennis",
      volume: 44200,
      endDate: "2027-02-01",
      yesPrice: 0.26,
      noPrice: 0.74,
      algorithm: {
        model: "Hard-court WTA projection",
        dataFeeds: ["WTA draws", "Australian Open results"],
        refreshCadence: "During AO fortnight",
      },
      resolutionRule:
        "Resolves YES if Coco Gauff wins the 2027 Australian Open women's singles title. Resolves NO otherwise.",
      evidenceLinks: [
        { label: "Australian Open", url: "https://ausopen.com/", sourceType: "official" },
      ],
      eligibleForBonus: true,
      friendsBoosting: 0,
      friendGroup: [],
      description: "Future Grand Slam outright — opens months before qualifying.",
      recentActivity: [{ user: "Lena", action: "Bet NO", amount: 9, time: "26 min ago" }],
    }),
  ],
  friends: {
    list: [],
    pending: [],
  },
  portfolio: {
    openBets: [
      {
        id: "bet_seed_1",
        marketId: "market_1",
        market: "Will the Knicks make the 2026 Eastern Conference Finals?",
        side: "YES",
        stake: 10,
        status: "Open",
        funding: "60% withdrawable / 40% bonus",
        withdrawableStake: 6,
        bonusStake: 4,
        placedAt: "2026-04-25",
      },
      {
        id: "bet_seed_2",
        marketId: "market_2",
        market: "Will the Dodgers win the NL West in 2026?",
        side: "NO",
        stake: 16,
        status: "Open",
        funding: "100% withdrawable",
        withdrawableStake: 16,
        bonusStake: 0,
        placedAt: "2026-04-25",
      },
    ],
    pastBets: [
      {
        market: "Lakers make playoffs",
        side: "YES",
        payout: 20,
        boost: 4,
        settlement: "Settled to $20 withdrawable + $4 bonus",
      },
      {
        market: "Lakers make playoffs",
        side: "NO",
        payout: 18,
        boost: 0,
        settlement: "Settled fully to withdrawable",
      },
    ],
  },
  createMarketDraft: {
    title: "",
    category: "NBA",
    closeDate: "",
    description: "",
    sourceUrl: "",
  },
  pendingMarkets: [
    {
      id: "pending_1",
      title: "Will the Jets sign a veteran QB by camp?",
      submittedBy: "@ava",
      createdAt: "2026-04-25",
      category: "NFL",
    },
    {
      id: "pending_2",
      title: "Will the Yankees win their next series?",
      submittedBy: "@maya",
      createdAt: "2026-04-26",
      category: "MLB",
    },
  ],
  activeMarkets: [
    {
      id: "active_1",
      marketId: "market_1",
      title: "Will the Knicks make the 2026 Eastern Conference Finals?",
      volume: 12400,
      status: "Active",
    },
    {
      id: "active_2",
      marketId: "market_2",
      title: "Will the Dodgers win the NL West in 2026?",
      volume: 30120,
      status: "Active",
    },
  ],
  resolvedMarkets: [
    {
      id: "resolved_1",
      title: "Lakers make playoffs",
      result: "YES",
      resolvedAt: "2026-03-28",
      resolverNotes: "Demo historical settlement using the posted playoff qualification criteria.",
      evidenceLinks: [
        {
          label: "NBA standings",
          url: "https://www.nba.com/standings",
          sourceType: "official",
        },
      ],
    },
  ],
  users: [
    {
      id: "user_1",
      name: "Test User",
      username: "@test",
      email: "test@example.com",
      withdrawable_balance: 100,
      bonus_balance: 0,
      risk_status: "clear",
      risk_score: 12,
      frozen: false,
      risk_signals: ["New demo account"],
    },
    {
      id: "user_2",
      name: "Taylor Demo",
      username: "@taylor",
      email: "taylor@example.com",
      withdrawable_balance: 100,
      bonus_balance: 0,
      risk_status: "clear",
      risk_score: 12,
      frozen: false,
      risk_signals: ["New demo account"],
    },
    {
      id: "user_3",
      name: "Jordan Lee",
      withdrawable_balance: 76,
      bonus_balance: 14,
      risk_status: "clear",
      risk_score: 18,
      frozen: false,
      risk_signals: ["Normal activity"],
    },
    {
      id: "user_4",
      name: "Theo Nguyen",
      withdrawable_balance: 41,
      bonus_balance: 58,
      risk_status: "review",
      risk_score: 71,
      frozen: false,
      risk_signals: ["High bonus velocity", "Dense friend boosting"],
    },
  ],
  ledger: [],
};
