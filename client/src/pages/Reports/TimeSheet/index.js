import React, { useMemo, useCallback, useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import "./timesheet.css";
import dayjs from "dayjs";
import {
  DatePicker,
  Table,
  Card,
  Button,
  Dropdown,
  Tooltip,
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

  const [technologies, setTechnologies] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [managers, setManagers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [pieechartDataMangerNames, setPieChartDataMangerNames] = useState([]);
  const [pieeChartData, setPieChartData] = useState([]);
  const [projectTypeData, setProjectTyeData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [totalLoggedHours, setTotalLoggedHours] = useState("");
  const [selectedSort, setSelectedSort] = useState("logged_date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [html, setHtml] = useState([]);
  const [chartKey, setChartKey] = useState(0);
  const [selectedRange, setSelectedRange] = useState(defaultSelectedRange);

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
        dispatch(hideAuthLoader());
      } catch (error) {
        dispatch(hideAuthLoader());
        console.error(error);
        setTableData([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
      }
    },
    [dispatch, pagination.current, pagination.pageSize, selectedSort, sortOrder, technologies, projectTypes, managers, projects, departments, users, selectedRange]
  );

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
        dispatch(hideAuthLoader());
      } catch (error) {
        dispatch(hideAuthLoader());
        console.error(error);
      }
    },
    [dispatch, pagination.current, pagination.pageSize, selectedSort, sortOrder, technologies, projectTypes, managers, projects, departments, users, selectedRange]
  );

  const onFilterChange = useCallback(
    (skipParams, selectedFilters) => {
      if (skipParams.includes("skipAll")) {
        setTechnologies([]);
        setProjectTypes([]);
        setManagers([]);
        setProjects([]);
        setDepartments([]);
        setUsers([]);
        setPagination({ ...pagination, current: 1 });
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
        setPagination({ ...pagination, current: 1 });
      }

      // getTimeSheetReportsDetails();
      exportTimesheetReportCSV();
    },
    [pagination, getTimeSheetReportsDetails, exportTimesheetReportCSV]
  );

  useEffect(() => {
    getTimeSheetReportsDetails();
  }, [getTimeSheetReportsDetails]);

  useEffect(() => {
    setChartKey((prevKey) => prevKey + 1);
  }, [pieeChartData]);

  const onRangeChange = useCallback(
    (dates) => {
      setSelectedRange(dates);
      getTimeSheetReportsDetails({
        startDate: dates && dates[0],
        endDate: dates && dates[1],
      });
      exportTimesheetReportCSV({
        startDate: dates && dates[0],
        endDate: dates && dates[1],
      });
    },
    [getTimeSheetReportsDetails, exportTimesheetReportCSV]
  );

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
      getTimeSheetReportsDetails({ sort: sortOption, sortBy: newSortOrder });
      exportTimesheetReportCSV({ sort: sortOption, sortBy: newSortOrder });
    },
    [selectedSort, sortOrder, getTimeSheetReportsDetails, exportTimesheetReportCSV]
  );

  const handleTableChange = useCallback(
    (page, _, sorter) => {
      let sortField = null;
      let sortOrder = null;
      if (sorter && sorter.field && sorter.order) {
        sortField = sorter.field;
        sortOrder = sorter.order === "ascend" ? "asc" : "desc";
        setSelectedSort(sortField);
        setSortOrder(sortOrder);
        getTimeSheetReportsDetails({ sort: sortField, sortBy: sortOrder });
        exportTimesheetReportCSV({ sort: sortField, sortBy: sortOrder });
      }
      setPagination({ ...pagination, ...page });
    },
    [pagination, getTimeSheetReportsDetails, exportTimesheetReportCSV]
  );

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

  const pieChartConfig = useMemo(() => {
    if (pieeChartData.length === 0) return null;

    return {
      series: pieeChartData,
      options: {
        chart: {
          type: "pie",
          height: 350,
        },
        labels: pieechartDataMangerNames,
        colors: [
          "#00E396",
          "#008FFB",
          "#00D9FF",
          "#FEB019",
          "#FF4560",
          "#775DD0",
          "#546E7A",
          "#26a69a",
        ],
        legend: {
          position: "bottom",
          fontSize: "14px",
          itemMargin: {
            horizontal: 8,
            vertical: 4,
          },
        },
        tooltip: {
          y: {
            formatter: function (val) {
              return `${val?.toFixed(2)} hours`;
            },
          },
        },
        responsive: [
          {
            breakpoint: 768,
            options: {
              chart: {
                height: 300,
              },
              legend: {
                fontSize: "12px",
                itemMargin: {
                  horizontal: 4,
                  vertical: 2,
                },
              },
            },
          },
        ],
      },
    };
  }, [pieeChartData, pieechartDataMangerNames]);

  const horizontalBarChartConfig = useMemo(() => {
    if (projectTypeData.length === 0) return null;

    return {
      series: [
        {
          name: "Hours",
          data: chartData.projectTypeReportData,
        },
      ],
      options: {
        chart: {
          toolbar: { show: false },
          type: "bar",
          height: 350,
        },
        colors: ["#00E396"],
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 4,
          },
        },
        dataLabels: {
          enabled: true,
          formatter: function (val) {
            return `${val}h`;
          },
        },
        xaxis: {
          categories: chartData.projectTypeReportDatalabelsData,
        },
        grid: {
          xaxis: { lines: { show: true } },
          yaxis: { lines: { show: false } },
        },
        tooltip: {
          y: {
            formatter: function (val) {
              return `${val} hours`;
            },
          },
        },
      },
    };
  }, [
    projectTypeData,
    chartData.projectTypeReportData,
    chartData.projectTypeReportDatalabelsData,
  ]);

  const verticalBarChartHoursConfig = useMemo(() => {
    if (usersData.length === 0) return null;

    const generateColors = (count) => {
      const baseColors = [
        "#FF4560",
        "#008FFB",
        "#00E396",
        "#FEB019",
        "#FF6B7A",
        "#775DD0",
        "#26a69a",
        "#546E7A",
        "#FF9F43",
        "#EE5A24",
        "#5f27cd",
        "#00d2d3",
        "#ff9ff3",
        "#54a0ff",
        "#5f27cd",
        "#10ac84",
        "#ee5253",
        "#0abde3",
        "#feca57",
        "#ff6b6b",
        "#1dd1a1",
        "#feca57",
        "#ff9ff3",
        "#3c6382",
        "#40739e",
        "#487eb0",
        "#8c7ae6",
        "#f8b500",
        "#e17055",
        "#81ecec",
      ];

      if (count > baseColors.length) {
        const additionalColors = [];
        for (let i = baseColors.length; i < count; i++) {
          const hue = (i * 137.508) % 360;
          additionalColors.push(`hsl(${hue}, 70%, 60%)`);
        }
        return [...baseColors, ...additionalColors];
      }

      return baseColors.slice(0, count);
    };

    const colors = generateColors(chartData.usersLogedHours.length);

    return {
      series: [
        {
          name: "Hours",
          data: chartData.usersLogedHours,
        },
      ],
      options: {
        chart: {
          toolbar: { show: false },
          type: "bar",
          height: 400,
        },
        colors: colors,
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 4,
            distributed: true,
          },
        },
        dataLabels: {
          enabled: true,
          style: {
            fontSize: "10px",
            colors: ["#fff"],
            fontWeight: "bold",
          },
          formatter: function (val) {
            return `${val}h`;
          },
        },
        xaxis: {
          categories: chartData.usersDataLabels,
          labels: {
            rotate: -45,
            style: {
              fontSize: "12px",
            },
          },
        },
        grid: {
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
        },
        legend: {
          show: false,
        },
        tooltip: {
          y: {
            formatter: function (val) {
              return `${val} hours`;
            },
          },
        },
      },
    };
  }, [usersData, chartData.usersLogedHours, chartData.usersDataLabels]);

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
        sorter: (a, b) => {
          const userA = a.user || "";
          const userB = b.user || "";
          return userA.localeCompare(userB);
        },
        ellipsis: true,
      },
      {
        title: "Project",
        width: 220,
        dataIndex: "project",
        key: "project",
        render: (text, record) => {
          const Title = record?.project;
          const ProjectId = record?.project_id;
          const formattedTitle = Title?.replace(
            /(?:^|\s)([a-z])/g,
            function (match, group1) {
              return match?.charAt(0) + group1?.toUpperCase();
            }
          );
          return (
            <Link to={`/${companySlug}/project/app/${ProjectId}?tab=Time`}>
              <div className="project-cell">
                <span className="project-title-link">{formattedTitle}</span>
              </div>
            </Link>
          );
        },
        sorter: (a, b) => {
          const projectA = a.project || "";
          const projectB = b.project || "";
          return projectA.localeCompare(projectB);
        },
        ellipsis: true,
      },
      {
        title: "Description",
        width: 300,
        dataIndex: "descriptions",
        key: "descriptions",
        render: (text, record) =>
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
        sorter: (a, b) => {
          const descA = a.descriptions || "";
          const descB = b.descriptions || "";
          return descA.localeCompare(descB);
        },
        ellipsis: true,
      },
      {
        title: "Date",
        width: 120,
        dataIndex: "logged_date",
        key: "logged_date",
        render: (text, record) => {
          const startDate = moment(record.logged_date).format("DD MMM YYYY");
          return (
            <div className="date-cell">
              <CalendarOutlined className="date-icon" />
              <span className="date-text">{startDate}</span>
            </div>
          );
        },
        sorter: (a, b) => {
          const dateA = new Date(a.logged_date);
          const dateB = new Date(b.logged_date);
          return dateA - dateB;
        },
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
        sorter: (a, b) => {
          const hoursA = parseFloat(a.logged_hours) || 0;
          const hoursB = parseFloat(b.logged_hours) || 0;
          return hoursA - hoursB;
        },
        align: "center",
      },
    ],
    [companySlug]
  );

  const handleCsvExport = useCallback(() => {
    const csvRef = document.getElementById("test-table-xls-button");
    csvRef?.click();
  }, []);

  const showTotal = useCallback(
    (total, range) => `Showing ${range[0]}-${range[1]} of ${total} records`,
    []
  );

  const renderChart = useCallback(
    (chartData, type, title) => {
      if (!chartData) return null;

      return (
        <div className="chart-container">
          <div className="chart-header">
            <h3>{title}</h3>
          </div>
          <div className="chart-content">
            <ReactApexChart
              key={type === "pie" ? chartKey : undefined}
              options={chartData.options}
              series={chartData.series}
              type={type}
              height={350}
            />
          </div>
        </div>
      );
    },
    [chartKey]
  );

  const sortOptions = [
    { key: "user", label: "User" },
    { key: "project", label: "Project" },
    { key: "descriptions", label: "Description" },
    { key: "logged_date", label: "Date" },
    { key: "logged_time", label: "Hours" },
  ];

  const actionMenuItems = [
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
                <i className="fi fi-rr-arrow-small-up"></i>
              ) : (
                <i className="fi fi-rr-arrow-small-down"></i>
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
        setPagination({ ...pagination, current: 1 });
        getTimeSheetReportsDetails({ sort: "logged_date", sortBy: "asc" });
        exportTimesheetReportCSV({ sort: "logged_date", sortBy: "asc" });
      },
    },
  ];

  const NoDataFound = React.memo(() => (
    <div className="no-data-found-div">
      <h1>No data found</h1>
    </div>
  ));

  return (
    <Card className="timesheet-card">
      <div className="page-header">
        <div className="heading-wrapper">
          <div className="heading-main">
            <h2>Timesheet Report</h2>
          </div>
          <div className="header-btn">
            <div className="stat-item">
              <ClockCircleOutlined className="stat-icon" />
              <div className="stat-content">
                <span className="stat-label">Total Hours</span>
                <span className="stat-value">{totalLoggedHours}</span>
              </div>
            </div>
            <div className="header-actions">
              <div className="date-picker-container">
                <RangePicker
                  value={selectedRange}
                  presets={rangePresets}
                  onChange={onRangeChange}
                  className="custom-date-picker"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="global-search">
        <div className="filters-header">
          <h3>Filters</h3>
        </div>
        <div className="filter-btn-wrapper">
          <TimeSheetFilterComponent onFilterChange={onFilterChange} />
        </div>
      </div>

      {tableData && tableData.length > 0 && (
        <div className="charts-section">
          <div className="charts-grid">
            {renderChart(pieChartConfig, "pie", "Hours by Manager")}
            {renderChart(horizontalBarChartConfig, "bar", "Hours by Project Type")}
            {/* {renderChart(verticalBarChartConfig, "bar", "Hours by Department")} */}
            {renderChart(verticalBarChartHoursConfig, "bar", "Hours by User")}
          </div>
        </div>
      )}

      {tableData && tableData.length > 0 ? (
        <div className="table-section">
          <div className="table-header">
            <h3>Time Entries</h3>
            <div className="table-actions">
              <Dropdown
                menu={{ items: actionMenuItems }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button type="text" icon={<MoreOutlined />} />
              </Dropdown>
            </div>
          </div>

          <div className="table-container">
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
                pageSizeOptions: ["10", "20", "30", "50"],
                showTotal: showTotal,
                showQuickJumper: true,
                ...pagination,
              }}
              onChange={handleTableChange}
              size="middle"
              scroll={{ x: "max-content" }}
              className="custom-table"
            />
          </div>
        </div>
      ) : (
        <NoDataFound />
      )}
    </Card>
  );
};

export default React.memo(TimeSheet);