/**
 * Behaviour tests for the cross-product SSO cookie helper.
 *
 * Targets the branches Sonar counts as uncovered new code: the secure/insecure
 * cookie flags, the storage-throws paths, the base64url token decode and its
 * malformed-input fallbacks, and each decision arm of startSsoLogoutWatch.
 */

const COOKIE_NAME = 'wm_shared_token';
const LOGOUT_GUARD = 'sso_logout_pending';
const PUBLISHED_FLAG = 'sso_cookie_published';

/** Build a slim SSO token: base64url payload in JWT position 2. */
const makeToken = (payload) => {
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${b64}.signature`;
};

/** Load the module fresh so its module-level env/const reads re-evaluate. */
const loadModule = ({ domain, protocol = 'http:' } = {}) => {
  jest.resetModules();
  if (domain === undefined) delete process.env.REACT_APP_SSO_COOKIE_DOMAIN;
  else process.env.REACT_APP_SSO_COOKIE_DOMAIN = domain;
  Object.defineProperty(window, 'location', {
    value: { ...window.location, protocol, href: `${protocol}//localhost/` },
    writable: true,
    configurable: true,
  });
  // eslint-disable-next-line global-require
  return require('./ssoCookie');
};

const clearCookies = () => {
  document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter(Boolean)
    .forEach((name) => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
};

beforeEach(() => {
  clearCookies();
  localStorage.clear();
  sessionStorage.clear();
});

describe('setSharedSso', () => {
  it('writes the shared cookie and marks the session as SSO-published', () => {
    const { setSharedSso, getSharedSso } = loadModule();
    setSharedSso('abc123');
    expect(getSharedSso()).toBe('abc123');
    expect(localStorage.getItem(PUBLISHED_FLAG)).toBe('1');
  });

  it('ignores a falsy token entirely, leaving no cookie and no flag', () => {
    const { setSharedSso, getSharedSso } = loadModule();
    setSharedSso('');
    setSharedSso(undefined);
    setSharedSso(null);
    expect(getSharedSso()).toBeUndefined();
    expect(localStorage.getItem(PUBLISHED_FLAG)).toBeNull();
  });

  it('url-encodes a token containing cookie-hostile characters and round-trips it', () => {
    const { setSharedSso, getSharedSso } = loadModule();
    const nasty = 'a b;c=d,e';
    setSharedSso(nasty);
    // The raw cookie must not contain the delimiters that would split the value.
    expect(document.cookie).toContain(encodeURIComponent(nasty).split(';')[0]);
    expect(getSharedSso()).toBe(nasty);
  });

  it('omits the Secure attribute over http', () => {
    const mod = loadModule({ protocol: 'http:' });
    const spy = jest.spyOn(document, 'cookie', 'set');
    mod.setSharedSso('t');
    expect(spy.mock.calls[0][0]).not.toMatch(/;\s*Secure/);
    spy.mockRestore();
  });

  it('adds the Secure attribute over https', () => {
    const mod = loadModule({ protocol: 'https:' });
    const spy = jest.spyOn(document, 'cookie', 'set');
    mod.setSharedSso('t');
    expect(spy.mock.calls[0][0]).toMatch(/;\s*Secure/);
    spy.mockRestore();
  });

  it('scopes the cookie to the parent domain when one is configured', () => {
    const mod = loadModule({ domain: '.weekmate.in' });
    const spy = jest.spyOn(document, 'cookie', 'set');
    mod.setSharedSso('t');
    expect(spy.mock.calls[0][0]).toContain('domain=.weekmate.in');
    spy.mockRestore();
  });

  it('still writes the cookie when localStorage throws', () => {
    const mod = loadModule();
    const spy = jest
      .spyOn(window.localStorage.__proto__, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });
    expect(() => mod.setSharedSso('tok')).not.toThrow();
    expect(mod.getSharedSso()).toBe('tok');
    spy.mockRestore();
  });
});

describe('getSharedSso', () => {
  it('returns undefined when the cookie is absent', () => {
    const { getSharedSso } = loadModule();
    expect(getSharedSso()).toBeUndefined();
  });

  it('reads its own cookie even when other cookies surround it', () => {
    const { getSharedSso } = loadModule();
    document.cookie = 'other=1; path=/';
    document.cookie = `${COOKIE_NAME}=mine; path=/`;
    document.cookie = 'trailing=2; path=/';
    expect(getSharedSso()).toBe('mine');
  });

  it('does not match a cookie whose name merely ends with the shared name', () => {
    const { getSharedSso } = loadModule();
    document.cookie = `not_${COOKIE_NAME}=decoy; path=/`;
    expect(getSharedSso()).toBeUndefined();
  });
});

describe('clearSharedSso', () => {
  it('removes the cookie and raises the logout guard', () => {
    const { setSharedSso, clearSharedSso, getSharedSso, isLogoutPending } = loadModule();
    setSharedSso('tok');
    clearSharedSso();
    expect(getSharedSso()).toBeUndefined();
    expect(isLogoutPending()).toBe(true);
  });

  it('drops the guard after its timeout so later logins are not blocked', () => {
    jest.useFakeTimers();
    const { clearSharedSso, isLogoutPending } = loadModule();
    clearSharedSso();
    expect(isLogoutPending()).toBe(true);
    jest.advanceTimersByTime(5000);
    expect(isLogoutPending()).toBe(false);
    jest.useRealTimers();
  });

  it('expires the cookie on the configured domain, matching how it was written', () => {
    const mod = loadModule({ domain: '.weekmate.in' });
    const spy = jest.spyOn(document, 'cookie', 'set');
    mod.clearSharedSso();
    expect(spy.mock.calls[0][0]).toContain('domain=.weekmate.in');
    expect(spy.mock.calls[0][0]).toContain('expires=Thu, 01 Jan 1970');
    spy.mockRestore();
  });

  it('does not throw when sessionStorage is unavailable', () => {
    const mod = loadModule();
    const spy = jest
      .spyOn(window.sessionStorage.__proto__, 'setItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    expect(() => mod.clearSharedSso()).not.toThrow();
    spy.mockRestore();
  });
});

describe('isLogoutPending', () => {
  it('is false with no guard set', () => {
    expect(loadModule().isLogoutPending()).toBe(false);
  });

  it('is false for a non-"true" guard value', () => {
    const mod = loadModule();
    sessionStorage.setItem(LOGOUT_GUARD, 'yes');
    expect(mod.isLogoutPending()).toBe(false);
  });

  it('reports false rather than throwing when sessionStorage reads fail', () => {
    const mod = loadModule();
    const spy = jest
      .spyOn(window.sessionStorage.__proto__, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    expect(mod.isLogoutPending()).toBe(false);
    spy.mockRestore();
  });
});

describe('getSsoEmail', () => {
  it('extracts and lowercases the email from the nested user payload', () => {
    const { getSsoEmail } = loadModule();
    const token = makeToken({ user: { email: 'Kunal@Elsner.COM', isAdmin: true }, source: 'hrms' });
    expect(getSsoEmail(token)).toBe('kunal@elsner.com');
  });

  it('falls back to a top-level email claim', () => {
    const { getSsoEmail } = loadModule();
    expect(getSsoEmail(makeToken({ email: 'Flat@Example.com' }))).toBe('flat@example.com');
  });

  it('decodes base64url payloads containing - and _ and non-ASCII text', () => {
    const { getSsoEmail } = loadModule();
    const token = makeToken({ user: { email: 'ünïcode@tëst.com', note: '???<>~' } });
    expect(getSsoEmail(token)).toBe('ünïcode@tëst.com');
  });

  it('coerces a non-string email claim instead of crashing', () => {
    const { getSsoEmail } = loadModule();
    expect(getSsoEmail(makeToken({ user: { email: 12345 } }))).toBe('12345');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['a number', 1234],
    ['an object', { email: 'x@y.com' }],
    ['a token with no payload segment', 'headeronly'],
    ['a token with an empty payload segment', 'header..sig'],
    ['a token whose payload is not base64', 'header.!!!not-base64!!!.sig'],
    ['a token whose payload is not JSON', `header.${Buffer.from('plain text').toString('base64')}.sig`],
  ])('returns null for %s', (_label, input) => {
    const { getSsoEmail } = loadModule();
    expect(getSsoEmail(input)).toBeNull();
  });

  it('returns null when the payload carries no email at all', () => {
    const { getSsoEmail } = loadModule();
    expect(getSsoEmail(makeToken({ user: { companyId: 'c1' } }))).toBeNull();
  });
});

describe('startSsoLogoutWatch', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('logs out when a sibling app removed a cookie this app had published', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');           // publishes -> sets PUBLISHED_FLAG
    clearCookies();                     // sibling logout: cookie gone, flag remains
    const onLogout = jest.fn();
    const stop = mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout });
    expect(onLogout).toHaveBeenCalledTimes(1);
    stop();
  });

  it('does not log out a session that never joined cross-product SSO', () => {
    const mod = loadModule();
    const onLogout = jest.fn();
    const stop = mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout });
    expect(onLogout).not.toHaveBeenCalled();
    stop();
  });

  it('does nothing when there is no local session to tear down', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');
    clearCookies();
    const onLogout = jest.fn();
    const stop = mod.startSsoLogoutWatch({ hasLocalSession: () => false, onLogout });
    jest.advanceTimersByTime(10000);
    expect(onLogout).not.toHaveBeenCalled();
    stop();
  });

  it('treats a missing hasLocalSession callback as "no session"', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');
    clearCookies();
    const onLogout = jest.fn();
    const stop = mod.startSsoLogoutWatch({ onLogout });
    jest.advanceTimersByTime(4000);
    expect(onLogout).not.toHaveBeenCalled();
    stop();
  });

  it('stays quiet while the logout guard is raised', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');
    mod.clearSharedSso();               // raises guard AND removes cookie
    const onLogout = jest.fn();
    const stop = mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout });
    jest.advanceTimersByTime(4000);
    expect(onLogout).not.toHaveBeenCalled();
    stop();
  });

  it('slides the cookie expiry on mount while still signed in', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');
    const spy = jest.spyOn(document, 'cookie', 'set');
    const stop = mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout: jest.fn() });
    // The mount check passes slide=true, which re-writes the cookie.
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(`${COOKIE_NAME}=tok`));
    spy.mockRestore();
    stop();
  });

  it('does not re-write the cookie on the polling tick (slide=false)', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');
    const stop = mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout: jest.fn() });
    const spy = jest.spyOn(document, 'cookie', 'set');
    jest.advanceTimersByTime(2000);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    stop();
  });

  it('detects the logout on a later polling tick, honouring intervalMs', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');
    const onLogout = jest.fn();
    const stop = mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout, intervalMs: 500 });
    expect(onLogout).not.toHaveBeenCalled();
    clearCookies();
    jest.advanceTimersByTime(499);
    expect(onLogout).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
    stop();
  });

  it('re-checks when the tab becomes visible again', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');
    clearCookies();
    const onLogout = jest.fn();
    const stop = mod.startSsoLogoutWatch({ hasLocalSession: () => false, onLogout });
    onLogout.mockClear();

    // Now grant a local session and fire the visibility signal.
    stop();
    const stop2 = mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout: jest.fn() });
    stop2();

    const onLogout2 = jest.fn();
    let visible = 'hidden';
    Object.defineProperty(document, 'visibilityState', {
      get: () => visible,
      configurable: true,
    });
    const stop3 = mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout: onLogout2 });
    onLogout2.mockClear();
    visible = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onLogout2).toHaveBeenCalled();
    stop3();
  });

  it('ignores a visibilitychange that reports the tab as hidden', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');
    clearCookies();
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'hidden',
      configurable: true,
    });
    const onLogout = jest.fn();
    const stop = mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout });
    onLogout.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onLogout).not.toHaveBeenCalled();
    stop();
  });

  it('stops polling and detaches listeners after cleanup', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');
    const onLogout = jest.fn();
    const stop = mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout });
    stop();
    clearCookies();
    jest.advanceTimersByTime(20000);
    window.dispatchEvent(new Event('focus'));
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('tolerates localStorage throwing while reading the published flag', () => {
    const mod = loadModule();
    mod.setSharedSso('tok');
    clearCookies();
    const spy = jest
      .spyOn(window.localStorage.__proto__, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    const onLogout = jest.fn();
    expect(() =>
      mod.startSsoLogoutWatch({ hasLocalSession: () => true, onLogout })()
    ).not.toThrow();
    expect(onLogout).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
