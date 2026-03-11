import React from "react";
import { Layout } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { CheckOutlined, SunOutlined, SwitcherTwoTone } from "@ant-design/icons";
import { toggleCollapsedSideNav } from "../../appRedux/actions";
import { setThemeType } from "../../appRedux/actions/Setting";
import { THEME_TYPE_LITE, THEME_TYPE_DARK } from "../../constants/ThemeSetting";
import UserProfile from "../Sidebar/UserProfile";
import "./Topbar.css";

const { Header } = Layout;

// Placeholder: replace with real subscription expiry from API when available
function getSubscriptionExpiry() {
  const expiry = new Date("2026-03-20");
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
  return { dateStr: "20 Mar 2026", daysLeft };
}

function Topbar() {
  const { navCollapsed } = useSelector(({ common }) => common);
  const { themeType } = useSelector(({ settings }) => settings);
  const dispatch = useDispatch();
  const companySlug = typeof localStorage !== "undefined" ? localStorage.getItem("companyDomain") : "";

  const isLightTheme = themeType === THEME_TYPE_LITE;
  const expiry = getSubscriptionExpiry();

  const handleThemeToggle = () => {
    dispatch(setThemeType(isLightTheme ? THEME_TYPE_DARK : THEME_TYPE_LITE));
  };

  return (
    <Header className="top-header top-header-icons weekmate-header taskpad-header">
      <div className="weekmate-header-left">
        <div className="gx-linebar">
          <i
            className="fi fi-rr-menu-burger icon-menu"
            onClick={() => dispatch(toggleCollapsedSideNav(!navCollapsed))}
            aria-hidden
          />
        </div>
      </div>
      <div className="weekmate-header-right">
        <div className="taskpad-expiry-badge">
          <span className="taskpad-expiry-icon"><SwitcherTwoTone /></span>
        </div>
        <button
          type="button"
          className={`taskpad-theme-toggle ${isLightTheme ? "theme-light" : "theme-dark"}`}
          onClick={handleThemeToggle}
          aria-label={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
          title={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
        >
          <span className="taskpad-theme-sun" aria-hidden>☀</span>
          <span className="taskpad-theme-moon" aria-hidden>🌙</span>
          <span className="taskpad-theme-knob" />
        </button>
        <UserProfile />
      </div>
    </Header>
  );
}

export default Topbar;
