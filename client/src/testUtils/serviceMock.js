/**
 * Service layer mock for page tests.
 *
 * Deliberately dependency-free: jest.mock factories are hoisted above imports,
 * so anything required from inside one must not pull in React or the store.
 *
 * Every endpoint constant resolves to "/<name>" via a proxy. Listing them by
 * hand means any one you miss becomes `api_url: undefined`, which matches no
 * route and makes the page look broken for the wrong reason.
 *
 *   jest.mock('../../service', () => require('../../testUtils/serviceMock')());
 */
module.exports = () => ({
  __esModule: true,
  default: new Proxy(
    { makeAPICall: jest.fn() },
    { get: (target, key) => (key in target ? target[key] : `/${String(key)}`) }
  ),
});
