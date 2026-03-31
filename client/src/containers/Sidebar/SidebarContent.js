import React, { useState, useCallback, useMemo, useEffect, memo } from "react";
import { Menu, Layout, Avatar, Dropdown } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import CustomScrollbars from "../../util/CustomScrollbars";
import {
  DashboardOutlined,
  StarOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  DownOutlined,
  CheckOutlined,
  FolderOutlined,
  FileTextOutlined,
  TeamOutlined,
  ReadOutlined,
  MessageOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import "./SidebarContent.css";
import PropTypes from "prop-types";
import { getRoles } from "../../util/hasPermission";
import WeekmateLogo from "../../assets/images/WEEKMATE_LOGO.png";
import { sideBarContentId, sideBarContentId2 } from "../../constants";
import { BiChat } from "react-icons/bi";

const { Sider } = Layout;

function SidebarContent({ setSidebarCollapsed, sidebarCollapsed }) {
  const companySlug = localStorage.getItem("companyDomain");

  const userData = JSON.parse(localStorage.getItem("user_data"));

  const history = useHistory();
  const location = useLocation();
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [openKeys, setOpenKeys] = useState([]);

  const handleMenuClick = useCallback(
    (key, path) => {
      history.push(path);
      setSelectedKeys([key]);
    },
    [history]
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

  const getDefaultOpenKeys = useCallback(() => {
    return [];
  }, []);

  useEffect(() => {
    const newSelectedKey = getDefaultSelectedKey();
    setSelectedKeys([newSelectedKey]);
    setOpenKeys(getDefaultOpenKeys());
  }, [location.pathname, getDefaultOpenKeys, getDefaultSelectedKey]);

  const handleOpenChange = useCallback((keys) => {
    const latestKey = keys.find((k) => k === "Feedback");
    setOpenKeys(latestKey ? [latestKey] : []);
  }, []);

  const handleMenuMouseLeave = useCallback(() => {
    setOpenKeys([]);
  }, []);

  const menuItemsRaw = useMemo(
    () => [
      // 1. Dashboard
      !getRoles(["Client"]) && {
        key: "Dashboard",
        icon: <DashboardOutlined />,
        label: "Dashboard",
        onClick: () => handleMenuClick("Dashboard", `/${companySlug}/dashboard`),
      },
      // 2. Projects
      {
        key: "Projects",
        icon: <FolderOutlined />,
        label: "Projects",
        onClick: () => handleMenuClick("Projects", `/${companySlug}/project-list`),
      },
      // 3. Tasks
      {
        key: "Tasks",
        icon: <CheckOutlined style={{ marginRight: 4 }} />,
        label: "Tasks",
        onClick: () => handleMenuClick("Tasks", `/${companySlug}/tasks?filter=all`),
      },
      // 4. Users
      getRoles(["Admin"]) && {
        key: "Users",
        icon: <TeamOutlined />,
        label: "Users",
        onClick: () => handleMenuClick("Users", `/${companySlug}/project-users`),
      },
      // 5. Feedback
      getRoles(["Admin", "PC", "TL", "AM"]) && {
        key: "Feedback",
        icon: <StarOutlined />,
        label: "Feedback",
        children: [
          {
            key: "FeedBack-Positive Reviews",
            label: "Positive Reviews",
            onClick: () => handleMenuClick("FeedBack-Positive Reviews", `/${companySlug}/positive-review`),
          },
          {
            key: "FeedBack-Complaints",
            label: "Complaints",
            onClick: () => handleMenuClick("FeedBack-Complaints", `/${companySlug}/complaints`),
          },
        ],
      },
      // 8. Project Expense
      (getRoles(["Admin", "PC", "TL", "Admin"]) || userData?._id === sideBarContentId2) && {
        key: "Projectexpences",
        icon: <FileTextOutlined />,
        label: "Project Expense",
        onClick: () => handleMenuClick("Projectexpences", `/${companySlug}/projectexpense`),
      },
      // --- rest remaining ---
      {
        key: "Notes",
        icon: <ReadOutlined />,
        label: "Notes",
        onClick: () => handleMenuClick("Notes", `/${companySlug}/notes`),
      },
      {
        key: "Discussion",
        icon: <MessageOutlined />,
        label: "Discussion",
        onClick: () => handleMenuClick("Discussion", `/${companySlug}/discussion`),
      },
      (getRoles(["Admin"]) || userData?._id === sideBarContentId) && {
        key: "Reports",
        icon: <BarChartOutlined />,
        label: "Reports",
        onClick: () => handleMenuClick("Reports", `/${companySlug}/reports`),
      },
      getRoles(["Admin"]) && {
        key: "mira_ai",
        icon: <BiChat />,
        label: "Mira AI",
        onClick: () => handleMenuClick("mira_ai", `/${companySlug}/admin/mira-ai`),
      },
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

  const userInitials = useMemo(() => {
    if (!userData?.name) return "U";
    const parts = userData.name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (userData.name[0] || "U").toUpperCase();
  }, [userData?.name]);

  const userDisplayName = userData?.name?.trim() || "User";

  const userDropdownItems = useMemo(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        onClick: () => history.push(`/${companySlug}/dashboard`),
      },
      {
        key: "profile",
        label: "Profile",
        onClick: () => history.push(`/${companySlug}/admin/settings`),
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
            onClick={() => history.push(`/${companySlug}/dashboard`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && history.push(`/${companySlug}/dashboard`)}
          >
            <img className="weekmate-logo-img" src={WeekmateLogo} alt="WeekMate" />
          </div>
        </div>

        {/* User profile card */}
        <div className="weekmate-sidebar-user-card">
          <Dropdown menu={{ items: userDropdownItems }} trigger={["click"]} placement="bottomLeft">
            <div className="weekmate-user-card-inner">
              <Avatar className="weekmate-user-avatar" style={{ backgroundColor: "#1677ff" }}>
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
