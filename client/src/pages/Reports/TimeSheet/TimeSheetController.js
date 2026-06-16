import React, { useEffect, useState } from "react";
import Service from "../../../service";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import dayjs from "dayjs";
import { removeTitle } from "../../../util/nameFilter";

dayjs.extend(quarterOfYear);

const TimeSheetController = () => {
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

  const [value, setValue] = React.useState([]);
  const [project, setProject] = React.useState([]);
  const [projectType, setprojectType] = React.useState([]);
  const [manager, setManager] = React.useState([]);
  const [department, setDepartment] = React.useState([]);
  const [user, setUser] = React.useState([]);
  const [isIconVisible, setIsIconVisible] = useState(false);
  const [technologyList, setTechnologyList] = useState([]);
  const [projectManagerList, setProjectManagerList] = useState([]);
  const [projectTypeList, setProjectTypeList] = useState([]);
  const [userEmployeeList, setUserEmployeeList] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [pieechartDataMangerNames, setPieChartDataMangerNames] = useState([]);
  const [pieeChartData, setPieChartData] = useState([]);
  const [projectTypeData, setProjectTyeData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [totalLoggedHours, setTotalLoggedHours] = useState("");
  const [sortbyPopUp, setIssortbyPopUp] = useState(false);
  const [selectedSort, setSelectedSort] = useState("logged_date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [html, setHtml] = useState([]);
  const [chartKey, setChartKey] = useState(0);
  const [selectedRange, setSelectedRange] = useState(defaultSelectedRange);

  useEffect(() => {
    // Whenever pie chart data changes, increment the chart key to trigger re-render
    setChartKey((prevKey) => prevKey + 1);
  }, [pieeChartData]);
  const handleMouseEnter = () => {
    setIsIconVisible(true);
  };

  const handleMouseLeave = () => {
    if (!isPopoverVisible) {
      setIsIconVisible(false);
    }
  };

  useEffect(() => {
    getTechnologyList();
    getManager();
    getProjectType();

    getProjectList();
    getDepartmentList();
  }, []);

  useEffect(() => {
    getUserEmployeeList();
  }, [departmentList]);

  const handleTechnologyChange = (selectedValues) => {
    setValue(selectedValues);
    getTimeSheetReportsDetails({
      technologies: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
    exportTimesheetReportCSV({
      technologies: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
  };
  const handleTypeChange = (selectedValues) => {
    setprojectType(selectedValues);
    getTimeSheetReportsDetails({
      types: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
    exportTimesheetReportCSV({
      types: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
  };

  const handleManagerChange = (selectedValues) => {
    setManager(selectedValues);
    getTimeSheetReportsDetails({
      managers: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
    exportTimesheetReportCSV({
      managers: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
  };

  const handleProjectChange = (selectedValues) => {
    setProject(selectedValues);
    getTimeSheetReportsDetails({
      projects: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
    exportTimesheetReportCSV({
      projects: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
  };

  const handleDepartMentChange = (selectedValues) => {
    setDepartment(selectedValues);
    getTimeSheetReportsDetails({
      departments: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
    exportTimesheetReportCSV({
      departments: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
  };

  const handleUserChange = (selectedValues) => {
    setUser(selectedValues);
    getTimeSheetReportsDetails({
      users: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
    exportTimesheetReportCSV({
      users: selectedValues,
      startDate: selectedRange && selectedRange[0], // Include selected date range if it exists
      endDate: selectedRange && selectedRange[1],
    });
  };

  const handleSortSelect = (sortOption) => {
    const newSortOrder =
      sortOption === selectedSort
        ? sortOrder === "asc"
          ? "desc"
          : "asc"
        : "asc";
    setSelectedSort(sortOption);
    setSortOrder(newSortOrder);

    setIssortbyPopUp(false);
    setIsPopoverVisible(false);

    getTimeSheetReportsDetails({
      sort: sortOption,
      sortBy: newSortOrder,
      startDate: selectedRange && selectedRange[0],
      endDate: selectedRange && selectedRange[1],
    });
    exportTimesheetReportCSV({
      sort: sortOption,
      sortBy: newSortOrder,
      startDate: selectedRange && selectedRange[0],
      endDate: selectedRange && selectedRange[1],
    });
  };

  const onReset = () => {
    getTimeSheetReportsDetails({
      sort: "logged_date",
      startDate: selectedRange && selectedRange[0],
      endDate: selectedRange && selectedRange[1],
    });
    exportTimesheetReportCSV({
      sort: "logged_date",
      startDate: selectedRange && selectedRange[0],
      endDate: selectedRange && selectedRange[1],
    });
  };

  const onRangeChange = (dates) => {
    setSelectedRange(dates);
    // Call your API function with the selected date range
    if (!dates || dates.length !== 2) {
      // Treat as deselection event
      getTimeSheetReportsDetails({
        startDate: null,
        endDate: null,
        // Pass any other parameters needed for your API call
      });
      exportTimesheetReportCSV({
        startDate: null,
        endDate: null,
        // Pass any other parameters needed for your API call
      });
    } else {
      const [startDate, endDate] = dates;
      getTimeSheetReportsDetails({
        startDate,
        endDate,
        // Pass any other parameters needed for your API call
      });
      exportTimesheetReportCSV({
        startDate,
        endDate,
        // Pass any other parameters needed for your API call
      });
    }
  };
  const handleTableChange = (page, sorter) => {
    let sortField = null;
    let sortOrder = null;
    if (sorter && sorter.field && sorter.order) {
      sortField = sorter.field;
      sortOrder = sorter.order === "ascend" ? "asc" : "desc";
    }
    setPagination({ ...pagination, ...page });
  };
  const handleOpenThreeDotMenu = () => {
    setIsPopoverVisible(true); // Show the Popover
  };
  const sortPopup = () => {
    setIssortbyPopUp(true); // Show the Popover
  };

  // get tech list
  const getTechnologyList = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectTech,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setTechnologyList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get manager list
  const getManager = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectManager,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectManagerList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get projecttype list
  const getProjectType = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListing,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectTypeList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get employees list
  const getUserEmployeeList = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        departments:
          values && values.length > 0
            ? values
            : departmentList.map((department) => department._id),
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getEmployeesDepartmentWise,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setUserEmployeeList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get project list
  const getProjectList = async () => {
    try {
      dispatch(showAuthLoader());

      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectList,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get department list
  const getDepartmentList = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getsubDepartmentList,
      });

      if (response?.data && response?.data?.data) {
        setDepartmentList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get timeheet reports details
  const getTimeSheetReportsDetails = async ({
    technologies = value,
    types = projectType,
    managers = manager,
    projects = project,
    departments = department,
    users = user,
    sort = selectedSort,
    sortBy = sortOrder,
    startDate,
    endDate,
  } = {}) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        startDate: startDate
          ? startDate.format("DD-MM-YYYY")
          : dayjs().startOf("month").format("DD-MM-YYYY"),
        endDate: endDate
          ? endDate.format("DD-MM-YYYY")
          : dayjs().format("DD-MM-YYYY"),
        technologies:
          technologies && technologies.length > 0 ? technologies : [],
        types: types && types.length > 0 ? types : [],
        managers: managers && managers.length > 0 ? managers : [],
        projects: projects && projects.length > 0 ? projects : [],

        departments: departments && departments.length > 0 ? departments : [],
        users: users && users.length > 0 ? users : [],

        pageNo: pagination.current,
        limit: pagination.pageSize,
        sort: sort ? sort : "",
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
        const labels = response?.data?.data?.manager.map((item) =>
          removeTitle(item.projectManager)
        );
        const totalHours = response?.data?.data?.manager.map(
          (item) => item.totalLoggedHours
        );
        setProjectTyeData(response.data.data.type);
        setDepartmentData(response.data.data.department);
        setUsersData(response.data.data.user);
        setPieChartDataMangerNames(labels);
        setPieChartData(totalHours);
        setTotalLoggedHours(response.data.data.totalHours);
        setPagination((prevPagination) => ({
          ...prevPagination,
          total: response.data.metadata.total,
        }));
      } else {
        setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const exportTimesheetReportCSV = async ({
    technologies = value,
    types = projectType,
    managers = manager,
    projects = project,
    departments = department,
    users = user,
    sort = selectedSort,
    sortBy = sortOrder,
    startDate,
    endDate,
  } = {}) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        startDate: startDate
          ? startDate.format("DD-MM-YYYY")
          : dayjs().startOf("month").format("DD-MM-YYYY"),
        endDate: endDate
          ? endDate.format("DD-MM-YYYY")
          : dayjs().format("DD-MM-YYYY"),
        technologies:
          technologies && technologies.length > 0 ? technologies : [],
        types: types && types.length > 0 ? types : [],
        managers: managers && managers.length > 0 ? managers : [],
        projects: projects && projects.length > 0 ? projects : [],

        departments: departments && departments.length > 0 ? departments : [],
        users: users && users.length > 0 ? users : [],

        pageNo: pagination.current,
        limit: pagination.pageSize,
        sort: sort ? sort : "",
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
      } else {
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  useEffect(() => {
    if (
      technologyList.length &&
      projectManagerList.length &&
      projectTypeList.length &&
      projectList.length &&
      departmentList.length &&
      userEmployeeList.length
    ) {
      const requestParams = {
        ...(selectedRange && {
          startDate: selectedRange[0],
          endDate: selectedRange[1],
        }),
      };
      getTimeSheetReportsDetails(requestParams);
    }
  }, [
    technologyList,
    projectManagerList,
    projectTypeList,
    projectList,
    departmentList,
    userEmployeeList,
    selectedRange,
    pagination.current,
    pagination.pageSize,
  ]);

  return {
    rangePresets,
    selectedRange,
    value,
    setValue,
    onRangeChange,
    isPopoverVisible,
    setIsPopoverVisible,
    handleOpenThreeDotMenu,
    sortPopup,
    setIssortbyPopUp,
    sortbyPopUp,
    project,
    setProject,
    projectType,
    setprojectType,
    manager,
    setManager,
    department,
    setDepartment,
    user,
    setUser,
    isIconVisible,
    setIsIconVisible,
    handleMouseEnter,
    handleMouseLeave,
    technologyList,
    setTechnologyList,
    projectManagerList,
    setProjectManagerList,
    projectTypeList,
    setProjectTypeList,
    userEmployeeList,
    setUserEmployeeList,
    projectList,
    setProjectList,
    departmentList,
    setDepartmentList,
    getUserEmployeeList,
    tableData,
    projectTypeData,
    departmentData,
    usersData,
    pieechartDataMangerNames,
    pieeChartData,
    totalLoggedHours,
    handleDepartMentChange,
    handleTechnologyChange,
    handleManagerChange,
    handleProjectChange,
    handleUserChange,
    handleTypeChange,
    handleTableChange,
    handleSortSelect,
    pagination,
    html,
    setHtml,
    getTimeSheetReportsDetails,
    sortOrder,
    selectedSort,
    chartKey,
    onReset,
  };
};

export default TimeSheetController;
