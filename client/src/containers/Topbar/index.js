import React, { useMemo } from "react";
import { Layout, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useLocation } from "react-router-dom";
import { toggleCollapsedSideNav } from "../../appRedux/actions";
import { setThemeType } from "../../appRedux/actions/Setting";
import { THEME_TYPE_LITE, THEME_TYPE_DARK } from "../../constants/ThemeSetting";
import UserProfile from "../Sidebar/UserProfile";
import "./Topbar.css";

const { Header } = Layout;

function getPageTitle(pathname) {
  if (!pathname) return "Dashboard";
  if (pathname.includes("/dashboard")) return "Dashboard";
  if (pathname.includes("/project-list")) return "Projects";
  if (pathname.includes("/project/app/")) return "Tasks";
  if (pathname.includes("/project-users")) return "Users";
  if (pathname.includes("/permission-access")) return "Permissions";
  if (pathname.includes("/project-runnig-reports")) return "Projects Running";
  if (pathname.includes("/timesheet-reports")) return "Timesheet";
  if (pathname.includes("/billable-hours")) return "Billable Hours";
  if (pathname.includes("/positive-review")) return "Positive Reviews";
  if (pathname.includes("/complaints")) return "Complaints";
  if (pathname.includes("/projectexpense")) return "Project Expense";
  if (pathname.includes("/admin/settings")) return "Settings";
  if (pathname.includes("/admin/activity-logs")) return "Activity Logs";
  if (pathname.includes("/admin/mira-ai")) return "Mira AI";
  if (pathname.includes("/admin/dashboard")) return "Dashboard";
  if (pathname.includes("/trash")) return "Trash";
  return "Dashboard";
}

function Topbar() {
  const { navCollapsed } = useSelector(({ common }) => common);
  const { themeType } = useSelector(({ settings }) => settings);
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const companySlug = typeof localStorage !== "undefined" ? localStorage.getItem("companyDomain") : "";

  const isLightTheme = themeType === THEME_TYPE_LITE;

  const handleThemeToggle = () => {
    dispatch(setThemeType(isLightTheme ? THEME_TYPE_DARK : THEME_TYPE_LITE));
  };

  const handleAddTask = () => {
    history.push(`/${companySlug || ""}/dashboard`);
  };

  return (
    <Header className="top-header top-header-icons weekmate-header">
      <div className="weekmate-header-left">
        <div className="gx-linebar">
          <i
            className="fi fi-rr-menu-burger icon-menu"
            onClick={() => dispatch(toggleCollapsedSideNav(!navCollapsed))}
            aria-hidden
          />
        </div>
        <h1 className="weekmate-header-title">{pageTitle}</h1>
      </div>
      <div className="weekmate-header-right">
        <button
          type="button"
          className="weekmate-header-theme"
          onClick={handleThemeToggle}
          aria-label={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
          title={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
        >
          <span className="weekmate-theme-icon" aria-hidden>
            {isLightTheme ? "☀" : "🌙"}
          </span>
        </button>
        <UserProfile />
        <Button type="primary" className="weekmate-header-add-task" icon={<PlusOutlined />} onClick={handleAddTask}>
          Add Task
        </Button>
      </div>
    </Header>
  );
}

export default Topbar;
