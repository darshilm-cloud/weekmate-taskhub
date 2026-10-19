// Chart colours taken from the WeekMate HRMS dashboards
// (NewDashboard/EmployeeChart, GenderChart, Mood) so every graph in TaskHub
// reads the same as HRMS.

export const HRMS_CHART_PRIMARY = "#0367AE";
export const HRMS_CHART_SECONDARY = "#4A90C8";
export const HRMS_CHART_ACCENT = "#2A6DB3";

// Multi-series / donut / pie order. Dark HRMS blues, one teal, one green: no purple, no pastels.
export const HRMS_CHART_PALETTE = [
  "#0367AE",
  "#005282",
  "#2A6DB3",
  "#15507B",
  "#4A90C8",
  "#7DB3DB",
  "#046EAC",
  "#A9CDE8",
];

// Blue-only ramp for pages that follow the blue and white theme (no green / teal).
export const HRMS_CHART_BLUE_PALETTE = [
  "#0367AE",
  "#005282",
  "#2A6DB3",
  "#15507B",
  "#4A90C8",
  "#7DB3DB",
  "#046EAC",
  "#A9CDE8",
];

// Semantic colours, same hues HRMS uses for good / warning / bad states.
export const HRMS_CHART_POSITIVE = "#0367AE";
export const HRMS_CHART_WARNING = "#7DB3DB";
export const HRMS_CHART_NEGATIVE = "#15507B";

// Axis labels and grid lines (HRMS EmployeeChart).
export const HRMS_CHART_AXIS_TEXT = "#787878";
export const HRMS_CHART_GRID = "#E0E0E0";

export const hrmsPalette = (count) =>
  Array.from({ length: count }, (_, i) => HRMS_CHART_PALETTE[i % HRMS_CHART_PALETTE.length]);

export const hrmsBluePalette = (count) =>
  Array.from({ length: count }, (_, i) => HRMS_CHART_BLUE_PALETTE[i % HRMS_CHART_BLUE_PALETTE.length]);

// Closed / Pending / Incomplete series, blue shades only.
export const HRMS_CHART_STATUS_BLUES = ["#0367AE", "#7DB3DB", "#15507B"];
