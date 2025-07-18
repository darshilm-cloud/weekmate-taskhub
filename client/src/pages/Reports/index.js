// import React, { useEffect, useState, useMemo, useCallback } from "react";
// import { Header } from "antd/lib/layout/layout";
// import { Card, Form, Popover, Select, Space, Table } from "antd";
// import ReactApexChart from "react-apexcharts";
// import ReactHTMLTableToExcel from "react-html-table-to-excel";
// import { Link } from "react-router-dom/cjs/react-router-dom.min";
// import moment from "moment";

// import ProjectsRunningController from "./ProjectsRunningController";
// import { removeTitle } from "../../util/nameFilter";
// import "./projectrunning.css";

// const { Option } = Select;

// // Constants
// const CHART_COLORS = {
//   primary: "#00E396",
//   white: "#fff"
// };

// const BREAKPOINTS = {
//   mobile: 480
// };

// // Memoized components
// const SortIcon = React.memo(({ sortOrder }) => (
//   sortOrder === "asc"
//     ? <i className="fi fi-rr-arrow-small-up"></i>
//     : <i className="fi fi-rr-arrow-small-down"></i>
// ));

// const NoDataFound = React.memo(() => (
//   <div className="no-data-found-div">
//     <h1>No data</h1>
//   </div>
// ));

// const ProjectsRunning = () => {
//   const {
//     value,
//     projectManager,
//     projectType,
//     handleMouseEnter,
//     handleMouseLeave,
//     technologyList,
//     projectManagerList,
//     projectTypeList,
//     isPopoverVisible,
//     setIsPopoverVisible,
//     handleOpenThreeDotMenu,
//     sortbyPopUp,
//     setIssortbyPopUp,
//     handleTechnologyChange,
//     handleTypeChange,
//     handleManagerChange,
//     tableData,
//     handleTableChange,
//     pagination,
//     metaDataOfReports,
//     pieechartDataMangerNames,
//     projectTypeData,
//     technologiesData,
//     pieeChartData,
//     handleSortSelect,
//     html,
//     getProjectReportsDetails,
//     selectedSort,
//     sortOrder,
//   } = ProjectsRunningController();

//   const companySlug = localStorage.getItem("companyDomain");
//   const [chartKey, setChartKey] = useState(0);

//   // Memoized utility functions
//   const formatTitle = useCallback((title) => {
//     return title?.replace(/(?:^|\s)([a-z])/g, (match, group1) =>
//       match?.charAt(0) + group1?.toUpperCase()
//     );
//   }, []);

//   const formatDate = useCallback((date) =>
//     moment(date).format("DD MMM YYYY"), []);

//   // Memoized table columns
//   const columns = useMemo(() => [
//     {
//       title: "Project Name",
//       dataIndex: "title",
//       key: "title",
//       render: (_, record) => {
//         const formattedTitle = formatTitle(record?.title);
//         return (
//           <Link to={ `/${companySlug}/project/app/${record?._id}?tab=${record?.defaultTab?.name}` }>
//             <div className="project_title_main_div">
//               <span>{ formattedTitle }</span>
//             </div>
//           </Link>
//         );
//       },
//       width: 400,
//       sorter: (a, b) => a.title.localeCompare(b.title),
//     },
//     {
//       title: "Project Manager",
//       dataIndex: "managerName",
//       width: 300,
//       key: "managerName",
//       render: (_, record) => (
//         <span style={ { textTransform: "capitalize" } }>
//           { removeTitle(record.managerName) }
//         </span>
//       ),
//       sorter: (a, b) => a.managerName.localeCompare(b.managerName),
//     },
//     {
//       title: "Technology",
//       dataIndex: "technologyName",
//       width: 150,
//       sorter: (a, b) => a.technologyName[0].localeCompare(b.technologyName[0]),
//       key: "technologyName",
//       render: (_, record) => (
//         <span style={ { textTransform: "capitalize" } }>
//           { record.technologyName.join(" , ") }
//         </span>
//       ),
//     },
//     {
//       title: "Project Type",
//       dataIndex: "project_typeName",
//       width: 150,
//       sorter: (a, b) => a.project_typeName.localeCompare(b.project_typeName),
//       key: "projecttypeName",
//       render: (_, record) => (
//         <span style={ { textTransform: "capitalize" } }>
//           { record.project_typeName }
//         </span>
//       ),
//     },
//     {
//       title: "Estimated Hours",
//       dataIndex: "estimatedHours",
//       width: 50,
//       sorter: (a, b) => a.estimatedHours.localeCompare(b.estimatedHours),
//       key: "estimatedHours",
//       render: (_, record) => (
//         <span style={ { textTransform: "capitalize" } }>
//           { record.estimatedHours }
//         </span>
//       ),
//     },
//     {
//       title: "Used Hours",
//       dataIndex: "total_logged_time",
//       width: 50,
//       sorter: (a, b) => a.total_logged_time.localeCompare(b.total_logged_time),
//       key: "total_logged_time",
//       render: (_, record) => (
//         <span style={ { textTransform: "capitalize" } }>
//           { record.total_logged_time }
//         </span>
//       ),
//     },
//     {
//       title: "Start Date",
//       dataIndex: "start_date",
//       width: 200,
//       sorter: (a, b) => a.start_date.localeCompare(b.start_date),
//       key: "start_date",
//       render: (_, record) => (
//         <span style={ { textTransform: "capitalize" } }>
//           { formatDate(record.start_date) }
//         </span>
//       ),
//     },
//     {
//       title: "End Date",
//       dataIndex: "end_date",
//       width: 200,
//       sorter: (a, b) => a.end_date.localeCompare(b.end_date),
//       key: "end_date",
//       render: (_, record) => (
//         <span style={ { textTransform: "capitalize" } }>
//           { formatDate(record.end_date) }
//         </span>
//       ),
//     },
//   ], [formatTitle, formatDate]);

//   // Memoized chart data processing
//   const processedChartData = useMemo(() => {
//     const filteredProjectTypeData = projectTypeData.filter(
//       entry => entry.project_typeName
//     );

//     return {
//       filteredProjectTypeData,
//       projectTypeReportData: filteredProjectTypeData.map(entry => entry.totalProjects),
//       projectTypeLabels: filteredProjectTypeData.map(entry => entry.project_typeName),
//       technologyReportData: technologiesData.map(entry => entry.totalProjects),
//       technologyLabels: technologiesData.map(entry => entry.technologyName)
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
//     const { filteredProjectTypeData, projectTypeReportData, projectTypeLabels } = processedChartData;

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
//           width: 100,
//         },
//         annotations: {
//           xaxis: [
//             {
//               x: 500,
//               borderColor: CHART_COLORS.primary,
//               label: {
//                 borderColor: CHART_COLORS.primary,
//                 style: {
//                   color: CHART_COLORS.white,
//                   background: CHART_COLORS.primary,
//                 },
//               },
//             },
//           ],
//           yaxis: [
//             {
//               y: "July",
//               y2: "September",
//             },
//           ],
//         },
//         plotOptions: {
//           bar: { horizontal: true },
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
//         legend: {
//           show: true,
//           position: "top",
//           horizontalAlign: "left",
//           offsetX: 40,
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
//           name: "TechnologyWiseProject",
//           data: technologyReportData,
//         },
//       ],
//       options: {
//         chart: {
//           toolbar: { show: false },
//           type: "bar",
//           height: 350,
//           width: 100,
//         },
//         annotations: {
//           xaxis: [
//             {
//               x: 500,
//               borderColor: CHART_COLORS.primary,
//               label: {
//                 borderColor: CHART_COLORS.primary,
//                 style: {
//                   color: CHART_COLORS.white,
//                   background: CHART_COLORS.primary,
//                 },
//               },
//             },
//           ],
//           yaxis: [
//             {
//               y: "July",
//               y2: "September",
//             },
//           ],
//         },
//         plotOptions: {
//           bar: { horizontal: false },
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
//   const sortOptions = useMemo(() => [
//     { key: "title", label: "Project Name" },
//     { key: "managerName", label: "Project Manager" },
//     { key: "technologyName", label: "Technology" },
//     { key: "project_typeName", label: "Project Type" },
//     { key: "estimatedHours", label: "Estimated Hours" },
//     { key: "total_logged_time", label: "Used Hours" },
//     { key: "start_date", label: "Start Date" },
//     { key: "end_date", label: "End Date" },
//   ], []);

//   // Memoized handlers
//   const handlePopoverClose = useCallback(() => {
//     setIsPopoverVisible(false);
//     setIssortbyPopUp(false);
//   }, [setIsPopoverVisible, setIssortbyPopUp]);

//   const handleExportClick = useCallback(() => {
//     const csvRef = document.getElementById("test-table-xls-button");
//     csvRef?.click();
//   }, []);

//   const handleResetClick = useCallback(() => {
//     getProjectReportsDetails({ sort: "logged_date" });
//   }, [getProjectReportsDetails]);

//   const showTotal = useCallback(
//     (total) => `Total Records Count is ${total}`,
//     []
//   );

//   // Effect for chart re-rendering
//   useEffect(() => {
//     setChartKey(prevKey => prevKey + 1);
//   }, [pieeChartData]);

//   // Render methods
//   const renderFilterSelect = useCallback((
//     name,
//     placeholder,
//     value,
//     onChange,
//     options,
//     valueKey,
//     labelKey,
//     mode = "multiple"
//   ) => (
//     <div className="project-running-reports-fillter">
//       <Form.Item name={ name }>
//         <Select
//           placeholder={ placeholder }
//           mode={ mode }
//           showSearch
//           value={ value }
//           onChange={ onChange }
//           filterOption={ (input, option) =>
//             option.children
//               ?.toLowerCase()
//               .indexOf(input?.toLowerCase()) >= 0
//           }
//           filterSort={ (optionA, optionB) =>
//             optionA.children
//               ?.toLowerCase()
//               .localeCompare(optionB.children?.toLowerCase())
//           }
//         >
//           { options.map((item, index) => (
//             <Option
//               key={ index }
//               value={ item[valueKey] }
//               style={ { textTransform: "capitalize" } }
//             >
//               { labelKey === "manager_name" ? removeTitle(item[labelKey]) : item[labelKey] }
//             </Option>
//           )) }
//         </Select>
//       </Form.Item>
//     </div>
//   ), []);

//   const renderSortOptions = useCallback(() => (
//     <div className="project-runnig-sort-by-listing">
//       { sortOptions.map(({ key, label }) => (
//         <p key={ key } onClick={ () => handleSortSelect(key) }>
//           { label }
//           { selectedSort === key && <SortIcon sortOrder={ sortOrder } /> }
//         </p>
//       )) }
//     </div>
//   ), [sortOptions, handleSortSelect, selectedSort, sortOrder]);

//   const renderChart = useCallback((chartData, type, width = "100%") => {
//     if (!chartData) return null;

//     return (
//       <ReactApexChart
//         key={ type === "pie" ? chartKey : undefined }
//         options={ chartData.options }
//         series={ chartData.series }
//         type={ type }
//         width={ width }
//       />
//     );
//   }, [chartKey]);

//   return (
//     <Card className="employee-card">

//       <div className="heading-wrapper">

//         <h2>Projects-Running</h2>

//       </div>

//       <div className="global-search" >

//         <div className="header">

//           <h2>Filter</h2>
//         </div>
//         <div className="filter-btn-wrapper projects-running">

//           { renderFilterSelect(
//             "technology",
//             "Technology",
//             value,
//             handleTechnologyChange,
//             technologyList,
//             "_id",
//             "project_tech"
//           ) }

//           { renderFilterSelect(
//             "projectManager",
//             "Project Manager",
//             projectManager,
//             handleManagerChange,
//             projectManagerList,
//             "_id",
//             "manager_name"
//           ) }

//           { renderFilterSelect(
//             "projectype",
//             "Project Type",
//             projectType,
//             handleTypeChange,
//             projectTypeList,
//             "_id",
//             "project_type"
//           ) }
//           <div className="project-running-reports-fillter">
//             <h3>Total Projects</h3>
//             <span>{ metaDataOfReports.total }</span>
//           </div>
//         </div>
//       </div>



//       <div className="project-panel-header">
//         <div
//           className="project-runnig-data-wrapper"
//           style={ {
//             display: "flex",
//             justifyContent: "space-between",
//             flexWrap: "wrap",
//           } }
//         >
//           { renderChart(pieChartData, "pie") }
//           { renderChart(horizontalBarChartData, "bar") }
//           { renderChart(verticalBarChartData, "bar") }
//         </div>

//         <div
//           className="project-panel-table-data"
//           onMouseEnter={ handleMouseEnter }
//           onMouseLeave={ handleMouseLeave }
//         >
//           { tableData && tableData.length > 0 && (
//             <Popover
//               placement="left"
//               visible={ isPopoverVisible }
//               onVisibleChange={ handlePopoverClose }
//               content={
//                 <>
//                   <div onClick={ () => setIsPopoverVisible(true) }>
//                     <Popover
//                       placement="rightTop"
//                       visible={ sortbyPopUp }
//                       onVisibleChange={ setIssortbyPopUp }
//                       content={ renderSortOptions() }
//                     >
//                       <div
//                         style={ {
//                           display: "flex",
//                           justifyContent: "space-between",
//                           alignItems: "center",
//                         } }
//                         className="project-running-sort-by-popup"
//                       >
//                         <i className="fi fi-rr-caret-left"></i>
//                         <p>sortBy</p>
//                       </div>
//                     </Popover>
//                   </div>

//                   <p onClick={ handleExportClick } style={ { cursor: "pointer" } }>
//                     Export
//                   </p>
//                   <p onClick={ handleResetClick } style={ { cursor: "pointer" } }>
//                     Reset
//                   </p>
//                 </>
//               }
//             >
//               <Space align="end" style={ { marginRight: 10 } }>
//                 <i
//                   onClick={ handleOpenThreeDotMenu }
//                   style={ { cursor: "pointer" } }
//                   className="fi fi-br-menu-dots-vertical"
//                 ></i>
//               </Space>
//             </Popover>
//           ) }

//           <div hidden>
//             <ReactHTMLTableToExcel
//               id="test-table-xls-button"
//               className="ant-btn-primary"
//               table="table-to-xls"
//               filename="Projects"
//               sheet="tablexls"
//               buttonText="Export XLS"
//             />
//             <div dangerouslySetInnerHTML={ { __html: html["html"] } }></div>
//           </div>

//           { tableData && tableData.length > 0 ? (
//             <Table
//               columns={ columns }
//               dataSource={ tableData }
//               pagination={ {
//                 showSizeChanger: true,
//                 pageSizeOptions: ["10", "20", "30"],
//                 showTotal: showTotal,
//                 ...pagination,
//               } }
//               onChange={ handleTableChange }
//             />
//           ) : (
//             <NoDataFound />
//           ) }
//         </div>
//       </div>

//     </Card>
//   );
// };

// export default ProjectsRunning;
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Header } from "antd/lib/layout/layout";
import { Card, Form, Popover, Select, Space, Table, Button, Dropdown, Menu, Tooltip } from "antd";
import { DownOutlined, MoreOutlined, ExportOutlined, ReloadOutlined, SortAscendingOutlined } from '@ant-design/icons';
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
    <h1>No data found</h1>
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

  const companySlug = localStorage.getItem("companyDomain");
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
          <Link to={`/${companySlug}/project/app/${record?._id}?tab=${record?.defaultTab?.name}`}>
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
      title: "Technology",
      dataIndex: "technologyName",
      width: 150,
      sorter: (a, b) => a.technologyName[0].localeCompare(b.technologyName[0]),
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
        <span className="project-type-badge">
          {record.project_typeName}
        </span>
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
      align: 'center',
    },
    {
      title: "Used Hours",
      dataIndex: "total_logged_time",
      width: 100,
      sorter: (a, b) => a.total_logged_time.localeCompare(b.total_logged_time),
      key: "total_logged_time",
      render: (_, record) => (
        <span className="hours-display used-hours">
          {record.total_logged_time}
        </span>
      ),
      align: 'center',
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      width: 120,
      sorter: (a, b) => a.start_date.localeCompare(b.start_date),
      key: "start_date",
      render: (_, record) => (
        <span className="date-display">
          {formatDate(record.start_date)}
        </span>
      ),
      align: 'center',
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      width: 120,
      sorter: (a, b) => a.end_date.localeCompare(b.end_date),
      key: "end_date",
      render: (_, record) => (
        <span className="date-display">
          {formatDate(record.end_date)}
        </span>
      ),
      align: 'center',
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
        colors: ['#00E396', '#008FFB', '#00D9FF', '#FEB019', '#FF4560', '#775DD0'],
        legend: {
          position: 'bottom',
          fontSize: '14px',
        },
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
        },
        colors: ['#00E396'],
        plotOptions: {
          bar: { 
            horizontal: true,
            borderRadius: 4,
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
  const handleExportClick = useCallback(() => {
    const csvRef = document.getElementById("test-table-xls-button");
    csvRef?.click();
  }, []);

  const handleResetClick = useCallback(() => {
    getProjectReportsDetails({ sort: "logged_date" });
  }, [getProjectReportsDetails]);

  const showTotal = useCallback(
    (total, range) => `Showing ${range[0]}-${range[1]} of ${total} projects`,
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
    <div className="filter-select-container">
      <Form.Item name={name}>
        <Select
          placeholder={placeholder}
          mode={mode}
          showSearch
          value={value}
          onChange={onChange}
          className="custom-select"
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
              className="custom-option"
            >
              {labelKey === "manager_name" ? removeTitle(item[labelKey]) : item[labelKey]}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </div>
  ), []);

  const renderSortOptions = useCallback(() => (
    <div className="sort-options-menu">
      {sortOptions.map(({ key, label }) => (
        <div 
          key={key} 
          className={`sort-option ${selectedSort === key ? 'active' : ''}`}
          onClick={() => handleSortSelect(key)}
        >
          <span>{label}</span>
          {selectedSort === key && <SortIcon sortOrder={sortOrder} />}
        </div>
      ))}
    </div>
  ), [sortOptions, handleSortSelect, selectedSort, sortOrder]);

  const renderChart = useCallback((chartData, type, title) => {
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
  }, [chartKey]);

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
            <span>{label}</span>
            {selectedSort === key && <SortIcon sortOrder={sortOrder} />}
          </div>
        ),
        onClick: () => handleSortSelect(key)
      }))
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: 'Export',
      onClick: handleExportClick
    },
    {
      key: 'reset',
      icon: <ReloadOutlined />,
      label: 'Reset',
      onClick: handleResetClick
    }
  ];

  return (
    <div className="projects-running-container">
      <Card className="projects-running-card">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Running Projects</h1>
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-label">Total Projects</span>
                <span className="stat-value">{metaDataOfReports.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filters-header">
            <h3>Filters</h3>
          </div>
          <div className="filters-container">
            {renderFilterSelect(
              "technology",
              "Select Technology",
              value,
              handleTechnologyChange,
              technologyList,
              "_id",
              "project_tech"
            )}

            {renderFilterSelect(
              "projectManager",
              "Select Project Manager",
              projectManager,
              handleManagerChange,
              projectManagerList,
              "_id",
              "manager_name"
            )}

            {renderFilterSelect(
              "projectype",
              "Select Project Type",
              projectType,
              handleTypeChange,
              projectTypeList,
              "_id",
              "project_type"
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="charts-section">
          <div className="charts-grid">
            {renderChart(pieChartData, "pie", "Projects by Manager")}
            {renderChart(horizontalBarChartData, "bar", "Projects by Type")}
            {renderChart(verticalBarChartData, "bar", "Projects by Technology")}
          </div>
        </div>

        {/* Table */}
        <div className="table-section">
          <div className="table-header">
            <h3>Projects List</h3>
            <div className="table-actions">
              <Dropdown
                menu={{ items: actionMenuItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button type="text" icon={<MoreOutlined />} />
              </Dropdown>
            </div>
          </div>

          <div className="table-container">
            {/* Hidden export elements */}
            <div style={{ display: 'none' }}>
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
                scroll={{ x: 'max-content' }}
                className="custom-table"
              />
            ) : (
              <NoDataFound />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProjectsRunning;
