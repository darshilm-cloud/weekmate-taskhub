/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, eqeqeq */
import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import "./dashboard.css";
import { Form, Modal, Select, Input, message } from "antd";
import { Link } from "react-router-dom";
import moment from "moment";
import ProjectListModal from "../../components/Modal/ProjectListModal";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { generateCacheKey } from "../../util/generateCacheKey";
import ProjectFilterComponent from "./ProjectFilterComponent";
import TaskFilterComponent from "./TaskFilterComponent";
import BugFilterComponent from "./BugFilterComponent";
import TimeFilterComponent from "./TimeFilterComponent";
import dayjs from "dayjs";
import ReactApexChart from "react-apexcharts";
import { getRoles } from "../../util/hasPermission";
import {
  AppstoreOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { DashboardSkeleton } from "../../components/common/SkeletonLoader";
import AddTaskModal from "../Tasks/AddTaskModal";

const Dashboard = () => {
  const dispatch = useDispatch();
  const companySlug = localStorage.getItem("companyDomain");
  const history = useHistory();
  const isAdmin = getRoles(["Admin", "TL"]);
  const currentUserId = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user_data"))?._id || ""; }
    catch { return ""; }
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [form] = Form.useForm();
  const [projectDetails, setProjectDetails] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [myProj, setMyProj] = useState([]);
  const [myTask, setMyTask] = useState([]);
  const [assignedToMeTasks, setAssignedToMeTasks] = useState([]);
  const [myBug, setMyBug] = useState([]);
  const [myTime, setMyTime] = useState([]);
  const [recentList, setRecentList] = useState([]);
  const [chartView, setChartView] = useState("monthly");
  const [activityLogs, setActivityLogs] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [discussionTab, setDiscussionTab] = useState("General");
  const [pinnedNotes, setPinnedNotes] = useState([]);
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
  const [calendarValue, setCalendarValue] = useState(() => dayjs());
  const calendarWeekdays = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);

  // Memoized derived values — only recalculate when myTask changes
  const today = useMemo(() => dayjs().format("YYYY-MM-DD"), []);

  const isDone = useCallback((t) => {
    const title = (t.task_status?.title || "").toLowerCase();
    return title === "done" || title === "closed";
  }, []);

  const { totalTask, assignedToMe, dueToday, pastDue } = useMemo(() => {
    const assignedCount =
      assignedToMeTasks.length > 0
        ? assignedToMeTasks.length
        : isAdmin
          ? myTask.filter((t) =>
              (t.assignees || []).some((a) => {
                const id = a && (a._id ?? a);
                return id != null && String(id).trim() === String(currentUserId).trim();
              })
            ).length
          : myTask.length;
    return {
      totalTask: myTask.length,
      assignedToMe: assignedCount,
      dueToday: myTask.filter(
        (t) => t.due_date && dayjs(t.due_date).format("YYYY-MM-DD") === today
      ).length,
      pastDue: myTask.filter(
        (t) =>
          t.due_date &&
          dayjs(t.due_date).isBefore(dayjs(), "day") &&
          !isDone(t)
      ).length,
    };
  }, [myTask, today, isAdmin, currentUserId, assignedToMeTasks.length, isDone]);

  const monthDays = useMemo(() => {
    const monthStart = calendarValue.startOf("month");
    return Array.from({ length: monthStart.daysInMonth() }, (_, idx) =>
      monthStart.add(idx, "day")
    );
  }, [calendarValue]);

  const visibleStripDays = useMemo(() => monthDays.slice(0, 9), [monthDays]);

  const calendarGrid = useMemo(() => {
    const monthStart = calendarValue.startOf("month");
    const gridStart = monthStart.startOf("week");
    return Array.from({ length: 42 }, (_, idx) => gridStart.add(idx, "day"));
  }, [calendarValue]);

  const goToCalendarMonth = useCallback((delta) => {
    const next = calendarValue.add(delta, "month");
    const safeDay = Math.min(calendarValue.date(), next.daysInMonth());
    setCalendarValue(next.date(safeDay));
  }, [calendarValue]);

  // Memoized chart data — only recalculate when myTask or chartView changes
  const { labels, completedCounts, incompleteCounts } = useMemo(() => {
    const periods = chartView === "monthly" ? 6 : 7;
    const _labels = [];
    const _completedCounts = [];
    const _incompleteCounts = [];
    for (let i = periods - 1; i >= 0; i--) {
      if (chartView === "monthly") {
        const m = dayjs().subtract(i, "month");
        _labels.push(m.format("MMM"));
        const tasksInPeriod = myTask.filter((t) => {
          const d = t.createdAt || t.due_date;
          return d && dayjs(d).format("YYYY-MM") === m.format("YYYY-MM");
        });
        _completedCounts.push(
          tasksInPeriod.filter((t) => ["done", "closed"].includes(t.status?.toLowerCase())).length
        );
        _incompleteCounts.push(
          tasksInPeriod.filter((t) => !["done", "closed"].includes(t.status?.toLowerCase())).length
        );
      } else {
        const d = dayjs().subtract(i, "day");
        _labels.push(d.format("ddd"));
        const tasksOnDay = myTask.filter(
          (t) =>
            (t.createdAt || t.due_date) &&
            dayjs(t.createdAt || t.due_date).format("YYYY-MM-DD") === d.format("YYYY-MM-DD")
        );
        _completedCounts.push(
          tasksOnDay.filter((t) => ["done", "closed"].includes(t.status?.toLowerCase())).length
        );
        _incompleteCounts.push(
          tasksOnDay.filter((t) => !["done", "closed"].includes(t.status?.toLowerCase())).length
        );
      }
    }
    return { labels: _labels, completedCounts: _completedCounts, incompleteCounts: _incompleteCounts };
  }, [myTask, chartView]);

  const isDarkTheme = useMemo(() => {
    if (typeof document === "undefined") return false;
    const body = document.body;
    return (
      body?.classList?.contains("dark-theme") ||
      body?.dataset?.theme === "dark" ||
      body?.getAttribute?.("data-theme") === "dark"
    );
  }, []);

  const chartOptions = useMemo(() => {
    const muted = isDarkTheme ? "#94a3b8" : "#6b7280";
    const grid = isDarkTheme ? "rgba(148, 163, 184, 0.22)" : "#f0f2f5";
    const axis = isDarkTheme ? "rgba(148, 163, 184, 0.28)" : "#e5e7eb";
    const markerStroke = isDarkTheme ? "#0f1722" : "#ffffff";

    return {
      chart: {
        type: "line",
        toolbar: { show: false },
        zoom: { enabled: false },
        foreColor: muted,
      },
      colors: ["#2dd4bf", "#ff4d4f"],
      stroke: { curve: "smooth", width: 2 },
      markers: { size: 4, strokeWidth: 2, strokeColors: markerStroke },
      xaxis: {
        categories: labels,
        labels: { style: { colors: muted, fontSize: "12px" } },
        axisBorder: { color: axis },
        axisTicks: { color: axis },
      },
      yaxis: {
        min: 0,
        labels: { style: { colors: muted, fontSize: "12px" } },
      },
      legend: { show: false },
      grid: { borderColor: grid, strokeDashArray: 3 },
      tooltip: {
        enabled: true,
        theme: isDarkTheme ? "dark" : "light",
        // Avoid Apex default "series-colored" tooltip background (was showing as bright green).
        fillSeriesColor: false,
        style: { fontSize: "12px" },
      },
      dataLabels: { enabled: false },
    };
  }, [labels, isDarkTheme]);

  const chartSeries = useMemo(() => [
    { name: "Completed", data: completedCounts },
    { name: "Incomplete", data: incompleteCounts },
  ], [completedCounts, incompleteCounts]);

  // Memoized priority + today summary
  const getTaskPriority = useCallback((t) => {
    // Priority is stored in taskLabels array (e.g. "High Priority", "Medium Priority", "Low Priority")
    const labels = t.taskLabels || [];
    for (const l of labels) {
      const title = (l.title || "").toLowerCase();
      if (title.includes("high")) return "high";
      if (title.includes("medium")) return "medium";
      if (title.includes("low")) return "low";
    }
    // Fallback: check direct priority field
    if (t.priority) {
      const raw = (typeof t.priority === "string" ? t.priority : (t.priority?.title || t.priority?.name || "")).toLowerCase();
      if (raw.includes("high")) return "high";
      if (raw.includes("medium")) return "medium";
      if (raw.includes("low")) return "low";
    }
    return "";
  }, []);
  const { priorityLow, priorityMedium, priorityHigh, newToday, closedToday, teamIncomplete } = useMemo(() => ({
    priorityLow: myTask.filter((t) => getTaskPriority(t) === "low").length,
    priorityMedium: myTask.filter((t) => getTaskPriority(t) === "medium").length,
    priorityHigh: myTask.filter((t) => getTaskPriority(t) === "high").length,
    newToday: myTask.filter(
      (t) => t.createdAt && dayjs(t.createdAt).format("YYYY-MM-DD") === today
    ).length,
    closedToday: myTask.filter(
      (t) =>
        ["done", "closed"].includes(t.status?.toLowerCase()) &&
        t.updatedAt &&
        dayjs(t.updatedAt).format("YYYY-MM-DD") === today
    ).length,
    teamIncomplete: myTask
      .filter((t) => !["done", "closed"].includes(t.status?.toLowerCase()))
      .slice(0, 10),
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
  const getProjectListing = useCallback(async (searchText) => {
    try {
      dispatch(showAuthLoader());
      const normalizedSearch = (searchText || "").trim();
      const reqBody = {
        pageNo: 1,
        limit: 100,
        search: normalizedSearch,
        sortBy: "desc",
        filterBy: "all",
        isSearch: true,
      };
      const Key = generateCacheKey("project", reqBody);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.getProjectdetails,
        body: reqBody, options: { cachekey: Key },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) setProjectDetails(response.data.data);
    } catch (error) { console.log(error); }
  }, [dispatch]);

  const getProjectList = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.getMethod, api_url: Service.getProjectList,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) setProjectList(response.data.data);
    } catch (error) { console.log(error); }
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
        try { setMyProj(JSON.parse(cached)); } catch {}
      }
    }
    try {
      let reqBody = { pageNo: 1, limit: 4 }; // only need 4 for Recent Projects
      if (category?.length > 0) reqBody = { ...reqBody, category };
      if (projStatus?.length > 0) reqBody = { ...reqBody, project_status: projStatus };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.myProjects, body: reqBody,
      });
      const projects = response?.data?.data?.data || response?.data?.data || [];
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
      if (taskDates?.startDate) reqBody.start_date = dayjs(taskDates.startDate).format("YYYY-MM-DD");
      if (taskDates?.endDate) reqBody.end_date = dayjs(taskDates.endDate).format("YYYY-MM-DD");

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myTasks,
        body: reqBody,
      });

      dispatch(hideAuthLoader());
      if (response?.data?.data && Array.isArray(response.data.data)) {
        setMyTask(response.data.data);
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

  const myBugsFn = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      let reqBody = {};
      if (bugStatus && bugStatus !== "all") reqBody = { ...reqBody, status: bugStatus };
      if (bugProjects?.length > 0) reqBody = { ...reqBody, project_id: bugProjects };
      if (bugDates.startDate) reqBody.start_date = dayjs(bugDates.startDate).format("YYYY-MM-DD");
      if (bugDates.endDate) reqBody.end_date = dayjs(bugDates.endDate).format("YYYY-MM-DD");
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.myBugs, body: reqBody,
      });
      if (response?.data?.data) { dispatch(hideAuthLoader()); setMyBug(response.data.data); }
    } catch (error) { console.log(error, "myBug error"); }
  }, [dispatch, bugProjects, bugStatus, bugDates]);

  const myLoggedTimeFn = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      const now = new Date();
      let reqBody = {
        start_date: moment(new Date(now.getFullYear(), now.getMonth(), 1)).format("YYYY-MM-DD"),
        end_date: moment(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)).format("YYYY-MM-DD"),
      };
      if (timeProjects?.length > 0) reqBody = { ...reqBody, project_id: timeProjects };
      if (timeDates.startDate) reqBody.start_date = dayjs(timeDates.startDate).format("YYYY-MM-DD");
      if (timeDates.endDate) reqBody.end_date = dayjs(timeDates.endDate).format("YYYY-MM-DD");
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.myLoggedTime, body: reqBody,
      });
      if (response?.data?.data) { dispatch(hideAuthLoader()); setMyTime(response.data.data); }
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

  const showModal = useCallback(async () => {
    setIsModalOpen(true);
    getProjectListing();
    getVisitedData();
  }, [getProjectListing, getVisitedData]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    form.resetFields();
  }, [form]);

  const fetchActivityLogs = useCallback(async () => {
    try {
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
  }, []);

  const fetchDiscussions = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionTopic,
        body: { pageNo: 1, limit: 10, sortBy: "desc" },
      });
      const data = response?.data?.data;
      if (Array.isArray(data)) setDiscussions(data);
    } catch (e) { console.log(e); }
  }, []);

  const fetchPinnedNotes = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getNotes,
        body: { isBookmark: true, pageNo: 1, limit: 5 },
      });
      if (response?.data?.data) setPinnedNotes(response.data.data);
    } catch (e) { console.log(e); }
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
    getProjectListing();
    getProjectList();
    myProjectsFn();
    myTasksFn();
    fetchAssignedToMeTasks();
    myBugsFn();
    myLoggedTimeFn();
    fetchActivityLogs();
    fetchDiscussions();
    fetchPinnedNotes();
    setIsInitialLoad(false);
  }, []);

  const openAllNotes = () => {
    setAllNotesOpen(true);
    setAllNotesLoading(true);
    Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.getNotes,
      body: { pageNo: 1, limit: 200, sort: "_id", sortBy: "desc" },
    }).then((res) => {
      setAllNotes(Array.isArray(res?.data?.data) ? res.data.data : []);
    }).catch(() => {}).finally(() => setAllNotesLoading(false));
  };

  const openAddNote = () => {
    // Always fetch all projects (not limited to 4 recent)
    const cached = sessionStorage.getItem("note_all_projects");
    if (cached) { try { setNoteProjects(JSON.parse(cached)); } catch {} }
    Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.myProjects, body: { pageNo: 1, limit: 500 } })
      .then((res) => {
        const list = res?.data?.data?.data || res?.data?.data || [];
        if (list.length) {
          setNoteProjects(list);
          sessionStorage.setItem("note_all_projects", JSON.stringify(list));
        }
      }).catch(() => {});
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
      .catch(() => {}).finally(() => setNoteNotebooksLoading(false));
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

      {/* Dashboard header row */}
      <div className="db-header-row">
        <h2 className="db-page-title">Dashboard</h2>
      </div>

      {/* 4 Stat Cards — clickable, redirect to task page with applied filter */}
      <div className="new-stat-cards-row">
        <div
          className="new-stat-card new-stat-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => handleStatCardClick("all")}
          onKeyDown={(e) => e.key === "Enter" && handleStatCardClick("all")}
        >
          <div className="stat-card-icon-wrap blue">
            <AppstoreOutlined />
          </div>
          <div className="stat-card-body">
            <div className="stat-card-title">Total Task</div>
            <div className="stat-card-value">{totalTask}</div>
          </div>
        </div>

        <div
          className="new-stat-card new-stat-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => handleStatCardClick("assigned_to_me")}
          onKeyDown={(e) => e.key === "Enter" && handleStatCardClick("assigned_to_me")}
        >
          <div className="stat-card-icon-wrap green">
            <UserOutlined />
          </div>
          <div className="stat-card-body">
            <div className="stat-card-title">Assigned to me</div>
            <div className="stat-card-value">{assignedToMe}</div>
          </div>
        </div>

        <div
          className="new-stat-card new-stat-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => handleStatCardClick("dueToday")}
          onKeyDown={(e) => e.key === "Enter" && handleStatCardClick("dueToday")}
        >
          <div className="stat-card-icon-wrap yellow">
            <ClockCircleOutlined />
          </div>
          <div className="stat-card-body">
            <div className="stat-card-title">Due today</div>
            <div className="stat-card-value">{dueToday}</div>
          </div>
        </div>

        <div
          className="new-stat-card new-stat-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => handleStatCardClick("pastDue")}
          onKeyDown={(e) => e.key === "Enter" && handleStatCardClick("pastDue")}
        >
          <div className="stat-card-icon-wrap red">
            <ExclamationCircleOutlined />
          </div>
          <div className="stat-card-body">
            <div className="stat-card-title">Past due tasks</div>
            <div className="stat-card-value">{pastDue}</div>
          </div>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="new-dashboard-columns">

        {/* Left column */}
        <div className="dashboard-col-left">

          {/* Statistics Chart */}
          <div className="dashboard-section-card">
            <div className="stats-header-row">
              <h3>Statistics</h3>
              <div className="stats-controls">
                <button
                  className={`stats-toggle-btn${chartView === "monthly" ? " active" : ""}`}
                  onClick={() => setChartView("monthly")}
                >
                  Monthly
                </button>
                <button
                  className={`stats-toggle-btn${chartView === "weekly" ? " active" : ""}`}
                  onClick={() => setChartView("weekly")}
                >
                  Weekly
                </button>
              </div>
            </div>

            <ReactApexChart
              options={chartOptions}
              series={chartSeries}
              type="line"
              height={240}
            />

            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-dot completed"></span>
                Completed
              </div>
              <div className="legend-item">
                <span className="legend-dot incomplete"></span>
                Incomplete
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="dashboard-section-card dashboard-calendar">
            <div className="db-cal-header">
              <div className="db-cal-header-top">
                <div className="db-cal-title">{calendarValue.format("MMMM YYYY")}</div>
                <div className="db-cal-nav">
                  <button
                    type="button"
                    className="db-cal-nav-btn"
                    onClick={() => goToCalendarMonth(-1)}
                    aria-label="Previous month"
                  >
                    <LeftOutlined />
                  </button>
                  <button
                    type="button"
                    className="db-cal-nav-btn"
                    onClick={() => goToCalendarMonth(1)}
                    aria-label="Next month"
                  >
                    <RightOutlined />
                  </button>
                </div>
              </div>

              <div className="db-cal-strip" role="list" aria-label="Month days">
                {visibleStripDays.map((day) => {
                  const isActive = day.isSame(calendarValue, "day");
                  return (
                    <button
                      key={day.format("YYYY-MM-DD")}
                      type="button"
                      className={`db-cal-strip-item${isActive ? " active" : ""}`}
                      onClick={() => setCalendarValue(day)}
                      role="listitem"
                    >
                      <div className="db-cal-strip-dow">{day.format("ddd")}</div>
                      <div className="db-cal-strip-day">{day.format("DD")}</div>
                    </button>
                  );
                })}
              </div>

              <div className="db-cal-strip-rule" />
            </div>

            <div className="db-cal-grid">
              <div className="db-cal-weekdays">
                {calendarWeekdays.map((weekday) => (
                  <div key={weekday} className="db-cal-weekday">
                    {weekday}
                  </div>
                ))}
              </div>

              <div className="db-cal-dates">
                {calendarGrid.map((day) => {
                  const isSelected = day.isSame(calendarValue, "day");
                  const isCurrentMonth = day.month() === calendarValue.month();
                  return (
                    <button
                      key={day.format("YYYY-MM-DD")}
                      type="button"
                      className={`db-cal-date${isSelected ? " selected" : ""}${isCurrentMonth ? "" : " muted"}`}
                      onClick={() => setCalendarValue(day)}
                    >
                      <span className="db-cal-date-label">{day.format("D")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="dashboard-col-right">

          {/* Priority Task Summary with donut chart */}
          <div className="right-panel-card priority-summary-card">
            <h4>Priority Task Summary</h4>
            {(priorityLow + priorityMedium + priorityHigh) === 0 ? (
              <div className="priority-donut-empty">
                <svg width="150" height="150" viewBox="0 0 150 150">
                  <circle cx="75" cy="75" r="52" fill="none" stroke={isDarkTheme ? "#2d3f55" : "#e2e8f0"} strokeWidth="22"/>
                  <text x="75" y="82" textAnchor="middle" fontSize="26" fontWeight="700" fill={isDarkTheme ? "#94a3b8" : "#94a3b8"}>0</text>
                </svg>
              </div>
            ) : (
              <div className="priority-chart-wrap">
                <ReactApexChart
                  options={{
                    chart: { type: "donut", toolbar: { show: false } },
                    labels: ["Low", "Medium", "High"],
                    colors: ["#2dd4bf", "#faad14", "#ff4d4f"],
                    legend: { show: false },
                    dataLabels: { enabled: false },
                    plotOptions: {
                      pie: {
                        startAngle: 0,
                        endAngle: 360,
                        offsetY: -6,
                        donut: {
                          size: "70%",
                          labels: {
                            show: true,
                            total: {
                              show: true,
                              showAlways: true,
                              label: "",
                              fontSize: "24px",
                              fontWeight: 700,
                              color: isDarkTheme ? "#e5e7eb" : "#1e293b",
                              formatter: () => String(priorityLow + priorityMedium + priorityHigh),
                            },
                          },
                        },
                      },
                    },
                    stroke: { width: 0 },
                    tooltip: { enabled: true, theme: isDarkTheme ? "dark" : "light" },
                  }}
                  series={[priorityLow, priorityMedium, priorityHigh]}
                  type="donut"
                  height={240}
                />
              </div>
            )}
            <div className="priority-legend-row">
              <div className="priority-item">
                <span className="priority-dot low"></span>
                Low <span className="priority-count">{priorityLow}</span>
              </div>
              <div className="priority-item">
                <span className="priority-dot medium"></span>
                Medium <span className="priority-count">{priorityMedium}</span>
              </div>
              <div className="priority-item">
                <span className="priority-dot high"></span>
                High <span className="priority-count">{priorityHigh}</span>
              </div>
            </div>
          </div>

          {/* Team Incomplete Task */}
          <div className="right-panel-card team-incomplete-card">
            <h4>Team Incomplete Task</h4>
            {teamIncomplete.length > 0 ? (
              <div className="team-incomplete-list">
                {teamIncomplete.map((item, idx) => {
                  const assignee = item?.assignees?.[0];
                  const assigneeName =
                    (assignee?.name || assignee?.full_name || item?.assignedTo?.name || item?.title || "Task")
                      .trim();
                  const initials = assigneeName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  const colors = ["#f59e0b","#3b82f6","#10b981","#8b5cf6","#ef4444"];
                  const bg = colors[idx % colors.length];
                  return (
                    <Link
                      key={item?._id || idx}
                      to={`/${companySlug}/project/app/${item?.project?._id}?tab=Tasks&listID=${item?.mainTask?._id}&taskID=${item?._id}`}
                      className="team-incomplete-item-v2"
                    >
                      <div className="ti-avatar" style={{ background: bg }}>{initials}</div>
                      <span className="ti-name">{assigneeName.length > 22 ? assigneeName.slice(0, 21) + "…" : assigneeName}</span>
                      <span className="ti-count">0</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="team-incomplete-empty">No incomplete tasks</div>
            )}
          </div>

        </div>
      </div>

      {/* ── Standalone Add Task section (full-width centered) ─── */}
      <div className="standalone-add-task">
        <div className="standalone-add-task-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="6" width="18" height="22" rx="3" fill="white" opacity="0.9"/>
            <rect x="8" y="11" width="10" height="2" rx="1" fill="#0e9f6e"/>
            <rect x="8" y="15" width="7" height="2" rx="1" fill="#0e9f6e" opacity="0.7"/>
            <rect x="8" y="19" width="8" height="2" rx="1" fill="#0e9f6e" opacity="0.5"/>
            <circle cx="24" cy="24" r="6" fill="white" opacity="0.3"/>
            <rect x="21" y="23" width="6" height="2" rx="1" fill="white"/>
            <rect x="23" y="21" width="2" height="6" rx="1" fill="white"/>
          </svg>
        </div>
        <p className="standalone-add-task-title">You haven't added any tasks.</p>
        <p className="standalone-add-task-sub">Welcome Let's get started.</p>
        <button
          className="standalone-add-task-btn"
          onClick={() => setAddTaskOpen(true)}
        >
          Add Task
        </button>
      </div>

      {/* ── Bottom sections ──────────────────────────────────── */}
      <div className="db-bottom-grid">

        {/* Recent Projects */}
        <div className="db-bottom-card db-recent-projects">
          <div className="db-section-header">
            <h3>Recent Projects</h3>
          </div>
          {myProj.length > 0 ? (
            <div className="db-project-cards-row">
              {myProj.slice(0, 4).map((proj) => {
                const daysLeft = proj.end_date
                  ? Math.ceil((new Date(proj.end_date) - new Date()) / 86400000)
                  : null;
                const completedCount = proj.completedTaskCount ?? proj.completed_task_count ?? 0;
                const totalCount     = proj.totalTaskCount ?? proj.total_task_count ?? proj.taskCount ?? 0;
                const progress       = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
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
            <div className="db-empty-state">No projects found</div>
          )}
        </div>

        {/* Recent Discussion */}
        <div className="db-bottom-card db-discussion">
          <div className="db-section-header">
            <h3>Recent Discussion</h3>
            <button className="db-view-all" onClick={() => history.push(`/${companySlug}/discussion`)}>
              View All <span>›</span>
            </button>
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
            {discussions.filter((d) =>
              discussionTab === "General"
                ? !d.task_id
                : !!d.task_id
            ).length > 0 ? (
              discussions
                .filter((d) => (discussionTab === "General" ? !d.task_id : !!d.task_id))
                .map((d, i) => (
                  <div key={d._id || i} className="db-discussion-item">
                    <div className="db-discussion-avatar">
                      {(d.createdBy?.full_name || d.createdBy?.name || d.title || "D").charAt(0).toUpperCase()}
                    </div>
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
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="8" width="36" height="26" rx="6" fill="#dbeafe"/>
                  <rect x="14" y="40" width="8" height="4" rx="2" fill="#dbeafe"/>
                  <rect x="14" y="38" width="8" height="6" rx="2" fill="#93c5fd"/>
                  <circle cx="17" cy="21" r="2.5" fill="#3b82f6"/>
                  <circle cx="24" cy="21" r="2.5" fill="#3b82f6"/>
                  <circle cx="31" cy="21" r="2.5" fill="#3b82f6"/>
                </svg>
                <p>No discussions yet</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Activity + Pin Notes row */}
      <div className="db-bottom-grid db-bottom-grid-2">

        {/* Activity */}
        <div className="db-bottom-card db-activity">
          <div className="db-section-header">
            <h3>Activity</h3>
            <button className="db-view-all" onClick={() => history.push(`/${companySlug}/admin/activity-logs`)}>
              View All <span>›</span>
            </button>
          </div>
          <div className="db-activity-table-wrap">
            {activityLogs.length > 0 ? (
              <table className="db-activity-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Operation</th>
                    <th>Module</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map((log, i) => {
                    const user = log.createdBy;
                    const userName = (user && typeof user === "object")
                      ? (user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "-")
                      : (log.createdByName || "-");
                    const email = log.email || log.createdBy?.email || log.createdByEmail || "-";
                    const operation = log.operationName || "-";
                    const module = (log.moduleName || "-").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
                    const d = log.createdAt ? new Date(log.createdAt) : null;
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const timestamp = d
                      ? `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
                      : "-";
                    const OP_COLORS = {
                      LOGIN:  { bg: "#f0fdf4", color: "#16a34a" },
                      LOGOUT: { bg: "#eff6ff", color: "#2563eb" },
                      UPDATE: { bg: "#fff7ed", color: "#ea580c" },
                      DELETE: { bg: "#fef2f2", color: "#dc2626" },
                      CREATE: { bg: "#f0fdf4", color: "#16a34a" },
                    };
                    const opStyle = OP_COLORS[operation] || { bg: "#f1f5f9", color: "#64748b" };
                    return (
                      <tr key={log._id || i}>
                        <td className="db-act-user">{userName}</td>
                        <td className="db-act-email">{email}</td>
                        <td>
                          <span className="db-act-op-badge" style={{ background: opStyle.bg, color: opStyle.color }}>
                            {operation}
                          </span>
                        </td>
                        <td className="db-act-module">{module}</td>
                        <td className="db-act-time">{timestamp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="db-empty-state">No recent activity</div>
            )}
          </div>
        </div>

        {/* Pin Notes */}
        <div className="db-bottom-card db-pin-notes">
          <div className="db-section-header">
            <h3>Pin Notes</h3>
            <button className="db-view-all" onClick={() => history.push(`/${companySlug}/notes`)}>
              View All <span>›</span>
            </button>
          </div>
          {pinnedNotes.length > 0 ? (
            <div className="db-notes-list">
              {pinnedNotes.map((note, i) => (
                <div
                  key={note._id || i}
                  className="db-note-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => note.project_id && history.push(`/${companySlug}/project/app/${note.project_id}?tab=Notes`)}
                >
                  <span className="db-note-pin">📌</span>
                  <div className="db-note-body">
                    <p className="db-note-title">{note.title || "Untitled Note"}</p>
                    <p className="db-note-desc">{note.description?.slice(0, 60) || ""}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="db-pin-notes-empty"
              style={{ cursor: "pointer" }}
              onClick={openAddNote}
            >
              <svg width="100" height="100" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="70" cy="70" r="60" fill="#eff6ff"/>
                <rect x="38" y="30" width="52" height="68" rx="6" fill="#fbbf24"/>
                <rect x="44" y="40" width="40" height="6" rx="3" fill="white" opacity="0.8"/>
                <rect x="44" y="52" width="32" height="4" rx="2" fill="white" opacity="0.6"/>
                <rect x="44" y="62" width="36" height="4" rx="2" fill="white" opacity="0.6"/>
                <rect x="44" y="72" width="28" height="4" rx="2" fill="white" opacity="0.6"/>
                <rect x="50" y="14" width="40" height="52" rx="6" fill="#3b82f6"/>
                <rect x="58" y="24" width="24" height="4" rx="2" fill="white" opacity="0.9"/>
                <rect x="58" y="34" width="18" height="3" rx="1.5" fill="white" opacity="0.7"/>
                <rect x="58" y="42" width="20" height="3" rx="1.5" fill="white" opacity="0.7"/>
                <circle cx="102" cy="98" r="18" fill="#1d4ed8"/>
                <rect x="94" y="97" width="16" height="2.5" rx="1.25" fill="white"/>
                <rect x="100" y="91" width="2.5" height="16" rx="1.25" fill="white"/>
              </svg>
              <p className="db-pin-notes-empty-text">Add your first notes</p>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Click to add a note</p>
            </div>
          )}
        </div>

      </div>

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

      <AddTaskModal
        open={addTaskOpen}
        onCancel={() => setAddTaskOpen(false)}
        onSuccess={() => { setAddTaskOpen(false); myTasksFn(); fetchAssignedToMeTasks(); setTimeout(() => fetchActivityLogs(), 1000); }}
        standalone={true}
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
          <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>Loading...</div>
        ) : allNotes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>No notes found</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {allNotes.map((note, i) => (
              <div
                key={note._id || i}
                onClick={() => { setAllNotesOpen(false); note.project_id && history.push(`/${companySlug}/project/app/${note.project_id}?tab=Notes`); }}
                style={{
                  padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                  cursor: "pointer", background: "#f8fafc", transition: "background 0.15s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#f8fafc"}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", marginBottom: 4 }}>
                  📌 {note.title || "Untitled Note"}
                </div>
                {note.description && (
                  <div style={{ fontSize: 12, color: "#64748b" }}>{note.description.slice(0, 80)}{note.description.length > 80 ? "..." : ""}</div>
                )}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
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
                    style={{ padding: "6px 12px", cursor: "pointer", color: "#0b3a5b", fontWeight: 500 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const val = notebookSearch;
                      createNotebook(val);
                    }}
                  >
                    + Create notebook "{notebookSearch.trim()}"
                  </div>
                ) : (creatingNotebook ? "Creating..." : "No notebooks found")
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
