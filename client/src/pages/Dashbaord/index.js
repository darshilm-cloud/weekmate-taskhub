import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import "./dashboard.css";
import { Calendar, Form } from "antd";
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
} from "@ant-design/icons";

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

  const chartOptions = useMemo(() => ({
    chart: { type: "line", toolbar: { show: false }, zoom: { enabled: false } },
    colors: ["#52c41a", "#ff4d4f"],
    stroke: { curve: "smooth", width: 2 },
    xaxis: { categories: labels },
    yaxis: { min: 0 },
    legend: { show: false },
    grid: { borderColor: "#f0f2f5" },
    tooltip: { enabled: true },
    dataLabels: { enabled: false },
  }), [labels]);

  const chartSeries = useMemo(() => [
    { name: "Completed", data: completedCounts },
    { name: "Incomplete", data: incompleteCounts },
  ], [completedCounts, incompleteCounts]);

  // Memoized priority + today summary
  const { priorityLow, priorityMedium, priorityHigh, newToday, closedToday, teamIncomplete } = useMemo(() => ({
    priorityLow: myTask.filter((t) => t.priority?.toLowerCase() === "low").length,
    priorityMedium: myTask.filter((t) => t.priority?.toLowerCase() === "medium").length,
    priorityHigh: myTask.filter((t) => t.priority?.toLowerCase() === "high").length,
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
  }), [myTask, today]);

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
      const reqBody = {
        pageNo: 1, limit: 5, search: searchText || "",
        sortBy: "desc", filterBy: "all", isSearch: true,
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
    try {
      dispatch(showAuthLoader());
      let reqBody = {};
      if (category?.length > 0) reqBody = { ...reqBody, category };
      if (projStatus?.length > 0) reqBody = { ...reqBody, project_status: projStatus };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod, api_url: Service.myProjects, body: reqBody,
      });
      if (response?.data?.data) { dispatch(hideAuthLoader()); setMyProj(response.data.data); }
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
    } catch (error) {
      console.error("myTask error", error);
      setMyTask([]);
      dispatch(hideAuthLoader());
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
    setIsInitialLoad(false);
  }, []);

  return (
    <div className="new-dashboard-wrapper">

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
              height={220}
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
            <Calendar fullscreen={false} />
          </div>
        </div>

        {/* Right column */}
        <div className="dashboard-col-right">

          {/* Today's Summary */}
          <div className="right-panel-card">
            <h4>Today's Summary</h4>
            <div className="today-summary-items">
              <div className="today-summary-item new-task">
                <span className="summary-label">New task</span>
                <span className="summary-count">{newToday}</span>
              </div>
              <div className="today-summary-item closed-task">
                <span className="summary-label">Closed task</span>
                <span className="summary-count">{closedToday}</span>
              </div>
            </div>
          </div>

          {/* Priority Task Summary */}
          <div className="right-panel-card">
            <h4>Priority Task Summary</h4>
            <div className="priority-items">
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
          <div className="right-panel-card">
            <h4>Team Incomplete Task</h4>
            {teamIncomplete.length > 0 ? (
              <div className="team-incomplete-list">
                {teamIncomplete.map((item, idx) => (
                  <Link
                    key={item?._id || idx}
                    to={`/${companySlug}/project/app/${item?.project?._id}?tab=Tasks&listID=${item?.mainTask?._id}&taskID=${item?._id}`}
                    className="team-incomplete-item"
                  >
                    {item?.title?.charAt(0).toUpperCase() + item?.title?.slice(1)}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="team-incomplete-empty">No incomplete tasks</div>
            )}
          </div>

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
    </div>
  );
};

export default memo(Dashboard);
