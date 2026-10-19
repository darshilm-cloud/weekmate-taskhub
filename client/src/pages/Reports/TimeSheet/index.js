/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useMemo, useCallback, useEffect, useState } from "react";
import { BarChartPro, DonutChartPro } from "../../../components/common/charts";
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
import useExportColumns from "../../../hooks/useExportColumns";
import { downloadHtmlTableXls } from "../../../util/csvExport";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import { removeTitle } from "../../../util/nameFilter";
import Service from "../../../service";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";
import TimeSheetFilterComponent from "./TimeSheetFilterComponent";
import {
  TimesheetSkeleton,
  TimesheetStatsSkeleton,
  TimesheetChartsSkeleton,
  TableSk,
  SkeletonBlock,
} from "../../../components/common/SkeletonLoader";
import NoDataFoundIcon from "../../../components/common/NoDataFoundIcon";
import ColumnSelector from "../../../components/common/ColumnSelector";
import useColumnVisibility from "../../../hooks/useColumnVisibility";

dayjs.extend(quarterOfYear);
// Labels match the server's sheet (server/template/timesheetReportsCSV.js).
const TIMESHEET_REPORT_EXPORT_COLUMNS = [
  "Employee",
  "Project",
  "Description",
  "Date",
  "Hours",
  "Project Manager",
  "Technology",
  "Category",
].map((label) => ({ key: label, label }));

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
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });

  // ── Data state ─────────────────────────────────────────────
  const [tableData, setTableData] = useState([]);
  const [pieechartDataMangerNames, setPieChartDataMangerNames] = useState([]);
  const [pieeChartData, setPieChartData] = useState([]);
  const [projectTypeData, setProjectTyeData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [totalLoggedHours, setTotalLoggedHours] = useState("");
  const [chartKey, setChartKey] = useState(0);

  // ── UI state ───────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);

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
            ? startDate.format("DD-MM-YYYY")
            : dayjs().startOf("month").format("DD-MM-YYYY"),
          endDate: endDate
            ? endDate.format("DD-MM-YYYY")
            : dayjs().format("DD-MM-YYYY"),
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
      columns = [],
    } = {}) => {
      try {
        dispatch(showAuthLoader());
        const reqBody = {
          columns,
          startDate: startDate
            ? startDate.format("DD-MM-YYYY")
            : dayjs().startOf("month").format("DD-MM-YYYY"),
          endDate: endDate
            ? endDate.format("DD-MM-YYYY")
            : dayjs().format("DD-MM-YYYY"),
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
        if (response?.data?.data?.html) {
          downloadHtmlTableXls(response.data.data.html, "Timesheet");
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

  const { requestExport, exportColumnsModal } = useExportColumns();

  // Export: pick columns, then fetch the sheet with just those.
  const handleCsvExport = useCallback(() => {
    requestExport({
      title: "Select Columns for Timesheet Export",
      columns: TIMESHEET_REPORT_EXPORT_COLUMNS,
      okText: "Export Excel",
      onExport: (keys) => exportTimesheetReportCSV({ columns: keys }),
    });
  }, [requestExport, exportTimesheetReportCSV]);

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

  const managerDonutData = useMemo(
    () =>
      pieeChartData.map((value, index) => ({
        name: pieechartDataMangerNames[index] || `Manager ${index + 1}`,
        value: Number(value) || 0,
      })),
    [pieeChartData, pieechartDataMangerNames]
  );
  const categoryBarData = useMemo(
    () =>
      chartData.projectTypeReportDatalabelsData.map((name, index) => ({
        name,
        value: Number(chartData.projectTypeReportData[index]) || 0,
      })),
    [chartData.projectTypeReportData, chartData.projectTypeReportDatalabelsData]
  );
  const userBarData = useMemo(
    () =>
      chartData.usersDataLabels.map((name, index) => ({
        name,
        value: Number(chartData.usersLogedHours[index]) || 0,
      })),
    [chartData.usersDataLabels, chartData.usersLogedHours]
  );

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
              {moment(record.logged_date).format("DD-MM-YYYY")}
            </span>
          </div>
        ),
        sorter: (a, b) => new Date(a.logged_date) - new Date(b.logged_date),
        align: "center",
      },
      {
        key: "logged_time",
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

  const COLUMN_LOCKED = useMemo(() => ["user"], []);
  const { visibleKeys, saveVisibleKeys, filteredColumns, saving: savingColumns } =
    useColumnVisibility("timesheetReport", columns, [], COLUMN_LOCKED);

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

  const renderChart = useCallback((kind, data, title) => {
    const hasData = Array.isArray(data) && data.some((item) => Number(item.value) > 0);
    return (
      <div className="timesheet-chart-card">
        <div className="timesheet-chart-header">
          <h3>{title}</h3>
        </div>
        <div className="timesheet-chart-content">
          {!hasData ? (
            <NoDataFoundIcon />
          ) : kind === "donut" ? (
            <DonutChartPro data={data} unit="h" height={230} />
          ) : kind === "hbar" ? (
            <BarChartPro horizontal distributed data={data} unit="h" />
          ) : (
            <BarChartPro distributed data={data} unit="h" valueFormatter={(v) => `${v}h`} />
          )}
        </div>
      </div>
    );
  }, []);

  const NoDataFound = React.memo(() => (
    <div className="timesheet-no-data">
      <NoDataFoundIcon width={125} height={100} />
      <p className="timesheet-no-data-hint">
        Try adjusting your date range or filters to see timesheet entries.
      </p>
    </div>
  ));

  // ── Render ─────────────────────────────────────────────────

  // if (pageLoading) return <TimesheetSkeleton />;

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
                  {loading && !totalLoggedHours ? (
                    <SkeletonBlock w={60} h={22} />
                  ) : (
                    totalLoggedHours || "0"
                  )}
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
            <ColumnSelector columns={columns} visibleKeys={visibleKeys} alwaysVisibleKeys={COLUMN_LOCKED} onSave={saveVisibleKeys} saving={savingColumns} />
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

      {/* ── Section 2: Charts ── */}
      {(loading && tableData.length === 0) || pageLoading ? (
        <TimesheetChartsSkeleton />
      ) : (
        tableData.length > 0 && (
          <div className="timesheet-charts">
            <div className="timesheet-charts-grid">
              {renderChart("donut", managerDonutData, "Hours by Manager")}
              {renderChart("hbar", categoryBarData, "Hours by Category")}
              {renderChart("vbar", userBarData, "Hours by User")}
            </div>
          </div>
        )
      )}

      {/* ── Section 3: Table / Loading / Empty state ── */}
      <div className="timesheet-table-section">
        {(loading && tableData.length === 0) || pageLoading ? (
          <TableSk
            cols={["2fr", "1.5fr", "1.5fr", "1fr", "1fr"]}
            rows={8}
          />
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
              {exportColumnsModal}

              <Table
                columns={filteredColumns}
                dataSource={tableData}
                rowKey={(record, index) =>
                  `${record.user}-${record.project_id}-${index}`
                }
                pagination={{
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "20", "25", "50", "100"],
                  showTotal: showTotal,
                  showQuickJumper: true,
                  ...pagination,
                }}
                onChange={handleTableChange}
                size="middle"
                scroll={{ x: "max-content" }}
                className="timesheet-table"
                loading={loading}
              />
            </div>
          </>
        ) : (
          !loading && <NoDataFound />
        )}
      </div>
    </div>
  );
};

export default React.memo(TimeSheet);
