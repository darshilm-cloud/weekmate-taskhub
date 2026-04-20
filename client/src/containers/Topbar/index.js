import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layout, Form, Popover, Input, Dropdown } from "antd";
import { useDispatch } from "react-redux";
import {
  SearchOutlined,
  SettingOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BankOutlined,
  BellOutlined,
  ClusterOutlined,
  DeleteOutlined,
  InboxOutlined,
  HistoryOutlined,
  LockOutlined,
  NodeIndexOutlined,
  TagsOutlined,
  TeamOutlined,
  FormOutlined,
} from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import UserProfile from "../Sidebar/UserProfile";
import ProjectListModal from "../../components/Modal/ProjectListModal";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import "./Topbar.css";

const { Header } = Layout;

function Topbar() {
  const companySlug = typeof localStorage !== "undefined" ? localStorage.getItem("companyDomain") : "";
  const history = useHistory();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasAnyProjectBugsEnabled, setHasAnyProjectBugsEnabled] = useState(false);

  const getProjectBugsEnabled = useCallback((project) => {
    return Boolean(
      project?.isBugsEnabled ??
      project?.is_bugs_enabled ??
      project?.bugs_enabled
    );
  }, []);

  const SETTINGS_MENU = useMemo(() => ([
    {
      group: "GENERAL",
      items: [
        { label: "Company Profile",       icon: <BankOutlined />,    path: `/${companySlug}/admin/company-management` },
        { label: "System Settings",       icon: <SettingOutlined />, path: `/${companySlug}/admin/settings` },
        { label: "Project Form Builder",  icon: <FormOutlined />,    path: `/${companySlug}/admin/project-form-builder` },
        { label: "Task Form Builder",     icon: <FormOutlined />,    path: `/${companySlug}/admin/task-form-builder` },
        { label: "Permission Management", icon: <LockOutlined />,    path: `/${companySlug}/permission-access` },
        { label: "Activity Logs",         icon: <HistoryOutlined />, path: `/${companySlug}/admin/activity-logs` },
        { label: "Resource Matrix",       icon: <TeamOutlined />, path: `/${companySlug}/resource-matrix` },
      ],
    },
    {
      group: "PROJECT SETTINGS",
      items: [
        { label: "WorkFlow",           icon: <NodeIndexOutlined />,    path: `/${companySlug}/workflows` },
        { label: "Departments",        icon: <ApartmentOutlined />,    path: `/${companySlug}/project-technologies` },
        { label: "Categories",      icon: <AppstoreOutlined />,     path: `/${companySlug}/manage-project-type` },
        { label: "Status",             icon: <ClusterOutlined />,      path: `/${companySlug}/project-status` },
        { label: "Labels",             icon: <TagsOutlined />,         path: `/${companySlug}/project-labels` },
        { label: "Resource",           icon: <TeamOutlined />,         path: `/${companySlug}/resources` },
        { label: "Task Stages",        icon: <NodeIndexOutlined />,    path: `/${companySlug}/workflow-stages` },
        ...(hasAnyProjectBugsEnabled
          ? [{ label: "Bug Stages", icon: <NodeIndexOutlined />, path: `/${companySlug}/bug-workflow-stages` }]
          : []),
        { label: "Archived Project",   icon: <InboxOutlined />,        path: `/${companySlug}/project-archieved` },
        { label: "Trash",              icon: <DeleteOutlined />,       path: `/${companySlug}/trash` },
      ],
    },
  ]), [companySlug, hasAnyProjectBugsEnabled]);

  // paths that appear more than once should never be highlighted
  const allPaths = SETTINGS_MENU.flatMap(s => s.items.map(i => i.path));
  const uniquePaths = new Set(allPaths.filter((p, _, arr) => arr.indexOf(p) === arr.lastIndexOf(p)));

  const settingsContent = (
    <div className="wm-settings-dropdown">
      {SETTINGS_MENU.map((section) => (
        <div key={section.group} className="wm-settings-group">
          <div className="wm-settings-group-header">
            <div className="wm-settings-group-title">{section.group}</div>
          </div>
          <ul className="wm-settings-list">
            {section.items.map((item) => {
              const isActive = location.pathname === item.path && uniquePaths.has(item.path);
              return (
                <li
                  key={item.label}
                  className={`wm-settings-item${isActive ? " active" : ""}`}
                  onClick={() => {
                    history.push(item.path);
                    setSettingsOpen(false);
                  }}
                >
                  <span className="wm-settings-item-icon">{item.icon}</span>
                  <span className="wm-settings-item-label">{item.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [recentList, setRecentList] = useState([]);
  const [isProjectListLoading, setIsProjectListLoading] = useState(false);
  const [isRecentListLoading, setIsRecentListLoading] = useState(false);
  const [topbarSearchValue, setTopbarSearchValue] = useState("");
  const searchModalRef = useRef(null);
  const projectRequestRef = useRef(null);
  const recentRequestRef = useRef(null);

  const getProjectList = useCallback(async ({ forceRefresh = false, useLoader = false } = {}) => {
    const cacheKey = "sidebar_project_list_search_modal_v2";

    if (!forceRefresh) {
      const cachedProjects = sessionStorage.getItem(cacheKey);
      if (cachedProjects) {
        try {
          const parsedProjects = JSON.parse(cachedProjects);
          if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
            setProjectList(parsedProjects);
            setHasAnyProjectBugsEnabled(parsedProjects.some(getProjectBugsEnabled));
          }
        } catch (error) {
          sessionStorage.removeItem(cacheKey);
        }
      }
    }

    if (projectRequestRef.current) {
      return projectRequestRef.current;
    }

    setIsProjectListLoading(true);

    try {
      if (useLoader) {
        dispatch(showAuthLoader());
      }

      projectRequestRef.current = Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListForSearch,
        body: {
          pageNo: 1,
          limit: 500,
          sortBy: "desc",
          filterBy: "all",
        },
      });
      const response = await projectRequestRef.current;

      if (useLoader) {
        dispatch(hideAuthLoader());
      }

      if (Array.isArray(response?.data?.data)) {
        setProjectList(response.data.data);
        setHasAnyProjectBugsEnabled(response.data.data.some(getProjectBugsEnabled));
        sessionStorage.setItem(cacheKey, JSON.stringify(response.data.data));
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    } finally {
      projectRequestRef.current = null;
      setIsProjectListLoading(false);
    }
  }, [dispatch, getProjectBugsEnabled]);

  const getVisitedData = useCallback(async () => {
    if (recentRequestRef.current) {
      return recentRequestRef.current;
    }

    setIsRecentListLoading(true);
    try {
      recentRequestRef.current = Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getrecentVisited,
      });
      const response = await recentRequestRef.current;
      if (response?.data?.statusCode === 200) {
        setRecentList(response.data.data);
      }
    } catch (error) {
      console.log("get project error");
    } finally {
      recentRequestRef.current = null;
      setIsRecentListLoading(false);
    }
  }, []);

  const addVisitedData = async (projectId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addrecentVisited,
        body: { project_id: projectId },
      });
      if (response?.data?.statusCode === 200) {
        dispatch(hideAuthLoader());
      }
    } catch (error) {
      console.log("add project error");
    }
  };

  const removeVisitedData = async (recentId) => {
    try {
      setRecentList((prev) => prev.filter((item) => item._id !== recentId));
      await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.removerecentVisited,
        body: { recent_id: recentId },
      });
    } catch (error) {
      console.log("remove recent project error");
      getVisitedData();
    }
  };

  const showModal = async () => {
    setIsModalOpen(true);
    getProjectList({ useLoader: projectList.length === 0 });
    getVisitedData();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setTopbarSearchValue("");
  };

  const handleSearchChange = (e) => {
    setTopbarSearchValue(e.target.value);
    if (!isModalOpen) {
      showModal();
    }
  };

  const handleSearchKeyDown = (e) => {
    if (searchModalRef.current) {
      searchModalRef.current.handleKeyDown(e);
    }
  };

  useEffect(() => {
    getProjectList();
    getVisitedData();
  }, [getProjectList, getVisitedData]);

  useEffect(() => {
    const handleProjectsChanged = (event) => {
      if (event?.detail?.action === "toggle-bugs" && event?.detail?.isBugsEnabled === true) {
        setHasAnyProjectBugsEnabled(true);
      }
      getProjectList({ forceRefresh: true });
    };
    window.addEventListener("weekmate:projects-changed", handleProjectsChanged);
    return () => {
      window.removeEventListener("weekmate:projects-changed", handleProjectsChanged);
    };
  }, [getProjectList]);

  return (
    <>
      <Header className="top-header top-header-icons weekmate-header taskpad-header weekmate-header-shell">
        <div className="weekmate-header-card">
          <div className="weekmate-header-left">
          <div className="weekmate-header-title">
            {companySlug ? companySlug.replace(/-/g, " ") : "Demo Tech"}
          </div>
        </div>
          <div className="weekmate-header-center">
            <Dropdown
              overlay={
                <ProjectListModal
                  ref={searchModalRef}
                  projectList={projectList}
                  recentList={recentList}
                  isProjectListLoading={isProjectListLoading}
                  isRecentListLoading={isRecentListLoading}
                  isModalOpen={isModalOpen}
                  handleCancel={handleCancel}
                  addVisitedData={addVisitedData}
                  removeVisitedData={removeVisitedData}
                  setIsModalOpen={setIsModalOpen}
                  form={form}
                  asDropdown={true}
                  searchValue={topbarSearchValue}
                />
              }
              trigger={['click']}
              open={isModalOpen}
              onOpenChange={(flag) => {
                if (flag) {
                   showModal();
                } else {
                   handleCancel();
                }
              }}
              overlayClassName="wm-search-dropdown-overlay"
              placement="bottomLeft"
            >
              <Input
                className="weekmate-navbar-search-input"
                placeholder="Search"
                prefix={<SearchOutlined />}
                value={topbarSearchValue}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onClick={showModal}
              />
            </Dropdown>
          </div>
          <div className="weekmate-header-right">
            <Popover
              content={settingsContent}
              trigger="click"
              placement="bottomRight"
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              overlayClassName="wm-settings-popover"
              arrow={false}
            >
              <button
                type="button"
                className={`weekmate-header-icon-btn${settingsOpen ? " active" : ""}`}
              >
                <SettingOutlined />
              </button>
            </Popover>
            <UserProfile />
          </div>
        </div>
      </Header>

    </>
  );
}

export default Topbar;
