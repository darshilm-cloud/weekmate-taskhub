// Snap any saved colour (workflow stage colour, label colour, ...) to the
// nearest HRMS theme colour by hue, so data entered with arbitrary colours
// (Tailwind purples, pastel pinks, bright oranges) still reads as HRMS.
// `text: true` returns the darker variants that stay readable on white.

const parseHex = (value) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value || "").trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};

const toHsl = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
};

const SOLID = {
  blue: "#038fde",
  teal: "#0a8fb0",
  green: "#339f74",
  yellow: "#faad14",
  orange: "#fa8c16",
  red: "#ff4d4f",
  grey: "#8c8c8c",
};

const TEXT = {
  blue: "#038fde",
  teal: "#0a8fb0",
  green: "#339f74",
  yellow: "#d48806",
  orange: "#d46b08",
  red: "#e5484d",
  grey: "#545454",
};

export const toHrmsColor = (value, { text = false, fallback = "#787878" } = {}) => {
  const rgb = parseHex(value);
  const table = text ? TEXT : SOLID;
  if (!rgb) return fallback;
  const { h, s } = toHsl(rgb);
  if (s < 0.15) return table.grey;
  if (h < 15 || h >= 335) return table.red;
  if (h < 40) return table.orange;
  if (h < 70) return table.yellow;
  if (h < 165) return table.green;
  if (h < 195) return table.teal;
  if (h < 255) return table.blue;
  return table.blue; // purple / violet / pink → HRMS blue
};
