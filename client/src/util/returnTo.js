// Return-to redirect: remember the deep link a signed-out user asked for and restore it after sign-in.
const KEY = "returnTo";

export const saveReturnTo = (loc) => {
  try {
    const path = `${loc?.pathname || ""}${loc?.search || ""}${loc?.hash || ""}`;
    if (!path || path === "/" || /\/signin(\/|$|\?)/.test(path) || /\/dashboard\/?$/.test(path)) return;
    sessionStorage.setItem(KEY, path);
  } catch (e) { /* storage unavailable */ }
};

// Returns the saved path (only if it belongs to `slug`), else `fallback`. Not removed here: several
// redirects can fire during sign-in; App clears it once the user is signed in and off the sign-in page.
export const consumeReturnTo = (slug, fallback) => {
  try {
    const path = sessionStorage.getItem(KEY);
    if (path && slug && path.startsWith(`/${slug}/`)) return path;
  } catch (e) { /* storage unavailable */ }
  return fallback;
};

export const clearReturnTo = () => {
  try { sessionStorage.removeItem(KEY); } catch (e) { /* storage unavailable */ }
};
