/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useMemo, useCallback, useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import "./timesheet.css";
import dayjs from "dayjs";
import {
  DatePicker,
  Table,
  Button,
  Dropdown,
  Tooltip,
  Spin,
  Alert,
} from "antd";
import {
  MoreOutlined,
  ExportOutlined,
  ReloadOutlined,
  SortAscendingOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import moment from "moment";
import ReactHTMLTableToExcel from "react-html-table-to-excel";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import { removeTitle } from "../../../util/nameFilter";
import Service from "../../../service";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";
import TimeSheetFilterComponent from "./TimeSheetFilterComponent";
import { TimesheetSkeleton } from "../../../components/common/SkeletonLoader";
import NoDataFoundIcon from "../../../components/common/NoDataFoundIcon";

dayjs.extend(quarterOfYear);
const { RangePicker } = DatePicker;

const TimeSheet = () => {
  const companySlug = localStorage.getItem("companyDomain");
  const dispatch = useDispatch();

  const rangePresets = [
    {
      label: "This month",
      value: [dayjs().startOf("month"), dayjs().endOf("month")],
    },
    {
      label: "This month to date",
      value: [dayjs().startOf("month"), dayjs()],
    },
    {
      label: "Last month",
      value: [
        dayjs().subtract(1, "month").startOf("month"),
        dayjs().subtract(1, "month").endOf("month"),
      ],
    },
    {
      label: "This quarter",
      value: [dayjs().startOf("quarter"), dayjs().endOf("quarter")],
    },
    {
      label: "This quarter to date",
      value: [dayjs().startOf("quarter"), dayjs()],
    },
    {
      label: "Last quarter",
      value: [
        dayjs().startOf("quarter").subtract(1, "quarter"),
        dayjs().startOf("quarter").subtract(1, "day"),
      ],
    },
    {
      label: "This year",
      value: [dayjs().startOf("year"), dayjs().endOf("year")],
    },
  ];

  const defaultSelectedRange = rangePresets.find(
    (preset) => preset.label === "This month to date"
  ).value;

  // ── Filter state ───────────────────────────────────────────
  const [technologies, setTechnologies] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [managers, setManagers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRange, setSelectedRange] = useState(defaultSelectedRange);
  const [selectedSort, setSelectedSort] = useState("logged_date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // ── Data state ─────────────────────────────────────────────
  const [tableData, setTableData] = useState([]);
  const [pieechartDataMangerNames, setPieChartDataMangerNames] = useState([]);
  const [pieeChartData, setPieChartData] = useState([]);
  const [projectTypeData, setProjectTyeData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [totalLoggedHours, setTotalLoggedHours] = useState("");
  const [html, setHtml] = useState([]);
  const [chartKey, setChartKey] = useState(0);

  // ── UI state ───────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingExport, setPendingExport] = useState(false);

  // ── Data fetch ─────────────────────────────────────────────
  const getTimeSheetReportsDetails = useCallback(
    async ({
      technologies: tech = technologies,
      types = projectTypes,
      managers: mgr = managers,
      projects: proj = projects,
      departments: dept = departments,
      users: usr = users,
      sort = selectedSort,
      sortBy = sortOrder,
      startDate = selectedRange && selectedRange[0],
      endDate = selectedRange && selectedRange[1],
    } = {}) => {
      setLoading(true);
      setError(null);
      try {
        dispatch(showAuthLoader());
        const reqBody = {
          startDate: startDate
            ? startDate.format("YYYY-MM-DD")
            : dayjs().startOf("month").format("YYYY-MM-DD"),
          endDate: endDate
            ? endDate.format("YYYY-MM-DD")
            : dayjs().format("YYYY-MM-DD"),
          technologies: tech && tech.length > 0 ? tech : [],
          types: types && types.length > 0 ? types : [],
          managers: mgr && mgr.length > 0 ? mgr : [],
          projects: proj && proj.length > 0 ? proj : [],
          departments: dept && dept.length > 0 ? dept : [],
          users: usr && usr.length > 0 ? usr : [],
          pageNo: pagination.current,
          limit: pagination.pageSize,
          sort: sort || "",
          sortBy: sortBy,
          isExport: false,
        };

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getTimeSheetReportsDetails,
          body: reqBody,
        });

        if (response?.data && response?.data?.data) {
          setTableData(response.data.data.data);
          setPieChartDataMangerNames(
            response.data.data.manager.map((item) => removeTitle(item.projectManager))
          );
          setPieChartData(
            response.data.data.manager.map((item) => item.totalLoggedHours)
          );
          setProjectTyeData(response.data.data.type);
          setUsersData(response.data.data.user);
          setTotalLoggedHours(response.data.data.totalHours);
          setPagination((prev) => ({
            ...prev,
            total: response.data.metadata.total || 0,
          }));
        } else {
          setTableData([]);
          setPagination((prev) => ({ ...prev, total: 0 }));
        }
      } catch (err) {
        setError("Unable to load timesheet data. Please try again.");
        setTableData([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
        console.error(err);
      } finally {
        setLoading(false);
        setPageLoading(false);
        dispatch(hideAuthLoader());
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, pagination.current, pagination.pageSize, selectedSort, sortOrder, technologies, projectTypes, managers, projects, departments, users, selectedRange]
  );

  // ── CSV export (on-demand only) ────────────────────────────
  const exportTimesheetReportCSV = useCallback(
    async ({
      technologies: tech = technologies,
      types = projectTypes,
      managers: mgr = managers,
      projects: proj = projects,
      departments: dept = departments,
      users: usr = users,
      sort = selectedSort,
      sortBy = sortOrder,
      startDate = selectedRange && selectedRange[0],
      endDate = selectedRange && selectedRange[1],
    } = {}) => {
      try {
        dispatch(showAuthLoader());
        const reqBody = {
          startDate: startDate
            ? startDate.format("YYYY-MM-DD")
            : dayjs().startOf("month").format("YYYY-MM-DD"),
          endDate: endDate
            ? endDate.format("YYYY-MM-DD")
            : dayjs().format("YYYY-MM-DD"),
          technologies: tech && tech.length > 0 ? tech : [],
          types: types && types.length > 0 ? types : [],
          managers: mgr && mgr.length > 0 ? mgr : [],
          projects: proj && proj.length > 0 ? proj : [],
          departments: dept && dept.length > 0 ? dept : [],
          users: usr && usr.length > 0 ? usr : [],
          pageNo: pagination.current,
          limit: pagination.pageSize,
          sort: sort || "",
          sortBy: sortBy,
          isExport: true,
        };

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.exportTimeSheetReportCSV,
          body: reqBody,
        });
        if (response?.data && response?.data?.data) {
          setHtml(response.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        dispatch(hideAuthLoader());
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, pagination.current, pagination.pageSize, selectedSort, sortOrder, technologies, projectTypes, managers, projects, departments, users, selectedRange]
  );

  // ── Effects ────────────────────────────────────────────────

  // Fetch data whenever any filter/sort/pagination dep changes
  useEffect(() => {
    getTimeSheetReportsDetails();
  }, [getTimeSheetReportsDetails]);

  // Re-key pie chart when series data changes
  useEffect(() => {
    setChartKey((prev) => prev + 1);
  }, [pieeChartData]);

  // Trigger XLS download after html state is updated by exportTimesheetReportCSV
  useEffect(() => {
    if (pendingExport && html?.html) {
      const csvRef = document.getElementById("test-table-xls-button");
      csvRef?.click();
      setPendingExport(false);
    }
  }, [pendingExport, html]);

  // ── Interaction handlers ───────────────────────────────────

  // Filter panel callback — state changes drive useEffect re-fetch
  const onFilterChange = useCallback((skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setTechnologies([]);
      setProjectTypes([]);
      setManagers([]);
      setProjects([]);
      setDepartments([]);
      setUsers([]);
      setPagination((prev) => ({ ...prev, current: 1 }));
    } else {
      if (skipParams.includes("skipTechnology")) setTechnologies([]);
      if (skipParams.includes("skipProjectType")) setProjectTypes([]);
      if (skipParams.includes("skipManager")) setManagers([]);
      if (skipParams.includes("skipProject")) setProjects([]);
      if (skipParams.includes("skipDepartment")) setDepartments([]);
      if (skipParams.includes("skipUser")) setUsers([]);
    }

    if (selectedFilters) {
      setTechnologies(selectedFilters.technology || []);
      setProjectTypes(selectedFilters.projectType || []);
      setManagers(selectedFilters.manager || []);
      setProjects(selectedFilters.project || []);
      setDepartments(selectedFilters.department || []);
      setUsers(selectedFilters.user || []);
      setPagination((prev) => ({ ...prev, current: 1 }));
    }
  }, []);

  const onRangeChange = useCallback((dates) => {
    setSelectedRange(dates);
    // useEffect fires when selectedRange changes
  }, []);

  const handleSortSelect = useCallback(
    (sortOption) => {
      const newSortOrder =
        sortOption === selectedSort
          ? sortOrder === "asc"
            ? "desc"
            : "asc"
          : "asc";
      setSelectedSort(sortOption);
      setSortOrder(newSortOrder);
      // useEffect fires when selectedSort / sortOrder change
    },
    [selectedSort, sortOrder]
  );

  const handleTableChange = useCallback((page, _, sorter) => {
    if (sorter?.field && sorter?.order) {
      setSelectedSort(sorter.field);
      setSortOrder(sorter.order === "ascend" ? "asc" : "desc");
    }
    setPagination((prev) => ({ ...prev, ...page }));
    // useEffect fires when pagination / sort state changes
  }, []);

  // Export: fetch HTML then trigger download via pendingExport effect
  const handleCsvExport = useCallback(() => {
    setPendingExport(true);
    exportTimesheetReportCSV();
  }, [exportTimesheetReportCSV]);

  const showTotal = useCallback(
    (total, range) => `Showing ${range[0]}-${range[1]} of ${total} records`,
    []
  );

  // ── Chart configs ──────────────────────────────────────────

  const chartData = useMemo(() => {
    const projectTypeReportData = projectTypeData.map(
      (entry) => entry.totalLoggedHours
    );
    const projectTypeReportDatalabelsData = projectTypeData.map(
      (entry) => entry.projectType
    );
    const usersDataLabels = usersData.map((entry) => removeTitle(entry.user));
    const usersLogedHours = usersData.map((entry) => entry.totalLoggedHours);

    return {
      projectTypeReportData,
      projectTypeReportDatalabelsData,
      usersDataLabels,
      usersLogedHours,
    };
  }, [projectTypeData, usersData]);

  const chartTheme = useMemo(
    () => ({
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      // Teal palette — Hours by Manager
      managerColors: ["#36cfc9", "#13c2c2", "#08979c", "#006d75", "#4dd9d0", "#87e8de"],
      // Orange palette — Hours by Category
      projectTypeColors: ["#ffa940", "#ff7a45", "#fa8c16", "#d46b08", "#ffbb96", "#ffd591"],
      // Purple palette — Hours by User
      userColors: ["#9254de", "#722ed1", "#b37feb", "#531dab", "#d3adf7", "#efdbff"],
    }),
    []
  );

  const pieChartConfig = useMemo(() => {
    if (pieeChartData.length === 0) return null;

    return {
      series: pieeChartData,
      options: {
        chart: {
          type: "pie",
          height: 230,
          fontFamily: chartTheme.fontFamily,
          toolbar: { show: false },
        },
        labels: pieechartDataMangerNames,
        colors: chartTheme.managerColors,
        stroke: { width: 1, colors: "#fff" },
        legend: {
          position: "bottom",
          fontSize: "11px",
          fontWeight: 500,
          itemMargin: { horizontal: 8, vertical: 4 },
          labels: { colors: "#4a5568" },
        },
        dataLabels: {
          style: { fontSize: "12px" },
          formatter: (val) => (val ? `${val.toFixed(1)}%` : ""),
        },
        tooltip: {
          theme: "light",
          y: { formatter: (val) => `${val?.toFixed(2)} hours` },
        },
        plotOptions: {
          pie: {
            dataLabels: { offset: -8 },
            donut: { labels: { show: false } },
          },
        },
        responsive: [
          {
            breakpoint: 768,
            options: {
              chart: { height: 280 },
              legend: { fontSize: "12px" },
            },
          },
        ],
      },
    };
  }, [pieeChartData, pieechartDataMangerNames, chartTheme]);

  const horizontalBarChartConfig = useMemo(() => {
    if (projectTypeData.length === 0) return null;

    return {
      series: [{ name: "Hours", data: chartData.projectTypeReportData }],
      options: {
        chart: {
          toolbar: { show: false },
          type: "bar",
          height: 230,
          fontFamily: chartTheme.fontFamily,
        },
        colors: chartTheme.projectTypeColors.slice(0, chartData.projectTypeReportData.length),
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 6,
            barHeight: "60%",
            distributed: true,
          },
        },
        dataLabels: {
          enabled: true,
          style: { fontSize: "11px", colors: ["#fff"] },
          formatter: (val) => (val != null ? `${val}h` : ""),
        },
        xaxis: {
          categories: chartData.projectTypeReportDatalabelsData,
          labels: { style: { colors: "#6b7280", fontSize: "12px" } },
          axisBorder: { show: true, color: "#e8ecf1" },
          axisTicks: { show: false },
        },
        yaxis: {
          labels: { style: { colors: "#6b7280", fontSize: "12px" } },
        },
        grid: {
          xaxis: { lines: { show: true } },
          yaxis: { lines: { show: false } },
          borderColor: "#f0f2f5",
        },
        tooltip: {
          theme: "light",
          y: { formatter: (val) => `${val} hours` },
        },
      },
    };
  }, [projectTypeData, chartData.projectTypeReportData, chartData.projectTypeReportDatalabelsData, chartTheme]);

  const verticalBarChartHoursConfig = useMemo(() => {
    if (usersData.length === 0) return null;

    const baseColors = chartTheme.userColors;
    const generateColors = (count) => {
      if (count <= baseColors.length) return baseColors.slice(0, count);
      const out = [...baseColors];
      for (let i = baseColors.length; i < count; i++) {
        const hue = (i * 137.508) % 300;
        out.push(`hsl(${hue}, 55%, 65%)`);
      }
      return out;
    };

    return {
      series: [{ name: "Hours", data: chartData.usersLogedHours }],
      options: {
        chart: {
          toolbar: { show: false },
          type: "bar",
          height: 230,
          fontFamily: chartTheme.fontFamily,
        },
        colors: generateColors(chartData.usersLogedHours.length),
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 6,
            columnWidth: "65%",
            distributed: true,
          },
        },
        dataLabels: {
          enabled: true,
          style: { fontSize: "11px", colors: ["#fff"] },
          formatter: (val) => (val != null ? `${val}h` : ""),
        },
        xaxis: {
          categories: chartData.usersDataLabels,
          labels: {
            rotate: -45,
            rotateAlways: true,
            style: { colors: "#6b7280", fontSize: "11px" },
            maxWidth: 100,
          },
          axisBorder: { show: true, color: "#e8ecf1" },
          axisTicks: { show: false },
        },
        yaxis: {
          labels: { style: { colors: "#6b7280", fontSize: "12px" } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        grid: {
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          borderColor: "#f0f2f5",
        },
        legend: { show: false },
        tooltip: {
          theme: "light",
          y: { formatter: (val) => `${val} hours` },
        },
      },
    };
  }, [usersData, chartData.usersLogedHours, chartData.usersDataLabels, chartTheme]);

  // ── Table columns ──────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        title: "User",
        dataIndex: "user",
        width: 180,
        key: "user",
        render: (text, record) => (
          <div className="user-cell">
            <span className="user-name">{removeTitle(record.user)}</span>
          </div>
        ),
        sorter: (a, b) => (a.user || "").localeCompare(b.user || ""),
        ellipsis: true,
      },
      {
        title: "Project",
        width: 220,
        dataIndex: "project",
        key: "project",
        render: (text, record) => {
          const formattedTitle = record?.project?.replace(
            /(?:^|\s)([a-z])/g,
            (match, g1) => match.charAt(0) + g1.toUpperCase()
          );
          return (
            <Link to={`/${companySlug}/project/app/${record?.project_id}?tab=Time`}>
              <div className="project-cell">
                <span className="project-title-link">{formattedTitle}</span>
              </div>
            </Link>
          );
        },
        sorter: (a, b) => (a.project || "").localeCompare(b.project || ""),
        ellipsis: true,
      },
      {
        title: "Description",
        width: 300,
        dataIndex: "descriptions",
        key: "descriptions",
        render: (text) =>
          text ? (
            <Tooltip title={text} placement="topLeft">
              <div
                className="description-cell"
                dangerouslySetInnerHTML={{
                  __html:
                    text.length > 50
                      ? text.slice(0, 50).replace(/\n/g, "<br>") + "..."
                      : text.replace(/\n/g, "<br>"),
                }}
              />
            </Tooltip>
          ) : (
            <span className="no-description">-</span>
          ),
        sorter: (a, b) => (a.descriptions || "").localeCompare(b.descriptions || ""),
        ellipsis: true,
      },
      {
        title: "Date",
        width: 120,
        dataIndex: "logged_date",
        key: "logged_date",
        render: (text, record) => (
          <div className="date-cell">
            <CalendarOutlined className="date-icon" />
            <span className="date-text">
              {moment(record.logged_date).format("DD MMM YYYY")}
            </span>
          </div>
        ),
        sorter: (a, b) => new Date(a.logged_date) - new Date(b.logged_date),
        align: "center",
      },
      {
        title: "Time",
        width: 100,
        dataIndex: "logged_time",
        render: (text, record) => (
          <div className="time-cell">
            <ClockCircleOutlined className="time-icon" />
            <span className="time-hours">{record.logged_time}</span>
          </div>
        ),
        sorter: (a, b) =>
          (parseFloat(a.logged_hours) || 0) - (parseFloat(b.logged_hours) || 0),
        align: "center",
      },
    ],
    [companySlug]
  );

  // ── Action menu ────────────────────────────────────────────

  const sortOptions = [
    { key: "user", label: "User" },
    { key: "project", label: "Project" },
    { key: "descriptions", label: "Description" },
    { key: "logged_date", label: "Date" },
    { key: "logged_time", label: "Hours" },
  ];

  const actionMenuItems = useMemo(
    () => [
      {
        key: "sort",
        icon: <SortAscendingOutlined />,
        label: "Sort By",
        children: sortOptions.map(({ key, label }) => ({
          key,
          label: (
            <div className="sort-menu-item">
              <span>{label}</span>
              {selectedSort === key &&
                (sortOrder === "asc" ? (
                  <i className="fi fi-rr-arrow-small-up" />
                ) : (
                  <i className="fi fi-rr-arrow-small-down" />
                ))}
            </div>
          ),
          onClick: () => handleSortSelect(key),
        })),
      },
      {
        key: "export",
        icon: <ExportOutlined />,
        label: "Export",
        onClick: handleCsvExport,
      },
      {
        key: "reset",
        icon: <ReloadOutlined />,
        label: "Reset",
        onClick: () => {
          setTechnologies([]);
          setProjectTypes([]);
          setManagers([]);
          setProjects([]);
          setDepartments([]);
          setUsers([]);
          setSelectedSort("logged_date");
          setSortOrder("asc");
          setPagination((prev) => ({ ...prev, current: 1 }));
          // Direct call handles the edge case where all state was already at defaults
          getTimeSheetReportsDetails({
            technologies: [],
            types: [],
            managers: [],
            projects: [],
            departments: [],
            users: [],
            sort: "logged_date",
            sortBy: "asc",
          });
        },
      },
    ],
    [selectedSort, sortOrder, handleSortSelect, handleCsvExport, getTimeSheetReportsDetails]
  );

  const renderChart = useCallback(
    (config, type, title) => {
      if (!config) return null;
      return (
        <div className="timesheet-chart-card">
          <div className="timesheet-chart-header">
            <h3>{title}</h3>
          </div>
          <div className="timesheet-chart-content">
            <ReactApexChart
              key={type === "pie" ? chartKey : undefined}
              options={config.options}
              series={config.series}
              type={type}
              height={230}
            />
          </div>
        </div>
      );
    },
    [chartKey]
  );

  const NoDataFound = React.memo(() => (
    <div className="timesheet-no-data">
      <NoDataFoundIcon width={125} height={100} />
      <p className="timesheet-no-data-title">No data found</p>
      <p className="timesheet-no-data-hint">
        Try adjusting your date range or filters to see timesheet entries.
      </p>
    </div>
  ));

  // ── Render ─────────────────────────────────────────────────

  if (pageLoading) return <TimesheetSkeleton />;

  return (
    <div className="timesheet-page">

      {/* ── Section 1: Page header + filters ── */}
      <div className="timesheet-header-section">
        <div className="timesheet-page-header">
          <h1 className="timesheet-page-title">Timesheet Report</h1>
          <div className="timesheet-page-actions">
            <div className="timesheet-stat-card">
              <div className="timesheet-stat-icon-wrap">
                <ClockCircleOutlined />
              </div>
              <div className="timesheet-stat-body">
                <span className="timesheet-stat-label">Total Hours</span>
                <span className="timesheet-stat-value">
                  {loading ? "—" : totalLoggedHours || "0"}
                </span>
              </div>
            </div>
            <div className="timesheet-date-wrap">
              <RangePicker
                value={selectedRange}
                presets={rangePresets}
                onChange={onRangeChange}
                className="timesheet-range-picker"
              />
            </div>
          </div>
        </div>

        <div className="timesheet-filters">
          <div className="filter-btn-wrapper">
            <TimeSheetFilterComponent onFilterChange={onFilterChange} />
          </div>
        </div>
      </div>

      {/* ── Error alert ── */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          className="timesheet-error-alert"
        />
      )}

      {/* ── Section 2: Charts (only when data is available) ── */}
      {!loading && tableData.length > 0 && (
        <div className="timesheet-charts">
          <div className="timesheet-charts-grid">
            {renderChart(pieChartConfig, "pie", "Hours by Manager")}
            {renderChart(horizontalBarChartConfig, "bar", "Hours by Category")}
            {renderChart(verticalBarChartHoursConfig, "bar", "Hours by User")}
          </div>
        </div>
      )}

      {/* ── Section 3: Table / Loading / Empty state ── */}
      <div className="timesheet-table-section">
        {loading ? (
          <div className="timesheet-loading-state">
            <Spin size="large" tip="Loading timesheet data..." />
          </div>
        ) : tableData.length > 0 ? (
          <>
            <div className="timesheet-table-header">
              <h3 className="timesheet-table-title">Time Entries</h3>
              <Dropdown
                menu={{ items: actionMenuItems }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  icon={<MoreOutlined />}
                  className="timesheet-table-menu-btn"
                />
              </Dropdown>
            </div>

            <div className="timesheet-table-container">
              {/* Hidden export helper */}
              <div style={{ display: "none" }}>
                <ReactHTMLTableToExcel
                  id="test-table-xls-button"
                  className="ant-btn-primary"
                  table="table-to-xls"
                  filename="Timesheet"
                  sheet="tablexls"
                  buttonText="Export XLS"
                />
                <div dangerouslySetInnerHTML={{ __html: html["html"] }} />
              </div>

              <Table
                columns={columns}
                dataSource={tableData}
                rowKey={(record, index) =>
                  `${record.user}-${record.project_id}-${index}`
                }
                pagination={{
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "20", "30"],
                  showTotal: showTotal,
                  showQuickJumper: true,
                  ...pagination,
                }}
                onChange={handleTableChange}
                size="middle"
                scroll={{ x: "max-content" }}
                className="timesheet-table"
              />
            </div>
          </>
        ) : (
          <NoDataFound />
        )}
      </div>
    </div>
  );
};

export default React.memo(TimeSheet);
