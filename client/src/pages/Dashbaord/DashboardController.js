import { Form, Input } from "antd";
import React, { useEffect, useState } from "react";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import moment from "moment";
import { useHistory } from "react-router-dom";
import { generateCacheKey } from "../../util/generateCacheKey";

const DashboardController = () => {
  const companySlug = localStorage.getItem("companyDomain");

  const [showFiltersProject, setShowFilterProject] = useState(false);
  const [statusList, setStatusList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [selectedTab, setSelectedTab] = useState("Recent");
  const [firstName, setFirstName] = useState("");
  const [fullName, setFullName] = useState("");
  const [empImage, setEmpImage] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [showLoggedTimeFiltrs, setShowLoggedTimeFiltrs] = useState(false);
  const [showTasksiltrs, setTasksFiltrs] = useState(false);
  const [showBugsFiltrs, setShowBugsFiltrs] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [projectDetails, setProjectDetails] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [myProj, setmyProj] = useState([]);
  const [myTask, setmyTask] = useState([]);
  const [myBug, setmyBug] = useState([]);
  const [myTime, setmyTime] = useState([]);
  const [listId, setListId] = useState(null);
  const [currentMonth, setCurrentMonth] = useState("");
  const [totalLoggedProgress, setTotalLoggedProgress] = useState(null);


  const history = useHistory();
  const [category, setCategory] = useState([]);

  const [projStatus, setProjStatus] = useState([]);
  //task projects filter
  const [projects, setProjects] = useState([]);
  //bug project filter
  const [projectsBug, setProjectsBug] = useState([]);
  //time filter
  const [projectsTime, setprojectsTime] = useState([]);

  const [taskStatus, setTaskStatus] = useState("all");
  const [bugStatus, setBugStatus] = useState("all");
  const [OpenBugStatus, setOpenBugStatus] = useState(false);
  const [dates, setDates] = useState({
    taskStartDate: "",
    taskEndDate: "",
    bugStartDate: "",
    bugEndDate: "",
    timeStartDate: "",
    timeEndDate: "",
  });

  const [searchCategory, setSearchCategory] = useState("");
  const [searchTaskProject, setSearchTaskProject] = useState("");
  const [searchTimeProject, setSearchTimeProject] = useState("");
  const [searchBugProject, setSearchBugProject] = useState("");

  const handleChangeDate = (key, value) => {
    setDates({
      ...dates,
      [key]: value,
    });
  };

  const [popOver, setPopOver] = useState({
    projectStatus: false,
    projectCategory: false,
    taskStatus: false,
    taskProject: false,
    taskDate: false,
    bugStatus: false,
    bugProject: false,
    bugDate: false,
    timeProject: false,
    timeDate: false,
    timeStatus: false,
  });
  const [recentList, setRecentList] = useState([]);

  useEffect(() => {
    const date = new Date();
    const month = date.toLocaleString("default", { month: "long" });
    setCurrentMonth(month);
  }, []);

  const handleVisibleChange = (key, visible) => {
    if (!visible) {
      setPopOver((prevState) => ({
        ...prevState,
        [key]: visible,
      }));
    } else {
      setPopOver((prevState) => ({
        ...prevState,
        [key]: !prevState[key],
      }));
    }
  };

  const handleBookmark = async (item) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        api_url: `${Service.bookmarked}/${item?._id}`,
        methodName: Service.putMethod,
        body: { isStarred: !item.isStarred },
      });
      if (response?.data) {
        dispatch(hideAuthLoader());
        myProjects();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const getDateFormatted = (date) => {
    if (date === null || date === "") {
      return "-";
    } else {
      const dateObj = new Date(date);
      const day = dateObj.getDate();
      const month = dateObj.toLocaleString("en-US", { month: "short" });
      const year = dateObj.getFullYear().toString().substr(2);
      const formattedDate = `${day} ${month}, ${year}`;
      return formattedDate;
    }
  };

  const handleSearchCategory = (e) => {
    setSearchCategory(e.target.value);
  };
  const filteredCategoryList = categoryList.filter((item) =>
    item.project_tech?.toLowerCase().includes(searchCategory?.toLowerCase())
  );

  const handleSearchTaskProject = (e) => {
    setSearchTaskProject(e.target.value);
  };

  const filteredTaskProjectList = projectList.filter((item) =>
    item.title?.toLowerCase().includes(searchTaskProject?.toLowerCase())
  );

  const handleSearchTimeProject = (e) => {
    setSearchTimeProject(e.target.value);
  };

  const filteredTimeProjectList = projectList.filter((item) =>
    item.title?.toLowerCase().includes(searchTimeProject?.toLowerCase())
  );

  const handleSearchBugProject = (e) => {
    setSearchBugProject(e.target.value);
  };

  const filteredBugProjectList = projectList.filter((item) =>
    item.title?.toLowerCase().includes(searchBugProject?.toLowerCase())
  );

  useEffect(() => {
    const getCurrentTimeOfDay = () => {
      const currentHour = new Date().getHours();

      if (currentHour >= 6 && currentHour < 12) {
        setTimeOfDay("Good Morning");
      } else if (currentHour >= 12 && currentHour < 18) {
        setTimeOfDay("Good Afternoon");
      } else if (currentHour >= 18 && currentHour < 21) {
        setTimeOfDay("Good Evening");
      } else {
        setTimeOfDay("Good Night");
      }
    };
    const getUserData = () => {
      const userDataJSON = localStorage.getItem("user_data");
      if (userDataJSON) {
        const userData = JSON.parse(userDataJSON);
        if (userData && userData.first_name) {
          setFirstName(userData.first_name);
        }

        if (userData && userData.emp_img) {
          setEmpImage(userData.emp_img);
        }
        if (userData && userData.full_name) {
          setFullName(userData.full_name);
        }
      }
    };

    getCurrentTimeOfDay();
    getUserData();

    // Update the time of day every minute
    const interval = setInterval(getCurrentTimeOfDay, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleLiClick = (tab) => {
    // Update the selectedTab state with the clicked tab
    setSelectedTab(tab);
  };

  const dispatch = useDispatch();

  const Search = Input.Search;

  const handleFiltersProject = () => {
    setShowFilterProject(!showFiltersProject);
  };

  const handleFilters = (val, state, setState) => {
    if (val === "") {
      setState([]);
    } else {
      if (state.includes(val._id)) {
        setState(state.filter((id) => id !== val._id));
      } else {
        setState([...state, val._id]);
      }
    }
  };

  const handleCategory = (val) => {
    if (category.includes(val._id)) {
      setCategory(category.filter((id) => id !== val._id));
    } else {
      setCategory([...category, val._id]);
    }
  };

  const handleStatus = (val) => {
    if (projStatus.includes(val._id)) {
      setProjStatus(projStatus.filter((id) => id !== val._id));
    } else {
      setProjStatus([...projStatus, val._id]);
    }
  };

  //task
  const handleProjects = (val) => {
    if (projects.includes(val._id)) {
      setProjects(projects.filter((id) => id !== val._id));
    } else {
      setProjects([...projects, val._id]);
    }
  };

  const handleProjectsBugs = (val) => {
    if (projectsBug.includes(val._id)) {
      setProjectsBug(projectsBug.filter((id) => id !== val._id));
    } else {
      setProjectsBug([...projectsBug, val._id]);
    }
  };

  const handleTime = (val) => {
    if (projectsTime.includes(val._id)) {
      setprojectsTime(projectsTime.filter((id) => id !== val._id));
    } else {
      setprojectsTime([...projectsTime, val._id]);
    }
  };

  const handleTaskStatus = (val) => {
    setTaskStatus(val);
  };

  const handleBugStatus = (val) => {
    setBugStatus(val);
  };

  // get status list
  const getStatus = async () => {
    dispatch(showAuthLoader());
    try {
      const reqBody = {
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectStatus,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setStatusList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
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
        setCategoryList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onSearch = (value) => {
    getProjectListing(value.target.value);
  };

  // open modal and calling getlisting api
  const showModal = async () => {
    setIsModalOpen(true);
    getProjectListing();
    getVisitedData();
  };

  const getVisitedData = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getrecentVisited,
      });
      if (response?.data && response?.data?.statusCode == 200) {
        dispatch(hideAuthLoader());
        setRecentList(response?.data?.data);
      }
    } catch (error) {
      console.log("get project error");
    }
  };

  const getLoggedHoursProgress = async (searchText) => {
    try {
      dispatch(showAuthLoader());
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear(); // Get the current year
      const reqBody = {
        month: month,
        year: year.toString(),
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getLoggedHoursProgress,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setTotalLoggedProgress(response?.data?.data)
       
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getProjectListing = async (searchText) => {
    try {
      dispatch(showAuthLoader());
      const defaultPayload = {
        pageNo: 1,
        limit: 5,
        search: searchText || "",
        // search: '',
        sortBy: "desc",
        filterBy: "all",
        isSearch: true,
      };
      const reqBody = {
        ...defaultPayload,
      };
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
        // setSearchEnabled(true);
      }
      let Key = generateCacheKey("project", reqBody);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: {
          cachekey: Key,
        },
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectDetails(response?.data?.data);
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

  //projects on dashboard

  const myProjects = async () => {
    try {
      dispatch(showAuthLoader());
      let reqBody;
      if (category && category.length > 0) {
        reqBody = {
          ...reqBody,
          category: category,
          category: category,
        };
      }
      if (projStatus && projStatus.length > 0) {
        reqBody = {
          ...reqBody,
          project_status: projStatus,
        };
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: reqBody,
      });

      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setmyProj(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "myProject error");
    }
  };
  //tasks on dashboard
  const myTasks = async () => {
    try {
      dispatch(showAuthLoader());

      let reqBody;
      if (projects && projects.length > 0) {
        reqBody = {
          ...reqBody,
          project_id: projects,
          project_id: projects,
        };
      }
      if (taskStatus && taskStatus.length > 0) {
        reqBody = {
          ...reqBody,
          status: taskStatus,
        };
      }

      if (dates.taskStartDate && dates.taskEndDate) {
        let startDate = new Date(dates.taskStartDate).toISOString();
        startDate = moment(startDate).format("YYYY-MM-DD");
        let endDate = new Date(dates.taskEndDate).toISOString();
        endDate = moment(endDate).format("YYYY-MM-DD");
        reqBody.start_date = startDate;
        reqBody.end_date = endDate;
      } else {
        if (dates.taskStartDate) {
          let startDate = new Date(dates.taskStartDate).toISOString();
          startDate = moment(startDate).format("YYYY-MM-DD");
          reqBody.start_date = startDate;
        }
        if (dates.taskEndDate) {
          let endDate = new Date(dates.taskEndDate).toISOString();
          endDate = moment(endDate).format("YYYY-MM-DD");
          reqBody.end_date = endDate;
        }
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myTasks,
        body: reqBody,
      });

      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        dispatch(hideAuthLoader());
        setmyTask(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "myTask error");
    }
  };

  //bugs dashboard

  const myBugs = async () => {
    try {
      dispatch(showAuthLoader());
      let reqBody;
      if (bugStatus && bugStatus.length > 0) {
        if (bugStatus && bugStatus.length > 0) {
          reqBody = {
            ...reqBody,
            status: bugStatus,
          };
        }

        if (projectsBug && projectsBug.length > 0) {
          reqBody = {
            ...reqBody,
            project_id: projectsBug,
            project_id: projectsBug,
          };
        }

        if (dates.bugStartDate && dates.bugEndDate) {
          let startDate = new Date(dates.bugStartDate).toISOString();
          startDate = moment(startDate).format("YYYY-MM-DD");
          let endDate = new Date(dates.bugEndDate).toISOString();
          endDate = moment(endDate).format("YYYY-MM-DD");
          reqBody.start_date = startDate;
          reqBody.end_date = endDate;
        } else {
          if (dates.bugStartDate) {
            let startDate = new Date(dates.bugStartDate).toISOString();
            startDate = moment(startDate).format("YYYY-MM-DD");
            reqBody.start_date = startDate;
          }
          if (dates.bugEndDate) {
            let endDate = new Date(dates.bugEndDate).toISOString();
            endDate = moment(endDate).format("YYYY-MM-DD");
            reqBody.end_date = endDate;
          }
        }

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.myBugs,
          body: reqBody,
        });

        if (response?.data && response?.data?.data) {
          dispatch(hideAuthLoader());
          setmyBug(response?.data?.data);
        }
      }
    } catch (error) {
      console.log(error, "myBug error");
    }
  };

  const myLoggedTime = async () => {
    try {
      dispatch(showAuthLoader());
      const now = new Date();

      // First day of current month
      const start_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // Last day of current month
      const end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      
      let reqBody = {
        start_date:moment(start_date).format("YYYY-MM-DD"),
        end_date:moment(end_date).format("YYYY-MM-DD")
      };
      if (projectsTime && projectsTime.length > 0) {
        reqBody = {
          ...reqBody,
          project_id: projectsTime,
          
        };
      }

      if (dates.timeStartDate && dates.timeEndDate) {
        let startDate = new Date(dates.timeStartDate).toISOString();
        startDate = moment(startDate).format("YYYY-MM-DD");
        let endDate = new Date(dates.timeEndDate).toISOString();
        endDate = moment(endDate).format("YYYY-MM-DD");
        reqBody.start_date = startDate;
        reqBody.end_date = endDate;
      } else {
        if (dates.timeStartDate) {
          let startDate = new Date(dates.timeStartDate).toISOString();
          startDate = moment(startDate).format("YYYY-MM-DD");
          reqBody.start_date = startDate;
        }
        if (dates.timeEndDate) {
          let endDate = new Date(dates.timeEndDate).toISOString();
          endDate = moment(endDate).format("YYYY-MM-DD");
          reqBody.end_date = endDate;
        }
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myLoggedTime,
        body: reqBody,
      });

      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setmyTime(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "myLoggedTime error");
    }
  };

  // getProject Main Task
  const getProjectMianTask = async (projectId) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        project_id: projectId,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectMianTask,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        const taskId = response.data.data[0]._id;
        if (taskId) {
          history.push(`/${companySlug}/project/app/${projectId}?tab=Tasks&listID=${taskId}`);
        }
      } else {
        history.push(`/${companySlug}/project/app/${projectId}?tab=Tasks`);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const formatTimeDifference = (createdAt, updatedAt) => {
    const createdTime = new Date(createdAt);
    const now = updatedAt ? new Date(updatedAt) : new Date();
    const diffInSeconds = Math.floor((now - createdTime) / 1000);
    if (diffInSeconds < 60) {
      return `${diffInSeconds} sec`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      if (hours == 1) {
        return `${hours} hr`;
      } else {
        return `${hours} hrs`;
      }
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      if (days === 1) {
        return `${days} day`;
      } else {
        return `${days} days`;
      }
    }
  };

  useEffect(() => {
    getStatus();
    getTechnologyList();
    getProjectListing();
    getProjectList();
    getLoggedHoursProgress();
  }, []);

  //dashboard
  useEffect(() => {
    myProjects();
    myTasks();
    myBugs();
    myLoggedTime();
  }, []);

  const addVisitedData = async (projectId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addrecentVisited,
        body: {
          project_id: projectId,
        },
      });
      if (response?.data && response?.data?.statusCode == 200) {
        dispatch(hideAuthLoader());
      }
    } catch (error) {
      console.log("add project error");
    }
  };

  return {
    showFiltersProject,
    setShowFilterProject,
    handleFiltersProject,
    handleCategory,
    handleStatus,
    handleProjects,
    handleProjectsBugs,
    handleTaskStatus,
    handleBugStatus,
    Search,
    statusList,
    setStatusList,
    categoryList,
    handleLiClick,
    selectedTab,
    setSelectedTab,
    timeOfDay,
    setTimeOfDay,
    firstName,
    empImage,
    fullName,
    showLoggedTimeFiltrs,
    setShowLoggedTimeFiltrs,
    showTasksiltrs,
    setTasksFiltrs,
    showBugsFiltrs,
    setShowBugsFiltrs,
    isModalOpen,
    setIsModalOpen,
    handleCancel,
    form,
    onSearch,
    projectDetails,
    showModal,
    projectList,
    setProjectList,
    myProj,
    setmyProj,
    myTask,
    setmyTask,
    myBug,
    setmyBug,
    myTime,
    setmyTime,
    listId,
    history,
    getProjectMianTask,
    getDateFormatted,
    category,
    setCategory,
    myProjects,
    formatTimeDifference,
    myTasks,
    taskStatus,
    bugStatus,
    myBugs,
    OpenBugStatus,
    setOpenBugStatus,
    myLoggedTime,
    handleTime,
    setPopOver,
    popOver,
    handleVisibleChange,
    handleChangeDate,
    dates,
    projStatus,
    setProjStatus,
    projects,
    projectsTime,
    projectsBug,
    searchCategory,
    handleSearchCategory,
    filteredCategoryList,
    searchTaskProject,
    filteredTaskProjectList,
    handleSearchTaskProject,
    filteredTimeProjectList,
    filteredBugProjectList,
    handleSearchTimeProject,
    handleSearchBugProject,
    searchTimeProject,
    searchBugProject,
    handleFilters,
    setProjectsBug,
    setProjects,
    setprojectsTime,
    handleBookmark,
    addVisitedData,
    recentList,
    getProjectListing,
    currentMonth,
    totalLoggedProgress
  };
};

export default DashboardController;
