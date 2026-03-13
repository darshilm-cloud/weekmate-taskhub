import React, { useEffect, useRef, useState, useCallback } from "react";
import { message, Menu, Input, Form, Select } from "antd";

import { useParams, useLocation, useHistory } from "react-router-dom";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions/Auth";
import { useDispatch, useSelector } from "react-redux";
import "./style.css";
import moment from "moment";
import useEffectAfterMount from "../../util/useEffectAfterMount";
import {
  getFolderList,
  getLables,
  getEmployeeList,
  getSpecificProjectWorkflowStage,
  getSubscribersList,
  getClientList,
} from "../../appRedux/reducers/ApiData";
import { socketEvents } from "../../settings/socketEventName";
import { useSocketAction } from "../../hooks/useSocketAction";
import queryString from "query-string";
import taskCSV from "../../../src/taskCSV.csv";
import { getRoles } from "../../util/hasPermission";
import setCookie from "../../hooks/setCookie";
import getCookie from "../../hooks/getCookie";
import { generateCacheKey } from "../../util/generateCacheKey";
import { moveWorkFlowTaskHandler } from "../../appRedux/actions/Common";
import { hasDraftComment } from "../../cacheDB";

const TasksController = ({ flag }) => {
  const location = useLocation();
  const history = useHistory();

  let { taskID, listID } = queryString.parse(location.search);
  const { emitEvent } = useSocketAction();

  const [selectedView, setSelectedView] = useState("board");
  const [tableTrue, setTableTrue] = useState(false);
  const [isPopoverVisibleTableView, setIsPopoverVisibleTableView] =
    useState(false);

  const [isModalOpenList, setIsModalOpenList] = useState(false);
  const [isModalOpenTaskModal, setIsModalOpenTaskModal] = useState(false);
  const [projectMianTask, setProjectMianTask] = useState([]);
  const [boardTasks, setBoardTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState({});
  const [addInputTaskData, setAddInputTaskData] = useState({});
  const [isAlterEstimatedTime, setIsAlterEstimatedTime] = useState(false);
  const [estHrs, setEstHrs] = useState("");
  const [estMins, setEstMins] = useState("");
  const [estTime, setEstTime] = useState("");
  const [fileAttachment, setFileAttachment] = useState([]);
  const [modalMode, setModalMode] = useState("add");
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isPrivate, setIsprivate] = useState();
  const [sortColumn] = useState("_id");
  const [sortOrder] = useState("des");
  const [filterData] = useState([]);
  const [openStatus, setOpenStatus] = useState(false);
  const [openAssignees, setOpenAssignees] = useState(false);
  const [openLabels, setOpenLabels] = useState(false);
  const [selectValStartdate, setSelectValStartdate] = useState(false);
  const [selectValDuedate, setSelectValDuedate] = useState(false);
  const [isPopoverVisibleView, setIsPopoverVisibleView] = useState(false);
  const [selectedsassignees, setSelectedsassignees] = useState([]);
  const [selectedClient, setSelectdclients] = useState([]);
  const [editTaskData, setEditTaskData] = useState({});
  const [editList, setEditList] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
  });
  const [showSelectTask, setShowSelectTask] = useState(false);
  const [showSelectClient, setShowSelectClient] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterStartDateRange, setFilterStartDateRange] = useState(["", ""]);
  const [filterDueDateRange, setFilterDueDateRange] = useState(["", ""]);
  const [filterDueDate, setFilterDueDate] = useState("");
  const [filterSchema, setFilterSchema] = useState({
    tasks: {},
  });
  const [filterStatusSearchInput, setFilterStatusSearchInput] = useState("");
  const [filterAssignedSearchInput, setFilterAssignedSearchInput] =
    useState("");
  const [filterAssigned, setFilterAssigned] = useState([]);
  const [filterOnLabels, setFilterOnLabels] = useState("");
  const [filterLabelsSearchInput, setFilterLabelsSearchInput] = useState("");
  const [deleteFileData, setDeleteFileData] = useState([]);
  const [populatedFiles, setPopulatedFiles] = useState([]);
  const [stagesId, setStagesId] = useState("");
  const [html, setHtml] = useState([]);
  const importRef = useRef(null);

  //Filter Subscribers & Clients for List Notification:
  const [filteredSubscriber, setFilteredSubscribers] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  //Filter Subscribers & Clients for Task Notification:
  const [newFilteredAssignees, setNewFilteredAssignees] = useState([]);
  const [newFilteredClients, setNewFilteredClients] = useState([]);

  const [showEditor, setShowEditor] = useState(false);

  const [editorData, setEditorData] = useState("");
  const [editModalDescription, seteditModalDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectSubscriber, setSelectSubscribers] = useState([]);
  const [selectedListClient, setSelectedListClient] = useState([]);
  const [estHrsError, setEstHrsError] = useState("");
  const [estMinsError, setEstMinsError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [projectAssignees, setProjectAssignees] = useState([]);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyTaskListData, setCopyTaskListData] = useState({
    title: "",
    project_title: "",
    task_status: true,
    subs_assignee: true,
    clients: true,
    dates: true,
    comments: true,
  });
  const [workflowStatusList, setWorkflowStatusList] = useState([]);
  const [selectedMainTask, setSelectedMainTask] = useState("a");
  const [selectedWorkflowStatus, setSelectedWorkflowStatus] = useState("a");

  useEffect(() => {
    const savedView = getCookie("view_tasks");
    if (savedView) {
      const parsedView = JSON.parse(savedView);
      setSelectedView(parsedView);
      setTableTrue(parsedView === "table");
    }
  }, []);

  const handleSearch = (searchValue) => {
    setSearchKeyword(searchValue);
  };

  const handleChangeTableView = (view) => {
    setSelectedView(view);
    setCookie("view_tasks", JSON.stringify(view), { expires: 365 });
    if (view === "table") {
      setTableTrue(true);
    } else {
      setTableTrue(false);
    }
  };

  const handleFieldChange = (e) => {
    const { name, value, checked, type } = e.target;

    if (type === "checkbox") {
      setCopyTaskListData((prevState) => ({
        ...prevState,
        [name]: checked,
      }));
    } else {
      setCopyTaskListData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  const handleCopyTaskList = async (values) => {
    try {
      const reqBody = {
        title: values.title,
        main_task_id: selectedTask._id,
        project_id: projectId,
        is_assignees_copy: values.subs_assignee || false,
        is_clients_copy: values.clients || false,
        is_dates_copy: values.dates || false,
        is_task_stages_copy: values.task_status || false,
        is_comments_copy: values.comments || false,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.copyTaskList,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        getProjectMianTask();
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleListClientChange = (selectedItemIds) => {
    setSelectedListClient(
      clientsList.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const handleSelectedItemsChange = (selectedItemIds) => {
    setSelectedItems(
      subscribersList.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const handleSelectedClientsChange = (selectedItemIds) => {
    setSelectedClients(
      clientsList.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const handleChangeData = (_, editor) => {
    const data = editor.getData();
    setEditorData(data);
  };

  const handleChnageDescription = useCallback((_, editor) => {
    const data = editor.getData();
    seteditModalDescription(data);
  }, []);

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

  const {
    foldersList,
    projectLabels,
    projectWorkflowStage,
    subscribersList,
    clientsList,
  } = useSelector((state) => state.apiData);

  const { task_ids } = useSelector(({ common }) => common);

  const defaultStageId = projectWorkflowStage.find(
    (item) => item.title === "To-Do" && item?.isDefault === true
  )?._id;

  const { Option } = Select;
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const [addform] = Form.useForm();
  const [editform] = Form.useForm();
  const [listForm] = Form.useForm();
  const [copyTaskList] = Form.useForm();
  const searchRef = useRef();
  const attachmentfileRef = useRef();
  const Search = Input.Search;

  const handleSubscribersChange = (selectedItemIds) => {
    // This ensures that we keep track of selected items by their full details, not just ID
    setSelectSubscribers(selectedItemIds);
    setSearchKeyword("");
  };
  const getProjectByID = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        _id: projectId,
      };
      let Key = generateCacheKey("project", reqBody);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: {
          cachekey: Key,
        },
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setProjectAssignees(response.data.data);
        setStagesId(response.data.data?.workFlow?._id);
        dispatch(hideAuthLoader());
      } else {
        message.error(response?.data?.message);
        dispatch(hideAuthLoader());
      }
    } catch (error) {
      console.log(error);
      dispatch(hideAuthLoader());
    }
  };

  const handleFilterStatus = (e) => {
    const status = e.target.value;
    const checked = e.target.checked;
    if (status && checked) {
      setFilterStatus(status);
    } else {
      setFilterStatus("");
    }
  };

  const deleteTasks = async (id) => {
    dispatch(showAuthLoader());
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteTask}/${id}`,
      });
      if (response?.data && response?.data?.status) {
        message.success(response.data.message);
        getProjectMianTask("", true);
      } else {
        message.error(response.data.message);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const onSearchTask = (value) => {
    setFilterSchema({
      ...filterSchema,
      tasks: { ...filterSchema.tasks, title: value },
    });
    if (selectedTask) {
      getBoardTasks(selectedTask?._id);
    }
  };

  const resetSearchFilter = (e) => {
    const keyCode = e && e.keyCode ? e.keyCode : e;
    switch (keyCode) {
      case 8:
        if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
          searchRef.current.state.value = "";
          setSearchText("");
          setSearchEnabled(false);
        }
        break;
      case 46:
        if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
          searchRef.current.state.value = "";
          setSearchText("");
          setSearchEnabled(false);
        }
        break;
      default:
        break;
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

  const deleteUploadedFiles = async (files, type) => {
    try {
      let body = {
        del_files_arr: files,
        file_for: type,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileDelete}`,
        body: body,
        options: {
          "content-type": "multipart/form-data",
        },
      });
      setDeleteFileData([]);
      return response?.data?.data;
    } catch (error) {
      console.log(error);
    }
  };

  const handleCancelTaskModal = () => {
    setIsModalOpenTaskModal(false);
    setShowSelectTask(false);
    setShowSelectClient(false);
    setSelectedsassignees([]);
    setSelectedItems([]);
    setSelectedClients([]);
    setSelectdclients([]);
    setSelectSubscribers([]);
    setAddInputTaskData({});
    setShowEditor(false);
    setEditorData("");
    setEstHrs("");
    setEstMins("");
    setEstTime("");
    setIsAlterEstimatedTime(false);
    setFileAttachment([]);
    setDeleteFileData([]);
    setIsEditTaskModalOpen(false);
    addform.resetFields();
    editform.resetFields();
  };

  const handleTaskOps = async (values, updateType) => {
    if (!estHrs && !estMins && !getRoles(["Client"])) {
      setEstHrsError("Enter hours");
      setEstMinsError("Enter minutes");
      return;
    }
    if (estHrs === 0 && !estMins) {
      setEstHrsError("Enter estimated hours");
      setEstMinsError("");
      return;
    }
    if (estMins === 0 && !estHrs) {
      setEstMinsError("Enter estimated hours");
      setEstHrsError("");
    }
    if (estHrs == 0 && estMins == 0 && !getRoles(["Client"])) {
      setEstHrsError("Minutes and hours both cannot be 0");
      setEstMinsError("Minutes and hours both cannot be 0");
      return;
    }

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
    setEstHrsError("");
    setEstMinsError("");
    updateType ? updateTasks(values) : addTasks(values);
  };

  const addTasks = async (values, uploadedFiles) => {
    dispatch(showAuthLoader());
    try {
      let reqBody = {
        project_id: projectId,
        main_task_id: selectedTask._id,
        title: values.title.trim(),
        status: "active",
        descriptions: editorData,
        task_labels: addInputTaskData.labels,
        start_date: addInputTaskData.start_date,
        due_date: addInputTaskData.end_date,
        assignees: selectedItems.map((item) => item._id),
        pms_clients: selectedClients.map((item) => item._id),
        task_status: boardTasks[0].workflowStatus._id,
        estimated_hours: estHrs && estHrs != "" ? estHrs : "00",
        estimated_minutes: estMins && estMins != "" ? estMins : "00",

        task_progress: "0",
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
        api_url: Service.taskaddition,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        await emitEvent(socketEvents.ADD_TASK_ASSIGNEE, response.data.data);
        handleCancelTaskModal();
        getProjectMianTask("", true);
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
    if (deleteFileData.length > 0) {
      deleteUploadedFiles(deleteFileData, "task");
    }
    dispatch(showAuthLoader());
    try {
      let reqBody = {
        updated_key: [
          "title",
          "status",
          "descriptions",
          "task_labels",
          "start_date",
          "due_date",
          "assignees",
          "estimated_hours",
          "estimated_minutes",
          "task_progress",
          "attachments",
          "task_status",
          "pms_clients",
        ],
        project_id: projectId,
        main_task_id: selectedTask._id,
        title: values.title.trim(),
        status: "active",
        descriptions: editModalDescription,
        task_labels: addInputTaskData.labels ? addInputTaskData.labels : "",
        assignees: selectedItems.map((item) => item._id),
        task_status: editTaskData.workflow_id,
        estimated_hours: estHrs && estHrs != "" ? estHrs : "00",
        estimated_minutes: estMins && estMins != "" ? estMins : "00",
        task_progress: "0",
        start_date: addInputTaskData.start_date
          ? addInputTaskData.start_date
          : null,
        due_date: addInputTaskData.end_date ? addInputTaskData.end_date : null,
        pms_clients: selectedClients.map((item) => item._id),
      };

      if (populatedFiles.length > 0) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...populatedFiles.map((item) => ({
              file_name: item.name,
              file_path: item.path,
              _id: item._id,
              file_type: item.file_type,
            })),
          ],
        };
      }
      if (uploadedFiles) {
        reqBody = {
          ...reqBody,
          attachments: [
            ...populatedFiles.map((item) => ({
              file_name: item.name,
              file_path: item.path,
              _id: item._id,
              file_type: item.file_type,
            })),
            ...uploadedFiles,
          ],
          folder_id: values.folder,
        };
      }
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.taskPropUpdation}/${editTaskData.id}`,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        let filterAssignees = selectedItems.filter(
          (id) => !newFilteredAssignees.some((user) => user === id?._id)
        );
        let filterClients = selectedClients.filter(
          (id) => !newFilteredClients.some((user) => user === id)
        );

        await emitEvent(socketEvents.EDIT_TASK_ASSIGNEE, {
          _id: editTaskData.id,
          assignees: filterAssignees.map((item) => item._id),
          pms_clients: filterClients.map((item) => item._id),
        });
        getBoardTasks(selectedTask._id);
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

  const getBoardTasks = async (main_task_id) => {
    try {
      const reqBody = {
        project_id: projectId,
        main_task_id: main_task_id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectBoardTasks,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        const enrichedData = await Promise.all(
          response.data.data.map(async (column) => ({
            ...column,
            tasks: await Promise.all(
              column.tasks.map(async (task) => ({
                ...task,
                hasDraft: await hasDraftComment(task._id),
              }))
            ),
          }))
        );
        setBoardTasks(enrichedData);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateTaskDraftStatus = async (taskId, hasDraft) => {
    const updatedTasks = boardTasks.map((column) => ({
      ...column,
      tasks: column.tasks.map((task) =>
        task._id === taskId ? { ...task, hasDraft } : task
      ),
    }));
    setBoardTasks(updatedTasks);
  };

  const getProjectMianTask = async (taskID, selectionFalse) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        search: searchText,
        sort: sortColumn,
        sortBy: sortOrder,
        project_id: projectId,
      };
      if (taskID) {
        reqBody._id = taskID;
      }
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectMianTask,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        if (filterData?.isActive == true) {
          setPagination((prevPagination) => ({
            ...prevPagination,
            total: response.data.metadata.total,
          }));
        } else {
          setPagination({
            ...pagination,
            total: response.data.metadata.total,
          });
        }
        setProjectMianTask(response.data.data);
        if (selectionFalse) {
          getBoardTasks(selectedTask._id);
          return;
        }
        if (!listID) {
          const searchParams = new URLSearchParams(location.search);
          searchParams.set("listID", response.data.data[0]._id);
          history.push({
            pathname: window.location.pathname,
            search: searchParams.toString(),
          });
        }
        if (listID) return;
      } else {
        setSelectedTask(response.data.data[0]);
        setProjectMianTask([]);
        setBoardTasks([]);
        setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const exportCsv = async () => {
    try {
      const reqBody = {
        csvData: filterTasks(boardTasks, filterSchema),
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.exportCSVProjectMainTask,
        body: reqBody,
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

  const showModalList = async (id) => {
    try {
      dispatch(showAuthLoader());
      dispatch(getEmployeeList());
      setModalMode("edit");
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectMianTask,
        body: { project_id: projectId, _id: id },
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data && response?.data?.status) {
        setEditList(response.data.data);
        setIsModalOpenList(true);
        setSelectSubscribers(
          response.data.data.subscribers?.map((subscriber) => subscriber._id)
        );

        //replace it with client
        setSelectedListClient(response.data.data.pms_clients);
        setSelectdclients(
          response.data.data.pms_clients?.map((client) => client._id)
        );
        //Set Intial Data in this state for send notification only for new
        setFilteredSubscribers(
          response.data.data.subscribers?.map((subscriber) => subscriber._id)
        );
        setFilteredClients(
          response.data.data.pms_clients?.map((client) => client._id)
        );
        setIsprivate(response.data.data.isPrivateList);
        listForm.setFieldsValue({
          title: response.data.data.title,
          subscriber_stages: response.data.data.subscriber_stages.map(
            (item) => item.stages._id
          ),
          markAsPrivate: response.data.data.isPrivateList,
        });
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const showModalCopyList = async (id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectMianTask,
        body: { project_id: projectId, _id: id },
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data && response?.data?.status) {
        const { title, project } = response.data.data;
        setCopyTaskListData((prevState) => ({
          ...prevState,
          title,
          project_title: project.title,
        }));
        copyTaskList.setFieldsValue({
          title: `Copy of ${title}`,
          project_title: project.title,
          task_status: true,
          subs_assignee: true,
          clients: true,
          dates: true,
          comments: true,
        });
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleOkList = () => {
    setIsModalOpenList(false);
  };
  const handleCancelList = () => {
    setIsModalOpenList(false);
    setSelectedListClient([]);
    setSelectedsassignees([]);
    setSelectSubscribers([]);
    listForm.resetFields();
  };

  const showModalTaskModal = () => {
    if (projectMianTask.length == 0) {
      return message.error("Please add Tasklist first");
    }
    setIsModalOpenTaskModal(true);
  };

  const handleMenuClick = (e) => {
    console.log(e);
  };

  const openEditList = () => {
    setIsModalOpenList(true);
    setModalMode("add");
  };

  const yourMenu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item onClick={showModalTaskModal} key="1">
        Task
      </Menu.Item>
      <Menu.Item onClick={openEditList} key="2">
        List
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
          "${moment()
            .subtract(1, "week")
            .startOf("week")
            .format("YYYY-MM-DD")}",
         "${moment().subtract(1, "week").endOf("week").format("YYYY-MM-DD")}"
        ]`,
      label: "Last week",
    },
    {
      key: "7",
      value: `[
         "${moment()
           .subtract(1, "month")
           .startOf("month")
           .format("YYYY-MM-DD")}",
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
      tasks: { ...filterSchema.tasks, startDate, dueDate },
    });
    getBoardTasks(selectedTask._id);
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

  const handleButtonTask = () => {
    setShowSelectTask(true);
  };

  const handleButtonClient = () => {
    setShowSelectClient(true);
  };

  const handlerClient = (val) => {
    setSelectdclients(val);
  };

  const getListWorkflowStatus = async () => {
    try {
      dispatch(showAuthLoader());
      const token = localStorage.getItem("accessToken");

      const reqBody = {};
      const headers = {
        token,
      };

      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getworkflowStatus + "/" + stagesId,
        headers: headers,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        setWorkflowStatusList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateSubTaskListInStatus = async (id) => {
    try {
      dispatch(showAuthLoader());
      const token = localStorage.getItem("accessToken");

      const reqBody = {
        project_id: projectId,
        task_status: id,
        task_ids: task_ids,
      };
      const headers = {
        token,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.updateSubTaskListInStatus,
        headers: headers,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        getBoardTasks(selectedTask._id);
        getProjectMianTask();
        dispatch(moveWorkFlowTaskHandler([]));
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateSubTaskListInMainTask = async (id) => {
    try {
      dispatch(showAuthLoader());
      const token = localStorage.getItem("accessToken");

      const reqBody = {
        project_id: projectId,
        new_main_task_id: id,
        task_ids: task_ids,
      };
      const headers = {
        token,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.updateSubTaskListInMainTask,
        headers: headers,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        getBoardTasks(selectedTask._id);
        getProjectMianTask();
        dispatch(moveWorkFlowTaskHandler([]));
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
      const subscriberStages = [];
      for (let i = 0; i < selectSubscriber.length; i++) {
        // Construct subscriber stages object
        const subscriberStage = {
          subscriber_id: selectSubscriber[i],
          stages: values.subscriber_stages[i] || defaultStageId,
        };
        // Push the subscriber stages object to the array
        subscriberStages.push(subscriberStage);
      }
      const reqBody = {
        title: values.title.trim(),
        project_id: projectId,
        subscriber_stages: subscriberStages,
        subscribers: selectSubscriber,
        pms_clients: selectedListClient.map((item) => item._id),
        status: "active",
        isPrivateList: values.markAsPrivate,
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
        getProjectMianTask();
        handleCancelList();
        setOpenStatus(false);
        setOpenAssignees(false);
        setIsPopoverVisibleView(false);
        setOpenLabels(false);
        await emitEvent(socketEvents.ADD_LIST_SUBSCRIBERS, response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get workflowstatus
  const deleteProjectmaintask = async (id) => {
    try {
      dispatch(showAuthLoader());
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteProjectMainTask + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.statusCode == 200 && response?.data?.status) {

        getProjectMianTask(false, false);
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete("listID", listID);
        history.push({
          pathname: window.location.pathname,
          search: searchParams.toString(),
        });
        message.success(response.data.message);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handlemenuClick = (e) => {
    console.log("Clicked on menu item:", e.key);
  };

  const editProjectmainTask = async (values) => {
    try {
      dispatch(showAuthLoader());
      const subscriberStages = [];
      for (let i = 0; i < selectSubscriber.length; i++) {
        const subscriberStage = {
          subscriber_id: selectSubscriber[i],
          stages: values.subscriber_stages[i] || defaultStageId,
        };
        // Push the subscriber stages object to the array
        subscriberStages.push(subscriberStage);
      }
      const reqBody = {
        title: values.title.trim(),
        project_id: projectId,
        subscribers: selectSubscriber,
        subscriber_stages: subscriberStages,
        status: "active",
        isPrivateList: values.markAsPrivate,
        isDisplayInGantt: false,
        pms_clients: selectedListClient.map((item) => item._id),
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
        //Filter new assignees & clients for send Notification:
        let filterAssignees = selectSubscriber.filter(
          (ele, index) => ele !== filteredSubscriber[index]
        );

        let filterClients = selectedListClient
          .filter((id) => !filteredClients.some((user) => user === id?._id))
          .map((item) => item._id);

        await emitEvent(socketEvents.EDIT_LIST_SUBSCRIBERS, {
          _id: editList._id,
          subscribers: filterAssignees,
          pms_clients: filterClients,
        });
        setIsModalOpenList(false);
        getProjectMianTask();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSelectTask = (task) => {
    // Extract current search parameters
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("listID", task._id);
    if (taskID) {
      searchParams.delete("taskID", taskID);
    }
    dispatch(moveWorkFlowTaskHandler([]));

    // Update the URL without reloading the page
    history.push({
      pathname: window.location.pathname,
      search: searchParams.toString(),
    });
  };

  const handleTaskInput = (name, value) => {
    setAddInputTaskData({ ...addInputTaskData, [name]: value });
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
    setEstHrs("");
    setEstMins("");
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

  const removeAttachmentFile = (index, file) => {
    if (file?._id) {
      populatedFiles.splice(index - fileAttachment.length, 1);
      setPopulatedFiles([...populatedFiles]);
      return setDeleteFileData([...deleteFileData, file._id]);
    }
    const newArr = fileAttachment.filter((_, i) => i !== index);
    setFileAttachment(newArr);
  };

  const showEditTaskModal = (data, workflowID) => {
    setIsEditTaskModalOpen(true);
    setShowSelectClient(true);
    setEditTaskData({ id: data._id, workflow_id: workflowID });
    setPopulatedFiles(data?.attachments || []);
    seteditModalDescription(data.descriptions);
    editform.setFieldsValue({
      title: data.title,
      descriptions: removeHTMLTags(data.descriptions ? data.descriptions : ""),
      labels: data.taskLabels.map((item) => item.title),
    });

    setAddInputTaskData({
      start_date: data.start_date,
      end_date: data.due_date,
      labels: data.taskLabels.map((item) => item._id).join(","),
      assignees: data.assignees?.map((value) => value._id),
      clients: addInputTaskData?.clients
        ? addInputTaskData?.clients.map((val) => val?._id)
        : data.pms_clients?.map((value) => value._id),
    });
    setSelectedItems(data.assignees);
    setSelectedClients(data.pms_clients);
    setNewFilteredAssignees(data.assignees?.map((value) => value._id));
    setNewFilteredClients(data.pms_clients?.map((value) => value._id));

    setEstHrs(data.estimated_hours);
    setEstMins(data.estimated_minutes);
    setEstTime(`${data.estimated_hours}:${data.estimated_minutes}`);
    setIsAlterEstimatedTime(false);
    if (data.assignees.length > 0) {
      setShowSelectTask(true);
    } else {
      setShowSelectTask(false);
    }
    if (data.pms_clients.length > 0) {
      setShowSelectClient(true);
    } else {
      setShowSelectClient(false);
    }
  };

  const filterTasks = (data, filters) => {
    console.log("Filtering tasks with:", filters);
    return data.map((project) => {
      let matchedProject = true;
  
      // Status filter
      if (filters.workflowStatusId) {
        if (Array.isArray(filters.workflowStatusId)) {
          matchedProject = filters.workflowStatusId.includes(project.workflowStatus?._id);
        } else {
          matchedProject = project.workflowStatus?._id === filters.workflowStatusId;
        }
      }
  
      // Task-level filters
      if (matchedProject && filters.tasks) {
        project.tasks = project.tasks.filter((task) => {
          let matchedTask = true;
  
          // Assignee filter
          if (filters.tasks.assigneeIds === "unassigned") {
            matchedTask = task.assignees.length === 0;
          } else if (filters.tasks.assigneeIds?.length > 0) {
            matchedTask = task.assignees.some((assignee) =>
              filters.tasks.assigneeIds.includes(assignee._id)
            );
          }
  
          // Label filter
          if (matchedTask && filters.tasks.labelIds === "unlabelled") {
            matchedTask = task.task_labels.length === 0;
          } else if (matchedTask && filters.tasks.labelIds?.length > 0) {
            matchedTask = task.task_labels.some((label) =>
              filters.tasks.labelIds.includes(label._id)
            );
          }
  
          // Start date filter
          if (matchedTask && filters.tasks.startDate) {
            if (!task.start_date) {
              matchedTask = false;
            } else if (filters.tasks.startDate === "next7days") {
              matchedTask = moment(task.start_date).isBetween(
                moment(),
                moment().add(7, "days"),
                null,
                "[]"
              );
            } else if (filters.tasks.startDate === "next30days") {
              matchedTask = moment(task.start_date).isBetween(
                moment(),
                moment().add(30, "days"),
                null,
                "[]"
              );
            } else if (Array.isArray(filters.tasks.startDate)) {
              matchedTask = moment(task.start_date).isBetween(
                moment(filters.tasks.startDate[0]),
                moment(filters.tasks.startDate[1]),
                null,
                "[]"
              );
            } else {
              matchedTask = moment(task.start_date).isSame(
                moment(filters.tasks.startDate),
                "day"
              );
            }
          } else if (matchedTask && filters.tasks.startDate === null) {
            matchedTask = task.start_date === null;
          }
  
          // Due date filter
          if (matchedTask && filters.tasks.dueDate) {
            if (!task.due_date) {
              matchedTask = false;
            } else if (filters.tasks.dueDate === "next7days") {
              matchedTask = moment(task.due_date).isBetween(
                moment(),
                moment().add(7, "days"),
                null,
                "[]"
              );
            } else if (filters.tasks.dueDate === "next30days") {
              matchedTask = moment(task.due_date).isBetween(
                moment(),
                moment().add(30, "days"),
                null,
                "[]"
              );
            } else if (Array.isArray(filters.tasks.dueDate)) {
              matchedTask = moment(task.due_date).isBetween(
                moment(filters.tasks.dueDate[0]),
                moment(filters.tasks.dueDate[1]),
                null,
                "[]"
              );
            } else {
              matchedTask = moment(task.due_date).isSame(
                moment(filters.tasks.dueDate),
                "day"
              );
            }
          } else if (matchedTask && filters.tasks.dueDate === null) {
            matchedTask = task.due_date === null;
          }
  
          // Title filter
          if (matchedTask && filters.tasks.title && filters.tasks.title !== "") {
            matchedTask = task.title
              .toLowerCase()
              .includes(filters.tasks.title.toLowerCase());
          }
  
          return matchedTask;
        });
        matchedProject = project.tasks.length > 0;
      }
  
      if (!matchedProject) {
        return { ...project, tasks: [] };
      }
      return project;
    });
  };

  const countTasks = (data) => {
    const percent = (data?.totalDoneTasks * 100) / data?.totalTasks;
    return {
      taskCount: `${data?.totalDoneTasks}/${data?.totalTasks}`,
      percent,
    };
  };

  const handleAllFilter = (property, value) => {
    if (property == "workflowStatusId") {
      setFilterSchema({ ...filterSchema, [property]: value });
      if (value == "") {
        setFilterSchema({ tasks: { ...filterSchema.tasks } });
      }
    } else {
      setFilterSchema({
        ...filterSchema,
        tasks: { ...filterSchema.tasks, [property]: value },
      });
    }
    setFilterLabelsSearchInput("");
    setFilterStatusSearchInput("");
    setFilterAssignedSearchInput("");
    getBoardTasks(selectedTask._id);
    setOpenStatus(false);
    setOpenAssignees(false);
    setOpenLabels(false);
  };

  const getStatusTitleById = (id) => {
    const item = boardTasks.find((item) => item.workflowStatus._id === id);
    return item ? item.workflowStatus.title : "Not found";
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

  const exportSampleCSVfile = () => {
    const link = document.createElement("a");
    link.setAttribute("href", taskCSV);
    link.setAttribute("download", "taskCSV.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importCsvFile = async (file) => {
    try {
      if (projectMianTask && projectMianTask.length > 0) {
        if (!listID) listID = projectMianTask[0]._id;
        const data = new FormData();
        data.append("attachment", file);
        data.append("project_id", projectId);
        data.append("main_task_id", listID);

        const options = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.importTaskCSV,
          body: data,
          options,
        });

        if (response?.data && response?.data.statusCode === 201) {
          message.success(response.data.message);

          getBoardTasks(listID);
        } else if (response.status === 210) {
          message.error(
            "Oops! It seems some data is missing. Please check the downaloded file."
          );
          const csvData = response.data.data
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

          getBoardTasks(listID);
        } else {
          message.error(response.data.message);
        }
      } else {
        message.error("Please add task list");
      }
    } catch (error) {
      console.log(error);
    }
  };  

  useEffect(() => {
    getProjectMianTask();
    dispatch(getLables());
    dispatch(getFolderList(projectId));
    dispatch(getClientList(projectId));
    dispatch(moveWorkFlowTaskHandler([]));
  }, []);

  useEffectAfterMount(() => {
    dispatch(getSpecificProjectWorkflowStage(stagesId));
  }, [stagesId]);

  //Get Task By Redirect Link:
  useEffect(() => {
    if (listID && projectMianTask.length > 0) {
      let data = projectMianTask.filter((ele) => listID == ele?._id);
      setSelectedTask(data[0]);
      getListWorkflowStatus();
      getBoardTasks(listID);
    }
  }, [listID, projectMianTask]);

  useEffect(() => {
    getProjectByID();
    dispatch(getSubscribersList(projectId));
  }, [projectId]);

  useEffectAfterMount(() => {
    getProjectMianTask();
  }, [searchText, projectId]);

  useEffectAfterMount(() => {
    getProjectByID();
  }, [flag]);

  return {
    yourMenu,
    Search,
    searchRef,
    onSearch,
    resetSearchFilter,
    projectMianTask,
    countTasks,
    handleSelectTask,
    selectedTask,
    handlemenuClick,
    showModalList,
    deleteProjectmaintask,
    filterStatus,
    handleFilterStatus,
    filterStatusSearchInput,
    setFilterStatusSearchInput,
    boardTasks,
    filterAssigned,
    handleSelectionAssignedFilter,
    filterAssignedSearchInput,
    setFilterAssignedSearchInput,
    subscribersList,
    clientsList,
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
    deleteTasks,
    isModalOpenList,
    handleCancelList,
    handleOkList,
    modalMode,
    listForm,
    addProjectMainTask,
    editProjectmainTask,
    handlerClient,
    task_ids,
    workflowStatusList,
    updateSubTaskListInStatus,
    updateSubTaskListInMainTask,
    selectedsassignees,
    selectedClient,
    dispatch,
    projectId,
    stagesId,
    defaultStageId,
    projectWorkflowStage,
    isModalOpenTaskModal,
    handleCancelTaskModal,
    addform,
    handleTaskOps,
    addInputTaskData,
    handleTaskInput,
    showSelectTask,
    showSelectClient,
    handleButtonTask,
    handleButtonClient,
    isAlterEstimatedTime,
    estHrs,
    handleEstTimeInput,
    estMins,
    handleSetEstTime,
    setIsAlterEstimatedTime,
    estTime,
    removeEstTIme,
    fileAttachment,
    attachmentfileRef,
    populatedFiles,
    removeAttachmentFile,
    foldersList,
    onFileChange,
    onSearchTask,
    handleAllFilter,
    setOpenStatus,
    openStatus,
    handleOpenChangeStatus,
    getStatusTitleById,
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
    Option,
    getProjectMianTask,
    setSelectdclients,
    setSelectedsassignees,
    isEditTaskModalOpen,
    editform,
    openLabels,
    setOpenLabels,
    exportCsv,
    html,
    setHtml,
    isPrivate,
    setIsprivate,
    showEditor,
    setShowEditor,
    editorData,
    setEditorData,
    removeHTMLTags,
    handleChangeData,
    handlePaste,
    handlePasteData,
    editModalDescription,
    handleChnageDescription,
    handleSelectedItemsChange,
    selectedItems,
    selectedClients,
    handleSelectedClientsChange,
    selectSubscriber,
    setSelectSubscribers,
    handleSubscribersChange,
    selectedListClient,
    setSelectedListClient,
    handleListClientChange,
    searchKeyword,
    setSearchKeyword,
    handleSearch,
    estHrsError,
    estMinsError,
    projectAssignees,
    importRef,
    exportSampleCSVfile,
    importCsvFile,
    listID,
    setIsCopyModalOpen,
    isCopyModalOpen,
    showModalCopyList,
    copyTaskList,
    copyTaskListData,
    setCopyTaskListData,
    handleFieldChange,
    handleCopyTaskList,
    editList,
    setTableTrue,
    tableTrue,
    handleChangeTableView,
    isPopoverVisibleTableView,
    setIsPopoverVisibleTableView,
    selectedView,
    setSelectedView,
    selectedMainTask,
    setSelectedMainTask,
    selectedWorkflowStatus,
    setSelectedWorkflowStatus,
    updateTaskDraftStatus,
    setFilterSchema
  };
};

export default TasksController;
