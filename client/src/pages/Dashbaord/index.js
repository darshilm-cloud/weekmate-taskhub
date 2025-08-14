import React, { useState, useEffect } from "react";
import "./dashboard.css";
import { Col, Tooltip, Form, Card } from "antd";
import EmployeeIcon from "../../assets/icons/EmployeeIcon";
import { Link } from "react-router-dom";
import { StarFilled, StarOutlined } from "@ant-design/icons";
import moment from "moment";
import { calculateTimeDifference } from "../../util/formatTimeDifference";
import { removeTitle } from "../../util/nameFilter";
import ProjectListModal from "../../components/Modal/ProjectListModal";
import MyAvatar from "../../components/Avatar/MyAvatar";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { generateCacheKey } from "../../util/generateCacheKey";
import ProjectFilterComponent from "./ProjectFilterComponent";
import TaskFilterComponent from "./TaskFilterComponent";
import BugFilterComponent from "./BugFilterComponent";
import TimeFilterComponent from "./TimeFilterComponent";
import dayjs from "dayjs";

const Dashboard = () => {
  const userData = JSON.parse(localStorage.getItem("user_data"));
  const roleName = userData.pms_role_id.role_name;

  const dispatch = useDispatch();
  const companySlug = localStorage.getItem("companyDomain");
  
  const history = useHistory();
  const [firstName, setFirstName] = useState("");
  const [fullName, setFullName] = useState("");
  const [empImage, setEmpImage] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [projectDetails, setProjectDetails] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [myProj, setMyProj] = useState([]);
  const [myTask, setMyTask] = useState([]);
  const [myBug, setMyBug] = useState([]);
  const [myTime, setMyTime] = useState([]);
  const [currentMonth, setCurrentMonth] = useState("");
  const [totalLoggedProgress, setTotalLoggedProgress] = useState(null);
  const [recentList, setRecentList] = useState([]);
  // Project filter states
  const [projStatus, setProjStatus] = useState([]);
  const [category, setCategory] = useState([]);
  // Task filter states
  const [taskProjects, setTaskProjects] = useState([]);
  const [taskStatus, setTaskStatus] = useState("all");
  const [taskDates, setTaskDates] = useState({
    startDate: null,
    endDate: null,
  });
  // Bug filter states
  const [bugProjects, setBugProjects] = useState([]);
  const [bugStatus, setBugStatus] = useState("all");
  const [bugDates, setBugDates] = useState({ startDate: null, endDate: null });
  // Time filter states
  const [timeProjects, setTimeProjects] = useState([]);
  const [timeDates, setTimeDates] = useState({
    startDate: null,
    endDate: null,
  });

  // Add flags to track initial load to prevent unnecessary API calls on mount
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalEmployee, setTotalEmployee] = useState(0);

  useEffect(() => {
    const date = new Date();
    const month = date.toLocaleString("default", { month: "long" });
    setCurrentMonth(month);
  }, []);

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
    const interval = setInterval(getCurrentTimeOfDay, 60000);
    return () => clearInterval(interval);
  }, []);

  // useEffect to trigger myProjects when project filter states change
  useEffect(() => {
    if (!isInitialLoad) {
      myProjects();
    }
  }, [projStatus, category]);

  // useEffect to trigger myTasks when task filter states change
  useEffect(() => {
    if (!isInitialLoad) {
      myTasks();
    }
  }, [taskProjects, taskStatus, taskDates]);

  // useEffect to trigger myBugs when bug filter states change
  useEffect(() => {
    if (!isInitialLoad) {
      myBugs();
    }
  }, [bugProjects, bugStatus, bugDates]);

  // useEffect to trigger myLoggedTime when time filter states change
  useEffect(() => {
    if (!isInitialLoad) {
      myLoggedTime();
    }
  }, [timeProjects, timeDates]);

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
      return `${day} ${month}, ${year}`;
    }
  };

  const getProjectListing = async (searchText) => {
    try {
      dispatch(showAuthLoader());
      const defaultPayload = {
        pageNo: 1,
        limit: 5,
        search: searchText || "",
        sortBy: "desc",
        filterBy: "all",
        isSearch: true,
      };
      const reqBody = { ...defaultPayload };
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
      }
      let Key = generateCacheKey("project", reqBody);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: { cachekey: Key },
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectDetails(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

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

  const getLoggedHoursProgress = async () => {
    try {
      dispatch(showAuthLoader());
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const reqBody = { month, year: year.toString() };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getLoggedHoursProgress,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setTotalLoggedProgress(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const myProjects = async () => {
    try {
      dispatch(showAuthLoader());
      let reqBody = {};
      if (category && category.length > 0) {
        reqBody = { ...reqBody, category };
      }
      if (projStatus && projStatus.length > 0) {
        reqBody = { ...reqBody, project_status: projStatus };
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setMyProj(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "myProject error");
    }
  };

  const myTasks = async () => {
    try {
      dispatch(showAuthLoader());
      let reqBody = {};
      if (taskProjects && taskProjects.length > 0) {
        reqBody = { ...reqBody, project_id: taskProjects };
      }
      if (taskStatus && taskStatus !== "all") {
        reqBody = { ...reqBody, status: taskStatus };
      }

      if (taskDates.startDate) {
        reqBody.start_date = dayjs(taskDates.startDate).format("YYYY-MM-DD");
      }
      if (taskDates.endDate) {
        reqBody.end_date = dayjs(taskDates.endDate).format("YYYY-MM-DD");
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myTasks,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setMyTask(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "myTask error");
    }
  };

  const myBugs = async () => {
    try {
      dispatch(showAuthLoader());
      let reqBody = {};
      if (bugStatus && bugStatus !== "all") {
        reqBody = { ...reqBody, status: bugStatus };
      }
      if (bugProjects && bugProjects.length > 0) {
        reqBody = { ...reqBody, project_id: bugProjects };
      }
      if (bugDates.startDate) {
        reqBody.start_date = dayjs(bugDates.startDate).format("YYYY-MM-DD");
      }
      if (bugDates.endDate) {
        reqBody.end_date = dayjs(bugDates.endDate).format("YYYY-MM-DD");
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myBugs,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setMyBug(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "myBug error");
    }
  };

  const myLoggedTime = async () => {
    try {
      dispatch(showAuthLoader());
      const now = new Date();
      const start_date = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();
      const end_date = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      ).toISOString();
      let reqBody = {
        start_date: moment(start_date).format("YYYY-MM-DD"),
        end_date: moment(end_date).format("YYYY-MM-DD"),
      };
      if (timeProjects && timeProjects.length > 0) {
        reqBody = { ...reqBody, project_id: timeProjects };
      }

      if (timeDates.startDate) {
        reqBody.start_date = dayjs(timeDates.startDate).format("YYYY-MM-DD");
      }
      if (timeDates.endDate) {
        reqBody.end_date = dayjs(timeDates.endDate).format("YYYY-MM-DD");
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myLoggedTime,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        setMyTime(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "myLoggedTime error");
    }
  };

  const getProjectMianTask = async (projectId) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = { project_id: projectId };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectMianTask,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data.length > 0) {
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

  const addVisitedData = async (projectId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addrecentVisited,
        body: { project_id: projectId },
      });
      if (response?.data && response?.data?.statusCode == 200) {
        dispatch(hideAuthLoader());
      }
    } catch (error) {
      console.log("add project error");
    }
  };

  const showModal = async () => {
    setIsModalOpen(true);
    getProjectListing();
    getVisitedData();
  };

  // Updated filter change handlers - now only update state, API calls happen in useEffect
  const onProjectFilterChange = (skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setProjStatus([]);
      setCategory([]);
    } else {
      if (skipParams.includes("skipStatus")) setProjStatus([]);
      if (skipParams.includes("skipCategory")) setCategory([]);
    }
    if (selectedFilters) {
      setProjStatus(selectedFilters.status || []);
      setCategory(selectedFilters.category || []);
    }
    // Removed myProjects() call - will be handled by useEffect
  };

  const onTaskFilterChange = (skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setTaskProjects([]);
      setTaskStatus("all");
      setTaskDates({ startDate: null, endDate: null });
    } else {
      if (skipParams.includes("skipProject")) setTaskProjects([]);
      if (skipParams.includes("skipStatus")) setTaskStatus("all");
      if (skipParams.includes("skipDate"))
        setTaskDates({ startDate: null, endDate: null });
    }
    if (selectedFilters) {
      setTaskProjects(selectedFilters.project || []);
      setTaskStatus(selectedFilters.status || "all");
      setTaskDates(selectedFilters.dates || { startDate: null, endDate: null });
    }
    // Removed myTasks() call - will be handled by useEffect
  };

  const onBugFilterChange = (skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setBugProjects([]);
      setBugStatus("all");
      setBugDates({ startDate: null, endDate: null });
    } else {
      if (skipParams.includes("skipProject")) setBugProjects([]);
      if (skipParams.includes("skipStatus")) setBugStatus("all");
      if (skipParams.includes("skipDate"))
        setBugDates({ startDate: null, endDate: null });
    }
    if (selectedFilters) {
      setBugProjects(selectedFilters.project || []);
      setBugStatus(selectedFilters.status || "all");
      setBugDates(selectedFilters.dates || { startDate: null, endDate: null });
    }
    // Removed myBugs() call - will be handled by useEffect
  };

  const onTimeFilterChange = (skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setTimeProjects([]);
      setTimeDates({ startDate: null, endDate: null });
    } else {
      if (skipParams.includes("skipProject")) setTimeProjects([]);
      if (skipParams.includes("skipDate"))
        setTimeDates({ startDate: null, endDate: null });
    }
    if (selectedFilters) {
      setTimeProjects(selectedFilters.project || []);
      setTimeDates(selectedFilters.dates || { startDate: null, endDate: null });
    }
    // Removed myLoggedTime() call - will be handled by useEffect
  };

  useEffect(() => {
    getProjectListing();
    getProjectList();
    getLoggedHoursProgress();
    myProjects();
    myTasks();
    myBugs();
    myLoggedTime();

    // Set initial load flag to false after first API calls complete
    setIsInitialLoad(false);
  }, []);

  const hours = totalLoggedProgress?.data2?.total_time
    ? totalLoggedProgress?.data2?.total_time.split(":")[0]
    : "0";
  const loggedPercentageValue = parseFloat(
    totalLoggedProgress?.loggedPercentage
  );

  const getDashboardData = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getDashboardData,
      });

      if (response.data.status == 1) {
        setTotalEmployee(response.data.data.totalEmployees || 0);
      }
    } catch (error) {
      console.log("Error getting unread thread count:", error);
    }
  };

  useEffect(() => {
    getDashboardData();
  }, []);

  const dashboardCards = [
    {
      title: "Total Employee",
      value: totalEmployee,
      icon: <EmployeeIcon />,
      iconBgColor: "rgba(24, 144, 255, 0.1)",
      navigateTo: `/${companySlug}/project-users`,
    },
  ];

  return (
    <div className="main-dashboard-wrapper">
      <div className="container">
        <div className="profileNameAndImg d-flex">
          <div className="image-and-name-div">
            <div className="profile-img">
              <MyAvatar
                userName={fullName}
                alt={fullName}
                src={empImage}
                isThumbnail={false}
              />
            </div>
            <div className="profile-name">
              <h2>
                {timeOfDay}, {firstName} !
              </h2>
            </div>
          </div>

          {roleName == "Admin" ? (
            dashboardCards.map((card, index) => (
              <Col xs={24} sm={12} md={12} lg={8} xl={6} key={index}>
                <Card
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #f0f0f0",
                    borderRadius: "8px",
                    boxShadow:
                      "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
                    minHeight: "100px",
                    cursor: card.navigateTo ? "pointer" : "default",
                  }}
                  bodyStyle={{
                    padding: "20px 24px",
                  }}
                  onClick={() =>
                    card.navigateTo && history.push(card.navigateTo)
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        backgroundColor: card.iconBgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {card.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#595959",
                          marginBottom: "4px",
                          fontWeight: "400",
                          lineHeight: "1.4",
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: "600",
                          color: "#262626",
                          lineHeight: "1.2",
                        }}
                      >
                        {card.value}
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))
          ) : (
            <></>
          )}

          {/* <div className="progress-of-logged-hours-background">
            <div className="logged-hours-icon">{currentMonth}</div>
            <div className="logged-hours-content d-flex">
              <div className="logged-hours-text">
                <div className="logged-hours-title">
                  <p>Monthly Logged Hours</p>
                  <span
                    className={
                      totalLoggedProgress?.behindHours ? "red-alert" : ""
                    }
                  >
                    {hours} Hours / {totalLoggedProgress?.totalWorkingHours}{" "}
                    Hours
                  </span>
                </div>
                <div className="progress-bar-container">
                  <Progress
                    percent={loggedPercentageValue}
                    percentPosition={{ align: "center", type: "inner" }}
                    showInfo={false}
                    strokeColor={
                      totalLoggedProgress?.behindHours ? "#ff0000" : "#28a745"
                    }
                  />
                </div>
              </div>
              {totalLoggedProgress?.behindHours ? (
                <div className="remaining-hours-container">
                  <span>
                    Remaining Hours:{" "}
                    {totalLoggedProgress?.totalBehindHoursTillToday}
                  </span>
                </div>
              ) : (
                ""
              )}
            </div>
          </div> */}
        </div>
        <div className="profile-input-form-wrapper">
          <form action="" className="profile-form-wrapper">
            <div className="profile-input-wrapper">
              <input
                id="meJumpField-inputEl"
                data-ref="inputEl"
                type="text"
                name="meJumpField-inputEl"
                placeholder="Jump to a project"
                onClick={showModal}
                readOnly
              />
            </div>
          </form>
        </div>
        <div className="main-dashboard-box-wrapper d-flex">
          <div className="main-project-wrapper">
            <table className="project-table-wrapper all-dashboard-project">
              <thead>
                <tr>
                  <th>
                    <div className="folder-project-wrpper d-flex">
                      <a href="#">
                        <i className="fa-regular fa-folder"></i>
                      </a>
                      <span>Projects</span>
                    </div>
                  </th>
                  <th>
                    <ProjectFilterComponent
                      onFilterChange={onProjectFilterChange}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {myProj.length > 0 ? (
                  myProj?.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <div className="cell-inner">
                          <span className="projectname">
                            <span
                              onClick={() => handleBookmark(item)}
                              style={{ cursor: "pointer" }}
                            >
                              {item?.isStarred ? (
                                <StarFilled style={{ color: "#ffd200" }} />
                              ) : (
                                <StarOutlined />
                              )}
                            </span>{" "}
                            <Link>
                              <span
                                onClick={() => getProjectMianTask(item?._id)}
                              >
                                {item?.title}
                              </span>
                            </Link>
                          </span>
                          <span className="project-hours-color">
                            <span className="timeago">
                              {calculateTimeDifference(item?.createdAt)}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="grid-cell-inner">
                          <div className="gray">
                            <i>
                              {getDateFormatted(item?.start_date)}
                              <i className="fa-solid fa-arrow-right"></i>{" "}
                              {getDateFormatted(item?.end_date)}
                            </i>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <div className="no-data-found-dashboard">No Data Found</div>
                )}
              </tbody>
            </table>
          </div>
          <div className="main-project-wrapper">
            <table className="project-table-wrapper">
              <thead>
                <tr>
                  <th>
                    <div className="folder-project-wrpper d-flex">
                      <a href="#">
                        <i className="fa-solid fa-list-check"></i>
                      </a>
                      <span>My tasks</span>
                    </div>
                  </th>
                  <th></th>
                  <th>
                    <TaskFilterComponent onFilterChange={onTaskFilterChange} />
                  </th>
                </tr>
                <tr>
                  <th className="table-task-title">
                    <div className="task-title">
                      <p>Title</p>
                    </div>
                  </th>
                  <th>
                    <div className="task-date">
                      <span>Due date</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {myTask.length > 0 ? (
                  myTask?.map((item, index) => (
                    <tr key={index}>
                      <td className="task-description custom-border-right">
                        <div className="taskCheckBox d-flex">
                          <div className="tasktitle">
                            <Link
                              to={`/${companySlug}/project/app/${item?.project?._id}?tab=Tasks&listID=${item?.mainTask?._id}&taskID=${item?._id}`}
                            >
                              {item?.title.charAt(0).toUpperCase() +
                                item?.title.slice(1)}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="custom-border-right" colSpan={2}>
                        <span className="taskdate">
                          {getDateFormatted(item.due_date)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <div className="no-data-found-dashboard">No Data Found</div>
                )}
              </tbody>
            </table>
          </div>
          <div className="main-project-wrapper">
            <table className="project-table-wrapper time-log-wrapper">
              <thead>
                <tr>
                  <th>
                    <Tooltip title="See your logged time data here!">
                      <Link to="my-log-time">
                        <div className="folder-project-wrpper d-flex">
                          <a href="#">
                            <i className="fa-regular fa-clock"></i>
                          </a>
                          <span>My logged time</span>
                        </div>
                      </Link>
                    </Tooltip>
                  </th>
                  <th></th>
                  <th>
                    <TimeFilterComponent onFilterChange={onTimeFilterChange} />
                  </th>
                </tr>
                <tr>
                  <th colSpan={2} className="table-task-title">
                    <div className="task-title">
                      <p>Logged by</p>
                    </div>
                  </th>
                  <th
                    style={{
                      borderRight: "1px solid #a8a8a8",
                      textAlign: "center",
                    }}
                  >
                    <div className="log-time">
                      <p>Logged Date</p>
                    </div>
                  </th>
                  <th>
                    <div className="log-time">
                      <p>Time logged</p>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {myTime.length > 0 ? (
                  myTime?.map((item, index) => (
                    <React.Fragment key={index}>
                      <tr>
                        <td>
                          <Link
                            to={`/${companySlug}/project/app/${item?.project?._id}?tab=Time`}
                          >
                            <span className="project-time-sheet-title">
                              {item.project.title}
                            </span>
                          </Link>
                        </td>
                      </tr>
                      {item?.logged_data?.map((log, i) => (
                        <tr className="clickable-roww" key={i}>
                          <td className="task-description custom-border-right">
                            <div className="taskCheckBox d-flex">
                              <div className="logtime-user-img">
                                <MyAvatar
                                  src={log?.createdBy?.emp_img}
                                  alt={log?.createdBy?.full_name}
                                  userName={log?.createdBy?.full_name}
                                  key={log?.createdBy?._id}
                                />
                                <span className="togtime-username">
                                  {removeTitle(log?.createdBy?.full_name)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td
                            style={{
                              borderRight: "1px solid #a8a8a8",
                              textAlign: "center",
                            }}
                          >
                            {moment(log?.logged_date).format("DD MMM , YY")}
                          </td>
                          <td>
                            <div className="time-log">
                              <p>
                                {log?.logged_hours}h {log?.logged_minutes}m
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <div className="no-data-found-dashboard">No Data Found</div>
                )}
              </tbody>
            </table>
          </div>
          <div className="main-project-wrapper">
            <table className="project-table-wrapper">
              <thead>
                <tr>
                  <th>
                    <div className="folder-project-wrpper d-flex">
                      <a href="#">
                        <i className="fa-solid fa-list-check"></i>
                      </a>
                      <span>Bugs</span>
                    </div>
                  </th>
                  <th></th>
                  <th>
                    <BugFilterComponent onFilterChange={onBugFilterChange} />
                  </th>
                </tr>
                <tr>
                  <th className="table-task-title">
                    <div className="task-title">
                      <p>Title</p>
                    </div>
                  </th>
                  <th>
                    <div className="task-date">
                      <span>Due date</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {myBug?.length > 0 ? (
                  myBug?.map((item) => (
                    <tr>
                      <td className="task-description custom-border-right">
                        <div className="taskCheckBox d-flex">
                          <div className="tasktitle">
                            <Link
                              to={`/${companySlug}/project/app/${item?.project?._id}?tab=Bugs&bugID=${item?._id}`}
                            >
                              <span>
                                {item?.title.charAt(0).toUpperCase() +
                                  item?.title.slice(1)}
                              </span>
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="custom-border-right" colSpan={2}>
                        <span className="taskdate">
                          {getDateFormatted(item?.due_date)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <div className="no-data-found-dashboard">No Data Found</div>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ProjectListModal
        projectDetails={projectDetails}
        recentList={recentList}
        isModalOpen={isModalOpen}
        handleCancel={handleCancel}
        addVisitedData={addVisitedData}
        setIsModalOpen={setIsModalOpen}
        form={form}
        getProjectListing={getProjectListing}
      />
    </div>
  );
};

export default Dashboard;
