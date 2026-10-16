// Chart colours taken from the WeekMate HRMS dashboards
// (NewDashboard/EmployeeChart, GenderChart, Mood) so every graph in TaskHub
// reads the same as HRMS.

export const HRMS_CHART_PRIMARY = "#0367AE";
export const HRMS_CHART_SECONDARY = "#0A8FB0";
export const HRMS_CHART_ACCENT = "#2A6DB3";

// Multi-series / donut / pie order. Dark HRMS blues, one teal, one green: no purple, no pastels.
export const HRMS_CHART_PALETTE = [
  "#0367AE",
  "#005282",
  "#339F74",
  "#2A6DB3",
  "#0A8FB0",
  "#15507B",
  "#046EAC",
  "#787878",
];

// Semantic colours, same hues HRMS uses for good / warning / bad states.
export const HRMS_CHART_POSITIVE = "#339F74";
export const HRMS_CHART_WARNING = "#D48806";
export const HRMS_CHART_NEGATIVE = "#E5606C";

// Axis labels and grid lines (HRMS EmployeeChart).
export const HRMS_CHART_AXIS_TEXT = "#787878";
export const HRMS_CHART_GRID = "#E0E0E0";

export const hrmsPalette = (count) =>
  Array.from({ length: count }, (_, i) => HRMS_CHART_PALETTE[i % HRMS_CHART_PALETTE.length]);
