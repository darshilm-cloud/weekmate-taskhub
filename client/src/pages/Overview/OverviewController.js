import React, { useEffect, useState } from "react";
import { Checkbox, Input } from "antd";
import { useParams, useHistory } from "react-router-dom";
import { getOverviewProjectByID } from "../../appRedux/reducers/ApiData";
import { useDispatch } from "react-redux";
import moment from "moment";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";

const OverviewController = () => {
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
    history.push(`/project-list/edit/${projectId}`);
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

  useEffect(() => {
    dispatch(getOverviewProjectByID(projectId));
    getAllTasks();
    getMyTasks();
  }, [projectId]);

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
  };
};

export default OverviewController;
