import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Menu,
  Popover,
  message,
  Modal,
  Form,
  Input,
  Table,
  Switch,
  Radio,
  Select,
  Spin,
} from "antd";
import { useParams, useLocation, useHistory } from "react-router-dom";

import DiscussionForm from "../Discussion/DiscussionForm";
import TimeForPMS from "./TimeForPMS";
import TasksPMS from "../../pages/Tasks/index";
import NotesPMS from "./NotesPMS";
import Service from "../../service";
import Overview from "../../pages/Overview/index";
import BugsPMS from "../../pages/Bugs/index";
import FileModule from "../FileModule.js/FileModule";
import queryString from "query-string";
import {
  DownOutlined,
  LeftOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import {
  getSubscribersList,
} from "../../appRedux/reducers/ApiData";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import { hasPermission, getRoles } from "../../util/hasPermission";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import dayjs from "dayjs";
import TasksGanttView from "../../pages/Tasks/TasksGanttView";
import "./ProgressBoard.css";
import "../../pages/TaskPage/TaskPage.css";
import ManagePeopleModal from "../Modal/ManagePeopleModal";
import { generateCacheKey } from "../../util/generateCacheKey";

const { Option } = Select;

const CALENDAR_MONTH_OPTIONS = dayjs.months().map((label, value) => ({
  value,
  label,
}));

function updateCalendarMonthYear(currentDate, nextMonth, nextYear) {
  const targetYear = Number.isInteger(nextYear) ? nextYear : currentDate.year();
  const targetMonth = Number.isInteger(nextMonth) ? nextMonth : currentDate.month();
  const safeDay = Math.min(currentDate.date(), dayjs().year(targetYear).month(targetMonth).daysInMonth());
  return currentDate.year(targetYear).month(targetMonth).date(safeDay);
}

function normalizeKanbanStatusKey(status) {
  const title = String(status?.title || status?.name || status || "").toLowerCase();
  const compact = title.replace(/[\s_-]+/g, "");

  if (compact.includes("todo")) return "todo";
  if (compact.includes("inprogress") || title.includes("progress")) return "inprogress";
  if (compact.includes("onhold") || title.includes("hold") || title.includes("review")) return "onhold";
  if (title.includes("done") || title.includes("complete") || title.includes("closed")) return "done";

  return title.trim() || "_none_";
}

function getKanbanStatusMeta(status) {
  const key = normalizeKanbanStatusKey(status);

  if (key === "todo") return { key, title: "To-Do", color: "#64748b" };
  if (key === "inprogress") return { key, title: "In Progress", color: "#ef4444" };
  if (key === "onhold") return { key, title: "On Hold", color: "#f59e0b" };
  if (key === "done") return { key, title: "Done", color: "#22c55e" };

  return {
    key,
    title: status?.title || status?.name || "No status",
    color: status?.color || "#d9d9d9",
  };
}

function ProgressBoardofProject() {
  const companySlug = localStorage.getItem("companyDomain");

  const { emitEvent } = useSocketAction();
  const { projectId } = useParams();
  const history = useHistory();
  const location = useLocation();
  const { tab, taskID, listID } = queryString.parse(location.search);
  const dispatch = useDispatch();

  const [selectedTab, setSelectedTab] = useState("Overview");
  const [projStatus, setProjStatus] = useState([]);
  const [category, setCategory] = useState([]);
  const [projectData, setProjectData] = useState({});
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [manageModal, setManageModal] = useState(false);
  const [manageTabs, setTabsModal] = useState(false);
  const [managerList, setManager] = useState([]);
  const [accountManagerList, setAccountManagerList] = useState([]);
  const [clientList, setClientList] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [columnDetails, setColumnDetails] = useState([]);
  const [assigneesflag, setAssigneesFlag] = useState(0);
  const [managePeopleForm] = Form.useForm();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [initialDetails, setInitialDetails] = useState({});
  const [peopleValues, setPeopleValues] = useState({
    assignees: [],
    clients: [],
    manager: [],
    acc_manager: []
  });
  const [projectTasks, setProjectTasks] = useState([]);
  const [projectTasksLoading, setProjectTasksLoading] = useState(false);
  const [calendarMode, setCalendarMode] = useState("month");
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const isBugsTabEnabledForProject = Boolean(
    projectData?.isBugsEnabled ??
      projectData?.is_bugs_enabled ??
      projectData?.bugs_enabled
  );

  const handleChange = (name, value) => {
    setPeopleValues({ ...peopleValues, [name]: value });
  };

  const handleCancelManageModal = () => {
    setManageModal(false);
  };

  const columns = [
    {
      title: "Tabs",
      dataIndex: "tabs",
      key: "tabs",
      text: "Testing",
      render: (text, record, index) => {
        return (
          <span style={{ textTransform: "capitalize" }}>
            {record?.tab_id?.name}
          </span>
        );
      },
    },
    {
      title: "Enable",
      dataIndex: "isEnable",
      key: "isEnable",
      render: (text, record, index) => {
        return (
          <Switch
            checked={record.isEnable}
            disabled={record?.isDefault === true}
            onChange={(checked) => {
              handleTabChange(
                record?._id,
                projectId,
                checked,
                record?.isDefault
              );
            }}
            size="small"
          />
        );
      },
    },
    {
      title: "Set as Default",
      dataIndex: "isDefault",
      key: "isDefault",
      render: (text, record, index) => {
        return (
          <Radio
            checked={record?.isDefault}
            disabled={record?.isEnable === false}
            onChange={(checked) =>
              handleTabChange(
                record?._id,
                projectId,
                record?.isEnable,
                checked?.target?.checked
              )
            }
          >
            Default
          </Radio>
        );
      },
    },
  ];

  const handleTabChange = async (id, projectId, isEnable, isDefault) => {
    try {
      const reqBody = {
        setting_id: id,
        project_id: projectId,
        isEnable: isEnable,
        isDefault: isDefault,
      };

      const updatedColumns = columnDetails.map((column) => {
        if (column._id === id) {
          return { ...column, isDefault: isDefault };
        }
        return column;
      });

      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.EditTabSetting,
        body: reqBody,
      });

      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setColumnDetails(updatedColumns);
        getManageTabs();
        getProjectByID();
        // setTabsModal(false);
      }
    } catch (error) {
      console.log(error, "Manage Tabs");
    }
  };

  const getManageTabs = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getTabSetting + `${projectId}`,
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setColumnDetails(response.data.data);
      }
    } catch (error) {
      console.log(error, "Manage Tabs");
    }
  };
  const handleLiClick = (tab) => {
    // Update the selectedTab state with the clicked tab
    setSelectedTab(tab);
    // Extract current search parameters
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("tab", tab);
    searchParams.delete("listID", listID);

    if (taskID) {
      searchParams.set("listID", listID);
      searchParams.delete("taskID", taskID);
    }

    // Update the URL without reloading the page
    history.push({
      pathname: window.location.pathname,
      search: searchParams.toString(),
    });
  };

  const getProjectByID = async () => {
    try {
      const reqBody = {
        _id: projectId,
      };
      let Key = generateCacheKey("project", reqBody);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: {
          "cachekey": Key
        }
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setProjectData(response.data.data);
        setInitialDetails(response.data.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getManager = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectManager,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setManager(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getAccountManager = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getAccountManager,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setAccountManagerList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getClients = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getClients,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setClientList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getAssignees = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployees,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setAssignees(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleManagePeople = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        manager: values.manager,
        acc_manager: values.acc_manager,
        assignees: values.assignees,
        pms_clients: values.clients,
      };
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.managePeople}/${projectId}`,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        dispatch(hideAuthLoader());
        message.success(response.data.message);
        setAssigneesFlag(1);
        getProjectByID();
        dispatch(getSubscribersList(projectId));

        let assignee = new Set(
          (initialDetails?.assignees || [])
            .map((item) => item?._id)
            .filter(Boolean)
        );
        let newAssignees = (values.assignees || []).filter(
          (id) => !assignee.has(id)
        );

        let client = new Set(
          (initialDetails?.pms_clients || [])
            .map((item) => item?._id)
            .filter(Boolean)
        );
        let newClients = (values.clients || []).filter(
          (id) => !client.has(id)
        );
        let newManagerId;

        if (initialDetails?.manager?._id !== values.manager) {
          newManagerId = values.manager;
        }

        await emitEvent(socketEvents.EDIT_PROJECT_ASSIGNEE, {
          _id: projectId,
          manager: newManagerId,
          assignees: newAssignees,
          pms_clients: newClients,
        });
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
    setManageModal(false);
  };

  useEffect(() => {
    getManager();
    getAccountManager();
    getClients();
    getAssignees();
    getProjectByID();
    getManageTabs();
  }, [projectId]);

  useEffect(() => {
    myProjects();
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const _isAdmin = getRoles(["Admin"]);
    const canViewTasks = _isAdmin || hasPermission(["tasks_view", "tasks_manage", "task_add", "task_edit", "task_delete"]);
    const canViewBugs  = _isAdmin || hasPermission(["bugs_view", "bugs_manage", "bug_add", "bug_edit", "bug_delete"]);
    const canViewTime  = _isAdmin || hasPermission(["view_timesheet", "timesheet_add", "timesheet_edit", "timesheet_delete", "timesheet_manage"]);

    switch (tab) {
      case "Tasks":
        setSelectedTab(canViewTasks ? "Tasks" : "Overview");
        break;
      case "Time":
        setSelectedTab(canViewTime ? "Time" : "Overview");
        break;
      case "Bugs":
        setSelectedTab(canViewBugs && isBugsTabEnabledForProject ? "Bugs" : "Overview");
        break;
      case "Discussion":
        setSelectedTab("Discussion");
        break;
      case "Files":
        setSelectedTab("Files");
        break;
      case "Notes":
        setSelectedTab("Notes");
        break;
      case "Calendar":
        setSelectedTab(canViewTasks ? "Calendar" : "Overview");
        break;
      case "Gantt":
        setSelectedTab(canViewTasks ? "Gantt" : "Overview");
        break;
      default:
        setSelectedTab("Overview");
        break;
    }
  }, [tab, isBugsTabEnabledForProject]);

    const tabsAfterSettings = columnDetails.filter(
    (item) => item.isEnable === true
  );

  
    const tabOptions = [
    {
      key: "Overview",
      label: (
        <Menu.Item onClick={() => handleLiClick("Overview")}>
          Overview
        </Menu.Item>
      ),
    },
    {
      key: "Tasks",
      label: (
        <Menu.Item onClick={() => handleLiClick("Tasks")}>Tasks</Menu.Item>
      ),
    },
    {
      key: "Bugs",
      label: <Menu.Item onClick={() => handleLiClick("Bugs")}>Bugs</Menu.Item>,
    },
    {
      key: "Notes",
      label: (
        <Menu.Item onClick={() => handleLiClick("Notes")}>Notes</Menu.Item>
      ),
    },
    {
      key: "Files",
      label: (
        <Menu.Item onClick={() => handleLiClick("Files")}>Files</Menu.Item>
      ),
    },
    {
      key: "Time",
      label: "Time",
      label: <Menu.Item onClick={() => handleLiClick("Time")}>Time</Menu.Item>,
    },
    {
      key: "Calendar",
      label: (
        <Menu.Item onClick={() => handleLiClick("Calendar")}>
          Calendar
        </Menu.Item>
      ),
    },
    {
      key: "Gantt",
      label: (
        <Menu.Item onClick={() => handleLiClick("Gantt")}>
          Gantt
        </Menu.Item>
      ),
    },
    {
      key: "Discussion",
      label: (
        <Menu.Item onClick={() => handleLiClick("Discussion")}>
          Discussion
        </Menu.Item>
      ),
    },
  ];
  
    const isAdmin = getRoles(["Admin"]);
  const filteredTabOptions = tabOptions.filter((tab) => {
    if (tab.key === "Tasks") {
      if (!isAdmin && !hasPermission(["tasks_view", "tasks_manage", "task_add", "task_edit", "task_delete"])) return false;
      return tabsAfterSettings.some((item) => item.tab_id.name === tab.key);
    }
    if (tab.key === "Bugs") {
      if (!isAdmin && !hasPermission(["bugs_view", "bugs_manage", "bug_add", "bug_edit", "bug_delete"])) return false;
      return isBugsTabEnabledForProject;
    }
    if (tab.key === "Time") {
      if (!isAdmin && !hasPermission(["view_timesheet", "timesheet_add", "timesheet_edit", "timesheet_delete", "timesheet_manage"])) return false;
      return tabsAfterSettings.some((item) => item.tab_id.name === tab.key);
    }
    if (tab.key === "Calendar" || tab.key === "Gantt") {
      if (!isAdmin && !hasPermission(["tasks_view", "tasks_manage", "task_add", "task_edit", "task_delete"])) return false;
      return true;
    }
    return tabsAfterSettings.some((item) => item.tab_id.name === tab.key);
  });

  useEffect(() => {
    if (!isBugsTabEnabledForProject && selectedTab === "Bugs") {
      setSelectedTab("Overview");
    }
  }, [isBugsTabEnabledForProject, selectedTab]);

  useEffect(() => {
    if (filteredTabOptions.length > 0 && !filteredTabOptions.some((t) => t.key === selectedTab)) {
      setSelectedTab("Overview");
    }
  }, [filteredTabOptions, selectedTab]);

  const fetchProjectTasksForTimeline = useCallback(async () => {
    if (!projectId) return;
    try {
      setProjectTasksLoading(true);
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskList,
        body: {
          project_id: [projectId],
          pageNo: 1,
          limit: 5000,
          status: "all",
        },
      });
      if (res?.status === 200) {
        setProjectTasks(Array.isArray(res?.data?.data) ? res.data.data : []);
      } else {
        setProjectTasks([]);
      }
    } catch (error) {
      setProjectTasks([]);
      console.log(error, "fetchProjectTasksForTimeline");
    } finally {
      setProjectTasksLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedTab === "Calendar" || selectedTab === "Gantt") {
      fetchProjectTasksForTimeline();
    }
  }, [selectedTab, fetchProjectTasksForTimeline]);

  const calendarYearOptions = useMemo(() => {
    const currentYear = dayjs().year();
    return Array.from({ length: 21 }, (_, index) => currentYear - 10 + index);
  }, []);

  const calendarTasksByDate = useMemo(() => {
    const map = {};
    projectTasks.forEach((task) => {
      if (!task?.due_date) return;
      const dateKey = dayjs(task.due_date).format("DD-MM-YYYY");
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(task);
    });
    return map;
  }, [projectTasks]);

  const ganttBoards = useMemo(() => {
    const grouped = {};
    projectTasks.forEach((task) => {
      const meta = getKanbanStatusMeta(task?.task_status);
      if (!grouped[meta.key]) {
        grouped[meta.key] = {
          workflowStatus: {
            _id: task?._stId || task?.task_status?._id || meta.key,
            title: meta.title,
            color: meta.color,
          },
          tasks: [],
        };
      }
      grouped[meta.key].tasks.push(task);
    });

    const statusOrder = ["todo", "inprogress", "onhold", "done"];
    return Object.values(grouped).sort((a, b) => {
      const aKey = normalizeKanbanStatusKey(a?.workflowStatus);
      const bKey = normalizeKanbanStatusKey(b?.workflowStatus);
      const aIndex = statusOrder.indexOf(aKey);
      const bIndex = statusOrder.indexOf(bKey);
      const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      if (normalizedA !== normalizedB) return normalizedA - normalizedB;
      return String(a?.workflowStatus?.title || "").localeCompare(String(b?.workflowStatus?.title || ""));
    });
  }, [projectTasks]);




  const title = projectData?.title;
  const formattedTitle = title?.replace(
    /(^|\s)([a-z])/g,
    (match, p1, p2) => p1 + p2.toUpperCase()
  );

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setSearchQuery("");
  };

  const handleBookmark = async (item) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        api_url: `${Service.bookmarked}/${item?._id}`,
        methodName: Service.putMethod,
        body: { isStarred: !item.isStarred },
      });
      if (response?.data) {
        dispatch(hideAuthLoader());
        myProjects();
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get project list
  const myProjects = async () => {
    try {
      dispatch(showAuthLoader());
      let reqBody;
      if (category && category.length > 0) {
        reqBody = {
          ...reqBody,
          category: category,
          category: category,
        };
      }
      if (projStatus && projStatus.length > 0) {
        reqBody = {
          ...reqBody,
          project_status: projStatus,
        };
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: reqBody,
      });

      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setProjectList(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "myProject error");
    }
  };

  const getSortingKey = (title) => {
    const parts = title.split("/");
    return parts.length > 2 ? parts.slice(2).join("/") : title;
  };

  const filteredProjectList = projectList.filter((item) =>
    item.title?.toLowerCase().includes(searchQuery?.toLowerCase())
  );

  const sortedProjectList = [...filteredProjectList].sort((a, b) => {
    if (a.isStarred && !b.isStarred) return -1;
    if (!a.isStarred && b.isStarred) return 1;

    const titleA = getSortingKey(a.title?.toLowerCase());
    const titleB = getSortingKey(b.title?.toLowerCase());
    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;
    return 0;
  });

  const projectSwitcherContent = (
    <div className="pb-project-switcher-menu">
      <div className="pb-project-switcher-search">
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="pb-project-switcher-list">
        {sortedProjectList.length === 0 ? (
          <p className="no-data-found-drawer-antd">No data found</p>
        ) : (
          sortedProjectList.map((item, index) => (
            <div key={index} className="project-name-drawers pb-project-switcher-item">
              <span
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleBookmark(item);
                }}
                style={{ cursor: "pointer" }}
              >
                {item.isStarred ? (
                  <StarFilled style={{ color: "#ffd200" }} />
                ) : (
                  <StarOutlined />
                )}
              </span>
              <Link
                to={`/${companySlug}/project/app/${item?._id}?tab=${item?.defaultTab?.name}`}
                onClick={() => closeDrawer()}
              >
                <p>
                  {item.title?.length > 36
                    ? `${item.title.slice(0, 35)}...`
                    : item.title}
                </p>
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Project Top Bar ── */}
      <div className="pb-topbar">

        {/* ── Header row: back arrow + title + manage + mobile tabs ── */}
        <div className="pb-header">
          <div className="pb-header-left">
            {/* Back to projects list */}
            <Link
              to={`/${companySlug}/project-list`}
              className="pb-back-btn"
              title="All Projects"
            >
              <LeftOutlined />
            </Link>

            <Popover
              trigger="click"
              placement="bottomLeft"
              arrow={false}
              overlayClassName="pb-project-switcher-popover"
              visible={drawerVisible}
              onVisibleChange={(visible) => {
                if (visible) {
                  showDrawer();
                } else {
                  closeDrawer();
                }
              }}
              content={projectSwitcherContent}
            >
              <button type="button" className="pb-project-switcher-trigger">
                <span className="pb-project-title">
                  {formattedTitle?.length > 59
                    ? `${formattedTitle.slice(0, 59)}...`
                    : formattedTitle}
                </span>
                <DownOutlined className={`pb-project-switcher-icon ${drawerVisible ? "is-open" : ""}`} />
              </button>
            </Popover>

          </div>

          {/* Mobile: show tab switcher in header-right */}
          {windowWidth <= 991 && projectData?.project_status?.title?.toLowerCase() !== "archived" && (
            <div className="pb-header-right">
              <Popover
                content={
                  <Menu>
                    {filteredTabOptions.map((option) => (
                      <Menu.Item key={option.key} onClick={() => handleLiClick(option.key)}>
                        {option.key}
                      </Menu.Item>
                    ))}
                  </Menu>
                }
                placement="bottomLeft"
                trigger="click"
              >
                <button className="pb-tabs-mobile-btn">
                  <i className="fi fi-bs-menu-dots"></i>
                </button>
              </Popover>
            </div>
          )}
        </div>

        {/* ── Tabs bar (desktop only) ── */}
        {windowWidth > 991 && projectData?.project_status?.title?.toLowerCase() !== "archived" && (
          <div className="pb-tabs-bar">
            {filteredTabOptions.map((option) => (
              <button
                key={option.key}
                className={`pb-tab-btn ${selectedTab === option.key ? "pb-tab-btn--active" : ""}`}
                onClick={() => handleLiClick(option.key)}
              >
                {option.key}
              </button>
            ))}
          </div>
        )}

      </div>{/* /pb-topbar */}

      {projectData?.project_status?.title?.toLowerCase() === "archived" && (
        <div className="project-archived-overlay">
          <div className="project-archived-message">
            <i className="fi fi-rs-box-archive"></i>
            <h2>This Project is Archived</h2>
            <p>No tasks, bugs, or actions can be taken while the project is in the archive.</p>
          </div>
        </div>
      )}

      {selectedTab === "Overview" && <Overview />}
      {selectedTab === "Tasks" && (
        <div className="pb-tasks-pane">
          <TasksPMS flag={assigneesflag} />
        </div>
      )}
      {selectedTab === "Bugs" && isBugsTabEnabledForProject && <BugsPMS />}
      {selectedTab === "Notes" && <NotesPMS />}
      {selectedTab === "Files" && <FileModule />}
      {selectedTab === "Time" && <TimeForPMS />}
      {selectedTab === "Calendar" && (
        <div className="task-calendar-view" style={{ margin: "16px" }}>
          <div className="calendar-toolbar">
            <button type="button" onClick={() => setCalendarDate(calendarDate.subtract(1, calendarMode))}>&lt;</button>
            <div className="calendar-title-group">
              <span className="calendar-title">
                {calendarDate.format(calendarMode === "month" ? "DD-MM-YYYY" : "DD-MM-YYYY")}
              </span>
              <div className="calendar-month-year-controls">
                <Select
                  value={calendarDate.month()}
                  onChange={(month) => setCalendarDate((current) => updateCalendarMonthYear(current, month))}
                  className="calendar-toolbar-select"
                  size="middle"
                >
                  {CALENDAR_MONTH_OPTIONS.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
                <Select
                  value={calendarDate.year()}
                  onChange={(year) => setCalendarDate((current) => updateCalendarMonthYear(current, undefined, year))}
                  className="calendar-toolbar-select calendar-toolbar-select-year"
                  size="middle"
                >
                  {calendarYearOptions.map((year) => (
                    <Option key={year} value={year}>
                      {year}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
            <button type="button" onClick={() => setCalendarDate(calendarDate.add(1, calendarMode))}>&gt;</button>
            <div className="calendar-mode">
              <button className={calendarMode === "month" ? "active" : ""} onClick={() => setCalendarMode("month")}>Month</button>
              <button className={calendarMode === "week" ? "active" : ""} onClick={() => setCalendarMode("week")}>Week</button>
              <button className={calendarMode === "day" ? "active" : ""} onClick={() => setCalendarMode("day")}>Day</button>
            </div>
          </div>
          {projectTasksLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
              <Spin />
            </div>
          ) : (
            <CalendarGridForProject mode={calendarMode} current={calendarDate} tasksByDate={calendarTasksByDate} />
          )}
        </div>
      )}
      {selectedTab === "Gantt" && (
        <div className="task-gantt-wrapper" style={{ margin: "16px" }}>
          {projectTasksLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
              <Spin />
            </div>
          ) : (
            <TasksGanttView tasks={ganttBoards} onTaskClick={() => { }} />
          )}
        </div>
      )}
      {selectedTab === "Discussion" && <DiscussionForm />}


      <Modal
        title={null}
        open={manageTabs}
        footer={null}
        onCancel={() => {
          setTabsModal(false);
        }}
        className="copy-task-modal add-list-modal"
      >
        <div className="modal-header">
          <h1>Project Tabs</h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form>
            <div className="topic-cancel-wrapper task-list-pop-wrapper">
              <Table
                columns={columns}
                dataSource={columnDetails}
                pagination={false}
              />
            </div>
          </Form>
          <br></br>
          <p style={{ fontWeight: "500" }}>
            Note: The tab has to be enabled in order to be default.
          </p>
        </div>
      </Modal>
      <ManagePeopleModal
        open={manageModal}
        cancel={handleCancelManageModal}
        formName={managePeopleForm}
        onFinish={handleManagePeople}
        onChange={handleChange}
        subscribersList={assignees}
        clientsList={clientList}
        type="project"
        assignees={peopleValues.assignees}
        clients={peopleValues.clients}
        manager={peopleValues.manager}
        acc_manager={peopleValues.acc_manager}
        managerList={managerList}
        accManagerList={accountManagerList}
      />
    </>
  );
}

function CalendarGridForProject({ mode, current, tasksByDate }) {
  const days = useMemo(() => {
    if (mode === "month") {
      let dayPointer = current.startOf("month").startOf("week");
      const end = current.endOf("month").endOf("week");
      const arr = [];
      while (dayPointer.isBefore(end) || dayPointer.isSame(end, "day")) {
        arr.push(dayPointer.format("DD-MM-YYYY"));
        dayPointer = dayPointer.add(1, "day");
      }
      return arr;
    }
    if (mode === "week") {
      const start = current.startOf("week");
      return Array.from({ length: 7 }, (_, i) => start.add(i, "day").format("DD-MM-YYYY"));
    }
    return [current.format("DD-MM-YYYY")];
  }, [mode, current]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="calendar-grid">
      {mode === "month" && (
        <div className="calendar-weekdays">
          {weekDays.map((d) => <div key={d} className="calendar-weekday">{d}</div>)}
        </div>
      )}
      <div className="calendar-days" style={{ gridTemplateColumns: `repeat(${mode === "month" ? 7 : mode === "week" ? 7 : 1}, 1fr)` }}>
        {days.map((dateStr) => {
          const list = tasksByDate[dateStr] || [];
          return (
            <div key={dateStr} className="calendar-day-cell">
              <div className="calendar-day-num">{parseInt(dateStr.split("-")[0], 10)}</div>
              <div className="calendar-day-tasks">
                {list.map((task) => (
                  <div key={task?._id} className="calendar-task-bar" title={task?.title || "Untitled task"}>
                    {task?.title || "Untitled task"}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressBoardofProject;
