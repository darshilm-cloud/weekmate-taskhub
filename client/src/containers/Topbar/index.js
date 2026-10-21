import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layout, Form, Popover, Input, Dropdown } from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  SearchOutlined,
  SettingOutlined,
  // ApartmentOutlined, // Department hidden
  BellOutlined,
  MenuOutlined,
  LeftOutlined,
} from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import UserProfile from "../Sidebar/UserProfile";
import ProjectListModal from "../../components/Modal/ProjectListModal";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { toggleCollapsedSideNav } from "../../appRedux/actions/Setting";
import { TAB_SIZE } from "../../constants/ThemeSetting";
import { getRoles, hasPermission } from "../../util/hasPermission";
import "./Topbar.css";

const { Header } = Layout;

function Topbar() {
  const companySlug = typeof localStorage !== "undefined" ? localStorage.getItem("companyDomain") : "";
  // Show the human-readable company name (e.g. "Acme Corp"), not the URL slug
  // (e.g. "acme-corp"). The name is part of the logged-in user payload stored in
  // `user_data`; fall back to the prettified slug only if it's missing.
  const companyName = (() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
      return (
        userData?.companyDetails?.companyName ||
        localStorage.getItem(`title-${companySlug}`) ||
        ""
      );
    } catch (e) {
      return "";
    }
  })();
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
        { label: "Company Profile", path: `/${companySlug}/admin/company-management` },
        { label: "System Settings", path: `/${companySlug}/admin/settings` },
        { label: "Project Form Builder", path: `/${companySlug}/admin/project-form-builder` },
        { label: "Task Form Builder", path: `/${companySlug}/admin/task-form-builder` },
        { label: "Permission Management", path: `/${companySlug}/permission-access` },
        { label: "Activity Logs", path: `/${companySlug}/admin/activity-logs` },
        { label: "Resource Matrix", path: `/${companySlug}/resource-matrix` },
      ],
    },
    {
      group: "ORGANIZATION STRUCTURE",
      items: [
        { label: "WorkFlow", path: `/${companySlug}/workflows` },
        // { label: "Departments", path: `/${companySlug}/project-technologies` }, // Department hidden
        { label: "Categories", path: `/${companySlug}/manage-project-type` },
        { label: "Status", path: `/${companySlug}/project-status` },
        { label: "Labels", path: `/${companySlug}/project-labels` },
        { label: "Resource", path: `/${companySlug}/resources` },
        // Task Stages removed - manage stages via Workflow → Edit
        ...(hasAnyProjectBugsEnabled
          ? [{ label: "Bug Stages", path: `/${companySlug}/bug-workflow-stages` }]
          : []),
        { label: "Archived Project", path: `/${companySlug}/project-archieved` },
        { label: "Trash", path: `/${companySlug}/trash` },
      ],
    },
  ]), [companySlug, hasAnyProjectBugsEnabled]);

  // paths that appear more than once should never be highlighted
  const allPaths = SETTINGS_MENU.flatMap(s => s.items.map(i => i.path));
  const uniquePaths = new Set(allPaths.filter((p, _, arr) => arr.indexOf(p) === arr.lastIndexOf(p)));

  // Settings gear: Admins, or roles with Settings Read (Permission Management).
  const canOpenSettings = getRoles(["Admin"]) || hasPermission(["settings_view"]);

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
  const { navCollapsed, width } = useSelector(({ common }) => common);
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Installed PWA (display-mode: standalone) has no browser back button, so the
  // header gets one. Also flags <body> for standalone-only CSS.
  const isStandalone = useMemo(
    () =>
      (typeof window !== "undefined" &&
        (window.matchMedia?.("(display-mode: standalone)")?.matches ||
          window.navigator.standalone === true)) ||
      false,
    []
  );
  useEffect(() => {
    document.body.classList.toggle("wm-standalone", isStandalone);
  }, [isStandalone]);
  const canGoBack =
    isStandalone &&
    !/\/(dashboard|signin)\/?$/.test(location.pathname) &&
    window.history.length > 1;
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
            {width < TAB_SIZE && (
              <span
                className="gx-pointer gx-mr-xs-5 gx-pt-xs-1"
                onClick={() => {
                  dispatch(toggleCollapsedSideNav(!navCollapsed));
                }}
                style={{ marginRight: 16 }}
              >
                <MenuOutlined style={{ fontSize: 20 }} />
              </span>
            )}
            {canGoBack && (
              <button
                type="button"
                className="weekmate-header-icon-btn wm-header-back-btn"
                aria-label="Go back"
                onClick={() => history.goBack()}
              >
                <LeftOutlined />
              </button>
            )}
            <div className="weekmate-header-title">
              {companyName ||
                (companySlug ? companySlug.replace(/-/g, " ") : "Demo Tech")}
            </div>
          </div>
          <div className="weekmate-header-right">
          <div className={`weekmate-header-center${isModalOpen ? " wm-search-open" : ""}`}>
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
              placement="bottomRight"
            >
              <Input
                className="weekmate-navbar-search-input"
                placeholder="Search projects, tasks..."
                prefix={<SearchOutlined />}
                allowClear
                value={topbarSearchValue}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onClick={showModal}
              />
            </Dropdown>
          </div>
            {canOpenSettings && (
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
            )}
            <UserProfile />
          </div>
        </div>
      </Header>

    </>
  );
}

export default Topbar;
