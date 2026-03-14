import React from "react";
import { Layout } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { toggleCollapsedSideNav } from "../../appRedux/actions";
import { setThemeType } from "../../appRedux/actions/Setting";
import { THEME_TYPE_LITE, THEME_TYPE_DARK } from "../../constants/ThemeSetting";
import UserProfile from "../Sidebar/UserProfile";
import "./Topbar.css";

const { Header } = Layout;

function Topbar() {
  const { navCollapsed } = useSelector(({ common }) => common);
  const { themeType } = useSelector(({ settings }) => settings);
  const dispatch = useDispatch();
  const companySlug = typeof localStorage !== "undefined" ? localStorage.getItem("companyDomain") : "";

  const isLightTheme = themeType === THEME_TYPE_LITE;

  const handleThemeToggle = () => {
    dispatch(setThemeType(isLightTheme ? THEME_TYPE_DARK : THEME_TYPE_LITE));
  };

  return (
    <Header className="top-header top-header-icons weekmate-header taskpad-header weekmate-header-shell">
      <div className="weekmate-header-card">
        <div className="weekmate-header-left">
          <div className="weekmate-header-title">
            {companySlug ? companySlug.replace(/-/g, " ") : "Demo Tech"}
          </div>
        </div>
        <div className="weekmate-header-right">
          <UserProfile />
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
        </div>
      </div>
    </Header>
  );
}

export default Topbar;
