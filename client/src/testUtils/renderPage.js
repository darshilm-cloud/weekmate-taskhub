/**
 * Shared harness for rendering whole page components.
 *
 * These pages assume the full app shell - redux store, react-intl, a router with
 * :companySlug, and the socket context. Recreating that in every suite is noise,
 * so it lives here. Test files still declare their own jest.mock for the service
 * layer, since what each page fetches differs.
 */
import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route } from "react-router-dom";
import store from "../appRedux/store";
import AppLocale from "../lngProvider";

/** A Service.makeAPICall stub that answers every endpoint with an empty list. */
export const emptyApiResponse = () =>
  Promise.resolve({ status: 200, data: { status: 1, data: [], metadata: {} } });

/**
 * Route an api_url to a canned payload.
 *   apiRouter({ '/task/list': { data: { data: [task] } } })
 * Anything unmatched falls back to an empty success.
 */
export const apiRouter = (routes = {}) => ({ api_url }) => {
  for (const [key, value] of Object.entries(routes)) {
    if (String(api_url).includes(key)) {
      return Promise.resolve(
        typeof value === "function" ? value(api_url) : value
      );
    }
  }
  return emptyApiResponse();
};

export const renderPage = (ui, { route = "/acme/page", path = "/:companySlug/*" } = {}) => {
  const en = AppLocale.en;
  return render(
    <Provider store={store}>
      <IntlProvider locale={en.locale} messages={en.messages}>
        <MemoryRouter initialEntries={[route]}>
          <Route path={path} render={() => ui} />
        </MemoryRouter>
      </IntlProvider>
    </Provider>
  );
};

export default renderPage;
