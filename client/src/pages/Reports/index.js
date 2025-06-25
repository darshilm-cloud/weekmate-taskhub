import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Header } from "antd/lib/layout/layout";
import { Form, Popover, Select, Space, Table } from "antd";
import ReactApexChart from "react-apexcharts";
import ReactHTMLTableToExcel from "react-html-table-to-excel";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import moment from "moment";

import ProjectsRunningController from "./ProjectsRunningController";
import { removeTitle } from "../../util/nameFilter";
import "./projectrunning.css";

const { Option } = Select;

// Constants
const CHART_COLORS = {
  primary: "#00E396",
  white: "#fff"
};

const BREAKPOINTS = {
  mobile: 480
};

// Memoized components
const SortIcon = React.memo(({ sortOrder }) => (
  sortOrder === "asc" 
    ? <i className="fi fi-rr-arrow-small-up"></i>
    : <i className="fi fi-rr-arrow-small-down"></i>
));

const NoDataFound = React.memo(() => (
  <div className="no-data-found-div">
    <h1>No data</h1>
  </div>
));

const ProjectsRunning = () => {
  const {
    value,
    projectManager,
    projectType,
    handleMouseEnter,
    handleMouseLeave,
    technologyList,
    projectManagerList,
    projectTypeList,
    isPopoverVisible,
    setIsPopoverVisible,
    handleOpenThreeDotMenu,
    sortbyPopUp,
    setIssortbyPopUp,
    handleTechnologyChange,
    handleTypeChange,
    handleManagerChange,
    tableData,
    handleTableChange,
    pagination,
    metaDataOfReports,
    pieechartDataMangerNames,
    projectTypeData,
    technologiesData,
    pieeChartData,
    handleSortSelect,
    html,
    getProjectReportsDetails,
    selectedSort,
    sortOrder,
  } = ProjectsRunningController();

  const [chartKey, setChartKey] = useState(0);

  // Memoized utility functions
  const formatTitle = useCallback((title) => {
    return title?.replace(/(?:^|\s)([a-z])/g, (match, group1) => 
      match?.charAt(0) + group1?.toUpperCase()
    );
  }, []);

  const formatDate = useCallback((date) => 
    moment(date).format("DD MMM YYYY"), []);

  // Memoized table columns
  const columns = useMemo(() => [
    {
      title: "Project Name",
      dataIndex: "title",
      key: "title",
      render: (_, record) => {
        const formattedTitle = formatTitle(record?.title);
        return (
          <Link to={`project/app/${record?._id}?tab=${record?.defaultTab?.name}`}>
            <div className="project_title_main_div">
              <span>{formattedTitle}</span>
            </div>
          </Link>
        );
      },
      width: 400,
      sorter: (a, b) => a.title.localeCompare(b.title),
    },
    {
      title: "Project Manager",
      dataIndex: "managerName",
      width: 300,
      key: "managerName",
      render: (_, record) => (
        <span style={{ textTransform: "capitalize" }}>
          {removeTitle(record.managerName)}
        </span>
      ),
      sorter: (a, b) => a.managerName.localeCompare(b.managerName),
    },
    {
      title: "Technology",
      dataIndex: "technologyName",
      width: 150,
      sorter: (a, b) => a.technologyName[0].localeCompare(b.technologyName[0]),
      key: "technologyName",
      render: (_, record) => (
        <span style={{ textTransform: "capitalize" }}>
          {record.technologyName.join(" , ")}
        </span>
      ),
    },
    {
      title: "Project Type",
      dataIndex: "project_typeName",
      width: 150,
      sorter: (a, b) => a.project_typeName.localeCompare(b.project_typeName),
      key: "projecttypeName",
      render: (_, record) => (
        <span style={{ textTransform: "capitalize" }}>
          {record.project_typeName}
        </span>
      ),
    },
    {
      title: "Estimated Hours",
      dataIndex: "estimatedHours",
      width: 50,
      sorter: (a, b) => a.estimatedHours.localeCompare(b.estimatedHours),
      key: "estimatedHours",
      render: (_, record) => (
        <span style={{ textTransform: "capitalize" }}>
          {record.estimatedHours}
        </span>
      ),
    },
    {
      title: "Used Hours",
      dataIndex: "total_logged_time",
      width: 50,
      sorter: (a, b) => a.total_logged_time.localeCompare(b.total_logged_time),
      key: "total_logged_time",
      render: (_, record) => (
        <span style={{ textTransform: "capitalize" }}>
          {record.total_logged_time}
        </span>
      ),
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      width: 200,
      sorter: (a, b) => a.start_date.localeCompare(b.start_date),
      key: "start_date",
      render: (_, record) => (
        <span style={{ textTransform: "capitalize" }}>
          {formatDate(record.start_date)}
        </span>
      ),
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      width: 200,
      sorter: (a, b) => a.end_date.localeCompare(b.end_date),
      key: "end_date",
      render: (_, record) => (
        <span style={{ textTransform: "capitalize" }}>
          {formatDate(record.end_date)}
        </span>
      ),
    },
  ], [formatTitle, formatDate]);

  // Memoized chart data processing
  const processedChartData = useMemo(() => {
    const filteredProjectTypeData = projectTypeData.filter(
      entry => entry.project_typeName
    );
    
    return {
      filteredProjectTypeData,
      projectTypeReportData: filteredProjectTypeData.map(entry => entry.totalProjects),
      projectTypeLabels: filteredProjectTypeData.map(entry => entry.project_typeName),
      technologyReportData: technologiesData.map(entry => entry.totalProjects),
      technologyLabels: technologiesData.map(entry => entry.technologyName)
    };
  }, [projectTypeData, technologiesData]);

  // Memoized chart configurations
  const pieChartData = useMemo(() => {
    if (!pieeChartData || pieeChartData.length === 0) return null;
    
    return {
      series: pieeChartData,
      options: {
        chart: {
          width: 380,
          type: "pie",
        },
        labels: pieechartDataMangerNames || [],
        responsive: [
          {
            breakpoint: BREAKPOINTS.mobile,
            options: {
              legend: {
                position: "bottom",
              },
            },
          },
        ],
      },
    };
  }, [pieeChartData, pieechartDataMangerNames]);

  const horizontalBarChartData = useMemo(() => {
    const { filteredProjectTypeData, projectTypeReportData, projectTypeLabels } = processedChartData;
    
    if (filteredProjectTypeData.length === 0) return null;
    
    return {
      series: [
        {
          name: "Projects",
          data: projectTypeReportData,
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
          xaxis: [
            {
              x: 500,
              borderColor: CHART_COLORS.primary,
              label: {
                borderColor: CHART_COLORS.primary,
                style: {
                  color: CHART_COLORS.white,
                  background: CHART_COLORS.primary,
                },
              },
            },
          ],
          yaxis: [
            {
              y: "July",
              y2: "September",
            },
          ],
        },
        plotOptions: {
          bar: { horizontal: true },
        },
        dataLabels: { enabled: true },
        xaxis: {
          categories: projectTypeLabels,
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
          position: "top",
          horizontalAlign: "left",
          offsetX: 40,
        },
        tooltip: {
          fillSeriesColor: true,
        },
      },
    };
  }, [processedChartData]);

  const verticalBarChartData = useMemo(() => {
    const { technologyReportData, technologyLabels } = processedChartData;
    
    if (!technologiesData || technologiesData.length === 0) return null;
    
    return {
      series: [
        {
          name: "TechnologyWiseProject",
          data: technologyReportData,
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
          xaxis: [
            {
              x: 500,
              borderColor: CHART_COLORS.primary,
              label: {
                borderColor: CHART_COLORS.primary,
                style: {
                  color: CHART_COLORS.white,
                  background: CHART_COLORS.primary,
                },
              },
            },
          ],
          yaxis: [
            {
              y: "July",
              y2: "September",
            },
          ],
        },
        plotOptions: {
          bar: { horizontal: false },
        },
        dataLabels: { enabled: true },
        xaxis: {
          categories: technologyLabels,
        },
        grid: {
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
        },
        yaxis: {
          reversed: false,
          axisTicks: { show: true },
        },
        tooltip: {
          fillSeriesColor: true,
        },
      },
    };
  }, [processedChartData, technologiesData]);

  // Memoized sort options
  const sortOptions = useMemo(() => [
    { key: "title", label: "Project Name" },
    { key: "managerName", label: "Project Manager" },
    { key: "technologyName", label: "Technology" },
    { key: "project_typeName", label: "Project Type" },
    { key: "estimatedHours", label: "Estimated Hours" },
    { key: "total_logged_time", label: "Used Hours" },
    { key: "start_date", label: "Start Date" },
    { key: "end_date", label: "End Date" },
  ], []);

  // Memoized handlers
  const handlePopoverClose = useCallback(() => {
    setIsPopoverVisible(false);
    setIssortbyPopUp(false);
  }, [setIsPopoverVisible, setIssortbyPopUp]);

  const handleExportClick = useCallback(() => {
    const csvRef = document.getElementById("test-table-xls-button");
    csvRef?.click();
  }, []);

  const handleResetClick = useCallback(() => {
    getProjectReportsDetails({ sort: "logged_date" });
  }, [getProjectReportsDetails]);

  const showTotal = useCallback(
    (total) => `Total Records Count is ${total}`,
    []
  );

  // Effect for chart re-rendering
  useEffect(() => {
    setChartKey(prevKey => prevKey + 1);
  }, [pieeChartData]);

  // Render methods
  const renderFilterSelect = useCallback((
    name,
    placeholder,
    value,
    onChange,
    options,
    valueKey,
    labelKey,
    mode = "multiple"
  ) => (
    <div className="project-running-reports-fillter">
      <Form.Item name={name}>
        <Select
          placeholder={placeholder}
          mode={mode}
          showSearch
          value={value}
          onChange={onChange}
          filterOption={(input, option) =>
            option.children
              ?.toLowerCase()
              .indexOf(input?.toLowerCase()) >= 0
          }
          filterSort={(optionA, optionB) =>
            optionA.children
              ?.toLowerCase()
              .localeCompare(optionB.children?.toLowerCase())
          }
        >
          {options.map((item, index) => (
            <Option
              key={index}
              value={item[valueKey]}
              style={{ textTransform: "capitalize" }}
            >
              {labelKey === "manager_name" ? removeTitle(item[labelKey]) : item[labelKey]}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </div>
  ), []);

  const renderSortOptions = useCallback(() => (
    <div className="project-runnig-sort-by-listing">
      {sortOptions.map(({ key, label }) => (
        <p key={key} onClick={() => handleSortSelect(key)}>
          {label}
          {selectedSort === key && <SortIcon sortOrder={sortOrder} />}
        </p>
      ))}
    </div>
  ), [sortOptions, handleSortSelect, selectedSort, sortOrder]);

  const renderChart = useCallback((chartData, type, width = "100%") => {
    if (!chartData) return null;
    
    return (
      <ReactApexChart
        key={type === "pie" ? chartKey : undefined}
        options={chartData.options}
        series={chartData.series}
        type={type}
        width={width}
      />
    );
  }, [chartKey]);

  return (
    <div className="main-time-sheet-project-wrapper">
      <Header className="main-header">
        <div className="project-name">
          <h3 style={{ textTransform: "capitalize" }}>Projects-Running</h3>
        </div>
      </Header>
      
      <div className="project-wrapper new-project-overview project-running-reports">
        <div className="peoject-page">
          <div className="header">
            <div className="project-running-reports-fillter-wrapper">
              <h1 style={{ textTransform: "capitalize" }}>Filter</h1>
              
              {renderFilterSelect(
                "technology",
                "Technology",
                value,
                handleTechnologyChange,
                technologyList,
                "_id",
                "project_tech"
              )}
              
              {renderFilterSelect(
                "projectManager",
                "Project Manager",
                projectManager,
                handleManagerChange,
                projectManagerList,
                "_id",
                "manager_name"
              )}
              
              {renderFilterSelect(
                "projectype",
                "Project Type",
                projectType,
                handleTypeChange,
                projectTypeList,
                "_id",
                "project_type"
              )}
            </div>
            
            <div className="project-running-reports-fillter">
              <h3>Total Projects</h3>
              <span>{metaDataOfReports.total}</span>
            </div>
          </div>

          <div className="project-panel-header">
            <div
              className="project-runnig-data-wrapper"
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              {renderChart(pieChartData, "pie")}
              {renderChart(horizontalBarChartData, "bar")}
              {renderChart(verticalBarChartData, "bar")}
            </div>

            <div
              className="project-panel-table-data"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {tableData && tableData.length > 0 && (
                <Popover
                  placement="left"
                  visible={isPopoverVisible}
                  onVisibleChange={handlePopoverClose}
                  content={
                    <>
                      <div onClick={() => setIsPopoverVisible(true)}>
                        <Popover
                          placement="rightTop"
                          visible={sortbyPopUp}
                          onVisibleChange={setIssortbyPopUp}
                          content={renderSortOptions()}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                            className="project-running-sort-by-popup"
                          >
                            <i className="fi fi-rr-caret-left"></i>
                            <p>sortBy</p>
                          </div>
                        </Popover>
                      </div>

                      <p onClick={handleExportClick} style={{ cursor: "pointer" }}>
                        Export
                      </p>
                      <p onClick={handleResetClick} style={{ cursor: "pointer" }}>
                        Reset
                      </p>
                    </>
                  }
                >
                  <Space align="end" style={{ marginRight: 10 }}>
                    <i
                      onClick={handleOpenThreeDotMenu}
                      style={{ cursor: "pointer" }}
                      className="fi fi-br-menu-dots-vertical"
                    ></i>
                  </Space>
                </Popover>
              )}

              <div hidden>
                <ReactHTMLTableToExcel
                  id="test-table-xls-button"
                  className="ant-btn-primary"
                  table="table-to-xls"
                  filename="Projects"
                  sheet="tablexls"
                  buttonText="Export XLS"
                />
                <div dangerouslySetInnerHTML={{ __html: html["html"] }}></div>
              </div>
              
              {tableData && tableData.length > 0 ? (
                <Table
                  columns={columns}
                  dataSource={tableData}
                  pagination={{
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "30"],
                    showTotal: showTotal,
                    ...pagination,
                  }}
                  onChange={handleTableChange}
                />
              ) : (
                <NoDataFound />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsRunning;
