// Notes keep the colour value they were saved with (the colour filter matches
// on it), but the colour shown on screen is always one of the HRMS theme
// colours. Anything not in the list (violet, pastel, pink, ...) shows as the
// HRMS primary blue.
const NOTE_ACCENT_DISPLAY = {
  "#2563eb": "#0367AE",
  "#0ea5e9": "#5CC6E4",
  "#0b3a5b": "#005282",
  "#16a34a": "#339F74",
  "#f59e0b": "#FAAD14",
  "#dc2626": "#E5606C",
  "#64748b": "#787878",
};

export const DEFAULT_NOTE_ACCENT_DISPLAY = "#0367AE";

export const displayNoteAccent = (color) =>
  NOTE_ACCENT_DISPLAY[String(color || "").toLowerCase()] || DEFAULT_NOTE_ACCENT_DISPLAY;
