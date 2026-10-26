import React, { useState, useCallback, useMemo, useEffect, memo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toggleCollapsedSideNav } from "../../appRedux/actions/Setting";
import { Menu, Layout, Avatar, Dropdown } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import CustomScrollbars from "../../util/CustomScrollbars";
import { hasPermission } from "../../util/hasPermission";
import {
  ExclamationCircleOutlined,
  DownOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import "./SidebarContent.css";
import PropTypes from "prop-types";
import { getRoles } from "../../util/hasPermission";
import WeekmateLogo from "../../assets/images/WeeKmateTaskHub.svg";
import { sideBarContentId } from "../../constants";
import { getSidebarSubmenus } from "../../constants/sidebarSubmenus";
import { BiChat } from "react-icons/bi";
// Sidebar icons in the HRMS style (weekmate-hrms containers/Sidebar): solid Font Awesome
// glyphs, plus HRMS's own Team / Expense / Reports SVGs
import { AiOutlineDashboard } from "react-icons/ai";
import { FaFolderOpen, FaClipboardList, FaStar, FaBookOpen, FaCommentDots } from "react-icons/fa";
import TeamInfoIcon from "./sidebarIcon/TeamInfoIcon";
import ExpenseIcon from "./sidebarIcon/ExpenseIcon";
import ReportsIcon from "./sidebarIcon/ReportsIcon";
import {
  BRANDING_UPDATE_EVENT,
  getPublicAssetUrl,
  getStoredBranding,
} from "../../util/branding";

const { Sider } = Layout;

const SUBMENU_ICONS = { Feedback: <FaStar /> };

function SidebarContent({ setSidebarCollapsed, sidebarCollapsed }) {
  const companySlug = localStorage.getItem("companyDomain");

  const authUser = useSelector((state) => state.auth.authUser);
  const userData = authUser || JSON.parse(localStorage.getItem("user_data")) || {};

  const history = useHistory();
  const location = useLocation();
  const [selectedKeys, setSelectedKeys] = useState([]);
  const dispatch = useDispatch();
  const [openKeys, setOpenKeys] = useState([]);
  const [sidebarLogoPath, setSidebarLogoPath] = useState(
    () => getStoredBranding(companySlug).logoPath
  );

  // Read (View) permission for a module - admins always have it.
  const canRead = (permission) => getRoles(["Admin"]) || hasPermission([permission]);

  const handleMenuClick = useCallback(
    (key, path, requiredPermissions = []) => {
      // On phones / tablets the sidebar is a drawer: close it once a menu or sub-menu is picked
      dispatch(toggleCollapsedSideNav(false));
      // Get companySlug fresh from localStorage each time
      const currentCompanySlug = localStorage.getItem("companyDomain") || "";
      
      // Check if user is admin - admins always have access
      const isAdmin = getRoles(["Admin"]);
      
      // Check permissions if required (and user is not admin)
      if (!isAdmin && requiredPermissions.length > 0) {
        const hasAccess = hasPermission(requiredPermissions);
        if (!hasAccess) {
          // If no permission and not admin, redirect to dashboard with company slug
          if (currentCompanySlug) {
            history.push(`/${currentCompanySlug}/dashboard`);
          } else {
            history.push("/signin");
          }
          return;
        }
      }
      // Otherwise, allow navigation
      history.push(path);
      setSelectedKeys([key]);
    },
    [history, dispatch]
  );

  const getDefaultSelectedKey = useCallback(() => {
    const path = location.pathname;
    if (path.includes("/dashboard")) return "Dashboard";
    if (path.includes("/tasks")) return "Tasks";
    if (path.includes("/project-list")) return "Projects";
    if (path.includes("/notes")) return "Notes";
    if (path.includes("/discussion")) return "Discussion";
    if (path.includes("/project-users")) return "Users";
    if (path.includes("/permission-access")) return "Permission";
    if (path.includes("/reports")) return "Reports";
    if (path.includes("/billable-hours")) return "Hours";
    if (path.includes("/positive-review")) return "FeedBack-Positive Reviews";
    if (path.includes("/complaints")) return "FeedBack-Complaints";
    if (path.includes("/projectexpense")) return "Projectexpences";
    if (path.includes("/admin/settings")) return "Admin_Settings";
    if (path.includes("/admin/mira-ai")) return "mira_ai";
    return "Dashboard";
  }, [location.pathname]);

  useEffect(() => {
    const newSelectedKey = getDefaultSelectedKey();
    setSelectedKeys([newSelectedKey]);
    // Do not force-open the submenu on navigation - hover trigger handles it
    setOpenKeys([]);
  }, [location.pathname, getDefaultSelectedKey]);

  useEffect(() => {
    setSidebarLogoPath(getStoredBranding(companySlug).logoPath);
  }, [companySlug]);

  useEffect(() => {
    const handleBrandingUpdate = (event) => {
      const nextSlug = event?.detail?.companySlug;
      if (nextSlug && nextSlug !== companySlug) return;

      setSidebarLogoPath(event?.detail?.logoPath || "");
    };

    window.addEventListener(BRANDING_UPDATE_EVENT, handleBrandingUpdate);

    return () => {
      window.removeEventListener(BRANDING_UPDATE_EVENT, handleBrandingUpdate);
    };
  }, [companySlug]);

  const handleOpenChange = useCallback((keys) => {
    const latestKey = keys.find((k) => k === "Feedback");
    setOpenKeys(latestKey ? [latestKey] : []);
  }, []);

  const handleMenuMouseLeave = useCallback(() => {
    setOpenKeys([]);
  }, []);

  const menuItemsRaw = useMemo(
    () => [
      // 1. Dashboard (always visible for non-clients)
      !getRoles(["Client"]) && {
        key: "Dashboard",
        icon: <AiOutlineDashboard />,
        label: "Dashboard",
        onClick: () => handleMenuClick("Dashboard", `/${companySlug}/dashboard`, ["dashboard_view", "dashboard_add", "dashboard_edit", "dashboard_delete", "dashboard_manage"]),
      },
      // 2. Projects
      // Every module below shows only with its Read (View) permission
      // (Permission Management). Admins see everything.
      canRead("projects_view") && {
        key: "Projects",
        icon: <FaFolderOpen />,
        label: "Projects",
        onClick: () => handleMenuClick("Projects", `/${companySlug}/project-list`, ["projects_view"]),
      },
      // 3. Tasks
      canRead("tasks_view") && {
        key: "Tasks",
        icon: <FaClipboardList />,
        label: "Tasks",
        onClick: () => handleMenuClick("Tasks", `/${companySlug}/tasks?filter=all`, ["tasks_view"]),
      },
      // 4. Users
      canRead("people_view") && {
        key: "Users",
        icon: <TeamInfoIcon />,
        label: "Users",
        onClick: () => handleMenuClick("Users", `/${companySlug}/project-users`, ["people_view"]),
      },
      // 5. Feedback
      ...getSidebarSubmenus(companySlug)
        .filter((group) => group.isVisible())
        .map((group) => ({
          key: group.key,
          icon: SUBMENU_ICONS[group.key],
          label: group.label,
          children: group.children.map((child) => ({
            key: child.key,
            label: child.label,
            onClick: () => handleMenuClick(child.key, child.path, child.permissions),
          })),
        })),
      // 8. Project Expense
      canRead("expense_view") && {
        key: "Projectexpences",
        icon: <ExpenseIcon />,
        label: "Project Expense",
        onClick: () => handleMenuClick("Projectexpences", `/${companySlug}/projectexpense`, ["expense_view"]),
      },
      // --- rest remaining ---
      canRead("notes_view") && {
        key: "Notes",
        icon: <FaBookOpen />,
        label: "Notes",
        onClick: () => handleMenuClick("Notes", `/${companySlug}/notes`, ["notes_view"]),
      },
      canRead("discussion_view") && {
        key: "Discussion",
        icon: <FaCommentDots />,
        label: "Discussion",
        onClick: () => handleMenuClick("Discussion", `/${companySlug}/discussion`, ["discussion_view"]),
      },
      (canRead("reports_view") || userData?._id === sideBarContentId) && {
        key: "Reports",
        icon: <ReportsIcon />,
        label: "Reports",
        onClick: () => handleMenuClick("Reports", `/${companySlug}/reports`, ["reports_view"]),
      },
      // getRoles(["Admin"]) && {
      //   key: "mira_ai",
      //   icon: <BiChat />,
      //   label: "Mira AI",
      //   onClick: () => handleMenuClick("mira_ai", `/${companySlug}/admin/mira-ai`),
      // },
    ],
    [companySlug, handleMenuClick]
  );

  const item = useMemo(() => menuItemsRaw.filter(Boolean), [menuItemsRaw]);

  const menuComponent = useMemo(
    () => (
      <Menu
        theme="light"
        mode="vertical"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        triggerSubMenuAction="hover"
        subMenuCloseDelay={0.08}
        items={item}
      />
    ),
    [handleOpenChange, item, openKeys, selectedKeys]
  );

  const userDisplayName = useMemo(() => {
    if (userData?.name?.trim()) return userData.name.trim();
    const full = [userData?.first_name, userData?.last_name].filter(Boolean).join(" ").trim();
    return full || "User";
  }, [userData?.name, userData?.first_name, userData?.last_name]);

  const userInitials = useMemo(() => {
    const parts = userDisplayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (userDisplayName[0] || "U").toUpperCase();
  }, [userDisplayName]);
  const sidebarLogoSrc = sidebarLogoPath
    ? getPublicAssetUrl(sidebarLogoPath)
    : WeekmateLogo;

  const userDropdownItems = useMemo(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        onClick: () => { dispatch(toggleCollapsedSideNav(false)); history.push(`/${companySlug}/dashboard`); },
      },
      {
        key: "profile",
        label: "Profile",
        onClick: () => { dispatch(toggleCollapsedSideNav(false)); history.push(`/${companySlug}/admin/settings`); },
      },
    ],
    [companySlug, history]
  );

  return (
    <>
      <div className="gx-sidebar-content sidebar-menu weekmate-sidebar">
        {/* Top: Hamburger + WeekMate logo */}
        <div className="weekmate-sidebar-header">
          <div
            className="weekmate-logo"
            onClick={() => { dispatch(toggleCollapsedSideNav(false)); history.push(`/${companySlug}/dashboard`); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && history.push(`/${companySlug}/dashboard`)}
          >
            <img
              className="weekmate-logo-img"
              src={sidebarLogoSrc}
              alt="Workspace logo"
              onError={(e) => {
                if (e.currentTarget.src !== WeekmateLogo) e.currentTarget.src = WeekmateLogo;
              }}
            />
          </div>
        </div>

        {/* User profile card */}
        <div className="weekmate-sidebar-user-card">
          <Dropdown menu={{ items: userDropdownItems }} trigger={["click"]} placement="bottomLeft">
            <div className="weekmate-user-card-inner">
              <Avatar className="weekmate-user-avatar" style={{ backgroundColor: "#038fde" }}>
                {userInitials}
              </Avatar>
              <div className="weekmate-user-info">
                <span className="weekmate-user-name">{userDisplayName}</span>
                <span className="weekmate-user-meta">2</span>
              </div>
              <DownOutlined className="weekmate-user-chevron" />
            </div>
          </Dropdown>
        </div>

        <CustomScrollbars
          className="gx-layout-sider-scrollbar weekmate-sidebar-scroll"
          onMouseLeave={handleMenuMouseLeave}
        >
          <Sider collapsible={false} collapsed={false} className="Sidebar">
            {menuComponent}
          </Sider>

          {/* What's New - bottom of sidebar */}
          {/* <div className="weekmate-whats-new">
            <BellOutlined className="weekmate-whats-new-icon" />
            <span className="weekmate-whats-new-label">What&apos;s New</span>
            <span className="weekmate-whats-new-badge">1</span>
          </div> */}
        </CustomScrollbars>
      </div>
    </>
  );
}

SidebarContent.propTypes = {
  setSidebarCollapsed: PropTypes.func.isRequired,
};
export default memo(SidebarContent);
