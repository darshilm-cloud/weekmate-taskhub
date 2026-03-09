import React, { useEffect, useState } from "react";
import { Checkbox, Input } from "antd";
import { useParams, useHistory } from "react-router-dom";
import { getOverviewProjectByID } from "../../appRedux/reducers/ApiData";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";

const OverviewController = () => {
  const companySlug = localStorage.getItem("companyDomain");

  const dispatch = useDispatch();
  const history = useHistory();
  const { projectId } = useParams();
  const Search = Input.Search;

  const [isModalOpenUser, setIsModalOpenUser] = useState(false);
  const [isPopoverVisibleActive, setIsPopoverVisibleActive] = useState(false);
  const [filterAssigneeSearchInput, setFilterAssigneeSearchInput] =
    useState("");
  const [filterClientSearchInput, setFilterClientSearchInput] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [allTaskData, setAllTaskData] = useState([]);
  const [myTaskData, setMyTaskData] = useState([]);
  const [taskListData, setTaskList] = useState([]);

  const content1 = (
    <div className="right-popover-wrapper">
      <ul>
        <li>
          <Checkbox>Active</Checkbox>
        </li>
        <li>
          <Checkbox>Archived</Checkbox>
        </li>
        <li>
          <Checkbox>Close</Checkbox>
        </li>
        <li>
          <Checkbox>On Hold</Checkbox>
        </li>
      </ul>
    </div>
  );

  const handleCancelUser = () => {
    setIsModalOpenUser(false);
  };

  const showModalUser = () => {
    setIsModalOpenUser(true);
  };

  const convertTimeToHours = (timeString) => {
    if (!timeString) return 0;
    var timeArray = timeString.split(":");
    var hours = parseInt(timeArray[0]);
    var minutes = parseInt(timeArray[1]);
    var fractionOfHour = minutes / 60;
    var totalHours = hours + fractionOfHour;
    return totalHours;
  };

  const getDatesArray = (start_date, end_date) => {
    if (!start_date || !end_date) {
      return ["loading"];
    }
    const startDate = moment(start_date).startOf("day");
    const endDate = moment(end_date).endOf("day");

    const datesArray = [];

    while (startDate.isSameOrBefore(endDate)) {
      datesArray.push(startDate.valueOf());
      startDate.add(1, "day");
    }

    return datesArray;
  };

  const generateChartData = (start_date, end_date, tasks_summary) => {
    if ((!start_date, !end_date, !tasks_summary)) return 0;

    const startDate = moment(start_date).startOf("day");
    let endDate = moment(end_date).endOf("day");
    const today = moment().endOf("day");

    if (endDate.isAfter(today)) {
      endDate = today;
    }

    let currentDate = moment(startDate);
    let previousY = 0;
    const result = [];

    while (currentDate <= endDate) {
      const dateString = currentDate.format("YYYY-MM-DD");
      const summary = tasks_summary.find(
        (summary) => summary.date === dateString
      );

      if (summary) {
        const completionPercentage =
          (summary.total_done_task / summary.total_task) * 100;
        previousY = completionPercentage;
      }

      result.push({
        x: currentDate.valueOf(),
        y: previousY,
      });

      currentDate = currentDate.add(1, "day");
    }

    return result;
  };

  const goToEditProjectPage = () => {
    history.push(`/${companySlug}/project-list/edit/${projectId}`);
  };

  const getAllTasks = async () => {
    dispatch(showAuthLoader());
    try {
      const reqBody = {
        project_id: projectId,
        countFor: "All",
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTaskList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.statusCode == 200) {
        setAllTaskData(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "getAllTasks");
    }
  };

  const getMyTasks = async () => {
    dispatch(showAuthLoader());
    try {
      const reqBody = {
        project_id: projectId,
        countFor: "My",
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTaskList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.statusCode == 200) {
        console.log(response, "response");
        setMyTaskData(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "getMyTasks");
    }
  };

  const getTaskList = async (row, column) => {
    dispatch(showAuthLoader());
    try {
      const reqBody = {
        project_id: projectId,
        countFor: column,
        row: row,
        col: column,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTaskList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.statusCode == 200) {
        setTaskList(response?.data?.data);
      }
    } catch (error) {
      console.log(error, "getTaskList");
    }
  };

  const [allTasks, setAllTasks] = useState([]);
  const [priorityAnalysis, setPriorityAnalysis] = useState({ low: 0, medium: 0, high: 0, total: 0 });
  const [userAnalysis, setUserAnalysis] = useState([]);
  const [statusAnalysis, setStatusAnalysis] = useState({ closed: 0, pending: 0, total: 0 });

  const { projectOverviewData } = useSelector((state) => state.apiData);

  const fetchAllTasks = async () => {
    dispatch(showAuthLoader());
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getTaskDropdown}/${projectId}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.statusCode === 200) {
        const tasks = response.data.data;
        setAllTasks(tasks);
        processTaskData(tasks);
      }
    } catch (error) {
      console.log(error, "fetchAllTasks");
      dispatch(hideAuthLoader());
    }
  };

  const processTaskData = (tasks) => {
    // Priority Analysis
    let low = 0, medium = 0, high = 0;

    // Status Analysis
    let closed = 0, pending = 0;

    // User Analysis
    const userMap = {};

    // Initialize userMap with all project members to ensure they show up even with 0 tasks
    const allMembers = [
      ...(projectOverviewData?.manager ? [projectOverviewData.manager] : []),
      ...(projectOverviewData?.assignees || []),
      ...(projectOverviewData?.pms_clients || [])
    ];

    allMembers.forEach(member => {
      if (member?._id && !userMap[member._id]) {
        userMap[member._id] = {
          name: member.full_name || member.name || `${member.first_name} ${member.last_name}`.trim(),
          closed: 0,
          incomplete: 0
        };
      }
    });

    tasks.forEach(task => {
      // Priority
      const labels = task.taskLabels || [];
      const hasHigh = labels.some(l => {
        const t = l.title?.toLowerCase() || "";
        return t.includes("high priority") || t === "high";
      });
      const hasMedium = labels.some(l => {
        const t = l.title?.toLowerCase() || "";
        return t.includes("medium priority") || t === "medium";
      });
      const hasLow = labels.some(l => {
        const t = l.title?.toLowerCase() || "";
        return t.includes("low priority") || t === "low";
      });

      if (hasHigh) high++;
      else if (hasMedium) medium++;
      else if (hasLow) low++;

      // Status
      const isDone = task.task_status?.title?.toLowerCase() === "done";
      if (isDone) closed++;
      else pending++;

      // User Analysis - aggregate counts for assigned users
      const assignees = task.assignees || [];
      assignees.forEach(user => {
        const userId = user?._id || user; // Handle case where it might be just the ID
        if (userId && userMap[userId]) {
          if (isDone) userMap[userId].closed++;
          else userMap[userId].incomplete++;
        } else if (userId) {
          // If user wasn't in members list, add them (shouldn't really happen but for safety)
          userMap[userId] = {
            name: user.full_name || user.name || "Unknown User",
            closed: isDone ? 1 : 0,
            incomplete: isDone ? 0 : 1
          };
        }
      });
    });

    setPriorityAnalysis({ low, medium, high, total: low + medium + high });
    setStatusAnalysis({ closed, pending, total: closed + pending });
    setUserAnalysis(Object.values(userMap));
  };

  useEffect(() => {
    dispatch(getOverviewProjectByID(projectId));
    getAllTasks();
    getMyTasks();
    fetchAllTasks();
  }, [projectId]);

  useEffect(() => {
    processTaskData(allTasks);
  }, [projectOverviewData, allTasks]);

  return {
    isModalOpenUser,
    handleCancelUser,
    showModalUser,
    Search,
    content1,
    isPopoverVisibleActive,
    setIsPopoverVisibleActive,
    convertTimeToHours,
    getDatesArray,
    generateChartData,
    goToEditProjectPage,
    filterAssigneeSearchInput,
    filterClientSearchInput,
    setFilterAssigneeSearchInput,
    setFilterClientSearchInput,
    setModalVisible,
    isModalVisible,
    setTitle,
    title,
    allTaskData,
    myTaskData,
    getTaskList,
    taskListData,
    priorityAnalysis,
    userAnalysis,
    statusAnalysis,
    allTasks
  };
};

export default OverviewController;
