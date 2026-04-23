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
  FolderOutlined,
  FileTextOutlined,
  TeamOutlined,
  ReadOutlined,
  MessageOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import "./SidebarContent.css";
import PropTypes from "prop-types";
import { getRoles, hasPermission } from "../../util/hasPermission";
import WeekmateLogo from "../../assets/images/WeeKmateTaskHub.svg";
import { sideBarContentId, sideBarContentId2 } from "../../constants";
import { BiChat } from "react-icons/bi";

const { Sider } = Layout;

const TaskSidebarIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={22}
    height={22}
    viewBox="0 0 22 22"
    fill="none"
    {...props}
  >
    <path
      d="M17.4424 2.88242H15.452V1.99203C15.452 1.70395 15.1378 1.57302 14.8497 1.57302H13.3046C12.938 0.525481 12.0214 0.00171092 10.9739 0.00171092C9.93784 -0.0372372 8.99552 0.598014 8.64308 1.57302H7.12415C6.83607 1.57302 6.548 1.70395 6.548 1.99203V2.88242H4.55763C3.37816 2.895 2.41323 3.82545 2.35779 5.00367V20.0096C2.35779 21.1619 3.40533 22 4.55763 22H17.4424C18.5947 22 19.6422 21.1619 19.6422 20.0096V5.00372C19.5868 3.82545 18.6218 2.895 17.4424 2.88242ZM7.59549 2.62056H9.03587C9.15835 2.60562 9.2728 2.55175 9.36238 2.46689C9.45195 2.38204 9.51193 2.27067 9.53347 2.14917C9.68856 1.47377 10.2811 0.988949 10.9739 0.970703C11.6602 0.991506 12.2438 1.47783 12.388 2.14917C12.4108 2.27463 12.4747 2.38897 12.5694 2.47427C12.6642 2.55958 12.7846 2.61103 12.9118 2.62056H14.4045V4.71564H7.59549V2.62056ZM18.5947 20.0097C18.5947 20.5858 18.0185 20.9525 17.4424 20.9525H4.55763C3.98148 20.9525 3.40533 20.5858 3.40533 20.0097V5.00372C3.45876 4.40401 3.95562 3.94099 4.55763 3.93001H6.54795V5.26563C6.57562 5.55907 6.82976 5.77857 7.1241 5.76323H14.8497C14.9942 5.77114 15.1365 5.72434 15.2481 5.63213C15.3597 5.53992 15.4325 5.40908 15.452 5.26563V3.92996H17.4423C18.0443 3.94099 18.5412 4.40396 18.5946 5.00367V20.0097H18.5947Z"
      fill="white"
    />
    <path
      d="M8.9835 11.708C8.78706 11.5009 8.46093 11.4892 8.2502 11.6818L6.57413 13.2793L5.86705 12.546C5.6706 12.3389 5.34448 12.3273 5.13375 12.5198C5.03609 12.6221 4.9816 12.7581 4.9816 12.8995C4.9816 13.041 5.03609 13.177 5.13375 13.2793L6.20745 14.3792C6.25336 14.4306 6.30998 14.4713 6.37332 14.4985C6.43667 14.5256 6.5052 14.5385 6.57408 14.5363C6.71223 14.5344 6.84401 14.4779 6.9407 14.3792L8.9834 12.4413C9.18591 12.2555 9.19945 11.9407 9.01363 11.7382C9.00408 11.7277 8.99403 11.7176 8.9835 11.708ZM16.4996 12.834H10.4763C10.187 12.834 9.95249 13.0685 9.95249 13.3578C9.95249 13.6471 10.187 13.8816 10.4763 13.8816H16.4996C16.7889 13.8816 17.0234 13.6471 17.0234 13.3578C17.0234 13.0685 16.7889 12.834 16.4996 12.834ZM8.9835 7.5178C8.78706 7.31073 8.46093 7.29905 8.2502 7.49163L6.57413 9.08911L5.86705 8.35581C5.6706 8.14874 5.34448 8.13706 5.13375 8.32964C5.03609 8.43195 4.9816 8.56794 4.9816 8.70938C4.9816 8.85081 5.03609 8.98681 5.13375 9.08911L6.20745 10.189C6.25336 10.2404 6.30998 10.2811 6.37332 10.3083C6.43667 10.3354 6.5052 10.3484 6.57408 10.3462C6.71223 10.3442 6.84401 10.2877 6.9407 10.189L8.9834 8.2511C9.18591 8.06533 9.19945 7.75053 9.01363 7.54807C9.00408 7.5375 8.99403 7.5274 8.9835 7.5178ZM16.4996 8.64389H10.4763C10.187 8.64389 9.95249 8.87838 9.95249 9.16766C9.95249 9.45694 10.187 9.69143 10.4763 9.69143H16.4996C16.7889 9.69143 17.0234 9.45694 17.0234 9.16766C17.0234 8.87838 16.7889 8.64389 16.4996 8.64389ZM8.9835 15.8981C8.78706 15.691 8.46093 15.6794 8.2502 15.8719L6.57413 17.4694L5.86705 16.7361C5.6706 16.529 5.34448 16.5174 5.13375 16.7099C5.03609 16.8122 4.9816 16.9482 4.9816 17.0896C4.9816 17.2311 5.03609 17.3671 5.13375 17.4694L6.20745 18.5693C6.25336 18.6207 6.30998 18.6614 6.37332 18.6886C6.43667 18.7157 6.5052 18.7287 6.57408 18.7264C6.71223 18.7245 6.84401 18.668 6.9407 18.5693L8.9834 16.6314C9.18591 16.4456 9.19945 16.1308 9.01363 15.9283C9.00406 15.9178 8.994 15.9077 8.9835 15.8981ZM16.4996 17.0242H10.4763C10.187 17.0242 9.95249 17.2587 9.95249 17.548C9.95249 17.8373 10.187 18.0717 10.4763 18.0717H16.4996C16.7889 18.0717 17.0234 17.8373 17.0234 17.548C17.0234 17.2587 16.7889 17.0242 16.4996 17.0242Z"
      fill="white"
    />
  </svg>
);

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

  useEffect(() => {
    const newSelectedKey = getDefaultSelectedKey();
    setSelectedKeys([newSelectedKey]);
    // Do not force-open the submenu on navigation — hover trigger handles it
    setOpenKeys([]);
  }, [location.pathname, getDefaultSelectedKey]);

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
        icon: <DashboardOutlined />,
        label: "Dashboard",
        onClick: () => handleMenuClick("Dashboard", `/${companySlug}/dashboard`),
      },
      // 2. Projects
      (getRoles(["Admin"]) || hasPermission(["projects_view", "projects_manage", "project_add", "project_edit", "project_delete"])) && {
        key: "Projects",
        icon: <FolderOutlined />,
        label: "Projects",
        onClick: () => handleMenuClick("Projects", `/${companySlug}/project-list`),
      },
      // 3. Tasks
      (getRoles(["Admin"]) || hasPermission(["tasks_view", "tasks_manage", "task_add", "task_edit", "task_delete"])) && {
        key: "Tasks",
        icon: <TaskSidebarIcon />,
        label: "Tasks",
        onClick: () => handleMenuClick("Tasks", `/${companySlug}/tasks?filter=all`),
      },
      // 4. Users
      (getRoles(["Admin"]) || hasPermission(["people_view", "people_add", "people_edit", "people_delete", "manage_people"])) && {
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
