/**
 * apiClient - the shared axios instance and its interceptors.
 *
 * _fetchClientIp() runs a real fetch() at module load time, so fetch is
 * mocked before the module is required. Both interceptors are registered
 * once at import time; tested by pulling them off apiClient.interceptors
 * directly rather than making real network calls.
 */
jest.mock('../hooks/removeCookie', () => jest.fn());

const originalLocation = window.location;

beforeEach(() => {
  jest.resetModules();
  // CRA's jest config resets mocks between tests, which wipes the
  // implementation set at module load below - re-set it fresh each time,
  // before the module (which calls fetch() at import time) is re-required.
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ ip: '1.2.3.4' }) })
  );
  localStorage.clear();
  delete window.location;
  window.location = { ...originalLocation, href: '' };
});

afterAll(() => {
  window.location = originalLocation;
});

describe('request interceptor', () => {
  test('attaches the bearer token and platform header when logged in', async () => {
    localStorage.setItem('accessToken', 'tok-123');
    const { apiClient } = require('./apiClient');
    const [onFulfilled] = apiClient.interceptors.request.handlers.map((h) => h.fulfilled);
    const config = onFulfilled({ headers: {} });
    expect(config.headers.authorization).toBe('Bearer tok-123');
    expect(config.headers.platform).toBe('web-admin');
  });

  test('omits the authorization header when logged out', async () => {
    const { apiClient } = require('./apiClient');
    const [onFulfilled] = apiClient.interceptors.request.handlers.map((h) => h.fulfilled);
    const config = onFulfilled({ headers: {} });
    expect(config.headers.authorization).toBeUndefined();
    expect(config.headers.platform).toBe('web-admin');
  });
});

describe('response interceptor', () => {
  test('passes a successful response straight through', () => {
    const { apiClient } = require('./apiClient');
    const [onFulfilled] = apiClient.interceptors.response.handlers.map((h) => h.fulfilled);
    const response = { status: 200 };
    expect(onFulfilled(response)).toBe(response);
  });

  test('a 401 logs the user out: clears storage and redirects to /signin', async () => {
    const { apiClient } = require('./apiClient');
    const removeCookie = require('../hooks/removeCookie');
    localStorage.setItem('accessToken', 'tok-123');
    localStorage.setItem('user_data', '{}');

    const [onRejected] = apiClient.interceptors.response.handlers.map((h) => h.rejected);
    await expect(
      onRejected({ response: { status: 401 } })
    ).rejects.toBeDefined();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('user_data')).toBeNull();
    expect(removeCookie).toHaveBeenCalledWith('user_permission');
    expect(window.location).toBe('/signin');
  });

  test('a plain network error (no response) is rejected without logging out', async () => {
    const { apiClient } = require('./apiClient');
    const [onRejected] = apiClient.interceptors.response.handlers.map((h) => h.rejected);
    localStorage.setItem('accessToken', 'still-here');
    await expect(onRejected({ message: 'Network Error' })).rejects.toBeDefined();
    expect(localStorage.getItem('accessToken')).toBe('still-here');
  });
});
