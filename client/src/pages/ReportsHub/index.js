import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DownOutlined,
  EyeOutlined,
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
  Descriptions,
  Dropdown,
  Input,
  message,
  Modal,
  Pagination,
  Progress,
  Table,
  Tabs,
  Tag,
} from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { BarChartPro, DonutChartPro, StackedBarChartPro } from "../../components/common/charts";
import { Link, useHistory, useParams } from "react-router-dom";
import Service from "../../service";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import {
  ReportsDetailSkeleton,
  TimesheetChartsSkeleton,
  TableSk,
  SkeletonBlock,
  ReportTableSkeleton,
  UserPerformanceReportSkeleton,
  DailyReportSkeleton,
  ProjectRunningReportSkeleton,
  UserReportDetailSkeleton,
} from "../../components/common/SkeletonLoader";
import {
  getMasterProjects,
  getProjectReportBundle,
  getReportEmployees,
  prefetchReport,
  prefetchSharedReportData,
} from "./reportsDataCache";
import ColumnSelector from "../../components/common/ColumnSelector";
import PageHeader from "../../components/common/PageHeader";
import useColumnVisibility from "../../hooks/useColumnVisibility";
import useExportColumns, { buildExportRows, toExportOptions } from "../../hooks/useExportColumns";
import { hrmsBluePalette, HRMS_CHART_STATUS_BLUES } from "../../util/chartTheme";
import "./reports-hub.css";

const DONE_STATUSES = ["done", "closed"];

const getProgressColor = (value) => {
  if (value === 100) return "#0367ae"; // Dark blue
  if (value >= 70) return "#038fde"; // Blue
  if (value >= 40) return "#7db3db"; // Light blue
  return "#15507b"; // Navy for low progress
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
  const { requestExport, exportColumnsModal } = useExportColumns();
  const [loading, setLoading] = useState(Boolean(reportKey));
  const [optionsLoading, setOptionsLoading] = useState(Boolean(reportKey));
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [focusedProjectIds, setFocusedProjectIds] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  // Lives at the root (never unmounts) because the User Report tab's own content
  // tree gets torn down and rebuilt on every page/filter refetch (the top-level
  // loading skeleton swap below, plus the rowData.length > 0 gate inside
  // DynamicReportContent) - any state kept closer to that content loses its value
  // on every single page change.
  const [userReportViewMode, setUserReportViewMode] = useState("chart");
  const [reportData, setReportData] = useState({
    project: {
      summary: {
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        incompleteTasks: 0,
      },
      rows: [],
      hoursByUser: [],
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
  // Cache for the computed project progress map - avoids re-fetching 5000 tasks on search
  // Stores: { projectProgressMap, totalTasks, completedTasks, absoluteTotal }
  const taskProgressCacheRef = useRef(null);
  // Lazily-fetched "Hours by User" rows, keyed by (projects, users, date range).
  const hoursByUserCacheRef = useRef({});
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

  // The project list is ONE shared request from the Reports data layer (./reportsDataCache):
  // the landing page prefetches it, and the dropdown + project report reuse the same
  // cached / in-flight promise instead of fetching it again.
  const fetchAllProjects = useCallback(async ({ signal } = {}) => {
    try {
      const response = await getMasterProjects();
      if (signal?.aborted) return [];
      const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
      setProjects(rows.map((p) => ({ value: p._id, label: p.title })));
      return rows;
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
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

      // Employees and projects are independent, so both go out together; each comes from the
      // shared cache (prefetched by the /reports landing page when the user came through it).
      const projectsPromise = fetchAllProjects({ includeClosed: true, signal });
      const employeeResponse = await getReportEmployees();

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

      await projectsPromise;

    } catch (error) {
      console.error("loadDropdowns failed:", error);
    } finally {
      fetchingRef.current = false;
      setOptionsLoading(false);
    }
  }, [fetchAllProjects, reportKey]);

  // pageNo / pageSize are read through a ref so a page change doesn't give
  // loadReportData a new identity (the effect below decides what a page change reloads).
  const previousLoaderRef = useRef(null);
  const previousReportKeyRef = useRef(null);
  const pageRef = useRef({ pageNo: 1, pageSize: 25 });
  pageRef.current = { pageNo, pageSize };

  const loadReportData = useCallback(async ({ silent = false, signal, pageOnly = false } = {}) => {
    if (!reportKey) {
      return;
    }
    const { pageNo, pageSize } = pageRef.current;

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
        // Robust parsing for total counts from various API response shapes
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

        // Everything the project report needs that does NOT depend on table page / sort comes
        // from the shared Reports data layer (./reportsDataCache): one wave (report list, project
        // list, grouped per-project task counts, + the same counts for a top project filter),
        // cached briefly per (search, date range, project filter) and deduped. When the user came
        // through the /reports landing page and hovered the card, this is already in flight or
        // done. The heavy per-user timesheet query is NOT part of it: it is loaded on demand
        // (hours modal / CSV export) - see fetchHoursByUser.
        const hasProjectFilter = selectedProjectIds.length > 0;
        const {
          projectsResponse,
          projectListResponse,
          taskCountsAllResponse,
          taskCountsFilteredResponse,
        } = await getProjectReportBundle({
          search: filters.search,
          startIso: reportDateRange.startIso || null,
          endIso: reportDateRange.endIso || null,
          selectedProjectIds,
        });

        const reportProjects = Array.isArray(projectsResponse?.data?.data?.data) ? projectsResponse.data.data.data : [];
        const masterProjects = Array.isArray(projectListResponse?.data?.data) ? projectListResponse.data.data : [];
        const allProjectRows = mergeProjectRows(reportProjects, masterProjects);

        const absoluteTotalProjects = getMetaTotal(projectListResponse) || allProjectRows.length;

        // Headline totals: for the selected projects when a top project filter is set,
        // otherwise for everything. (Server returns them as metadata of the grouped query.)
        const headlineCounts = hasProjectFilter ? taskCountsFilteredResponse : taskCountsAllResponse;
        const totalTasks = Number(headlineCounts?.data?.metadata?.total || 0);
        const completedTasks = Number(headlineCounts?.data?.metadata?.completed || 0);

        // Per-project progress (always from the unfiltered-by-project counts, so every row in
        // the project list has its progress bar).
        const projectProgressMap = {};
        (Array.isArray(taskCountsAllResponse?.data?.data) ? taskCountsAllResponse.data.data : []).forEach((row) => {
          if (!row?.project_id) return;
          projectProgressMap[String(row.project_id)] = {
            total: Number(row.total || 0),
            completed: Number(row.completed || 0),
          };
        });

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
        // totalTasks/completedTasks are already filtered by selectedProjectIds from the API
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

        // Per-user hours are loaded on demand (hours modal / CSV export), so a fresh report
        // load just resets them; see fetchHoursByUser.
        hoursByUserCacheRef.current = {};

        setTotal(rows.length);
        setReportData((prev) => ({
          ...prev,
          project: {
            summary: displaySummary,
            rows,
            hoursByUser: [],
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
          performanceRequestBody.startDate = moment().subtract(12, "months").startOf("month").format("DD-MM-YYYY");
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

        const toHHMM = (decimal) => { const m = Math.round(Number(decimal || 0) * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };

        let rows = Object.values(userStats).map((row) => ({
          key: row.key,
          user: row.user,
          loggedHours: toHHMM(row.loggedHours),
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

        setReportData((prev) => (pageOnly && prev.performance ? { ...prev, performance: { ...prev.performance, rows } } : {
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
              body: { ...buildTaskPayload({ viewAll: true, status: "all" }), include_comment_count: false },
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
            // reports never show comment counts -> skip the per-task comments lookup
            body: { ...commonTaskPayload, include_comment_count: false },
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
          setReportData((prev) => {
            const old = prev['project-running'];
            // page change: only the table rows move; the chart aggregates keep their identity
            if (pageOnly && old) {
              return { ...prev, 'project-running': { ...old, data: projectRunningData.data, metadata: meta } };
            }
            return { ...prev, 'project-running': projectRunningData };
          });
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
          // search intentionally excluded - status-report groups tasks by status name,
          // so the search filters the resulting status rows, not task titles
        });

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.taskList,
          body: { ...statusPayload, include_comment_count: false },
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
          setReportData((prev) => {
            const old = prev['timesheet'];
            // page change: only the table rows move; totals and chart aggregates keep their identity
            if (pageOnly && old) {
              return { ...prev, 'timesheet': { ...old, data: timesheetData.data, metadata: timesheetData.metadata } };
            }
            return { ...prev, 'timesheet': timesheetData };
          });
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
  }, [filters, reportKey, userMap, users, dailyTab]);

  // "Hours by User" rows, fetched ON DEMAND (project hours modal / project report CSV export)
  // instead of with every project-report load - it is the heaviest query on this page (up to
  // 5000 joined timesheet rows). Pass project ids to scope it (e.g. one project for the modal);
  // otherwise it uses the top project filter. Results are cached per scope.
  const fetchHoursByUser = useCallback(async (projectIdsOverride) => {
    const reportDateRange = getReportDateRange(filters);
    const projectIds = Array.isArray(projectIdsOverride)
      ? projectIdsOverride
      : (Array.isArray(filters.projectIds) ? filters.projectIds.filter(Boolean) : []);
    const userIds = filters.userId && filters.userId !== "all" ? [filters.userId] : [];
    const startDate = reportDateRange.startMoment
      ? reportDateRange.startMoment.format("DD-MM-YYYY")
      : moment().subtract(12, "months").startOf("month").format("DD-MM-YYYY");
    const endDate = reportDateRange.endMoment
      ? reportDateRange.endMoment.format("DD-MM-YYYY")
      : moment().format("DD-MM-YYYY");

    const cacheKey = JSON.stringify([projectIds, userIds, startDate, endDate]);
    if (hoursByUserCacheRef.current[cacheKey]) return hoursByUserCacheRef.current[cacheKey];

    const response = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.getTimeSheetReportsDetails,
      body: {
        technologies: [],
        types: [],
        managers: [],
        projects: projectIds,
        departments: [],
        users: userIds,
        search: "",
        pageNo: 1,
        limit: 5000,
        sort: "logged_date",
        sortBy: "desc",
        isExport: false,
        startDate,
        endDate,
      },
    });

    const payload = response?.data?.data;
    const entries = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    const rows = buildHoursByUserRows(entries, taskProgressCacheRef.current?.projectRows || []);
    hoursByUserCacheRef.current[cacheKey] = rows;
    return rows;
  }, [filters]);

  // /reports landing page: warm the shared filter data (employees + project list) every report
  // needs, so it is already cached/in flight when the user opens one. Heavy per-report data is
  // only warmed on card hover/focus/touch (see below), not for every visitor.
  useEffect(() => {
    if (!reportKey) prefetchSharedReportData();
  }, [reportKey]);

  const prefetchTimerRef = useRef(null);
  const scheduleReportPrefetch = useCallback((key) => {
    clearTimeout(prefetchTimerRef.current);
    // small intent delay so merely moving the mouse across the cards doesn't fire requests
    prefetchTimerRef.current = setTimeout(() => prefetchReport(key), 200);
  }, []);
  const cancelReportPrefetch = useCallback(() => clearTimeout(prefetchTimerRef.current), []);
  useEffect(() => () => clearTimeout(prefetchTimerRef.current), []);

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
  // Does NOT reload the full page - only fetches task counts for the selected project.
  const updateProjectMetrics = useCallback(async (projectIds) => {
    if (!reportKey || reportKey !== "project-report") return;
    const reportDateRange = getReportDateRange(filters);

    // No project selected - restore full totals from cache
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
      // Total + completed task counts for the selected project(s) from ONE grouped query
      // (previously two task-list calls, each running the full row pipeline for a single row).
      const countsResp = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskList,
        body: {
          view_all: true,
          status: "all",
          project_task_counts: true,
          project_id: projectIds,
          start_date: reportDateRange.startIso || undefined,
          end_date: reportDateRange.endIso || undefined,
        },
      });

      const newTotal = Number(countsResp?.data?.metadata?.total || 0);
      const newCompleted = Number(countsResp?.data?.metadata?.completed || 0);

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
      hoursByUserCacheRef.current = {};
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

      // A pure page / page-size change (same filters, same report, same loader):
      //  - reports that already hold every row and paginate client-side need no request at all;
      //  - server-paginated reports reload only the table rows, so charts are built once per
      //    filter change and keep their data across pages.
      const isPageOnlyChange =
        previousLoaderRef.current === loadReportData &&
        previousReportKeyRef.current === reportKey &&
        previousFiltersRef.current === filters;
      previousLoaderRef.current = loadReportData;
      previousReportKeyRef.current = reportKey;
      if (isPageOnlyChange && CLIENT_PAGINATED_REPORTS.has(reportKey)) {
        return () => controller.abort();
      }

      loadReportData({
        // Search-only runs silently (no skeleton flash - data updates in place)
        silent: isSearchOnly || (isPageChange && !isReportSwitch),
        signal: controller.signal,
        pageOnly: isPageOnlyChange,
      });
      previousFiltersRef.current = filters;

      return () => controller.abort();
    }
  }, [filters, reportKey, pageNo, pageSize, loadReportData]);

  const handleDownload = (key) => {
    const filename = `report_${key}_${moment().format("DD-MM-YYYY")}.csv`;
    const spec = getReportExportSpec(key, reportData, dailyTab);

    if (!spec) {
      message.info("Download for this report type will be available soon.");
      return;
    }

    requestExport({
      title: `Select Columns for ${spec.title} Export`,
      columns: toExportOptions(spec.columns),
      onExport: (keys) => {
        if (key === "project-report") {
          exportProjectReport(keys, filename);
          return;
        }
        const { headers, rows } = buildExportRows(spec.columns, keys, spec.items);
        downloadCSV(headers, rows, filename);
      },
    });
  };

  // Project report: the project list, plus the "Hours by User" section when
  // that option is ticked (fetched now - it isn't loaded with the page).
  const exportProjectReport = async (keys, filename) => {
    const projectRows = reportData.project?.rows || [];
    if (projectRows.length === 0) {
      message.warning("No data available to download");
      return;
    }

    const sections = [];
    const projectColumns = PROJECT_REPORT_EXPORT_COLUMNS.filter((col) => col.key !== "hoursByUser");
    if (projectColumns.some((col) => keys.includes(col.key))) {
      const { headers, rows } = buildExportRows(projectColumns, keys, projectRows);
      sections.push(buildCsvSection(headers, rows));
    }

    if (keys.includes("hoursByUser")) {
      let hoursByUserRows = [];
      try {
        hoursByUserRows = await fetchHoursByUser();
      } catch (error) {
        console.error("Hours-by-user fetch failed", error);
      }
      if (hoursByUserRows.length > 0) {
        if (sections.length) sections.push('"Hours by User"');
        sections.push(
          buildCsvSection(
            ["User", "Project", "Logged Hours", "Entries", "Last Logged Date"],
            hoursByUserRows.map((item) => [
              item.user || "",
              item.project || "",
              item.loggedHours || "0:00",
              item.entries || 0,
              item.lastLoggedDate || "",
            ])
          )
        );
      }
    }

    if (sections.length === 0) {
      message.warning("No data available to download");
      return;
    }
    triggerCsvDownload(sections.join("\n\n"), filename);
  };

  const downloadCSV = (headers, rows, filename) => {
    if (rows.length === 0) {
      message.warning("No data available to download");
      return;
    }

    triggerCsvDownload(buildCsvSection(headers, rows), filename);
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
        <PageHeader title="Reports" />
        <div className="reports-hub-grid">
          {reportCards.map((card) => (
            <Link
              key={card.key}
              to={`/${companySlug}/reports/${card.key}`}
              className={`reports-hub-card ${card.colorClass}`}
              onMouseEnter={() => scheduleReportPrefetch(card.key)}
              onFocus={() => scheduleReportPrefetch(card.key)}
              onTouchStart={() => scheduleReportPrefetch(card.key)}
              onMouseLeave={cancelReportPrefetch}
              onBlur={cancelReportPrefetch}
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
      { key: "userId", label: "User", placeholder: "All Users", options: userOptions, defaultValue: "all" },
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
      <PageHeader title={currentPage.title}>
          {exportColumnsModal}
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
      </PageHeader>

      <Card className="main-content-wrapper">
        <CommonFilters
          fields={fieldsByReportConfig[reportKey] || []}
          filters={filters}
          setFilters={setFilters}
          setLoading={setLoading}
          hideSearch={reportKey === "timesheet"}
        />
        {(loading || optionsLoading) && reportKey !== "project-report" && reportKey !== "project-running" && reportKey !== "timesheet" && reportKey !== "user-report" && reportKey !== "daily-report" ? (
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
                fetchHoursByUser={fetchHoursByUser}
              />
            ) : reportKey === "daily-report" ? (
              <DailyReportContent
                activeKey={dailyTab}
                onChange={setDailyTab}
                items={reportData.daily[dailyTab] || []}
                loading={loading}
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
                userReportViewMode={userReportViewMode}
                setUserReportViewMode={setUserReportViewMode}
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
  userReportViewMode,
  setUserReportViewMode,
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

  // Route purely by reportKey, not by whether data has landed yet. Gating on
  // rowData.length/data[...] truthiness meant every refetch (including a plain
  // page change) that left data briefly empty swapped this for <EmptyReportState/>
  // and back - unmounting the real component and resetting whatever local state
  // it held (this is what was resetting User Report's chart/table toggle on every
  // page change). Each branch below now stays mounted for its reportKey and
  // handles its own loading / empty / populated states internally instead.
  return (
    <>
      {reportKey === "user-report" ? (
        <UserReportResults
          rows={rowData}
          loading={loading}
          filters={filters}
          pageNo={pageNo}
          pageSize={pageSize}
          total={total}
          setPageNo={setPageNo}
          setPageSize={setPageSize}
          viewMode={userReportViewMode}
          setViewMode={setUserReportViewMode}
        />
      ) : reportKey === "project-running" ? (
        <ProjectRunningReportContent
          data={data['project-running'] || {}}
          loading={loading}
          filters={filters}
          pageNo={pageNo}
          pageSize={pageSize}
          total={total}
          setPageNo={setPageNo}
          setPageSize={setPageSize}
        />
      ) : reportKey === "timesheet" ? (
        <TimesheetReportContent
          data={data["timesheet"] || { data: [], summary: {}, totalHours: "0" }}
          filters={filters}
          loading={loading}
          pageNo={pageNo}
          pageSize={pageSize}
          total={total}
          setPageNo={setPageNo}
          setPageSize={setPageSize}
        />
      ) : ["status-report", "activity-report", "user-performance-report"].includes(reportKey) ? (
        <ReportResults
          key={reportKey}
          reportKey={reportKey}
          rows={rowData}
          loading={loading}
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

  // Debounced search effect - does NOT show full skeleton (silent update)
  useEffect(() => {
    const isSearching = reportSearchText !== (filters?.search || "");
    // Do NOT call setLoading(true) here - search uses silent/fast-path update
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
          {activeFacetCount > 0 && (
            <Button size="small" type="text" onClick={resetAllSelections} className="delete-btn">
              Reset All
            </Button>
          )}
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
          <Button onClick={applySelection} size="small" className="filter-btn">
            Apply Filter
          </Button>
          <Button onClick={resetSelection} size="small" className="delete-btn">
            Reset
          </Button>
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
              
            >
              Filter
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

const formatLoggedTime = (value) => {
  const parts = String(value || "").split(":");
  const twoDigits = (part) => String(parseInt(part, 10) || 0).padStart(2, "0");
  return parts.length >= 2 ? `${parts[0].padStart(2, "0")}:${twoDigits(parts[1])}` : (value || "");
};

const PROJECT_REPORT_EXPORT_COLUMNS = [
  { key: "taskName", label: "Project Name", value: (item) => item.taskName || "" },
  { key: "progress", label: "Progress %", value: (item) => item.progress || 0 },
  { key: "startDate", label: "Start Date", value: (item) => item.startDate || "" },
  { key: "endDate", label: "End Date", value: (item) => item.endDate || "" },
  { key: "status", label: "Status", value: (item) => item.status || "" },
  { key: "hoursByUser", label: "Hours by User", value: () => "" },
];

const PROJECT_HOURS_EXPORT_COLUMNS = [
  { key: "user", label: "User", value: (row) => row.user || "" },
  { key: "loggedHours", label: "Logged Hours", value: (row) => row.loggedHours || "0:00" },
  { key: "entries", label: "Entries", value: (row) => row.entries || 0 },
  { key: "lastLoggedDate", label: "Last Logged Date", value: (row) => row.lastLoggedDate || "-" },
];

// Every column each report can export, in on-screen order. The Export button
// opens the column picker with these; `items` are the rows currently loaded.
function getReportExportSpec(key, reportData, dailyTab) {
  switch (key) {
    case "daily-report":
      return {
        title: "Daily Report",
        items: reportData.daily?.[dailyTab || "pending"] || [],
        columns: [
          { key: "name", label: "Member Name", value: (item) => item.name || "" },
          { key: "today", label: "Today", value: (item) => item.today || 0 },
          { key: "overdue", label: "Overdue", value: (item) => item.overdue || 0 },
          { key: "upcoming", label: "Upcoming", value: (item) => item.upcoming || 0 },
          { key: "total", label: "Total", value: (item) => item.total || 0 },
        ],
      };
    case "user-report":
      // "Tasks" is appended to the task-count columns so they aren't mistaken for
      // counts of the adjacent "Project" column.
      return {
        title: "User Wise Report",
        items: reportData.user || [],
        columns: [
          { key: "user", label: "User", value: (item) => item.user || "" },
          { key: "project", label: "Project", value: (item) => item.project || "" },
          { key: "total", label: "Total Tasks", value: (item) => item.total || 0 },
          { key: "completed", label: "Closed Tasks", value: (item) => item.completed || 0 },
          { key: "pending", label: "Pending Tasks", value: (item) => item.pending || 0 },
          { key: "dueToday", label: "Due Today", value: (item) => item.dueToday || 0 },
          { key: "overdue", label: "Past Due Tasks", value: (item) => item.overdue || 0 },
          { key: "incomplete", label: "Incomplete Tasks", value: (item) => item.incomplete || 0 },
        ],
      };
    case "project-report":
      return {
        title: "Project Wise Report",
        items: reportData.project?.rows || [],
        columns: PROJECT_REPORT_EXPORT_COLUMNS,
      };
    case "status-report":
      return {
        title: "Status Wise Report",
        items: reportData.status || [],
        columns: [
          { key: "status", label: "Status", value: (item) => item.status || "" },
          { key: "tasks", label: "Tasks", value: (item) => item.tasks || 0 },
          { key: "projects", label: "Projects", value: (item) => item.projects || 0 },
          { key: "users", label: "Users", value: (item) => item.users || 0 },
        ],
      };
    case "activity-report":
      return {
        title: "User Activity Report",
        items: reportData.activity || [],
        columns: [
          { key: "user", label: "User", value: (item) => item.user || "" },
          { key: "operation", label: "Operation", value: (item) => item.operation || "" },
          { key: "module", label: "Module", value: (item) => item.module || "" },
          { key: "createdAt", label: "Date/Time", value: (item) => item.createdAt || "" },
        ],
      };
    case "user-performance-report":
      return {
        title: "User Wise Performance",
        items: reportData.performance?.rows || [],
        columns: [
          { key: "user", label: "User", value: (item) => item.user || "" },
          { key: "loggedHours", label: "Logged Hours", value: (item) => item.loggedHours || "0:00" },
          { key: "entries", label: "Entries", value: (item) => item.entries || 0 },
          { key: "projects", label: "Projects", value: (item) => item.projects || 0 },
        ],
      };
    case "project-running":
      return {
        title: "Project Running",
        items: reportData["project-running"]?.data || [],
        columns: [
          { key: "title", label: "Project Name", value: (item) => item.title || "" },
          { key: "managerName", label: "Project Manager", value: (item) => item.managerName || "" },
          { key: "project_typeName", label: "Category", value: (item) => item.project_typeName || "" },
          { key: "estimatedHours", label: "Est. Hours", value: (item) => item.estimatedHours || 0 },
          { key: "total_logged_time", label: "Used Hours", value: (item) => item.total_logged_time || 0 },
          { key: "start_date", label: "Start Date", value: (item) => formatDate(item.start_date) },
          { key: "end_date", label: "End Date", value: (item) => formatDate(item.end_date) },
        ],
      };
    case "timesheet":
      return {
        title: "Timesheet",
        items: reportData.timesheet?.data || [],
        columns: [
          { key: "user", label: "User", value: (item) => item.user || "" },
          { key: "project", label: "Project", value: (item) => item.project || "" },
          { key: "logged_time", label: "Logged Time", value: (item) => formatLoggedTime(item.logged_time) },
          { key: "logged_date", label: "Date", value: (item) => formatDate(item.logged_date) },
          { key: "projectManager", label: "Project Manager", value: (item) => item.projectManager || "" },
          { key: "projectType", label: "Category", value: (item) => item.projectType || "" },
        ],
      };
    default:
      return null;
  }
}

// Builds one quoted/escaped CSV block (header row + data rows) without triggering a download,
// so multiple sections (e.g. project list + hours-by-user) can be combined into one file.
function buildCsvSection(headers, rows) {
  const quotedHeaders = headers.map(header => `"${header}"`);
  const quotedRows = rows.map(row =>
    row.map(cell => {
      // Handle 0 values properly - don't convert 0 to empty string
      const cellStr = String(cell !== null && cell !== undefined ? cell : '').replace(/"/g, '""');
      return `"${cellStr}"`;
    })
  );

  return [
    quotedHeaders.join(","),
    ...quotedRows.map(row => row.join(","))
  ].join("\n");
}

function triggerCsvDownload(csvContent, filename) {
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
  projects,
  fetchHoursByUser
}) {
  const isDataLoading = loading || optionsLoading;
  const [hoursModalProject, setHoursModalProject] = useState(null);
  // Hours for the open project are fetched when the modal opens (scoped to that one project),
  // not with the page load.
  const [modalHours, setModalHours] = useState({ projectKey: null, rows: [], loading: false });
  const modalHoursRows =
    hoursModalProject && modalHours.projectKey === hoursModalProject.key
      ? modalHours.rows.filter((row) => row.projectId === hoursModalProject.key)
      : [];

  useEffect(() => {
    if (!hoursModalProject || !fetchHoursByUser) return undefined;
    let cancelled = false;
    setModalHours({ projectKey: hoursModalProject.key, rows: [], loading: true });
    fetchHoursByUser([hoursModalProject.key])
      .then((rows) => {
        if (!cancelled) setModalHours({ projectKey: hoursModalProject.key, rows, loading: false });
      })
      .catch((error) => {
        console.error("Hours-by-user fetch failed", error);
        if (!cancelled) setModalHours({ projectKey: hoursModalProject.key, rows: [], loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [hoursModalProject, fetchHoursByUser]);

  const { requestExport: requestHoursExport, exportColumnsModal: hoursExportColumnsModal } = useExportColumns();

  const handleExportProjectHours = () => {
    if (!hoursModalProject || modalHoursRows.length === 0) return;
    const project = hoursModalProject;
    const rows = modalHoursRows;
    requestHoursExport({
      title: "Select Columns for Hours by User Export",
      columns: toExportOptions(PROJECT_HOURS_EXPORT_COLUMNS),
      onExport: (keys) => {
        const { headers, rows: csvRows } = buildExportRows(PROJECT_HOURS_EXPORT_COLUMNS, keys, rows);
        const safeName = String(project.taskName || "project").replace(/[^a-z0-9]+/gi, "_");
        triggerCsvDownload(buildCsvSection(headers, csvRows), `hours_by_user_${safeName}_${moment().format("DD-MM-YYYY")}.csv`);
      },
    });
  };

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
      title: "",
      columnSelectorLabel: "View",
      dataIndex: "view",
      key: "view",
      width: 56,
      align: "center",
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={(event) => {
            event.stopPropagation();
            setHoursModalProject(record);
          }}
        />
      ),
    },
  ];

  const PROJECT_REPORT_COLUMN_LOCKED = useMemo(() => ["taskName", "view"], []);
  const {
    visibleKeys: projectReportVisibleKeys,
    saveVisibleKeys: saveProjectReportVisibleKeys,
    filteredColumns: projectReportFilteredColumns,
    saving: savingProjectReportColumns,
  } = useColumnVisibility("reportsHub-project-report", columns, [], PROJECT_REPORT_COLUMN_LOCKED);

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

      {/* {focusedProjectIds.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            onClick={() => setFocusedProjectIds([])}
            style={{
              padding: "5px 16px",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: "#005282",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => e.target.style.background = "#082f4a"}
            onMouseLeave={(e) => e.target.style.background = "#005282"}
          >
            ✕ Reset
          </button>
        </div>
      )} */}

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
                <MetricCard color="#15507b" value={`${displayMetrics.incompleteTasks}/${displayMetrics.totalTasks || 0}`} label="Task In-completed" />
                <MetricCard
                  color="#0367ae"
                  value={`${displayMetrics.completedTasks}/${displayMetrics.totalTasks || 0}`}
                  label="Task Completed"
                  secondaryValueColor="#0367ae"
                />
              </>
            )}
          </>
        )}
      </div>

      <div className="project-report-table-card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <ColumnSelector
            columns={columns}
            visibleKeys={projectReportVisibleKeys}
            alwaysVisibleKeys={PROJECT_REPORT_COLUMN_LOCKED}
            onSave={saveProjectReportVisibleKeys}
            saving={savingProjectReportColumns}
          />
        </div>
        <Table
          columns={projectReportFilteredColumns}
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
            pageSizeOptions: ["10", "20", "25", "50", "100"],
          }}
          locale={{
            emptyText: (
              <>
                <NoDataFoundIcon />
              </>
            )
          }}
        />
      </div>

      {hoursExportColumnsModal}
      <Modal
        title={hoursModalProject ? hoursModalProject.taskName : "Project Details"}
        open={Boolean(hoursModalProject)}
        onCancel={() => setHoursModalProject(null)}
        footer={null}
        width={760}
        destroyOnClose
      >
        {hoursModalProject ? (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Status">
                <Tag color={hoursModalProject.status === "Active" ? "green" : "default"}>
                  {hoursModalProject.status || "-"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Progress">
                <div className="project-report-progress">
                  <Progress percent={hoursModalProject.progress} showInfo={false} strokeColor={getProgressColor(hoursModalProject.progress)} />
                  <span>{hoursModalProject.progress}%</span>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Start Date">{hoursModalProject.startDate || "-"}</Descriptions.Item>
              <Descriptions.Item label="End Date">{hoursModalProject.endDate || "-"}</Descriptions.Item>
            </Descriptions>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Hours by User</h3>
              {modalHoursRows.length > 0 && (
                <Button className="btn-secondary" size="small" onClick={handleExportProjectHours}>
                  Export
                </Button>
              )}
            </div>
            {modalHours.loading ? (
              <SkeletonBlock w="100%" h={120} />
            ) : (
              <ProjectUserHoursPanel rows={modalHoursRows} />
            )}
          </>
        ) : null}
      </Modal>
    </>
  );
}

// Shown in a modal when a project row is clicked: who logged hours on this project, and how
// much. Each user row expands into their individual timesheet entries (date/time/description).
function ProjectUserHoursPanel({ rows }) {
  const userColumns = [
    { title: "User", dataIndex: "user", key: "user" },
    { title: "Logged Hours", dataIndex: "loggedHours", key: "loggedHours" },
    { title: "Entries", dataIndex: "entries", key: "entries" },
    { title: "Last Logged Date", dataIndex: "lastLoggedDate", key: "lastLoggedDate" },
  ];

  const entryColumns = [
    { title: "Date", dataIndex: "date", key: "date" },
    { title: "Logged Time", dataIndex: "loggedTime", key: "loggedTime" },
    { title: "Description", dataIndex: "description", key: "description" },
  ];

  if (!rows || rows.length === 0) {
    return <NoDataFoundIcon compact />;
  }

  return (
    <Table
      className="project-user-hours-subtable"
      columns={userColumns}
      dataSource={rows}
      rowKey="key"
      size="small"
      pagination={false}
      // expandable={{
      //   expandedRowRender: (userRow) => (
      //     <Table
      //       columns={entryColumns}
      //       dataSource={userRow.entryDetails || []}
      //       rowKey="key"
      //       size="small"
      //       pagination={false}
      //     />
      //   ),
      //   rowExpandable: (userRow) => Array.isArray(userRow.entryDetails) && userRow.entryDetails.length > 0,
      // }}
    />
  );
}

function ReportResults({ reportKey, rows, loading, summary, filters, pageNo, pageSize, total, setPageNo, setPageSize }) {
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
  const reportColumns = config?.columns || [];
  const reportLockedKey = reportColumns[0]?.key;
  const REPORT_COLUMN_LOCKED = useMemo(() => (reportLockedKey ? [reportLockedKey] : []), [reportLockedKey]);
  const {
    visibleKeys: reportVisibleKeys,
    saveVisibleKeys: saveReportVisibleKeys,
    filteredColumns: reportFilteredColumns,
    saving: savingReportColumns,
  } = useColumnVisibility(`reportsHub-${reportKey}`, reportColumns, [], REPORT_COLUMN_LOCKED);

  if (loading && rows.length === 0) {
    if (reportKey === "user-performance-report") return <UserPerformanceReportSkeleton />;
    // Status Wise Report (4 cols: Status/Tasks/Projects/Users) and User Activity
    // Report (4 cols: User/Operation/Module/Created At) happen to share a column
    // count, so one table skeleton shape fits both.
    return <ReportTableSkeleton cols={4} rows={8} />;
  }

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
            <strong>{(() => { const total = Math.round(Number(summary.totalHours || 0) * 60); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; })()}</strong>
          </div>
          <div className="reports-mini-stat">
            <span>Total Entries</span>
            <strong>{summary.totalEntries || 0}</strong>
          </div>
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <ColumnSelector
          columns={reportColumns}
          visibleKeys={reportVisibleKeys}
          alwaysVisibleKeys={REPORT_COLUMN_LOCKED}
          onSave={saveReportVisibleKeys}
          saving={savingReportColumns}
        />
      </div>
      <Table
        columns={reportFilteredColumns}
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
          pageSizeOptions: ["10", "20", "25", "50", "100"],
        }}
        rowKey="key"
        locale={{ emptyText: <NoDataFoundIcon /> }}
      />
    </div>
  );
}

// Reports that fetch their full dataset once and paginate it in the browser.
const CLIENT_PAGINATED_REPORTS = new Set(["project-report", "user-report", "status-report"]);

function UserReportResults({ rows, loading, filters, pageNo, pageSize, total, setPageNo, setPageSize, viewMode, setViewMode }) {
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
    if (selectedMember) {
      const source = filteredMembers.length > 0 ? filteredMembers : rows;
      const match = source.find((r) => r.key === selectedMember);
      if (match) return [match];
    }
    // Use sortedMembers (desc by total) so chart always shows top contributors first
    const source = sortedMembers.length > 0 ? sortedMembers : rows;
    return source.filter((r) => Number(r.total || 0) > 0).slice(0, 10);
  }, [filteredMembers, sortedMembers, rows, selectedMember]);

  const stackedRows = useMemo(
    () =>
      chartRows.map((row) => ({
        name: row.user,
        completed: Number(row.completed) || 0,
        pending: Number(row.pending) || 0,
        incomplete: Number(row.incomplete) || 0,
        total: Number(row.total) || 0,
      })),
    [chartRows]
  );
  const stackedSeries = useMemo(
    () => [
      { key: "completed", label: "Closed", color: HRMS_CHART_STATUS_BLUES[0] },
      { key: "pending", label: "Pending", color: HRMS_CHART_STATUS_BLUES[1] },
      { key: "incomplete", label: "Incomplete", color: HRMS_CHART_STATUS_BLUES[2] },
    ],
    []
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

  const userReportColumns = [
    { title: "User", dataIndex: "user", key: "user" },
    { title: "Project", dataIndex: "project", key: "project" },
    { title: "Total", dataIndex: "total", key: "total" },
    { title: "Closed", dataIndex: "completed", key: "completed" },
    { title: "Pending", dataIndex: "pending", key: "pending" },
    { title: "Due Today", dataIndex: "dueToday", key: "dueToday" },
    { title: "Past Due", dataIndex: "overdue", key: "overdue" },
    { title: "Incomplete", dataIndex: "incomplete", key: "incomplete" },
  ];
  const USER_REPORT_COLUMN_LOCKED = useMemo(() => ["user"], []);
  const {
    visibleKeys: userReportVisibleKeys,
    saveVisibleKeys: saveUserReportVisibleKeys,
    filteredColumns: userReportFilteredColumns,
    saving: savingUserReportColumns,
  } = useColumnVisibility("reportsHub-user-report", userReportColumns, [], USER_REPORT_COLUMN_LOCKED);

  // All hooks above have already run unconditionally (required by the Rules of
  // Hooks) - this early return only skips the JSX below, which is safe.
  if (loading && rows.length === 0) {
    return <UserReportDetailSkeleton />;
  }
  if (!loading && rows.length === 0) {
    return <EmptyReportState />;
  }

  return (
    <div className="user-report-layout">
      <div className="user-report-chart-card">
        <div className="user-report-card-head user-report-card-head--actions">
          {viewMode === "table" && (
            <ColumnSelector
              columns={userReportColumns}
              visibleKeys={userReportVisibleKeys}
              alwaysVisibleKeys={USER_REPORT_COLUMN_LOCKED}
              onSave={saveUserReportVisibleKeys}
              saving={savingUserReportColumns}
            />
          )}
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

            {chartRows.length > 0 ? (
              <div className="user-report-chart-wrap">
                {stackedRows.length === 0 ? (
                  <NoDataFoundIcon />
                ) : (
                  <>
                    <StackedBarChartPro rows={stackedRows} series={stackedSeries} totalKey="total" unit="tasks" />
                    <div className="user-report-legend-note user-report-legend-note--chart">
                      <span><i className="closed" />Closed</span>
                      <span><i className="pending" />Pending</span>
                      <span><i className="incomplete" />Incomplete</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="user-report-chart-empty">
                <NoDataFoundIcon />
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
                pageSizeOptions: ["10", "20", "25", "50", "100"],
              }}
              columns={userReportFilteredColumns}
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
                      <small style={{ color: "#8c8c8c" }}>{m.total || 0}</small>
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

function DailyReportContent({ activeKey, onChange, items, loading, pageNo, pageSize, total, setPageNo, setPageSize }) {
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
      </div>

      {loading && items.length === 0 ? (
        <DailyReportSkeleton />
      ) : (
        <>
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
                        <DailyMetric label="Today" value={item.today} color="#0367ae" />
                        <DailyMetric label="Overdue" value={item.overdue} color="#7db3db" />
                        <DailyMetric label="Upcoming" value={item.upcoming} color="#2196f3" />
                        <DailyMetric label="Total" value={item.total} color="#15507b" />
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
                    pageSizeOptions={["10", "20", "25", "50", "100"]}
                    responsive
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

function EmptyReportState() {
  return (
    <div className="reports-empty-state">
      <NoDataFoundIcon />
      <p>Apply Filter To Generate Reports</p>
    </div>
  );
}

function DetailActions({ reportKey, onDownload, onSchedule, onHistory }) {
  if (reportKey === "daily-report") {
    return (
      <div className="reports-actions">
        <Button className="btn-secondary" onClick={onDownload}>
          Export
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
        Export
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
          trailColor="#f5f5f5"
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
          const isFullCircle = sliceAngle >= 359.99;

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
              {isFullCircle ? (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill={colors[index % colors.length]}
                  stroke="#ffffff"
                  strokeWidth="2"
                >
                  <title>{`${item.label}: ${value}`}</title>
                </circle>
              ) : (
              <path
                d={describePieSlice(center, center, radius, startAngle, endAngle)}
                fill={colors[index % colors.length]}
                stroke="#ffffff"
                strokeWidth="2"
              >
                <title>{`${item.label}: ${value}`}</title>
              </path>
              )}
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

// Groups raw timesheet entries into one row per (project, user) for the "Hours by User" views.
// The timesheet aggregation endpoint (server/controller/taskHoursLogs.js) never projects
// `project_id`/`employee_id` back out - only the human-readable `project` and `user` name
// strings - so there is no id to join on directly. Each entry's project name is resolved back
// to the project row id via the project list we already have, so the hours line up with the
// project they belong to (falls back to the name itself if a project was renamed/removed since
// the entry was logged).
function buildHoursByUserRows(timesheetEntries = [], projectRows = []) {
  const toHHMM = (decimalHours) => {
    const totalMinutes = Math.round(Number(decimalHours || 0) * 60);
    return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, "0")}`;
  };

  const normalizeName = (value) => String(value || "").trim().toLowerCase();
  const projectNameToId = {};
  projectRows.forEach((project) => {
    const id = getProjectRecordId(project);
    const title = getProjectRecordTitle(project);
    if (id && title) {
      projectNameToId[normalizeName(title)] = id;
    }
  });

  const hoursByUserMap = {};
  timesheetEntries.forEach((entry) => {
    const userName =
      entry.user ||
      entry.employee_name ||
      entry.full_name ||
      entry.employee?.full_name ||
      entry.employee?.name ||
      "Unknown";
    const userId = entry.employee_id || entry.user_id || entry.employee?._id || userName;
    const projectName =
      entry.project ||
      entry.project_name ||
      entry.projectTitle ||
      entry.project_id?.title ||
      "Unassigned";
    const projectId =
      entry.project_id?._id ||
      entry.project_id ||
      entry.projectId ||
      projectNameToId[normalizeName(projectName)] ||
      projectName;

    const loggedTime = String(entry.logged_time || "");
    const [loggedHourPart = "0", loggedMinutePart = "0"] = loggedTime.split(":");
    const hours =
      Number(entry.logged_hours || loggedHourPart || 0) +
      Number(entry.logged_minutes || loggedMinutePart || 0) / 60;
    const entryDate = entry.logged_date ? moment(entry.logged_date) : null;

    const key = `${projectId}||${userId}`;
    if (!hoursByUserMap[key]) {
      hoursByUserMap[key] = {
        key,
        projectId,
        project: projectName,
        userId,
        user: userName,
        hours: 0,
        entries: 0,
        lastLoggedMoment: null,
        entryDetails: [],
      };
    }
    hoursByUserMap[key].hours += hours;
    hoursByUserMap[key].entries += 1;
    if (entryDate && entryDate.isValid() && (!hoursByUserMap[key].lastLoggedMoment || entryDate.isAfter(hoursByUserMap[key].lastLoggedMoment))) {
      hoursByUserMap[key].lastLoggedMoment = entryDate;
    }
    hoursByUserMap[key].entryDetails.push({
      key: `${key}-${hoursByUserMap[key].entryDetails.length}`,
      date: entryDate && entryDate.isValid() ? entryDate.format("DD-MM-YYYY") : "-",
      loggedTime: (() => {
        const parts = loggedTime.split(":");
        return parts.length >= 2 ? `${parts[0].padStart(2, "0")}:${String(parseInt(parts[1], 10) || 0).padStart(2, "0")}` : (loggedTime || toHHMM(hours));
      })(),
      description: String(entry.descriptions || entry.description || "").replace(/<[^>]*>/g, "") || "-",
    });
  });

  return Object.values(hoursByUserMap)
    .map((row) => ({
      ...row,
      loggedHours: toHHMM(row.hours),
      lastLoggedDate: row.lastLoggedMoment ? row.lastLoggedMoment.format("DD-MM-YYYY") : "-",
    }))
    .sort((a, b) => b.hours - a.hours);
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
      return <NoDataFoundIcon />;
    }

    return this.props.children;
  }
}

const EMPTY_LIST = [];

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

function ProjectRunningReportContent({ data, loading, filters, pageNo, pageSize, total, setPageNo, setPageSize }) {
  const projects = Array.isArray(data?.data) ? data.data : [];
  const managers = Array.isArray(data?.managers) ? data.managers : EMPTY_LIST;
  const types = Array.isArray(data?.types) ? data.types : EMPTY_LIST;
  const technologies = Array.isArray(data?.technologies) ? data.technologies : EMPTY_LIST;
  const metadata =
    data?.metadata && typeof data.metadata === "object" ? data.metadata : {};
  const searchText = filters?.search || "";
  // Prepared chart data from API metadata (from INCOMING)
  const managerChartData = useMemo(() => buildRunningProjectChartData(managers, "managerName", "Manager"), [managers]);
  const typeChartData = useMemo(() => buildRunningProjectChartData(types, "project_typeName", "Type"), [types]);
  const techChartData = useMemo(() => buildRunningProjectChartData(technologies, "technologyName", "Technology"), [technologies]);

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

  const RUNNING_COLUMN_LOCKED = useMemo(() => ["title"], []);
  const {
    visibleKeys: runningVisibleKeys,
    saveVisibleKeys: saveRunningVisibleKeys,
    filteredColumns: runningFilteredColumns,
    saving: savingRunningColumns,
  } = useColumnVisibility("reportsHub-project-running", columns, [], RUNNING_COLUMN_LOCKED);

  if (loading && projects.length === 0) {
    return <ProjectRunningReportSkeleton />;
  }
  if (!loading && projects.length === 0) {
    return <EmptyReportState />;
  }

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
                  <NoDataFoundIcon />
                ) : (
                  <DonutChartPro data={managerChartData} unit="projects" centerLabel="Projects" height={320} />
                )}
              </ChartErrorBoundary>
            </div>
          )}

          {typeChartData.length > 0 && (
            <div className="chart-card chart-card--type">
              <h3>Projects by Type</h3>
              <ChartErrorBoundary>
                {typeChartData.length === 0 ? (
                  <NoDataFoundIcon />
                ) : (
                  <BarChartPro horizontal data={typeChartData} unit="projects" />
                )}
              </ChartErrorBoundary>
            </div>
          )}

          {techChartData.length > 0 && (
            <div className="chart-card chart-card--technology">
              <h3>Projects by Technology</h3>
              <ChartErrorBoundary>
                {techChartData.length === 0 || techChartData.every(item => Number(item.value || 0) === 0) ? (
                  <NoDataFoundIcon />
                ) : (
                  <BarChartPro data={techChartData} unit="projects" color="#2A6DB3" />
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
          <ColumnSelector
            columns={columns}
            visibleKeys={runningVisibleKeys}
            alwaysVisibleKeys={RUNNING_COLUMN_LOCKED}
            onSave={saveRunningVisibleKeys}
            saving={savingRunningColumns}
          />
        </div>

        {projects.length > 0 ? (
          <Table
            columns={runningFilteredColumns}
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
              pageSizeOptions: ["10", "20", "25", "50", "100"],
            }}
            scroll={{ x: "max-content" }}
            size="middle"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
            <NoDataFoundIcon />
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
  const timesheetUserChartColors = hrmsBluePalette(6);

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
      title: "Logged Time",
      dataIndex: "logged_time",
      key: "logged_time",
      align: "center",
      render: (time) => {
        if (!time) return "-";
        const parts = String(time).split(":");
        if (parts.length < 2) return time;
        const h = String(parseInt(parts[0], 10) || 0).padStart(2, "0");
        const m = String(parseInt(parts[1], 10) || 0).padStart(2, "0");
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
      title: "Category",
      dataIndex: "projectType",
      key: "projectType",
    },
  ];

  const TIMESHEET_COLUMN_LOCKED = useMemo(() => ["user"], []);
  const {
    visibleKeys: timesheetVisibleKeys,
    saveVisibleKeys: saveTimesheetVisibleKeys,
    filteredColumns: timesheetFilteredColumns,
    saving: savingTimesheetColumns,
  } = useColumnVisibility("reportsHub-timesheet", columns, [], TIMESHEET_COLUMN_LOCKED);

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
              (() => {
                const totalMins = timesheets.reduce((sum, ts) => {
                  const [h, m] = (ts.logged_time || "0:00").split(":").map(Number);
                  return sum + (h || 0) * 60 + (m || 0);
                }, 0);
                return `${Math.floor(totalMins / 60)}:${String(totalMins % 60).padStart(2, "0")}`;
              })()
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
                  <DonutChartPro
                    donut={false}
                    colors={timesheetUserChartColors}
                    unit="h"
                    data={userChartData.map((item) => ({
                      name: item.user,
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
                  <NoDataFoundIcon />
                ) : (
                  <BarChartPro
                    horizontal
                    color="#2A6DB3"
                    unit="h"
                    data={managerChartData.map((item) => ({ name: item.projectManager, value: parseFloat(item.totalLoggedHours) }))}
                  />
                )}
              </div>
            )}

            {typeChartData.length > 0 && (
              <div className="chart-card chart-card--timesheet chart-card--timesheet-type">
                <h3>Hours by Category</h3>
                {typeChartData.length === 0 || typeChartData.every(item => parseFloat(item.totalLoggedHours) === 0) ? (
                  <NoDataFoundIcon />
                ) : (
                  <BarChartPro
                    unit="h"
                    data={typeChartData.map((item) => ({ name: item.projectType, value: parseFloat(item.totalLoggedHours) }))}
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
          <ColumnSelector
            columns={columns}
            visibleKeys={timesheetVisibleKeys}
            alwaysVisibleKeys={TIMESHEET_COLUMN_LOCKED}
            onSave={saveTimesheetVisibleKeys}
            saving={savingTimesheetColumns}
          />
        </div>

        {loading && timesheets.length === 0 ? (
          <TableSk
            cols={["2fr", "1.5fr", "2fr", "1fr", "1fr", "1.2fr", "1fr"]}
            rows={8}
          />
        ) : timesheets.length > 0 ? (
          <Table
            columns={timesheetFilteredColumns}
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
              pageSizeOptions: ["10", "20", "25", "50", "100"],
            }}
            scroll={{ x: "max-content" }}
            size="middle"
            loading={loading}
          />
        ) : (
          !loading && (
            <NoDataFoundIcon />
          )
        )}
      </div>
    </div>
  );
}

export default ReportsHub;
