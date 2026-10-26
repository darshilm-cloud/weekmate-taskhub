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
  Spin,
  Button,
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
  EditOutlined,
} from "@ant-design/icons";
import {
  getSubscribersList,
  getOverviewProjectByID,
} from "../../appRedux/reducers/ApiData";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import { hasPermission, getRoles, can } from "../../util/hasPermission";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import NoDataFoundIcon from "../common/NoDataFoundIcon";
import dayjs from "dayjs";
import TasksGanttView from "../../pages/Tasks/TasksGanttView";
import TaskMonthCalendar from "../common/TaskMonthCalendar/TaskMonthCalendar";
import CommonTaskFormModal from "../../pages/Tasks/CommonTaskFormModal";
import "./ProgressBoard.css";
import "../../pages/TaskPage/TaskPage.css";
import ManagePeopleModal from "../Modal/ManagePeopleModal";
import { generateCacheKey } from "../../util/generateCacheKey";
import ProjectFormModal from "../AssignProject/ProjectFormModal";
import "../../assets/css/project-mobile.css";


// Read permission alone decides whether these tabs show.
const NOTES_VIEW_PERMS = ["notes_view"];
const DISCUSSION_VIEW_PERMS = ["discussion_view"];
const FILES_VIEW_PERMS = ["files_view"];

// Resolve a task's project id from whatever shape the API returned (populated
// object or raw id). Mirrors the helper used by the global Tasks page so the
// shared view modal opens with the same data.
function getTaskProjectId(task) {
  return (
    task?.project?._id ||
    task?.project?.id ||
    task?.project_id?._id ||
    task?.project_id?.id ||
    task?.project_id ||
    ""
  );
}

// Map a task document to the initial values CommonTaskFormModal expects in
// "view" mode. Kept in sync with pages/TaskPage/index.js.
function mapTaskToEditFormInitial(task) {
  if (!task) return {};
  const projectId = getTaskProjectId(task);
  const mainTaskId =
    (typeof task?.mainTask === "object" && task.mainTask?._id) ||
    (typeof task?.main_task_id === "object" && task.main_task_id?._id) ||
    task?.main_task_id ||
    undefined;
  const assigneeIds = (Array.isArray(task.assignees) ? task.assignees : [])
    .map((a) => (typeof a === "object" ? a._id || a.id : a))
    .filter(Boolean);
  const rawLabels = task.taskLabels || task.task_labels || [];
  const labelIds = (Array.isArray(rawLabels) ? rawLabels : [])
    .map((l) => (typeof l === "object" ? l._id || l.id : l))
    .filter(Boolean);
  const due = task.due_date || task.end_date;
  const estH = parseInt(task.estimated_hours, 10);
  const estM = parseInt(task.estimated_minutes, 10);
  const hasEstimate =
    (!Number.isNaN(estH) && estH > 0) || (!Number.isNaN(estM) && estM > 0);
  const estimatedHoursValue = hasEstimate
    ? (Number.isNaN(estH) ? 0 : estH) + (Number.isNaN(estM) ? 0 : estM) / 60
    : undefined;
  return {
    title: task.title || "",
    description: task.descriptions || "",
    project_id: projectId || undefined,
    main_task_id: mainTaskId,
    assignees: assigneeIds,
    task_labels: labelIds,
    start_date: task.start_date ? dayjs(task.start_date) : undefined,
    end_date: due ? dayjs(due) : undefined,
    estimated_hours: estimatedHoursValue,
    priority: task.priority || "Low",
    custom_fields: task.custom_fields && typeof task.custom_fields === "object" ? { ...task.custom_fields } : {},
  };
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

  if (key === "todo") return { key, title: "To-Do", color: "#787878" };
  if (key === "inprogress") return { key, title: "In Progress", color: "#ff4d4f" };
  if (key === "onhold") return { key, title: "On Hold", color: "#faad14" };
  if (key === "done") return { key, title: "Done", color: "#339f74" };

  return {
    key,
    title: status?.title || status?.name || "No status",
    color: status?.color || "#d9d9d9",
  };
}

// Which tab a `?tab=` value opens, given the user's permissions. Used for the initial
// state too, so the page mounts straight on the requested tab instead of mounting
// Overview first and swapping a moment later (visible as a double render / flicker).
// While the project is still loading, "Bugs" is kept as requested (its panel is guarded
// separately) so it doesn't bounce through Overview.
const resolveTab = (tab, bugsEnabled, projectLoaded = true) => {
  const isAdmin = getRoles(["Admin"]);
  const canViewTasks = isAdmin || hasPermission(["tasks_view"]);
  const canViewBugs = isAdmin || hasPermission(["bugs_view"]);
  const canViewTime = isAdmin || hasPermission(["view_timesheet"]);
  switch (tab) {
    case "Tasks":
      return canViewTasks ? "Tasks" : "Overview";
    case "Time":
      return canViewTime ? "Time" : "Overview";
    case "Bugs":
      return canViewBugs && (bugsEnabled || !projectLoaded) ? "Bugs" : "Overview";
    case "Discussion":
      return can(DISCUSSION_VIEW_PERMS) ? "Discussion" : "Overview";
    case "Files":
      return can(FILES_VIEW_PERMS) ? "Files" : "Overview";
    case "Notes":
      return can(NOTES_VIEW_PERMS) ? "Notes" : "Overview";
    case "Calendar":
      return canViewTasks ? "Calendar" : "Overview";
    case "Gantt":
      return canViewTasks ? "Gantt" : "Overview";
    default:
      return "Overview";
  }
};

function ProgressBoardofProject() {
  const companySlug = localStorage.getItem("companyDomain");

  const { emitEvent } = useSocketAction();
  const { projectId } = useParams();
  const history = useHistory();
  const location = useLocation();
  const { tab, taskID, listID } = queryString.parse(location.search);
  const dispatch = useDispatch();

  const [selectedTab, setSelectedTab] = useState(() => resolveTab(tab, false, false));
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
  // Project whose timeline tasks have been fetched. Until it matches the open project the
  // Calendar / Gantt show their loader, instead of first painting an empty grid, then a
  // spinner, then the data (the "renders twice" effect).
  const [timelineLoadedFor, setTimelineLoadedFor] = useState(null);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  // Task detail (view) modal opened from the Calendar / Gantt tabs - mirrors the
  // behaviour of the global Tasks calendar, which the project calendar lacked.
  const [viewTask, setViewTask] = useState(null);
  const [viewTaskOpen, setViewTaskOpen] = useState(false);
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

  const refreshProjectData = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: { _id: projectId },
      });
      if (response?.data?.data && response?.data?.status) {
        setProjectData(response.data.data);
        setInitialDetails(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
    dispatch(getOverviewProjectByID(projectId));
    // Re-fetch assignees so Manage People modal and task dropdowns reflect changes
    dispatch(getSubscribersList(projectId));
    getAssignees();
  }, [dispatch, projectId]);

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

  // AM hidden: getAccountManager commented out
  // const getAccountManager = async (values) => {
  //   try {
  //     dispatch(showAuthLoader());
  //     const response = await Service.makeAPICall({ methodName: Service.getMethod, api_url: Service.getAccountManager, body: values });
  //     dispatch(hideAuthLoader());
  //     if (response?.data?.data) setAccountManagerList(response.data.data);
  //   } catch (error) { console.log(error); }
  // };

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
        // acc_manager: values.acc_manager, // AM hidden
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
    // getAccountManager(); // AM hidden
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
    setSelectedTab(resolveTab(tab, isBugsTabEnabledForProject, Boolean(projectData?._id)));
  }, [tab, isBugsTabEnabledForProject, projectData?._id]);

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
  // keep the active tab visible when the tabs bar scrolls sideways (small screens)
  useEffect(() => {
    const el = document.querySelector(".pb-tabs-bar .pb-tab-btn--active");
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }, [selectedTab]);

  // A trackpad / wheel scroll over the tabs strip nearly always carries a few px of sideways
  // movement, which made the strip wobble left and right while the page scrolled. Vertical
  // wheel movement is handed to the page; only deliberate sideways scrolling moves the strip.
  useEffect(() => {
    const strip = document.querySelector(".pb-tabs-bar");
    if (!strip) return undefined;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const page = strip.closest(".ant-layout-content") || document.scrollingElement;
      if (page) page.scrollTop += e.deltaY;
    };
    strip.addEventListener("wheel", onWheel, { passive: false });
    return () => strip.removeEventListener("wheel", onWheel);
  }, [projectData?.project_status?.title]);

  const filteredTabOptions = tabOptions.filter((tab) => {
    if (tab.key === "Tasks") {
      if (!isAdmin && !hasPermission(["tasks_view"])) return false;
      return tabsAfterSettings.some((item) => item.tab_id.name === tab.key);
    }
    if (tab.key === "Bugs") {
      if (!isAdmin && !hasPermission(["bugs_view"])) return false;
      return isBugsTabEnabledForProject;
    }
    if (tab.key === "Time") {
      if (!isAdmin && !hasPermission(["view_timesheet"])) return false;
      return tabsAfterSettings.some((item) => item.tab_id.name === tab.key);
    }
    if (tab.key === "Notes" && !can(NOTES_VIEW_PERMS)) return false;
    if (tab.key === "Discussion" && !can(DISCUSSION_VIEW_PERMS)) return false;
    if (tab.key === "Files" && !can(FILES_VIEW_PERMS)) return false;
    if (tab.key === "Calendar" || tab.key === "Gantt") {
      if (!isAdmin && !hasPermission(["tasks_view"])) return false;
      return true;
    }
    return tabsAfterSettings.some((item) => item.tab_id.name === tab.key);
  });

  useEffect(() => {
    if (projectData?._id && !isBugsTabEnabledForProject && selectedTab === "Bugs") {
      setSelectedTab("Overview");
    }
  }, [isBugsTabEnabledForProject, selectedTab, projectData?._id]);

  useEffect(() => {
    if (filteredTabOptions.length > 0 && !filteredTabOptions.some((t) => t.key === selectedTab)) {
      setSelectedTab("Overview");
    }
  }, [filteredTabOptions, selectedTab]);

  // A link opened with ?tab=X can resolve to Overview before permissions / tab settings have
  // loaded; once X is available, go to the tab the URL asked for.
  useEffect(() => {
    if (!tab || tab === "Overview" || selectedTab !== "Overview") return;
    if (filteredTabOptions.some((t) => t.key === tab)) {
      setSelectedTab(resolveTab(tab, isBugsTabEnabledForProject, Boolean(projectData?._id)));
    }
  }, [tab, selectedTab, filteredTabOptions, isBugsTabEnabledForProject, projectData?._id]);

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
      setTimelineLoadedFor(projectId);
    }
  }, [projectId]);
  const timelineLoading = timelineLoadedFor !== projectId;

  useEffect(() => {
    if (selectedTab === "Calendar" || selectedTab === "Gantt") {
      fetchProjectTasksForTimeline();
    }
  }, [selectedTab, fetchProjectTasksForTimeline]);

  useEffect(() => {
    const handleTasksChanged = (e) => {
      const changedProjectId = e?.detail?.projectId;
      if (changedProjectId && String(changedProjectId) !== String(projectId)) return;
      if (selectedTab === "Calendar" || selectedTab === "Gantt") {
        fetchProjectTasksForTimeline();
      }
    };
    window.addEventListener("weekmate:tasks-changed", handleTasksChanged);
    return () => window.removeEventListener("weekmate:tasks-changed", handleTasksChanged);
  }, [projectId, selectedTab, fetchProjectTasksForTimeline]);

  useEffect(() => {
    const handleProjectChanged = (e) => {
      const action = e?.detail?.action;
      const changedProjectId = e?.detail?.projectId;
      if (!["edit", "status", "close"].includes(action)) return;
      if (changedProjectId && String(changedProjectId) !== String(projectId)) return;
      // Re-sync local project state and all assignee dropdowns after any project edit
      refreshProjectData();
    };
    window.addEventListener("weekmate:projects-changed", handleProjectChanged);
    return () => window.removeEventListener("weekmate:projects-changed", handleProjectChanged);
  }, [projectId, refreshProjectData]);

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

  const handleOpenCalendarTask = useCallback((task) => {
    if (!task?._id) return;
    setViewTask(task);
    setViewTaskOpen(true);
  }, []);

  const ganttBoards = useMemo(() => {
    const grouped = {};
    const order = []; // preserve first-seen insertion order per stage

    projectTasks.forEach((task) => {
      const status = task?.task_status;
      // Skip tasks that have no stage assigned - they have no meaningful position in the Gantt
      if (!status?._id) return;

      const statusId = String(status._id);

      if (!grouped[statusId]) {
        grouped[statusId] = {
          workflowStatus: {
            _id: status._id,
            title: status.title || "No Status",
            color: status.color || "#787878",
          },
          tasks: [],
        };
        order.push(statusId);
      }
      grouped[statusId].tasks.push(task);
    });

    // Sort columns: known standard stages first (in canonical order), custom stages after
    const statusOrder = ["todo", "inprogress", "onhold", "done"];
    return order.map((id) => grouped[id]).sort((a, b) => {
      const aKey = normalizeKanbanStatusKey(a?.workflowStatus);
      const bKey = normalizeKanbanStatusKey(b?.workflowStatus);
      const aIndex = statusOrder.indexOf(aKey);
      const bIndex = statusOrder.indexOf(bKey);
      const normA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const normB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      if (normA !== normB) return normA - normB;
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
          <div className="no-data-found">
            <NoDataFoundIcon />
          </div>
        ) : (
          sortedProjectList.map((item, index) => (
            <div key={index} className="project-name-drawers pb-project-switcher-item">
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

          <div className="pb-header-right">
            {hasPermission(["project_edit"]) && projectData?.project_status?.title?.toLowerCase() !== "archived" && (
              <Button
                onClick={() => setIsEditProjectModalOpen(true)}
                className="add-btn"
              >
                Edit Project
              </Button>
            )}
            {/* Mobile: tab switcher */}
            {false && windowWidth <= 991 && projectData?.project_status?.title?.toLowerCase() !== "archived" && (
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
            )}
          </div>
        </div>

        {/* ── Tabs bar (scrolls sideways on small screens) ── */}
        {projectData?.project_status?.title?.toLowerCase() !== "archived" && (
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
          {timelineLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
              <Spin />
            </div>
          ) : (
            <TaskMonthCalendar tasksByDate={calendarTasksByDate} onOpenTask={handleOpenCalendarTask} />
          )}
        </div>
      )}
      {selectedTab === "Gantt" && (
        <div className="task-gantt-wrapper" style={{ margin: "16px" }}>
          {timelineLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
              <Spin />
            </div>
          ) : (
            <TasksGanttView tasks={ganttBoards} onTaskClick={handleOpenCalendarTask} />
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
        // acc_manager={peopleValues.acc_manager} // AM hidden
        // accManagerList={accountManagerList} // AM hidden
        managerList={managerList}
      />
      {isEditProjectModalOpen && (
        <ProjectFormModal
          isModalOpen={isEditProjectModalOpen}
          modalMode="Edit"
          selectedProject={projectData}
          handleCancel={() => setIsEditProjectModalOpen(false)}
          setIsModalOpen={setIsEditProjectModalOpen}
          triggerRefreshList={refreshProjectData}
        />
      )}

      <CommonTaskFormModal
        key={viewTask?._id || "project-view-task"}
        open={viewTaskOpen}
        mode="view"
        title="View Task"
        initialValues={mapTaskToEditFormInitial(viewTask)}
        lockedProjectId={(viewTask ? getTaskProjectId(viewTask) : "") || projectId || undefined}
        lockedMainTaskId={
          viewTask
            ? (typeof viewTask?.mainTask === "object" && viewTask?.mainTask?._id) ||
              (typeof viewTask?.main_task_id === "object" && viewTask?.main_task_id?._id) ||
              viewTask?.main_task_id ||
              undefined
            : undefined
        }
        showListSelector={false}
        viewOnly
        taskId={viewTask?._id}
        onCancel={() => setViewTaskOpen(false)}
        onSubmit={() => { }}
        afterClose={() => setViewTask(null)}
      />
    </>
  );
}

export default ProgressBoardofProject;
