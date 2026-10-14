import React, { useCallback, useRef, useState } from "react";
import ExportColumnsModal from "../components/common/ExportColumnsModal";

/**
 * Opens the "Select Columns for … Export" dialog before an export runs.
 *
 *   const { requestExport, exportColumnsModal } = useExportColumns();
 *   requestExport({ title, columns: [{ key, label }], onExport: (keys) => … });
 *   …
 *   {exportColumnsModal}
 *
 * The last selection per title is remembered while the page stays mounted.
 */
const useExportColumns = () => {
  const [config, setConfig] = useState(null);
  const [open, setOpen] = useState(false);
  const rememberedRef = useRef({});

  const requestExport = useCallback((nextConfig) => {
    setConfig(nextConfig);
    setOpen(true);
  }, []);

  const handleExport = (keys) => {
    const rememberKey = config.rememberKey || config.title;
    rememberedRef.current[rememberKey] = keys;
    setOpen(false);
    config.onExport(keys);
  };

  const exportColumnsModal = config ? (
    <ExportColumnsModal
      open={open}
      title={config.title}
      columns={config.columns}
      okText={config.okText}
      initialKeys={rememberedRef.current[config.rememberKey || config.title]}
      onCancel={() => setOpen(false)}
      onExport={handleExport}
    />
  ) : null;

  return { requestExport, exportColumnsModal };
};

/**
 * Turns column specs ({ key, label, value(item) }) into CSV headers + rows,
 * keeping only the chosen keys.
 */
export const buildExportRows = (columns, keys, items) => {
  const picked = columns.filter((col) => keys.includes(col.key));
  return {
    headers: picked.map((col) => col.label),
    rows: items.map((item, index) => picked.map((col) => col.value(item, index))),
  };
};

/** The { key, label } list the dialog shows, from column specs. */
export const toExportOptions = (columns) => columns.map(({ key, label }) => ({ key, label }));

export default useExportColumns;
