"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createAdminAdjustmentEntry,
  createBetLedgerEntries,
  createFundsCreditEntry,
  createLedgerEntry,
  createRefundLedgerEntries,
  createSettlementLedgerEntries,
} from "../lib/accounting";
import { defaultState, STORAGE_KEY } from "../lib/defaultState";
import { mergeGameMarkets } from "../lib/gameMarkets.js";
import { money } from "../lib/formatters";
import { calculatePayout } from "../lib/marketMath";
import { getResolutionTemplate, sportMarketCategories } from "../lib/marketTaxonomy";
import { applyRiskSignalsToUser, getBoostRiskSignals, getRiskBand } from "../lib/riskEngine";

const FriendMarketContext = createContext(null);

const sportCategoryLabels = new Set(sportMarketCategories.map((category) => category.label));

const numericAdminFields = new Set([
  "maxGroupSize",
  "multiplierPerFriend",
  "maxMultiplier",
  "maxBonusPayoutPerUser",
  "maxBonusPayoutPerMarket",
  "dailyBonusPayoutLimit",
  "maxBonusStakePercent",
  "bonusLiability",
]);

function cloneState(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeUsers(users) {
  return users.map((user) => ({
    risk_score: user.risk_status === "clear" ? 12 : 48,
    frozen: false,
    risk_signals: user.risk_status === "clear" ? ["Normal activity"] : ["Needs manual review"],
    ...user,
  }));
}

function normalizeLedger(entries) {
  return entries.map((entry) => {
    if (
      entry.source === "market_payout" ||
      entry.source === "social_boost" ||
      entry.source === "deposit" ||
      entry.source === "referral_bonus"
    ) {
      return { ...entry, transaction_type: "credit" };
    }

    if (entry.source === "bet_placed") {
      return { ...entry, transaction_type: "debit" };
    }

    return entry;
  });
}

function normalizeMarkets(markets) {
  return markets.map((market) => {
    const template = getResolutionTemplate(market.category);
    return {
      status: "active",
      closeTime: market.endDate ? `${market.endDate}T23:59:00Z` : null,
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
    };
  });
}

function isSportMarket(market) {
  return sportCategoryLabels.has(market?.category);
}

function filterSportMarkets(markets = []) {
  return markets.filter(isSportMarket);
}

function filterQueueBySport(queue = []) {
  return queue.filter((market) => sportCategoryLabels.has(market.category));
}

function filterActiveMarketsByIds(markets = [], marketById) {
  return markets
    .filter((market) => !market.marketId || marketById.has(market.marketId))
    .map((market) => {
      const sourceMarket = marketById.get(market.marketId);
      return sourceMarket ? { ...market, title: sourceMarket.title, volume: sourceMarket.volume } : market;
    });
}

function filterPortfolioByIds(portfolio = {}, marketById) {
  return {
    ...portfolio,
    openBets: (portfolio.openBets || defaultState.portfolio.openBets).filter(
      (bet) => !bet.marketId || marketById.has(bet.marketId),
    ).map((bet) => {
      const sourceMarket = marketById.get(bet.marketId);
      return sourceMarket ? { ...bet, market: sourceMarket.title } : bet;
    }),
    pastBets: portfolio.pastBets || defaultState.portfolio.pastBets,
  };
}

function mergeById(defaultItems, savedItems = []) {
  const savedIds = new Set(savedItems.map((item) => item.id));
  return [
    ...savedItems,
    ...defaultItems.filter((item) => !savedIds.has(item.id)),
  ];
}

function mergeStoredState(parsed) {
  const mergedMarkets = normalizeMarkets(
    mergeById(defaultState.markets, filterSportMarkets(parsed.markets || [])),
  );
  const marketById = new Map(mergedMarkets.map((market) => [market.id, market]));
  const selectedMarketId = marketById.has(parsed.selectedMarketId)
    ? parsed.selectedMarketId
    : defaultState.selectedMarketId;

  return {
    ...cloneState(defaultState),
    ...parsed,
    flashMessage: "",
    mobileNavOpen: false,
    theme: parsed.theme || defaultState.theme,
    auth: { ...defaultState.auth, ...(parsed.auth || {}) },
    friendInviteDraft: parsed.friendInviteDraft || "",
    ledgerFilter: parsed.ledgerFilter || defaultState.ledgerFilter,
    filters: { ...defaultState.filters, ...(parsed.filters || {}) },
    currentUser: {
      ...defaultState.currentUser,
      ...(parsed.currentUser || {}),
      settings: {
        ...defaultState.currentUser.settings,
        ...(parsed.currentUser?.settings || {}),
      },
    },
    adminConfig: { ...defaultState.adminConfig, ...(parsed.adminConfig || {}) },
    liveGames: mergeById(defaultState.liveGames, parsed.liveGames || []),
    fundingDrafts: { ...defaultState.fundingDrafts, ...(parsed.fundingDrafts || {}) },
    referrals: {
      ...defaultState.referrals,
      ...(parsed.referrals || {}),
      history: mergeById(defaultState.referrals.history, parsed.referrals?.history || []),
    },
    betDraft: { ...defaultState.betDraft, ...(parsed.betDraft || {}) },
    createMarketDraft: {
      ...defaultState.createMarketDraft,
      ...(parsed.createMarketDraft || {}),
    },
    friends: {
      ...defaultState.friends,
      ...(parsed.friends || {}),
      list: parsed.friends?.list || defaultState.friends.list,
      pending: parsed.friends?.pending || defaultState.friends.pending,
    },
    selectedMarketId,
    portfolio: filterPortfolioByIds({
      ...defaultState.portfolio,
      ...(parsed.portfolio || {}),
    }, marketById),
    markets: mergedMarkets,
    pendingMarkets: mergeById(defaultState.pendingMarkets, filterQueueBySport(parsed.pendingMarkets || [])),
    activeMarkets: mergeById(
      defaultState.activeMarkets,
      filterActiveMarketsByIds(parsed.activeMarkets || [], marketById),
    ),
    resolvedMarkets: mergeById(defaultState.resolvedMarkets, parsed.resolvedMarkets || []),
    users: normalizeUsers(mergeById(defaultState.users, parsed.users || [])),
    ledger: normalizeLedger(parsed.ledger || defaultState.ledger),
  };
}

function mergeIncomingState(nextState) {
  return mergeStoredState(nextState || {});
}

const PUBLIC_AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/account-recovery",
  "/verify-email",
]);

function isPublicAuthRoute(pathname) {
  return !pathname || PUBLIC_AUTH_ROUTES.has(pathname);
}

function buildStateFromSessionPayload(payload, previousTheme, previousFlash = "") {
  const merged = mergeIncomingState(payload.state);
  const sessionEnded = Boolean(payload.sessionExpired);
  const sessionExpiresSoon = Boolean(payload.session?.expiresSoon);
  const sessionNotice = sessionEnded
    ? "Your session ended. Please sign in again."
    : sessionExpiresSoon && !previousFlash
      ? "Your session expires soon. Save your work or sign in again to continue."
      : previousFlash;
  return {
    ...merged,
    auth: buildAuthFromSessionPayload(payload, merged.auth),
    theme: previousTheme ?? merged.theme ?? defaultState.theme,
    flashMessage: sessionNotice,
    mobileNavOpen: false,
  };
}

function buildAuthFromSessionPayload(payload, fallbackAuth = defaultState.auth) {
  return {
    authenticated: Boolean(payload.session?.authenticated),
    devAdminShortcut: Boolean(payload.devAdminShortcut ?? fallbackAuth.devAdminShortcut),
    expiresAt: payload.session?.expiresAt || "",
    expiresSoon: Boolean(payload.session?.expiresSoon),
    secondsUntilExpiry: payload.session?.secondsUntilExpiry ?? null,
    adminLevel: payload.session?.adminLevel || "",
    adminPermissions: Array.isArray(payload.session?.adminPermissions)
      ? payload.session.adminPermissions
      : [],
  };
}

async function requestJson(url, options) {
  const { headers = {}, ...rest } = options || {};
  const response = await fetch(url, {
    ...rest,
    headers: { "Content-Type": "application/json", ...headers },
  });
  const payload = await response.json();
  return { response, payload };
}

function adminHeaders(state) {
  return {};
}

function createInitialState() {
  const next = cloneState(defaultState);
  seedLedger(next);
  refreshDerivedBalances(next);
  return next;
}

function getSelectedMarketFromState(state, marketId = state.selectedMarketId) {
  const merged = mergeGameMarkets(state.markets || [], state.liveGames || []);
  return merged.find((market) => market.id === marketId) ?? merged[0];
}

function addLedgerEntry(state, entry) {
  state.ledger.unshift(createLedgerEntry(entry));
}

function addLedgerEntries(state, entries) {
  state.ledger.unshift(...entries);
}

function refreshDerivedBalances(state) {
  state.currentUser.play_credit_balance =
    state.currentUser.withdrawable_balance + state.currentUser.bonus_balance;
  const currentUserIndex = state.users.findIndex((user) => user.id === state.currentUser.id);
  if (currentUserIndex >= 0) {
    state.users[currentUserIndex] = {
      ...state.users[currentUserIndex],
      withdrawable_balance: state.currentUser.withdrawable_balance,
      bonus_balance: state.currentUser.bonus_balance,
      risk_status: state.currentUser.settings.riskStatus,
    };
  }
}

function seedLedger(state) {
  if (state.currentUser.id === "user_1" && state.currentUser.withdrawable_balance === 100) {
    return;
  }

  if (state.ledger.length) {
    return;
  }

  const market = state.markets.find((item) => item.id === "market_1") ?? getSelectedMarketFromState(state);
  const example = calculatePayout({
    stake: 10,
    withdrawableShare: 6,
    bonusShare: 4,
    market,
    adminConfig: state.adminConfig,
  });

  state.ledger = [
    {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: "bet_1001",
      transaction_type: "debit",
      amount: 6,
      currency_type: "withdrawable",
      source: "bet_placed",
      timestamp: "2026-04-26T09:10:00Z",
      metadata: "Stake reserved from withdrawable balance",
    },
    {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: "bet_1001",
      transaction_type: "debit",
      amount: 4,
      currency_type: "bonus",
      source: "bet_placed",
      timestamp: "2026-04-26T09:10:00Z",
      metadata: "Stake reserved from bonus balance",
    },
    {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: "bet_1001",
      transaction_type: "credit",
      amount: example.totalWithdrawableReturn,
      currency_type: "withdrawable",
      source: "market_payout",
      timestamp: "2026-04-26T12:10:00Z",
      metadata: "Normal payout routed by withdrawable funding ratio",
    },
    {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: "bet_1001",
      transaction_type: "credit",
      amount: example.bonusPayoutFromNormal,
      currency_type: "bonus",
      source: "market_payout",
      timestamp: "2026-04-26T12:10:00Z",
      metadata: "Normal payout routed by bonus funding ratio",
    },
    {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: "bet_1001",
      transaction_type: "credit",
      amount: example.socialBonus,
      currency_type: "bonus",
      source: "social_boost",
      timestamp: "2026-04-26T12:10:00Z",
      metadata: `Boosted payout at ${example.multiplier.toFixed(2)}x; non-withdrawable bonus credit`,
    },
  ];
}

function getFriendBoostName(friend) {
  return friend.name.split(" ")[0];
}

function normalizeUsername(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");

  return cleaned ? `@${cleaned}` : "";
}

function nameFromUsername(username) {
  return username
    .slice(1)
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function addFunds(state, { amount, currencyType, source, metadata }) {
  if (currencyType === "withdrawable") {
    state.currentUser.withdrawable_balance += amount;
  } else {
    state.currentUser.bonus_balance += amount;
  }
  addLedgerEntry(state, createFundsCreditEntry({
    userId: state.currentUser.id,
    amount,
    currencyType,
    source,
    metadata,
  }));
  refreshDerivedBalances(state);
}

function getRiskLabel(score) {
  return getRiskBand(score).label;
}

export function FriendMarketProvider({ children }) {
  const [state, setState] = useState(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname() || "";
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const visibilityRefreshAt = useRef(0);

  useEffect(() => {
    let canceled = false;

    async function hydrateState() {
      let savedState = null;
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          savedState = mergeStoredState(JSON.parse(saved));
        }
      } catch {
        savedState = null;
      }

      try {
        const { response, payload } = await requestJson("/api/session");
        if (!response.ok || !payload.state) {
          throw new Error("Demo state API did not return state.");
        }

        if (!canceled) {
          const theme = savedState?.theme || mergeIncomingState(payload.state).theme;
          setState(buildStateFromSessionPayload(payload, theme, ""));
        }
      } catch {
        if (!canceled) {
          setState(savedState || createInitialState());
        }
      } finally {
        if (!canceled) {
          setHydrated(true);
        }
      }
    }

    hydrateState();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || typeof document === "undefined") {
      return undefined;
    }

    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      const now = Date.now();
      if (now - visibilityRefreshAt.current < 25_000) {
        return;
      }
      visibilityRefreshAt.current = now;

      void (async () => {
        try {
          const { response, payload } = await requestJson("/api/session");
          if (!response.ok || !payload.state) {
            return;
          }
          setState((prev) =>
            buildStateFromSessionPayload(payload, prev.theme, prev.flashMessage),
          );
          if (payload.sessionExpired && !isPublicAuthRoute(pathnameRef.current)) {
            router.push("/login?reason=session");
          }
        } catch {
          /* offline or API error */
        }
      })();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [hydrated, router]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const serializable = {
      ...state,
      flashMessage: "",
      mobileNavOpen: false,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }, [hydrated, state]);

  function updateState(mutator) {
    setState((previous) => {
      const next = cloneState(previous);
      mutator(next);
      return next;
    });
  }

  const actions = useMemo(
    () => ({
      dismissFlashMessage() {
        updateState((next) => {
          next.flashMessage = "";
        });
      },
      setFlashMessage(message) {
        updateState((next) => {
          next.flashMessage = message;
        });
      },
      toggleMobileNav() {
        updateState((next) => {
          next.mobileNavOpen = !next.mobileNavOpen;
        });
      },
      closeMobileNav() {
        updateState((next) => {
          next.mobileNavOpen = false;
        });
      },
      setTheme(theme) {
        updateState((next) => {
          next.theme = theme;
        });
      },
      updateFundingDraft(field, value) {
        updateState((next) => {
          next.fundingDrafts[field] = value;
        });
      },
      toggleTheme() {
        updateState((next) => {
          next.theme = next.theme === "dark" ? "light" : "dark";
        });
      },
      async toggleAdminMode(checked) {
        try {
          const { payload } = await requestJson("/api/session", {
            method: "PATCH",
            body: JSON.stringify({
              isAdmin: checked,
              userId: state.currentUser.id,
            }),
          });

          if (payload.state) {
            setState({
              ...payload.state,
              auth: buildAuthFromSessionPayload(payload, state.auth),
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local session display if the session API is unavailable.
        }

        updateState((next) => {
          next.currentUser.isAdmin = checked;
          next.flashMessage = checked ? "Demo admin mode enabled." : "Demo admin mode disabled.";
        });
      },
      async login(identifier, password) {
        const { response, payload } = await requestJson("/api/session", {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        });
        if (payload.state) {
          setState({
            ...payload.state,
            auth: buildAuthFromSessionPayload(payload, state.auth),
            theme: state.theme,
            flashMessage: payload.message,
            mobileNavOpen: false,
          });
        } else {
          updateState((next) => {
            next.flashMessage = payload.message || "Unable to sign in.";
          });
        }
        return response.ok;
      },
      async signup(account) {
        const { response, payload } = await requestJson("/api/session", {
          method: "POST",
          body: JSON.stringify({ ...account, mode: "signup" }),
        });
        if (payload.pending) {
          return { ok: true, pending: true, email: payload.email };
        }
        if (payload.state) {
          setState({
            ...payload.state,
            auth: buildAuthFromSessionPayload(payload, state.auth),
            theme: state.theme,
            flashMessage: payload.message,
            mobileNavOpen: false,
          });
        } else {
          updateState((next) => {
            next.flashMessage = payload.message || "Unable to create that account.";
          });
        }
        return response.ok ? { ok: true } : { ok: false, message: payload.message };
      },
      async logout() {
        const { response, payload } = await requestJson("/api/session", { method: "DELETE" });
        if (!response.ok) {
          updateState((next) => {
            next.flashMessage = payload?.message || "Sign out failed. Try again.";
          });
          return;
        }
        try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
        setState((prev) => ({
          ...defaultState,
          markets: prev.markets,
          liveGames: prev.liveGames,
          adminConfig: prev.adminConfig,
          theme: prev.theme,
          auth: { ...defaultState.auth, authenticated: false },
          currentUser: {
            ...defaultState.currentUser,
            id: "",
            name: "",
            email: "",
            username: "",
            withdrawable_balance: 0,
            bonus_balance: 0,
            play_credit_balance: 0,
          },
          friends: { list: [], pending: [] },
          portfolio: { openBets: [], pastBets: [] },
          ledger: [],
          users: [],
          pendingMarkets: [],
          flashMessage: "Signed out.",
          mobileNavOpen: false,
        }));
      },
      async refreshSessionFromServer() {
        try {
          const { response, payload } = await requestJson("/api/session");
          if (!response.ok || !payload.state) {
            return false;
          }
          setState((prev) =>
            buildStateFromSessionPayload(payload, prev.theme, prev.flashMessage),
          );
          if (payload.sessionExpired && !isPublicAuthRoute(pathnameRef.current)) {
            router.push("/login?reason=session");
          }
          return true;
        } catch {
          return false;
        }
      },
      setLiveGames(liveGames) {
        updateState((next) => {
          if (Array.isArray(liveGames)) {
            next.liveGames = liveGames;
          }
        });
      },
      setFilters(partial) {
        updateState((next) => {
          next.filters = { ...next.filters, ...partial };
        });
      },
      setLedgerFilter(filter) {
        updateState((next) => {
          next.ledgerFilter = filter;
        });
      },
      setSelectedMarket(marketId) {
        updateState((next) => {
          next.selectedMarketId = marketId;
        });
      },
      prepareBet(marketId, side) {
        updateState((next) => {
          next.selectedMarketId = marketId;
          next.betDraft.side = side;
          next.flashMessage = `Review your ${side} bet before placing it.`;
        });
      },
      updateBetDraft(field, value) {
        updateState((next) => {
          if (field === "side") {
            next.betDraft.side = value;
            return;
          }
          next.betDraft[field] = Number(value);
          const total =
            (Number(next.betDraft.withdrawableShare) || 0) +
            (Number(next.betDraft.bonusShare) || 0);
          if (field === "stake" && total !== next.betDraft.stake) {
            const desiredStake = Number(value) || 0;
            const currentWithdrawable = Math.min(desiredStake, next.betDraft.withdrawableShare);
            next.betDraft.withdrawableShare = currentWithdrawable;
            next.betDraft.bonusShare = Math.max(0, desiredStake - currentWithdrawable);
          }
        });
      },
      async placeBet(marketId, side) {
        try {
          const { payload } = await requestJson("/api/bets", {
            method: "POST",
            body: JSON.stringify({
              marketId,
              side,
              betDraft: { ...state.betDraft, side },
            }),
          });

          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          next.betDraft.side = side;
          next.selectedMarketId = marketId;
          const market = getSelectedMarketFromState(next, marketId);
          if (market.status && market.status !== "active") {
            next.flashMessage = `This market is ${market.status} and is not accepting bets.`;
            return;
          }
          const result = calculatePayout({
            stake: next.betDraft.stake,
            withdrawableShare: next.betDraft.withdrawableShare,
            bonusShare: next.betDraft.bonusShare,
            market,
            adminConfig: next.adminConfig,
          });

          if (result.totalStake <= 0) {
            next.flashMessage = "Enter a valid stake before placing a bet.";
            return;
          }

          if (
            result.withdrawableStake > next.currentUser.withdrawable_balance ||
            result.bonusStake > next.currentUser.bonus_balance
          ) {
            next.flashMessage = "Insufficient balance for this funding mix.";
            return;
          }

          next.currentUser.withdrawable_balance -= result.withdrawableStake;
          next.currentUser.bonus_balance -= result.bonusStake;
          const betId = `bet_${Date.now()}`;

          market.recentActivity.unshift({
            user: next.currentUser.name,
            action: `Bet ${side}`,
            amount: result.totalStake,
            time: "Just now",
          });
          next.portfolio.openBets.unshift({
            id: betId,
            marketId: market.id,
            market: market.title,
            side,
            stake: result.totalStake,
            status: "Open",
            funding: `${Math.round(result.withdrawableRatio * 100)}% withdrawable / ${Math.round(
              result.bonusRatio * 100,
            )}% bonus`,
            withdrawableStake: result.withdrawableStake,
            bonusStake: result.bonusStake,
            placedAt: new Date().toISOString().slice(0, 10),
          });
          addLedgerEntries(
            next,
            createBetLedgerEntries({
              userId: next.currentUser.id,
              marketId: market.id,
              betId,
              side,
              marketTitle: market.title,
              withdrawableStake: result.withdrawableStake,
              bonusStake: result.bonusStake,
            }),
          );
          next.flashMessage = `Placed a ${side} bet on "${market.title}" for ${money(result.totalStake)}.`;
          refreshDerivedBalances(next);
        });
      },
      updateCreateMarketDraft(field, value) {
        updateState((next) => {
          next.createMarketDraft[field] = value;
        });
      },
      async updateProfile(profile) {
        try {
          const { payload } = await requestJson("/api/profile", {
            method: "PATCH",
            body: JSON.stringify(profile),
          });
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return payload.ok;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        let ok = true;
        updateState((next) => {
          const cleanedName = String(profile.name || "").trim();
          const cleanedEmail = String(profile.email || "").trim().toLowerCase();
          if (cleanedName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
            next.flashMessage = "Enter a valid name and email address.";
            ok = false;
            return;
          }
          next.currentUser.name = cleanedName;
          next.currentUser.email = cleanedEmail;
          const user = next.users.find((item) => item.id === next.currentUser.id);
          if (user) {
            user.name = cleanedName;
          }
          next.flashMessage = "Profile updated.";
        });
        return ok;
      },
      async updateVerification(type) {
        try {
          const { payload } = await requestJson("/api/profile/verification", {
            method: "POST",
            body: JSON.stringify({ type }),
          });
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          if (type === "email" || type === "phone") {
            next.currentUser.settings[`${type}VerificationStatus`] = "verified";
            next.flashMessage = `${type} verification marked complete for the demo.`;
          } else {
            next.currentUser.settings[`${type}VerificationStatus`] = "placeholder";
            next.flashMessage = `${type} verification is reserved for a future real-money compliance provider.`;
          }
        });
      },
      async submitDispute({ marketId, betId, reason }) {
        try {
          const { payload } = await requestJson(`/api/markets/${marketId}/disputes`, {
            method: "POST",
            body: JSON.stringify({ betId, reason }),
          });
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return payload.ok;
          }
        } catch {
          // Fall through to a local notification when the dispute API is unavailable.
        }

        updateState((next) => {
          next.flashMessage = "Dispute captured for demo review.";
        });
        return true;
      },
      async createMarket() {
        try {
          const { payload } = await requestJson("/api/markets", {
            method: "POST",
            body: JSON.stringify({
              draft: state.createMarketDraft,
              userId: state.currentUser.id,
            }),
          });

          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const draft = next.createMarketDraft;
          if (!draft.title || !draft.description || !draft.closeDate) {
            next.flashMessage = "Please complete the market title, close date, and description.";
            return;
          }

          next.pendingMarkets.unshift({
            id: `pending_${Date.now()}`,
            title: draft.title,
            submittedBy: next.currentUser.username,
            createdAt: new Date().toISOString().slice(0, 10),
            category: draft.category,
            description: draft.description,
            closeDate: draft.closeDate,
            sourceUrl: draft.sourceUrl?.trim() || "",
          });
          next.createMarketDraft = {
            title: "",
            category: "Sports",
            closeDate: "",
            description: "",
            sourceUrl: "",
          };
          next.flashMessage = `Submitted "${draft.title}" for admin review.`;
        });
      },
      updateFriendInviteDraft(value) {
        updateState((next) => {
          next.friendInviteDraft = value;
        });
      },
      async sendFriendInvite(usernameOverride) {
        const inviteUsername = usernameOverride ?? state.friendInviteDraft;
        try {
          const { payload } = await requestJson("/api/friends/invites", {
            method: "POST",
            body: JSON.stringify({ username: inviteUsername }),
          });

          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const username = normalizeUsername(inviteUsername);

          if (!username) {
            next.flashMessage = "Enter a username to send an invite.";
            return;
          }

          if (username === next.currentUser.username.toLowerCase()) {
            next.flashMessage = "You cannot invite your own account.";
            return;
          }

          const alreadyFriend = next.friends.list.some(
            (friend) => friend.username.toLowerCase() === username,
          );
          const alreadyPending = next.friends.pending.some(
            (request) => request.username.toLowerCase() === username,
          );

          if (alreadyFriend || alreadyPending) {
            next.flashMessage = `${username} is already in your friend graph or pending queue.`;
            return;
          }

          next.friends.pending.unshift({
            name: nameFromUsername(username),
            username,
            direction: "outgoing",
          });
          next.friendInviteDraft = "";
          next.flashMessage = `Sent a friend invite to ${username}.`;
        });
      },
      async handleFriendRequest(username, action) {
        try {
          const { payload } = await requestJson("/api/friends/requests", {
            method: "POST",
            body: JSON.stringify({ username, action }),
          });

          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const request = next.friends.pending.find((item) => item.username === username);
          if (!request) {
            return;
          }

          next.friends.pending = next.friends.pending.filter((item) => item.username !== username);

          if (action === "accept" && request.direction === "incoming") {
            next.friends.list.unshift({
              name: request.name,
              username: request.username,
              boostCount: 0,
              status: "Trusted",
            });
            next.flashMessage = `Accepted ${request.username} as a friend.`;
          } else if (action === "decline") {
            next.flashMessage = `Declined ${request.username}'s friend request.`;
          } else {
            next.flashMessage = `Canceled the pending invite to ${request.username}.`;
          }
        });
      },
      async toggleFriendBoost(username) {
        try {
          const { payload } = await requestJson("/api/friends/boosts", {
            method: "POST",
            body: JSON.stringify({
              username,
              marketId: state.selectedMarketId,
            }),
          });

          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const friend = next.friends.list.find((item) => item.username === username);
          const market = getSelectedMarketFromState(next);

          if (!friend || !market) {
            return;
          }

          if (!next.adminConfig.socialBoostsEnabled) {
            next.flashMessage = "Social boosts are currently disabled by admin policy.";
            return;
          }

          const boostName = getFriendBoostName(friend);
          const isBoosting = market.friendGroup.includes(boostName);

          if (isBoosting) {
            market.friendGroup = market.friendGroup.filter((name) => name !== boostName);
            friend.boostCount = Math.max(0, friend.boostCount - 1);
            next.flashMessage = `${boostName} is no longer boosting "${market.title}".`;
          } else {
            if (market.friendGroup.length >= next.adminConfig.maxGroupSize) {
              next.flashMessage = `This market already has the max boost group size of ${next.adminConfig.maxGroupSize}.`;
              return;
            }

            market.friendGroup.push(boostName);
            friend.boostCount += 1;
            market.recentActivity.unshift({
              user: boostName,
              action: "Joined boost group",
              amount: 0,
              time: "Just now",
            });
            const matchingUser = next.users.find((user) => user.name === friend.name);
            const signals = getBoostRiskSignals({
              friend,
              market,
              markets: next.markets,
              adminConfig: next.adminConfig,
            });
            applyRiskSignalsToUser(matchingUser, signals);
            next.flashMessage = `${boostName} is now boosting "${market.title}".`;
          }

          market.friendsBoosting = market.friendGroup.length;
        });
      },
      async addDemoDeposit() {
        try {
          const { payload } = await requestJson("/api/admin/funds/deposit", {
            method: "POST",
            headers: adminHeaders(state),
          });
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          addFunds(next, {
            amount: 25,
            currencyType: "withdrawable",
            source: "deposit",
            metadata: "Demo play-money deposit",
          });
          next.flashMessage = "Added a $25 play-money deposit to withdrawable balance.";
        });
      },
      async addDeposit(amount = state.fundingDrafts.depositAmount, method = "bank") {
        try {
          const { response, payload } = await requestJson("/api/funds/deposit", {
            method: "POST",
            body: JSON.stringify({ amount, method }),
          });
          if (payload.ok === false && response.status !== 503) {
            updateState((next) => {
              next.flashMessage = payload.message || "Deposit could not be completed.";
            });
            return false;
          }
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return payload.ok;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        let ok = true;
        updateState((next) => {
          const depositAmount = Math.max(0, Number(amount) || 0);
          if (!depositAmount) {
            next.flashMessage = "Enter a deposit amount above zero.";
            ok = false;
            return;
          }
          addFunds(next, {
            amount: depositAmount,
            currencyType: "withdrawable",
            source: "deposit",
            metadata: "Demo deposit recorded from settings.",
          });
          next.flashMessage = `Added ${money(depositAmount)} to withdrawable balance.`;
        });
        return ok;
      },
      async requestWithdrawal(amount = state.fundingDrafts.withdrawAmount, method = "bank") {
        try {
          const { response, payload } = await requestJson("/api/funds/withdraw", {
            method: "POST",
            body: JSON.stringify({ amount, method }),
          });
          if (payload.ok === false && response.status !== 503) {
            updateState((next) => {
              next.flashMessage = payload.message || "Withdrawal could not be completed.";
            });
            return false;
          }
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return payload.ok;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        let ok = true;
        updateState((next) => {
          const withdrawalAmount = Math.max(0, Number(amount) || 0);
          if (!withdrawalAmount) {
            next.flashMessage = "Enter a withdrawal amount above zero.";
            ok = false;
            return;
          }
          if (withdrawalAmount > next.currentUser.withdrawable_balance) {
            next.flashMessage = "Withdrawal exceeds withdrawable balance.";
            ok = false;
            return;
          }
          next.currentUser.withdrawable_balance -= withdrawalAmount;
          addLedgerEntry(next, {
            user_id: next.currentUser.id,
            market_id: null,
            bet_id: null,
            transaction_type: "debit",
            amount: withdrawalAmount,
            currency_type: "withdrawable",
            source: "withdrawal",
            metadata: "Demo withdrawal request created from settings.",
          });
          refreshDerivedBalances(next);
          next.flashMessage = `Created a demo withdrawal for ${money(withdrawalAmount)}.`;
        });
        return ok;
      },
      async applyReferral(code = state.fundingDrafts.referralCode) {
        updateState((next) => {
          const normalizedCode = String(code || "").trim().toUpperCase();
          if (!normalizedCode) {
            next.flashMessage = "Enter a referral code.";
            return;
          }
          const reward = Number(next.referrals.reward || 10);
          next.currentUser.bonus_balance += reward;
          next.referrals.completedReferrals += 1;
          next.referrals.history.unshift({
            id: `ref_${Date.now()}`,
            friend: normalizedCode,
            status: "Reward paid",
            amount: reward,
            date: new Date().toISOString().slice(0, 10),
          });
          addLedgerEntry(next, {
            user_id: next.currentUser.id,
            market_id: null,
            bet_id: null,
            transaction_type: "credit",
            amount: reward,
            currency_type: "bonus",
            source: "referral_bonus",
            metadata: `Referral reward applied for code ${normalizedCode}.`,
          });
          refreshDerivedBalances(next);
          next.flashMessage = `Applied referral code ${normalizedCode} for ${money(reward)} bonus credit.`;
        });
      },
      async grantDemoBonus() {
        try {
          const { payload } = await requestJson("/api/admin/funds/bonus", {
            method: "POST",
            headers: adminHeaders(state),
          });
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          addFunds(next, {
            amount: 10,
            currencyType: "bonus",
            source: "admin_adjustment",
            metadata: "Demo admin bonus grant",
          });
          next.adminConfig.bonusLiability += 10;
          next.flashMessage = "Granted a $10 bonus credit and updated bonus liability.";
        });
      },
      async resetDemoState() {
        let next = createInitialState();
        try {
          const { payload } = await requestJson("/api/demo-state", { method: "DELETE" });
          if (payload.state) {
            next = { ...payload.state, auth: state.auth };
          }
        } catch {
          next = createInitialState();
        }
        next.flashMessage = "Demo state reset to the default sample data.";
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        setState(next);
      },
      async updateAdminConfig(field, value) {
        try {
          const { payload } = await requestJson("/api/admin/config", {
            method: "PATCH",
            headers: adminHeaders(state),
            body: JSON.stringify({ field, value }),
          });
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          next.adminConfig[field] = numericAdminFields.has(field) ? Number(value) : value;
          next.flashMessage = "Admin settings updated.";
        });
      },
      async approveMarket(pendingId) {
        try {
          const { payload } = await requestJson(`/api/admin/markets/${pendingId}/approve`, {
            method: "POST",
            headers: adminHeaders(state),
          });

          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const pending = next.pendingMarkets.find((market) => market.id === pendingId);
          if (!pending) {
            return;
          }

          const timestamp = Date.now();
          next.pendingMarkets = next.pendingMarkets.filter((market) => market.id !== pendingId);
          next.activeMarkets.unshift({
            id: `active_${timestamp}`,
            marketId: `market_${timestamp}`,
            title: pending.title,
            volume: 0,
            status: "Active",
          });
          const newMarketId = next.activeMarkets[0].marketId;
          const template = getResolutionTemplate(pending.category);
          next.markets.unshift({
            status: "active",
            id: newMarketId,
            title: pending.title,
            category: pending.category,
            volume: 0,
            endDate: pending.closeDate ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            closeTime: pending.closeDate ? `${pending.closeDate}T23:59:00Z` : null,
            settlementTime: null,
            yesPrice: 0.5,
            noPrice: 0.5,
            eligibleForBonus: next.adminConfig.bonusFundsEligibility === "all_markets",
            friendsBoosting: 0,
            friendGroup: [],
            resolutionTemplate: template.template,
            resolutionChecklist: template.checklist,
            evidenceLinks: [
              {
                label: template.evidenceSource,
                url: pending.sourceUrl || "",
                sourceType: pending.sourceUrl ? "submitted" : "planned",
              },
            ],
            description:
              pending.description ||
              "User-submitted market approved by an admin. Resolution criteria should be finalized before launch.",
            recentActivity: [],
          });
          next.flashMessage = `Approved "${pending.title}" and moved it to active markets.`;
        });
      },
      async rejectMarket(pendingId) {
        try {
          const { payload } = await requestJson(`/api/admin/markets/${pendingId}/reject`, {
            method: "POST",
            headers: adminHeaders(state),
          });

          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const pending = next.pendingMarkets.find((market) => market.id === pendingId);
          next.pendingMarkets = next.pendingMarkets.filter((market) => market.id !== pendingId);
          if (pending) {
            next.flashMessage = `Rejected "${pending.title}".`;
          }
        });
      },
      async updateMarketLifecycle(activeId, status) {
        try {
          const { payload } = await requestJson(`/api/admin/markets/${activeId}/lifecycle`, {
            method: "PATCH",
            headers: adminHeaders(state),
            body: JSON.stringify({ status }),
          });

          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const active = next.activeMarkets.find((market) => market.id === activeId);
          if (!active || !["active", "paused"].includes(status)) {
            next.flashMessage = "Market status change is not allowed.";
            return;
          }
          const market = next.markets.find(
            (item) => item.id === active.marketId || item.title === active.title,
          );
          if (market) {
            market.status = status;
          }
          active.status = status === "paused" ? "Paused" : "Active";
          next.flashMessage = `${active.title} is now ${status}.`;
        });
      },
      async resolveActiveMarket(activeId, result) {
        try {
          const { payload } = await requestJson(`/api/admin/markets/${activeId}/resolve`, {
            method: "POST",
            headers: adminHeaders(state),
            body: JSON.stringify({ result }),
          });

          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const active = next.activeMarkets.find((market) => market.id === activeId);
          next.activeMarkets = next.activeMarkets.filter((market) => market.id !== activeId);
          if (!active) {
            return;
          }

          const marketDetails = next.markets.find(
            (market) => market.id === active.marketId || market.title === active.title,
          );
          if (marketDetails) {
            marketDetails.status = result === "VOID" ? "voided" : "resolved";
            marketDetails.settlementTime = new Date().toISOString();
          }
          const matchingOpenBets = next.portfolio.openBets.filter(
            (bet) => bet.marketId === active.marketId || bet.market === active.title,
          );
          const unsettledOpenBets = next.portfolio.openBets.filter(
            (bet) => !(bet.marketId === active.marketId || bet.market === active.title),
          );

          matchingOpenBets.forEach((bet) => {
            if (result === "VOID" && marketDetails) {
              next.currentUser.withdrawable_balance += bet.withdrawableStake ?? 0;
              next.currentUser.bonus_balance += bet.bonusStake ?? 0;
              addLedgerEntries(
                next,
                createRefundLedgerEntries({
                  userId: next.currentUser.id,
                  market: marketDetails,
                  bet,
                }),
              );
              next.portfolio.pastBets.unshift({
                market: bet.market,
                side: bet.side,
                payout: bet.withdrawableStake ?? 0,
                boost: bet.bonusStake ?? 0,
                settlement: "Voided. Original withdrawable and bonus stakes were refunded.",
              });
              return;
            }

            if (bet.side === result && marketDetails) {
              const settlement = calculatePayout({
                stake: bet.stake,
                withdrawableShare: bet.withdrawableStake ?? bet.stake,
                bonusShare: bet.bonusStake ?? 0,
                market: marketDetails,
                adminConfig: next.adminConfig,
              });
              next.currentUser.withdrawable_balance += settlement.totalWithdrawableReturn;
              next.currentUser.bonus_balance += settlement.totalBonusReturn;
              addLedgerEntries(
                next,
                createSettlementLedgerEntries({
                  userId: next.currentUser.id,
                  market: marketDetails,
                  bet,
                  settlement,
                }),
              );
              next.portfolio.pastBets.unshift({
                market: bet.market,
                side: bet.side,
                payout: settlement.totalWithdrawableReturn,
                boost: settlement.totalBonusReturn - settlement.bonusPayoutFromNormal,
                settlement: `Won. ${money(settlement.totalWithdrawableReturn)} to withdrawable and ${money(
                  settlement.totalBonusReturn,
                )} to bonus.`,
              });
            } else {
              next.portfolio.pastBets.unshift({
                market: bet.market,
                side: bet.side,
                payout: 0,
                boost: 0,
                settlement: `Lost. No payout after resolution to ${result}.`,
              });
            }
          });

          next.portfolio.openBets = unsettledOpenBets;
          next.resolvedMarkets.unshift({
            id: `resolved_${Date.now()}`,
            title: active.title,
            result,
            resolvedAt: new Date().toISOString().slice(0, 10),
            resolverNotes:
              result === "VOID"
                ? "Voided through demo admin workflow and refunded original stakes."
                : `Resolved through demo admin workflow using ${marketDetails?.category ?? "market"} criteria.`,
            evidenceLinks: marketDetails?.evidenceLinks ?? [],
          });
          refreshDerivedBalances(next);
          next.flashMessage = `Resolved "${active.title}" as ${result}.`;
        });
      },
      async freezeUser(userId) {
        try {
          const { payload } = await requestJson(`/api/admin/users/${userId}/freeze`, {
            method: "POST",
            headers: adminHeaders(state),
          });
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const user = next.users.find((item) => item.id === userId);
          if (!user) {
            return;
          }

          user.frozen = !user.frozen;
          user.risk_status = user.frozen ? "frozen" : "review";
          if (user.id === next.currentUser.id) {
            next.currentUser.settings.riskStatus = user.risk_status;
          }
          addLedgerEntry(next, createAdminAdjustmentEntry({
            userId: user.id,
            amount: 0,
            metadata: user.frozen ? "Account frozen for manual review" : "Account unfrozen after review",
          }));
          next.flashMessage = `${user.name} is now ${user.frozen ? "frozen" : "unfrozen"}.`;
        });
      },
      async clearRiskReview(userId) {
        try {
          const { payload } = await requestJson(`/api/admin/users/${userId}/clear-risk`, {
            method: "POST",
            headers: adminHeaders(state),
          });
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const user = next.users.find((item) => item.id === userId);
          if (!user) {
            return;
          }

          user.risk_status = "clear";
          user.risk_score = Math.min(user.risk_score, 20);
          user.frozen = false;
          user.risk_signals = ["Manual review cleared"];
          if (user.id === next.currentUser.id) {
            next.currentUser.settings.riskStatus = "clear";
          }
          next.flashMessage = `${user.name} was cleared from the review queue.`;
        });
      },
      async removeUserBonus(userId) {
        try {
          const { payload } = await requestJson(`/api/admin/users/${userId}/bonus`, {
            method: "DELETE",
            headers: adminHeaders(state),
          });
          if (payload.state) {
            setState({
              ...payload.state,
              auth: state.auth,
              theme: state.theme,
              flashMessage: payload.message,
              mobileNavOpen: false,
            });
            return;
          }
        } catch {
          // Fall through to the local demo reducer when the API is unavailable.
        }

        updateState((next) => {
          const user = next.users.find((item) => item.id === userId);
          if (!user || user.bonus_balance <= 0) {
            return;
          }

          const amount = Math.min(10, user.bonus_balance);
          user.bonus_balance -= amount;
          next.adminConfig.bonusLiability = Math.max(0, next.adminConfig.bonusLiability - amount);
          if (user.id === next.currentUser.id) {
            next.currentUser.bonus_balance = user.bonus_balance;
            refreshDerivedBalances(next);
          }
          addLedgerEntry(next, createAdminAdjustmentEntry({
            userId: user.id,
            amount,
            transactionType: "debit",
            metadata: "Promotional bonus removed during manual review",
          }));
          next.flashMessage = `Removed ${money(amount)} of bonus balance from ${user.name}.`;
        });
      },
    }),
    [state],
  );

  useEffect(() => {
    if (!hydrated || !state.auth.authenticated || !state.auth.expiresAt) {
      return undefined;
    }

    const expiryMs = Date.parse(state.auth.expiresAt);
    if (!Number.isFinite(expiryMs)) {
      return undefined;
    }

    const warningAt = expiryMs - 15 * 60 * 1000;
    const nextCheckAt = state.auth.expiresSoon ? expiryMs + 500 : Math.max(Date.now() + 1000, warningAt);
    const delay = Math.max(1000, Math.min(nextCheckAt - Date.now(), 2_147_483_647));
    const timer = window.setTimeout(() => {
      void actions.refreshSessionFromServer();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [actions, hydrated, state.auth.authenticated, state.auth.expiresAt, state.auth.expiresSoon]);

  const selectors = useMemo(
    () => ({
      getMergedMarkets() {
        return mergeGameMarkets(state.markets || [], state.liveGames || []);
      },
      getSelectedMarket(marketId = state.selectedMarketId) {
        return getSelectedMarketFromState(state, marketId);
      },
      getLedgerEntries(filter = state.ledgerFilter) {
        const userLedger = state.ledger.filter((entry) => entry.user_id === state.currentUser.id);

        if (filter === "all") {
          return userLedger;
        }
        return userLedger.filter(
          (entry) => entry.currency_type === filter || entry.source === filter,
        );
      },
      getRiskLabel,
      getFriendBoostName,
    }),
    [state],
  );

  const value = useMemo(
    () => ({ state, hydrated, actions, selectors }),
    [actions, hydrated, selectors, state],
  );

  return <FriendMarketContext.Provider value={value}>{children}</FriendMarketContext.Provider>;
}

export function useFriendMarket() {
  const context = useContext(FriendMarketContext);
  if (!context) {
    throw new Error("useFriendMarket must be used within FriendMarketProvider");
  }
  return context;
}

