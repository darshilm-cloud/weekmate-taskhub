const escapeCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

/** Downloads headers + rows as a UTF-8 CSV (with BOM so Excel keeps ₹, accents…). */
export const downloadCsv = (headers, rows, filename) => {
  const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Downloads a server-rendered `<table>` as an .xls workbook — the same Excel
 * HTML wrapper react-html-table-to-excel uses, without a hidden DOM table.
 */
export const downloadHtmlTableXls = (tableHtml, filename) => {
  const workbook =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>' +
    "<x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>" +
    "</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>" +
    `<body>${tableHtml}</body></html>`;
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Plain text from rich-text (CKEditor) HTML. */
export const htmlToText = (html) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(String(html), "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
};
