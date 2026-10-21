/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

clientsClaim();

// Precache build assets injected by CRA (InjectManifest).
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback: serve index.html for app routes, never for API/socket/static files.
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  new NavigationRoute(createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html'), {
    denylist: [/^\/api\//, /^\/socket\.io\//, /^\/uploads\//, fileExtensionRegexp],
  })
);

// API GET calls (API host is injected at build time from REACT_APP_API_URL):
// network first, fall back to cache when offline.
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.REACT_APP_API_URL || '/', self.location.origin).origin;
  } catch (e) {
    return self.location.origin;
  }
})();
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.origin === API_ORIGIN &&
    (url.pathname.startsWith('/v1/') || url.pathname.startsWith('/api/')),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 }),
    ],
  })
);

// Images and fonts: stale-while-revalidate.
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Google Fonts (if used).
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// Allow the page to trigger immediate activation of a waiting worker.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
