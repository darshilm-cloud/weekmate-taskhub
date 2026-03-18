import React, { useState, useCallback, useMemo, useEffect, memo } from "react";
import { Form, Menu, Layout, Avatar, Dropdown } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import CustomScrollbars from "../../util/CustomScrollbars";
import { useDispatch, useSelector } from "react-redux";
import {
  SearchOutlined,
  DashboardOutlined,
  SettingOutlined,
  HistoryOutlined,
  StarOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  MenuOutlined,
  DownOutlined,
  CheckOutlined,
  FolderOutlined,
  FileTextOutlined,
  TeamOutlined,
  BellOutlined,
  ReadOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { toggleCollapsedSideNav } from "../../appRedux/actions/Setting";
import Service from "../../service";
import "./SidebarContent.css";
import PropTypes from "prop-types";
import { getRoles } from "../../util/hasPermission";
import ProjectListModal from "../../components/Modal/ProjectListModal";
import WeekmateLogo from "../../assets/images/WEEKMATE_LOGO.png";
import { generateCacheKey } from "../../util/generateCacheKey";
import { sideBarContentId, sideBarContentId2 } from "../../constants";
import { BiChat } from "react-icons/bi";

const { Sider } = Layout;

function SidebarContent({ setSidebarCollapsed, sidebarCollapsed }) {
  const companySlug = localStorage.getItem("companyDomain");

  const userData = JSON.parse(localStorage.getItem("user_data"));

  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const { navCollapsed } = useSelector(({ common }) => common);

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectDetails, setProjectDetails] = useState([]);
  const [recentList, setRecentList] = useState([]);
  const [form] = Form.useForm();

  

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  // open modal and calling getlisting api
  const showModal = async () => {
    setIsModalOpen(true);
    getProjectListing();
    getVisitedData();
  };

  const getProjectListing = async (searchText) => {
    try {
      dispatch(showAuthLoader());
      const normalizedSearch = (searchText || "").trim();
      const defaultPayload = {
        pageNo: 1,
        limit: 100,
        search: normalizedSearch,
        sortBy: "desc",
        filterBy: "all",
        isSearch: normalizedSearch.length > 0,
      };
      const reqBody = {
        ...defaultPayload,
      };
      if (normalizedSearch) {
        reqBody.search = normalizedSearch;
      }
      let Key = generateCacheKey("project", reqBody);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: {
          cachekey: Key,
        },
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectDetails(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const addVisitedData = async (projectId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addrecentVisited,
        body: {
          project_id: projectId,
        },
      });
      if (response?.data && response?.data?.statusCode == 200) {
        dispatch(hideAuthLoader());
      }
    } catch (error) {
      console.log("add project error");
    }
  };

  const getVisitedData = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getrecentVisited,
      });
      if (response?.data && response?.data?.statusCode == 200) {
        dispatch(hideAuthLoader());
        setRecentList(response?.data?.data);
      }
    } catch (error) {
      console.log("get project error");
    }
  };

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
    if (path.includes("/project-runnig-reports")) return "Analytics-Projects-running";
    if (path.includes("/timesheet-reports")) return "Analytics-Timesheet";
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
  }, [location.pathname]);

  const menuItemsRaw = useMemo(
    () => [
      {
        key: "Search Project",
        icon: <SearchOutlined />,
        label: "Search",
        onClick: () => showModal(),
      },
      !getRoles(["Client"]) && {
        key: "Dashboard",
        icon: <DashboardOutlined />,
        label: "Dashboard",
        onClick: () => handleMenuClick("Dashboard", `/${companySlug}/dashboard`),
      },
      {
        key: "Tasks",
        icon: <CheckOutlined style={{ marginRight: 4 }} />,
        label: "Tasks",
        onClick: () => handleMenuClick("Tasks", `/${companySlug}/tasks`),
      },
      {
        key: "Projects",
        icon: <FolderOutlined />,
        label: "Projects",
        onClick: () => handleMenuClick("Projects", `/${companySlug}/project-list`),
      },
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
      getRoles(["Admin"]) && {
        key: "Users",
        icon: <TeamOutlined />,
        label: "Users",
        onClick: () => handleMenuClick("Users", `/${companySlug}/project-users`),
      },
      getRoles(["Admin"]) && {
        key: "Permission",
        icon: <i className="fi fi-rr-lock"></i>,
        label: "Permissions",
        onClick: () => handleMenuClick("Permission", `/${companySlug}/permission-access`),
      },
      (getRoles(["Admin"]) || userData?._id === sideBarContentId) && {
        key: "Analytics-Projects-running",
        icon: <BarChartOutlined />,
        label: "Projects Running",
        onClick: () => handleMenuClick("Analytics-Projects-running", `/${companySlug}/project-runnig-reports`),
      },
      (getRoles(["Admin"]) || userData?._id === sideBarContentId) && {
        key: "Analytics-Timesheet",
        icon: <HistoryOutlined />,
        label: "Timesheet",
        onClick: () => handleMenuClick("Analytics-Timesheet", `/${companySlug}/timesheet-reports`),
      },
      getRoles(["Admin", "PC", "TL", "AM"]) && {
        key: "FeedBack-Positive Reviews",
        icon: <StarOutlined />,
        label: "Positive Reviews",
        onClick: () => handleMenuClick("FeedBack-Positive Reviews", `/${companySlug}/positive-review`),
      },
      getRoles(["Admin", "PC", "TL", "AM"]) && {
        key: "FeedBack-Complaints",
        icon: <ExclamationCircleOutlined />,
        label: "Complaints",
        onClick: () => handleMenuClick("FeedBack-Complaints", `/${companySlug}/complaints`),
      },
      (getRoles(["Admin", "PC", "TL", "Admin"]) || userData?._id === sideBarContentId2) && {
        key: "Projectexpences",
        icon: <FileTextOutlined />,
        label: "Project Expense",
        onClick: () => handleMenuClick("Projectexpences", `/${companySlug}/projectexpense`),
      },
      getRoles(["Admin"]) && {
        key: "Admin_Settings",
        icon: <SettingOutlined />,
        label: "Settings",
        onClick: () => handleMenuClick("Admin_Settings", `/${companySlug}/admin/settings`),
      },
      getRoles(["Admin"]) && {
        key: "activity_logs",
        icon: <HistoryOutlined />,
        label: "Activity Logs",
        onClick: () => handleMenuClick("activity_logs", `/${companySlug}/admin/activity-logs`),
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
        mode="inline"
        selectedKeys={selectedKeys}
        items={item}
      />
    ),
    [selectedKeys, item]
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

        <CustomScrollbars className="gx-layout-sider-scrollbar weekmate-sidebar-scroll">
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

        <ProjectListModal
          projectDetails={projectDetails}
          recentList={recentList}
          isModalOpen={isModalOpen}
          handleCancel={handleCancel}
          addVisitedData={addVisitedData}
          setIsModalOpen={setIsModalOpen}
          form={form}
          getProjectListing={getProjectListing}
        />
      </div>
    </>
  );
}

SidebarContent.propTypes = {
  setSidebarCollapsed: PropTypes.func.isRequired,
};
export default memo(SidebarContent);
