/**
 * SignIn login paths.
 *
 * Covers the new-code branches Sonar flags: the credential login success path,
 * the JWT redirect login (?token=), the cross-product cookie auto-login, and
 * the Client vs non-Client destination split - plus the failure and throw arms.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

jest.mock('../service/index', () => ({
  __esModule: true,
  default: {
    postMethod: 'POST',
    login: '/authentication/login',
    loginWithHRMSRedirect: '/authentication/redirectToBack',
    makeAPICall: jest.fn(),
  },
}));

// eslint-disable-next-line import/first
import Service from '../service/index';
// eslint-disable-next-line import/first
import store from '../appRedux/store';
// eslint-disable-next-line import/first
import SignIn from './SignIn';
// eslint-disable-next-line import/first
import { setSharedSso, clearSharedSso, getSharedSso } from '../util/ssoCookie';
// eslint-disable-next-line import/first
import AppLocale from '../lngProvider';

const CLIENT_ROLE_ID = '662763e8c9f7fe9f0f916a5d';
const ADMIN_ROLE_ID = '662763dfc9f7fe9f0f916a51';

const userPayload = {
  auth_token: 'auth-tok',
  ssoToken: 'sso-tok',
  user: {
    email: 'kunal@elsner.com',
    companyDetails: {
      companyDomain: 'acme',
      companyLogoUrl: 'https://cdn/logo.png',
      companyFavIcoUrl: 'https://cdn/fav.ico',
      companyName: 'Acme Corp',
    },
  },
};

const okResponse = (roleId = ADMIN_ROLE_ID) => ({
  data: { status: 1, message: 'Welcome', data: userPayload, permissions: [1, 2], pms_role_id: roleId },
});

const clearCookies = () => {
  document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter(Boolean)
    .forEach((n) => {
      document.cookie = `${n}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
};

const renderSignIn = ({ slug = 'acme', search = '' } = {}) => {
  const seen = [];
  // SignIn renders <IntlMessages>, so an IntlProvider must be in the ancestry -
  // in the real app containers/App supplies it.
  const en = AppLocale.en;
  render(
    <Provider store={store}>
      <IntlProvider locale={en.locale} messages={en.messages}>
        <MemoryRouter initialEntries={[`/${slug}/signin${search}`]}>
          <Route path="/:companySlug/signin" component={SignIn} />
          <Route
            path="*"
            render={({ location }) => {
              seen.push(location.pathname);
              return null;
            }}
          />
        </MemoryRouter>
      </IntlProvider>
    </Provider>
  );
  return { visited: () => seen };
};

const submitCredentials = async () => {
  fireEvent.change(await screen.findByPlaceholderText(/email/i), {
    target: { value: '  kunal@elsner.com  ' },
  });
  fireEvent.change(screen.getByPlaceholderText(/password/i), {
    target: { value: '  hunter2  ' },
  });
  fireEvent.click(screen.getByRole('button', { name: /sign in|login/i }));
};

beforeEach(() => {
  Service.makeAPICall.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  clearCookies();
});

describe('credential login', () => {
  it('persists the session, publishes the shared SSO cookie and lands on the dashboard', async () => {
    Service.makeAPICall.mockResolvedValue(okResponse());
    const { visited } = renderSignIn();
    await submitCredentials();

    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
    expect(Service.makeAPICall).toHaveBeenCalledWith({
      methodName: 'POST',
      api_url: '/authentication/login',
      // Credentials must be trimmed before they reach the API.
      body: { email: 'kunal@elsner.com', password: 'hunter2', slug: 'acme' },
    });

    await waitFor(() => expect(localStorage.getItem('accessToken')).toBe('auth-tok'));
    expect(JSON.parse(localStorage.getItem('user_data')).email).toBe('kunal@elsner.com');
    expect(localStorage.getItem('ssoToken')).toBe('sso-tok');
    expect(localStorage.getItem('companyDomain')).toBe('acme');
    expect(localStorage.getItem('companyLogoUrl-acme')).toBe('https://cdn/logo.png');
    expect(localStorage.getItem('companyFavIcoUrl-acme')).toBe('https://cdn/fav.ico');
    // The shared cookie is what lets sibling WeekMate apps auto-login.
    expect(getSharedSso()).toBe('sso-tok');
    await waitFor(() => expect(visited()).toContain('/acme/dashboard'));
  });

  it('sends a Client to the project list instead of the dashboard', async () => {
    Service.makeAPICall.mockResolvedValue(okResponse(CLIENT_ROLE_ID));
    const { visited } = renderSignIn();
    await submitCredentials();
    await waitFor(() => expect(visited()).toContain('/acme/project-list'));
  });

  it('does not create a session when the API reports failure', async () => {
    Service.makeAPICall.mockResolvedValue({ data: { status: 0, message: 'Bad credentials' } });
    renderSignIn();
    await submitCredentials();
    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(getSharedSso()).toBeUndefined();
  });

  it('swallows a network error without creating a session', async () => {
    Service.makeAPICall.mockRejectedValue(new Error('network down'));
    renderSignIn();
    await submitCredentials();
    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});

describe('JWT redirect login (?token=)', () => {
  it('exchanges a token from the query string and signs in', async () => {
    Service.makeAPICall.mockResolvedValue(okResponse());
    const { visited } = renderSignIn({ search: '?token=incoming-jwt' });

    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
    expect(Service.makeAPICall).toHaveBeenCalledWith({
      methodName: 'POST',
      api_url: '/authentication/redirectToBack',
      body: { token: 'incoming-jwt' },
    });
    await waitFor(() => expect(localStorage.getItem('accessToken')).toBe('auth-tok'));
    // The redirect flow also caches the company title, which the plain login does not.
    expect(localStorage.getItem('title-acme')).toBe('Acme Corp');
    await waitFor(() => expect(visited()).toContain('/acme/dashboard'));
  });

  it('does not exchange the token when a session already exists', async () => {
    localStorage.setItem('accessToken', 'already-signed-in');
    renderSignIn({ search: '?token=incoming-jwt' });
    await new Promise((r) => setTimeout(r, 50));
    expect(Service.makeAPICall).not.toHaveBeenCalled();
  });

  it('reports a rejected token exchange without creating a session', async () => {
    Service.makeAPICall.mockResolvedValue({ data: { status: 0 } });
    renderSignIn({ search: '?token=bad-jwt' });
    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('survives the token exchange throwing', async () => {
    Service.makeAPICall.mockRejectedValue(new Error('500'));
    renderSignIn({ search: '?token=bad-jwt' });
    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});

describe('cross-product cookie auto-login', () => {
  it('auto-logs-in from an existing shared cookie when there is no local session', async () => {
    setSharedSso('sibling-sso-token');
    Service.makeAPICall.mockResolvedValue(okResponse());
    renderSignIn();

    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
    expect(Service.makeAPICall).toHaveBeenCalledWith({
      methodName: 'POST',
      api_url: '/authentication/redirectToBack',
      body: { token: 'sibling-sso-token' },
    });
  });

  it('does not auto-login while a logout is pending in this tab', async () => {
    setSharedSso('sibling-sso-token');
    clearSharedSso();                        // raises the guard, clears the cookie
    setSharedSso('sibling-sso-token');       // cookie back, guard still raised
    renderSignIn();
    await new Promise((r) => setTimeout(r, 50));
    expect(Service.makeAPICall).not.toHaveBeenCalled();
  });

  it('does not auto-login when there is no shared cookie', async () => {
    renderSignIn();
    await new Promise((r) => setTimeout(r, 50));
    expect(Service.makeAPICall).not.toHaveBeenCalled();
  });

  it('prefers an explicit ?token= over the shared cookie', async () => {
    setSharedSso('cookie-token');
    Service.makeAPICall.mockResolvedValue(okResponse());
    renderSignIn({ search: '?token=url-token' });
    await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalledTimes(1));
    expect(Service.makeAPICall).toHaveBeenCalledWith(
      expect.objectContaining({ body: { token: 'url-token' } })
    );
  });
});
