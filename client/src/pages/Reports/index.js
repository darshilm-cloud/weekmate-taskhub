import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, Table, Button, Dropdown } from "antd";
import {
  MoreOutlined,
  ExportOutlined,
  ReloadOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import ReactHTMLTableToExcel from "react-html-table-to-excel";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import moment from "moment";
import { removeTitle } from "../../util/nameFilter";
import "./projectrunning.css";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import ProjectRunningFilterComponent from "./ProjectRunningFilterComponent";

// Memoized components
const SortIcon = React.memo(({ sortOrder }) =>
  sortOrder === "asc" ? (
    <i className="fi fi-rr-arrow-small-up"></i>
  ) : (
    <i className="fi fi-rr-arrow-small-down"></i>
  )
);

const NoDataFound = React.memo(() => (
  <div className="no-data-found-div">
    <h1>No data found</h1>
  </div>
));

// Custom Legend Component
const CustomLegend = React.memo(({ data, labels, colors }) => {
  if (!data || data.length === 0 || !labels || labels.length === 0) return null;

  const total = data.reduce((sum, value) => sum + value, 0);

  return (
    <div className="custom-legend">
      <div className="legend-grid">
        {labels.map((label, index) => (
          <div key={index} className="legend-item">
            <div 
              className="legend-color" 
              style={{ 
                backgroundColor: colors[index % colors.length]
              }}
            ></div>
            <span className="legend-label">{label}</span>
            <span className="legend-value">
              ({Math.round((data[index] / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

const ProjectsRunning = () => {
  const companySlug = localStorage.getItem("companyDomain");
  const dispatch = useDispatch();

  // Declare state variables first
  const [technologies, setTechnologies] = useState([]);
  const [managers, setManagers] = useState([]);
  const [types, setTypes] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [metaDataOfReports, setMetaDataOfReports] = useState({});
  const [pieechartDataMangerNames, setPieChartDataMangerNames] = useState([]);
  const [pieeChartData, setPieChartData] = useState([]);
  const [projectTypeData, setProjectTyeData] = useState([]);
  const [technologiesData, setTechnologiesData] = useState([]);
  const [selectedSort, setSelectedSort] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [html, setHtml] = useState([]);
  const [chartKey, setChartKey] = useState(0);

  const getProjectReportsDetails = useCallback(
    async ({
      technologies: tech = technologies,
      types: type = types,
      managers: mgr = managers,
      sort = selectedSort,
      sortBy = sortOrder,
    } = {}) => {
      try {
        dispatch(showAuthLoader());
        const reqBody = {
          technologies: tech && tech.length > 0 ? tech : [],
          types: type && type.length > 0 ? type : [],
          managers: mgr && mgr.length > 0 ? mgr : [],
          pageNo: pagination.current,
          limit: pagination.pageSize,
          sort: sort || "",
          sortBy: sortBy,
          isExport: false,
        };

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectRunningReportsDetails,
          body: reqBody,
        });
        if (response?.data && response?.data?.data) {
          setTableData(response.data.data.data);
          setMetaDataOfReports(response.data.metadata);

          const managersData = response?.data?.data?.managers || [];
          const totalProjectsAll = managersData.reduce(
            (total, item) => total + item.totalProjects,
            0
          );

          let seriesData, labels;

          if (managersData.length > 10) {
            const totalProjectsTop10 = managersData
              .slice(0, 10)
              .reduce((total, item) => total + item.totalProjects, 0);

            const totalProjectsOthers = totalProjectsAll - totalProjectsTop10;

            seriesData = [
              ...managersData.slice(0, 10).map((item) => item.totalProjects),
              totalProjectsOthers,
            ];

            labels = [
              ...managersData
                .slice(0, 10)
                .map((item) => removeTitle(item.managerName)),
              "Others",
            ];
          } else {
            seriesData = managersData.map((item) => item.totalProjects);
            labels = managersData.map((item) => removeTitle(item.managerName));
          }

          setPieChartDataMangerNames(labels);
          setPieChartData(seriesData);
          setProjectTyeData(response.data.data.types || []);
          setTechnologiesData(response.data.data.technologies || []);
          setPagination((prevPagination) => ({
            ...prevPagination,
            total: response.data.metadata.total || 0,
          }));
        } else {
          setTableData([]);
          setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
        }
        dispatch(hideAuthLoader());
      } catch (error) {
        dispatch(hideAuthLoader());
        console.error(error);
        setTableData([]);
        setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
      }
    },
    [
      dispatch,
      pagination.current,
      pagination.pageSize,
      selectedSort,
      sortOrder,
      technologies,
      managers,
      types,
    ]
  );

  const onFilterChange = useCallback(
    (skipParams, selectedFilters) => {
      if (skipParams.includes("skipAll")) {
        setTechnologies([]);
        setManagers([]);
        setTypes([]);
        setPagination({ ...pagination, current: 1 });
      } else {
        if (skipParams.includes("skipDepartment")) {
          setTechnologies([]);
        }
        if (skipParams.includes("skipProjectManager")) {
          setManagers([]);
        }
        if (skipParams.includes("skipProjectType")) {
          setTypes([]);
        }
      }

      if (selectedFilters) {
        setTechnologies(selectedFilters.department || []);
        setManagers(selectedFilters.projectManager || []);
        setTypes(selectedFilters.projectType || []);
        setPagination({ ...pagination, current: 1 });
      }
    },
    [pagination]
  );

  useEffect(() => {
    getProjectReportsDetails({});
  }, [
    getProjectReportsDetails,
    pagination.current,
    pagination.pageSize,
    technologies,
    managers,
    types,
  ]);

  const formatTitle = useCallback((title) => {
    return title?.replace(
      /(?:^|\s)([a-z])/g,
      (match, group1) => match?.charAt(0) + group1?.toUpperCase()
    );
  }, []);

  const formatDate = useCallback(
    (date) => moment(date).format("DD MMM YYYY"),
    []
  );

  // Memoized table columns
  const columns = useMemo(
    () => [
      {
        title: "Project Name",
        dataIndex: "title",
        key: "title",
        render: (_, record) => {
          const formattedTitle = formatTitle(record?.title);
          return (
            <Link
              to={`/${companySlug}/project/app/${record?._id}?tab=${record?.defaultTab?.name}`}
            >
              <div className="project_title_main_div">
                <span className="project-title-link">{formattedTitle}</span>
              </div>
            </Link>
          );
        },
        width: 250,
        sorter: (a, b) => a.title.localeCompare(b.title),
        ellipsis: true,
      },
      {
        title: "Project Manager",
        dataIndex: "managerName",
        width: 180,
        key: "managerName",
        render: (_, record) => (
          <span className="manager-name">
            {removeTitle(record.managerName)}
          </span>
        ),
        sorter: (a, b) => a.managerName.localeCompare(b.managerName),
        ellipsis: true,
      },
      {
        title: "Department",
        dataIndex: "technologyName",
        width: 150,
        sorter: (a, b) =>
          a.technologyName[0].localeCompare(b.technologyName[0]),
        key: "technologyName",
        render: (_, record) => (
          <div className="technology-tags">
            {record.technologyName.map((tech, index) => (
              <span key={index} className="technology-tag">
                {tech}
              </span>
            ))}
          </div>
        ),
        ellipsis: true,
      },
      {
        title: "Project Type",
        dataIndex: "project_typeName",
        width: 120,
        sorter: (a, b) => a.project_typeName.localeCompare(b.project_typeName),
        key: "projecttypeName",
        render: (_, record) => (
          <span className="project-type-badge">{record.project_typeName}</span>
        ),
        ellipsis: true,
      },
      {
        title: "Est. Hours",
        dataIndex: "estimatedHours",
        width: 100,
        sorter: (a, b) => a.estimatedHours.localeCompare(b.estimatedHours),
        key: "estimatedHours",
        render: (_, record) => (
          <span className="hours-display estimated-hours">
            {record.estimatedHours}
          </span>
        ),
        align: "center",
      },
      {
        title: "Used Hours",
        dataIndex: "total_logged_time",
        width: 100,
        sorter: (a, b) =>
          a.total_logged_time.localeCompare(b.total_logged_time),
        key: "total_logged_time",
        render: (_, record) => (
          <span className="hours-display used-hours">
            {record.total_logged_time}
          </span>
        ),
        align: "center",
      },
      {
        title: "Start Date",
        dataIndex: "start_date",
        width: 120,
        sorter: (a, b) => a.start_date.localeCompare(b.start_date),
        key: "start_date",
        render: (_, record) => (
          <span className="date-display">{formatDate(record.start_date)}</span>
        ),
        align: "center",
      },
      {
        title: "End Date",
        dataIndex: "end_date",
        width: 120,
        sorter: (a, b) => a.end_date.localeCompare(b.end_date),
        key: "end_date",
        render: (_, record) => (
          <span className="date-display">{formatDate(record.end_date)}</span>
        ),
        align: "center",
      },
    ],
    [formatTitle, formatDate]
  );

  // Memoized chart data processing
  const processedChartData = useMemo(() => {
    const filteredProjectTypeData = projectTypeData.filter(
      (entry) => entry.project_typeName
    );

    return {
      filteredProjectTypeData,
      projectTypeReportData: filteredProjectTypeData.map(
        (entry) => entry.totalProjects
      ),
      projectTypeLabels: filteredProjectTypeData.map(
        (entry) => entry.project_typeName
      ),
      technologyReportData: technologiesData.map(
        (entry) => entry.totalProjects
      ),
      technologyLabels: technologiesData.map((entry) => entry.technologyName),
    };
  }, [projectTypeData, technologiesData]);

  // Memoized chart configurations
  const pieChartData = useMemo(() => {
    if (!pieeChartData || pieeChartData.length === 0) return null;

    return {
      series: pieeChartData,
      options: {
        chart: {
          type: "pie",
        },
        labels: pieechartDataMangerNames || [],
        colors: [
          "#00E396",
          "#008FFB",
          "#00D9FF",
          "#FEB019",
          "#FF4560",
          "#775DD0",
          "#9C27B0",
          "#FF9800",
          "#4CAF50",
          "#F44336",
          "#2196F3"
        ],
        legend: {
          show: false,
        },
      },
    };
  }, [pieeChartData, pieechartDataMangerNames]);

  const horizontalBarChartData = useMemo(() => {
    const {
      filteredProjectTypeData,
      projectTypeReportData,
      projectTypeLabels,
    } = processedChartData;
  
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
          width: "100%",
          toolbar: { show: false },
          type: "bar",
          height: 350,
        },
        colors: ["#00E396", "#008FFB", "#FEB019", "#FF4560", "#775DD0"], // Multiple colors
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 4,
            distributed: true, // Distribute colors to each bar
          },
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
        tooltip: {
          fillSeriesColor: true,
        },
        // Ensure legend colors match the bars
        fill: {
          colors: ["#00E396", "#008FFB", "#FEB019", "#FF4560", "#775DD0"], // Explicitly set fill colors
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
          name: "Projects",
          data: technologyReportData,
        },
      ],
      options: {
        chart: {
          width: "100%",
          toolbar: { show: false },
          type: "bar",
          height: 350,
        },
        colors: ["#008FFB"],
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 4,
          },
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
  const sortOptions = useMemo(
    () => [
      { key: "title", label: "Project Name" },
      { key: "managerName", label: "Project Manager" },
      { key: "technologyName", label: "Department" },
      { key: "project_typeName", label: "Project Type" },
      { key: "estimatedHours", label: "Estimated Hours" },
      { key: "total_logged_time", label: "Used Hours" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
    ],
    []
  );

  // Memoized handlers
  const handleExportClick = useCallback(() => {
    const csvRef = document.getElementById("test-table-xls-button");
    csvRef?.click();
  }, []);

  const handleResetClick = useCallback(() => {
    setTechnologies([]);
    setManagers([]);
    setTypes([]);
    setSelectedSort("logged_date");
    setSortOrder("asc");
    setPagination({ ...pagination, current: 1 });
    getProjectReportsDetails({ sort: "logged_date", sortBy: "asc" });
  }, [getProjectReportsDetails, pagination]);

  const showTotal = useCallback(
    (total, range) => `Showing ${range[0]}-${range[1]} of ${total} projects`,
    []
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
      getProjectReportsDetails({ sort: sortOption, sortBy: newSortOrder });
    },
    [selectedSort, sortOrder, getProjectReportsDetails]
  );

  const handleTableChange = useCallback(
    (page, filters, sorter) => {
      let sortField = null;
      let sortOrder = null;
      if (sorter && sorter.field && sorter.order) {
        sortField = sorter.field;
        sortOrder = sorter.order === "ascend" ? "asc" : "desc";
        setSelectedSort(sortField);
        setSortOrder(sortOrder);
        getProjectReportsDetails({ sort: sortField, sortBy: sortOrder });
      }
      setPagination({ ...pagination, ...page });
    },
    [pagination, getProjectReportsDetails]
  );

  // Effect for chart re-rendering
  useEffect(() => {
    setChartKey((prevKey) => prevKey + 1);
  }, [pieeChartData]);

  // Render methods



const renderChart = useCallback(
  (chartData, type, title) => {
    if (!chartData) return null;

    const colors = chartData.options.colors || [];
    const chartHeight = type === "pie" ? 300 : 350;

    // Helper function to capitalize each word
    const capitalizeWords = (str) => {
      return str.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    };

    // Modify chart options to include capitalized tooltips
    const modifiedChartData = {
      ...chartData,
      options: {
        ...chartData.options,
        tooltip: {
          ...chartData.options.tooltip,
          y: {
            formatter: function(val) {
              return val;
            },
            title: {
              formatter: function(seriesName) {
                return capitalizeWords(seriesName);
              }
            }
          }
        }
      }
    };

    // Prepare legend data
    let legendData = [];
    let legendLabels = [];
    if (type === "pie") {
      legendData = pieeChartData;
      // Capitalize each word in legend labels
      legendLabels = pieechartDataMangerNames.map(name => capitalizeWords(name));
    } else if (type === "bar" && title === "Projects by Type") {
      legendData = chartData.series[0].data;
      legendLabels = processedChartData.projectTypeLabels.map(label => capitalizeWords(label));
    }

    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3>{title}</h3>
        </div>
        <div className="chart-content">
          <ReactApexChart
            className={type === "pie" ? "justifyCenter" : ""}
            key={type === "pie" ? chartKey : undefined}
            options={modifiedChartData.options}
            series={modifiedChartData.series}
            type={type}
            height={chartHeight}
            width={type === "pie" ? chartHeight : undefined}
          />
          {(type === "pie" || title === "Projects by Type") && (
            <CustomLegend 
              data={legendData} 
              labels={legendLabels}
              colors={colors}
            />
          )}
        </div>
      </div>
    );
  },
  [chartKey, pieeChartData, pieechartDataMangerNames, processedChartData]
);


  // Action menu items
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
            {selectedSort === key && <SortIcon sortOrder={sortOrder} />}
          </div>
        ),
        onClick: () => handleSortSelect(key),
      })),
    },
    {
      key: "export",
      icon: <ExportOutlined />,
      label: "Export",
      onClick: handleExportClick,
    },
    {
      key: "reset",
      icon: <ReloadOutlined />,
      label: "Reset",
      onClick: handleResetClick,
    },
  ];

  return (
    <Card className="projects-running-card">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="heading-wrapper">
            <div className="heading-main">
              <h2>Projects Running</h2>
            </div>
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-label">Total Projects :</span>
                <span className="stat-value">
                  {metaDataOfReports.total || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="global-search">
        <div className="filter-btn-wrapper">
          <ProjectRunningFilterComponent onFilterChange={onFilterChange} />
        </div>
      </div>

      {/* Charts */}
      <div className="charts-section">
        <div className="charts-grid">
          {renderChart(pieChartData, "pie", "Projects by Manager")}
          {renderChart(horizontalBarChartData, "bar", "Projects by Type")}
          <div className="project-department-chart">
            {renderChart(verticalBarChartData, "bar", "Projects by Department")}
          </div>
        </div>
      </div>

      {/* Table */}
      {tableData && tableData.length > 0 ? (
        <div className="table-section">
          <div className="table-header">
            <h3>Projects List</h3>
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
            {/* Hidden export elements */}
            <div style={{ display: "none" }}>
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

            <Table
              columns={columns}
              dataSource={tableData}
              rowKey="_id"
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

export default React.memo(ProjectsRunning);

// import React, { useEffect, useState, useMemo, useCallback } from "react";
// import { Card, Table, Button, Dropdown } from "antd";
// import {
//   MoreOutlined,
//   ExportOutlined,
//   ReloadOutlined,
//   SortAscendingOutlined,
// } from "@ant-design/icons";
// import ReactApexChart from "react-apexcharts";
// import ReactHTMLTableToExcel from "react-html-table-to-excel";
// import { Link } from "react-router-dom/cjs/react-router-dom.min";
// import moment from "moment";
// import { removeTitle } from "../../util/nameFilter";
// import "./projectrunning.css";
// import Service from "../../service";
// import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
// import { useDispatch } from "react-redux";
// import ProjectRunningFilterComponent from "./ProjectRunningFilterComponent";

// const BREAKPOINTS = {
//   mobile: 480,
// };

// // Memoized components
// const SortIcon = React.memo(({ sortOrder }) =>
//   sortOrder === "asc" ? (
//     <i className="fi fi-rr-arrow-small-up"></i>
//   ) : (
//     <i className="fi fi-rr-arrow-small-down"></i>
//   )
// );

// const NoDataFound = React.memo(() => (
//   <div className="no-data-found-div">
//     <h1>No data found</h1>
//   </div>
// ));

// const ProjectsRunning = () => {
//   const dispatch = useDispatch();

//   // Declare state variables first
//   const [technologies, setTechnologies] = useState([]);
//   const [managers, setManagers] = useState([]);
//   const [types, setTypes] = useState([]);
//   const [tableData, setTableData] = useState([]);
//   const [metaDataOfReports, setMetaDataOfReports] = useState({});
//   const [pieechartDataMangerNames, setPieChartDataMangerNames] = useState([]);
//   const [pieeChartData, setPieChartData] = useState([]);
//   const [projectTypeData, setProjectTyeData] = useState([]);
//   const [technologiesData, setTechnologiesData] = useState([]);
//   const [selectedSort, setSelectedSort] = useState("title");
//   const [sortOrder, setSortOrder] = useState("asc");
//   const [pagination, setPagination] = useState({
//     current: 1,
//     pageSize: 10,
//   });
//   const [html, setHtml] = useState([]);
//   const [chartKey, setChartKey] = useState(0);

//   const getProjectReportsDetails = useCallback(
//     async ({
//       technologies: tech = technologies,
//       types: type = types,
//       managers: mgr = managers,
//       sort = selectedSort,
//       sortBy = sortOrder,
//     } = {}) => {
//       try {
//         dispatch(showAuthLoader());
//         const reqBody = {
//           technologies: tech && tech.length > 0 ? tech : [],
//           types: type && type.length > 0 ? type : [],
//           managers: mgr && mgr.length > 0 ? mgr : [],
//           pageNo: pagination.current,
//           limit: pagination.pageSize,
//           sort: sort || "",
//           sortBy: sortBy,
//           isExport: false,
//         };

//         const response = await Service.makeAPICall({
//           methodName: Service.postMethod,
//           api_url: Service.getProjectRunningReportsDetails,
//           body: reqBody,
//         });
//         if (response?.data && response?.data?.data) {
//           setTableData(response.data.data.data);
//           setMetaDataOfReports(response.data.metadata);

//           const managersData = response?.data?.data?.managers || [];
//           const totalProjectsAll = managersData.reduce(
//             (total, item) => total + item.totalProjects,
//             0
//           );

//           let seriesData, labels;

//           if (managersData.length > 10) {
//             const totalProjectsTop10 = managersData
//               .slice(0, 10)
//               .reduce((total, item) => total + item.totalProjects, 0);

//             const totalProjectsOthers = totalProjectsAll - totalProjectsTop10;

//             seriesData = [
//               ...managersData.slice(0, 10).map((item) => item.totalProjects),
//               totalProjectsOthers,
//             ];

//             labels = [
//               ...managersData
//                 .slice(0, 10)
//                 .map((item) => removeTitle(item.managerName)),
//               "Others",
//             ];
//           } else {
//             seriesData = managersData.map((item) => item.totalProjects);
//             labels = managersData.map((item) => removeTitle(item.managerName));
//           }

//           setPieChartDataMangerNames(labels);
//           setPieChartData(seriesData);
//           setProjectTyeData(response.data.data.types || []);
//           setTechnologiesData(response.data.data.technologies || []);
//           setPagination((prevPagination) => ({
//             ...prevPagination,
//             total: response.data.metadata.total || 0,
//           }));
//         } else {
//           setTableData([]);
//           setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
//         }
//         dispatch(hideAuthLoader());
//       } catch (error) {
//         dispatch(hideAuthLoader());
//         console.error(error);
//         setTableData([]);
//         setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
//       }
//     },
//     [
//       dispatch,
//       pagination.current,
//       pagination.pageSize,
//       selectedSort,
//       sortOrder,
//       technologies,
//       managers,
//       types,
//     ]
//   );

//   const onFilterChange = useCallback(
//     (skipParams, selectedFilters) => {
//       if (skipParams.includes("skipAll")) {
//         setTechnologies([]);
//         setManagers([]);
//         setTypes([]);
//         setPagination({ ...pagination, current: 1 });
//       } else {
//         if (skipParams.includes("skipDepartment")) {
//           setTechnologies([]);
//         }
//         if (skipParams.includes("skipProjectManager")) {
//           setManagers([]);
//         }
//         if (skipParams.includes("skipProjectType")) {
//           setTypes([]);
//         }
//       }

//       if (selectedFilters) {
//         setTechnologies(selectedFilters.department || []);
//         setManagers(selectedFilters.projectManager || []);
//         setTypes(selectedFilters.projectType || []);
//         setPagination({ ...pagination, current: 1 });
//       }
//     },
//     [pagination]
//   );

//   useEffect(() => {
//     getProjectReportsDetails({});
//   }, [
//     getProjectReportsDetails,
//     pagination.current,
//     pagination.pageSize,
//     technologies,
//     managers,
//     types,
//   ]);

//   const formatTitle = useCallback((title) => {
//     return title?.replace(
//       /(?:^|\s)([a-z])/g,
//       (match, group1) => match?.charAt(0) + group1?.toUpperCase()
//     );
//   }, []);

//   const formatDate = useCallback(
//     (date) => moment(date).format("DD MMM YYYY"),
//     []
//   );

//   // Memoized table columns
//   const columns = useMemo(
//     () => [
//       {
//         title: "Project Name",
//         dataIndex: "title",
//         key: "title",
//         render: (_, record) => {
//           const formattedTitle = formatTitle(record?.title);
//           return (
//             <Link
//               to={`/project/app/${record?._id}?tab=${record?.defaultTab?.name}`}
//             >
//               <div className="project_title_main_div">
//                 <span className="project-title-link">{formattedTitle}</span>
//               </div>
//             </Link>
//           );
//         },
//         width: 250,
//         sorter: (a, b) => a.title.localeCompare(b.title),
//         ellipsis: true,
//       },
//       {
//         title: "Project Manager",
//         dataIndex: "managerName",
//         width: 180,
//         key: "managerName",
//         render: (_, record) => (
//           <span className="manager-name">
//             {removeTitle(record.managerName)}
//           </span>
//         ),
//         sorter: (a, b) => a.managerName.localeCompare(b.managerName),
//         ellipsis: true,
//       },
//       {
//         title: "Department",
//         dataIndex: "technologyName",
//         width: 150,
//         sorter: (a, b) =>
//           a.technologyName[0].localeCompare(b.technologyName[0]),
//         key: "technologyName",
//         render: (_, record) => (
//           <div className="technology-tags">
//             {record.technologyName.map((tech, index) => (
//               <span key={index} className="technology-tag">
//                 {tech}
//               </span>
//             ))}
//           </div>
//         ),
//         ellipsis: true,
//       },
//       {
//         title: "Project Type",
//         dataIndex: "project_typeName",
//         width: 120,
//         sorter: (a, b) => a.project_typeName.localeCompare(b.project_typeName),
//         key: "projecttypeName",
//         render: (_, record) => (
//           <span className="project-type-badge">{record.project_typeName}</span>
//         ),
//         ellipsis: true,
//       },
//       {
//         title: "Est. Hours",
//         dataIndex: "estimatedHours",
//         width: 100,
//         sorter: (a, b) => a.estimatedHours.localeCompare(b.estimatedHours),
//         key: "estimatedHours",
//         render: (_, record) => (
//           <span className="hours-display estimated-hours">
//             {record.estimatedHours}
//           </span>
//         ),
//         align: "center",
//       },
//       {
//         title: "Used Hours",
//         dataIndex: "total_logged_time",
//         width: 100,
//         sorter: (a, b) =>
//           a.total_logged_time.localeCompare(b.total_logged_time),
//         key: "total_logged_time",
//         render: (_, record) => (
//           <span className="hours-display used-hours">
//             {record.total_logged_time}
//           </span>
//         ),
//         align: "center",
//       },
//       {
//         title: "Start Date",
//         dataIndex: "start_date",
//         width: 120,
//         sorter: (a, b) => a.start_date.localeCompare(b.start_date),
//         key: "start_date",
//         render: (_, record) => (
//           <span className="date-display">{formatDate(record.start_date)}</span>
//         ),
//         align: "center",
//       },
//       {
//         title: "End Date",
//         dataIndex: "end_date",
//         width: 120,
//         sorter: (a, b) => a.end_date.localeCompare(b.end_date),
//         key: "end_date",
//         render: (_, record) => (
//           <span className="date-display">{formatDate(record.end_date)}</span>
//         ),
//         align: "center",
//       },
//     ],
//     [formatTitle, formatDate]
//   );

//   // Memoized chart data processing
//   const processedChartData = useMemo(() => {
//     const filteredProjectTypeData = projectTypeData.filter(
//       (entry) => entry.project_typeName
//     );

//     return {
//       filteredProjectTypeData,
//       projectTypeReportData: filteredProjectTypeData.map(
//         (entry) => entry.totalProjects
//       ),
//       projectTypeLabels: filteredProjectTypeData.map(
//         (entry) => entry.project_typeName
//       ),
//       technologyReportData: technologiesData.map(
//         (entry) => entry.totalProjects
//       ),
//       technologyLabels: technologiesData.map((entry) => entry.technologyName),
//     };
//   }, [projectTypeData, technologiesData]);

//   // Memoized chart configurations
//   const pieChartData = useMemo(() => {
//     if (!pieeChartData || pieeChartData.length === 0) return null;
  
//     return {
//       series: pieeChartData,
//       options: {
//         chart: {
//           width: "100%",
//           type: "pie",
//           height: "auto", // Let the chart determine its own height
//         },
//         labels: pieechartDataMangerNames || [],
//         colors: [
//           "#00E396",
//           "#008FFB",
//           "#00D9FF",
//           "#FEB019",
//           "#FF4560",
//           "#775DD0",
//         ],
//         legend: {
//           position: "bottom",
//           fontSize: "14px",
//           offsetY: 10, // Add some offset from the chart
//           itemMargin: {
//             horizontal: 8,
//             vertical: 4
//           }
//         },
//         responsive: [
//           {
//             breakpoint: BREAKPOINTS.mobile,
//             options: {
//               legend: {
//                 position: "bottom",
//                 fontSize: "12px",
//                 offsetY: 15,
//               },
//             },
//           },
//         ],
//       },
//     };
//   }, [pieeChartData, pieechartDataMangerNames]);

//   const horizontalBarChartData = useMemo(() => {
//     const {
//       filteredProjectTypeData,
//       projectTypeReportData,
//       projectTypeLabels,
//     } = processedChartData;

//     if (filteredProjectTypeData.length === 0) return null;

//     return {
//       series: [
//         {
//           name: "Projects",
//           data: projectTypeReportData,
//         },
//       ],
//       options: {
//         chart: {
//           width: "100%",
//           toolbar: { show: false },
//           type: "bar",
//           height: 350,
//         },
//         colors: ["#00E396"],
//         plotOptions: {
//           bar: {
//             horizontal: true,
//             borderRadius: 4,
//           },
//         },
//         dataLabels: { enabled: true },
//         xaxis: {
//           categories: projectTypeLabels,
//         },
//         grid: {
//           xaxis: { lines: { show: true } },
//           yaxis: { lines: { show: false } },
//         },
//         yaxis: {
//           reversed: false,
//           axisTicks: { show: true },
//         },
//         tooltip: {
//           fillSeriesColor: true,
//         },
//       },
//     };
//   }, [processedChartData]);

//   const verticalBarChartData = useMemo(() => {
//     const { technologyReportData, technologyLabels } = processedChartData;

//     if (!technologiesData || technologiesData.length === 0) return null;

//     return {
//       series: [
//         {
//           name: "Projects",
//           data: technologyReportData,
//         },
//       ],
//       options: {
//         chart: {
//           width: "100%",
//           toolbar: { show: false },
//           type: "bar",
//           height: 350,
//         },
//         colors: ["#008FFB"],
//         plotOptions: {
//           bar: {
//             horizontal: false,
//             borderRadius: 4,
//           },
//         },
//         dataLabels: { enabled: true },
//         xaxis: {
//           categories: technologyLabels,
//         },
//         grid: {
//           xaxis: { lines: { show: false } },
//           yaxis: { lines: { show: true } },
//         },
//         yaxis: {
//           reversed: false,
//           axisTicks: { show: true },
//         },
//         tooltip: {
//           fillSeriesColor: true,
//         },
//       },
//     };
//   }, [processedChartData, technologiesData]);

//   // Memoized sort options
//   const sortOptions = useMemo(
//     () => [
//       { key: "title", label: "Project Name" },
//       { key: "managerName", label: "Project Manager" },
//       { key: "technologyName", label: "Department" },
//       { key: "project_typeName", label: "Project Type" },
//       { key: "estimatedHours", label: "Estimated Hours" },
//       { key: "total_logged_time", label: "Used Hours" },
//       { key: "start_date", label: "Start Date" },
//       { key: "end_date", label: "End Date" },
//     ],
//     []
//   );

//   // Memoized handlers
//   const handleExportClick = useCallback(() => {
//     const csvRef = document.getElementById("test-table-xls-button");
//     csvRef?.click();
//   }, []);

//   const handleResetClick = useCallback(() => {
//     setTechnologies([]);
//     setManagers([]);
//     setTypes([]);
//     setSelectedSort("logged_date");
//     setSortOrder("asc");
//     setPagination({ ...pagination, current: 1 });
//     getProjectReportsDetails({ sort: "logged_date", sortBy: "asc" });
//   }, [getProjectReportsDetails, pagination]);

//   const showTotal = useCallback(
//     (total, range) => `Showing ${range[0]}-${range[1]} of ${total} projects`,
//     []
//   );

//   const handleSortSelect = useCallback(
//     (sortOption) => {
//       const newSortOrder =
//         sortOption === selectedSort
//           ? sortOrder === "asc"
//             ? "desc"
//             : "asc"
//           : "asc";
//       setSelectedSort(sortOption);
//       setSortOrder(newSortOrder);
//       getProjectReportsDetails({ sort: sortOption, sortBy: newSortOrder });
//     },
//     [selectedSort, sortOrder, getProjectReportsDetails]
//   );

//   const handleTableChange = useCallback(
//     (page, filters, sorter) => {
//       let sortField = null;
//       let sortOrder = null;
//       if (sorter && sorter.field && sorter.order) {
//         sortField = sorter.field;
//         sortOrder = sorter.order === "ascend" ? "asc" : "desc";
//         setSelectedSort(sortField);
//         setSortOrder(sortOrder);
//         getProjectReportsDetails({ sort: sortField, sortBy: sortOrder });
//       }
//       setPagination({ ...pagination, ...page });
//     },
//     [pagination, getProjectReportsDetails]
//   );

//   // Effect for chart re-rendering
//   useEffect(() => {
//     setChartKey((prevKey) => prevKey + 1);
//   }, [pieeChartData]);

//   // Render methods
//   const renderChart = useCallback(
//     (chartData, type, title) => {
//       if (!chartData) return null;

//       return (
//         <div className="chart-container">
//           <div className="chart-header">
//             <h3>{title}</h3>
//           </div>
//           <div className="chart-content">
//             <ReactApexChart
//               key={type === "pie" ? chartKey : undefined}
//               options={chartData.options}
//               series={chartData.series}
//               type={type}
//               height={350}
//             />
//           </div>
//         </div>
//       );
//     },
//     [chartKey]
//   );

//   // Action menu items
//   const actionMenuItems = [
//     {
//       key: "sort",
//       icon: <SortAscendingOutlined />,
//       label: "Sort By",
//       children: sortOptions.map(({ key, label }) => ({
//         key,
//         label: (
//           <div className="sort-menu-item">
//             <span>{label}</span>
//             {selectedSort === key && <SortIcon sortOrder={sortOrder} />}
//           </div>
//         ),
//         onClick: () => handleSortSelect(key),
//       })),
//     },
//     {
//       key: "export",
//       icon: <ExportOutlined />,
//       label: "Export",
//       onClick: handleExportClick,
//     },
//     {
//       key: "reset",
//       icon: <ReloadOutlined />,
//       label: "Reset",
//       onClick: handleResetClick,
//     },
//   ];

//   return (
//     <Card className="projects-running-card">
//       {/* Header */}
//       <div className="page-header">
//         <div className="header-content">
//           <div className="heading-wrapper">
//             <div className="heading-main">
//               <h2>Running Projects</h2>
//             </div>
//             <div className="header-stats">
//               <div className="stat-item">
//                 <span className="stat-label">Total Projects :</span>
//                 <span className="stat-value">
//                   {metaDataOfReports.total || 0}
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="global-search">
//         <div className="filter-btn-wrapper">
//           <ProjectRunningFilterComponent onFilterChange={onFilterChange} />
//         </div>
//       </div>

//       {/* Charts */}
//       <div className="charts-section">
//         <div className="charts-grid">
//           {renderChart(pieChartData, "pie", "Projects by Manager")}
//           {renderChart(horizontalBarChartData, "bar", "Projects by Type")}
//           <div className="project-department-chart">
//             {renderChart(verticalBarChartData, "bar", "Projects by Department")}
//           </div>
//         </div>
//       </div>

//       {/* Table */}
//       {tableData && tableData.length > 0 ? (
//         <div className="table-section">
//           <div className="table-header">
//             <h3>Projects List</h3>
//             <div className="table-actions">
//               <Dropdown
//                 menu={{ items: actionMenuItems }}
//                 trigger={["click"]}
//                 placement="bottomRight"
//               >
//                 <Button type="text" icon={<MoreOutlined />} />
//               </Dropdown>
//             </div>
//           </div>

//           <div className="table-container">
//             {/* Hidden export elements */}
//             <div style={{ display: "none" }}>
//               <ReactHTMLTableToExcel
//                 id="test-table-xls-button"
//                 className="ant-btn-primary"
//                 table="table-to-xls"
//                 filename="Projects"
//                 sheet="tablexls"
//                 buttonText="Export XLS"
//               />
//               <div dangerouslySetInnerHTML={{ __html: html["html"] }}></div>
//             </div>

//             <Table
//               columns={columns}
//               dataSource={tableData}
//               rowKey="_id"
//               pagination={{
//                 showSizeChanger: true,
//                 pageSizeOptions: ["10", "20", "30", "50"],
//                 showTotal: showTotal,
//                 showQuickJumper: true,
//                 ...pagination,
//               }}
//               onChange={handleTableChange}
//               size="middle"
//               scroll={{ x: "max-content" }}
//               className="custom-table"
//             />
//           </div>
//         </div>
//       ) : (
//         <NoDataFound />
//       )}
//     </Card>
//   );
// };

// export default React.memo(ProjectsRunning);

// import React, { useEffect, useState, useMemo, useCallback } from "react";
// import {
//   Card,
//   Form,
//   Select,
//   Table,
//   Button,
//   Dropdown,
// } from "antd";
// import {
//   MoreOutlined,
//   ExportOutlined,
//   ReloadOutlined,
//   SortAscendingOutlined,
// } from "@ant-design/icons";
// import ReactApexChart from "react-apexcharts";
// import ReactHTMLTableToExcel from "react-html-table-to-excel";
// import { Link } from "react-router-dom/cjs/react-router-dom.min";
// import moment from "moment";
// import { removeTitle } from "../../util/nameFilter";
// import "./projectrunning.css";
// import Service from "../../service";
// import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
// import { useDispatch } from "react-redux";

// const { Option } = Select;

// const BREAKPOINTS = {
//   mobile: 480,
// };

// // Memoized components
// const SortIcon = React.memo(({ sortOrder }) =>
//   sortOrder === "asc" ? (
//     <i className="fi fi-rr-arrow-small-up"></i>
//   ) : (
//     <i className="fi fi-rr-arrow-small-down"></i>
//   )
// );

// const NoDataFound = React.memo(() => (
//   <div className="no-data-found-div">
//     <h1>No data found</h1>
//   </div>
// ));

// const ProjectsRunning = () => {
//   const dispatch = useDispatch();

//   const [value, setValue] = React.useState([]);
//   const [projectManager, setProjectManager] = React.useState([]);
//   const [projectType, setprojectType] = React.useState([]);
//   const [isPopoverVisible, setIsPopoverVisible] = useState(false);
//   const [isIconVisible, setIsIconVisible] = useState(false);
//   const [technologyList, setTechnologyList] = useState([]);
//   const [projectManagerList, setProjectManagerList] = useState([]);
//   const [projectTypeList, setProjectTypeList] = useState([]);
//   const [sortbyPopUp, setIssortbyPopUp] = useState(false);
//   const [tableData, setTableData] = useState([]);
//   const [metaDataOfReports, setMetaDataOfReports] = useState({});
//   const [pieechartDataMangerNames, setPieChartDataMangerNames] = useState([]);
//   const [pieeChartData, setPieChartData] = useState([]);
//   const [projectTypeData, setProjectTyeData] = useState([]);
//   const [technologiesData, setTechnologiesData] = useState([]);
//   const [selectedSort, setSelectedSort] = useState("title");
//   const [sortOrder, setSortOrder] = useState("asc");
//   const [pagination, setPagination] = useState({
//     current: 1,
//     pageSize: 10,
//   });
//   const [html, setHtml] = useState([]);

//   const handleMouseEnter = () => {
//     setIsIconVisible(true);
//   };

//   const handleMouseLeave = () => {
//     if (!isPopoverVisible) {
//       setIsIconVisible(false);
//     }
//   };
//   const handleOpenThreeDotMenu = () => {
//     setIsPopoverVisible(true); // Show the Popover
//   };

//   const sortTableData = (pagination, filters, sorter, extra) => {};

//   const sortPopup = () => {
//     setIssortbyPopUp(true); // Show the Popover
//   };

//   const handleTechnologyChange = (selectedValues) => {
//     setValue(selectedValues);
//     getProjectReportsDetails({ technologies: selectedValues });
//   };
//   const handleTypeChange = (selectedValues) => {
//     setprojectType(selectedValues);
//     getProjectReportsDetails({ types: selectedValues });
//   };

//   const handleManagerChange = (selectedValues) => {
//     setProjectManager(selectedValues);
//     getProjectReportsDetails({ managers: selectedValues });
//   };

//   const handleSortSelect = (sortOption) => {
//     const newSortOrder =
//       sortOption === selectedSort
//         ? sortOrder === "asc"
//           ? "desc"
//           : "asc"
//         : "asc";
//     setSelectedSort(sortOption);
//     setSortOrder(newSortOrder);

//     setIsPopoverVisible(false);
//     setIssortbyPopUp(false); // Close the popover after selecting a sort option
//     getProjectReportsDetails({ sort: sortOption, sortBy: newSortOrder }); // Call API with the selected sorting option
//   };

//   const handleTableChange = (page, sorter) => {
//     let sortField = null;
//     let sortOrder = null;
//     if (sorter && sorter.field && sorter.order) {
//       sortField = sorter.field;
//       sortOrder = sorter.order === "ascend" ? "asc" : "desc";
//     }
//     setPagination({ ...pagination, ...page });
//   };
//   // get tech list
//   const getTechnologyList = async () => {
//     try {
//       dispatch(showAuthLoader());
//       const reqBody = {
//         isDropdown: true,
//       };
//       const response = await Service.makeAPICall({
//         methodName: Service.postMethod,
//         api_url: Service.getprojectTech,
//         body: reqBody,
//       });
//       dispatch(hideAuthLoader());
//       if (response?.data && response?.data?.data) {
//         setTechnologyList(response.data.data);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   // get manager list
//   const getManager = async (values) => {
//     try {
//       dispatch(showAuthLoader());
//       const reqBody = {
//         ...values,
//       };
//       const response = await Service.makeAPICall({
//         methodName: Service.getMethod,
//         api_url: Service.getProjectManager,
//         body: reqBody,
//       });
//       dispatch(hideAuthLoader());
//       if (response?.data && response?.data?.data) {
//         setProjectManagerList(response.data.data);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   // get projecttype list
//   const getProjectType = async () => {
//     try {
//       dispatch(showAuthLoader());
//       const response = await Service.makeAPICall({
//         methodName: Service.postMethod,
//         api_url: Service.getProjectListing,
//       });
//       dispatch(hideAuthLoader());
//       if (response?.data && response?.data?.data) {
//         setProjectTypeList(response.data.data);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   // get projecttype list
//   const getProjectReportsDetails = async ({
//     technologies = value,
//     types = projectType,
//     managers = projectManager,
//     sort = selectedSort,
//     sortBy = sortOrder,
//   } = {}) => {
//     try {
//       dispatch(showAuthLoader());
//       const reqBody = {
//         technologies:
//           technologies && technologies.length > 0 ? technologies : [],
//         types: types && types.length > 0 ? types : [],
//         managers: managers && managers.length > 0 ? managers : [],
//         pageNo: pagination.current,
//         limit: pagination.pageSize,
//         sort: sort ? sort : "",
//         sortBy: sortBy,
//         isExport: false,
//       };

//       const response = await Service.makeAPICall({
//         methodName: Service.postMethod,
//         api_url: Service.getProjectRunningReportsDetails,
//         body: reqBody,
//       });
//       if (response?.data && response?.data?.data) {
//         setTableData(response.data.data.data);
//         setMetaDataOfReports(response.data.metadata);

//         const managers = response?.data?.data?.managers;
//         const totalProjectsAll = managers.reduce(
//           (total, item) => total + item.totalProjects,
//           0
//         );

//         let seriesData, labels;

//         if (managers.length > 10) {
//           const totalProjectsTop10 = managers
//             .slice(0, 10)
//             .reduce((total, item) => total + item.totalProjects, 0);

//           const totalProjectsOthers = totalProjectsAll - totalProjectsTop10;

//           seriesData = [
//             ...managers.slice(0, 10).map((item) => item.totalProjects),
//             totalProjectsOthers,
//           ];

//           labels = [
//             ...managers
//               .slice(0, 10)
//               .map((item) => removeTitle(item.managerName)),
//             "Others",
//           ];
//         } else {
//           seriesData = managers.map((item) => item.totalProjects);
//           labels = managers.map((item) => removeTitle(item.managerName));
//         }

//         setPieChartDataMangerNames(labels);
//         setPieChartData(seriesData);
//         setProjectTyeData(response.data.data.types);
//         setTechnologiesData(response.data.data.technologies);
//         setPagination((prevPagination) => ({
//           ...prevPagination,
//           total: response.data.metadata.total,
//         }));
//       } else {
//         setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
//       }
//       dispatch(hideAuthLoader());
//     } catch (error) {
//       dispatch(hideAuthLoader());
//       console.log(error);
//     }
//   };

//   useEffect(() => {
//     getTechnologyList();
//     getManager();
//     getProjectType();
//   }, []);

//   useEffect(() => {
//     if (
//       technologyList.length &&
//       projectManagerList.length &&
//       projectTypeList.length
//     ) {
//       getProjectReportsDetails({});
//     }
//   }, [
//     technologyList,
//     projectManagerList,
//     projectTypeList,
//     pagination.current,
//     pagination.pageSize,
//   ]);

//   const [chartKey, setChartKey] = useState(0);

//   const formatTitle = useCallback((title) => {
//     return title?.replace(
//       /(?:^|\s)([a-z])/g,
//       (match, group1) => match?.charAt(0) + group1?.toUpperCase()
//     );
//   }, []);

//   const formatDate = useCallback(
//     (date) => moment(date).format("DD MMM YYYY"),
//     []
//   );

//   // Memoized table columns
//   const columns = useMemo(
//     () => [
//       {
//         title: "Project Name",
//         dataIndex: "title",
//         key: "title",
//         render: (_, record) => {
//           const formattedTitle = formatTitle(record?.title);
//           return (
//             <Link
//               to={`/project/app/${record?._id}?tab=${record?.defaultTab?.name}`}
//             >
//               <div className="project_title_main_div">
//                 <span className="project-title-link">{formattedTitle}</span>
//               </div>
//             </Link>
//           );
//         },
//         width: 250,
//         sorter: (a, b) => a.title.localeCompare(b.title),
//         ellipsis: true,
//       },
//       {
//         title: "Project Manager",
//         dataIndex: "managerName",
//         width: 180,
//         key: "managerName",
//         render: (_, record) => (
//           <span className="manager-name">
//             {removeTitle(record.managerName)}
//           </span>
//         ),
//         sorter: (a, b) => a.managerName.localeCompare(b.managerName),
//         ellipsis: true,
//       },
//       {
//         title: "Department",
//         dataIndex: "technologyName",
//         width: 150,
//         sorter: (a, b) =>
//           a.technologyName[0].localeCompare(b.technologyName[0]),
//         key: "technologyName",
//         render: (_, record) => (
//           <div className="technology-tags">
//             {record.technologyName.map((tech, index) => (
//               <span key={index} className="technology-tag">
//                 {tech}
//               </span>
//             ))}
//           </div>
//         ),
//         ellipsis: true,
//       },
//       {
//         title: "Project Type",
//         dataIndex: "project_typeName",
//         width: 120,
//         sorter: (a, b) => a.project_typeName.localeCompare(b.project_typeName),
//         key: "projecttypeName",
//         render: (_, record) => (
//           <span className="project-type-badge">{record.project_typeName}</span>
//         ),
//         ellipsis: true,
//       },
//       {
//         title: "Est. Hours",
//         dataIndex: "estimatedHours",
//         width: 100,
//         sorter: (a, b) => a.estimatedHours.localeCompare(b.estimatedHours),
//         key: "estimatedHours",
//         render: (_, record) => (
//           <span className="hours-display estimated-hours">
//             {record.estimatedHours}
//           </span>
//         ),
//         align: "center",
//       },
//       {
//         title: "Used Hours",
//         dataIndex: "total_logged_time",
//         width: 100,
//         sorter: (a, b) =>
//           a.total_logged_time.localeCompare(b.total_logged_time),
//         key: "total_logged_time",
//         render: (_, record) => (
//           <span className="hours-display used-hours">
//             {record.total_logged_time}
//           </span>
//         ),
//         align: "center",
//       },
//       {
//         title: "Start Date",
//         dataIndex: "start_date",
//         width: 120,
//         sorter: (a, b) => a.start_date.localeCompare(b.start_date),
//         key: "start_date",
//         render: (_, record) => (
//           <span className="date-display">{formatDate(record.start_date)}</span>
//         ),
//         align: "center",
//       },
//       {
//         title: "End Date",
//         dataIndex: "end_date",
//         width: 120,
//         sorter: (a, b) => a.end_date.localeCompare(b.end_date),
//         key: "end_date",
//         render: (_, record) => (
//           <span className="date-display">{formatDate(record.end_date)}</span>
//         ),
//         align: "center",
//       },
//     ],
//     [formatTitle, formatDate]
//   );

//   // Memoized chart data processing
//   const processedChartData = useMemo(() => {
//     const filteredProjectTypeData = projectTypeData.filter(
//       (entry) => entry.project_typeName
//     );

//     return {
//       filteredProjectTypeData,
//       projectTypeReportData: filteredProjectTypeData.map(
//         (entry) => entry.totalProjects
//       ),
//       projectTypeLabels: filteredProjectTypeData.map(
//         (entry) => entry.project_typeName
//       ),
//       technologyReportData: technologiesData.map(
//         (entry) => entry.totalProjects
//       ),
//       technologyLabels: technologiesData.map((entry) => entry.technologyName),
//     };
//   }, [projectTypeData, technologiesData]);

//   // Memoized chart configurations
//   const pieChartData = useMemo(() => {
//     if (!pieeChartData || pieeChartData.length === 0) return null;

//     return {
//       series: pieeChartData,
//       options: {
//         chart: {
//           width: 380,
//           type: "pie",
//         },
//         labels: pieechartDataMangerNames || [],
//         colors: [
//           "#00E396",
//           "#008FFB",
//           "#00D9FF",
//           "#FEB019",
//           "#FF4560",
//           "#775DD0",
//         ],
//         legend: {
//           position: "bottom",
//           fontSize: "14px",
//         },
//         responsive: [
//           {
//             breakpoint: BREAKPOINTS.mobile,
//             options: {
//               legend: {
//                 position: "bottom",
//               },
//             },
//           },
//         ],
//       },
//     };
//   }, [pieeChartData, pieechartDataMangerNames]);

//   const horizontalBarChartData = useMemo(() => {
//     const {
//       filteredProjectTypeData,
//       projectTypeReportData,
//       projectTypeLabels,
//     } = processedChartData;

//     if (filteredProjectTypeData.length === 0) return null;

//     return {
//       series: [
//         {
//           name: "Projects",
//           data: projectTypeReportData,
//         },
//       ],
//       options: {
//         chart: {
//           toolbar: { show: false },
//           type: "bar",
//           height: 350,
//         },
//         colors: ["#00E396"],
//         plotOptions: {
//           bar: {
//             horizontal: true,
//             borderRadius: 4,
//           },
//         },
//         dataLabels: { enabled: true },
//         xaxis: {
//           categories: projectTypeLabels,
//         },
//         grid: {
//           xaxis: { lines: { show: true } },
//           yaxis: { lines: { show: false } },
//         },
//         yaxis: {
//           reversed: false,
//           axisTicks: { show: true },
//         },
//         tooltip: {
//           fillSeriesColor: true,
//         },
//       },
//     };
//   }, [processedChartData]);

//   const verticalBarChartData = useMemo(() => {
//     const { technologyReportData, technologyLabels } = processedChartData;

//     if (!technologiesData || technologiesData.length === 0) return null;

//     return {
//       series: [
//         {
//           name: "Projects",
//           data: technologyReportData,
//         },
//       ],
//       options: {
//         chart: {
//           toolbar: { show: false },
//           type: "bar",
//           height: 350,
//         },
//         colors: ["#008FFB"],
//         plotOptions: {
//           bar: {
//             horizontal: false,
//             borderRadius: 4,
//           },
//         },
//         dataLabels: { enabled: true },
//         xaxis: {
//           categories: technologyLabels,
//         },
//         grid: {
//           xaxis: { lines: { show: false } },
//           yaxis: { lines: { show: true } },
//         },
//         yaxis: {
//           reversed: false,
//           axisTicks: { show: true },
//         },
//         tooltip: {
//           fillSeriesColor: true,
//         },
//       },
//     };
//   }, [processedChartData, technologiesData]);

//   // Memoized sort options
//   const sortOptions = useMemo(
//     () => [
//       { key: "title", label: "Project Name" },
//       { key: "managerName", label: "Project Manager" },
//       { key: "technologyName", label: "Department" },
//       { key: "project_typeName", label: "Project Type" },
//       { key: "estimatedHours", label: "Estimated Hours" },
//       { key: "total_logged_time", label: "Used Hours" },
//       { key: "start_date", label: "Start Date" },
//       { key: "end_date", label: "End Date" },
//     ],
//     []
//   );

//   // Memoized handlers
//   const handleExportClick = useCallback(() => {
//     const csvRef = document.getElementById("test-table-xls-button");
//     csvRef?.click();
//   }, []);

//   const handleResetClick = useCallback(() => {
//     getProjectReportsDetails({ sort: "logged_date" });
//   }, [getProjectReportsDetails]);

//   const showTotal = useCallback(
//     (total, range) => `Showing ${range[0]}-${range[1]} of ${total} projects`,
//     []
//   );

//   // Effect for chart re-rendering
//   useEffect(() => {
//     setChartKey((prevKey) => prevKey + 1);
//   }, [pieeChartData]);

//   // Render methods
//   const renderFilterSelect = useCallback(
//     (
//       name,
//       placeholder,
//       value,
//       onChange,
//       options,
//       valueKey,
//       labelKey,
//       mode = "multiple"
//     ) => (
//       <div className="filter-select-container">
//         <Form.Item name={name}>
//           <Select
//             placeholder={placeholder}
//             mode={mode}
//             showSearch
//             value={value}
//             onChange={onChange}
//             className="custom-select"
//             filterOption={(input, option) =>
//               option.children?.toLowerCase().indexOf(input?.toLowerCase()) >= 0
//             }
//             filterSort={(optionA, optionB) =>
//               optionA.children
//                 ?.toLowerCase()
//                 .localeCompare(optionB.children?.toLowerCase())
//             }
//           >
//             {options.map((item, index) => (
//               <Option
//                 key={index}
//                 value={item[valueKey]}
//                 className="custom-option"
//               >
//                 {labelKey === "manager_name"
//                   ? removeTitle(item[labelKey])
//                   : item[labelKey]}
//               </Option>
//             ))}
//           </Select>
//         </Form.Item>
//       </div>
//     ),
//     []
//   );

//   const renderChart = useCallback(
//     (chartData, type, title) => {
//       if (!chartData) return null;

//       return (
//         <div className="chart-container">
//           <div className="chart-header">
//             <h3>{title}</h3>
//           </div>
//           <div className="chart-content">
//             <ReactApexChart
//               key={type === "pie" ? chartKey : undefined}
//               options={chartData.options}
//               series={chartData.series}
//               type={type}
//               height={350}
//             />
//           </div>
//         </div>
//       );
//     },
//     [chartKey]
//   );

//   // Action menu items
//   const actionMenuItems = [
//     {
//       key: "sort",
//       icon: <SortAscendingOutlined />,
//       label: "Sort By",
//       children: sortOptions.map(({ key, label }) => ({
//         key,
//         label: (
//           <div className="sort-menu-item">
//             <span>{label}</span>
//             {selectedSort === key && <SortIcon sortOrder={sortOrder} />}
//           </div>
//         ),
//         onClick: () => handleSortSelect(key),
//       })),
//     },
//     {
//       key: "export",
//       icon: <ExportOutlined />,
//       label: "Export",
//       onClick: handleExportClick,
//     },
//     {
//       key: "reset",
//       icon: <ReloadOutlined />,
//       label: "Reset",
//       onClick: handleResetClick,
//     },
//   ];

//   return (
//     <Card className="projects-running-card">
//       {/* Header */}
//       <div className="page-header">
//         <div className="header-content">
//           <div className="heading-wrapper">
//             <div className="heading-main">
//               <h2>Running Projects</h2>
//             </div>
//             <div className="header-stats">
//               <div className="stat-item">
//                 <span className="stat-label">Total Projects</span>
//                 <span className="stat-value">{metaDataOfReports.total}</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="global-search">
//         <div className="filters-header">
//           <h3>Filters</h3>
//         </div>
//         <div className="filter-btn-wrapper ">
//           {renderFilterSelect(
//             "technology",
//             "Select Department",
//             value,
//             handleTechnologyChange,
//             technologyList,
//             "_id",
//             "project_tech"
//           )}

//           {renderFilterSelect(
//             "projectManager",
//             "Select Project Manager",
//             projectManager,
//             handleManagerChange,
//             projectManagerList,
//             "_id",
//             "manager_name"
//           )}

//           {renderFilterSelect(
//             "projectype",
//             "Select Project Type",
//             projectType,
//             handleTypeChange,
//             projectTypeList,
//             "_id",
//             "project_type"
//           )}
//         </div>
//       </div>

//       {/* Charts */}
//       <div className="charts-section">
//         <div className="charts-grid">
//           {renderChart(pieChartData, "pie", "Projects by Manager")}
//           {renderChart(horizontalBarChartData, "bar", "Projects by Type")}
//           {renderChart(verticalBarChartData, "bar", "Projects by Department")}
//         </div>
//       </div>

//       {/* Table */}
//       {tableData && tableData.length > 0 ? (
//         <div className="table-section">
//           <div className=" table-header">
//             <h3>Projects List</h3>
//             <div className="table-actions">
//               <Dropdown
//                 menu={{ items: actionMenuItems }}
//                 trigger={["click"]}
//                 placement="bottomRight"
//               >
//                 <Button type="text" icon={<MoreOutlined />} />
//               </Dropdown>
//             </div>
//           </div>

//           <div className="table-container">
//             {/* Hidden export elements */}
//             <div style={{ display: "none" }}>
//               <ReactHTMLTableToExcel
//                 id="test-table-xls-button"
//                 className="ant-btn-primary"
//                 table="table-to-xls"
//                 filename="Projects"
//                 sheet="tablexls"
//                 buttonText="Export XLS"
//               />
//               <div dangerouslySetInnerHTML={{ __html: html["html"] }}></div>
//             </div>

//             <Table
//               columns={columns}
//               dataSource={tableData}
//               rowKey="_id"
//               pagination={{
//                 showSizeChanger: true,
//                 pageSizeOptions: ["10", "20", "30", "50"],
//                 showTotal: showTotal,
//                 showQuickJumper: true,
//                 ...pagination,
//               }}
//               onChange={handleTableChange}
//               size="middle"
//               scroll={{ x: "max-content" }}
//               className="custom-table"
//             />
//           </div>
//         </div>
//       ) : (
//         <NoDataFound />
//       )}
//     </Card>
//   );
// };

// export default ProjectsRunning;
