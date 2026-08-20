// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom does not implement window.matchMedia, but antd's responsive Grid/Row/Col
// and ConfigProvider call it during render, so any component tree containing them
// throws "window.matchMedia is not a function" without this shim.
// Reports "does not match" for every query, i.e. the default desktop breakpoint.
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},        // deprecated, still used by older antd
      removeListener: () => {},     // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom has no layout engine, so ResizeObserver is absent. antd's Table, Select
// and Tooltip observe element size on mount.
if (typeof window.ResizeObserver !== 'function') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// These suites mount real application trees (antd + redux + router), which take
// several seconds each. Run in parallel by Jest they contend for CPU and blow
// through the 5s default - the assertions are unchanged, the renders are simply
// slower under load. CRA rejects `testTimeout` in package.json (it is not on its
// supported-keys whitelist and any unknown key exits the runner), so it is set
// here instead.
// jsdom does not provide the Web Crypto API. Real browsers always do in a secure
// context (https or localhost), so this shim is test-only - it lets code that
// correctly uses a CSPRNG for credentials run under jest.
if (typeof window.crypto === 'undefined' || !window.crypto.getRandomValues) {
  const { webcrypto } = require('crypto');
  Object.defineProperty(window, 'crypto', {
    configurable: true,
    writable: true,
    value: webcrypto,
  });
}

jest.setTimeout(30000);
