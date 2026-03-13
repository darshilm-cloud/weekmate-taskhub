import { theme as antdTheme } from "antd";
import { THEME_TYPE_DARK, THEME_TYPE_SEMI_DARK } from "../constants/ThemeSetting";

const isDark = (themeType) =>
  themeType === THEME_TYPE_DARK || themeType === THEME_TYPE_SEMI_DARK;

/**
 * Unified design system for TaskHub.
 * - Ant Design components use `ConfigProvider.theme` (tokens + per-component overrides)
 * - Custom CSS uses CSS variables from `assets/css/theme-variables.css`
 */
export function getAntdTheme(themeType) {
  const dark = isDark(themeType);

  const baseTokens = {
    // Brand
    colorPrimary: "#2563eb",

    // Typography
    fontFamily:
      "'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
    fontSize: 14,

    // Shape
    borderRadius: 12,

    // Surfaces
    colorBgLayout: dark ? "#0b1220" : "#f6f8fb",
    colorBgContainer: dark ? "#111a2a" : "#ffffff",

    // Borders / text
    colorBorder: dark ? "#24324a" : "#e6eaf0",
    colorText: dark ? "#e5e7eb" : "#111827",
    colorTextSecondary: dark ? "#9aa4b2" : "#4b5563",

    // Focus ring color (used by some components)
    colorPrimaryHover: "#1d4ed8",
  };

  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: baseTokens,
    components: {
      Layout: {
        headerBg: baseTokens.colorBgContainer,
        bodyBg: baseTokens.colorBgLayout,
        siderBg: baseTokens.colorBgContainer,
      },
      Menu: {
        itemBorderRadius: 10,
        itemHoverBg: dark ? "rgba(37, 99, 235, 0.16)" : "#e8f1ff",
        itemSelectedBg: "#2563eb",
        itemSelectedColor: "#ffffff",
      },
      Card: {
        borderRadiusLG: 14,
        boxShadowTertiary: dark
          ? "0 10px 24px rgba(0, 0, 0, 0.35)"
          : "0 10px 24px rgba(17, 24, 39, 0.10)",
      },
      Button: {
        borderRadius: 10,
        controlHeight: 36,
        controlHeightLG: 40,
      },
      Input: {
        controlHeight: 36,
        borderRadius: 10,
      },
      Select: {
        controlHeight: 36,
        borderRadius: 10,
      },
      DatePicker: {
        controlHeight: 36,
        borderRadius: 10,
      },
      Table: {
        headerBg: dark ? "#101a2c" : "#f3f6fb",
        headerColor: baseTokens.colorText,
        borderColor: baseTokens.colorBorder,
        rowHoverBg: dark ? "rgba(148, 163, 184, 0.10)" : "#f5f7fb",
      },
      Modal: {
        borderRadiusLG: 14,
      },
      Drawer: {
        colorBgElevated: baseTokens.colorBgContainer,
      },
      Tabs: {
        itemSelectedColor: "#2563eb",
        inkBarColor: "#2563eb",
      },
      Tooltip: {
        borderRadius: 10,
      },
      Popover: {
        borderRadius: 12,
      },
    },
  };
}

