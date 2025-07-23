import React, { useMemo, useCallback } from "react";
import ReactApexChart from "react-apexcharts";
import TimeSheetController from "./TimeSheetController";
import "./timesheet.css";
import dayjs from "dayjs";
import { DatePicker, Select, Table, Card, Button, Dropdown, Menu, Tooltip, Space, Tag } from "antd";
import { MoreOutlined, ExportOutlined, ReloadOutlined, SortAscendingOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import moment from "moment";
import ReactHTMLTableToExcel from "react-html-table-to-excel";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import { removeTitle } from "../../../util/nameFilter";

const { RangePicker } = DatePicker;
const { Option } = Select;

dayjs.extend(quarterOfYear);

const TimeSheet = () => {
  const companySlug = localStorage.getItem("companyDomain");
  const {
    value, project, projectType, manager, department, setDepartment, user,
    onRangeChange, isPopoverVisible, setIsPopoverVisible, handleOpenThreeDotMenu,
    setIssortbyPopUp, sortbyPopUp, rangePresets, selectedRange,
    handleMouseEnter, handleMouseLeave,
    // Lists
    technologyList, projectManagerList, projectTypeList, userEmployeeList,
    projectList, departmentList,
    // Data
    getUserEmployeeList, tableData, projectTypeData, departmentData, usersData,
    pieechartDataMangerNames, pieeChartData, totalLoggedHours,
    // Handlers
    handleDepartMentChange, handleTechnologyChange, handleManagerChange,
    handleProjectChange, handleUserChange, handleTypeChange, handleTableChange,
    handleSortSelect,
    // Others
    pagination, html, sortOrder, selectedSort,
    chartKey, onReset
  } = TimeSheetController();

  // Memoized calculations for chart data
  const chartData = useMemo(() => {
    const projectTypeReportData = projectTypeData.map(entry => entry.totalLoggedHours);
    const projectTypeReportDatalabelsData = projectTypeData.map(entry => entry.projectType);
    const departMentData = [];
    const departMentLogedHours = departmentData.map(entry => entry.totalLoggedHours);
    const usersDataLabels = usersData.map(entry => removeTitle(entry.user));
    const usersLogedHours = usersData.map(entry => entry.totalLoggedHours);

    return {
      projectTypeReportData,
      projectTypeReportDatalabelsData,
      departMentData,
      departMentLogedHours,
      usersDataLabels,
      usersLogedHours
    };
  }, [projectTypeData, departmentData, usersData]);

  // Memoized chart configurations
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
        colors: ['#00E396', '#008FFB', '#00D9FF', '#FEB019', '#FF4560', '#775DD0', '#546E7A', '#26a69a'],
        legend: {
          position: "bottom",
          fontSize: '14px',
          itemMargin: {
            horizontal: 8,
            vertical: 4
          }
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
                fontSize: '12px',
                itemMargin: {
                  horizontal: 4,
                  vertical: 2
                }
              }
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
        colors: ['#00E396'],
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
          }
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
          }
        },
      },
    };
  }, [projectTypeData, chartData.projectTypeReportData, chartData.projectTypeReportDatalabelsData]);

  const verticalBarChartConfig = useMemo(() => {
    if (departmentData.length === 0) return null;

    return {
      series: [
        {
          name: "Hours",
          data: chartData.departMentLogedHours,
        },
      ],
      options: {
        chart: {
          toolbar: { show: false },
          type: "bar",
          height: 350,
        },
        colors: ['#008FFB'],
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 4,
          },
        },
        dataLabels: {
          enabled: true,
          formatter: function (val) {
            return `${val}h`;
          }
        },
        xaxis: {
          categories: chartData.departMentData,
        },
        grid: {
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
        },
        tooltip: {
          y: {
            formatter: function (val) {
              return `${val} hours`;
            },
          }
        },
      },
    };
  }, [departmentData, chartData.departMentLogedHours, chartData.departMentData]);

  const verticalBarChartHoursConfig = useMemo(() => {
    if (usersData.length === 0) return null;

    // Generate different colors for each user
    const generateColors = (count) => {
      const baseColors = [
        '#FF4560', '#008FFB', '#00E396', '#FEB019', '#FF6B7A',
        '#775DD0', '#26a69a', '#546E7A', '#FF9F43', '#EE5A24',
        '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff', '#5f27cd',
        '#10ac84', '#ee5253', '#0abde3', '#feca57', '#ff6b6b',
        '#1dd1a1', '#feca57', '#ff9ff3', '#3c6382', '#40739e',
        '#487eb0', '#8c7ae6', '#f8b500', '#e17055', '#81ecec'
      ];

      // If we have more users than colors, generate additional colors
      if (count > baseColors.length) {
        const additionalColors = [];
        for (let i = baseColors.length; i < count; i++) {
          // Generate random colors for additional bars
          const hue = (i * 137.508) % 360; // Golden angle approximation for better color distribution
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
            distributed: true, // This enables different colors for each bar
          },
        },
        dataLabels: {
          enabled: true,
          style: {
            fontSize: "10px",
            colors: ['#fff'], // White text on colored bars
            fontWeight: 'bold'
          },
          formatter: function (val) {
            return `${val}h`;
          }
        },
        xaxis: {
          categories: chartData.usersDataLabels,
          labels: {
            rotate: -45,
            style: {
              fontSize: '12px'
            }
          }
        },
        grid: {
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
        },
        legend: {
          show: false, // Hide legend since we have distributed colors
        },
        tooltip: {
          y: {
            formatter: function (val) {
              return `${val} hours`;
            },
          }
        },
      },
    };
  }, [usersData, chartData.usersLogedHours, chartData.usersDataLabels]);

  // Memoized table columns - FIXED SORTING ISSUES
  const columns = useMemo(() => [
    {
      title: "User",
      dataIndex: "user",
      width: 180,
      key: "user",
      render: (text, record) => (
        <div className="user-cell">
          <span className="user-name">
            { removeTitle(record.user) }
          </span>
        </div>
      ),
      sorter: (a, b) => {
        const userA = a.user || '';
        const userB = b.user || '';
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
        const formattedTitle = Title?.replace(/(?:^|\s)([a-z])/g, function (match, group1) {
          return match?.charAt(0) + group1?.toUpperCase();
        });
        return (
          <Link to={ `/${companySlug}/project/app/${ProjectId}?tab=Time` }>
            <div className="project-cell">
              <span className="project-title-link">{ formattedTitle }</span>
            </div>
          </Link>
        );
      },
      // FIXED: Handle null/undefined values and use proper string comparison
      sorter: (a, b) => {
        const projectA = a.project || '';
        const projectB = b.project || '';
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
          <Tooltip title={ text } placement="topLeft">
            <div
              className="description-cell"
              dangerouslySetInnerHTML={ {
                __html: text.length > 50
                  ? text.slice(0, 50).replace(/\n/g, '<br>') + "..."
                  : text.replace(/\n/g, '<br>'),
              } }
            />
          </Tooltip>
        ) : (
          <span className="no-description">-</span>
        ),
      // FIXED: Handle empty/null descriptions properly
      sorter: (a, b) => {
        const descA = a.descriptions || '';
        const descB = b.descriptions || '';
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
            <span className="date-text">{ startDate }</span>
          </div>
        );
      },
      // FIXED: Proper date comparison using Date objects
      sorter: (a, b) => {
        const dateA = new Date(a.logged_date);
        const dateB = new Date(b.logged_date);
        return dateA - dateB;
      },
      align: 'center',
    },
    {
      title: "Time",
      width: 100,
      dataIndex: "logged_time",
      render: (text, record) => (
        <div className="time-cell">
          <ClockCircleOutlined className="time-icon" />
          <span className="time-hours">{ record.logged_time }</span>
        </div>
      ),
      // FIXED: Sort by actual logged hours (numeric) with proper field reference
      sorter: (a, b) => {
        const hoursA = parseFloat(a.logged_hours) || 0;
        const hoursB = parseFloat(b.logged_hours) || 0;
        return hoursA - hoursB;
      },
      align: 'center',
    },
  ], [companySlug]);

  // Memoized handlers
  const handleDepartmentSelection = useCallback((selectedDepartments) => {
    handleDepartMentChange();
    setDepartment(selectedDepartments);
    getUserEmployeeList(selectedDepartments);
  }, [handleDepartMentChange, setDepartment, getUserEmployeeList]);

  const handleCsvExport = useCallback(() => {
    const csvRef = document.getElementById("test-table-xls-button");
    csvRef?.click();
  }, []);

  // Memoized filter options
  const filterOptions = useMemo(() => ({
    filterOption: (input, option) =>
      option.children?.toLowerCase().indexOf(input?.toLowerCase()) >= 0,
    filterSort: (optionA, optionB) =>
      optionA.children?.toLowerCase().localeCompare(optionB.children?.toLowerCase())
  }), []);

  const showTotal = useCallback(
    (total, range) => `Showing ${range[0]}-${range[1]} of ${total} records`,
    []
  );

  // Render methods
  const renderFilterSelect = useCallback((
    placeholder,
    value,
    onChange,
    options,
    valueKey,
    labelKey,
    mode = "multiple"
  ) => (
    <div className="filter-select-container">
      <Select
        placeholder={ placeholder }
        mode={ mode }
        showSearch
        value={ value }
        onChange={ onChange }
        className="custom-select"
        { ...filterOptions }
      >
        { options.map((item, index) => (
          <Option
            key={ index }
            value={ item[valueKey] }
            className="custom-option"
          >
            { labelKey === "manager_name" ? removeTitle(item[labelKey]) :
              labelKey === "full_name" ? removeTitle(item[labelKey]) :
                item[labelKey] }
          </Option>
        )) }
      </Select>
    </div>
  ), [filterOptions]);

  const renderChart = useCallback((chartData, type, title) => {
    if (!chartData) return null;

    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3>{ title }</h3>
        </div>
        <div className="chart-content">
          <ReactApexChart
            key={ type === "pie" ? chartKey : undefined }
            options={ chartData.options }
            series={ chartData.series }
            type={ type }
            height={ 350 }
          />
        </div>
      </div>
    );
  }, [chartKey]);

  // Sort options for dropdown
  const sortOptions = [
    { key: "user", label: "User" },
    { key: "project", label: "Project" },
    { key: "descriptions", label: "Description" },
    { key: "logged_date", label: "Date" },
    { key: "logged_time", label: "Hours" },
  ];

  // Action menu items
  const actionMenuItems = [
    {
      key: 'sort',
      icon: <SortAscendingOutlined />,
      label: 'Sort By',
      children: sortOptions.map(({ key, label }) => ({
        key,
        label: (
          <div className="sort-menu-item">
            <span>{ label }</span>
            { selectedSort === key && (
              sortOrder === "asc"
                ? <i className="fi fi-rr-arrow-small-up"></i>
                : <i className="fi fi-rr-arrow-small-down"></i>
            ) }
          </div>
        ),
        onClick: () => handleSortSelect(key)
      }))
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: 'Export',
      onClick: handleCsvExport
    },
    {
      key: 'reset',
      icon: <ReloadOutlined />,
      label: 'Reset',
      onClick: onReset
    }
  ];

  return (

    <Card className="timesheet-card">
      {/* Header */ }
      <div className="page-header">
        <div className="heading-wrapper">
          <div className="heading-main">
            <h2>TimeSheet Report</h2>
          </div>


          <div className="header-btn">
            <div className="stat-item">
              <ClockCircleOutlined className="stat-icon" />
              <div className="stat-content">
                <span className="stat-label">Total Hours</span>
                <span className="stat-value">{ totalLoggedHours }</span>
              </div>
            </div>
            <div className="header-actions">
              <div className="date-picker-container">
                <RangePicker
                  value={ selectedRange }
                  presets={ rangePresets }
                  onChange={ onRangeChange }
                  className="custom-date-picker"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */ }
      <div className="global-search">
        <div className="filters-header">
          <h3>Filters</h3>
        </div>
        <div className="filter-btn-wrapper ">
          { renderFilterSelect(
            "Select Department",
            value,
            handleTechnologyChange,
            technologyList,
            "_id",
            "project_tech",
            { className: "dropdown-button" }
          ) }

          { renderFilterSelect(
            "Select Project",
            project,
            handleProjectChange,
            projectList,
            "_id",
            "title",

          ) }

          { renderFilterSelect(
            "Select Project Type",
            projectType,
            handleTypeChange,
            projectTypeList,
            "_id",
            "project_type"
          ) }

          { renderFilterSelect(
            "Select Manager",
            manager,
            handleManagerChange,
            projectManagerList,
            "_id",
            "manager_name"
          ) }

          { renderFilterSelect(
            "Select User",
            user,
            handleUserChange,
            userEmployeeList,
            "_id",
            "full_name"
          ) }
        </div>
      </div>

      {/* Charts - Updated Layout */ }
      <div className="charts-section">
        <div className="charts-grid">
     
            <div className="chart-container">
              { renderChart(pieChartConfig, "pie", "Hours by Manager") }
            </div>
            <div className="chart-container">
              { renderChart(horizontalBarChartConfig, "bar", "Hours by Project Type") }
            </div>
       

        
            <div className="chart-container">
              { renderChart(verticalBarChartHoursConfig, "bar", "Hours by User") }
            </div>
    
        </div>
      </div>

      {/* Table */ }
      <div className="table-section">
        <div className="table-header">
          <h3>Time Entries</h3>
          <div className="table-actions">
            <Dropdown
              menu={ { items: actionMenuItems } }
              trigger={ ['click'] }
              placement="bottomRight"
            >
              <Button type="text" icon={ <MoreOutlined /> } />
            </Dropdown>
          </div>
        </div>

        <div className="table-container">
          {/* Hidden export elements */ }
          <div style={ { display: 'none' } }>
            <ReactHTMLTableToExcel
              id="test-table-xls-button"
              className="ant-btn-primary"
              table="table-to-xls"
              filename="Timesheet"
              sheet="tablexls"
              buttonText="Export XLS"
            />
            <div dangerouslySetInnerHTML={ { __html: html["html"] } } />
          </div>

          { tableData && tableData.length > 0 ? (
            <Table
              columns={ columns }
              dataSource={ tableData }
              rowKey={ (record, index) => `${record.user}-${record.project_id}-${index}` }
              pagination={ {
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "30", "50"],
                showTotal: showTotal,
                showQuickJumper: true,
                ...pagination,
              } }
              onChange={ handleTableChange }
              size="middle"
              scroll={ { x: 'max-content' } }
              className="custom-table"
            />
          ) : (
            <div className="no-data-found">
              <div className="no-data-content">
                <ClockCircleOutlined className="no-data-icon" />
                <h3>No time entries found</h3>
                <p>Try adjusting your filters or date range</p>
              </div>
            </div>
          ) }
        </div>
      </div>
    </Card>

  );
};

export default TimeSheet;
