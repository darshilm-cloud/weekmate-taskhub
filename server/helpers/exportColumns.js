/**
 * Column picking for exports. Clients send the labels ticked in their
 * "Select Columns for … Export" dialog as `columns` (body array, or a
 * comma-separated query string for GET exports).
 */

// Reads `columns` off the request and removes it from the body, so the
// listing validators the export reuses don't reject it as an unknown key.
const takeExportColumns = (req) => {
  let columns = req.body?.columns ?? req.query?.columns;
  if (req.body && "columns" in req.body) delete req.body.columns;
  if (typeof columns === "string") columns = columns.split(",").map((label) => label.trim());
  return Array.isArray(columns) ? columns.filter((label) => typeof label === "string" && label) : [];
};

// The specs ({ label, value }) whose label was requested, in spec order.
// Nothing (or nothing recognised) requested means every column.
const pickExportColumns = (allColumns, requested = []) => {
  const picked = allColumns.filter((column) => requested.includes(column.label));
  return picked.length ? picked : allColumns;
};

const renderHeaderRow = (columns, leading = "") =>
  `<tr>${leading}${columns.map((column) => `<th>${column.label}</th>`).join("")}</tr>`;

const renderRow = (columns, item, leading = "") =>
  `<tr>${leading}${columns.map((column) => `<td>${column.value(item) ?? ""}</td>`).join("")}</tr>`;

module.exports = { takeExportColumns, pickExportColumns, renderHeaderRow, renderRow };
