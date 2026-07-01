// Shared cross-product SSO cookie helper.
//
// All connected WeekMate apps (Registration, HRMS, Payroll, CRM, TaskHub,
// Econnect) write a single slim SSO token to one cookie (`wm_shared_token`). In
// production every app is served under `*.weekmate.in`, so the cookie is scoped
// to the parent domain and is readable by every sibling app — log into one and
// the others auto-login.
//
// In local dev each app runs on a different `localhost` port. Leaving
// REACT_APP_SSO_COOKIE_DOMAIN unset makes the cookie host-only on `localhost`,
// which (unlike localStorage) IS shared across ports — so the flow is testable
// locally.
const COOKIE_NAME = "wm_shared_token";
const LOGOUT_GUARD = "sso_logout_pending";
// Set in this app's localStorage whenever it publishes the shared cookie, so
// single-logout detection only tears down sessions that actually joined
// cross-product SSO — a login that returns no ssoToken never sets this and is
// therefore never auto-logged-out.
const PUBLISHED_FLAG = "sso_cookie_published";
// Persist the shared cookie for 30 days (instead of a session cookie) so a full
// browser restart keeps the user signed in; only an explicit logout, which calls
// clearSharedSso(), removes it.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const COOKIE_DOMAIN = process.env.REACT_APP_SSO_COOKIE_DOMAIN || "";

const isSecure = () => window.location.protocol === "https:";

export const setSharedSso = (token) => {
  if (!token) return;
  let cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  if (COOKIE_DOMAIN) cookie += `; domain=${COOKIE_DOMAIN}`;
  if (isSecure()) cookie += "; Secure";
  document.cookie = cookie;
  // Mark this session as part of cross-product SSO so single-logout detection can
  // tell "a sibling logged out" (cookie was published, now gone) apart from "this
  // session never had a shared cookie".
  try {
    localStorage.setItem(PUBLISHED_FLAG, "1");
  } catch (e) {
    /* ignore */
  }
};

export const getSharedSso = () => {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : undefined;
};

export const clearSharedSso = () => {
  // Expire the cookie using the same domain/path it was written with.
  let cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (COOKIE_DOMAIN) cookie += `; domain=${COOKIE_DOMAIN}`;
  document.cookie = cookie;
  // Guard so this app's own freshly-cleared cookie can't immediately re-trigger
  // its auto-login bootstrap in the same tab.
  try {
    sessionStorage.setItem(LOGOUT_GUARD, "true");
    setTimeout(() => sessionStorage.removeItem(LOGOUT_GUARD), 5000);
  } catch (e) {
    /* ignore */
  }
};

export const isLogoutPending = () => {
  try {
    return sessionStorage.getItem(LOGOUT_GUARD) === "true";
  } catch (e) {
    return false;
  }
};

// Decode a slim cross-product SSO token (JWT) and return its user email,
// lowercased, or null. The token payload shape is
// `{ user: { email, companyId, isAdmin }, source }`. No signature check is done
// here (the server still verifies on exchange) — this is only used to detect
// when the shared cookie now belongs to a DIFFERENT account than this app's
// local session, so a stale session can be switched to the new user.
export const getSsoEmail = (token) => {
  if (!token || typeof token !== "string") return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(json);
    const email = payload?.user?.email || payload?.email;
    return email ? String(email).toLowerCase() : null;
  } catch (e) {
    return null;
  }
};

// Cross-product single logout. Watches for a sibling WeekMate app logging out —
// which removes the shared `wm_shared_token` cookie — and tears down this app's
// session too. The check runs immediately on mount, on a short polling interval,
// AND on tab visibility/focus. Polling the cookie is the only signal shared
// across the `*.weekmate.in` subdomains, and running on mount + interval catches
// what a focus-only listener misses: fresh page loads, same-tab redirects, and
// tabs that stay visible the whole time (side-by-side windows).
//
//  - hasLocalSession(): whether this app currently has a local session.
//  - onLogout(): tear the local session down (dispatch signOut, redirect, ...).
// Returns a cleanup function that detaches the interval and listeners.
export const startSsoLogoutWatch = ({ hasLocalSession, onLogout, intervalMs = 2000 }) => {
  let stopped = false;
  const check = (slide) => {
    if (stopped || isLogoutPending()) return;
    if (typeof hasLocalSession !== "function" || !hasLocalSession()) return;
    const cookie = getSharedSso();
    if (cookie) {
      // Still signed in somewhere. On mount/refocus, re-write the cookie to slide
      // its expiry forward so a long-lived tab never loses it to natural expiry
      // (which would otherwise look like a sibling logout).
      if (slide) setSharedSso(cookie);
      return;
    }
    let published = false;
    try {
      published = !!localStorage.getItem(PUBLISHED_FLAG);
    } catch (e) {
      /* ignore */
    }
    if (published && typeof onLogout === "function") onLogout();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") check(true);
  };
  check(true);
  const timer = setInterval(() => check(false), intervalMs);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
  };
};
