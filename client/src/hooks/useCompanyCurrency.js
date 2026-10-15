import { useSelector } from "react-redux";
import { DEFAULT_CURRENCY } from "../appRedux/reducers/Common";
import { getCurrencySymbol, formatNumber } from "../util/currencyUtils";

/**
 * Company-wide currency from Redux (Company Profile → Currency). Same API as
 * WeekMate HRMS / Payroll's hook so the products format money alike.
 * @returns {{ currencyCode: string, currencySymbol: string, formatNumber: Function, formatAmount: Function }}
 */
const useCompanyCurrency = () => {
  const currencyCode = useSelector(({ common }) => common?.currency || DEFAULT_CURRENCY);
  const currencySymbol = getCurrencySymbol(currencyCode);
  const formatAmount = (value, options) => `${currencySymbol}${formatNumber(value, options)}`;
  return { currencyCode, currencySymbol, formatNumber, formatAmount };
};

export default useCompanyCurrency;
