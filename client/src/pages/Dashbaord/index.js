/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, eqeqeq */
import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { endPostLoginGate } from "../../util/postLoginGate";
import "./dashboard.css";
import { Form, Modal, Select, Input, message, Button, Table, Skeleton, DatePicker } from "antd";
import { Link } from "react-router-dom";
import moment from "moment";
import ProjectListModal from "../../components/Modal/ProjectListModal";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import ProjectFilterComponent from "./ProjectFilterComponent";
import TaskFilterComponent from "./TaskFilterComponent";
import BugFilterComponent from "./BugFilterComponent";
import TimeFilterComponent from "./TimeFilterComponent";
import dayjs from "dayjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getRoles } from "../../util/hasPermission";
import { PlusOutlined, DownOutlined } from "@ant-design/icons";
import { DashboardSkeleton } from "../../components/common/SkeletonLoader";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import WelcomeBanner from "../../components/common/WelcomeBanner";
import AddTaskModal from "../Tasks/AddTaskModal";
import ActivityLogDetailModal from "../ActivityLogs/ActivityLogDetailModal";
import {
  ProjectsIcon,
  TasksIcon,
  AssignedToMeIcon,
  DueTodayIcon,
  PastDueIcon,
} from "./StatIcons";

const PERIOD_TYPE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "halfYearly", label: "Half Yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom Range" },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: dayjs().month(i).format("MMMM"),
}));

const HALF_YEAR_OPTIONS = [
  { value: "H1", label: "Jan - Jun" },
  { value: "H2", label: "Jul - Dec" },
];

const Dashboard = () => {
  const dispatch = useDispatch();
  const companySlug = localStorage.getItem("companyDomain");
  const history = useHistory();
  const isAdmin = getRoles(["Admin"]);
  const currentUserId = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user_data"))?._id || ""; }
    catch { return ""; }
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [form] = Form.useForm();
  const [projectList, setProjectList] = useState([]);
  const [projectTotalCount, setProjectTotalCount] = useState(() => {
    const cachedCount = sessionStorage.getItem("dashboard_project_total_count_v1");
    const parsedCount = Number(cachedCount);
    return Number.isNaN(parsedCount) ? 0 : parsedCount;
  });
  const [myProj, setMyProj] = useState([]);
  const [myTask, setMyTask] = useState([]);
  const [assignedToMeTasks, setAssignedToMeTasks] = useState([]);
  const [pastDueCount, setPastDueCount] = useState(0);
  const [myBug, setMyBug] = useState([]);
  const [myTime, setMyTime] = useState([]);
  const [recentList, setRecentList] = useState([]);
  const [periodType, setPeriodType] = useState("weekly");
  const [periodMonth, setPeriodMonth] = useState(() => dayjs().month());
  const [periodHalf, setPeriodHalf] = useState(() => (dayjs().month() < 6 ? "H1" : "H2"));
  const [periodYear, setPeriodYear] = useState(() => dayjs().year());
  const [customDateRange, setCustomDateRange] = useState(null);
  const [statsData, setStatsData] = useState({ labels: [], completed: [], incomplete: [] });
  const [statsLoading, setStatsLoading] = useState(true);
  const yearOptions = useMemo(() => {
    const currentYear = dayjs().year();
    return Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => ({ value: y, label: String(y) }));
  }, []);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityModalLogId, setActivityModalLogId] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(true);
  const [discussionTab, setDiscussionTab] = useState("General");
  const [pinnedNotes, setPinnedNotes] = useState([]);
  const [pinnedNotesLoading, setPinnedNotesLoading] = useState(true);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [noteForm] = Form.useForm();
  const [noteProjects, setNoteProjects] = useState([]);
  const [noteNotebooks, setNoteNotebooks] = useState([]);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteNotebooksLoading, setNoteNotebooksLoading] = useState(false);
  const [notebookSearch, setNotebookSearch] = useState("");
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [allNotesOpen, setAllNotesOpen] = useState(false);
  const [allNotes, setAllNotes] = useState([]);
  const [allNotesLoading, setAllNotesLoading] = useState(false);

  // Filter states
  const [projStatus, setProjStatus] = useState([]);
  const [category, setCategory] = useState([]);
  const [taskProjects, setTaskProjects] = useState([]);
  const [taskStatus, setTaskStatus] = useState("all");
  const [taskDates, setTaskDates] = useState({ startDate: null, endDate: null });
  const [bugProjects, setBugProjects] = useState([]);
  const [bugStatus, setBugStatus] = useState("all");
  const [bugDates, setBugDates] = useState({ startDate: null, endDate: null });
  const [timeProjects, setTimeProjects] = useState([]);
  const [timeDates, setTimeDates] = useState({ startDate: null, endDate: null });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => {
    if (!pageLoading) endPostLoginGate();
  }, [pageLoading]);
  const [priorityFilterTab, setPriorityFilterTab] = useState("all");

  // Memoized derived values - only recalculate when myTask changes
  const today = useMemo(() => dayjs().format("DD-MM-YYYY"), []);

  const isDone = useCallback((t) => {
    const title = (t.task_status?.title || "").toLowerCase();
    return title === "done" || title === "closed";
  }, []);

  const isTaskAssignedToCurrentUser = useCallback((task) => {
    const assignees = Array.isArray(task?.assignees) ? task.assignees : [];
    return assignees.some((assignee) => {
      const assigneeId = typeof assignee === "object" ? assignee?._id || assignee?.id : assignee;
      return String(assigneeId || "").trim() === String(currentUserId || "").trim();
    });
  }, [currentUserId]);

  const { totalTask, assignedToMe, dueToday, pastDue } = useMemo(() => {
    const assignedSource = assignedToMeTasks.length > 0 ? assignedToMeTasks : myTask;
    const assignedCount = assignedSource.filter(isTaskAssignedToCurrentUser).length;
    return {
      totalTask: myTask.length,
      assignedToMe: assignedCount,
      dueToday: myTask.filter(
        (t) => t.due_date && dayjs(t.due_date).format("DD-MM-YYYY") === today
      ).length,
      pastDue: pastDueCount,
    };
  }, [myTask, today, assignedToMeTasks, isDone, isTaskAssignedToCurrentUser, pastDueCount]);

  const totalProjects = useMemo(() => {
    if (typeof projectTotalCount === "number" && projectTotalCount >= 0) {
      return projectTotalCount;
    }
    if (Array.isArray(projectList) && projectList.length > 0) {
      return projectList.length;
    }
    return 0;
  }, [projectTotalCount, projectList]);

  // Project Statistics is fully server-aggregated: the client only tells the
  // backend which period (and, for a custom range, which dates) it wants -
  // all bucketing and the Done/Not-done split happen in the DB aggregation
  // at /dashboard/get/task-statistics, not in the browser.
  const fetchTaskStatistics = useCallback(async () => {
    if (periodType === "custom" && (!customDateRange?.[0] || !customDateRange?.[1])) {
      return;
    }
    try {
      setStatsLoading(true);
      const body = { period_type: periodType };
      if (periodType === "monthly") body.month = periodMonth;
      if (periodType === "halfYearly") body.half = periodHalf;
      if (periodType === "yearly") body.year = periodYear;
      if (periodType === "custom") {
        body.start_date = customDateRange[0].format("DD-MM-YYYY");
        body.end_date = customDateRange[1].format("DD-MM-YYYY");
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTaskStatistics,
        body,
      });
      if (response?.data?.data) {
        setStatsData(response.data.data);
      }
    } catch (error) {
      console.log(error, "getTaskStatistics error");
    } finally {
      setStatsLoading(false);
    }
  }, [periodType, periodMonth, periodHalf, periodYear, customDateRange]);

  useEffect(() => {
    fetchTaskStatistics();
  }, [fetchTaskStatistics]);

  const chartData = useMemo(
    () => statsData.labels.map((label, i) => ({
      label,
      Completed: statsData.completed[i] || 0,
      Incomplete: statsData.incomplete[i] || 0,
    })),
    [statsData]
  );

  const hasChartData = statsData.completed.some((v) => v > 0) || statsData.incomplete.some((v) => v > 0);

  // Memoized priority + today summary
  const getTaskPriority = useCallback((t) => {
    const labels = t.task_labels || t.taskLabels || [];
    for (const l of labels) {
      const title = (l.title || l.name || "").toLowerCase();
      if (title.includes("high")) return "high";
      if (title.includes("medium")) return "medium";
      if (title.includes("low")) return "low";
    }
    if (t.priority) {
      const raw = (typeof t.priority === "string" ? t.priority : (t.priority?.title || t.priority?.name || "")).toLowerCase();
      if (raw.includes("high")) return "high";
      if (raw.includes("medium")) return "medium";
      if (raw.includes("low")) return "low";
    }
    return "";
  }, []);
  const { priorityLow, priorityMedium, priorityHigh, newToday, closedToday, teamIncomplete, filteredPriorityTasks } = useMemo(() => ({
    priorityLow: myTask.filter((t) => getTaskPriority(t) === "low").length,
    priorityMedium: myTask.filter((t) => getTaskPriority(t) === "medium").length,
    priorityHigh: myTask.filter((t) => getTaskPriority(t) === "high").length,
    newToday: myTask.filter(
      (t) => t.createdAt && dayjs(t.createdAt).format("DD-MM-YYYY") === today
    ).length,
    closedToday: myTask.filter(
      (t) =>
        ["done", "closed"].includes(t.status?.toLowerCase()) &&
        t.updatedAt &&
        dayjs(t.updatedAt).format("DD-MM-YYYY") === today
    ).length,
    teamIncomplete: myTask
      .filter((t) => !["done", "closed"].includes(t.status?.toLowerCase()))
      .slice(0, 10),
    filteredPriorityTasks: myTask,
  }), [myTask, today, getTaskPriority]);

  // Stable callbacks
  const onProjectFilterChange = useCallback((skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) { setProjStatus([]); setCategory([]); }
    else {
      if (skipParams.includes("skipStatus")) setProjStatus([]);
      if (skipParams.includes("skipCategory")) setCategory([]);
    }
    if (selectedFilters) {
      setProjStatus(selectedFilters.status || []);
      setCategory(selectedFilters.category || []);
    }
  }, []);

  const onTaskFilterChange = useCallback((skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setTaskProjects([]); setTaskStatus("all");
      setTaskDates({ startDate: null, endDate: null });
    } else {
      if (skipParams.includes("skipProject")) setTaskProjects([]);
      if (skipParams.includes("skipStatus")) setTaskStatus("all");
      if (skipParams.includes("skipDate")) setTaskDates({ startDate: null, endDate: null });
    }
    if (selectedFilters) {
      setTaskProjects(selectedFilters.project || []);
      setTaskStatus(selectedFilters.status || "all");
      setTaskDates(selectedFilters.dates || { startDate: null, endDate: null });
    }
  }, []);

  const onBugFilterChange = useCallback((skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setBugProjects([]); setBugStatus("all");
      setBugDates({ startDate: null, endDate: null });
    } else {
      if (skipParams.includes("skipProject")) setBugProjects([]);
      if (skipParams.includes("skipStatus")) setBugStatus("all");
      if (skipParams.includes("skipDate")) setBugDates({ startDate: null, endDate: null });
    }
    if (selectedFilters) {
      setBugProjects(selectedFilters.project || []);
      setBugStatus(selectedFilters.status || "all");
      setBugDates(selectedFilters.dates || { startDate: null, endDate: null });
    }
  }, []);

  const onTimeFilterChange = useCallback((skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setTimeProjects([]); setTimeDates({ startDate: null, endDate: null });
    } else {
      if (skipParams.includes("skipProject")) setTimeProjects([]);
      if (skipParams.includes("skipDate")) setTimeDates({ startDate: null, endDate: null });
    }
    if (selectedFilters) {
      setTimeProjects(selectedFilters.project || []);
      setTimeDates(selectedFilters.dates || { startDate: null, endDate: null });
    }
  }, []);

  // API calls
  const getProjectList = useCallback(async ({ countOnly = false } = {}) => {
    try {
      const cacheKey = countOnly ? "dashboard_project_total_count_v1" : "dashboard_project_list_v1";

      if (countOnly) {
        const cachedCount = sessionStorage.getItem(cacheKey);
        if (cachedCount !== null && cachedCount !== undefined) {
          const parsedCount = Number(cachedCount);
          if (!Number.isNaN(parsedCount)) {
            setProjectTotalCount(parsedCount);
          }
        }
      }

      if (!countOnly) {
        dispatch(showAuthLoader());
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListForSearch,
        body: {
          pageNo: 1,
          limit: countOnly ? 1 : 500,
          sortBy: "desc",
          filterBy: "all",
          countOnly,
        },
      });

      const total = Number(response?.data?.metadata?.total);
      if (!Number.isNaN(total)) {
        setProjectTotalCount(total);
        sessionStorage.setItem("dashboard_project_total_count_v1", String(total));
      }

      if (!countOnly && response?.data?.data) {
        setProjectList(response.data.data);
        sessionStorage.setItem("dashboard_project_list_v1", JSON.stringify(response.data.data));
      }
    } catch (error) { console.log(error); }
    finally {
      if (!countOnly) {
        dispatch(hideAuthLoader());
      }
    }
  }, [dispatch]);

  const getVisitedData = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.getrecentVisited,
      });
      if (response?.data?.statusCode == 200) {
        dispatch(hideAuthLoader()); setRecentList(response.data.data);
      }
    } catch (error) { console.log("get project error"); }
  }, [dispatch]);

  const myProjectsFn = useCallback(async () => {
    const hasFilters = (category?.length > 0) || (projStatus?.length > 0);
    const cacheKey = "db_my_projects";
    // Show cached data immediately (only when no filters applied)
    if (!hasFilters) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try { setMyProj(JSON.parse(cached)); } catch { }
      }
    }
    try {
      let reqBody = { pageNo: 1, limit: 50 }; // fetch enough to sort by recently added
      if (category?.length > 0) reqBody = { ...reqBody, category };
      if (projStatus?.length > 0) reqBody = { ...reqBody, project_status: projStatus };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.myProjects, body: reqBody,
      });
      const projects = (response?.data?.data?.data || response?.data?.data || [])
        .filter(p => p?.project_status?.title?.toLowerCase() !== "archived");
      if (projects.length >= 0) {
        setMyProj(projects);
        if (!hasFilters) sessionStorage.setItem(cacheKey, JSON.stringify(projects));
      }
    } catch (error) { console.log(error, "myProject error"); }
  }, [dispatch, category, projStatus]);

  const myTasksFn = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {};
      if (taskProjects?.length > 0) reqBody.project_id = taskProjects;
      if (taskStatus && taskStatus !== "all") reqBody.status = taskStatus;
      if (taskDates?.startDate) reqBody.start_date = dayjs(taskDates.startDate).format("DD-MM-YYYY");
      if (taskDates?.endDate) reqBody.end_date = dayjs(taskDates.endDate).format("DD-MM-YYYY");

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myTasks,
        body: reqBody,
      });

      dispatch(hideAuthLoader());
      if (response?.data?.data && Array.isArray(response.data.data)) {
        setMyTask(response.data.data.filter(t => t?.project?.project_status?.title?.toLowerCase() !== "archived"));
      } else {
        setMyTask([]);
      }
      setPageLoading(false);
    } catch (error) {
      console.error("myTask error", error);
      setMyTask([]);
      dispatch(hideAuthLoader());
      setPageLoading(false);
    }
  }, [dispatch, taskProjects, taskStatus, taskDates]);

  const fetchAssignedToMeTasks = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskList,
        body: { view_all: false },
      });
      if (response?.data?.data && Array.isArray(response.data.data)) {
        setAssignedToMeTasks(response.data.data);
      } else {
        setAssignedToMeTasks([]);
      }
    } catch (e) {
      setAssignedToMeTasks([]);
    }
  }, []);

  const fetchPastDueCount = useCallback(async () => {
    try {
      const yesterday = dayjs().subtract(1, "day").format("DD-MM-YYYY");
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskList,
        body: { view_all: isAdmin, end_date: yesterday, status: "incomplete", metadata_only: true },
      });
      const total = response?.data?.metadata?.total;
      setPastDueCount(typeof total === "number" ? total : 0);
    } catch (e) {
      setPastDueCount(0);
    }
  }, [isAdmin]);

  const myBugsFn = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      let reqBody = {};
      if (bugStatus && bugStatus !== "all") reqBody = { ...reqBody, status: bugStatus };
      if (bugProjects?.length > 0) reqBody = { ...reqBody, project_id: bugProjects };
      if (bugDates.startDate) reqBody.start_date = dayjs(bugDates.startDate).format("DD-MM-YYYY");
      if (bugDates.endDate) reqBody.end_date = dayjs(bugDates.endDate).format("DD-MM-YYYY");
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.myBugs, body: reqBody,
      });
      if (response?.data?.data) { 
        dispatch(hideAuthLoader()); 
        setMyBug(response.data.data.filter(b => b?.project?.project_status?.title?.toLowerCase() !== "archived")); 
      }
    } catch (error) { console.log(error, "myBug error"); }
  }, [dispatch, bugProjects, bugStatus, bugDates]);

  const myLoggedTimeFn = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      const now = new Date();
      let reqBody = {
        start_date: moment(new Date(now.getFullYear(), now.getMonth(), 1)).format("DD-MM-YYYY"),
        end_date: moment(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)).format("DD-MM-YYYY"),
      };
      if (timeProjects?.length > 0) reqBody = { ...reqBody, project_id: timeProjects };
      if (timeDates.startDate) reqBody.start_date = dayjs(timeDates.startDate).format("DD-MM-YYYY");
      if (timeDates.endDate) reqBody.end_date = dayjs(timeDates.endDate).format("DD-MM-YYYY");
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.myLoggedTime, body: reqBody,
      });
      if (response?.data?.data) { 
        dispatch(hideAuthLoader()); 
        setMyTime(response.data.data.filter(t => t?.project?.project_status?.title?.toLowerCase() !== "archived")); 
      }
    } catch (error) { console.log(error, "myLoggedTime error"); }
  }, [dispatch, timeProjects, timeDates]);

  const getProjectMianTask = useCallback(async (projectId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.getProjectMianTask,
        body: { project_id: projectId },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        history.push(`/${companySlug}/project/app/${projectId}?tab=Tasks&listID=${response.data.data[0]._id}`);
      } else {
        history.push(`/${companySlug}/project/app/${projectId}?tab=Tasks`);
      }
    } catch (error) { console.log(error); }
  }, [dispatch, companySlug, history]);

  const handleStatCardClick = useCallback(
    (filter) => {
      const filterMap = {
        all: "all",
        assigned_to_me: "assigned_to_me",
        dueToday: "due_today",
        pastDue: "past_due",
      };
      const query = filterMap[filter] ? `?filter=${filterMap[filter]}` : "";
      history.push(`/${companySlug}/tasks${query}`);
    },
    [companySlug, history]
  );

  const addVisitedData = useCallback(async (projectId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.addrecentVisited,
        body: { project_id: projectId },
      });
      if (response?.data?.statusCode == 200) dispatch(hideAuthLoader());
    } catch (error) { console.log("add project error"); }
  }, [dispatch]);

  const removeVisitedData = useCallback(async (recentId) => {
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
  }, [getVisitedData]);

  const showModal = useCallback(async () => {
    setIsModalOpen(true);
    if (projectList.length === 0) {
      const cachedProjects = sessionStorage.getItem("dashboard_project_list_v1");
      if (cachedProjects) {
        try {
          const parsedProjects = JSON.parse(cachedProjects);
          if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
            setProjectList(parsedProjects);
          }
        } catch (error) {
          sessionStorage.removeItem("dashboard_project_list_v1");
        }
      }
    }
    getProjectList({ countOnly: false });
    getVisitedData();
  }, [getProjectList, getVisitedData, projectList.length]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    form.resetFields();
  }, [form]);

  const fetchActivityLogs = useCallback(async () => {
    try {
      setActivityLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getActivityLogList,
        body: { page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" },
      });
      if (response?.data?.data?.activityLogs) {
        setActivityLogs(response.data.data.activityLogs);
      } else if (Array.isArray(response?.data?.data)) {
        setActivityLogs(response.data.data.slice(0, 5));
      }
    } catch (e) { console.log(e); }
    finally { setActivityLoading(false); }
  }, []);

  const fetchDiscussions = useCallback(async () => {
    try {
      setDiscussionsLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionTopic,
        body: { pageNo: 1, limit: 10, sortBy: "desc" },
      });
      const data = response?.data?.data;
      if (Array.isArray(data)) setDiscussions(data.filter(d => d?.project?.project_status?.title?.toLowerCase() !== "archived"));
    } catch (e) { console.log(e); }
    finally { setDiscussionsLoading(false); }
  }, []);

  const fetchPinnedNotes = useCallback(async () => {
    try {
      setPinnedNotesLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getNotes,
        body: { isBookmark: true, pageNo: 1, limit: 200 },
      });
      if (response?.data?.data) setPinnedNotes(response.data.data.filter(n => n?.project?.project_status?.title?.toLowerCase() !== "archived"));
    } catch (e) { console.log(e); }
    finally { setPinnedNotesLoading(false); }
  }, []);

  // useEffects
  useEffect(() => {
    if (!isInitialLoad) myProjectsFn();
  }, [projStatus, category]);

  useEffect(() => {
    if (!isInitialLoad) myTasksFn();
  }, [taskProjects, taskStatus, taskDates]);

  useEffect(() => {
    if (!isInitialLoad) myBugsFn();
  }, [bugProjects, bugStatus, bugDates]);

  useEffect(() => {
    if (!isInitialLoad) myLoggedTimeFn();
  }, [timeProjects, timeDates]);

  useEffect(() => {
    getProjectList({ countOnly: true });
    myProjectsFn();
    myTasksFn();
    fetchAssignedToMeTasks();
    fetchPastDueCount();
    myBugsFn();
    myLoggedTimeFn();
    fetchActivityLogs();
    fetchDiscussions();
    fetchPinnedNotes();
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    const handlePinnedNotesRefresh = () => {
      fetchPinnedNotes();
    };

    window.addEventListener("weekmate:notes-bookmark-updated", handlePinnedNotesRefresh);
    return () => window.removeEventListener("weekmate:notes-bookmark-updated", handlePinnedNotesRefresh);
  }, [fetchPinnedNotes]);

  useEffect(() => {
    const refreshProjectCount = () => {
      sessionStorage.removeItem("dashboard_project_total_count_v1");
      sessionStorage.removeItem("dashboard_project_list_v1");
      getProjectList({ countOnly: !isModalOpen });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshProjectCount();
      }
    };

    window.addEventListener("focus", refreshProjectCount);
    window.addEventListener("weekmate:projects-changed", refreshProjectCount);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshProjectCount);
      window.removeEventListener("weekmate:projects-changed", refreshProjectCount);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [getProjectList, isModalOpen]);

  const openAllNotes = () => {
    setAllNotesOpen(true);
    setAllNotesLoading(true);
    Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.getNotes,
      body: { pageNo: 1, limit: 200, sort: "_id", sortBy: "desc" },
    }).then((res) => {
      setAllNotes(Array.isArray(res?.data?.data) ? res.data.data : []);
    }).catch(() => { }).finally(() => setAllNotesLoading(false));
  };

  const openAddNote = () => {
    // Always fetch all projects (not limited to 4 recent)
    const cached = sessionStorage.getItem("note_all_projects");
    if (cached) { try { setNoteProjects(JSON.parse(cached)); } catch { } }
    Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.myProjects, body: { pageNo: 1, limit: 500 } })
      .then((res) => {
        const list = res?.data?.data?.data || res?.data?.data || [];
        if (list.length) {
          setNoteProjects(list);
          sessionStorage.setItem("note_all_projects", JSON.stringify(list));
        }
      }).catch(() => { });
    setAddNoteOpen(true);
  };

  const onNoteProjectChange = (pid) => {
    noteForm.setFieldValue("noteBook_id", undefined);
    setNoteNotebooks([]);
    if (!pid) return;
    setNoteNotebooksLoading(true);
    Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.getNotebook,
      body: { project_id: pid, pageNo: 1, sort: "_id", sortBy: "des" },
    }).then((res) => {
      if (Array.isArray(res?.data?.data) && res.data.data.length > 0)
        setNoteNotebooks(res.data.data);
    })
      .catch(() => { }).finally(() => setNoteNotebooksLoading(false));
  };

  const createNotebook = async (title) => {
    const pid = noteForm.getFieldValue("project_id");
    if (!title?.trim()) return;
    if (!pid) { message.warning("Please select a project first"); return; }
    setCreatingNotebook(true);
    setNotebookSearch("");
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addNotebook,
        body: { title: title.trim(), project_id: pid },
      });
      const newNb = res?.data?.data;
      if (newNb?._id) {
        setNoteNotebooks((prev) => [...prev, newNb]);
        noteForm.setFieldValue("noteBook_id", newNb._id);
        message.success("Notebook created");
      } else {
        message.error(res?.data?.message || "Failed to create notebook");
      }
    } catch { message.error("Failed to create notebook"); }
    finally { setCreatingNotebook(false); }
  };

  const handleNoteSubmit = async () => {
    try {
      const values = await noteForm.validateFields();
      setNoteSubmitting(true);
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addNotes,
        body: {
          title: values.title.trim(),
          project_id: values.project_id,
          noteBook_id: values.noteBook_id,
          color: "#000000",
          subscribers: [],
          isPrivate: false,
          pms_clients: [],
        },
      });
      if (res?.data?.status) {
        message.success(res.data.message || "Note added successfully");
        noteForm.resetFields();
        setAddNoteOpen(false);
        fetchPinnedNotes();
      } else {
        message.error(res?.data?.message || "Failed to add note");
      }
    } catch { /* validation */ }
    finally { setNoteSubmitting(false); }
  };

  if (pageLoading) return <DashboardSkeleton />;

  return (
    <div className="new-dashboard-wrapper">

      <WelcomeBanner totalProjects={totalProjects} totalTask={totalTask} />

      {/* Dashboard header row */}
      {/* <div className="db-header-row">
        <h2 className="db-page-title">Dashboard</h2>
      </div> */}

      {/* 4 Stat Cards - clickable only for Admin */}
      <div className="new-stat-cards-row">
        <div
          className={`new-stat-card${isAdmin ? " new-stat-card-clickable" : ""}`}
          role={isAdmin ? "button" : undefined}
          tabIndex={isAdmin ? 0 : undefined}
          onClick={isAdmin ? () => history.push(`/${companySlug}/project-list`) : undefined}
          onKeyDown={isAdmin ? (e) => e.key === "Enter" && history.push(`/${companySlug}/project-list`) : undefined}
        >
          <div className="stat-card-wrapper">
            <div className="stat-card-body">
              <div className="stat-card-title">Total Projects</div>
              <div className="stat-card-value">{totalProjects}</div>
            </div>
            <div className="stat-card-icon-plain blue">
              <ProjectsIcon />
            </div>
          </div>
        </div>

        <div
          className={`new-stat-card${isAdmin ? " new-stat-card-clickable" : ""}`}
          role={isAdmin ? "button" : undefined}
          tabIndex={isAdmin ? 0 : undefined}
          onClick={isAdmin ? () => handleStatCardClick("all") : undefined}
          onKeyDown={isAdmin ? (e) => e.key === "Enter" && handleStatCardClick("all") : undefined}
        >
          <div className="stat-card-wrapper">
            <div className="stat-card-body">
              <div className="stat-card-title">Total Task</div>
              <div className="stat-card-value">{totalTask}</div>
            </div>
            <div className="stat-card-icon-plain blue">
              <TasksIcon />
            </div>
          </div>
        </div>

        <div
          className={`new-stat-card${isAdmin ? " new-stat-card-clickable" : ""}`}
          role={isAdmin ? "button" : undefined}
          tabIndex={isAdmin ? 0 : undefined}
          onClick={isAdmin ? () => handleStatCardClick("assigned_to_me") : undefined}
          onKeyDown={isAdmin ? (e) => e.key === "Enter" && handleStatCardClick("assigned_to_me") : undefined}
        >
          <div className="stat-card-wrapper">
            <div className="stat-card-body">
              <div className="stat-card-title">Assigned to me</div>
              <div className="stat-card-value">{assignedToMe}</div>
            </div>
            <div className="stat-card-icon-plain green">
              <AssignedToMeIcon />
            </div>
          </div>
        </div>

        <div
          className={`new-stat-card${isAdmin ? " new-stat-card-clickable" : ""}`}
          role={isAdmin ? "button" : undefined}
          tabIndex={isAdmin ? 0 : undefined}
          onClick={isAdmin ? () => handleStatCardClick("dueToday") : undefined}
          onKeyDown={isAdmin ? (e) => e.key === "Enter" && handleStatCardClick("dueToday") : undefined}
        >
          <div className="stat-card-wrapper">
            <div className="stat-card-body">
              <div className="stat-card-title">Due today</div>
              <div className="stat-card-value">{dueToday}</div>
            </div>
            <div className="stat-card-icon-plain yellow">
              <DueTodayIcon />
            </div>
          </div>
        </div>

        <div
          className={`new-stat-card${isAdmin ? " new-stat-card-clickable" : ""}`}
          role={isAdmin ? "button" : undefined}
          tabIndex={isAdmin ? 0 : undefined}
          onClick={isAdmin ? () => handleStatCardClick("pastDue") : undefined}
          onKeyDown={isAdmin ? (e) => e.key === "Enter" && handleStatCardClick("pastDue") : undefined}
        >
          <div className="stat-card-wrapper">
            <div className="stat-card-body">
              <div className="stat-card-title">Past due tasks</div>
              <div className="stat-card-value">{pastDue}</div>
            </div>
            <div className="stat-card-icon-plain red">
              <PastDueIcon />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 - Statistics (Admin only, full width) */}
      {isAdmin && (
        <div className="dashboard-section-card db-project-stats-card">
          <div className="stats-header-row">
            <h3>Project Statistics</h3>
            <div className="stats-controls">
              <Select
                className="stats-period-select"
                value={periodType}
                onChange={setPeriodType}
                options={PERIOD_TYPE_OPTIONS}
                suffixIcon={<DownOutlined />}
                style={{ width: 130 }}
              />
              {periodType === "monthly" && (
                <Select
                  className="stats-period-select"
                  value={periodMonth}
                  onChange={setPeriodMonth}
                  options={MONTH_OPTIONS}
                  suffixIcon={<DownOutlined />}
                  style={{ width: 140 }}
                />
              )}
              {periodType === "halfYearly" && (
                <Select
                  className="stats-period-select"
                  value={periodHalf}
                  onChange={setPeriodHalf}
                  options={HALF_YEAR_OPTIONS}
                  suffixIcon={<DownOutlined />}
                  style={{ width: 140 }}
                />
              )}
              {periodType === "yearly" && (
                <Select
                  className="stats-period-select"
                  value={periodYear}
                  onChange={setPeriodYear}
                  options={yearOptions}
                  suffixIcon={<DownOutlined />}
                  style={{ width: 140 }}
                />
              )}
              {periodType === "custom" && (
                <DatePicker.RangePicker
                  className="stats-period-select stats-period-range"
                  value={customDateRange}
                  onChange={setCustomDateRange}
                  format="DD-MM-YYYY"
                  suffixIcon={<DownOutlined />}
                  allowClear={false}
                />
              )}
            </div>
          </div>
          <div className="stats-chart-wrap">
            {statsLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : !hasChartData ? (
              <NoDataFoundIcon />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barCategoryGap="25%" margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#787878" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#787878" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(0, 108, 184, 0.06)" }} contentStyle={{ borderRadius: 4, fontSize: 13, border: "1px solid #ccc", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="Completed" fill="#0367AE" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Incomplete" fill="#0a8fb0" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="chart-legend">
            <div className="legend-item"><span className="legend-dot completed"></span>Completed</div>
            <div className="legend-item"><span className="legend-dot incomplete"></span>Incomplete</div>
          </div>
        </div>
      )}

      {/* Row 3 - Priority Task Summary full-width (Admin only) */}
      {isAdmin && (() => {
        const PRIORITY_TABS = [
          { key: "all",    label: "All",    count: filteredPriorityTasks.length, color: "#787878" },
          { key: "low",    label: "Low",    count: priorityLow,    color: "#7db3db" },
          { key: "medium", label: "Medium", count: priorityMedium, color: "#2a6db3" },
          { key: "high",   label: "High",   count: priorityHigh,   color: "#15507b" },
        ];
        const PRIORITY_META = {
          low:    { label: "Low",    bg: "#eff6ff", color: "#4a90c8" },
          medium: { label: "Medium", bg: "#eff6ff", color: "#2a6db3" },
          high:   { label: "High",   bg: "#eff6ff", color: "#15507b" },
          "":     { label: "-",      bg: "#f5f5f5", color: "#8c8c8c" },
        };
        const visibleTasks = priorityFilterTab === "all"
          ? filteredPriorityTasks
          : filteredPriorityTasks.filter((t) => getTaskPriority(t) === priorityFilterTab);

        // Size the Task/Project columns to the longest value actually on screen
        // (capped), instead of a fixed fr-share of the full card width - that's
        // what was leaving large empty gaps when titles/names were short.
        const longestTitle = Math.max(10, ...visibleTasks.map((t) => (t.title || "Untitled").length));
        const longestProject = Math.max(10, ...visibleTasks.map((t) => (t.project?.title || "-").length));
        const taskColWidth = Math.min(Math.max(longestTitle * 7 + 24, 160), 420);
        const projectColWidth = Math.min(Math.max(longestProject * 7 + 24, 120), 320);
        const priorityTableColVars = {
          "--task-col-w": `${taskColWidth}px`,
          "--project-col-w": `${projectColWidth}px`,
        };

        return (
          <div className="db-bottom-card db-priority-full">
            <div className="db-priority-header">
              <h3>Priority Task Summary</h3>
              <div className="db-priority-tabs">
                {PRIORITY_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`db-priority-tab-btn${priorityFilterTab === tab.key ? " active" : ""}`}
                    style={priorityFilterTab === tab.key ? { borderColor: tab.color, background: tab.color + "18", color: tab.color } : {}}
                    onClick={() => setPriorityFilterTab(tab.key)}
                  >
                    {tab.label}
                    <span className="db-priority-tab-count">{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {visibleTasks.length === 0 ? (
              <div className="db-empty-state" style={{ padding: "32px 0" }}>
                <NoDataFoundIcon />
              </div>
            ) : (
              <div className="db-priority-task-list">
                <div className="db-priority-task-head" style={priorityTableColVars}>
                  <span>Task</span>
                  <span>Project</span>
                  <span>Priority</span>
                  <span>Due Date</span>
                  <span>Status</span>
                </div>
                <div className="db-priority-task-rows">
                  {visibleTasks.map((task, idx) => {
                    const priority = getTaskPriority(task);
                    const meta = PRIORITY_META[priority] || PRIORITY_META[""];
                    const dueDate = task.due_date ? dayjs(task.due_date).format("DD-MM-YYYY") : "-";
                    const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), "day");
                    const statusTitle = task.task_status?.title || task.status || "-";
                    return (
                      <Link
                        key={task._id || idx}
                        to={`/${companySlug}/tasks?taskID=${task?._id}`}
                        className="db-priority-task-row"
                        style={priorityTableColVars}
                      >
                        <span className="db-priority-task-title" title={task.title || "Untitled"}>{task.title || "Untitled"}</span>
                        <span className="db-priority-task-project" title={task.project?.title || ""}>{task.project?.title || "-"}</span>
                        <span className="db-priority-badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                        <span className={`db-priority-task-due${isOverdue ? " overdue" : ""}`}>{dueDate}</span>
                        <span className="db-priority-task-status">{statusTitle}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {/* {<div className="standalone-add-task">
        <div className="standalone-add-task-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="6" width="18" height="22" rx="3" fill="white" opacity="0.9" />
            <rect x="8" y="11" width="10" height="2" rx="1" fill="#0367ae" />
            <rect x="8" y="15" width="7" height="2" rx="1" fill="#0367ae" opacity="0.7" />
            <rect x="8" y="19" width="8" height="2" rx="1" fill="#0367ae" opacity="0.5" />
            <circle cx="24" cy="24" r="6" fill="white" opacity="0.3" />
            <rect x="21" y="23" width="6" height="2" rx="1" fill="white" />
            <rect x="23" y="21" width="2" height="6" rx="1" fill="white" />
          </svg>
        </div>
        <p className="standalone-add-task-title">You haven't added any tasks.</p>
        <p className="standalone-add-task-sub">Welcome Let's get started.</p>
        <Button
          type="primary"
          className="add-btn"
          icon={<PlusOutlined />}
          onClick={() => setAddTaskOpen(true)}
        >
          Task
        </Button>
      </div>} */}

      {/* ── Bottom sections ──────────────────────────────────── */}
      <div className="db-bottom-grid">

        {/* Recent Projects */}
        {/* <div className="db-bottom-card db-recent-projects">
          <div className="db-section-header">
            <h3>Recent Projects</h3>
          </div>
          {myProj.length > 0 ? (
            <div className="db-project-cards-row">
              {[...myProj]
                .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))
                .slice(0, 7)
                .map((proj) => {
                  const daysLeft = proj.end_date
                    ? Math.ceil((new Date(proj.end_date) - new Date()) / 86400000)
                    : null;
                  const completedCount = proj.completedTaskCount ?? proj.completed_task_count ?? 0;
                  const totalCount = proj.totalTaskCount ?? proj.total_task_count ?? proj.taskCount ?? 0;
                  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                  return (
                    <div
                      key={proj._id}
                      className="db-project-card"
                      onClick={() => getProjectMianTask(proj._id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && getProjectMianTask(proj._id)}
                    >
                      <div className="db-project-card-top">
                        <span className="db-project-title">{proj.title}</span>
                        <span className="db-project-star" aria-label="bookmark">
                          {proj.isStarred ? "★" : "☆"}
                        </span>
                      </div>
                      {proj.createdBy?.name && (
                        <p className="db-project-author">By <strong>{proj.createdBy.name}</strong></p>
                      )}
                      {daysLeft !== null && (
                        <span className={`db-project-due-badge ${daysLeft < 0 ? "overdue" : daysLeft <= 7 ? "soon" : ""}`}>
                          {daysLeft < 0
                            ? `${Math.abs(daysLeft)} Days Overdue`
                            : daysLeft === 0
                              ? "Due Today"
                              : `${daysLeft} Days Due`}
                        </span>
                      )}
                      <div className="db-project-progress-row">
                        <span className="db-project-progress-label">
                          Task Completed: {completedCount}/{totalCount}
                        </span>
                        <span className="db-project-progress-pct">{completedCount}</span>
                      </div>
                      <div className="db-project-progress-bar">
                        <div className="db-project-progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="db-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
              <NoDataFoundIcon />

            </div>
          )}
        </div> */}

        {/* Recent Discussion */}
        <div className="db-bottom-card db-discussion">
          <div className="db-section-header">
            <h3>Recent Discussion</h3>
            <Button className="btn-secondary" onClick={() => history.push(`/${companySlug}/discussion`)}>
              View All <span>›</span>
            </Button>
          </div>
          <div className="db-discussion-tabs">
            <button
              className={`db-tab-btn${discussionTab === "General" ? " active" : ""}`}
              onClick={() => setDiscussionTab("General")}
            >
              General
            </button>
            <button
              className={`db-tab-btn${discussionTab === "Task" ? " active" : ""}`}
              onClick={() => setDiscussionTab("Task")}
            >
              Task
            </button>
          </div>
          <div className="db-discussion-list">
            {discussionsLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} title={false} />
            ) : discussions.filter((d) =>
              discussionTab === "General"
                ? !d.task_id
                : !!d.task_id
            ).length > 0 ? (
              discussions
                .filter((d) => (discussionTab === "General" ? !d.task_id : !!d.task_id))
                .map((d, i) => (
                  <div
                    key={d._id || i}
                    className="db-discussion-item"
                    style={{ cursor: "pointer" }}
                    onClick={() => history.push(`/${companySlug}/discussion`, { topic: d })}
                  >
                    <div className="db-discussion-body">
                      <p className="db-discussion-topic">{d.title || d.topic || "Discussion"}</p>
                      <span className="db-discussion-meta">
                        {d.createdBy?.full_name || d.createdBy?.name || d.createdBy?.email || ""}
                        {d.project?.title ? ` · ${d.project.title}` : ""}
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="db-empty-state db-empty-discussion">
                <NoDataFoundIcon />
              </div>
            )}
          </div>
        </div>

        {/* Pin Notes */}
        <div className="db-bottom-card db-pin-notes">
          <div className="db-section-header">
            <h3>Pinned Notes</h3>
            <Button className="btn-secondary" onClick={() => history.push(`/${companySlug}/notes?tab=pinned`)}>
              View All <span>›</span>
            </Button>
          </div>
          {pinnedNotesLoading ? (
            <Skeleton active paragraph={{ rows: 3 }} title={false} />
          ) : pinnedNotes.length > 0 ? (
            <div className="db-notes-list">
              {pinnedNotes.map((note, i) => (
                <div
                  key={note._id || i}
                  className="db-note-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    // the notes API sends the project as an object (or an id), not always `project_id`
                    const noteProjectId =
                      note.project_id?._id ||
                      note.project_id ||
                      note.project?._id ||
                      (typeof note.project === "string" ? note.project : "");
                    if (noteProjectId) {
                      history.push(`/${companySlug}/project/app/${noteProjectId}?tab=Notes&noteID=${note._id}`);
                    }
                  }}
                >
                  <div className="db-note-body">
                    <p className="db-note-title">{note.title || "Untitled Note"}</p>
                    <p className="db-note-desc">{note.description?.slice(0, 60) || ""}</p>
                  </div>
                  <span className="db-note-arrow">›</span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="db-pin-notes-empty"
              style={{ cursor: "pointer" }}
              onClick={openAddNote}
            >
              <NoDataFoundIcon />
              <p className="db-pin-notes-empty-text">Add your first notes</p>
              <p style={{ fontSize: "12px", color: "#8c8c8c", marginTop: "4px" }}>Click to add a note</p>
            </div>
          )}
        </div>

      </div>

      {/* Activity table row - Admin only */}
      {/* {isAdmin && (
        <div className="db-bottom-card db-activity db-priority-full">
          <div className="db-section-header">
            <h3>Activity</h3>
            <Button className="btn-secondary" onClick={() => history.push(`/${companySlug}/admin/activity-logs`)}>
              View All <span>›</span>
            </Button>
          </div>
          <div className="db-activity-table-wrap">
            {activityLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : activityLogs.length > 0 ? (
              <Table
                columns={[
                  {
                    title: "User",
                    key: "user",
                    render: (_, log) => {
                      const user = log.createdBy;
                      return (user && typeof user === "object")
                        ? (user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "-")
                        : (log.createdByName || "-");
                    },
                    className: "db-act-user",
                  },
                  {
                    title: "Email",
                    key: "email",
                    render: (_, log) => log.email || log.createdBy?.email || log.createdByEmail || "-",
                    className: "db-act-email",
                  },
                  {
                    title: "Operation",
                    key: "operation",
                    render: (_, log) => {
                      const operation = log.operationName || "-";
                      const OP_COLORS = {
                        LOGIN: { bg: "#eff6ff", color: "#0367ae" },
                        LOGOUT: { bg: "#eff6ff", color: "#038fde" },
                        UPDATE: { bg: "#eff6ff", color: "#2a6db3" },
                        DELETE: { bg: "#eff6ff", color: "#15507b" },
                        CREATE: { bg: "#eff6ff", color: "#0367ae" },
                      };
                      const opStyle = OP_COLORS[operation] || { bg: "#f5f5f5", color: "#787878" };
                      return (
                        <span className="db-act-op-badge" style={{ background: opStyle.bg, color: opStyle.color }}>
                          {operation}
                        </span>
                      );
                    },
                  },
                  {
                    title: "Module",
                    key: "module",
                    render: (_, log) => (log.moduleName || "-").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"),
                    className: "db-act-module",
                  },
                  {
                    title: "Timestamp",
                    key: "timestamp",
                    render: (_, log) => {
                      const d = log.createdAt ? new Date(log.createdAt) : null;
                      return d ? moment(d).format("DD-MM-YYYY") : "-";
                    },
                    className: "db-act-time",
                  },
                ]}
                dataSource={activityLogs}
                pagination={false}
                rowKey={(record, index) => record._id || index}
                className="db-activity-table"
                onRow={(record) => ({
                  onClick: () => setActivityModalLogId(record._id),
                  style: { cursor: "pointer" },
                })}
              />
            ) : (
              <>
                <NoDataFoundIcon />
                <div className="db-empty-state">No recent activity</div>
              </>
            )}
          </div>
        </div>
      )} */}

      <ProjectListModal
        projectList={projectList}
        recentList={recentList}
        isModalOpen={isModalOpen}
        handleCancel={handleCancel}
        addVisitedData={addVisitedData}
        removeVisitedData={removeVisitedData}
        setIsModalOpen={setIsModalOpen}
        form={form}
      />

      <AddTaskModal
        open={addTaskOpen}
        onCancel={() => setAddTaskOpen(false)}
        onSuccess={() => { setAddTaskOpen(false); myTasksFn(); fetchAssignedToMeTasks(); setTimeout(() => fetchActivityLogs(), 1000); }}
        standalone={true}
      />

      <ActivityLogDetailModal
        logId={activityModalLogId}
        open={!!activityModalLogId}
        onClose={() => setActivityModalLogId(null)}
      />

      {/* ── All Notes Modal ── */}
      <Modal
        title="All Notes"
        open={allNotesOpen}
        onCancel={() => setAllNotesOpen(false)}
        footer={null}
        width={640}
        bodyStyle={{ maxHeight: "70vh", overflowY: "auto", padding: "12px 24px" }}
      >
        {allNotesLoading ? (
          <div style={{ textAlign: "center", padding: 32, color: "#8c8c8c" }}>Loading...</div>
        ) : allNotes.length === 0 ? (
          <div className="no-data-found" style={{ padding: 32 }}>
            <NoDataFoundIcon />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {allNotes.map((note, i) => (
              <div
                key={note._id || i}
                onClick={() => { setAllNotesOpen(false); (note.project_id?._id || note.project_id || note.project?._id) && history.push(`/${companySlug}/project/app/${note.project_id?._id || note.project_id || note.project?._id}?tab=Notes&noteID=${note._id}`); }}
                style={{
                  padding: "12px 16px", borderRadius: 8, border: "1px solid #e8e8e8",
                  cursor: "pointer", background: "#fafafa", transition: "background 0.15s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#fafafa"}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: "#262626", marginBottom: 4 }}>
                  📌 {note.title || "Untitled Note"}
                </div>
                {note.description && (
                  <div style={{ fontSize: 12, color: "#787878" }}>{note.description.slice(0, 80)}{note.description.length > 80 ? "..." : ""}</div>
                )}
                <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 4 }}>
                  {note.project_id?.title || note.project_title || ""}
                  {note.noteBook_id?.title ? ` › ${note.noteBook_id.title}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Add Note Modal ── */}
      <Modal
        title="Add New Note"
        open={addNoteOpen}
        onCancel={() => { setAddNoteOpen(false); noteForm.resetFields(); }}
        onOk={handleNoteSubmit}
        okText="Add Note"
        okButtonProps={{ className: "add-btn", type: "primary" }}
        confirmLoading={noteSubmitting}
        destroyOnClose
      >
        <Form form={noteForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Note Title" rules={[{ required: true, message: "Title is required" }]}>
            <Input placeholder="Enter note title..." />
          </Form.Item>
          <Form.Item name="project_id" label="Project" rules={[{ required: true, message: "Select a project" }]}>
            <Select placeholder="Select project" showSearch optionFilterProp="children" onChange={onNoteProjectChange}>
              {noteProjects.map((p) => <Select.Option key={p._id} value={p._id}>{p.title}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="noteBook_id" label="Notebook" rules={[{ required: true, message: "Select a notebook" }]}>
            <Select
              placeholder="Select or create notebook"
              showSearch
              optionFilterProp="children"
              loading={noteNotebooksLoading || creatingNotebook}
              searchValue={notebookSearch}
              onSearch={setNotebookSearch}
              notFoundContent={
                notebookSearch.trim() ? (
                  <div
                    style={{ padding: "6px 12px", cursor: "pointer", color: "#005282", fontWeight: 500 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const val = notebookSearch;
                      createNotebook(val);
                    }}
                  >
                    + Create notebook "{notebookSearch.trim()}"
                  </div>
                ) : (creatingNotebook ? "Creating..." : <NoDataFoundIcon compact />)
              }
              onInputKeyDown={(e) => {
                if (e.key === "Enter" && notebookSearch.trim()) {
                  e.preventDefault();
                  const val = notebookSearch;
                  createNotebook(val);
                }
              }}
            >
              {noteNotebooks.map((n) => <Select.Option key={n._id} value={n._id}>{n.title}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default memo(Dashboard);
