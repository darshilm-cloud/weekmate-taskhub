/**
 * Cross-product SSO session behaviour in containers/App.
 *
 * Two effects are under test, both flagged as uncovered new code:
 *  - the user-switch check: if the shared cookie now belongs to a DIFFERENT
 *    account than this tab's session, wipe the local session and reload.
 *  - the single-logout watch: if this tab has a session but the shared cookie
 *    has vanished (a sibling app logged out), tear the local session down.
 *
 * Driven through NextApp so the real Provider/Router wiring is exercised rather
 * than a hand-rolled harness.
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import NextApp from '../../NextApp';
import { setSharedSso, clearSharedSso } from '../../util/ssoCookie';

const b64url = (obj) =>
  Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
const tokenFor = (email) => `h.${b64url({ user: { email } })}.s`;

const clearCookies = () => {
  document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter(Boolean)
    .forEach((n) => {
      document.cookie = `${n}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
};

const realLocation = window.location;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearCookies();
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  });
  window.history.pushState({}, '', '/');
});

/**
 * Stub only window.location.reload. Replacing the whole object with a POJO
 * would make window.location.pathname stale, which is exactly what the
 * single-logout redirect assertions read - so those tests keep the real one.
 */
const stubReload = () => {
  const reload = jest.fn();
  Object.defineProperty(window, 'location', {
    value: { ...realLocation, protocol: 'http:', reload },
    writable: true,
    configurable: true,
  });
  return reload;
};

describe('cross-product user switch', () => {
  let reload;
  beforeEach(() => {
    reload = stubReload();
  });

  it('clears the local session and reloads when the shared cookie belongs to another account', async () => {
    localStorage.setItem('accessToken', 'local-access');
    localStorage.setItem('ssoToken', tokenFor('first@elsner.com'));
    setSharedSso(tokenFor('second@elsner.com'));

    render(<NextApp />);
    await waitFor(() => expect(reload).toHaveBeenCalled());
    // The session is gone but the shared cookie must survive, so the SignIn
    // bootstrap can immediately log in as the cookie's user.
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(document.cookie).toContain('wm_shared_token=');
  });

  it('leaves the session alone when the cookie belongs to the same account', async () => {
    localStorage.setItem('accessToken', 'local-access');
    localStorage.setItem('ssoToken', tokenFor('same@elsner.com'));
    setSharedSso(tokenFor('same@elsner.com'));

    render(<NextApp />);
    await new Promise((r) => setTimeout(r, 50));
    expect(reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('accessToken')).toBe('local-access');
  });

  it('is case-insensitive, so a differently-cased same address is not a switch', async () => {
    localStorage.setItem('accessToken', 'local-access');
    localStorage.setItem('ssoToken', tokenFor('Mixed@Elsner.com'));
    setSharedSso(tokenFor('mixed@elsner.com'));

    render(<NextApp />);
    await new Promise((r) => setTimeout(r, 50));
    expect(reload).not.toHaveBeenCalled();
  });

  it('derives the local identity from user_data when no local ssoToken is stored', async () => {
    localStorage.setItem('accessToken', 'local-access');
    localStorage.setItem('user_data', JSON.stringify({ email: 'FromUserData@elsner.com' }));
    setSharedSso(tokenFor('someone.else@elsner.com'));

    render(<NextApp />);
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it('tolerates unparseable user_data instead of throwing', async () => {
    localStorage.setItem('accessToken', 'local-access');
    localStorage.setItem('user_data', '{not json');
    setSharedSso(tokenFor('someone@elsner.com'));

    expect(() => render(<NextApp />)).not.toThrow();
    await new Promise((r) => setTimeout(r, 50));
    // No local identity could be determined, so no switch is inferred.
    expect(reload).not.toHaveBeenCalled();
  });

  it('does nothing when this tab has no local session', async () => {
    setSharedSso(tokenFor('someone@elsner.com'));
    render(<NextApp />);
    await new Promise((r) => setTimeout(r, 50));
    expect(reload).not.toHaveBeenCalled();
  });

  it('does nothing when there is no shared cookie', async () => {
    localStorage.setItem('accessToken', 'local-access');
    localStorage.setItem('ssoToken', tokenFor('a@elsner.com'));
    render(<NextApp />);
    await new Promise((r) => setTimeout(r, 50));
    expect(reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('accessToken')).toBe('local-access');
  });

  it('stands down while a logout is pending in this tab', async () => {
    localStorage.setItem('accessToken', 'local-access');
    localStorage.setItem('ssoToken', tokenFor('a@elsner.com'));
    setSharedSso(tokenFor('b@elsner.com'));
    clearSharedSso();                 // raises the logout guard
    setSharedSso(tokenFor('b@elsner.com')); // cookie back, guard still up

    render(<NextApp />);
    await new Promise((r) => setTimeout(r, 50));
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not switch when the shared token cannot be decoded', async () => {
    localStorage.setItem('accessToken', 'local-access');
    localStorage.setItem('ssoToken', tokenFor('a@elsner.com'));
    setSharedSso('not-a-jwt');
    render(<NextApp />);
    await new Promise((r) => setTimeout(r, 50));
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('cross-product single logout', () => {
  // Assert on the navigation the logout handler performs, not on the final URL:
  // once redirected, SignIn's own bootstrap may navigate again, so the end state
  // is not a stable signal for which branch ran.
  let pushSpy;
  beforeEach(() => {
    pushSpy = jest.spyOn(window.history, 'pushState');
  });
  afterEach(() => pushSpy.mockRestore());

  const pushedPaths = () =>
    pushSpy.mock.calls.map((c) => String(c[2] ?? '')).filter(Boolean);

  const simulateSiblingLogout = async () => {
    await act(async () => {
      clearCookies();
      await new Promise((r) => setTimeout(r, 2500));
    });
  };

  it('drops the local session and redirects to the company sign-in page', async () => {
    localStorage.setItem('accessToken', 'local-access');
    localStorage.setItem('companyDomain', 'acme');
    setSharedSso(tokenFor('a@elsner.com'));   // marks this session SSO-published

    render(<NextApp />);
    await simulateSiblingLogout();
    await waitFor(() => expect(pushedPaths()).toContain('/acme/signin'));
  });

  it('redirects to the bare sign-in path when no company slug is stored', async () => {
    localStorage.setItem('accessToken', 'local-access');
    setSharedSso(tokenFor('a@elsner.com'));

    render(<NextApp />);
    await simulateSiblingLogout();
    await waitFor(() => expect(pushedPaths()).toContain('/signin'));
  });

  it('leaves a session that never joined cross-product SSO untouched', async () => {
    localStorage.setItem('accessToken', 'local-access');
    localStorage.setItem('companyDomain', 'acme');
    // No setSharedSso() -> no published flag -> this session is not part of SSO.

    render(<NextApp />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2500));
    });
    // The session must survive. Note we do NOT assert on navigation here: the
    // normal route guard also redirects an unauthenticated render to
    // /acme/signin, so a push there is not evidence of an SSO logout. Session
    // teardown is the only signal that distinguishes the two.
    expect(localStorage.getItem('accessToken')).toBe('local-access');
  });
});
