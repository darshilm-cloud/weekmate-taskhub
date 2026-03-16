/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, eqeqeq, no-eval, array-callback-return */
import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  message,
  Menu,
  DatePicker,
  Upload,
  Input,
  Form,
  Select,
  Tooltip,
} from "antd";
import {
  CalendarOutlined,
  PlusOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions/Auth";
import { useDispatch, useSelector } from "react-redux";
import "./style.css";
import moment from "moment";
import {
  getFolderList,
  getLables,
  getSubscribersList,
} from "../../appRedux/reducers/ApiData";
import exampleCSV from "../../../src/sampleCSV.csv"; // Import the CSV file
import { socketEvents } from "../../settings/socketEventName";
import { useSocketAction } from "../../hooks/useSocketAction";
import useEffectAfterMount from "../../util/useEffectAfterMount";
import MyAvatar from "../../components/Avatar/MyAvatar";
import { removeTitle } from "../../util/nameFilter";
import setCookie from "../../hooks/setCookie";
import getCookie from "../../hooks/getCookie";

const BugsController = () => {

  const importRef = useRef(null);
  const { emitEvent } = useSocketAction();
  const {
    foldersList,
    projectLabels,
    projectWorkflowStage,
    subscribersList,
  } = useSelector((state) => state.apiData);

  const { Option } = Select;
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const [addform] = Form.useForm();
  const [editform] = Form.useForm();
  const [listForm] = Form.useForm();
  const searchRef = useRef();
  const attachmentfileRef = useRef();
  const Search = Input.Search;
  const { Dragger } = Upload;



  const [selectedView, setSelectedView] = useState('board');
  const [pageLoading, setPageLoading] = useState(true);
  const [isPopoverVisibleTableView, setIsPopoverVisibleTableView] =
    useState(false);
  const [tableTrue, setTableTrue] = useState(false);
  const [isModalOpenList, setIsModalOpenList] = useState(false);
  const [isModalOpenTaskModal, setIsModalOpenTaskModal] = useState(false);
  const [isModalOpenImport, setIsModalOpenImport] = useState(false);
  const [boardTasksBugs, setBoardTasksBugs] = useState([]);
  const [selectedTask, setSelectedTask] = useState({});
  const [addInputTaskData, setAddInputTaskData] = useState({});
  const [isAlterEstimatedTime, setIsAlterEstimatedTime] = useState(false);
  const [estHrs, setEstHrs] = useState("");
  const [estMins, setEstMins] = useState("");
  const [estTime, setEstTime] = useState("");
  const [fileAttachment, setFileAttachment] = useState([]);
  const [modalMode, setModalMode] = useState("add");
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [openStatus, setOpenStatus] = useState(false);
  const [openAssignees, setOpenAssignees] = useState(false);
  const [openLabels, setOpenLabels] = useState(false);
  const [selectValStartdate, setSelectValStartdate] = useState(false);
  const [selectValDuedate, setSelectValDuedate] = useState(false);
  const [isPopoverVisibleView, setIsPopoverVisibleView] = useState(false);
  const [workflow, setWorkflow] = useState([]);
  const [selectedsassignees, setSelectedsassignees] = useState([]);
  const [editTaskData, setEditTaskData] = useState({});
  const [editList, setEditList] = useState({});
  const [showSelectTask, setShowSelectTask] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterStartDateRange, setFilterStartDateRange] = useState(["", ""]);
  const [filterDueDateRange, setFilterDueDateRange] = useState(["", ""]);
  const [filterDueDate, setFilterDueDate] = useState("");
  const [filterSchema, setFilterSchema] = useState({
    bugs: {},
  });
  const [filterStatusSearchInput, setFilterStatusSearchInput] = useState("");
  const [filterAssignedSearchInput, setFilterAssignedSearchInput] =
    useState("");
  const [filterAssigned, setFilterAssigned] = useState([]);
  const [filterOnLabels, setFilterOnLabels] = useState("");
  const [filterLabelsSearchInput, setFilterLabelsSearchInput] = useState("");
  const [taskList, setTaskList] = useState([]);
  const [isRepeated, setIsRepeated] = useState(false);
  //UseState to store exist data:
  const [newFilteredAssignees, setNewFilteredAssignees] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editorData, setEditorData] = useState("");
  const [editModalDescription, seteditModalDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [html, setHtml] = useState([]);
  const [estHrsError, setEstHrsError] = useState("");
  const [estMinsError, setEstMinsError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const handleChangeTableView = (view) => {
    setSelectedView(view);
    setCookie('view_bugs', JSON.stringify(view), { expires: 365 });
    if (view === "table") {
      setTableTrue(true);
    } else {
      setTableTrue(false);      
    }
  };

  useEffect(() => {
    const savedView = getCookie('view_bugs');
    if (savedView) {
      const parsedView = JSON.parse(savedView);
      setSelectedView(parsedView);
      setTableTrue(parsedView === 'table');
    }
  }, []);

  const handleSearch = (searchValue) => {
    setSearchKeyword(searchValue);
  };

  const handleSelectedItemsChange = (selectedItemIds) => {
    // This ensures that we keep track of selected items by their full details, not just ID
    setSelectedItems(
      subscribersList.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const handleChangeData = (event, editor) => {
    const data = editor.getData();
    setEditorData(data);
    addform.setFieldValue("descriptions", data);
  };

  const handleChnageDescription = (event, editor) => {
    const data = editor.getData();
    seteditModalDescription(data);
  };

  const handlePaste = (event, editor) => {
    const pastedData = (event.clipboardData || window.clipboardData).getData(
      "text"
    );
    const newData = pastedData.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank">$1</a>'
    );
    editor.setData(newData);
  };

  const handlePasteData = (event, editor) => {
    const pastedData = (event.clipboardData || window.clipboardData).getData(
      "text"
    );
    const newData = pastedData.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank">$1</a>'
    );
    editor.setData(newData);
  };

  function removeHTMLTags(inputText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(inputText, "text/html");
    return doc.body.textContent || "";
  }

  const handleFilterStatus = (e) => {
    const status = e.target.value;
    const checked = e.target.checked;
    if (status && checked) {
      setFilterStatus(status);
    } else {
      setFilterStatus("");
    }
  };

  const onChange = (e) => {
    setIsRepeated(e.target.checked);
  };

  const getBoardTasks = async () => {
    try {
      const reqBody = {
        project_id: projectId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getBug,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setBoardTasksBugs([]);
        setBoardTasksBugs(response.data.data);
        handleCancelList();
        setOpenStatus(false);
        setOpenAssignees(false);
        setIsPopoverVisibleView(false);
        setOpenLabels(false);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setPageLoading(false);
    }
  };

  const deleteTasks = async (id) => {
    dispatch(showAuthLoader());
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteBugs}/${id}`,
      });
      if (response?.data && response?.data?.status) {
        message.success(response.data.message);
        getBoardTasks();
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const getTaskByIdDetails = async () => {
    try {
      const reqBody = {
        project_id: projectId,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getBugDetails,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        console.log("");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const importCsvFile = async (file) => {
    try {
      const data = new FormData();
      data.append("attachment", file);
      data.append("project_id", projectId);
      const options = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.importCsvBug,
        body: data,
        options,
      });

      if (response?.data && response?.data?.statusCode === 201) {
        message.success(response.data.message);
        getBoardTasks();
      } else if (response.status === 210) {
        message.error(
          "Oops! It seems some data is missing. Please check the downaloded file."
        );
        const csvData = response?.data?.data
          .map((row) => Object.values(row).join(","))
          .join("\n");

        // Create a blob and set its MIME type as CSV
        const blob = new Blob([csvData], { type: "text/csv" });

        // Create an anchor link and trigger a download
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "Incomplete_data_Import.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        getBoardTasks();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const exportSampleCSVfile = () => {
    const link = document.createElement("a");
    link.setAttribute("href", exampleCSV);
    link.setAttribute("download", "sampleCSV.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onSearchTask = (value) => {
    setSearchText(value);
    setFilterSchema({
      ...filterSchema,
      bugs: { ...filterSchema.bugs, title: value },
    });
    getBoardTasks();
  };

  useEffect(() => {
    getTaskDetails();
    dispatch(getLables());
    dispatch(getFolderList(projectId));
    dispatch(getSubscribersList(projectId));
    exportCsv();
  }, []);

  const handleTaskInput = (name, value) => {
    setAddInputTaskData({ ...addInputTaskData, [name]: value });
  };
  const getTaskDetails = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getMainTask + `/${projectId}`,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setTaskList(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const uploadFiles = async (files, type) => {
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("document", file);
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileUpload}?file_for=${type}`,
        body: formData,
        options: {
          "content-type": "multipart/form-data",
        },
      });
      return response?.data?.data;
    } catch (error) {
      console.log(error);
    }
  };

  const handleCancelTaskModal = () => {
    setIsModalOpenTaskModal(false);
    setShowSelectTask(false);
    setSelectedsassignees([]);
    setSelectedItems([]);
    setEditorData("");
    setShowEditor(false);
    setAddInputTaskData({});
    setEstHrs("");
    setEstMins("");
    setEstTime("");
    setIsAlterEstimatedTime(false);
    setFileAttachment([]);
    setIsEditTaskModalOpen(false);
    addform.resetFields();
    editform.resetFields();
  };

  const handleTaskOps = async (values, updateType) => {

    if (fileAttachment.length > 0) {
      const uploadedfile = await uploadFiles(fileAttachment, "task");
      if (uploadedfile.length > 0) {
        updateType
          ? updateTasks(values, uploadedfile)
          : addTasks(values, uploadedfile);
        return;
      } else {
        return message.error("File not uploaded something went wrong");
      }
    }
    updateType ? updateTasks(values) : addTasks(values);
  };

  const addTasks = async (values, uploadedFiles) => {

    dispatch(showAuthLoader());
    try {
      let reqBody = {
        project_id: projectId,
        task_id: values?.task_id,
        title: values.title,
        status: "active",
        descriptions: editorData,
        bug_labels: addInputTaskData.labels,
        start_date: addInputTaskData.start_date,
        due_date: addInputTaskData.end_date,
        assignees: selectedItems.map((item) => item._id),
        bug_status: val,
        estimated_hours: estHrs && estHrs != "" ? estHrs : "00",
        estimated_minutes: estMins && estMins != "" ? estMins : "00",
        progress: "0",
        isRepeated: isRepeated,
      };

      if (uploadedFiles) {
        reqBody = {
          ...reqBody,
          attachments: uploadedFiles,
          folder_id: values.folder,
        };
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addBug,
        body: reqBody,
      });

      if (response?.data && response?.data?.data && response?.data?.status) {
        //Send Notification to assign Users:
        await emitEvent(socketEvents.ADD_BUG_ASSIGNEE, response.data.data);

        getBoardTasks();
        handleCancelTaskModal();
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const updateTasks = async (values, uploadedFiles) => {
    dispatch(showAuthLoader());
    try {
      let reqBody = {
        updated_key: [
          "title",
          "status",
          "descriptions",
          "bug_labels",
          "start_date",
          "due_date",
          "assignees",
          "estimated_hours",
          "estimated_minutes",
          "progress",
          "attachments",
          "bug_status",
          "task",
        ],
        project_id: projectId,
        title: values.title,
        task_id: addInputTaskData.task_id
          ? addInputTaskData.task_id
          : values?.task_id,
        status: "active",
        descriptions: editModalDescription,
        bug_labels: addInputTaskData.labels,
        assignees: selectedItems.map((item) => item._id),
        bug_status: editTaskData.workflow_id,
        estimated_hours: estHrs,
        estimated_minutes: estMins,
        progress: "0",
        isRepeated: isRepeated,
      };
      if (addInputTaskData.start_date) {
        reqBody.start_date = addInputTaskData.start_date;
      }
      if (addInputTaskData.end_date) {
        reqBody.due_date = addInputTaskData.end_date;
      }
      if (uploadedFiles) {
        reqBody = {
          ...reqBody,
          attachments: uploadedFiles,
          folder_id: values.folder,
        };
      }
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.editBugTask}/${editTaskData.id}`,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        getBoardTasks(selectedTask._id);

        let filterAssignees = selectedItems
          .map((item) => item._id)
          .filter((id) => !newFilteredAssignees.some((user) => user === id));        

        await emitEvent(socketEvents.EDIT_BUG_ASSIGNEE, {
          _id: editTaskData.id,
          assignees: filterAssignees,
        });
        exportCsv();
        handleCancelTaskModal();
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const handleOkList = () => {
    setIsModalOpenList(false);
  };

  const handleCancelList = () => {
    setIsModalOpenList(false);
    setSelectedsassignees([]);
    listForm.resetFields();
  };

  const handleImportClose = () => {
    setIsModalOpenImport(false);
  };

  const showModalTaskModal = () => {
    setIsModalOpenTaskModal(true);
    getFolderList(projectId);
    setIsModalOpenTaskModal(true);
  };

  const props = {
    name: "file",
    multiple: true,
    action: "https://www.mocky.io/v2/5cc8019d300000980a055e76",
    onChange(info) {
      const { status } = info.file;
      if (status !== "uploading") {
        console.log(info.file, info.fileList);
      }
      if (status === "done") {
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (status === "error") {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
    onDrop(e) {
      console.log("Dropped files", e.dataTransfer.files);
    },
  };

  const workflowMenu = (
    <Menu>
      <Menu.Item>
        {" "}
        <PlusOutlined /> Add WorkFlow{" "}
      </Menu.Item>
    </Menu>
  );

  const handleOpenChangeStatus = (newOpen) => {
    setOpenStatus(newOpen);
  };

  const handleOpenChangeAssignees = (newOpen) => {
    setOpenAssignees(newOpen);
  };
  const handleChangeLabels = (newOpen) => {
    setOpenLabels(newOpen);
  };

  const handleStartChange = (value) => {
    if (value === "Custom") {
      setSelectValStartdate(true);
    } else {
      setSelectValStartdate(false);
      if (value.includes("[")) {
        setFilterStartDate(eval(value));
        return;
      }
      setFilterStartDate(value);
    }
  };

  const handleDueChange = (value) => {
    if (value === "Custom") {
      setSelectValDuedate(true);
    } else {
      setSelectValDuedate(false);
      if (value.includes("[")) {
        setFilterDueDate(eval(value));
        return;
      }
      setFilterDueDate(value);
    }
  };

  const DateOption = [
    {
      key: "1",
      value: "",
      label: "Any",
    },
    {
      key: "2",
      value: moment().format("YYYY-MM-DD"),
      label: "Today",
    },
    {
      key: "3",
      value: `[
        "${moment().startOf("week").format("YYYY-MM-DD")}",
        "${moment().endOf("week").format("YYYY-MM-DD")}"
      ]`,
      label: "This week",
    },
    {
      key: "4",
      value: `[
        "${moment().startOf("month").format("YYYY-MM-DD")}", 
        "${moment().endOf("month").format("YYYY-MM-DD")}", 
      ]`,
      label: "This month",
    },
    {
      key: "5",
      value: moment().subtract(1, "day").format("YYYY-MM-DD"),
      label: "Yesterday",
    },
    {
      key: "6",
      value: `[
        "${moment().subtract(1, "week").startOf("week").format("YYYY-MM-DD")}",
       "${moment().subtract(1, "week").endOf("week").format("YYYY-MM-DD")}"
      ]`,
      label: "Last week",
    },
    {
      key: "7",
      value: `[
       "${moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD")}",
        "${moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD")}"
      ]`,
      label: "Last month",
    },
    {
      key: "8",
      value: "next7days",
      label: "Next 7 days",
    },
    {
      key: "9",
      value: "next30days",
      label: "Next 30 days",
    },
    {
      key: "10",
      value: null,
      label: "No date",
    },
    {
      key: "11",
      value: "Custom",
      label: "Custom",
    },
  ];

  function validateArray(arr) {
    return arr.every((item) => typeof item === "string" && item.trim() !== "");
  }

  const handleStartDueFilter = (startDate, dueDate) => {
    if (Array.isArray(startDate)) {
      if (startDate.length < 2 && validateArray(startDate)) {
        return message.error("please select both Dates");
      }
    }
    if (Array.isArray(dueDate) && validateArray(dueDate)) {
      if (dueDate.length < 2) {
        return message.error("please select both Dates");
      }
    }
    setFilterSchema({
      ...filterSchema,
      bugs: { ...filterSchema.bugs, startDate, dueDate },
    });
    getBoardTasks();
    setIsPopoverVisibleView(false);
  };

  const handleStartDateRange = (position, value) => {
    filterStartDateRange.splice(position, 1, value);
    setFilterStartDateRange([...filterStartDateRange]);
    setFilterStartDate([...filterStartDateRange]);
  };

  const handleDueDateRange = (position, value) => {
    filterDueDateRange?.splice(position, 1, value);
    setFilterDueDateRange([...filterDueDateRange]);
    setFilterDueDate([...filterDueDateRange]);
  };

  const StartDueContent = (
    <div className="right-popover-wrapper popover-task">
      <Form.Item label="Start Date">
        <Select
          defaultValue="Any"
          onChange={handleStartChange}
          options={DateOption}
        ></Select>
        {selectValStartdate && (
          <div className="calender-event-block">
            <Form.Item>
              <DatePicker
                onChange={(_, dateString) =>
                  handleStartDateRange(0, dateString)
                }
              >
                <CalendarOutlined />
              </DatePicker>
            </Form.Item>
            to
            <Form.Item>
              <DatePicker
                onChange={(_, dateString) =>
                  handleStartDateRange(1, dateString)
                }
              >
                <CalendarOutlined />
              </DatePicker>
            </Form.Item>
          </div>
        )}
      </Form.Item>

      <Form.Item label="Due Date">
        <Select
          defaultValue="Any"
          onChange={handleDueChange}
          options={DateOption}
        ></Select>
        {selectValDuedate && (
          <div className="calender-event-block">
            <Form.Item>
              <DatePicker
                onChange={(_, dateString) => handleDueDateRange(0, dateString)}
              >
                <CalendarOutlined />
              </DatePicker>
            </Form.Item>
            to
            <Form.Item>
              <DatePicker
                onChange={(_, dateString) => handleDueDateRange(0, dateString)}
              >
                <CalendarOutlined />
              </DatePicker>
            </Form.Item>
          </div>
        )}
      </Form.Item>
      <div className="popver-footer-btn">
        <Button
          onClick={() => {
            handleStartDueFilter(filterStartDate, filterDueDate);
          }}
          type="primary"
          className="square-primary-btn ant-btn-primary"
        >
          Apply
        </Button>
        <Button
          type="outlined"
          onClick={() => {
            setIsPopoverVisibleView(false);
            setSelectValDuedate(false);
          }}
          className="square-outline-btn ant-delete"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const handleButtonTask = () => {
    setShowSelectTask(true);
  };

  const handlerAssignes = (val) => {
    setSelectedsassignees(val);
  };

  // get associate workflow
  const getWorkflow = async () => {
    try {
      const reqBody = {
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getworkflow,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setWorkflow(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // add projectmaintask
  const addProjectMainTask = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        title: values.title,
        project_id: projectId,
        workflow_id: values.workflow_id,
        task_status: values.task_status,
        subscribers: selectedsassignees,
        status: "active",
        isPrivateList: values.isPrivateList,
        isDisplayInGantt: false,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectMainTask,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        // getProjectMianTask();
        handleCancelList();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const editProjectmainTask = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        title: values.title,
        project_id: projectId,
        workflow_id: editList.workflows._id,
        subscribers: selectedsassignees,
        status: "active",
        isPrivateList: values.isPrivateList,
        isDisplayInGantt: false,
      };
      const params = `/${editList._id}`;

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateProjectmainTask + params,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setIsModalOpenList(false);
        // getProjectMianTask();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEstTimeInput = (name, value) => {
    if (name === "est_hrs") {
      setEstHrs(value);
      const hrs = parseInt(value);
      if (hrs < 0) {
        setEstHrsError("Time should be greater than or equal to 0");
      } else {
        setEstHrsError("");
      }
      if (hrs === 0 && parseInt(estMins) === 0) {
        setEstHrsError("Enter a non-zero value for hours");
        setEstMinsError("Enter a non-zero value for minutes");
      }
    }
    if (name === "est_mins") {
      setEstMins(value);
      const mins = parseInt(value);
      if (mins < 0 || mins > 59) {
        setEstMinsError("Minutes should be between 0 and 59");
      } else {
        setEstMinsError("");
      }
      if (mins === 0 && parseInt(estHrs) === 0) {
        setEstMinsError("Enter a non-zero value for minutes");
        setEstHrsError("Enter a non-zero value for hours");
      }
    }
    setEstHrsError("");
    setEstMinsError("");
  };

  const handleSetEstTime = () => {
    if ((estHrs == "" && estMins == "") || (estHrs == 0 && estMins == 0)) {
      return message.error("Enter estimated time");
    }
    if (estHrs < 0 || estMins < 0) {
      return message.error("Time should be greater than 0");
    }
    setEstTime(`${estHrs || "00"}:${estMins || "00"}`);
    setIsAlterEstimatedTime(false);
  };

  const removeEstTIme = () => {
    setEstTime("");
    setEstHrs("00");
    setEstMins("00");
  };

  const onFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const newFiles = [];
    selectedFiles.forEach((file) => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB <= 20) {
        newFiles.push(file);
      } else {
        message.error(`File '${file.name}' exceeds the 20MB file size limit.`);
      }
    });
    setFileAttachment([...fileAttachment, ...newFiles]);
  };

  const removeAttachmentFile = (index) => {
    const newArr = fileAttachment.filter((_, i) => i !== index);
    setFileAttachment(newArr);
  };

  const showEditTaskModal = (data, workflowID) => {
    try {
      setIsEditTaskModalOpen(true);
      setEditTaskData({ id: data._id, workflow_id: workflowID });      
      seteditModalDescription(data.descriptions);
      editform.setFieldsValue({
        title: data.title,
        descriptions: removeHTMLTags(
          data.descriptions ? data.descriptions : ""
        ),
        task_id: data?.task?._id,
        isrepeated: data?.isRepeated,
      });
      setAddInputTaskData({
        start_date: data.start_date,
        end_date: data.due_date,
        labels: data.bug_labels.map((value) => value._id).join(","),
        assignees: data.assignees.map((value) => value._id),
        title: data.title,
        descriptions: data.descriptions,
      });
      setSelectedItems(data.assignees);
      setEstHrs(data.estimated_hours);
      setEstMins(data.estimated_minutes);
      setEstTime(`${data.estimated_hours}:${data.estimated_minutes}`);
      setIsAlterEstimatedTime(false);
      //Set assignnes in new state for filter data notification:
      setNewFilteredAssignees(data.assignees.map((value) => value._id));
      if (data.assignees.length > 0) {
        setShowSelectTask(true);
      } else {
        setShowSelectTask(false);
      }
    } catch (error) {
      console.log(error, "error_edit_modal");
    }
  };

  const filterTasks = (data, filters) => {
    console.log("🚀 ~ filterTasks ~ data:", data, "======", filters);

    return data.map((project) => {
      let matchedProject = false;

      if (filters.StatusId || filters.StatusId === "") {
        matchedProject = project.bug_status === filters.StatusId;
      } else {
        matchedProject = true;
      }

      if (matchedProject && filters.bugs) {
        project.bugs = project.bugs.filter((bug) => {
          let matchedTask = true;

          if (filters.Status || filters.Status === "") {
            matchedTask = bug.bug_status === filters.Status;
          }

          if (matchedTask && filters.bugs.assigneeIds === "unassigned") {
            matchedTask = bug.assignees.length === 0;
          } else if (
            matchedTask &&
            filters.bugs.assigneeIds &&
            filters.bugs.assigneeIds.length > 0
          ) {
            matchedTask = bug.assignees.some((assignee) =>
              filters.bugs.assigneeIds.includes(assignee._id)
            );
          }

          if (matchedTask && filters.bugs.startDate) {
            let bugStartDate = moment(bug.start_date).format("YYYY-MM-DD");
            if (filters.bugs.startDate === "next7days") {
              matchedTask = moment(bugStartDate).isBetween(
                moment(),
                moment().add(7, "days"),
                null,
                "[]"
              );
            } else if (filters.bugs.startDate === "next30days") {
              matchedTask = moment(bugStartDate).isBetween(
                moment(),
                moment().add(30, "days"),
                null,
                "[]"
              );
            } else if (Array.isArray(filters.bugs.startDate)) {
              matchedTask = moment(bugStartDate).isBetween(
                moment(filters.bugs.startDate[0]),
                moment(filters.bugs.startDate[1]),
                null,
                "[]"
              );
            } else {             
              matchedTask = moment(bug.start_date).isSame(
                moment(filters.bugs.startDate)
              );
            }
          } else if (filters.bugs.startDate === null) {
            matchedTask = bug.start_date === null;
          }

          if (matchedTask && filters.bugs.dueDate) {
            if (filters.bugs.dueDate === "next7days") {
              matchedTask = moment(bug.due_date).isBetween(
                moment(),
                moment().add(7, "days"),
                null,
                "[]"
              );
            } else if (filters.bugs.dueDate === "next30days") {
              matchedTask = moment(bug.due_date).isBetween(
                moment(),
                moment().add(30, "days"),
                null,
                "[]"
              );
            } else if (Array.isArray(filters.bugs.dueDate)) {
              matchedTask = moment(bug.due_date).isBetween(
                moment(filters.bugs.dueDate[0]),
                moment(filters.bugs.dueDate[1]),
                null,
                "[]"
              );
            } else {
              matchedTask = moment(bug.due_date).isSame(
                moment(filters.bugs.dueDate)
              );
            }
          } else if (filters.bugs.dueDate === null) {
            matchedTask = bug.due_date === null;
          }

          if (matchedTask && filters.bugs.labelIds === "unlabelled") {
            matchedTask = bug.bug_labels.length === 0;
          } else if (
            matchedTask &&
            filters.bugs.labelIds &&
            filters.bugs.labelIds.length > 0
          ) {
            matchedTask = bug.bug_labels.some((label) =>
              filters.bugs.labelIds.includes(label._id)
            );
          }

          if (matchedTask && filters.bugs.title && filters.bugs.title !== "") {
            console.log("here");
            matchedTask = bug.title
              .toLowerCase()
              .includes(filters.bugs.title.toLowerCase());
          }

          return matchedTask;
        });
        matchedProject = project.bugs.length > 0;
      }

      if (!matchedProject) {
        return { ...project, bugs: [] };
      }
      return project;
    });
  };

  useEffectAfterMount(() => {
    getBoardTasks();
  }, [searchText, projectId]);

  useEffectAfterMount(() => {
    exportCsv();
  }, []);

  let val = "";

  const giveworkflowId = () => {
    boardTasksBugs.map((item) => {
      val = item.title === "To Do" ? item._id : boardTasksBugs[0]._id;
    });
  };

  giveworkflowId();

  useEffect(() => {
    getBoardTasks();
  }, []);
  
  const handleAllFilter = (property, value) => {
    if (property == "Status") {
      setFilterSchema({ ...filterSchema, [property]: value });
      if (value == "") {
        setFilterSchema({ bugs: { ...filterSchema.bugs } });
      }
    } else {
      setFilterSchema({
        ...filterSchema,
        bugs: { ...filterSchema.bugs, [property]: value },
      });
    }
    getBoardTasks();
    setFilterLabelsSearchInput("");
    setFilterStatusSearchInput("");
    setFilterAssignedSearchInput("");
    setOpenStatus(false);
    setOpenAssignees(false);
    setOpenLabels(false);
  };

  const getStatusTitleById = (id) => {
    const item = boardTasksBugs.find((item) => item?._id === id);
    return item ? item?.title : "Not found";
  };

  const handleSelectionAssignedFilter = (value, removeAll) => {
    if (removeAll) {
      return setFilterAssigned([]);
    }
    if (value == "unassigned") {
      return setFilterAssigned("unassigned");
    }
    setFilterAssigned((prevFilterAssigned) =>
      prevFilterAssigned.includes(value)
        ? prevFilterAssigned.filter((item) => item !== value)
        : [...prevFilterAssigned, value]
    );
  };

  const handleSelectionlabelFilter = (value, removeAll) => {
    if (removeAll) {
      return setFilterOnLabels([]);
    }
    if (value == "unlabelled") {
      return setFilterOnLabels("unlabelled");
    }
    setFilterOnLabels((prevfilterOnLabels) =>
      prevfilterOnLabels.includes(value)
        ? prevfilterOnLabels.filter((item) => item !== value)
        : [...prevfilterOnLabels, value]
    );
  };

  const tagRender = (props) => {
    const { label, value, closable, onClose } = props;
    const item = subscribersList.find((item) => item._id === value);

    return (
      <>
        <Tooltip placement="top" title={removeTitle(item?.full_name)}>
          <MyAvatar
            userName={item?.full_name}
            alt={item?.full_name}
            src={item.emp_img}
          />
        </Tooltip>
        <span
          onClick={onClose}
          style={{
            cursor: "pointer",
            position: "relative",
            top: "-10px",
            left: "-6px",
            width: "5px",
            hight: "5px",
          }}
        >
          {closable && <CloseCircleOutlined />}
        </span>
      </>
    );
  };

  const exportCsv = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.exportCsvOfRepeatedBug + "/" + projectId,
      });

      if (response?.data && response?.data?.statusCode === 200) {
        setHtml(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return {
    Search,
    searchRef,
    onSearchTask,
    filterStatus,
    handleFilterStatus,
    filterStatusSearchInput,
    setFilterStatusSearchInput,
    boardTasksBugs,
    setOpenStatus,
    openStatus,
    handleOpenChangeStatus,
    getStatusTitleById,
    filterAssigned,
    handleSelectionAssignedFilter,
    filterAssignedSearchInput,
    setFilterAssignedSearchInput,
    handleAllFilter,
    setOpenAssignees,
    openAssignees,
    handleOpenChangeAssignees,
    setIsPopoverVisibleView,
    isPopoverVisibleView,
    handleStartChange,
    DateOption,
    selectValStartdate,
    handleStartDateRange,
    handleDueChange,
    selectValDuedate,
    handleDueDateRange,
    handleStartDueFilter,
    filterStartDate,
    filterDueDate,
    setSelectValDuedate,
    filterOnLabels,
    handleSelectionlabelFilter,
    filterLabelsSearchInput,
    setFilterLabelsSearchInput,
    projectLabels,
    handleChangeLabels,
    filterTasks,
    filterSchema,
    showEditTaskModal,
    showModalTaskModal,
    getBoardTasks,
    selectedTask,
    deleteTasks,
    isModalOpenImport,
    handleImportClose,
    Dragger,
    props,
    workflowMenu,
    isModalOpenList,
    handleCancelList,
    handleOkList,
    modalMode,
    listForm,
    addProjectMainTask,
    editProjectmainTask,
    addform,
    handleTaskOps,
    addInputTaskData,
    handleTaskInput,
    taskList,
    Option,
    showSelectTask,
    handleButtonTask,
    subscribersList,
    isAlterEstimatedTime,
    estHrs,
    handleEstTimeInput,
    estMins,
    handleSetEstTime,
    estTime,
    removeEstTIme,
    fileAttachment,
    removeAttachmentFile,
    foldersList,
    attachmentfileRef,
    onFileChange,
    editform,
    setOpenLabels,
    openLabels,
    getWorkflow,
    workflow,
    handlerAssignes,
    projectWorkflowStage,
    isModalOpenTaskModal,
    handleCancelTaskModal,
    setIsAlterEstimatedTime,
    selectedsassignees,
    dispatch,
    setSelectedsassignees,
    isEditTaskModalOpen,
    importCsvFile,
    importRef,
    exportSampleCSVfile,
    getTaskByIdDetails,
    onChange,
    showEditor,
    setShowEditor,
    editorData,
    setEditorData,
    removeHTMLTags,
    handleChangeData,
    handlePaste,
    handlePasteData,
    editModalDescription,
    seteditModalDescription,
    handleChnageDescription,
    selectedItems,
    setSelectedItems,
    handleSelectedItemsChange,
    tagRender,
    html,
    searchKeyword,
    setSearchKeyword,
    handleSearch,
    estHrsError,
    estMinsError,
    projectId,
    setTableTrue,
    tableTrue,
    handleChangeTableView,
    isPopoverVisibleTableView,
    setIsPopoverVisibleTableView,
    selectedView,setSelectedView,
    setFilterSchema,
    pageLoading,
  };
};

export default BugsController;
