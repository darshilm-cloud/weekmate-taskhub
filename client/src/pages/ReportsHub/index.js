import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  DownOutlined,
  FilterOutlined,
  FundProjectionScreenOutlined,
  HistoryOutlined,
  LineChartOutlined,
  ProjectOutlined,
  SaveOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Collapse,
  DatePicker,
  Dropdown,
  Empty,
  Input,
  message,
  Pagination,
  Progress,
  Table,
  Tabs,
  Tag,
} from "antd";
import dayjs from "dayjs";
import moment from "moment";
import ReactApexChart from "react-apexcharts";
import { Link, useHistory, useParams } from "react-router-dom";
import Service from "../../service";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import NoGraphFound from "../../components/common/NoGraphFound";
import {
  ReportsDetailSkeleton,
  TimesheetChartsSkeleton,
  TableSk,
  SkeletonBlock,
} from "../../components/common/SkeletonLoader";
import "./reports-hub.css";

const DONE_STATUSES = ["done", "closed"];

const getProgressColor = (value) => {
  if (value === 100) return "#22c55e"; // Success Green
  if (value >= 70) return "#3b82f6"; // Blue
  if (value >= 40) return "#f6b940"; // Yellow/Orange
  return "#ef4444"; // Red for low progress
};

const reportCards = [
  { key: "user-report", title: "User Wise Report", icon: <UserOutlined />, colorClass: "blue" },
  { key: "project-report", title: "Project Wise Report", icon: <ProjectOutlined />, colorClass: "coral" },
  { key: "status-report", title: "Status Wise Report", icon: <FundProjectionScreenOutlined />, colorClass: "yellow" },
  { key: "activity-report", title: "User Activity Report", icon: <LineChartOutlined />, colorClass: "lavender" },
  { key: "user-performance-report", title: "User Wise Performance", icon: <TeamOutlined />, colorClass: "mint" },
  { key: "daily-report", title: "Daily Report", icon: <CalendarOutlined />, colorClass: "blue" },
  { key: "project-running", title: "Project Running", icon: <LineChartOutlined />, colorClass: "purple" },
  { key: "timesheet", title: "Timesheet", icon: <ClockCircleOutlined />, colorClass: "orange" },
];

const pageMeta = {
  "user-report": { title: "User Report", emptyTitle: "No Report Found" },
  "status-report": { title: "Status Report", emptyTitle: "No Report Found" },
  "activity-report": { title: "Activity Report", emptyTitle: "No Report Found" },
  "user-performance-report": { title: "User Performance Report", emptyTitle: "No Report Found" },
  "project-report": { title: "Project Wise Report", emptyTitle: "No Report Found" },
  "daily-report": { title: "Daily Report" },
  "project-running": { title: "Project Running Report", emptyTitle: "No Report Found" },
  "timesheet": { title: "Timesheet Report", emptyTitle: "No Report Found" },
};

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
];

const projectStatusOptions = [
  { value: "all", label: "All Status" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "On Hold", label: "On Hold" },
  { value: "Archived", label: "Archived" },
  { value: "Closed", label: "Closed" },
];

const activityOptions = [
  { value: "", label: "All Activity" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
];

const dailyTabs = [
  { key: "pending", label: "Today’s Pending Tasks Report" },
  { key: "completed", label: "Today’s Completed Tasks Report" },
  { key: "morning", label: "Morning Reports" },
  { key: "evening", label: "Evening Reports" },
];

const defaultFilters = {
  projectIds: [],
  userId: "all",
  status: "all",
  startDate: null,
  endDate: null,
  activity: "",
  search: "",
};

function ReportsHub() {
  const { reportKey } = useParams();
  const history = useHistory();
  const companySlug = localStorage.getItem("companyDomain");
  const [filters, setFilters] = useState(defaultFilters);
  const [dailyTab, setDailyTab] = useState("pending");
  const [loading, setLoading] = useState(Boolean(reportKey));
  const [optionsLoading, setOptionsLoading] = useState(Boolean(reportKey));
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [focusedProjectIds, setFocusedProjectIds] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [reportData, setReportData] = useState({
    project: {
      summary: {
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        incompleteTasks: 0,
      },
      rows: [],
    },
    user: [],
    status: [],
    activity: [],
    performance: {
      summary: { totalHours: 0, totalEntries: 0 },
      rows: [],
    },
    daily: {
      pending: [],
      completed: [],
      morning: [],
      evening: [],
    },
    "project-running": {
      data: [],
      managers: [],
      types: [],
      technologies: [],
      metadata: {},
    },
    timesheet: {
      data: [],
      summary: {},
      metadata: {},
    },
  });
  const previousFiltersRef = useRef(defaultFilters);
  const fetchingRef = useRef(false);
  // Cache for the computed project progress map — avoids re-fetching 5000 tasks on search
  // Stores: { projectProgressMap, totalTasks, completedTasks, absoluteTotal }
  const taskProgressCacheRef = useRef(null);
  const reportDataRef = useRef(reportData);
  reportDataRef.current = reportData;

  const currentPage = pageMeta[reportKey];

  const userMap = useMemo(
    () =>
      users.reduce((acc, user) => {
        acc[user.value] = user;
        return acc;
      }, {}),
    [users]
  );

  const fetchAllProjects = useCallback(async ({ includeClosed = true, search = "", signal } = {}) => {
    const pageSize = 200;
    const allProjects = [];

    try {
      // Step 1: Fetch the first page to get metadata
      const firstResponse = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectList,
        params: `page=1&limit=${pageSize}&includeClosed=${includeClosed}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
        options: { signal }
      });

      if (signal?.aborted) return [];

      const firstRows = Array.isArray(firstResponse?.data?.data) ? firstResponse.data.data : [];
      const meta = firstResponse?.data?.meta || {};
      allProjects.push(...firstRows);

      // Notify caller immediately of first page if needed
      setProjects(allProjects.map(p => ({ value: p._id, label: p.title })));

      if (!meta.totalPages || meta.totalPages <= 1) {
        return allProjects;
      }

      // Step 2: Parallel fetch remaining pages in chunks of 5
      const totalPages = meta.totalPages;
      const CHUNK_SIZE = 5;
      const pages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

      for (let i = 0; i < pages.length; i += CHUNK_SIZE) {
        if (signal?.aborted) break;

        const chunk = pages.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(chunk.map(page =>
          Service.makeAPICall({
            methodName: Service.getMethod,
            api_url: Service.getProjectList,
            params: `page=${page}&limit=${pageSize}&includeClosed=${includeClosed}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
            options: { signal }
          })
        ));

        results.forEach(result => {
          if (result.status === "fulfilled") {
            const rows = Array.isArray(result.value?.data?.data) ? result.value.data.data : [];
            allProjects.push(...rows);
          }
        });

        // Update projects incrementally
        setProjects(allProjects.map(p => ({ value: p._id, label: p.title })));
      }
    } catch (error) {
      console.error("Error in parallel fetchAllProjects:", error);
    }

    return allProjects;
  }, []);

  const fetchAllProjectReportRows = useCallback(async () => {
    const pageSize = 200;
    let pageNo = 1;
    let hasMore = true;
    const allRows = [];

    while (hasMore) {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectRunningReportsDetails,
        body: {
          technologies: [],
          types: [],
          managers: [],
          pageNo,
          limit: pageSize,
          sort: "title",
          sortBy: "asc",
          isExport: false,
        },
      });

      const rows = Array.isArray(response?.data?.data?.data) ? response.data.data.data : [];
      const meta = response?.data?.meta || {};

      allRows.push(...rows);

      if (meta?.totalPages) {
        hasMore = pageNo < meta.totalPages;
      } else {
        hasMore = rows.length === pageSize;
      }

      pageNo += 1;
    }

    return allRows;
  }, []);

  const loadDropdowns = useCallback(async (signal) => {
    if (fetchingRef.current) {
      console.log('Dropdown loading already in progress, skipping...');
      return;
    }
    try {
      console.log('Starting parallel dropdown loading for report:', reportKey);
      fetchingRef.current = true;
      setOptionsLoading(true);

      // Fetch employees first as they are vital and usually fast
      const employeeResponse = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: "/master/get/employees",
        params: "limit=200",
        options: { signal }
      });

      if (signal?.aborted) return;

      const employeeList = Array.isArray(employeeResponse?.data?.data)
        ? employeeResponse.data.data
        : [];

      setUsers(
        [
          { value: "all", label: "All Users", firstName: "All" },
          ...employeeList.map((employee) => ({
            value: employee._id,
            label: employee.full_name || employee.first_name || "Unknown",
            firstName: employee.first_name || "",
          })),
        ]
      );

      // Now start the massive project fetch in background
      await fetchAllProjects({ includeClosed: true, signal });

    } catch (error) {
      console.error("loadDropdowns failed:", error);
    } finally {
      fetchingRef.current = false;
      setOptionsLoading(false);
    }
  }, [fetchAllProjects, reportKey]);

  const loadReportData = useCallback(async ({ silent = false, signal } = {}) => {
    if (!reportKey) {
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }

      const reportDateRange = getReportDateRange(filters);
      const selectedDate = reportDateRange.selectedDate;
      const dailyStartDate = reportDateRange.startMoment;
      const dailyEndDate = reportDateRange.endMoment;
      if (signal?.aborted) return;

      const startDate = reportDateRange.startMoment || moment().startOf("month");
      const endDate = reportDateRange.endMoment || moment().endOf("day");
      const selectedProjectIds = Array.isArray(filters.projectIds)
        ? filters.projectIds.filter(Boolean)
        : [];
      const selectedUser =
        filters.userId && filters.userId !== "all" ? userMap[filters.userId] : null;

      const commonTaskPayload = buildTaskPayload({
        viewAll: true,
        status: filters.status || "all",
        userId: filters.userId && filters.userId !== "all" ? filters.userId : undefined,
        startDate: reportDateRange.startIso,
        endDate: reportDateRange.endIso,
        projectIds: selectedProjectIds,
        search: filters.search?.trim() || null,
      });

      if (reportKey === "project-report") {
        const [projectsResponse, projectListResponse] = await Promise.all([
          Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: Service.getProjectRunningReportsDetails,
            body: {
              technologies: [],
              types: [],
              managers: [],
              search: filters.search?.trim() || "",
              pageNo: 1,
              limit: 10000,
              sort: "title",
              sortBy: "asc",
              isExport: false,
            },
          }),
          Service.makeAPICall({
            methodName: Service.getMethod,
            api_url: Service.getProjectList,
            params: `page=1&limit=10000&includeClosed=true${filters.search?.trim() ? `&search=${encodeURIComponent(filters.search.trim())}` : ""}`,
          }),
        ]);

        const reportProjects = Array.isArray(projectsResponse?.data?.data?.data) ? projectsResponse.data.data.data : [];
        const masterProjects = Array.isArray(projectListResponse?.data?.data) ? projectListResponse.data.data : [];
        const allProjectRows = mergeProjectRows(reportProjects, masterProjects);

        // Robust parsing for total counts from various API response shapes
        // Comprehensive parsing for total counts from all possible backend response shapes
        const getMetaTotal = (resp) => {
          if (!resp || !resp.data) return 0;

          // Most common: resp.data.metadata.total (Success Response)
          if (resp.data.metadata && typeof resp.data.metadata.total !== 'undefined' && resp.data.metadata.total !== null) {
            return Number(resp.data.metadata.total);
          }
          if (resp.data.metadata && typeof resp.data.metadata.totalCount !== 'undefined') {
            return Number(resp.data.metadata.totalCount);
          }

          // Pattern 2: resp.data.data.pagination.totalCount
          if (resp.data.data?.pagination?.totalCount) return Number(resp.data.data.pagination.totalCount);
          if (resp.data.data?.pagination?.total) return Number(resp.data.data.pagination.total);

          // Pattern 3: resp.data.meta.total
          if (resp.data.meta?.total) return Number(resp.data.meta.total);
          if (resp.data.meta?.totalCount) return Number(resp.data.meta.totalCount);

          // Pattern 4: Direct total on data or root
          if (resp.data.totalCount) return Number(resp.data.totalCount);
          if (resp.data.total) return Number(resp.data.total);
          if (resp.data.data?.totalCount) return Number(resp.data.data.totalCount);
          if (resp.data.data?.total) return Number(resp.data.data.total);

          return 0;
        };

        const absoluteTotalProjects = getMetaTotal(projectListResponse) || allProjectRows.length;

        console.log('📊 Project counts:', {
          absoluteTotalProjects,
          projectListResponseMeta: projectListResponse?.data?.meta || projectListResponse?.data?.metadata
        });

        // Determine effective project IDs for metrics (only from top-level dropdown filter)
        // focusedProjectIds (row click) is handled separately by updateProjectMetrics
        const effectiveProjectIds = selectedProjectIds.length > 0
          ? selectedProjectIds
          : allProjectRows.map((project) => getProjectRecordId(project)).filter(Boolean);

        let tasksTotalResponse, tasksCompletedResponse;
        let tasksTotalResponseAll, tasksCompletedResponseAll;

        console.log('📋 Full fetch: fetching task counts from task-list API...');


        // Fetch ALL tasks (unfiltered) for project list progress bars
        [tasksTotalResponseAll, tasksCompletedResponseAll] = await Promise.all([
          Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: Service.taskList,
            body: {
              view_all: true,
              pageNo: 1,
              limit: 5000,
              status: "all",
              start_date: reportDateRange.startIso || undefined,
              end_date: reportDateRange.endIso || undefined
            },
          }),
          Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: Service.taskList,
            body: {
              view_all: true,
              pageNo: 1,
              limit: 5000,
              status: "completed",
              start_date: reportDateRange.startIso || undefined,
              end_date: reportDateRange.endIso || undefined
            },
          }),
        ]);

        // If search or projects are selected, fetch filtered data for top metrics
        if (effectiveProjectIds.length > 0) {
          [tasksTotalResponse, tasksCompletedResponse] = await Promise.all([
            Service.makeAPICall({
              methodName: Service.postMethod,
              api_url: Service.taskList,
              body: {
                view_all: true,
                pageNo: 1,
                limit: 5000,
                status: "all",
                project_id: effectiveProjectIds,
                start_date: reportDateRange.startIso || undefined,
                end_date: reportDateRange.endIso || undefined
              },
            }),
            Service.makeAPICall({
              methodName: Service.postMethod,
              api_url: Service.taskList,
              body: {
                view_all: true,
                pageNo: 1,
                limit: 5000,
                status: "completed",
                project_id: effectiveProjectIds,
                start_date: reportDateRange.startIso || undefined,
                end_date: reportDateRange.endIso || undefined
              },
            }),
          ]);
        } else {
          tasksTotalResponse = tasksTotalResponseAll;
          tasksCompletedResponse = tasksCompletedResponseAll;
        }

        console.log('📋 Task total count response:', tasksTotalResponse?.data);
        console.log('📋 Task completed count response:', tasksCompletedResponse?.data);

        let totalTasks = 0;
        let completedTasks = 0;

        totalTasks = getMetaTotal(tasksTotalResponse);
        completedTasks = getMetaTotal(tasksCompletedResponse);

        console.log('📊 Extracted totals:', { totalTasks, completedTasks });

        // Fallback: if metadata total is 0 but we actually got tasks in the data array
        if (totalTasks === 0 && Array.isArray(tasksTotalResponse?.data?.data) && tasksTotalResponse.data.data.length > 0) {
          console.log('⚠️  Fallback: Using array length as total');
          totalTasks = tasksTotalResponse.data.data.length;
          completedTasks = Array.isArray(tasksCompletedResponse?.data?.data) ? tasksCompletedResponse.data.data.length : 0;
          console.log('⚠️  Fallback result:', { totalTasks, completedTasks });
        }

        // Calculate per-project progress using ALL tasks (unfiltered for project list)
        const projectProgressMap = {};

        // Count total tasks per project (from ALL tasks unfiltered)
        if (Array.isArray(tasksTotalResponseAll?.data?.data)) {
          tasksTotalResponseAll.data.data.forEach((task) => {
            // Try multiple project ID fields
            const projId = task.project_id?._id ||
              task.project_id ||
              task.projectId ||
              task.project?._id ||
              task.project ||
              "unknown";

            if (!projectProgressMap[projId]) {
              projectProgressMap[projId] = { total: 0, completed: 0 };
            }
            projectProgressMap[projId].total += 1;
          });
        }

        // Count completed tasks per project (from ALL tasks unfiltered)
        if (Array.isArray(tasksCompletedResponseAll?.data?.data)) {
          tasksCompletedResponseAll.data.data.forEach((task) => {
            const projId = task.project_id?._id ||
              task.project_id ||
              task.projectId ||
              task.project?._id ||
              task.project ||
              "unknown";

            if (projectProgressMap[projId]) {
              projectProgressMap[projId].completed += 1;
            }
          });
        }

        // Store computed map in cache for future search-only fast-path
        taskProgressCacheRef.current = {
          projectProgressMap,
          totalTasks,
          completedTasks,
          absoluteTotal: absoluteTotalProjects,
          projectRows: allProjectRows,
        };

        const rows = mapProjectReportRows(allProjectRows, projectProgressMap);

        // Aggregated metrics for display
        // totalTasks/completedTasks are already filtered by effectiveProjectIds from the API
        const summaryProjects =
          selectedProjectIds.length > 0
            ? allProjectRows.filter((project) => selectedProjectIds.includes(getProjectRecordId(project)))
            : allProjectRows;
        const isSearchActive = Boolean(filters.search?.trim());
        const displaySummary = isSearchActive || selectedProjectIds.length > 0
          ? summarizeProjectReportProjects(summaryProjects, projectProgressMap)
          : {
            totalProjects: absoluteTotalProjects,
            totalTasks,
            completedTasks,
            incompleteTasks: Math.max(totalTasks - completedTasks, 0),
          };

        setTotal(rows.length);
        setReportData((prev) => ({
          ...prev,
          project: {
            summary: displaySummary,
            rows,
          },
        }));
        return;
      }

      if (reportKey === "activity-report") {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getActivityLogList,
          body: {
            page: pageNo,
            limit: pageSize,
            operationName: filters.activity || "",
            fromDate: filters.date && Array.isArray(filters.date) ? dailyStartDate.toISOString() : (filters.startDate ? moment(filters.startDate).toISOString() : undefined),
            toDate: filters.date && Array.isArray(filters.date) ? dailyEndDate.toISOString() : (filters.endDate ? moment(filters.endDate).toISOString() : undefined),
            ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
            sortBy: "createdAt",
            sortOrder: "desc",
          },
        });

        const logs = Array.isArray(response?.data?.data?.activityLogs)
          ? response.data.data.activityLogs
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : [];

        const paginationInfo = response?.data?.data?.pagination || response?.data?.meta || {};
        setTotal(paginationInfo.totalCount || paginationInfo.total || logs.length);

        const rows = logs
          .filter((log) => {
            if (!selectedUser) return true;
            const actor = log?.createdBy?.full_name || log?.email || "";
            return actor.toLowerCase().includes(selectedUser.label.toLowerCase());
          })
          .map((log) => ({
            key: log._id,
            user: log?.createdBy?.full_name || log?.email || "-",
            operation: log?.operationName || "-",
            module: formatText(log?.moduleName),
            createdAt: formatDateTime(log?.createdAt),
          }));

        setReportData((prev) => ({ ...prev, activity: rows }));
        return;
      }

      if (reportKey === "user-performance-report") {
        const performanceRequestBody = {
          technologies: filters.technologies || [],
          types: filters.types || [],
          managers: filters.managers || [],
          projects: selectedProjectIds.length > 0 ? selectedProjectIds : (filters.projects || []),
          departments: filters.departments || [],
          users:
            filters.userId && filters.userId !== "all" ? [filters.userId] : [],
          search: filters.search?.trim() || "",
          pageNo: pageNo,
          limit: pageSize,
          sort: "logged_date",
          sortBy: "desc",
          isExport: false,
        };

        if (filters.date && Array.isArray(filters.date)) {
          performanceRequestBody.startDate = startDate.format("DD-MM-YYYY");
          performanceRequestBody.endDate = endDate.format("DD-MM-YYYY");
        } else if (filters.startDate || filters.endDate) {
          if (filters.startDate) performanceRequestBody.startDate = moment(filters.startDate, ["DD-MM-YYYY", "YYYY-MM-DD", moment.ISO_8601], true).format("DD-MM-YYYY");
          if (filters.endDate) performanceRequestBody.endDate = moment(filters.endDate, ["DD-MM-YYYY", "YYYY-MM-DD", moment.ISO_8601], true).format("DD-MM-YYYY");
        } else {
          performanceRequestBody.startDate = moment().startOf("month").format("DD-MM-YYYY");
          performanceRequestBody.endDate = moment().format("DD-MM-YYYY");
        }

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getTimeSheetReportsDetails,
          body: performanceRequestBody,
        });

        const rawTimesheetData = response?.data?.data;
        const entries = Array.isArray(rawTimesheetData?.data)
          ? rawTimesheetData.data
          : Array.isArray(rawTimesheetData)
            ? rawTimesheetData
            : [];

        const meta = response?.data?.metadata || response?.data?.meta || {};
        setTotal(meta.total || entries.length);
        const aggregatedUsers = Array.isArray(rawTimesheetData?.user) ? rawTimesheetData.user : [];
        const userStats = entries.reduce((acc, entry) => {
          const userName =
            entry.user ||
            entry.employee_name ||
            entry.full_name ||
            entry.employee?.full_name ||
            entry.employee?.name ||
            "Unknown";
          const key =
            entry.employee_id ||
            entry.user_id ||
            entry.employee?._id ||
            userName ||
            "unknown";
          const loggedTime = String(entry.logged_time || "");
          const [loggedHourPart = "0", loggedMinutePart = "0"] = loggedTime.split(":");
          const hours =
            Number(entry.logged_hours || loggedHourPart || 0) +
            Number(entry.logged_minutes || loggedMinutePart || 0) / 60;
          if (!acc[key]) {
            acc[key] = {
              key,
              user: userName,
              loggedHours: 0,
              entries: 0,
              projects: new Set(),
            };
          }
          acc[key].loggedHours += hours;
          acc[key].entries += 1;
          const projectName =
            entry.project ||
            entry.project_name ||
            entry.projectTitle ||
            entry.project_id?.title ||
            "";
          if (projectName) {
            acc[key].projects.add(projectName);
          }
          return acc;
        }, {});

        let rows = Object.values(userStats).map((row) => ({
          key: row.key,
          user: row.user,
          loggedHours: row.loggedHours.toFixed(2),
          entries: row.entries,
          projects: row.projects.size,
        }));

        if (rows.length === 0 && aggregatedUsers.length > 0) {
          rows = aggregatedUsers.map((row, index) => ({
            key: row._id || row.userId || row.user || `user-${index}`,
            user: row.user || row.name || row.full_name || "Unknown",
            loggedHours: String(
              row.totalLoggedHours ||
              row.total_hours ||
              row.loggedHours ||
              row.logged_hours ||
              "0"
            ),
            entries: Number(
              row.entries ||
              row.totalEntries ||
              row.entryCount ||
              row.count ||
              0
            ),
            projects: Number(
              row.projects ||
              row.totalProjects ||
              row.projectCount ||
              0
            ),
          }));
        }

        setReportData((prev) => ({
          ...prev,
          performance: {
            summary: {
              totalHours: Number(rawTimesheetData?.totalHours || 0),
              totalEntries: entries.length,
            },
            rows,
          },
        }));
        return;
      }

      if (reportKey === "daily-report") {
        const dailyTasksResponse = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.myTasks,
          body: buildTaskPayload({ status: "all" }),
        });

        let dailyTaskRows = Array.isArray(dailyTasksResponse?.data?.data)
          ? dailyTasksResponse.data.data
          : [];

        if (dailyTaskRows.length === 0) {
          try {
            const fallbackTasksResponse = await Service.makeAPICall({
              methodName: Service.postMethod,
              api_url: Service.taskList,
              body: buildTaskPayload({ viewAll: true, status: "all" }),
            });

            dailyTaskRows = Array.isArray(fallbackTasksResponse?.data?.data)
              ? fallbackTasksResponse.data.data
              : [];
          } catch (error) {
            console.error("Daily report fallback task fetch failed", error);
          }
        }

        const dailyData = buildDailyData(dailyTaskRows, moment(), userMap, filters.search);
        setTotal(dailyData[dailyTab]?.length || 0);
        setReportData((prev) => ({
          ...prev,
          daily: dailyData,
        }));
        return;
      }

      if (reportKey === "user-report") {
        const [tasksResponse, myTasksResponse] = await Promise.allSettled([
          Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: Service.taskList,
            body: commonTaskPayload,
          }),
          Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: Service.myTasks,
            body: buildTaskPayload({
              viewAll: true,
              status: filters.status || "all",
              userId: filters.userId && filters.userId !== "all" ? filters.userId : undefined,
              projectIds: Array.isArray(filters.projectIds) && filters.projectIds.length > 0 ? filters.projectIds : undefined,
              startDate: reportDateRange.startIso,
              endDate: reportDateRange.endIso,
              search: filters.search?.trim() || null,
            }),
          }),
        ]);

        const taskRows = extractTaskRows(tasksResponse);
        const myTaskRows = extractTaskRows(myTasksResponse);
        const mergedTaskRows = mergeUniqueTasks([...taskRows, ...myTaskRows]);
        const rows = buildUserRows(mergedTaskRows, filters, selectedDate, userMap, users);
        setTotal(rows.length);
        setReportData((prev) => ({ ...prev, user: rows }));
        return;
      }

      if (reportKey === "project-running") {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectRunningReportsDetails,
          body: {
            technologies: [],
            types: [],
            managers: [],
            search: filters.search?.trim() || "",
            pageNo: pageNo,
            limit: pageSize,
            sort: "title",
            sortBy: "asc",
            isExport: false,
          },
        });

        if (response?.data && response?.data?.data) {
          const meta = response.data.metadata || response.data.meta || {};
          setTotal(meta.total || 0);
          const projectRunningData = {
            data: Array.isArray(response.data.data.data)
              ? response.data.data.data
              : [],
            managers: Array.isArray(response.data.data.managers)
              ? response.data.data.managers
              : [],
            types: Array.isArray(response.data.data.types)
              ? response.data.data.types
              : [],
            technologies: Array.isArray(response.data.data.technologies)
              ? response.data.data.technologies
              : [],
            metadata: meta,
          };
          setReportData((prev) => ({ ...prev, 'project-running': projectRunningData }));
        } else {
          setReportData((prev) => ({ ...prev, 'project-running': { data: [], managers: [], types: [], technologies: [], metadata: {} } }));
        }
        return;
      }

      if (reportKey === "status-report") {
        const statusPayload = buildTaskPayload({
          viewAll: true,
          status: filters.status || "all",
          userId: filters.userId && filters.userId !== "all" ? filters.userId : undefined,
          startDate: reportDateRange.startIso,
          endDate: reportDateRange.endIso,
          projectIds: selectedProjectIds,
          // search intentionally excluded — status-report groups tasks by status name,
          // so the search filters the resulting status rows, not task titles
        });

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.taskList,
          body: statusPayload,
        });

        const taskRows = Array.isArray(response?.data?.data) ? response.data.data : [];
        let rows = buildStatusRows(taskRows, filters, selectedDate, userMap);

        // Filter status rows by status name (client-side, since statuses are grouped results)
        const statusSearch = filters.search?.trim().toLowerCase();
        if (statusSearch) {
          rows = rows.filter((r) => r.status.toLowerCase().includes(statusSearch));
        }

        setTotal(rows.length);
        setReportData((prev) => ({ ...prev, status: rows }));
        return;
      }

      if (reportKey === "timesheet") {
        const timesheetStartDate = filters.date && Array.isArray(filters.date)
          ? moment(filters.date[0], ["DD-MM-YYYY", "YYYY-MM-DD", moment.ISO_8601], true).startOf("day").format("DD-MM-YYYY")
          : moment().subtract(12, "months").startOf("month").format("DD-MM-YYYY");
        const timesheetEndDate = filters.date && Array.isArray(filters.date)
          ? moment(filters.date[1], ["DD-MM-YYYY", "YYYY-MM-DD", moment.ISO_8601], true).endOf("day").format("DD-MM-YYYY")
          : moment().format("DD-MM-YYYY");

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getTimeSheetReportsDetails,
          body: {
            startDate: timesheetStartDate,
            endDate: timesheetEndDate,
            technologies: [],
            types: [],
            managers: [],
            projects: selectedProjectIds,
            departments: [],
            users: filters.userId && filters.userId !== "all" ? [filters.userId] : [],
            search: filters.search?.trim() || "",
            pageNo: pageNo,
            limit: pageSize,
            sort: "logged_date",
            sortBy: "desc",
            isExport: false,
          },
        });

        if (response?.data && response?.data?.data) {
          const meta = response.data.metadata || response.data.meta || {};
          setTotal(meta.total || 0);
          const timesheetData = {
            data: Array.isArray(response.data.data.data)
              ? response.data.data.data
              : Array.isArray(response.data.data)
                ? response.data.data
                : [],
            summary: response.data.data.summary || {},
            metadata: response.data.metadata || {},
            totalHours: response.data.data.totalHours || "0",
            manager: response.data.data.manager || [],
            type: response.data.data.type || [],
            user: response.data.data.user || [],
          };
          setReportData((prev) => ({ ...prev, 'timesheet': timesheetData }));
        } else {
          setReportData((prev) => ({ ...prev, 'timesheet': { data: [], totalHours: "0", manager: [], type: [], user: [] } }));
        }
        return;
      }

    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [filters, reportKey, userMap, users, pageNo, pageSize, dailyTab]);

  useEffect(() => {
    // Only fetch dropdown options if we are in a specific report page
    if (reportKey) {
      const controller = new AbortController();
      loadDropdowns(controller.signal);
      return () => controller.abort();
    }
  }, [loadDropdowns, reportKey]);

  // ─── Lightweight metric update on project row click ─────────────────────
  // When a project row is clicked, only update the summary cards.
  // Does NOT reload the full page — only fetches task counts for the selected project.
  const updateProjectMetrics = useCallback(async (projectIds) => {
    if (!reportKey || reportKey !== "project-report") return;
    const reportDateRange = getReportDateRange(filters);

    // No project selected — restore full totals from cache
    if (!projectIds || projectIds.length === 0) {
      if (taskProgressCacheRef.current) {
        const { totalTasks, completedTasks } = taskProgressCacheRef.current;
        setReportData((prev) => ({
          ...prev,
          project: {
            ...prev.project,
            summary: {
              ...prev.project.summary,
              totalTasks,
              completedTasks,
              incompleteTasks: Math.max(totalTasks - completedTasks, 0),
            },
          },
        }));
      }
      return;
    }

    try {
      setMetricsLoading(true);
      // Fetch task counts for only the selected project with limit:1 (use metadata total)
      const [totalResp, completedResp] = await Promise.all([
        Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.taskList,
          body: {
            view_all: true,
            pageNo: 1,
            limit: 1,
            status: "all",
            project_id: projectIds,
            start_date: reportDateRange.startIso || undefined,
            end_date: reportDateRange.endIso || undefined,
          },
        }),
        Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.taskList,
          body: {
            view_all: true,
            pageNo: 1,
            limit: 1,
            status: "completed",
            project_id: projectIds,
            start_date: reportDateRange.startIso || undefined,
            end_date: reportDateRange.endIso || undefined,
          },
        }),
      ]);

      const getTotal = (resp) => {
        if (!resp?.data) return 0;
        if (resp.data.metadata?.total != null) return Number(resp.data.metadata.total);
        if (resp.data.metadata?.totalCount != null) return Number(resp.data.metadata.totalCount);
        if (resp.data.data?.pagination?.totalCount) return Number(resp.data.data.pagination.totalCount);
        if (resp.data.meta?.total) return Number(resp.data.meta.total);
        if (resp.data.totalCount) return Number(resp.data.totalCount);
        if (resp.data.total) return Number(resp.data.total);
        return 0;
      };

      const newTotal = getTotal(totalResp);
      const newCompleted = getTotal(completedResp);

      setReportData((prev) => ({
        ...prev,
        project: {
          ...prev.project,
          summary: {
            ...prev.project.summary,
            totalTasks: newTotal,
            completedTasks: newCompleted,
            incompleteTasks: Math.max(newTotal - newCompleted, 0),
          },
        },
      }));
    } catch (err) {
      console.error("updateProjectMetrics failed:", err);
    } finally {
      setMetricsLoading(false);
    }
  }, [reportKey, filters]);

  // Trigger metric update on project row click (does NOT reload full page)
  useEffect(() => {
    updateProjectMetrics(focusedProjectIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedProjectIds]);
  // ─────────────────────────────────────────────────────────────────────────


  useEffect(() => {
    if (reportKey) {
      setFilters(defaultFilters);
      setFocusedProjectIds([]);
      setDailyTab("pending");
      setPageNo(1);
      previousFiltersRef.current = defaultFilters;
      taskProgressCacheRef.current = null; // Invalidate cache on report switch
      setLoading(true); // Ensure loading is true when switching reports
    }
  }, [reportKey]);

  useEffect(() => {
    // Reset focus when filters change (from the top dropdown)
    setFocusedProjectIds([]);
  }, [filters]);

  useEffect(() => {
    if (reportKey) {
      const controller = new AbortController();
      const previousFilters = previousFiltersRef.current || defaultFilters;
      const previousWithoutSearch = { ...previousFilters, search: "" };
      const currentWithoutSearch = { ...filters, search: "" };

      const filtersChanged = JSON.stringify(previousFilters) !== JSON.stringify(filters);
      const isSearchOnly =
        previousFilters.search !== filters.search &&
        JSON.stringify(previousWithoutSearch) === JSON.stringify(currentWithoutSearch);

      if (filtersChanged && pageNo !== 1) {
        setPageNo(1);
        return () => controller.abort();
      }

      // Detect report switch to avoid silent load on initial switch
      const isReportSwitch = previousFiltersRef.current === defaultFilters && filters === defaultFilters;

      // If pageNo or pageSize changed but NOT filters, load silently
      const isPageChange = previousFiltersRef.current === filters;

      loadReportData({
        // Search-only runs silently (no skeleton flash — data updates in place)
        silent: isSearchOnly || (isPageChange && !isReportSwitch),
        signal: controller.signal
      });
      previousFiltersRef.current = filters;

      return () => controller.abort();
    }
  }, [filters, reportKey, pageNo, pageSize, loadReportData]);

  const handleDownload = (key) => {
    let items = [];
    let headers = [];
    let filename = `report_${key}_${moment().format("DD-MM-YYYY")}.csv`;

    if (key === "daily-report") {
      // Get the current active tab data, default to pending if not available
      const activeDailyTab = dailyTab || "pending";
      items = reportData.daily?.[activeDailyTab] || [];
      headers = ["Member Name", "Today", "Overdue", "Upcoming", "Total"];
      const rows = items.map((item) => [
        item.name || "",  // Fixed: use item.name instead of item.member
        item.today || 0,
        item.overdue || 0,
        item.upcoming || 0,
        item.total || 0,
      ]);
      downloadCSV(headers, rows, filename);
    } else if (key === "user-report") {
      items = reportData.user || [];
      headers = ["User", "Project", "Total", "Completed", "Pending", "Due Today", "Overdue", "Incomplete"];
      const rows = items.map((item) => [
        item.user || "",
        item.project || "",
        item.total || 0,
        item.completed || 0,
        item.pending || 0,
        item.dueToday || 0,
        item.overdue || 0,
        item.incomplete || 0,
      ]);
      downloadCSV(headers, rows, filename);
    } else if (key === "project-report") {
      items = reportData.project || [];
      headers = ["Project Name", "Project Manager", "Total", "Completed", "Pending", "Overdue", "Incomplete"];
      const rows = items.map((item) => [
        item.project || "",
        item.manager || "",
        item.total || 0,
        item.completed || 0,
        item.pending || 0,
        item.overdue || 0,
        item.incomplete || 0,
      ]);
      downloadCSV(headers, rows, filename);
    } else if (key === "project-running") {
      items = reportData['project-running']?.data || [];
      headers = ["Project Name", "Manager", /* "Department", */ "Category", "Est. Hours", "Used Hours", "Start Date", "End Date"]; // Department hidden
      const rows = items.map((item) => [
        item.title || "",
        item.managerName || "",
        // item.technologyName?.join(", ") || "", // Department hidden
        item.project_typeName || "",
        item.estimatedHours || 0,
        item.total_logged_time || 0,
        formatDate(item.start_date),
        formatDate(item.end_date),
      ]);
      downloadCSV(headers, rows, filename);
    } else if (key === "timesheet") {
      items = reportData['timesheet']?.data || [];
      headers = ["User", "Project", "Description", "Logged Time", "Date", "Project Manager", "Technology", "Category"];
      const rows = items.map((item) => [
        item.user || "",
        item.project || "",
        item.descriptions?.replace(/<[^>]*>/g, '') || "",
        (() => { const p = String(item.logged_time || "").split(":"); return p.length >= 2 ? `${p[0].padStart(2, "0")}:${p[1].padStart(2, "0")}` : (item.logged_time || ""); })(),
        formatDate(item.logged_date),
        item.projectManager || "",
        item.projectTechnology?.join(", ") || "",
        item.projectType || "",
      ]);
      downloadCSV(headers, rows, filename);
    } else if (key === "activity-report") {
      items = reportData.activity || [];
      headers = ["User", "Operation", "Module", "Date/Time"];
      const rows = items.map((item) => [
        item.user || "",
        item.operation || "",
        item.module || "",
        item.createdAt || "",
      ]);
      downloadCSV(headers, rows, filename);
    } else if (key === "status-report") {
      items = reportData.status || [];
      headers = ["Status", "Tasks", "Projects", "Users"];
      const rows = items.map((item) => [
        item.status || "",
        item.tasks || 0,
        item.projects || 0,
        item.users || 0,
      ]);
      downloadCSV(headers, rows, filename);
    } else {
      message.info("Download for this report type will be available soon.");
    }
  };

  const downloadCSV = (headers, rows, filename) => {
    if (rows.length === 0) {
      message.warning("No data available to download");
      return;
    }

    // Ensure headers are properly quoted and escaped
    const quotedHeaders = headers.map(header => `"${header}"`);

    // Ensure row data is properly quoted and escaped
    const quotedRows = rows.map(row =>
      row.map(cell => {
        // Convert to string and escape quotes, then wrap in quotes
        // Handle 0 values properly - don't convert 0 to empty string
        const cellStr = String(cell !== null && cell !== undefined ? cell : '').replace(/"/g, '""');
        return `"${cellStr}"`;
      })
    );

    const csvContent = [
      quotedHeaders.join(","),
      ...quotedRows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success("Download started successfully");
  };

  const handleSave = (key) => {
    message.success(`${formatText(key)} has been saved successfully!`);
  };

  const handleSchedule = (key) => {
    message.success(`${formatText(key)} has been scheduled successfully!`);
  };

  const handleHistory = (key) => {
    message.info(`Viewing History for ${formatText(key)}...`);
  };

  if (!reportKey) {
    return (
      <div className="reports-hub-page">
        <div className="reports-hub-header">
          <h1>Reports</h1>
        </div>
        <div className="reports-hub-grid">
          {reportCards.map((card) => (
            <Link
              key={card.key}
              to={`/${companySlug}/reports/${card.key}`}
              className={`reports-hub-card ${card.colorClass}`}
            >
              <span className="reports-hub-card-accent reports-hub-card-accent-top" />
              <span className="reports-hub-card-accent reports-hub-card-accent-bottom" />
              <div className="reports-hub-card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!currentPage) {
    history.replace(`/${companySlug}/reports`);
    return null;
  }

  const userOptions = users.length ? users : [{ value: "all", label: "All Users", firstName: "All" }];
  const projectOptions = Array.isArray(projects) ? projects : [];

  const fieldsByReportConfig = {
    "user-report": [
      { key: "projectIds", label: "Project", placeholder: "All Projects", options: projectOptions, mode: "multiple", defaultValue: [] },
      { key: "userId", label: "User", placeholder: "All Users", options: userOptions, defaultValue: "all" },
      { key: "status", label: "Status", placeholder: "All Status", options: statusOptions, defaultValue: "all" },
      { key: "date", type: "dateRange", placeholder: ["Start Date", "End Date"] },
    ],
    "status-report": [
      { key: "projectIds", label: "Project", placeholder: "All Projects", options: projectOptions, mode: "multiple", defaultValue: [] },
      { key: "userId", label: "User", placeholder: "All Users", options: userOptions, defaultValue: "all" },
      { key: "status", label: "Status", placeholder: "All Status", options: statusOptions, defaultValue: "all" },
      { key: "date", type: "dateRange", placeholder: ["Start Date", "End Date"] },
    ],
    "activity-report": [
      { key: "userId", label: "User", placeholder: "All Users", options: userOptions, defaultValue: "all" },
      { key: "activity", label: "Activity", placeholder: "All Activity", options: activityOptions, defaultValue: "" },
      { key: "date", type: "dateRange", placeholder: ["Start Date", "End Date"] },
      { key: "search", placeholder: "Search by email...", type: "search" },
    ],
    "user-performance-report": [
      { key: "projectIds", label: "Project", placeholder: "All Projects", options: projectOptions, mode: "multiple", defaultValue: [] },
      { key: "userId", label: "User", placeholder: "All Users", options: userOptions, defaultValue: "all" },
      { key: "date", type: "dateRange", placeholder: ["Start Date", "End Date"] },
    ],
    "project-running": [
      { key: "search", placeholder: "Search projects...", type: "search" },
    ],
    "project-report": [
      { key: "projectIds", label: "Project", placeholder: "All Projects", options: projectOptions, mode: "multiple", defaultValue: [] },
      { key: "status", label: "Status", placeholder: "All Status", options: projectStatusOptions, defaultValue: "all" },
      { key: "date", type: "dateRange", placeholder: ["Start Date", "End Date"] }
    ],
    "daily-report": [
      { key: "search", placeholder: "Search members...", type: "search" },
    ],
    "timesheet": [
      { key: "projectIds", label: "Project", placeholder: "All Projects", options: projectOptions, mode: "multiple", defaultValue: [] },
      { key: "userId", label: "User", placeholder: "All Users", options: userOptions, defaultValue: "all" },
      { key: "date", type: "dateRange", placeholder: ["Start Date", "End Date"] },
    ],
  };

  return (
    <Card className="reports-detail-page">
      <div className="heading-wrapper">


        <h2>{currentPage.title}</h2>
        <div className="header-btns">

          <DetailActions
            reportKey={reportKey}
            onDownload={() => handleDownload(reportKey)}
            onSchedule={() => handleSchedule(reportKey)}
            onHistory={() => handleHistory(reportKey)}
          />
          <Button
            type="button"
            className="add-btn"
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push(`/${companySlug}/reports`)}
          >
            Back
          </Button>
        </div>
      </div>

      <Card className="main-content-wrapper">
        <CommonFilters
          fields={fieldsByReportConfig[reportKey] || []}
          filters={filters}
          setFilters={setFilters}
          setLoading={setLoading}
          hideSearch={reportKey === "timesheet"}
        />
        {(loading || optionsLoading) && reportKey !== "project-report" && reportKey !== "project-running" && reportKey !== "timesheet" ? (
          <ReportsDetailSkeleton />
        ) : (
          <>
            {reportKey === "project-report" ? (
              <ProjectReportContent
                data={reportData.project}
                loading={loading}
                optionsLoading={optionsLoading}
                pageNo={pageNo}
                pageSize={pageSize}
                total={total}
                setPageNo={setPageNo}
                setPageSize={setPageSize}
                filters={filters}
                setFilters={setFilters}
                focusedProjectIds={focusedProjectIds}
                setFocusedProjectIds={setFocusedProjectIds}
                metricsLoading={metricsLoading}
                taskProgressCache={taskProgressCacheRef.current}
                projects={projects}
              />
            ) : reportKey === "daily-report" ? (
              <DailyReportContent
                activeKey={dailyTab}
                onChange={setDailyTab}
                items={reportData.daily[dailyTab] || []}
                pageNo={pageNo}
                pageSize={pageSize}
                total={total}
                setPageNo={setPageNo}
                setPageSize={setPageSize}
              />
            ) : (
              <DynamicReportContent
                reportKey={reportKey}
                filters={filters}
                setFilters={setFilters}
                projects={projects}
                users={users}
                data={reportData}
                loading={loading}
                pageNo={pageNo}
                pageSize={pageSize}
                total={total}
                setPageNo={setPageNo}
                setPageSize={setPageSize}
              />
            )}
          </>
        )}
      </Card>
    </Card>
  );
}

function DynamicReportContent({
  reportKey,
  filters,
  setFilters,
  projects,
  users,
  data,
  loading,
  pageNo,
  pageSize,
  total,
  setPageNo,
  setPageSize,
}) {
  const userOptions = users.length ? users : [{ value: "all", label: "All Users", firstName: "All" }];
  const projectOptions = Array.isArray(projects) ? projects : [];

  const rowsByReport = {
    "user-report": data.user,
    "status-report": data.status,
    "activity-report": data.activity,
    "user-performance-report": data.performance?.rows || [],
    "project-running": data['project-running']?.data || [],
    "timesheet": data['timesheet']?.data || [],
  };

  const rowData = rowsByReport[reportKey] || [];

  return (
    <>
      {reportKey === "user-report" && rowData.length > 0 ? (
        <UserReportResults
          rows={rowData}
          filters={filters}
          pageNo={pageNo}
          pageSize={pageSize}
          total={total}
          setPageNo={setPageNo}
          setPageSize={setPageSize}
        />
      ) : reportKey === "project-running" && data['project-running'] ? (
        <ProjectRunningReportContent
          data={data['project-running']}
          filters={filters}
          pageNo={pageNo}
          pageSize={pageSize}
          total={total}
          setPageNo={setPageNo}
          setPageSize={setPageSize}
        />
      ) : reportKey === "timesheet" && data["timesheet"] ? (
        <TimesheetReportContent
          data={data["timesheet"]}
          filters={filters}
          loading={loading}
          pageNo={pageNo}
          pageSize={pageSize}
          total={total}
          setPageNo={setPageNo}
          setPageSize={setPageSize}
        />
      ) : rowData.length > 0 ? (
        <ReportResults
          reportKey={reportKey}
          rows={rowData}
          summary={data.performance?.summary}
          filters={filters}
          pageNo={pageNo}
          pageSize={pageSize}
          total={total}
          setPageNo={setPageNo}
          setPageSize={setPageSize}
        />
      ) : (
        <EmptyReportState />
      )}
    </>
  );
}

function cloneFacetValue(value, mode = "single", defaultValue) {
  if (mode === "multiple") {
    return Array.isArray(value) ? [...value] : Array.isArray(defaultValue) ? [...defaultValue] : [];
  }

  if (value === undefined) {
    return defaultValue;
  }

  return value;
}

function CommonFilters({ fields, filters, setFilters, setLoading, hideSearch = false }) {
  const facetFields = fields.filter((field) => field.type !== "date" && field.type !== "dateRange" && field.type !== "search");
  const dateField = fields.find((field) => field.type === "date");
  const rangeField = fields.find((field) => field.type === "dateRange");
  const searchField = fields.find((field) => field.type === "search");
  const [isFacetOpen, setIsFacetOpen] = useState(false);
  const [anchorFieldKey, setAnchorFieldKey] = useState(facetFields[0]?.key || "");
  const [activeFieldKey, setActiveFieldKey] = useState(facetFields[0]?.key || "");
  const [searchText, setSearchText] = useState("");
  const [reportSearchText, setReportSearchText] = useState(filters?.search || "");
  const [draftFilters, setDraftFilters] = useState({});

  useEffect(() => {
    setReportSearchText(filters?.search || "");
  }, [filters?.search]);

  // Debounced search effect — does NOT show full skeleton (silent update)
  useEffect(() => {
    const isSearching = reportSearchText !== (filters?.search || "");
    // Do NOT call setLoading(true) here — search uses silent/fast-path update
    // so the user sees results update without skeleton flash

    const timer = setTimeout(() => {
      if (isSearching) {
        setFilters((prev) => ({
          ...prev,
          search: reportSearchText,
        }));
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [reportSearchText, setFilters, filters?.search]);

  useEffect(() => {
    if (!facetFields.length) {
      setAnchorFieldKey("");
      setActiveFieldKey("");
      return;
    }

    const hasAnchor = facetFields.some((field) => field.key === anchorFieldKey);
    const hasActive = facetFields.some((field) => field.key === activeFieldKey);

    if (!hasAnchor) {
      setAnchorFieldKey(facetFields[0].key);
    }

    if (!hasActive) {
      setActiveFieldKey(facetFields[0].key);
    }
  }, [activeFieldKey, anchorFieldKey, facetFields]);

  const activeField = facetFields.find((field) => field.key === activeFieldKey) || facetFields[0];
  const activeFacetCount = useMemo(
    () =>
      facetFields.reduce((count, field) => {
        const fieldValue = filters[field.key];
        const isSelected =
          field.mode === "multiple"
            ? Array.isArray(fieldValue) && fieldValue.length > 0
            : fieldValue !== undefined &&
            fieldValue !== null &&
            fieldValue !== "" &&
            fieldValue !== field.defaultValue;

        return count + (isSelected ? 1 : 0);
      }, 0),
    [facetFields, filters]
  );

  const openFacetPanel = (fieldKey) => {
    const nextDraftFilters = facetFields.reduce((acc, field) => {
      acc[field.key] = cloneFacetValue(filters[field.key], field.mode, field.defaultValue);
      return acc;
    }, {});

    setDraftFilters(nextDraftFilters);
    setAnchorFieldKey(fieldKey);
    setActiveFieldKey(fieldKey);
    setSearchText("");
    setIsFacetOpen(true);
  };

  const closeFacetPanel = () => {
    setIsFacetOpen(false);
    setSearchText("");
  };

  const filteredOptions = useMemo(() => {
    if (!activeField) {
      return [];
    }

    if (!searchText.trim()) {
      return activeField.options || [];
    }

    return (activeField.options || []).filter((option) =>
      String(option.label || "")
        .toLowerCase()
        .includes(searchText.trim().toLowerCase())
    );
  }, [activeField, searchText]);

  const handleOptionToggle = (optionValue) => {
    if (!activeField) {
      return;
    }

    setDraftFilters((prev) => {
      const currentValue = cloneFacetValue(prev[activeField.key], activeField.mode, activeField.defaultValue);

      if (activeField.mode === "multiple") {
        const currentValues = Array.isArray(currentValue) ? currentValue : [];
        return {
          ...prev,
          [activeField.key]: currentValues.includes(optionValue)
            ? currentValues.filter((item) => item !== optionValue)
            : [...currentValues, optionValue],
        };
      }

      return {
        ...prev,
        [activeField.key]: optionValue,
      };
    });
  };

  const applySelection = () => {
    setFilters((prev) => {
      const nextFilters = { ...prev };
      facetFields.forEach((field) => {
        nextFilters[field.key] = cloneFacetValue(draftFilters[field.key], field.mode, field.defaultValue);
      });
      return nextFilters;
    });
    closeFacetPanel();
  };

  const resetSelection = () => {
    if (!activeField) {
      return;
    }

    setDraftFilters((prev) => ({
      ...prev,
      [activeField.key]: cloneFacetValue(undefined, activeField.mode, activeField.defaultValue),
    }));
    setSearchText("");
  };

  const resetAllSelections = () => {
    const clearedFilters = facetFields.reduce((acc, field) => {
      acc[field.key] = cloneFacetValue(undefined, field.mode, field.defaultValue);
      return acc;
    }, {});

    setDraftFilters(clearedFilters);
    setSearchText("");
    setFilters((prev) => ({
      ...prev,
      ...clearedFilters,
    }));
  };

  const panel = activeField ? (
    <div className="reports-facet-panel reports-facet-panel--split">
      <aside className="reports-facet-sidebar">
        <div className="reports-facet-sidebar-header">
          <h3 className="reports-facet-sidebar-title">Filters</h3>
          <button type="button" className="reports-facet-reset-all-btn" onClick={resetAllSelections}>
            Reset All
          </button>
        </div>
        <div className="reports-facet-sidebar-list">
          {facetFields.map((field) => {
            const fieldValue = draftFilters[field.key];
            const isSelected =
              field.mode === "multiple"
                ? Array.isArray(fieldValue) && fieldValue.length > 0
                : fieldValue !== undefined && fieldValue !== null && fieldValue !== "" && fieldValue !== field.defaultValue;

            return (
              <button
                key={field.key}
                type="button"
                className={`reports-facet-sidebar-item ${activeFieldKey === field.key ? "active" : ""}`}
                onClick={() => {
                  setActiveFieldKey(field.key);
                  setSearchText("");
                }}
              >
                <span>{field.label}</span>
                {isSelected ? <i className="reports-facet-sidebar-dot" /> : null}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="reports-facet-main">
        <div className="reports-facet-main-head">
          <span className="reports-facet-main-accent" />
          <div>
            <h3>{activeField.label}</h3>
            <p>{activeField.placeholder}</p>
          </div>
        </div>

        {(activeField.options || []).length > 6 ? (
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={`Search ${String(activeField.label || "").toLowerCase()}...`}
            prefix={<SearchOutlined />}
            className="reports-facet-search"
            allowClear
          />
        ) : null}

        <div className="reports-facet-options">
          {activeField.key === "projectIds" && (
            <button
              type="button"
              className={`reports-facet-option ${(!draftFilters[activeField.key] || draftFilters[activeField.key].length === 0) ? "active" : ""}`}
              onClick={() => {
                setDraftFilters(prev => ({ ...prev, [activeField.key]: [] }));
              }}
            >
              <span className={`reports-facet-option-indicator multiple ${(!draftFilters[activeField.key] || draftFilters[activeField.key].length === 0) ? "active" : ""}`} />
              <span className="reports-facet-option-label">All Projects</span>
            </button>
          )}
          {filteredOptions.length ? (
            filteredOptions.map((option) => {
              const draftValue = cloneFacetValue(
                draftFilters[activeField.key],
                activeField.mode,
                activeField.defaultValue
              );
              const isSelected =
                activeField.mode === "multiple"
                  ? Array.isArray(draftValue) && draftValue.includes(option.value)
                  : draftValue === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`reports-facet-option ${isSelected ? "active" : ""}`}
                  onClick={() => handleOptionToggle(option.value)}
                >
                  <span
                    className={`reports-facet-option-indicator ${activeField.mode === "multiple" ? "multiple" : ""} ${isSelected ? "active" : ""}`}
                  />
                  <span className="reports-facet-option-label">{option.label}</span>
                </button>
              );
            })
          ) : (
            <div className="reports-facet-empty">No options found</div>
          )}
        </div>

        <div className="reports-facet-actions">
          <Button type="primary" className="reports-facet-apply-btn filter-btn" onClick={applySelection}>
            Apply Filter
          </Button>
          <button type="button" className="reports-facet-reset-btn" onClick={resetSelection}>
            Reset
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="global-search">

      {!hideSearch && (searchField ? (
        <Input.Search
          key={searchField.key}
          placeholder={searchField.placeholder || "Search..."}
          className="reports-search-input"
          value={reportSearchText}
          onChange={(event) => {
            const nextValue = event.target.value || "";
            setReportSearchText(nextValue);
          }}
          onSearch={(value) => {
            setFilters((prev) => ({
              ...prev,
              search: value ?? reportSearchText ?? "",
            }));
          }}
          allowClear
          style={{ height: 40 }}
        />
      ) : (
        <Input.Search
          placeholder="Search..."
          className="reports-search-input"
          value={reportSearchText}
          onChange={(event) => {
            const nextValue = event.target.value || "";
            setReportSearchText(nextValue);
          }}
          onSearch={(value) => {
            setFilters((prev) => ({
              ...prev,
              search: value ?? reportSearchText ?? "",
            }));
          }}
          allowClear
          style={{ height: 40 }}
        />
      ))}

      <div className="filter-btn-wrapper">

        {rangeField ? (
          <DatePicker.RangePicker
            size="small"
            className="reports-filter-control"
            value={
              rangeField.key === "date" && filters.date
                ? toPickerRange(filters.date)
                : filters.startDate && filters.endDate
                  ? toPickerRange([filters.startDate, filters.endDate])
                  : null
            }
            onChange={(values) => {
              if (rangeField.key === "date") {
                setFilters(prev => ({
                  ...prev,
                  date: values ? [values[0].format("DD-MM-YYYY"), values[1].format("DD-MM-YYYY")] : null,
                }));
              } else {
                setFilters(prev => ({
                  ...prev,
                  startDate: values ? values[0].format("DD-MM-YYYY") : null,
                  endDate: values ? values[1].format("DD-MM-YYYY") : null,
                }));
              }
            }}
            placeholder={rangeField.placeholder || ["From", "To"]}
            allowClear
            format="DD-MM-YYYY"
            style={{ minWidth: 260 }}
          />
        ) : null}
        {dateField ? (
          <DatePicker
            size="small"
            key={dateField.key}
            placeholder={dateField.placeholder}
            className="reports-filter-control"
            suffixIcon={<CalendarOutlined />}
            value={filters[dateField.key] ? toPickerDayjs(filters[dateField.key]) : null}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                [dateField.key]: value ? value.format("DD-MM-YYYY") : null,
              }))
            }
            allowClear
            format="DD-MM-YYYY"
          />
        ) : null}
        {facetFields.length ? (
          <Dropdown
            key="reports-shared-filter"
            open={isFacetOpen}
            onOpenChange={(open) => {
              if (!open) {
                closeFacetPanel();
              }
            }}
            trigger={["click"]}
            dropdownRender={() => panel}
            placement="bottomLeft"
            overlayClassName="reports-facet-dropdown"
          >
            <Button
              type="button"
              className={`reports-single-filter-btn filter-btn ${isFacetOpen ? "active" : ""}`}
              onClick={() => openFacetPanel(activeFieldKey || facetFields[0]?.key)}
              icon={<FilterOutlined />}
            >
              Filter
              {activeFacetCount > 0 ? (
                <span className="reports-single-filter-count">{activeFacetCount}</span>
              ) : null}
            </Button>
          </Dropdown>
        ) : null}
      </div>
    </div>
  );
}

function ProjectReportMetricCardSkeleton() {
  return (
    <div className="project-report-stat-card skeleton">
      <div className="sk-block" style={{ width: 56, height: 56, borderRadius: "12px", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <div className="sk-block" style={{ width: "60%", height: 11, borderRadius: 4 }} />
        <div className="sk-block" style={{ width: "42%", height: 22, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function ProjectReportSkeleton() {
  return (
    <div className="project-report-skeleton">
      {/* Top info bar shimmer */}
      <div className="sk-block" style={{ width: 180, height: 16, borderRadius: 4, marginBottom: 20 }} />

      {/* Stat cards skeleton */}
      <div className="project-report-stats">
        {Array.from({ length: 3 }).map((_, i) => (
          <ProjectReportMetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Table card skeleton */}
      <div className="project-report-table-card" style={{ marginTop: 24 }}>
        {/* Table header row */}
        <div className="project-report-table-header">
          <div className="sk-block" style={{ width: 140, height: 16, borderRadius: 4 }} />
          <div className="sk-block" style={{ width: 180, height: 32, borderRadius: 8 }} />
        </div>
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 0.8fr", gap: 16, padding: "14px 16px", borderBottom: "1px solid var(--app-border, #e8ecf0)" }}>
          {["50%", "42%", "38%", "40%", "35%"].map((w, i) => (
            <div key={i} className="sk-block" style={{ width: w, height: 11, borderRadius: 4 }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, r) => (
          <div key={r} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 0.8fr", gap: 16, padding: "14px 16px", borderBottom: "1px solid var(--app-border, #f5f5f5)" }}>
            <div className="sk-block" style={{ width: `${65 + (r % 3) * 10}%`, height: 12, borderRadius: 4 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="sk-block" style={{ flex: 1, height: 7, borderRadius: 3 }} />
              <div className="sk-block" style={{ width: 32, height: 10, borderRadius: 3 }} />
            </div>
            <div className="sk-block" style={{ width: "62%", height: 11, borderRadius: 4 }} />
            <div className="sk-block" style={{ width: "58%", height: 11, borderRadius: 4 }} />
            <div className="sk-block" style={{ width: 52, height: 20, borderRadius: 8 }} />
          </div>
        ))}
        {/* Pagination shimmer */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, padding: "14px 16px" }}>
          {[30, 30, 30, 75, 30, 30].map((w, i) => (
            <div key={i} className="sk-block" style={{ width: w, height: 28, borderRadius: 6 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectReportContent({
  data,
  loading,
  optionsLoading,
  metricsLoading,
  taskProgressCache,
  pageNo,
  pageSize,
  total,
  setPageNo,
  setPageSize,
  filters,
  setFilters,
  focusedProjectIds,
  setFocusedProjectIds,
  projects
}) {
  const isDataLoading = loading || optionsLoading;

  const columns = [
    { title: "Project List", dataIndex: "taskName", key: "taskName" },
    {
      title: "Progress",
      dataIndex: "progress",
      key: "progress",
      render: (value) => (
        <div className="project-report-progress">
          <Progress percent={value} showInfo={false} strokeColor={getProgressColor(value)} />
          <span>{value}%</span>
        </div>
      ),
    },
    { title: "Start Date", dataIndex: "startDate", key: "startDate" },
    { title: "End Date", dataIndex: "endDate", key: "endDate" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <Tag color={value === "Active" ? "green" : "default"}>{value || "-"}</Tag>,
    },
  ];

  // Only filter the table by projects if the selection comes from the TOP filter dropdown
  const filteredRows = (data.rows || []).filter((row) => {
    // Top-level Project Filter
    if (Array.isArray(filters?.projectIds) && filters.projectIds.length > 0) {
      if (!filters.projectIds.includes(row.key) && !filters.projectIds.includes(row.projectId)) {
        return false;
      }
    }

    // Top-level Status Filter
    if (filters?.status && filters.status !== "all") {
      const rowStatus = (row.status || "").toLowerCase().trim();
      const filterStatus = filters.status.toLowerCase().trim();
      if (rowStatus !== filterStatus) return false;
    }

    // Top-level Date Range Filter (Filter projects by their activity window)
    if (filters?.startDate || filters?.endDate || (filters?.date && Array.isArray(filters.date))) {
      const start = parseReportDate(filters.startDate || (filters.date && Array.isArray(filters.date) ? filters.date[0] : null));
      const end = parseReportDate(filters.endDate || (filters.date && Array.isArray(filters.date) ? filters.date[1] : null));

      const projectStart = parseReportDate(row.startDate);
      const projectEnd = parseReportDate(row.endDate);

      // Logic: Show project if it overlaps with the filter range OR if it has no dates defined (optional)
      if (start && projectEnd && projectEnd.isBefore(start, 'day')) return false;
      if (end && projectStart && projectStart.isAfter(end, 'day')) return false;
    }

    return true;
  });
  // Dynamically compute metrics based on filteredRows (respects status/date/project filters)
  // If filteredRows count differs from data.rows OR any filter is active, use dynamic metrics
  const hasActiveClientFilter = Boolean(
    (filters?.status && filters.status !== "all") ||
    (Array.isArray(filters?.projectIds) && filters.projectIds.length > 0) ||
    filters?.startDate || filters?.endDate || (filters?.date && Array.isArray(filters.date))
  );
  const rowsAreFiltered = filteredRows.length !== (data.rows || []).length;
  const useDynamic = hasActiveClientFilter || rowsAreFiltered;
  const safeCurrentPage = Math.min(
    pageNo,
    Math.max(Math.ceil((filteredRows.length || 1) / pageSize), 1)
  );

  const dynamicMetrics = (() => {
    if (!useDynamic) {
      return data.summary;
    }
    // Aggregate task counts from filteredRows using the cached progress map
    const progressMap = taskProgressCache?.projectProgressMap || {};
    let totalTasks = 0;
    let completedTasks = 0;
    filteredRows.forEach((row) => {
      const m = progressMap[row.key] || { total: 0, completed: 0 };
      totalTasks += m.total;
      completedTasks += m.completed;
    });
    return {
      totalProjects: filteredRows.length,
      totalTasks,
      completedTasks,
      incompleteTasks: Math.max(totalTasks - completedTasks, 0),
    };
  })();

  const displayMetrics = useDynamic ? dynamicMetrics : data.summary;

  // Show skeleton whenever we are fetching fresh data from the backend
  if (isDataLoading) {
    return <ProjectReportSkeleton />;
  }

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <div />
      </div>

      {focusedProjectIds.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            onClick={() => setFocusedProjectIds([])}
            style={{
              padding: "5px 16px",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: "#0b3a5b",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => e.target.style.background = "#082f4a"}
            onMouseLeave={(e) => e.target.style.background = "#0b3a5b"}
          >
            ✕ Reset
          </button>
        </div>
      )}

      <div className="project-report-stats">
        {isDataLoading && (!data.summary.totalProjects || data.rows.length === 0) ? (
          <>
            <ProjectReportMetricCardSkeleton />
            <ProjectReportMetricCardSkeleton />
            <ProjectReportMetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard color="#22b3c3" value={String(displayMetrics.totalProjects)} label="Total Projects" solid />
            {metricsLoading ? (
              <>
                <ProjectReportMetricCardSkeleton />
                <ProjectReportMetricCardSkeleton />
              </>
            ) : (
              <>
                <MetricCard color="#ea3030" value={`${displayMetrics.incompleteTasks}/${displayMetrics.totalTasks || 0}`} label="Task In-completed" />
                <MetricCard
                  color="#22c55e"
                  value={`${displayMetrics.completedTasks}/${displayMetrics.totalTasks || 0}`}
                  label="Task Completed"
                  secondaryValueColor="#22c55e"
                />
              </>
            )}
          </>
        )}
      </div>

      <div className="project-report-table-card">
        <div className="project-report-table-header">
          <h2 style={{ margin: 0 }}>Project List</h2>
        </div>
        <Table
          columns={columns}
          dataSource={filteredRows}
          rowClassName={(record) => {
            const isFocused = Array.isArray(focusedProjectIds) && focusedProjectIds.includes(record.key);
            const isSelected = Array.isArray(filters?.projectIds) && filters.projectIds.includes(record.key);
            return `project-report-row ${isFocused ? "focused-report-row" : isSelected ? "selected-report-row" : ""}`;
          }}
          onRow={(record) => ({
            onClick: () => {
              setFocusedProjectIds(prev => prev.includes(record.key) ? [] : [record.key]);
            },
          })}
          pagination={{
            current: safeCurrentPage,
            pageSize: pageSize,
            total: filteredRows.length,
            onChange: (page, size) => {
              setPageNo(page);
              setPageSize(size);
            },
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "25", "30"],
          }}
          locale={{
            emptyText: (
              <>
                <NoDataFoundIcon />
                <p>No project data found</p>
              </>
            )
          }}
        />
      </div>
    </>
  );
}

function ReportResults({ reportKey, rows, summary, filters, pageNo, pageSize, total, setPageNo, setPageSize }) {
  const reportConfigs = {
    "user-report": {
      title: "User Summary",
      columns: [
        { title: "User", dataIndex: "user", key: "user" },
        { title: "Project", dataIndex: "project", key: "project" },
        { title: "Total Tasks", dataIndex: "total", key: "total" },
        { title: "Completed", dataIndex: "completed", key: "completed" },
        { title: "Incomplete", dataIndex: "incomplete", key: "incomplete" },
        { title: "Pending", dataIndex: "pending", key: "pending" },
        { title: "Overdue", dataIndex: "overdue", key: "overdue" },
      ],
    },
    "status-report": {
      title: "Status Summary",
      columns: [
        { title: "Status", dataIndex: "status", key: "status" },
        { title: "Tasks", dataIndex: "tasks", key: "tasks" },
        { title: "Projects", dataIndex: "projects", key: "projects" },
        { title: "Users", dataIndex: "users", key: "users" },
      ],
    },
    "activity-report": {
      title: "Activity Logs",
      columns: [
        { title: "User", dataIndex: "user", key: "user" },
        { title: "Operation", dataIndex: "operation", key: "operation" },
        { title: "Module", dataIndex: "module", key: "module" },
        { title: "Created At", dataIndex: "createdAt", key: "createdAt" },
      ],
    },
    "user-performance-report": {
      title: "User Performance",
      columns: [
        { title: "User", dataIndex: "user", key: "user" },
        { title: "Logged Hours", dataIndex: "loggedHours", key: "loggedHours" },
        { title: "Entries", dataIndex: "entries", key: "entries" },
        { title: "Projects", dataIndex: "projects", key: "projects" },
      ],
    },
  };

  const config = reportConfigs[reportKey];
  const paginationTotal = reportKey === "status-report" ? rows.length : total;
  const safeCurrentPage = Math.min(
    pageNo,
    Math.max(Math.ceil((paginationTotal || 1) / pageSize), 1)
  );

  return (
    <div className="reports-result-card">
      {reportKey === "user-performance-report" ? (
        <div className="reports-result-summary">
          <div className="reports-mini-stat">
            <span>Total Hours</span>
            <strong>{Number(summary.totalHours || 0).toFixed(2)}</strong>
          </div>
          <div className="reports-mini-stat">
            <span>Total Entries</span>
            <strong>{summary.totalEntries || 0}</strong>
          </div>
        </div>
      ) : null}
      <Table
        columns={config.columns}
        dataSource={rows}
        pagination={{
          current: safeCurrentPage,
          pageSize: pageSize,
          total: paginationTotal,
          onChange: (page, size) => {
            setPageNo(page);
            setPageSize(size);
          },
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "25", "30"],
        }}
        rowKey="key"
        locale={{ emptyText: <Empty description="No report data found" /> }}
      />
    </div>
  );
}

function UserReportResults({ rows, filters, pageNo, pageSize, total, setPageNo, setPageSize }) {
  const [viewMode, setViewMode] = useState("chart");
  const [selectedMember, setSelectedMember] = useState(() =>
    filters?.userId && filters.userId !== "all" ? filters.userId : null
  );
  const normalizedSearch = String(filters?.search || "").trim().toLowerCase();

  useEffect(() => {
    if (filters?.userId && filters.userId !== "all") {
      setSelectedMember(filters.userId);
    } else {
      setSelectedMember(null);
    }
  }, [filters?.userId]);


  const filteredMembers = useMemo(() => {
    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((row) => {
      const searchHaystack = [
        row.user,
        row.project,
        row.total,
        row.completed,
        row.pending,
        row.dueToday,
        row.overdue,
        row.incomplete,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");

      return searchHaystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, rows]);

  const selectedRow = selectedMember
    ? (filteredMembers.find((row) => row.key === selectedMember) ||
      rows.find((row) => row.key === selectedMember) ||
      null)
    : null;

  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      const totalDiff = Number(b.total || 0) - Number(a.total || 0);
      if (totalDiff !== 0) {
        return totalDiff;
      }

      return String(a.user || "").localeCompare(String(b.user || ""));
    });
  }, [filteredMembers]);

  const visibleMembers = useMemo(() => sortedMembers.slice(0, 10), [sortedMembers]);
  const overflowMembers = useMemo(() => sortedMembers.slice(10), [sortedMembers]);

  const chartRows = useMemo(() => {
    const source = filteredMembers.length > 0 ? filteredMembers : rows;
    if (selectedMember) {
      const match = source.find((r) => r.key === selectedMember);
      if (match) return [match];
    }
    return source.slice(0, 10);
  }, [filteredMembers, rows, selectedMember]);

  const chartSeries = useMemo(
    () => [
      {
        name: "Closed",
        data: chartRows.map((row) => row.completed || 0),
      },
      {
        name: "Pending",
        data: chartRows.map((row) => row.pending || 0),
      },
      {
        name: "Incomplete",
        data: chartRows.map((row) => row.incomplete || 0),
      },
    ],
    [chartRows]
  );

  const hasChartData = useMemo(
    () =>
      chartRows.some(
        (row) =>
          Number(row.completed || 0) > 0 ||
          Number(row.pending || 0) > 0 ||
          Number(row.incomplete || 0) > 0 ||
          Number(row.dueToday || 0) > 0 ||
          Number(row.overdue || 0) > 0
      ),
    [chartRows]
  );

  const totalSummary = useMemo(
    () =>
      filteredMembers.reduce(
        (acc, row) => {
          acc.members += 1;
          acc.total += Number(row.total || 0);
          acc.completed += Number(row.completed || 0);
          acc.pending += Number(row.pending || 0);
          acc.incomplete += Number(row.incomplete || 0);
          acc.dueToday += Number(row.dueToday || 0);
          acc.overdue += Number(row.overdue || 0);
          return acc;
        },
        { members: 0, total: 0, completed: 0, pending: 0, incomplete: 0, dueToday: 0, overdue: 0 }
      ),
    [filteredMembers]
  );

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        stacked: true,
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      colors: ["#22c55e", "#f6b940", "#38bdf8"],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "26%",
          borderRadius: 6,
        },
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 1,
        colors: ["#ffffff"],
      },
      legend: { show: false },
      grid: {
        borderColor: "#edf2f7",
        xaxis: { lines: { show: true } },
      },
      xaxis: {
        categories: chartRows.map((row) => row.user),
        min: 0,
        labels: {
          style: { colors: "#718096", fontSize: "12px" },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#5d7190", fontSize: "13px", fontWeight: 500 },
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
      },
    }),
    [chartRows]
  );

  const memberTableRows = selectedRow
    ? [
      { label: "Project", value: selectedRow.project || "-" },
      { label: "Total Task", value: selectedRow.total || 0 },
      { label: "Pending Task", value: selectedRow.pending || 0 },
      { label: "Due Today", value: selectedRow.dueToday || 0 },
      { label: "Past Due Tasks", value: selectedRow.overdue || 0 },
      { label: "Completed", value: selectedRow.completed || 0 },
      { label: "Incomplete", value: selectedRow.incomplete || 0 },
    ]
    : [
      { label: "Total Members", value: filteredMembers.length },
      { label: "Total Tasks", value: filteredMembers.reduce((s, r) => s + (r.total || 0), 0) },
      { label: "Pending Tasks", value: filteredMembers.reduce((s, r) => s + (r.pending || 0), 0) },
      { label: "Due Today", value: filteredMembers.reduce((s, r) => s + (r.dueToday || 0), 0) },
      { label: "Past Due Tasks", value: filteredMembers.reduce((s, r) => s + (r.overdue || 0), 0) },
      { label: "Completed", value: filteredMembers.reduce((s, r) => s + (r.completed || 0), 0) },
      { label: "Incomplete", value: filteredMembers.reduce((s, r) => s + (r.incomplete || 0), 0) },
    ];
  const safeCurrentPage = Math.min(
    pageNo,
    Math.max(Math.ceil(((filteredMembers.length || 1)) / pageSize), 1)
  );

  return (
    <div className="user-report-layout">
      <div className="user-report-chart-card">
        <div className="user-report-card-head">
          <div>
            <h2>{filters.date ? moment(filters.date).format("DD-MM-YYYY") : moment().format("DD-MM-YYYY")} to</h2>
            <div className="user-report-legend-note">
              <span><i className="closed" />Closed</span>
              <span><i className="pending" />Pending</span>
              <span><i className="incomplete" />Incomplete</span>
            </div>
          </div>
          <div className="user-report-view-toggle">
            <Button
              type="default"
              className={viewMode === "chart" ? "active" : ""}
              onClick={() => setViewMode("chart")}
            >
              <LineChartOutlined />
            </Button>
            <Button
              type="default"
              className={viewMode === "table" ? "active" : ""}
              onClick={() => setViewMode("table")}
            >
              <FundProjectionScreenOutlined />
            </Button>
          </div>
        </div>

        {viewMode === "chart" ? (
          <>
            <div className="user-report-summary-strip">
              <div className="user-report-summary-pill">
                <span>Members</span>
                <strong>{totalSummary.members}</strong>
              </div>
              <div className="user-report-summary-pill">
                <span>Total Tasks</span>
                <strong>{totalSummary.total}</strong>
              </div>
              <div className="user-report-summary-pill success">
                <span>Closed</span>
                <strong>{totalSummary.completed}</strong>
              </div>
              <div className="user-report-summary-pill warning">
                <span>Pending</span>
                <strong>{totalSummary.pending}</strong>
              </div>
              <div className="user-report-summary-pill accent">
                <span>Due Today</span>
                <strong>{totalSummary.dueToday}</strong>
              </div>
              <div className="user-report-summary-pill danger">
                <span>Past Due</span>
                <strong>{totalSummary.overdue}</strong>
              </div>
              <div className="user-report-summary-pill info">
                <span>Incomplete</span>
                <strong>{totalSummary.incomplete}</strong>
              </div>
            </div>

            {chartRows.length > 0 && hasChartData ? (
              <div className="user-report-chart-wrap">
                {!chartSeries || chartSeries.every(s => !s.data || s.data.length === 0) ? (
                  <NoGraphFound />
                ) : (
                  <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={360} />
                )}
              </div>
            ) : (
              <div className="user-report-chart-empty">
                <div className="user-report-chart-empty-graphic">
                  <span />
                  <span />
                  <span />
                </div>
                <h3>No task distribution found</h3>
                <p>Change the filters or select a date range with user task activity.</p>
              </div>
            )}
          </>
        ) : (
          <div className="user-report-table-view" style={{ padding: "20px" }}>
            <Table
              dataSource={filteredMembers}
              pagination={{
                current: safeCurrentPage,
                pageSize: pageSize,
                total: filteredMembers.length,
                onChange: (page, size) => {
                  setPageNo(page);
                  setPageSize(size);
                },
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "25", "30"],
              }}
              columns={[
                { title: "User", dataIndex: "user", key: "user" },
                { title: "Project", dataIndex: "project", key: "project" },
                { title: "Total", dataIndex: "total", key: "total" },
                { title: "Closed", dataIndex: "completed", key: "completed" },
                { title: "Pending", dataIndex: "pending", key: "pending" },
                { title: "Due Today", dataIndex: "dueToday", key: "dueToday" },
                { title: "Past Due", dataIndex: "overdue", key: "overdue" },
                { title: "Incomplete", dataIndex: "incomplete", key: "incomplete" },
              ]}
            />
          </div>
        )}
      </div>

      <div className="user-report-members-card">
        <div className="user-report-member-header">
          <h2>Member</h2>
        </div>

        <div className="user-report-member-tabs">
          {/* All button */}
          <button
            type="button"
            className={`user-report-member-tab ${!selectedMember ? "active" : ""}`}
            onClick={() => setSelectedMember(null)}
          >
            <span className="user-report-member-tab-name">All</span>
            <span className="user-report-member-tab-count">{filteredMembers.length}</span>
          </button>

          {visibleMembers.map((row) => (
            <button
              key={row.key}
              type="button"
              className={`user-report-member-tab ${selectedRow?.key === row.key ? "active" : ""}`}
              onClick={() => setSelectedMember(row.key)}
            >
              <span className="user-report-member-tab-name">{row.user}</span>
              <span className="user-report-member-tab-count">{row.total || 0}</span>
            </button>
          ))}

          {overflowMembers.length > 0 && (
            <Dropdown
              menu={{
                items: overflowMembers.map((m) => ({
                  key: m.key,
                  label: (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", minWidth: "150px" }}>
                      <span>{m.user}</span>
                      <small style={{ color: "#94a3b8" }}>{m.total || 0}</small>
                    </div>
                  ),
                  onClick: () => setSelectedMember(m.key),
                })),
                style: { maxHeight: "300px", overflowY: "auto" },
              }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <button
                type="button"
                className={`user-report-member-tab more-tab ${overflowMembers.some((m) => m.key === selectedMember) ? "active" : ""
                  }`}
              >
                <span className="user-report-member-tab-name">
                  {overflowMembers.some((m) => m.key === selectedMember)
                    ? sortedMembers.find((m) => m.key === selectedMember)?.user
                    : "More"}
                </span>
                <DownOutlined style={{ fontSize: "10px", marginLeft: "4px" }} />
              </button>
            </Dropdown>
          )}
        </div>

        <div className="user-report-member-grid">
          {memberTableRows.map((item) => (
            <div key={item.label} className="user-report-member-stat">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyReportContent({ activeKey, onChange, items, pageNo, pageSize, total, setPageNo, setPageSize }) {
  const [expandedKeys, setExpandedKeys] = useState([]);
  const startCount = items.length ? (pageNo - 1) * pageSize + 1 : 0;
  const endCount = Math.min(pageNo * pageSize, items.length);

  useEffect(() => {
    setPageNo(1);
    setExpandedKeys([]);
  }, [activeKey, setPageNo]);

  useEffect(() => {
    setExpandedKeys([]);
  }, [pageNo]);

  const paginatedItems = useMemo(() => {
    const startIndex = (pageNo - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [pageNo, items, pageSize]);

  return (
    <>
      <div className="daily-report-toolbar">
        <Tabs activeKey={activeKey} onChange={onChange} items={dailyTabs.map((tab) => ({ key: tab.key, label: tab.label }))} className="daily-report-tabs" />
        <Button className="daily-report-collapse-button" icon={<ArrowLeftOutlined rotate={90} />} />
      </div>

      <div className="daily-report-table-wrap">
        <div className="daily-report-table-head">
          <span>Member Name</span>
          <span>Today</span>
          <span>Overdue</span>
          <span>Upcoming</span>
          <span>Total</span>
        </div>

        {items.length === 0 ? (
          <div className="no-data-found">
            <NoDataFoundIcon />
            <p>No daily report data found</p>
          </div>
        ) : (
          <>
            <div className="daily-report-meta">
              <span>Showing {startCount}-{endCount} of {items.length} members</span>
              <strong>Page {pageNo}</strong>
            </div>
            <Collapse
              ghost
              className="daily-report-collapse"
              activeKey={expandedKeys}
              onChange={(keys) => setExpandedKeys(Array.isArray(keys) ? keys : keys ? [keys] : [])}
              items={paginatedItems.map((item, index) => ({
                key: String((pageNo - 1) * pageSize + index),
                label: (
                  <div className="daily-report-summary-row">
                    <span className="daily-report-member">
                      <span className="daily-report-avatar">
                        {item.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                      {item.name}
                    </span>
                    <span>{item.today}</span>
                    <span>{item.overdue}</span>
                    <span>{item.upcoming}</span>
                    <span>{item.total}</span>
                  </div>
                ),
                children: (
                  <div className="daily-report-expanded-grid">
                    <DailyMetric label="Today" value={item.today} color="#22c55e" />
                    <DailyMetric label="Overdue" value={item.overdue} color="#fbbc04" />
                    <DailyMetric label="Upcoming" value={item.upcoming} color="#2196f3" />
                    <DailyMetric label="Total" value={item.total} color="#dc2626" />
                  </div>
                ),
              }))}
            />
            <div className="daily-report-pagination">
              <Pagination
                current={pageNo}
                pageSize={pageSize}
                total={items.length}
                onChange={(page, size) => {
                  setPageNo(page);
                  setPageSize(size);
                }}
                size="middle"
                showSizeChanger={true}
                pageSizeOptions={["10", "25", "50", "100"]}
                responsive
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function EmptyReportState() {
  return (
    <div className="reports-empty-state">
      <NoDataFoundIcon />
      <h3>No Report Found</h3>
      <p>Apply Filter To Generate Reports</p>
    </div>
  );
}

function DetailActions({ reportKey, onDownload, onSchedule, onHistory }) {
  if (reportKey === "project-report") {
    return null;
  }

  if (reportKey === "daily-report") {
    return (
      <div className="reports-actions">
        <Button className="btn-secondary" onClick={onDownload}>
          Download <DownloadOutlined />
        </Button>
      </div>
    );
  }

  return (
    <div className="reports-actions">
      {/* <Button className="reports-action-button" onClick={onHistory}>
        History <HistoryOutlined />
      </Button> */}
      <Button className="btn-secondary" onClick={onDownload}>
        Download <DownloadOutlined />
      </Button>
    </div>
  );
}

function MetricCard({ color, value, label, solid, secondaryValueColor }) {
  const number = typeof value === "string" && value.includes("/") ? Number(value.split("/")[0]) : Number(value);
  const total = typeof value === "string" && value.includes("/") ? Number(value.split("/")[1]) : 1;
  const percent = total > 0 ? Math.round((number / total) * 100) : 0;

  return (
    <div className="project-report-stat-card">
      <div className="project-report-pattern" />
      {solid ? (
        <div className="project-report-solid-dot" style={{ backgroundColor: color }}>
          {value}
        </div>
      ) : (
        <Progress
          type="circle"
          percent={percent}
          strokeColor={color}
          trailColor="#f1f5f9"
          size={130}
          format={() => <span style={{ color: secondaryValueColor || color, fontWeight: 700 }}>{value}</span>}
        />
      )}
      <h3>{label}</h3>
    </div>
  );
}

function DailyMetric({ label, value, color }) {
  return (
    <div className="daily-report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="daily-report-line" style={{ backgroundColor: color }} />
    </div>
  );
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describePieSlice(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function SimplePieChart({ data, colors, size = 240 }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const radius = size / 2 - 4;
  const center = size / 2;
  let accumulatedAngle = 0;

  return (
    <div className="simple-pie-chart-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="simple-pie-chart" role="img" aria-label="Hours by User pie chart">
        {data.map((item, index) => {
          const value = Number(item.value || 0);
          const percentage = total > 0 ? value / total : 0;
          const sliceAngle = percentage * 360;
          const startAngle = accumulatedAngle;
          const endAngle = accumulatedAngle + sliceAngle;
          accumulatedAngle += sliceAngle;

          const midAngle = startAngle + sliceAngle / 2;
          const labelPosition = polarToCartesian(center, center, radius * 0.72, midAngle);
          const tooltipPosition = polarToCartesian(center, center, radius * 0.95, midAngle);

          return (
            <g
              key={`${item.label}-${index}`}
              onMouseEnter={() =>
                setHoveredSlice({
                  label: item.label,
                  value,
                  x: tooltipPosition.x,
                  y: tooltipPosition.y,
                })
              }
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <path
                d={describePieSlice(center, center, radius, startAngle, endAngle)}
                fill={colors[index % colors.length]}
                stroke="#ffffff"
                strokeWidth="2"
              >
                <title>{`${item.label}: ${value}`}</title>
              </path>
              {percentage >= 0.06 ? (
                <text
                  x={labelPosition.x}
                  y={labelPosition.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="700"
                >
                  {value}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {hoveredSlice ? (
        <div
          className="simple-pie-tooltip"
          style={{
            left: hoveredSlice.x,
            top: hoveredSlice.y,
          }}
        >
          {hoveredSlice.label}: {hoveredSlice.value}
        </div>
      ) : null}
    </div>
  );
}

function isCompletedTask(task) {
  return DONE_STATUSES.includes(String(task?.task_status?.title || "").trim().toLowerCase());
}

function buildUserRows(tasks, filters, selectedDate, userMap, users = []) {
  const today = selectedDate || moment();
  const selectedUser =
    filters.userId && filters.userId !== "all" ? userMap[filters.userId] : null;

  const grouped = {};

  const seedUsers = selectedUser
    ? [selectedUser]
    : users.filter((user) => user.value && user.value !== "all");

  seedUsers.forEach((user) => {
    const userKey = String(user.value);
    grouped[userKey] = {
      key: userKey,
      user: user.label || "Unknown",
      project: "-",
      projectIds: new Set(),
      total: 0,
      completed: 0,
      incomplete: 0,
      pending: 0,
      dueToday: 0,
      overdue: 0,
    };
  });

  tasks.forEach((task) => {
    const due = task?.due_date ? moment(task.due_date) : null;
    const overdue = due && due.isBefore(today.clone().startOf("day")) && !isCompletedTask(task);
    const matchStatus =
      filters.status === "all" ||
      (filters.status === "completed" && isCompletedTask(task)) ||
      (filters.status === "pending" && !isCompletedTask(task)) ||
      (filters.status === "overdue" && overdue);

    if (!matchStatus) {
      return;
    }

    const projectId = task?.project?._id || task?.project_id?._id || task?.project_id || task?.project;
    const projectTitle = task?.project?.title || task?.project_id?.title || "Unknown";

    normalizeTaskOwners(task, userMap).forEach((assignee) => {
      if (selectedUser && assignee.id !== String(selectedUser.value)) {
        return;
      }

      const key = String(assignee.id || "unknown");
      if (!grouped[key]) {
        grouped[key] = {
          key,
          user: assignee.name || "Unassigned",
          project: "-",
          projectIds: new Set(),
          total: 0,
          completed: 0,
          incomplete: 0,
          pending: 0,
          dueToday: 0,
          overdue: 0,
        };
      }

      if (projectId) {
        grouped[key].projectIds.add(String(projectId));
        // We store the first title encountered for single-project display
        if (!grouped[key].firstProjectTitle || grouped[key].firstProjectTitle === "Unknown") {
          grouped[key].firstProjectTitle = projectTitle;
        }
      }

      grouped[key].total += 1;
      if (isCompletedTask(task)) {
        grouped[key].completed += 1;
      } else {
        grouped[key].pending += 1;
      }
      if (due && due.isSame(today, "day")) {
        grouped[key].dueToday += 1;
      }
      if (overdue) {
        grouped[key].overdue += 1;
      }
      grouped[key].incomplete = Math.max(grouped[key].total - grouped[key].completed, 0);
    });
  });

  return Object.values(grouped).map((row) => {
    const count = row.projectIds.size;
    if (count === 0) {
      row.project = "Not Assigned";
    } else if (count === 1) {
      row.project = row.firstProjectTitle || "1 Project";
    } else {
      row.project = `${count} Projects`;
    }
    delete row.projectIds;
    delete row.firstProjectTitle;
    return row;
  });
}

function buildStatusRows(tasks, filters, selectedDate, userMap) {
  const today = selectedDate || moment();
  const selectedUser =
    filters.userId && filters.userId !== "all" ? userMap[filters.userId] : null;
  const grouped = {};

  tasks.forEach((task) => {
    const hasUser =
      !selectedUser ||
      normalizeTaskOwners(task, userMap).some((assignee) => assignee.id === String(selectedUser.value));
    if (!hasUser) {
      return;
    }

    const due = task?.due_date ? moment(task.due_date) : null;
    const overdue = due && due.isBefore(today.clone().startOf("day")) && !isCompletedTask(task);
    const statusName = task?.task_status?.title || "Unknown";

    if (
      filters.status !== "all" &&
      !(
        (filters.status === "completed" && isCompletedTask(task)) ||
        (filters.status === "pending" && !isCompletedTask(task)) ||
        (filters.status === "overdue" && overdue)
      )
    ) {
      return;
    }

    if (!grouped[statusName]) {
      grouped[statusName] = {
        key: statusName,
        status: statusName,
        tasks: 0,
        projects: new Set(),
        users: new Set(),
      };
    }

    grouped[statusName].tasks += 1;
    if (task?.project?.title) {
      grouped[statusName].projects.add(task.project.title);
    }
    normalizeTaskOwners(task, userMap).forEach((assignee) => {
      if (!selectedUser || assignee.id === String(selectedUser.value)) {
        grouped[statusName].users.add(assignee.name || "Unassigned");
      }
    });
  });

  return Object.values(grouped).map((row) => ({
    key: row.key,
    status: row.status,
    tasks: row.tasks,
    projects: row.projects.size,
    users: row.users.size,
  }));
}

function buildTaskPayload({ viewAll = false, status = "all", startDate = null, endDate = null, projectIds = [], search = null, userId = null } = {}) {
  const payload = {};

  if (viewAll) {
    payload.view_all = true;
  }

  if (status && status !== "all") {
    payload.status = status;
  }

  if (Array.isArray(projectIds) && projectIds.length > 0) {
    payload.project_id = projectIds;
  }

  if (startDate) {
    payload.start_date = startDate;
  }

  if (endDate) {
    payload.end_date = endDate;
  }

  if (search && search.trim()) {
    payload.search = search.trim();
  }

  if (userId && userId !== "all") {
    payload.user_id = userId;
  }

  return payload;
}

function getProjectRecordId(project) {
  if (!project) {
    return "";
  }

  const rawId =
    project._id ||
    project.id ||
    project.project_id?._id ||
    project.project_id ||
    project.project?._id;

  return rawId ? String(rawId) : "";
}

function getProjectRecordTitle(project) {
  return (
    project?.title ||
    project?.project_name ||
    project?.name ||
    project?.project_id?.title ||
    "Untitled Project"
  );
}

function getProjectRecordStartDate(project) {
  return (
    project?.start_date ||
    project?.project_id?.start_date ||
    null
  );
}

function getProjectRecordEndDate(project) {
  return (
    project?.end_date ||
    project?.project_id?.end_date ||
    null
  );
}

function getProjectRecordStatus(project) {
  return (
    project?.project_statusName ||
    project?.project_status?.title ||
    project?.statusName ||
    project?.status?.title ||
    project?.status ||
    "-"
  );
}

function parseReportDate(dateValue) {
  if (!dateValue || dateValue === "-") {
    return null;
  }

  const parsed = moment(dateValue, ["DD-MM-YYYY", moment.ISO_8601], true);
  return parsed.isValid() ? parsed : null;
}

function toPickerDayjs(dateValue) {
  const parsed = parseReportDate(dateValue);
  return parsed ? dayjs(parsed.toDate()) : null;
}

function toPickerRange(dateValues = []) {
  if (!Array.isArray(dateValues) || dateValues.length < 2) {
    return null;
  }

  const parsedRange = dateValues.map((dateValue) => toPickerDayjs(dateValue));
  return parsedRange.every(Boolean) ? parsedRange : null;
}

function getReportDateRange(filters = {}) {
  const hasRange = Array.isArray(filters?.date) && filters.date.length >= 2;
  const startValue = hasRange ? filters.date[0] : filters?.startDate || null;
  const endValue = hasRange ? filters.date[1] : filters?.endDate || null;
  const startMoment = parseReportDate(startValue)?.startOf("day") || null;
  const endMoment = parseReportDate(endValue)?.endOf("day") || null;
  const selectedDate = parseReportDate(hasRange ? filters.date[0] : filters?.date) || startMoment;

  return {
    startValue,
    endValue,
    startIso: startMoment ? startMoment.format("YYYY-MM-DD") : null,
    endIso: endMoment ? endMoment.format("YYYY-MM-DD") : null,
    startMoment,
    endMoment,
    selectedDate,
  };
}

function filterProjectReportRecords(projects = [], searchQuery = "") {
  const normalizedSearch = String(searchQuery || "").trim().toLowerCase();
  if (!normalizedSearch) {
    return projects;
  }

  return projects.filter((project) => {
    const searchHaystack = [
      getProjectRecordTitle(project),
      project?.projectId,
      project?.descriptions,
      getProjectRecordStatus(project),
      project?.managerName,
      project?.project_typeName,
      ...(Array.isArray(project?.technologyName) ? project.technologyName : [project?.technologyName]),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())
      .join(" ");

    return searchHaystack.includes(normalizedSearch);
  });
}

function summarizeProjectReportProjects(projects = [], projectProgressMap = {}) {
  let totalTasks = 0;
  let completedTasks = 0;

  projects.forEach((project) => {
    const projectMetrics = projectProgressMap[getProjectRecordId(project)] || { total: 0, completed: 0 };
    totalTasks += projectMetrics.total;
    completedTasks += projectMetrics.completed;
  });

  return {
    totalProjects: projects.length,
    totalTasks,
    completedTasks,
    incompleteTasks: Math.max(totalTasks - completedTasks, 0),
  };
}

function mapProjectReportRows(projects = [], projectProgressMap = {}) {
  return projects.map((project) => {
    const projectId = getProjectRecordId(project);
    const projectMetrics = projectProgressMap[projectId] || { total: 0, completed: 0 };
    const projectProgress = projectMetrics.total > 0 ? Math.round((projectMetrics.completed / projectMetrics.total) * 100) : 0;

    return {
      key: projectId,
      taskName: getProjectRecordTitle(project),
      progress: projectProgress,
      startDate: formatDate(getProjectRecordStartDate(project)),
      endDate: formatDate(getProjectRecordEndDate(project)),
      status: getProjectRecordStatus(project),
    };
  });
}

function mergeProjectRows(primaryProjects = [], fallbackProjects = []) {
  const merged = new Map();

  [...fallbackProjects, ...primaryProjects].forEach((project) => {
    const projectId = getProjectRecordId(project);
    if (!projectId) {
      return;
    }

    const existing = merged.get(projectId) || {};
    merged.set(projectId, { ...existing, ...project });
  });

  return Array.from(merged.values());
}

function getTaskProjectId(task) {
  const rawId =
    task?.project?._id ||
    task?.project_id?._id ||
    task?.project_id ||
    task?.project;

  return rawId ? String(rawId) : "";
}

function extractTaskRows(result) {
  if (result?.status !== "fulfilled") {
    return [];
  }

  const rows = result?.value?.data?.data;
  return Array.isArray(rows) ? rows : [];
}

function mergeUniqueTasks(tasks) {
  const seen = new Map();

  tasks.forEach((task, index) => {
    const key =
      String(task?._id || "") ||
      String(task?.taskId || "") ||
      `${task?.title || "task"}-${task?.due_date || ""}-${index}`;

    if (!seen.has(key)) {
      seen.set(key, task);
    }
  });

  return Array.from(seen.values());
}

function buildDailyData(tasks, selectedDate, userMap, searchQuery = null) {
  const day = selectedDate || moment();

  const makeGroups = (predicate) => {
    const grouped = {};
    const filteredTasks = tasks.filter(predicate);

    filteredTasks.forEach((task) => {
      const assignees = normalizeTaskOwners(task, userMap);
      assignees.forEach((assignee) => {
        const key = assignee.id || assignee.name || "unassigned";
        const due = task?.due_date ? moment(task.due_date) : null;
        if (!grouped[key]) {
          grouped[key] = {
            name: assignee.name || "Unassigned",
            today: 0,
            overdue: 0,
            upcoming: 0,
            total: 0,
          };
        }

        if (due && due.isSame(day, "day")) {
          grouped[key].today += 1;
        } else if (due && due.isBefore(day.clone().startOf("day"))) {
          grouped[key].overdue += 1;
        } else {
          grouped[key].upcoming += 1;
        }

        grouped[key].total += 1;
      });
    });

    const rows = Object.values(grouped);
    if (rows.length > 0 || filteredTasks.length === 0) {
      return rows;
    }

    const fallback = filteredTasks.reduce(
      (acc, task) => {
        const due = task?.due_date ? moment(task.due_date) : null;
        if (due && due.isSame(day, "day")) {
          acc.today += 1;
        } else if (due && due.isBefore(day.clone().startOf("day"))) {
          acc.overdue += 1;
        } else {
          acc.upcoming += 1;
        }
        acc.total += 1;
        return acc;
      },
      { name: "All Members", today: 0, overdue: 0, upcoming: 0, total: 0 }
    );

    return [fallback];
  };

  const applySearchFilter = (rows) => {
    if (!searchQuery || !searchQuery.trim()) {
      return rows;
    }
    const searchTerm = searchQuery.trim().toLowerCase();
    return rows.filter(row =>
      row.name && row.name.toLowerCase().includes(searchTerm)
    );
  };

  return {
    pending: applySearchFilter(makeGroups((task) => !isCompletedTask(task))),
    completed: applySearchFilter(makeGroups((task) => isCompletedTask(task))),
    morning: applySearchFilter(makeGroups((task) => moment(task.createdAt).isSame(day, "day") && moment(task.createdAt).hour() < 12)),
    evening: applySearchFilter(makeGroups((task) => moment(task.createdAt).isSame(day, "day") && moment(task.createdAt).hour() >= 12)),
  };
}

function normalizeUsers(rawUsers, userMap) {
  if (!Array.isArray(rawUsers) || rawUsers.length === 0) {
    return [];
  }

  return rawUsers.map((assignee, index) => {
    if (typeof assignee === "string") {
      const mappedUser = userMap && userMap[assignee];
      return {
        id: String(assignee),
        name: mappedUser?.label || "Assigned User",
      };
    }

    if (assignee && typeof assignee === "object") {
      const id = String(assignee._id || assignee.id || `assignee-${index}`);
      const mappedUser = userMap && userMap[id];
      return {
        id,
        name:
          assignee.full_name ||
          assignee.name ||
          assignee.first_name ||
          mappedUser?.label ||
          "Assigned User",
      };
    }

    return { id: String(`assignee-${index}`), name: "Assigned User" };
  });
}

function normalizeTaskOwners(task, userMap) {
  const assignees = normalizeUsers(task?.assignees, userMap);
  if (assignees.length > 0) {
    return assignees;
  }

  const creators = normalizeUsers(task?.createdBy ? [task.createdBy] : [], userMap);
  if (creators.length > 0) {
    return creators;
  }

  return [{ id: "unassigned", name: "Unassigned" }];
}

function formatDate(dateValue) {
  return dateValue ? moment(dateValue).format("DD-MM-YYYY") : "-";
}

function formatDateTime(dateValue) {
  return dateValue ? moment(dateValue).format("DD-MM-YYYY") : "-";
}

function formatText(value) {
  if (!value) {
    return "-";
  }
  return String(value)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("ReportsHub chart render failed", error);
  }

  render() {
    if (this.state.hasError) {
      return <Empty description="Chart unavailable" />;
    }

    return this.props.children;
  }
}

function buildRunningProjectChartData(items, labelKey, fallbackLabel) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.reduce((acc, item, index) => {
    if (!item || typeof item !== "object") {
      return acc;
    }

    const labelValue = item[labelKey];
    const name =
      typeof labelValue === "string" && labelValue.trim()
        ? labelValue.trim()
        : `${fallbackLabel} ${index + 1}`;
    const value = Number(item.totalProjects || 0);

    if (!Number.isFinite(value) || value <= 0) {
      return acc;
    }

    acc.push({ name, value });
    return acc;
  }, []);
}

function ProjectRunningReportContent({ data, filters, pageNo, pageSize, total, setPageNo, setPageSize }) {
  const projects = Array.isArray(data?.data) ? data.data : [];
  const managers = Array.isArray(data?.managers) ? data.managers : [];
  const types = Array.isArray(data?.types) ? data.types : [];
  const technologies = Array.isArray(data?.technologies) ? data.technologies : [];
  const metadata =
    data?.metadata && typeof data.metadata === "object" ? data.metadata : {};
  const searchText = filters?.search || "";
  // Prepared chart data from API metadata (from INCOMING)
  const managerChartData = buildRunningProjectChartData(managers, "managerName", "Manager");
  const typeChartData = buildRunningProjectChartData(types, "project_typeName", "Type");
  const techChartData = buildRunningProjectChartData(technologies, "technologyName", "Technology");

  // Table columns
  const columns = [
    {
      title: "Project Name",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <Link to={`/${localStorage.getItem("companyDomain")}/project/app/${record._id}`}>
          {text}
        </Link>
      ),
    },
    {
      title: "Project Manager",
      dataIndex: "managerName",
      key: "managerName",
    },
    // Department column hidden
    // {
    //   title: "Department",
    //   dataIndex: "technologyName",
    //   key: "technologyName",
    //   render: (techArray) => (
    //     <div>
    //       {(Array.isArray(techArray) ? techArray : techArray ? [techArray] : []).map((tech, index) => (
    //         <span key={index} className="tech-tag">
    //           {tech}
    //         </span>
    //       ))}
    //     </div>
    //   ),
    // },
    {
      title: "Category",
      dataIndex: "project_typeName",
      key: "project_typeName",
    },
    {
      title: "Est. Hours",
      dataIndex: "estimatedHours",
      key: "estimatedHours",
      align: "center",
    },
    {
      title: "Used Hours",
      dataIndex: "total_logged_time",
      key: "total_logged_time",
      align: "center",
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      render: (date) => formatDate(date),
      align: "center",
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      render: (date) => formatDate(date),
      align: "center",
    },
  ];

  return (
    <div className="project-running-report">
      {/* Summary Stats - Based on FILTERED data */}
      <div className="report-summary-stats">
        <div className="stat-card">
          <h3>Total Projects</h3>
          <span className="stat-value">{total}</span>
        </div>
        <div className="stat-card">
          <h3>Total Managers</h3>
          <span className="stat-value">{managerChartData.length}</span>
        </div>
        <div className="stat-card">
          <h3>Total Types</h3>
          <span className="stat-value">{typeChartData.length}</span>
        </div>
        <div className="stat-card">
          <h3>Total Technologies</h3>
          <span className="stat-value">{techChartData.length}</span>
        </div>
      </div>

      {/* Search Result Info */}
      {searchText && (
        <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', color: '#0369a1' }}>
          Showing {projects.length} of {total} projects matching "{searchText}"
        </div>
      )}

      {/* Charts */}
      <div className="charts-section">
        <div className="charts-grid">
          {managerChartData.length > 0 && (
            <div className="chart-card chart-card--manager">
              <h3>Projects by Manager</h3>
              <ChartErrorBoundary>
                {managerChartData.length === 0 ? (
                  <NoGraphFound />
                ) : (
                  <ReactApexChart
                    options={{
                      chart: { type: "pie" },
                      labels: managerChartData.map((item) => item.name),
                      legend: { position: "bottom" },
                      dataLabels: { enabled: true },
                      colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"],
                    }}
                    series={managerChartData.map((item) => item.value)}
                    type="pie"
                    height={230}
                  />
                )}
              </ChartErrorBoundary>
            </div>
          )}

          {typeChartData.length > 0 && (
            <div className="chart-card chart-card--type">
              <h3>Projects by Type</h3>
              <ChartErrorBoundary>
                {typeChartData.length === 0 ? (
                  <NoGraphFound />
                ) : (
                  <ReactApexChart
                    options={{
                      chart: { type: "bar" },
                      plotOptions: {
                        bar: {
                          horizontal: true,
                          borderRadius: 4,
                        },
                      },
                      dataLabels: { enabled: false },
                      xaxis: {
                        categories: typeChartData.map((item) => item.name),
                      },
                      colors: ["#6366f1"],
                    }}
                    series={[{ data: typeChartData.map((item) => item.value), name: "Projects" }]}
                    type="bar"
                    height={230}
                  />
                )}
              </ChartErrorBoundary>
            </div>
          )}

          {techChartData.length > 0 && (
            <div className="chart-card chart-card--technology">
              <h3>Projects by Technology</h3>
              <ChartErrorBoundary>
                {techChartData.length === 0 || techChartData.every(item => Number(item.value || 0) === 0) ? (
                  <NoGraphFound />
                ) : (
                  <ReactApexChart
                    options={{
                      chart: { type: "bar" },
                      legend: { show: false },
                      plotOptions: {
                        bar: {
                          borderRadius: 6,
                          columnWidth: "42%",
                        },
                      },
                      dataLabels: { enabled: false },
                      xaxis: {
                        categories: techChartData.map((item) => String(item.name || "")),
                        labels: { style: { fontSize: "11px", colors: "#374151" }, rotate: -45 },
                      },
                      colors: ["#10b981"],
                      grid: { borderColor: "#e5e7eb" },
                    }}
                    series={[{ data: techChartData.map((item) => Number(item.value || 0)), name: "Projects" }]}
                    type="bar"
                    height={260}
                  />
                )}
              </ChartErrorBoundary>
            </div>
          )}
        </div>
      </div>

      {/* Projects Table */}
      <div className="projects-table-section">
        <div className="table-header">
          <h3>Projects List</h3>
          <span className="total-count">Total: {total}</span>
        </div>

        {projects.length > 0 ? (
          <Table
            columns={columns}
            dataSource={projects}
            rowKey={(record) =>
              String(
                record?._id ||
                record?.id ||
                record?.project_id ||
                record?.title ||
                record?.managerName ||
                "project-row"
              )
            }
            pagination={{
              current: pageNo,
              pageSize: pageSize,
              total: total,
              onChange: (page, size) => {
                setPageNo(page);
                setPageSize(size);
              },
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ["10", "20", "25", "30"],
            }}
            scroll={{ x: "max-content" }}
            size="middle"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
            <NoDataFoundIcon />
            <span style={{ marginTop: 16, color: '#7b8898', fontSize: 16 }}>
              {searchText ? "No projects found matching your search" : "No project data found"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TimesheetReportContent({
  data,
  filters,
  loading,
  pageNo,
  pageSize,
  total,
  setPageNo,
  setPageSize,
}) {
  const { data: timesheets = [], summary = {}, totalHours = "0" } = data;
  const searchText = filters?.search || "";
  const timesheetUserChartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Calculate chart data based on timesheets
  const calculateTimesheetChartData = (timesheetList) => {
    const userStats = {};
    const managerStats = {};
    const typeStats = {};

    timesheetList.forEach(timesheet => {
      const userName = timesheet.user || 'Unknown';
      const hours = parseFloat(timesheet.logged_time?.split(':')[0] || '0');
      userStats[userName] = (userStats[userName] || 0) + hours;

      const mgr = timesheet.projectManager || 'Unknown';
      managerStats[mgr] = (managerStats[mgr] || 0) + hours;

      const projectType = timesheet.projectType || 'Unknown';
      typeStats[projectType] = (typeStats[projectType] || 0) + hours;
    });

    return {
      users: Object.entries(userStats).map(([name, value]) => ({ user: name, totalLoggedHours: value.toFixed(1) })),
      managers: Object.entries(managerStats).map(([name, value]) => ({ projectManager: name, totalLoggedHours: value.toFixed(1) })),
      types: Object.entries(typeStats).map(([name, value]) => ({ projectType: name, totalLoggedHours: value.toFixed(1) })),
    };
  };

  const chartData = calculateTimesheetChartData(timesheets);
  const userChartData = chartData.users;
  const managerChartData = chartData.managers;
  const typeChartData = chartData.types;

  const columns = [
    {
      title: "User",
      dataIndex: "user",
      key: "user",
    },
    {
      title: "Project",
      dataIndex: "project",
      key: "project",
    },
    {
      title: "Description",
      dataIndex: "descriptions",
      key: "descriptions",
      render: (text) => {
        if (!text) return "-";
        // Strip HTML tags for display
        const plainText = text.replace(/<[^>]*>/g, '');
        return plainText.length > 50 ? plainText.substring(0, 50) + "..." : plainText;
      },
    },
    {
      title: "Logged Time",
      dataIndex: "logged_time",
      key: "logged_time",
      align: "center",
      render: (time) => {
        if (!time) return "-";
        const parts = String(time).split(":");
        if (parts.length < 2) return time;
        const h = String(parts[0]).padStart(2, "0");
        const m = String(parts[1]).padStart(2, "0");
        return `${h}:${m}`;
      },
    },
    {
      title: "Date",
      dataIndex: "logged_date",
      key: "logged_date",
      render: (date) => formatDate(date),
      align: "center",
    },
    {
      title: "Project Manager",
      dataIndex: "projectManager",
      key: "projectManager",
    },
    {
      title: "Technology",
      dataIndex: "projectTechnology",
      key: "projectTechnology",
      render: (techArray) => (
        <div>
          {techArray?.map((tech, index) => (
            <span key={index} className="tech-tag">
              {tech}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "projectType",
      key: "projectType",
    },
  ];

  return (
    <div className="timesheet-report">
      {/* Summary Stats - Based on FILTERED data */}
      <div className="report-summary-stats">
        <div className="stat-card">
          <h3>Total Hours</h3>
          <span className="stat-value">
            {loading && timesheets.length === 0 ? (
              <SkeletonBlock w={60} h={32} />
            ) : (
              calculateTimesheetChartData(timesheets)
                .users.reduce(
                  (sum, user) => sum + parseFloat(user.totalLoggedHours),
                  0
                )
                .toFixed(1)
            )}
          </span>
        </div>
        <div className="stat-card">
          <h3>Total Entries</h3>
          <span className="stat-value">
            {loading && timesheets.length === 0 ? (
              <SkeletonBlock w={60} h={32} />
            ) : (
              total
            )}
          </span>
        </div>
        <div className="stat-card">
          <h3>Unique Users</h3>
          <span className="stat-value">
            {loading && timesheets.length === 0 ? (
              <SkeletonBlock w={60} h={32} />
            ) : (
              userChartData.length
            )}
          </span>
        </div>
        <div className="stat-card">
          <h3>Unique Projects</h3>
          <span className="stat-value">
            {loading && timesheets.length === 0 ? (
              <SkeletonBlock w={60} h={32} />
            ) : (
              managerChartData.length
            )}
          </span>
        </div>
      </div>

      {/* Search Result Info */}
      {searchText && (
        <div className="timesheet-search-summary">
          Showing {timesheets.length} of {total} entries matching "{searchText}"
        </div>
      )}

      {/* Charts */}
      {loading && timesheets.length === 0 ? (
        <TimesheetChartsSkeleton />
      ) : (
        <div className="timesheet-charts-section">
          <div className="timesheet-charts-grid">
            {userChartData.length > 0 && (
              <div className="chart-card chart-card--timesheet chart-card--timesheet-user">
                <h3>Hours by User</h3>
                <div className="timesheet-user-pie-wrap">
                  <SimplePieChart
                    size={240}
                    colors={timesheetUserChartColors}
                    data={userChartData.map((item) => ({
                      label: item.user,
                      value: parseFloat(item.totalLoggedHours),
                    }))}
                  />
                </div>
              </div>
            )}

            {managerChartData.length > 0 && (
              <div className="chart-card chart-card--timesheet chart-card--timesheet-manager">
                <h3>Hours by Manager</h3>
                {managerChartData.length === 0 || managerChartData.every(item => parseFloat(item.totalLoggedHours) === 0) ? (
                  <NoGraphFound />
                ) : (
                  <ReactApexChart
                    options={{
                      chart: { type: 'bar', toolbar: { show: false } },
                      legend: { show: false },
                      plotOptions: {
                        bar: {
                          horizontal: true,
                          borderRadius: 6,
                          barHeight: "46%",
                        },
                      },
                      dataLabels: {
                        enabled: true,
                        style: { fontSize: "11px", colors: ["#ffffff"] },
                      },
                      xaxis: {
                        categories: managerChartData.map(item => item.projectManager),
                        labels: { style: { fontSize: "12px", colors: "#64748b" } },
                      },
                      grid: { borderColor: "#e2e8f0" },
                      colors: ["#60a5fa"],
                    }}
                    series={[{ data: managerChartData.map(item => parseFloat(item.totalLoggedHours)) }]}
                    type="bar"
                    height={250}
                  />
                )}
              </div>
            )}

            {typeChartData.length > 0 && (
              <div className="chart-card chart-card--timesheet chart-card--timesheet-type">
                <h3>Hours by Category</h3>
                {typeChartData.length === 0 || typeChartData.every(item => parseFloat(item.totalLoggedHours) === 0) ? (
                  <NoGraphFound />
                ) : (
                  <ReactApexChart
                    options={{
                      chart: { type: 'bar', toolbar: { show: false } },
                      legend: { show: false },
                      plotOptions: {
                        bar: {
                          borderRadius: 8,
                          columnWidth: "42%",
                        },
                      },
                      dataLabels: { enabled: false },
                      xaxis: {
                        categories: typeChartData.map(item => item.projectType),
                        labels: { style: { fontSize: "12px", colors: "#64748b" } },
                      },
                      yaxis: {
                        labels: { style: { colors: "#64748b" } },
                      },
                      grid: { borderColor: "#e2e8f0" },
                      colors: ["#34d399"],
                    }}
                    series={[{ data: typeChartData.map(item => parseFloat(item.totalLoggedHours)) }]}
                    type="bar"
                    height={240}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timesheet Table */}
      <div className="timesheet-table-section">
        <div className="table-header">
          <h3>Timesheet Entries</h3>
          <span className="total-count">Total: {total}</span>
        </div>

        {loading && timesheets.length === 0 ? (
          <TableSk
            cols={["2fr", "1.5fr", "2fr", "1fr", "1fr", "1.2fr", "1fr"]}
            rows={8}
          />
        ) : timesheets.length > 0 ? (
          <Table
            columns={columns}
            dataSource={timesheets}
            rowKey="_id"
            pagination={{
              current: pageNo,
              pageSize: pageSize,
              total: total,
              onChange: (page, size) => {
                setPageNo(page);
                setPageSize(size);
              },
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ["10", "20", "25", "30"],
            }}
            scroll={{ x: "max-content" }}
            size="middle"
            loading={loading}
          />
        ) : (
          !loading && (
            <Empty
              description={
                searchText
                  ? "No timesheet entries found matching your search"
                  : "No timesheet data found"
              }
            />
          )
        )}
      </div>
    </div>
  );
}

export default ReportsHub;
