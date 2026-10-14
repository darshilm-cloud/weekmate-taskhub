const moment = require("moment");
const { pickExportColumns } = require("../helpers/exportColumns");

// Shared by the "My Logged Time" exports (grouped by date / by project).
// The first, unlabelled column holds the group heading (date or project).
const COLUMNS = [
  { label: "Created By", value: (entry) => entry?.createdBy?.full_name || " - " },
  { label: "Date", value: (entry) => moment(entry?.logged_date).format("DD MMM YYYY") || " - " },
  { label: "Project", value: (entry) => entry?.projectDetails?.title || " - " },
  { label: "Task List", value: (entry) => entry?.main_taskList || " - " },
  { label: "Task", value: (entry) => entry?.task || " - " },
  { label: "Description", value: (entry) => entry?.descriptions || " - " },
  { label: "Bug", value: (entry) => entry?.bug || " - " },
  { label: "Time", value: (entry) => entry?.time || " - " }
];

const createMyLoggedTimeTable = (requestedColumns = []) => {
  const columns = pickExportColumns(COLUMNS, requestedColumns);
  const timeIndex = columns.findIndex((column) => column.label === "Time");

  return {
    header: `<tr><th></th>${columns.map((column) => `<th>${column.label}</th>`).join("")}</tr>`,

    group: (title) => `<tr><td>${title}</td></tr>`,

    entry: (entry) =>
      `<tr><td></td>${columns.map((column) => `<td>${column.value(entry)}</td>`).join("")}</tr>`,

    // "Total" sits just left of the Time column; without Time there's nothing to total.
    total: (label, value) => {
      if (timeIndex === -1) return "";
      const cells = ["", ...columns.map(() => "")];
      cells[timeIndex + 1] = value;
      cells[timeIndex] = label;
      return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
    }
  };
};

module.exports = { createMyLoggedTimeTable };
