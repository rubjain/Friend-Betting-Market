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
    name: "Arush",
    username: "@arush",
    email: "arush@example.com",
    isAdmin: false,
    withdrawable_balance: 148,
    bonus_balance: 39,
    play_credit_balance: 187,
    settings: {
      bonusMarketEligibility: "eligible_only",
      betBonusUsage: "partial",
      emailVerificationStatus: "pending",
      phoneVerificationStatus: "placeholder",
      identityVerificationStatus: "placeholder",
      paymentVerificationStatus: "placeholder",
      deviceVerificationStatus: "placeholder",
      riskStatus: "monitor",
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
    pendingInvites: 3,
    completedReferrals: 5,
    history: [
      {
        id: "ref_1",
        friend: "Maya Patel",
        status: "Reward paid",
        amount: 10,
        date: "2026-04-24",
      },
      {
        id: "ref_2",
        friend: "Ava Kim",
        status: "Invite sent",
        amount: 0,
        date: "2026-04-28",
      },
    ],
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
    withdrawableShare: 6,
    bonusShare: 4,
  },
  markets: [
    withResolutionDefaults({
      id: "market_1",
      title: "Will the Knicks make the 2026 Eastern Conference Finals?",
      category: "Sports",
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
      friendsBoosting: 4,
      friendGroup: ["Maya", "Jordan", "Theo", "Ava"],
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
      title: "Will Bitcoin finish May above $90,000?",
      category: "Crypto",
      volume: 30120,
      endDate: "2026-05-31",
      yesPrice: 0.49,
      noPrice: 0.51,
      algorithm: {
        model: "Reference exchange close + volatility band",
        dataFeeds: ["Coinbase BTC-USD", "Fallback price index", "UTC month-end snapshot"],
        refreshCadence: "Every 60 seconds near settlement",
      },
      resolutionRule:
        "Resolves YES if BTC-USD is above $90,000 at the configured month-end reference timestamp. Resolves NO at or below $90,000.",
      evidenceLinks: [
        {
          label: "Coinbase BTC-USD",
          url: "https://www.coinbase.com/price/bitcoin",
          sourceType: "reference",
        },
        {
          label: "CoinMarketCap Bitcoin reference",
          url: "https://coinmarketcap.com/currencies/bitcoin/",
          sourceType: "fallback",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 2,
      friendGroup: ["Riley", "Noah"],
      description:
        "A simple binary market on month-end Bitcoin price, with social boosts capped by admin rules.",
      recentActivity: [
        { user: "Noah", action: "Bet YES", amount: 20, time: "8 min ago" },
        { user: "Riley", action: "Bet NO", amount: 7, time: "22 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_3",
      title: "Will OpenAI launch a new consumer app before July?",
      category: "Tech",
      volume: 18900,
      endDate: "2026-06-30",
      yesPrice: 0.57,
      noPrice: 0.43,
      algorithm: {
        model: "Launch announcement classifier",
        dataFeeds: ["Company newsroom", "App store availability", "Official product page"],
        refreshCadence: "Hourly source sweep",
      },
      resolutionRule:
        "Resolves YES if OpenAI makes a new consumer app publicly available before July 1, 2026. Feature updates to existing apps do not count unless branded as a distinct app.",
      evidenceLinks: [
        {
          label: "OpenAI news",
          url: "https://openai.com/news/",
          sourceType: "official",
        },
        {
          label: "OpenAI products",
          url: "https://openai.com/products/",
          sourceType: "official",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 3,
      friendGroup: ["Lena", "Sofia", "Owen"],
      description:
        "An admin can choose whether company-funded bonus balances are allowed on a market-by-market basis.",
      recentActivity: [
        { user: "Owen", action: "Bet YES", amount: 9, time: "12 min ago" },
        { user: "Lena", action: "Invited 1 friend", amount: 0, time: "1 hr ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_4",
      title: "Will Los Angeles record a high above 90F on May 15, 2026?",
      category: "Weather",
      volume: 8200,
      endDate: "2026-05-15",
      yesPrice: 0.41,
      noPrice: 0.59,
      algorithm: {
        model: "Station forecast blend + historical high prior",
        dataFeeds: ["National Weather Service", "NOAA station observation", "Hourly forecast"],
        refreshCadence: "Every weather observation update",
      },
      resolutionRule:
        "Resolves YES if the official daily high for downtown Los Angeles exceeds 90F on May 15, 2026. Resolves NO at 90F or below.",
      evidenceLinks: [
        {
          label: "National Weather Service Los Angeles",
          url: "https://www.weather.gov/lox/",
          sourceType: "official",
        },
        {
          label: "NOAA climate data",
          url: "https://www.ncei.noaa.gov/",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 1,
      friendGroup: ["Maya"],
      description:
        "Weather market that should later resolve against a named official station and published daily high temperature.",
      recentActivity: [
        { user: "Maya", action: "Bet YES", amount: 6, time: "14 min ago" },
        { user: "Ava", action: "Watched weather source", amount: 0, time: "1 hr ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_5",
      title: "Will a federal AI bill pass the U.S. Senate before August 2026?",
      category: "Politics",
      volume: 14600,
      endDate: "2026-08-01",
      yesPrice: 0.35,
      noPrice: 0.65,
      algorithm: {
        model: "Legislative calendar tracker",
        dataFeeds: ["Congress.gov bill status", "Senate roll call votes", "Committee calendar"],
        refreshCadence: "Daily while Congress is in session",
      },
      resolutionRule:
        "Resolves YES if a federal AI bill passes the U.S. Senate before August 1, 2026. Resolves NO if no qualifying bill passes by the deadline.",
      evidenceLinks: [
        {
          label: "Congress.gov legislation search",
          url: "https://www.congress.gov/",
          sourceType: "official",
        },
        {
          label: "U.S. Senate roll call votes",
          url: "https://www.senate.gov/legislative/votes_new.htm",
          sourceType: "official",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 0,
      friendGroup: [],
      description:
        "Politics market placeholder for legislation workflows, requiring official congressional source links and audit notes before real launch.",
      recentActivity: [
        { user: "Jordan", action: "Bet NO", amount: 15, time: "25 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_6",
      title: "Will the 2026 World Cup final go to extra time?",
      category: "Sports",
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
      friendsBoosting: 2,
      friendGroup: ["Theo", "Jordan"],
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
      category: "Sports",
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
      friendsBoosting: 3,
      friendGroup: ["Maya", "Ava", "Noah"],
      description:
        "Live-game template for first-score markets, wired for inning-by-inning tracking and official scorer confirmation.",
      recentActivity: [
        { user: "Ava", action: "Bet YES", amount: 9, time: "7 min ago" },
        { user: "Noah", action: "Joined boost group", amount: 0, time: "19 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_8",
      title: "Will April CPI come in below 3.2% year over year?",
      category: "Finance",
      volume: 17450,
      endDate: "2026-05-12",
      yesPrice: 0.44,
      noPrice: 0.56,
      algorithm: {
        model: "Inflation nowcast blend",
        dataFeeds: ["BLS CPI release", "Energy price basket", "Cleveland Fed nowcast"],
        refreshCadence: "Daily until release",
      },
      resolutionRule:
        "Resolves YES if the first official April CPI year-over-year release is below 3.2%. Later revisions do not change settlement.",
      evidenceLinks: [
        {
          label: "BLS CPI releases",
          url: "https://www.bls.gov/cpi/",
          sourceType: "official",
        },
        {
          label: "Cleveland Fed Inflation Nowcasting",
          url: "https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting",
          sourceType: "reference",
        },
      ],
      eligibleForBonus: false,
      friendsBoosting: 1,
      friendGroup: ["Jordan"],
      description:
        "Finance market scaffold for economic releases, with revision handling and source-lock rules prepared for admin review.",
      recentActivity: [
        { user: "Jordan", action: "Bet NO", amount: 14, time: "31 min ago" },
      ],
    }),
    withResolutionDefaults({
      id: "market_9",
      title: "Will the leading album spend a third week at #1?",
      category: "Culture",
      volume: 9300,
      endDate: "2026-05-10",
      yesPrice: 0.38,
      noPrice: 0.62,
      algorithm: {
        model: "Streaming momentum + chart-history prior",
        dataFeeds: ["Official chart publisher", "Streaming rank snapshot", "Sales estimate"],
        refreshCadence: "Daily chart-cycle update",
      },
      resolutionRule:
        "Resolves YES if the named leading album is officially ranked #1 for a third consecutive chart week. Resolves NO if another album takes #1 first.",
      evidenceLinks: [
        {
          label: "Billboard charts",
          url: "https://www.billboard.com/charts/",
          sourceType: "official",
        },
      ],
      eligibleForBonus: true,
      friendsBoosting: 2,
      friendGroup: ["Lena", "Sofia"],
      description:
        "Culture market template for awards and charts, emphasizing named chart source, week window, and tie rules.",
      recentActivity: [
        { user: "Sofia", action: "Bet YES", amount: 5, time: "16 min ago" },
      ],
    }),
  ],
  friends: {
    list: [
      { name: "Maya Patel", username: "@maya", boostCount: 6, status: "Trusted" },
      { name: "Jordan Lee", username: "@jordy", boostCount: 4, status: "Trusted" },
      { name: "Theo Nguyen", username: "@theo", boostCount: 2, status: "Monitor" },
    ],
    pending: [
      { name: "Ava Kim", username: "@ava", direction: "incoming" },
      { name: "Riley West", username: "@riley", direction: "outgoing" },
    ],
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
        market: "Will Bitcoin finish May above $90,000?",
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
        market: "Fed cuts rates in Q1",
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
    category: "Sports",
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
      category: "Sports",
    },
    {
      id: "pending_2",
      title: "Will ETH outperform BTC in June?",
      submittedBy: "@maya",
      createdAt: "2026-04-26",
      category: "Crypto",
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
      title: "Will Bitcoin finish May above $90,000?",
      volume: 30120,
      status: "Active",
    },
  ],
  resolvedMarkets: [
    {
      id: "resolved_1",
      title: "Fed cuts rates in Q1",
      result: "YES",
      resolvedAt: "2026-03-28",
      resolverNotes: "Demo historical settlement using the posted rate-cut criteria.",
      evidenceLinks: [
        {
          label: "Federal Reserve press release",
          url: "https://www.federalreserve.gov/newsevents/pressreleases.htm",
          sourceType: "official",
        },
      ],
    },
  ],
  users: [
    {
      id: "user_1",
      name: "Arush",
      withdrawable_balance: 148,
      bonus_balance: 39,
      risk_status: "monitor",
      risk_score: 42,
      frozen: false,
      risk_signals: ["Shared device signal", "Repeat boost group"],
    },
    {
      id: "user_2",
      name: "Maya Patel",
      withdrawable_balance: 92,
      bonus_balance: 22,
      risk_status: "clear",
      risk_score: 12,
      frozen: false,
      risk_signals: ["Verified email"],
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
