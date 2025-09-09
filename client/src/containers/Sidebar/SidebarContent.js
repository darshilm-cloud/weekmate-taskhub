import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Form, Menu, Layout } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import CustomScrollbars from "../../util/CustomScrollbars";
import { useDispatch } from "react-redux";
import { SearchOutlined, DashboardOutlined, SettingOutlined } from "@ant-design/icons";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import "./SidebarContent.css";
import PropTypes from "prop-types";
import { getRoles } from "../../util/hasPermission";
import ProjectListModal from "../../components/Modal/ProjectListModal";
import { generateCacheKey } from "../../util/generateCacheKey";
import Taskhub from "../../assets/images/taskhubicon.svg";
import { sideBarContentId, sideBarContentId2 } from "../../constants";
import AdminIcon from "../../assets/icons/AdminIcon"

const { Sider } = Layout;

function SidebarContent({ setSidebarCollapsed, sidebarCollapsed }) {
  const companySlug = localStorage.getItem("companyDomain");

  const userData = JSON.parse(localStorage.getItem("user_data"));

  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [openKeys, setOpenKeys] = useState([]);
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
      const defaultPayload = {
        pageNo: 1,
        limit: 5,
        search: searchText || "",
        sortBy: "desc",
        filterBy: "all",
        isSearch: true,
      };
      const reqBody = {
        ...defaultPayload,
      };
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
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
    if (path.includes("/project-list")) return "Admin Dashboard";
    if (path.includes("/project-users")) return "Users";
    if (path.includes("/permission-access")) return "Permission";
    if (path.includes("/project-runnig-reports")) return "Analytics";
    if (path.includes("/timesheet-reports")) return "Analytics";
    if (path.includes("/billable-hours")) return "Hours";
    if (path.includes("/positive-review")) return "FeedBack";
    if (path.includes("/complaints")) return "FeedBack";
    if (path.includes("/projectexpense")) return "Projectexpences";
    return "Dashboard";
  }, [location.pathname]);

  useEffect(() => {
    const newSelectedKey = getDefaultSelectedKey();
    setSelectedKeys([newSelectedKey]);
  }, [location.pathname]);

  const item = useMemo(
    () => [
      {
        key: "Search Project",
        icon: <SearchOutlined />,
        label: "Search",
        onClick: () => showModal(),
      },
      // getRoles(["Admin"]) && {
      //   key: "Admin_Dashboard",
      //   icon: <DashboardOutlined />,
      //   label: "Dashboard",
      //   onClick: () => handleMenuClick("Admin_Dashboard", `/${companySlug}/admin/dashboard`)
      // },
      // getRoles(["Admin"]) &&  {
      //   key: "Admin_Administrator",
      //   icon: <AdminIcon />,
      //   label: "Admins",
      //   onClick: () => handleMenuClick("Admin_Administrator", `/admin/Administrator`)
      // },
      !getRoles(["Client"]) &&{
        key: "Dashboard",
        icon: <i className="fi fi-rs-house-chimney"></i>,
        label: "Me",
        onClick: () => handleMenuClick("Dashboard", `/${companySlug}/dashboard`),
      },
      {
        key: "Admin Dashboard",
        icon: <i className="fi fi-rr-dashboard"></i>,
        label: "Projects",
        onClick: () => handleMenuClick("Admin Dashboard", `/${companySlug}/project-list`),
      },
      getRoles(["Admin"]) && {
        key: "Users",
        icon: <i className="fi fi-rr-users-alt"></i>,
        label: "Users",
        onClick: () => handleMenuClick("Users", `/${companySlug}/project-users`),
      },
      getRoles(["Admin"]) && {
        key: "Permission",
        icon: <i className="fi fi-rr-lock"></i>,
        label: "Permissions",
        onClick: () => handleMenuClick("Permission", `/${companySlug}/permission-access`),
      },
      (getRoles(["Admin"]) ||
        userData._id == sideBarContentId) && {
        key: "Analytics",
        icon: <i className="fi fi-rs-newspaper"></i>,
        label: "Analytics",
        children: [
          {
            key: "Analytics-Projects- running",
            label: "Projects Running",
            onClick: () =>
              handleMenuClick(
                "Analytics-Projects- running",
                `/${companySlug}/project-runnig-reports`
              ),
          },
          {
            key: "Analytics-Timesheet",
            label: "Timesheet",
            onClick: () =>
              handleMenuClick("Analytics-Timesheet", `/${companySlug}/timesheet-reports`),
          },
        ],
      },
      getRoles(["Admin", "PC", "TL", "Admin", "AM"]) && {
        key: "FeedBack",
        label: "Feedback",
        icon: <i className="fa-solid fa-comments"></i>,
        children: [
          {
            key: "FeedBack-Positive Reviews",
            label: "Positive Reviews",
            onClick: () =>
              handleMenuClick("FeedBack-Positive Reviews", `/${companySlug}/positive-review`),
          },
          {
            key: "FeedBack-Complaints",
            label: "Complaints",
            onClick: () =>
              handleMenuClick("FeedBack-Complaints", `/${companySlug}/complaints`),
          },
        ],
      },
      (getRoles(["Admin", "PC", "TL", "Admin"]) ||
        userData._id == sideBarContentId2) && {
        key: "Projectexpences",
        icon: <i className="fi fi-rr-receipt"></i>,
        label: "Project Expense",
        onClick: () => handleMenuClick("Projectexpences", `/${companySlug}/projectexpense`),
      },
      getRoles(["Admin"]) &&{
        key: "Admin_Settings",
        icon: <SettingOutlined />,
        label: "Settings",
        onClick: () => handleMenuClick("Admin_Settings", `/${companySlug}/admin/settings`)
      },
    ],
    []
  );

  const onOpenChange = useCallback(
    (keys) => {
      const latestOpenKey = keys.find((key) => !openKeys.includes(key));
      setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
    },
    [openKeys]
  );

  const menuComponent = useMemo(
    () => (
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        items={item}
      />
    ),
    [selectedKeys, openKeys, onOpenChange, item]
  );

  const companyLogoPath = localStorage.getItem(`companyLogoUrl-${companySlug}`);

  return (
    <>
      <div className="gx-sidebar-content sidebar-menu">
    
        <div className="Etask-hub-logo" style={{cursor:"pointer"}} onClick={()=> history.push(`/${companySlug}/dashboard`)}>
          <img alt="logo" src={companyLogoPath ? `${process.env.REACT_APP_API_URL}/public/${companyLogoPath}` : Taskhub} />{" "}
        </div>
        <CustomScrollbars className="gx-layout-sider-scrollbar">
          <Sider
            collapsible
            collapsed={sidebarCollapsed}
            onCollapse={setSidebarCollapsed}
            className="Sidebar"
          >
            {menuComponent}
          </Sider>
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
        </CustomScrollbars>
      </div>
    </>
  );
}

SidebarContent.propTypes = {
  setSidebarCollapsed: PropTypes.func.isRequired,
};
export default SidebarContent;
