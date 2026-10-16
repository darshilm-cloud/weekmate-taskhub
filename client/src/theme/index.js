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
    // Brand — HRMS antd primary (@primary-color #038fde) + its hover/active shades
    colorPrimary: "#038fde",
    colorLink: "#038fde",
    colorLinkHover: "#28aaeb",
    colorLinkActive: "#006eb8",

    // Typography
    fontFamily: "'NoirPro', sans-serif",
    fontSize: 14,

    // Shape
    borderRadius: 6,

    // Surfaces
    colorBgLayout: dark ? "#0b1220" : "#f6f8fb",
    colorBgContainer: dark ? "#111a2a" : "#ffffff",

    // Borders / text
    colorBorder: dark ? "#24324a" : "#e6eaf0",
    colorText: dark ? "#e5e7eb" : "#111827",
    colorTextSecondary: dark ? "#9aa4b2" : "#4b5563",

    // Focus ring color (used by some components)
    colorPrimaryHover: "#28aaeb",
    colorPrimaryActive: "#006eb8",
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
        itemHoverBg: dark ? "rgba(3, 143, 222, 0.16)" : "#eaf3ff",
        itemSelectedBg: "#038fde",
        itemSelectedColor: "#ffffff",
      },
      Card: {
        borderRadiusLG: 12,
        headerFontSize: 16,
        boxShadowTertiary: dark
          ? "0 10px 24px rgba(0, 0, 0, 0.35)"
          : "0 2px 10px rgba(16, 42, 67, 0.08)",
      },
      Button: {
        borderRadius: 6,
        controlHeight: 36,
        controlHeightLG: 40,
      },
      Input: {
        controlHeight: 36,
        borderRadius: 4,
        hoverBorderColor: "#28aaeb",
      },
      Select: {
        controlHeight: 36,
        borderRadius: 4,
      },
      DatePicker: {
        controlHeight: 36,
        borderRadius: 4,
      },
      Pagination: {
        itemSize: 32,
        borderRadius: 6,
        itemActiveBg: dark ? "#038fde" : "#15507b",
      },
      Tag: {
        borderRadiusSM: 6,
      },
      Table: {
        headerBg: dark ? "#0f172a" : "#f2f5f8",
        headerColor: dark ? "#e5e7eb" : "#313131",
        borderColor: baseTokens.colorBorder,
        rowHoverBg: dark ? "rgba(148, 163, 184, 0.10)" : "#f5f7fb",
      },
      Modal: {
        borderRadiusLG: 6,
      },
      Drawer: {
        colorBgElevated: baseTokens.colorBgContainer,
      },
      Tabs: {
        itemColor: "#545454",
        itemHoverColor: "#28aaeb",
        itemSelectedColor: "#038fde",
        inkBarColor: "#038fde",
      },
      Tooltip: {
        borderRadius: 6,
      },
      Popover: {
        borderRadius: 6,
      },
    },
  };
}

