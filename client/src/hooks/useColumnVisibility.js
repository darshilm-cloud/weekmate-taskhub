import { useState, useEffect, useCallback, useMemo } from "react";
import { message } from "antd";
import Service from "../service";

const colKeyOf = (col) => col.key || col.dataIndex;

/**
 * Server-backed column visibility for a listing table (same flow as HRMS's
 * hooks/useColumnVisibility). The saved selection belongs to the logged-in
 * user and is keyed by `pageKey`: one GET on mount, one PUT per Save.
 *
 * @param {string} pageKey unique per listing table, e.g. "complaints"
 * @param {Array} columns full list of the table's antd columns (each needs `key` or `dataIndex`)
 * @param {string[]} defaultHiddenKeys columns hidden until the user saves a selection
 * @param {string[]} alwaysVisibleKeys columns that can never be hidden (also not offered in the dropdown)
 */
const useColumnVisibility = (pageKey, columns, defaultHiddenKeys = [], alwaysVisibleKeys = []) => {
  const allKeys = useMemo(() => columns.map(colKeyOf).filter(Boolean), [columns]);
  const lockedKey = alwaysVisibleKeys.join(",");

  const defaultKeys = useMemo(
    () => allKeys.filter((k) => !defaultHiddenKeys.includes(k) || alwaysVisibleKeys.includes(k)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allKeys, defaultHiddenKeys.join(","), lockedKey]
  );

  // null = nothing saved yet, so the page's defaults apply.
  const [savedKeys, setSavedKeys] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // A different page (e.g. another tab/report type on the same mounted
    // component) must not inherit the previous page's saved selection.
    setSavedKeys(null);
    (async () => {
      try {
        const response = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: `${Service.columnPreference}/${pageKey}`,
        });
        const saved = response?.data?.data?.visibleColumns;
        if (isMounted && Array.isArray(saved) && saved.length > 0) setSavedKeys(saved);
      } catch (error) {
        // A convenience, not a critical path - fall back to the defaults.
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [pageKey]);

  // Saved keys are re-filtered against the current columns, so a column that
  // was removed or renamed since the user saved simply drops out.
  const visibleKeys = useMemo(
    () =>
      savedKeys
        ? allKeys.filter((k) => savedKeys.includes(k) || alwaysVisibleKeys.includes(k))
        : defaultKeys,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedKeys, allKeys, defaultKeys, lockedKey]
  );

  const saveVisibleKeys = useCallback(
    async (newKeys) => {
      setSaving(true);
      try {
        const response = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: `${Service.columnPreference}/${pageKey}`,
          body: { visibleColumns: newKeys },
        });
        if (response?.data?.status === 1) {
          setSavedKeys(newKeys);
          message.success("Column preference saved");
        } else {
          message.error(response?.data?.message || "Could not save column preference");
        }
      } catch (error) {
        message.error("Could not save column preference");
      } finally {
        setSaving(false);
      }
    },
    [pageKey]
  );

  const filteredColumns = useMemo(
    () =>
      columns.filter((col) => {
        const k = colKeyOf(col);
        return !k || visibleKeys.includes(k) || alwaysVisibleKeys.includes(k);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, visibleKeys, lockedKey]
  );

  return { visibleKeys, saveVisibleKeys, filteredColumns, saving };
};

export default useColumnVisibility;
