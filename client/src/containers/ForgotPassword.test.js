/**
 * ForgotPassword resolves the company slug from storage first, falling back to
 * the route param - the new-code line Sonar flags.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route } from 'react-router-dom';

jest.mock('../service/index', () => ({
  __esModule: true,
  default: {
    postMethod: 'POST',
    forgetPasswordV2: '/authentication/forget-password',
    makeAPICall: jest.fn(),
  },
}));

// eslint-disable-next-line import/first
import Service from '../service/index';
// eslint-disable-next-line import/first
import store from '../appRedux/store';
// eslint-disable-next-line import/first
import AppLocale from '../lngProvider';
// eslint-disable-next-line import/first
import ForgotPassword from './ForgotPassword';

const renderForgot = (routeSlug = 'from-route') => {
  const en = AppLocale.en;
  render(
    <Provider store={store}>
      <IntlProvider locale={en.locale} messages={en.messages}>
        <MemoryRouter initialEntries={[`/${routeSlug}/forgot-password`]}>
          <Route path="/:companySlug/forgot-password" component={ForgotPassword} />
        </MemoryRouter>
      </IntlProvider>
    </Provider>
  );
};

beforeEach(() => {
  Service.makeAPICall.mockReset();
  Service.makeAPICall.mockResolvedValue({ data: { status: 1, message: 'Sent' } });
  localStorage.clear();
});

const submitEmail = async () => {
  fireEvent.change(await screen.findByPlaceholderText(/email/i), {
    target: { value: 'kunal@elsner.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send|submit|reset/i }));
};

it('renders the reset form', async () => {
  renderForgot();
  expect(await screen.findByPlaceholderText(/email/i)).toBeInTheDocument();
});

it('prefers the stored companyDomain over the route param', async () => {
  localStorage.setItem('companyDomain', 'stored-slug');
  renderForgot('from-route');
  await submitEmail();
  await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
  const body = Service.makeAPICall.mock.calls[0][0].body;
  expect(JSON.stringify(body)).toContain('stored-slug');
  expect(JSON.stringify(body)).not.toContain('from-route');
});

it('falls back to the route param when nothing is stored', async () => {
  renderForgot('from-route');
  await submitEmail();
  await waitFor(() => expect(Service.makeAPICall).toHaveBeenCalled());
  expect(JSON.stringify(Service.makeAPICall.mock.calls[0][0].body)).toContain('from-route');
});
