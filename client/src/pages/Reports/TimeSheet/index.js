import React, { useMemo, useCallback } from "react";
import { Header } from "antd/lib/layout/layout";
import ReactApexChart from "react-apexcharts";
import TimeSheetController from "./TimeSheetController";
import "./timesheet.css";
import dayjs from "dayjs";
import { DatePicker, Space, Select, Table, Popover, Card } from "antd";
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
    const departMentData = departmentData.map(entry => entry.employeeDepartment);
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
          width: 380,
          type: "pie",
          height: 350,
        },
        labels: pieechartDataMangerNames,
        legend: {
          position: "right",
          offsetY: 0,
          height: 350,
          width: 200,
          fontSize: "12px",
          itemMargin: {
            horizontal: 5,
            vertical: 2
          },
          formatter: function (seriesName, opts) {
            // Truncate long names and add tooltip
            if (seriesName.length > 15) {
              return seriesName.substring(0, 15) + "...";
            }
            return seriesName;
          }
        },
        tooltip: {
          y: {
            formatter: function (val) {
              return typeof val !== "undefined" ? val.toFixed(2) : val;
            },
          },
        },
        responsive: [
          {
            breakpoint: 1024,
            options: {
              chart: {
                width: 300,
                height: 300,
              },
              legend: {
                position: "bottom",
                width: undefined,
                height: 100,
                offsetY: 10,
                fontSize: "10px",
                itemMargin: {
                  horizontal: 3,
                  vertical: 1
                }
              },
            },
          },
          {
            breakpoint: 768,
            options: {
              chart: {
                width: 250,
                height: 250,
              },
              legend: {
                position: "bottom",
                width: undefined,
                height: 80,
                offsetY: 5,
                fontSize: "9px",
                itemMargin: {
                  horizontal: 2,
                  vertical: 1
                }
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
          width: 100,
        },
        annotations: {
          xaxis: [{
            x: 500,
            borderColor: "#00E396",
            label: {
              borderColor: "#00E396",
              style: {
                color: "#fff",
                background: "#00E396",
              },
            },
          }],
          yaxis: [{
            y: "July",
            y2: "September",
          }],
        },
        plotOptions: {
          bar: {
            horizontal: true,
          },
        },
        dataLabels: { enabled: true },
        xaxis: {
          categories: chartData.projectTypeReportDatalabelsData,
        },
        grid: {
          xaxis: { lines: { show: true } },
          yaxis: { lines: { show: false } },
        },
        yaxis: {
          reversed: false,
          axisTicks: { show: true },
        },
        legend: {
          show: true,
          position: "bottom",
          horizontalAlign: "left",
          offsetX: 40,
        },
        tooltip: { fillSeriesColor: true },
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
          width: 100,
        },
        annotations: {
          xaxis: [{
            x: 500,
            borderColor: "#00E396",
            label: {
              borderColor: "#00E396",
              style: {
                color: "#fff",
                background: "#00E396",
              },
            },
          }],
          yaxis: [{
            y: "July",
            y2: "September",
          }],
        },
        plotOptions: {
          bar: { horizontal: false },
        },
        dataLabels: { enabled: true },
        xaxis: {
          categories: chartData.departMentData,
        },
        grid: {
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
        },
        yaxis: {
          reversed: false,
          axisTicks: { show: true },
        },
        legend: {
          show: true,
          position: "right",
          labels: { colors: "#008FFB" },
        },
        tooltip: { fillSeriesColor: true },
      },
    };
  }, [departmentData, chartData.departMentLogedHours, chartData.departMentData]);

  const verticalBarChartHoursConfig = useMemo(() => {
    if (usersData.length === 0) return null;

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
          height: 450,
          width: 200,
        },
        annotations: {
          xaxis: [{
            x: 500,
            borderColor: "#00E396",
            label: {
              borderColor: "#00E396",
              style: {
                color: "#fff",
                background: "#00E396",
              },
            },
          }],
          yaxis: [{
            y: "July",
            y2: "September",
          }],
        },
        plotOptions: {
          bar: { horizontal: false },
        },
        dataLabels: {
          enabled: true,
          style: { fontSize: "10px" },
        },
        xaxis: {
          categories: chartData.usersDataLabels,
        },
        grid: {
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
        },
        yaxis: {
          reversed: false,
          axisTicks: { show: true },
        },
        legend: {
          show: true,
          position: "right",
          labels: { colors: "#008FFB" },
        },
        tooltip: { fillSeriesColor: true },
      },
    };
  }, [usersData, chartData.usersLogedHours, chartData.usersDataLabels]);

  // Memoized table columns
  const columns = useMemo(() => [
    {
      title: "User",
      dataIndex: "user",
      width: 300,
      key: "user",
      render: (text, record) => (
        <span style={ { textTransform: "capitalize" } }>
          { removeTitle(record.user) }
        </span>
      ),
      sorter: (a, b) => a.user.localeCompare(b.user),
    },
    {
      title: "Project",
      width: 250,
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
            <div className="project_title_main_div">
              <span>{ formattedTitle }</span>
            </div>
          </Link>
        );
      },
      sorter: (a, b) => a.project.localeCompare(b.project),
    },
    {
      title: "Description",
      width: 500,
      dataIndex: "descriptions",
      key: "descriptions",
      render: (text, record) =>
        text ? (
          <div
            className="time-description-text"
            dangerouslySetInnerHTML={ {
              __html: text.length > 10
                ? text.slice(0, 15).replace(/\n/g, '<br>') + "..."
                : text.replace(/\n/g, '<br>'),
            } }
          />
        ) : (
          "-"
        ),
      sorter: (a, b) => a.descriptions.localeCompare(b.descriptions),
    },
    {
      title: "Date",
      width: 150,
      dataIndex: "logged_date",
      key: "logged_date",
      render: (text, record) => {
        const startDate = moment(record.logged_date).format("DD MMM YYYY");
        return <span style={ { textTransform: "capitalize" } }>{ startDate }</span>;
      },
      sorter: (a, b) => a.logged_date - b.logged_date,
    },
    {
      title: "Time",
      width: 50,
      dataIndex: "logged_time",
      render: (text, record) => (
        <span style={ { textTransform: "capitalize" } }>
          { record.logged_time }
        </span>
      ),
      sorter: (a, b) => a.logged_hours - b.logged_hours,
    },
  ], []);

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

  const handlePopoverVisibilityChange = useCallback(() => {
    setIsPopoverVisible(false);
    setIssortbyPopUp(false);
  }, [setIsPopoverVisible, setIssortbyPopUp]);

  // Memoized filter options
  const filterOptions = useMemo(() => ({
    filterOption: (input, option) =>
      option.children?.toLowerCase().indexOf(input?.toLowerCase()) >= 0,
    filterSort: (optionA, optionB) =>
      optionA.children?.toLowerCase().localeCompare(optionB.children?.toLowerCase())
  }), []);

  const showTotal = useCallback((total) => `Total Records Count is ${total}`, []);

  // Memoized sort indicators
  const SortIndicator = useCallback(({ field }) => {
    if (selectedSort !== field) return null;
    return sortOrder === "asc"
      ? <i className="fi fi-rr-arrow-small-up" />
      : <i className="fi fi-rr-arrow-small-down" />;
  }, [selectedSort, sortOrder]);

  return (
    <Card className="employee-card">

      <div className="heading-wrapper">
        <h2 >TimeSheet</h2>
        <div className="timesheet-startend-date">
          <RangePicker
            value={ selectedRange }
            presets={ rangePresets }
            onChange={ onRangeChange }
          />
        </div>
      </div>
      <div className="global-search" >
        <div className="filter-btn-wrapper timesheet">
          <Select
            placeholder="Technology"
            mode="multiple"
            showSearch
            { ...filterOptions }
            value={ value }
            onChange={ handleTechnologyChange }
          >
            { technologyList.map((item, index) => (
              <Option
                key={ index }
                value={ item._id }
                style={ { textTransform: "capitalize" } }
              >
                { item?.project_tech }
              </Option>
            )) }
          </Select>

          <Select
            mode="multiple"
            { ...filterOptions }
            value={ project }
            onChange={ handleProjectChange }
            showSearch
            placeholder="Project"
          >
            { projectList.map((item, index) => (
              <Option
                key={ index }
                value={ item._id }
                style={ { textTransform: "capitalize" } }
              >
                { item.title }
              </Option>
            )) }
          </Select>

          <Select
            mode="multiple"
            value={ projectType }
            onChange={ handleTypeChange }
            showSearch
            placeholder="Project Type"
            { ...filterOptions }
          >
            { projectTypeList.map((item, index) => (
              <Option
                key={ index }
                value={ item._id }
                style={ { textTransform: "capitalize" } }
              >
                { item.project_type }
              </Option>
            )) }
          </Select>

          <Select
            mode="multiple"
            value={ manager }
            { ...filterOptions }
            onChange={ handleManagerChange }
            showSearch
            placeholder="Manager"
          >
            { projectManagerList.map((item, index) => (
              <Option
                key={ index }
                value={ item._id }
                style={ { textTransform: "capitalize" } }
              >
                { removeTitle(item.manager_name) }
              </Option>
            )) }
          </Select>

          <Select
            mode="multiple"
            value={ department }
            onChange={ handleDepartmentSelection }
            showSearch
            placeholder="Department"
            { ...filterOptions }
          >
            { departmentList.map((item, index) => (
              <Option
                key={ index }
                value={ item._id }
                style={ { textTransform: "capitalize" } }
              >
                { item.sub_department_name }
              </Option>
            )) }
          </Select>

          <Select
            mode="multiple"
            value={ user }
            onChange={ handleUserChange }
            showSearch
            placeholder="User"
            { ...filterOptions }
          >
            { userEmployeeList.map((item, index) => (
              <Option
                key={ index }
                value={ item._id }
                style={ { textTransform: "capitalize" } }
              >
                { removeTitle(item.full_name) }
              </Option>
            )) }
          </Select>

          <div className="panel-total-hours">
            <h3>Total Hours</h3>
            <span>{ totalLoggedHours }</span>
          </div>
        </div>
      </div>
      <div className="project-panel-header">
        <div style={ { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" } }>
          { pieChartConfig && (
            <div style={ { flex: "0 0 auto", minWidth: "350px", maxWidth: "600px" } }>
              <ReactApexChart
                key={ chartKey }
                options={ pieChartConfig.options }
                series={ pieChartConfig.series }
                type="pie"
                className="timesheetchart"
                width="100%"
              />
            </div>
          ) }
          { horizontalBarChartConfig && (
            <div style={ { flex: "1 1 auto", minWidth: "300px" } }>
              <ReactApexChart
                options={ horizontalBarChartConfig.options }
                series={ horizontalBarChartConfig.series }
                type="bar"
                className="timesheetchart"
                width="100%"
              />
            </div>
          ) }
          { verticalBarChartConfig && (
            <div style={ { flex: "1 1 auto", minWidth: "300px" } }>
              <ReactApexChart
                options={ verticalBarChartConfig.options }
                series={ verticalBarChartConfig.series }
                type="bar"
                className="timesheetchart"
                width="100%"
              />
            </div>
          ) }
          { verticalBarChartHoursConfig && (
            <div style={ { flex: "1 1 auto", minWidth: "300px" } }>
              <ReactApexChart
                className="right-time-sheet-data"
                options={ verticalBarChartHoursConfig.options }
                series={ verticalBarChartHoursConfig.series }
                type="bar"
                width="100%"
              />
            </div>
          ) }
        </div>

        <div className="sheet-data-wrapper" style={ { display: "flex", justifyContent: "space-between" } }>
          <div
            className="left-time-sheet-data"
            onMouseEnter={ handleMouseEnter }
            onMouseLeave={ handleMouseLeave }
          >
            { tableData && tableData.length > 0 && (
              <Popover
                placement="left"
                visible={ isPopoverVisible }
                onVisibleChange={ handlePopoverVisibilityChange }
                content={
                  <>
                    <div
                      onClick={ () => setIsPopoverVisible(true) }
                      style={ {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      } }
                      className="time-sheet-sort-by-popup"
                    >
                      <Popover
                        placement="right"
                        visible={ sortbyPopUp }
                        onVisibleChange={ setIssortbyPopUp }
                        overlayStyle={ { marginLeft: 16 } }
                        trigger="click"
                        content={
                          <div className="time-sheet-short-by-listing">
                            { [
                              { key: "user", label: "User" },
                              { key: "project", label: "Project" },
                              { key: "descriptions", label: "Description" },
                              { key: "logged_date", label: "Date" },
                              { key: "logged_time", label: "Hours" },
                            ].map(({ key, label }) => (
                              <p key={ key } onClick={ () => handleSortSelect(key) }>
                                { label }
                                <SortIndicator field={ key } />
                              </p>
                            )) }
                          </div>
                        }
                      >
                        <div
                          style={ {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          } }
                          className="time-sheet-sort-by-popup"
                        >
                          <p>sortBy</p>
                          <i className="fi fi-rr-caret-right" />
                        </div>
                      </Popover>
                    </div>
                    <p onClick={ handleCsvExport } style={ { cursor: "pointer" } }>
                      Export
                    </p>
                    <p onClick={ onReset } style={ { cursor: "pointer" } }>
                      Reset
                    </p>
                  </>
                }
              >
                <Space align="end" style={ { marginRight: 10 } }>
                  <i
                    onClick={ handleOpenThreeDotMenu }
                    style={ { cursor: "pointer" } }
                    className="fi fi-br-menu-dots-vertical"
                  />
                </Space>
              </Popover>
            ) }

            <div hidden>
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
                size="small"
                columns={ columns }
                dataSource={ tableData }
                pagination={ {
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "20", "30"],
                  showTotal: showTotal,
                  ...pagination,
                } }
                onChange={ handleTableChange }
                className="custom-table"
                headerClassName="custom-header-row"
              />
            ) : (
              <div className="no-data-found">
                <h1>No Data</h1>
              </div>
            ) }
          </div>
        </div>
      </div>

    </Card>
  );
};

export default TimeSheet;