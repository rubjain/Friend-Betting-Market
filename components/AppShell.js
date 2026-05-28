"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAgora } from "../context/AgoraContext";
import { money } from "../lib/formatters";
import { buildNotifications, countActionableNotifications } from "../lib/notifications";
import LiveGamesPoller from "./LiveGamesPoller";
import { HydrateLoading } from "./ui";

const STANDALONE_AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/account-recovery",
  "/verify-email",
]);

function isStandaloneAuthRoute(pathname) {
  return Boolean(pathname && STANDALONE_AUTH_ROUTES.has(pathname));
}

/** Landing stays interactive; auth pages avoid blocking the forms. */
function shouldShowHydratePlaceholder(hydrated, pathname) {
  if (hydrated) return false;
  const path = pathname || "";
  if (!path || path === "/" || isStandaloneAuthRoute(path)) {
    return false;
  }
  return true;
}

const groupedRoutes = [
  {
    href: "/deposit",
    label: "Manage funds",
    items: [
      ["/deposit", "Deposit"],
      ["/withdraw", "Withdraw"],
    ],
  },
  {
    href: "/friends",
    label: "Social",
    items: [
      ["/friends", "Friends"],
      ["/groups", "Groups"],
    ],
  },
  {
    href: "/legal",
    label: "Legal",
    items: [
      ["/legal", "Terms"],
      ["/privacy", "Privacy"],
    ],
  },
];

const settingsRoutes = [
  ["/settings#account", "Account"],
  ["/settings#balances", "Balances"],
  ["/settings#appearance", "Appearance"],
  ["/settings#referrals", "Referrals"],
  ["/settings#ledger", "Transaction history"],
];

const navigationItems = [
  ["/markets", "Markets"],
  ["/portfolio", "Portfolio"],
  groupedRoutes[0],
  groupedRoutes[1],
  ["/leaderboard", "Leaderboard"],
  ["/create", "Create"],
  ["/developer", "Developer"],
  ["/profile", "Profile"],
  ["/faq", "FAQ"],
  groupedRoutes[2],
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, hydrated, actions } = useAgora();
  const showHydratePlaceholder = shouldShowHydratePlaceholder(hydrated, pathname);
  const [sessionPending, setSessionPending] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navCloseTimerRef = useRef(null);
  const openPositions = state.portfolio.openBets.filter((b) => !b.isPaper).length;
  const paperPositions = state.portfolio.openBets.filter((b) => b.isPaper).length;
  const notifications = useMemo(() => buildNotifications(state), [state]);
  const actionableNotificationCount = useMemo(
    () => countActionableNotifications(notifications),
    [notifications],
  );

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash.length <= 1) {
      return;
    }

    const legacyRoute = window.location.hash.slice(1);
    const routeMap = {
      landing: "/",
      markets: "/markets",
      "market-detail": `/markets/${state.selectedMarketId}`,
      friends: "/friends",
      groups: "/groups",
      feed: "/feed",
      portfolio: "/portfolio",
      deposit: "/deposit",
      withdraw: "/withdraw",
      create: "/create",
      profile: "/profile",
      admin: "/admin",
    };

    if (routeMap[legacyRoute]) {
      router.replace(routeMap[legacyRoute]);
    }
  }, [router, state.selectedMarketId]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (navCloseTimerRef.current) {
        window.clearTimeout(navCloseTimerRef.current);
      }
    };
  }, []);

  function isActive(path) {
    if (path === "/markets") {
      return pathname === "/markets" || pathname.startsWith("/markets/");
    }
    return pathname === path;
  }

  function isGroupActive(group) {
    return group.items.some(([path]) => isActive(path));
  }

  function handleAdminToggle(event) {
    const checked = event.currentTarget.checked;
    actions.toggleAdminMode(checked);
    if (!checked && pathname === "/admin") {
      router.push("/profile");
    }
  }

  async function logout() {
    if (sessionPending) return;
    setSessionPending(true);
    try {
      await actions.logout();
    } finally {
      setSessionPending(false);
    }
  }

  function closeNavigation() {
    if (navCloseTimerRef.current) {
      window.clearTimeout(navCloseTimerRef.current);
      navCloseTimerRef.current = null;
    }
    actions.closeMobileNav();
    setNavCollapsed(true);
  }

  function scheduleNavigationClose(delay = 320) {
    if (navCloseTimerRef.current) {
      window.clearTimeout(navCloseTimerRef.current);
    }
    navCloseTimerRef.current = window.setTimeout(() => {
      closeNavigation();
    }, delay);
  }

  return (
    <div className="shell" data-theme={state.theme}>
      <header className="site-header">
        <div className="nav-wrap">
          <button
            className="hamburger-button"
            type="button"
            aria-label={navCollapsed ? "Open navigation" : "Close navigation"}
            aria-expanded={!navCollapsed}
            onClick={() => setNavCollapsed((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
          <Link className="brand" href="/" onClick={() => scheduleNavigationClose()}>
            <div className="brand-mark">AG</div>
            <div className="brand-copy">
              <h1>Agora</h1>
              <p>Social markets desk</p>
            </div>
          </Link>
          <div className={`top-account-strip${state.paperMode ? " top-account-strip--paper" : ""}`} aria-label="Account summary">
            <div className="trading-mode-toggle" role="group" aria-label="Trading mode">
              <button
                className={`trading-mode-option${!state.paperMode ? " active" : ""}`}
                type="button"
                aria-pressed={!state.paperMode}
                onClick={() => {
                  if (state.paperMode) actions.togglePaperMode();
                }}
              >
                Real
              </button>
              <button
                className={`trading-mode-option${state.paperMode ? " active" : ""}`}
                type="button"
                aria-pressed={state.paperMode}
                onClick={() => {
                  if (!state.paperMode) actions.togglePaperMode();
                }}
              >
                Paper
              </button>
            </div>
            {state.auth.authenticated ? (
              <>
                <Link className="top-account-metric" href="/portfolio">
                  <span>{state.paperMode ? "Paper balance" : "Balance"}</span>
                  <strong>{state.paperMode ? money(state.currentUser.paper_balance ?? 0) : money(state.currentUser.play_credit_balance)}</strong>
                </Link>
                <Link className="top-account-metric" href="/portfolio">
                  <span>Positions</span>
                  <strong>{state.paperMode ? paperPositions : openPositions}</strong>
                </Link>
                {!state.paperMode ? (
                  <Link className="btn btn-primary top-deposit-button" href="/deposit">
                    Deposit
                  </Link>
                ) : null}
                <div className="notification-center">
                  <button
                    className="notification-button"
                    type="button"
                    aria-label={`${notifications.length} notifications`}
                    aria-expanded={notificationsOpen}
                    onClick={() => setNotificationsOpen((value) => !value)}
                  >
                    <span aria-hidden="true">!</span>
                    {actionableNotificationCount > 0 ? (
                      <strong>{actionableNotificationCount}</strong>
                    ) : null}
                  </button>
                  {notificationsOpen ? (
                    <div className="notification-menu" role="dialog" aria-label="Notifications">
                      <div className="notification-menu-head">
                        <span>Notifications</span>
                        <button
                          className="notification-menu-close"
                          type="button"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          Close
                        </button>
                      </div>
                      {notifications.length ? (
                        <div className="notification-list">
                          {notifications.map((item) => (
                            <Link
                              key={item.id}
                              className={`notification-item notification-item--${item.priority}`}
                              href={item.href}
                              onClick={() => setNotificationsOpen(false)}
                            >
                              <span className="notification-priority">{item.priority}</span>
                              <strong>{item.title}</strong>
                              <span>{item.body}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="notification-empty">
                          <strong>All clear</strong>
                          <span>No account, friend, or market alerts right now.</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
          <div className={`nav-actions ${navCollapsed ? "collapsed" : "expanded"}`}>
            <nav className={`nav-links ${state.mobileNavOpen ? "open" : ""}`} aria-label="Primary">
              <Link
                className={`nav-link ${pathname === "/" ? "active" : ""}`}
                href="/"
                aria-current={pathname === "/" ? "page" : undefined}
                onClick={() => scheduleNavigationClose()}
              >
                Home
              </Link>
              {navigationItems.map((item) => {
                if (Array.isArray(item)) {
                  const [path, label] = item;
                  return (
                    <Link
                      key={path}
                      className={`nav-link ${isActive(path) ? "active" : ""}`}
                      href={path}
                      aria-current={isActive(path) ? "page" : undefined}
                      onClick={() => scheduleNavigationClose()}
                    >
                      {label}
                    </Link>
                  );
                }

                const active = isGroupActive(item);
                return (
                  <div className="nav-flyout-item" key={item.label}>
                    <Link
                      className={`nav-link ${active ? "active" : ""}`}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => scheduleNavigationClose()}
                    >
                      {item.label}
                    </Link>
                    <div className="nav-flyout" aria-label={`${item.label} sections`}>
                      {item.items.map(([path, label]) => (
                        <Link className="nav-flyout-link" href={path} key={path} onClick={() => scheduleNavigationClose()}>
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="nav-flyout-item">
                <Link
                  className={`nav-link ${pathname === "/settings" ? "active" : ""}`}
                  href="/settings"
                  aria-current={pathname === "/settings" ? "page" : undefined}
                  onClick={() => scheduleNavigationClose()}
                >
                  Settings
                </Link>
                <div className="nav-flyout" aria-label="Settings sections">
                  {settingsRoutes.map(([path, label]) => (
                    <Link className="nav-flyout-link" href={path} key={path} onClick={() => scheduleNavigationClose()}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
              {state.currentUser.isAdmin ? (
                <Link
                  className={`nav-link admin-link ${pathname === "/admin" ? "active" : ""}`}
                  href="/admin"
                  aria-current={pathname === "/admin" ? "page" : undefined}
                  onClick={() => scheduleNavigationClose()}
                >
                  Admin
                </Link>
              ) : null}
            </nav>
            {state.auth.devAdminShortcut ? (
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={state.currentUser.isAdmin}
                  onChange={handleAdminToggle}
                />
                <span>Dev admin</span>
              </label>
            ) : null}
            {state.auth.authenticated ? (
              <button className="btn btn-ghost" type="button" disabled={sessionPending} onClick={logout}>
                {sessionPending ? "Logging out..." : "Log out"}
              </button>
            ) : (
              <Link className="btn btn-ghost" href="/login" onClick={() => scheduleNavigationClose()}>
                Log in
              </Link>
            )}
            <button
              className={`theme-switch ${state.theme === "dark" ? "theme-switch--dark" : "theme-switch--light"}`}
              type="button"
              role="switch"
              aria-checked={state.theme === "dark"}
              aria-label={state.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={state.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={actions.toggleTheme}
            >
              <span className="theme-switch-track" aria-hidden="true">
                <span className="theme-switch-icon theme-switch-icon--light">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
                  </svg>
                </span>
                <span className="theme-switch-icon theme-switch-icon--dark">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M19.5 14.4A7.8 7.8 0 0 1 9.6 4.5 8 8 0 1 0 19.5 14.4Z" />
                  </svg>
                </span>
                <span className="theme-switch-thumb" />
              </span>
            </button>
          </div>
        </div>
      </header>
      <main className={`page-wrap${state.paperMode ? " page-wrap--paper" : ""}`}>
        {state.paperMode ? (
          <div className="paper-mode-banner">
            <div className="paper-mode-banner-inner">
              <div className="paper-mode-banner-left">
                <span className="paper-mode-banner-pill">PAPER TRADING</span>
                <span className="paper-mode-banner-text">
                  You&apos;re in paper trading mode — no real money is at stake.
                  Practice strategies with <strong>{money(state.currentUser.paper_balance ?? 0)}</strong> virtual balance.
                </span>
              </div>
              <div className="paper-mode-banner-actions">
                <button className="btn btn-ghost paper-mode-reset" type="button" onClick={actions.resetPaperBalance}>
                  Reset balance
                </button>
                <button className="btn paper-mode-exit" type="button" onClick={actions.togglePaperMode}>
                  Exit paper mode
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {state.flashMessage ? (
          <div className="note-banner flash-banner">
            <div className="row-between">
              <span>{state.flashMessage}</span>
              <button className="btn btn-ghost" type="button" onClick={actions.dismissFlashMessage}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        {showHydratePlaceholder ? <HydrateLoading /> : children}
      </main>
      <LiveGamesPoller />
      <footer className="footer-wrap">
        <p>Agora keeps market prices, balances, boosts, and audit state in one workspace.</p>
        <nav className="footer-legal-nav" aria-label="Legal and help">
          <Link href="/faq">FAQ</Link>
          <Link href="/legal">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
