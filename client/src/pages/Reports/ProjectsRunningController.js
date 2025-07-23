import React, { useEffect, useState } from "react";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { removeTitle } from "../../util/nameFilter";

const ProjectsRunningController = () => {
  const dispatch = useDispatch();

  const [value, setValue] = React.useState([]);
  const [projectManager, setProjectManager] = React.useState([]);
  const [projectType, setprojectType] = React.useState([]);
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const [isIconVisible, setIsIconVisible] = useState(false);
  const [technologyList, setTechnologyList] = useState([]);
  const [projectManagerList, setProjectManagerList] = useState([]);
  const [projectTypeList, setProjectTypeList] = useState([]);
  const [sortbyPopUp, setIssortbyPopUp] = useState(false);
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

  const handleMouseEnter = () => {
    setIsIconVisible(true);
  };

  const handleMouseLeave = () => {
    if (!isPopoverVisible) {
      setIsIconVisible(false);
    }
  };
  const handleOpenThreeDotMenu = () => {
    setIsPopoverVisible(true); // Show the Popover
  };

  const sortTableData = (pagination, filters, sorter, extra) => {};

  const sortPopup = () => {
    setIssortbyPopUp(true); // Show the Popover
  };

  const handleTechnologyChange = (selectedValues) => {
    setValue(selectedValues);
    getProjectReportsDetails({ technologies: selectedValues });
    exportCsvProjectReportsDetails({ technologies: selectedValues });
  };
  const handleTypeChange = (selectedValues) => {
    setprojectType(selectedValues);
    getProjectReportsDetails({ types: selectedValues });
    exportCsvProjectReportsDetails({ types: selectedValues });
  };

  const handleManagerChange = (selectedValues) => {
    setProjectManager(selectedValues);
    getProjectReportsDetails({ managers: selectedValues });
    exportCsvProjectReportsDetails({ managers: selectedValues });
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

    setIsPopoverVisible(false);
    setIssortbyPopUp(false); // Close the popover after selecting a sort option
    getProjectReportsDetails({ sort: sortOption, sortBy: newSortOrder }); // Call API with the selected sorting option
    exportCsvProjectReportsDetails({ sort: sortOption, sortBy: newSortOrder }); // Call API with the selected sorting option
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

  // get projecttype list
  const getProjectReportsDetails = async ({
    technologies = value,
    types = projectType,
    managers = projectManager,
    sort = selectedSort,
    sortBy = sortOrder,
  } = {}) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        technologies:
          technologies && technologies.length > 0 ? technologies : [],
        types: types && types.length > 0 ? types : [],
        managers: managers && managers.length > 0 ? managers : [],
        pageNo: pagination.current,
        limit: pagination.pageSize,
        sort: sort ? sort : "",
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

        const managers = response?.data?.data?.managers;
        const totalProjectsAll = managers.reduce(
          (total, item) => total + item.totalProjects,
          0
        );

        let seriesData, labels;

        if (managers.length > 10) {
          const totalProjectsTop10 = managers
            .slice(0, 10)
            .reduce((total, item) => total + item.totalProjects, 0);

          const totalProjectsOthers = totalProjectsAll - totalProjectsTop10;

          seriesData = [
            ...managers.slice(0, 10).map((item) => item.totalProjects),
            totalProjectsOthers,
          ];

          labels = [
            ...managers
              .slice(0, 10)
              .map((item) => removeTitle(item.managerName)),
            "Others",
          ];
        } else {
          seriesData = managers.map((item) => item.totalProjects);
          labels = managers.map((item) => removeTitle(item.managerName));
        }

        setPieChartDataMangerNames(labels);
        setPieChartData(seriesData);
        setProjectTyeData(response.data.data.types);
        setTechnologiesData(response.data.data.technologies);
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

  const exportCsvProjectReportsDetails = async ({
    technologies = value,
    types = projectType,
    managers = projectManager,
    sort = selectedSort,
    sortBy = sortOrder,
  } = {}) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        technologies:
          technologies && technologies.length > 0 ? technologies : [],
        types: types && types.length > 0 ? types : [],
        managers: managers && managers.length > 0 ? managers : [],
        pageNo: pagination.current,
        limit: pagination.pageSize,
        sort: sort ? sort : "",
        sortBy: sortBy,
        isExport: true,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.exportProjectRunningReportCSV,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        setHtml(response?.data?.data)
      } 
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  useEffect(() => {
    getTechnologyList();
    getManager();
    getProjectType();
  }, []);

  useEffect(() => {
    if (
      technologyList.length &&
      projectManagerList.length &&
      projectTypeList.length
    ) {
      getProjectReportsDetails({});
      exportCsvProjectReportsDetails({})
    }
  }, [
    technologyList,
    projectManagerList,
    projectTypeList,
    pagination.current,
    pagination.pageSize,
  ]);

  return {
    value,
    setValue,
    isPopoverVisible,
    setIsPopoverVisible,
    handleOpenThreeDotMenu,
    projectManager,
    setProjectManager,
    projectType,
    setprojectType,
    sortTableData,
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
    sortPopup,
    sortbyPopUp,
    setIssortbyPopUp,
    handleTechnologyChange,
    handleTypeChange,
    handleManagerChange,
    tableData,
    setTableData,
    handleTableChange,
    pagination,
    metaDataOfReports,
    pieechartDataMangerNames,
    projectTypeData,
    technologiesData,
    pieeChartData,
    setPieChartData,
    handleSortSelect,
    html,
    getProjectReportsDetails,
    selectedSort,
    sortOrder,
  };
};

export default ProjectsRunningController;
