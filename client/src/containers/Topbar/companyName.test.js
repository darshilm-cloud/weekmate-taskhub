/**
 * Topbar company-name resolution.
 *
 * The header must show the human-readable company name ("Acme Corp"), not the
 * URL slug ("acme-corp"). The name comes from the logged-in user payload in
 * `user_data`, falling back to the cached `title-<slug>` and then to blank.
 * These are the new-code lines Sonar flags, including the JSON.parse catch arm.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../service', () => ({
  __esModule: true,
  default: {
    getMethod: 'GET',
    postMethod: 'POST',
    projectList: '/project/list',
    makeAPICall: jest.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

// eslint-disable-next-line import/first
import store from '../../appRedux/store';
// eslint-disable-next-line import/first
import AppLocale from '../../lngProvider';
// eslint-disable-next-line import/first
import Topbar from './index';

const renderTopbar = () => {
  const en = AppLocale.en;
  return render(
    <Provider store={store}>
      <IntlProvider locale={en.locale} messages={en.messages}>
        <MemoryRouter initialEntries={['/acme/dashboard']}>
          <Topbar />
        </MemoryRouter>
      </IntlProvider>
    </Provider>
  );
};

beforeEach(() => {
  localStorage.clear();
});

it('shows the human-readable company name from the user payload', async () => {
  localStorage.setItem('companyDomain', 'acme');
  localStorage.setItem(
    'user_data',
    JSON.stringify({ companyDetails: { companyName: 'Acme Corp' } })
  );
  renderTopbar();
  expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
  // The slug must not be what the user sees.
  expect(screen.queryByText('acme')).toBeNull();
});

it('falls back to the cached company title when the payload has no name', async () => {
  localStorage.setItem('companyDomain', 'acme');
  localStorage.setItem('user_data', JSON.stringify({ companyDetails: {} }));
  localStorage.setItem('title-acme', 'Cached Acme Title');
  renderTopbar();
  expect(await screen.findByText('Cached Acme Title')).toBeInTheDocument();
});

it('renders without a company name when nothing is stored', async () => {
  const { container } = renderTopbar();
  await waitFor(() => expect(container.querySelector('header')).not.toBeNull());
  expect(screen.queryByText('Acme Corp')).toBeNull();
});

it('resolves to a blank name when the payload has no usable name anywhere', async () => {
  localStorage.setItem('companyDomain', 'acme');
  localStorage.setItem('user_data', JSON.stringify({ companyDetails: {} }));
  // No title-acme cached either, so the whole fallback chain yields "".
  const { container } = renderTopbar();
  await waitFor(() => expect(container.querySelector('header')).not.toBeNull());
  expect(screen.queryByText('Acme Corp')).toBeNull();
});

/**
 * KNOWN BUG, asserted deliberately so a fix trips this test.
 *
 * Topbar's own company-name lookup is defensive - it wraps JSON.parse in
 * try/catch and returns "" - but a descendant reads `user_data` without one, so
 * corrupt JSON still takes the header down. Note that the widespread
 * `JSON.parse(localStorage.getItem("user_data") || "{}")` idiom does NOT help
 * here: the `|| "{}"` only guards a MISSING value, not a malformed one.
 *
 * When the unguarded read is fixed, change this to assert the header renders.
 */
it('still throws on corrupt user_data because a child parses it unguarded', () => {
  localStorage.setItem('companyDomain', 'acme');
  localStorage.setItem('user_data', '{ this is not json');
  expect(() => renderTopbar()).toThrow(/JSON/i);
});
