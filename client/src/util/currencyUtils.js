import currenciesData from "../constants/currencies";
import { DEFAULT_CURRENCY } from "../appRedux/reducers/Common";

const FALLBACK_SYMBOL = "₹";

/** Symbol for an ISO 4217 code from the shared currency list (falls back to ₹). */
export const getCurrencySymbol = (currencyCode) => {
  const match = currenciesData.find((currency) => currency.code === String(currencyCode || "").toUpperCase());
  return match ? match.symbol : FALLBACK_SYMBOL;
};

/**
 * Company currency code for code that runs outside React components (chart
 * formatters, CSV builders…). The store is required lazily so this module
 * doesn't pull the whole store into every chunk that imports it.
 */
export const getAppCurrencyCode = () => {
  try {
    const store = require("../appRedux/store").default;
    return store.getState()?.common?.currency || DEFAULT_CURRENCY;
  } catch (e) {
    return DEFAULT_CURRENCY;
  }
};

export const getAppCurrencySymbol = () => getCurrencySymbol(getAppCurrencyCode());

/** Indian-style grouping (matches HRMS / Payroll); 0-2 decimals unless told otherwise. */
export const formatNumber = (value, { minFrac = 0, maxFrac = 2 } = {}) => {
  const number = Number(value);
  const safe = Number.isNaN(number) ? 0 : number;
  return safe.toLocaleString("en-IN", { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac });
};

/** `${symbol}${amount}` using the company currency, for use outside components. */
export const formatAppCurrency = (value, options) => `${getAppCurrencySymbol()}${formatNumber(value, options)}`;
