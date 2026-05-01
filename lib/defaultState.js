import { getResolutionTemplate } from "./marketTaxonomy.js";

export const STORAGE_KEY = "friendmarket-mvp-state";

function withResolutionDefaults(market, overrides = {}) {
  const template = getResolutionTemplate(market.category);
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
