/* eslint-disable react-hooks/exhaustive-deps, eqeqeq */
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Button,
  Menu,
  Checkbox,
  Modal,
  DatePicker,
  Input,
  Popover,
  Form,
  Select,
  Dropdown,
  Progress,
  Popconfirm,
  Badge,
  Tooltip,
  ConfigProvider,
  Row,
  Col,
  message,
} from "antd";
import {
  PlusOutlined,
  DownOutlined,
  EditOutlined,
  MoreOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import dayjs from "dayjs";
import moment from "moment";
import queryString from "query-string";
import ReactHTMLTableToExcel from "react-html-table-to-excel";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions/Auth";
import { moveWorkFlowTaskHandler } from "../../appRedux/actions/Common";
import {
  getFolderList,
  getLables,
  getEmployeeList,
  getSpecificProjectWorkflowStage,
  getSubscribersList,
  getClientList,
} from "../../appRedux/reducers/ApiData";
import { socketEvents } from "../../settings/socketEventName";
import { getRoles, hasPermission } from "../../util/hasPermission";
import { generateCacheKey } from "../../util/generateCacheKey";
import { hasDraftComment } from "../../cacheDB";
import { useSocketAction } from "../../hooks/useSocketAction";
import setCookie from "../../hooks/setCookie";
import getCookie from "../../hooks/getCookie";
import useEffectAfterMount from "../../util/useEffectAfterMount";
import TaskList from "./TasksKanbanBoard";
import TasksTableView from "./TasksTableView/TasksTableView";
import TasksGanttView from "./TasksGanttView";
import FilterUI from "./FilterUI";
import MultiSelect from "../../components/CustomSelect/MultiSelect";
import MyAvatar from "../../components/Avatar/MyAvatar";
import { removeTitle } from "../../util/nameFilter";
import taskCSV from "../../../src/taskCSV.csv";
import "./style.css";
import TaskDetailModal from "../TaskPage/TaskDetailModal";
import "../TaskPage/TaskDetailModal.css";

function stageBadgeColor(title, fallback) {
  const t = String(title || "").toLowerCase();
  if (t.includes("to-do") || t.includes("todo")) return "#64748b";
  if (t.includes("progress")) return "#ef4444";
  if (t.includes("hold")) return "#f59e0b";
  if (t.includes("done") || t.includes("complete") || t.includes("closed")) return "#22c55e";
  return fallback || "#64748b";
}

function normalizeStageKey(title) {
  const t = String(title || "").toLowerCase();
  if (t.includes("to-do") || t.includes("todo")) return "todo";
  if (t.includes("progress")) return "inprogress";
  if (t.includes("hold")) return "onhold";
  if (t.includes("done") || t.includes("complete") || t.includes("closed")) return "done";
  return "";
}

const TasksPMS = ({ flag }) => {
  const location = useLocation();
  const history = useHistory();

  let { taskID, listID } = queryString.parse(location.search);
  const { emitEvent } = useSocketAction();

  const [selectedView, setSelectedView] = useState("table");
  const [tableTrue, setTableTrue] = useState(true);
  const [isTaskUpdating, setIsTaskUpdating] = useState(false);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);


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
  const [isLoadingTasksPage, setIsLoadingTasksPage] = useState(true);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [fileAttachment, setFileAttachment] = useState([]);
  const [modalMode, setModalMode] = useState("add");
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [selectedTaskToView, setSelectedTaskToView] = useState(null);
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sortColumn] = useState("_id");
  const [sortOrder] = useState("des");
  const [filterData] = useState([]);
  const [, setOpenStatus] = useState(false);
  const [, setOpenAssignees] = useState(false);
  const [, setOpenLabels] = useState(false);
  const [, setIsPopoverVisibleView] = useState(false);
  const [, setSelectedsassignees] = useState([]);
  const [, setSelectdclients] = useState([]);
  const [editTaskData, setEditTaskData] = useState({});
  const [editList, setEditList] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
  });
  const [, setShowSelectTask] = useState(false);
  const [, setShowSelectClient] = useState(false);
  const [filterSchema, setFilterSchema] = useState({
    tasks: {},
  });

  const [deleteFileData, setDeleteFileData] = useState([]);
  const [populatedFiles, setPopulatedFiles] = useState([]);
  const [stagesId, setStagesId] = useState("");
  const [html, setHtml] = useState([]);
  const importRef = useRef(null);
  const boardTasksInitiatedRef = useRef(false);
  const lastApplyRef = useRef(0);

  //Filter Subscribers & Clients for List Notification:
  const [filteredSubscriber, setFilteredSubscribers] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  //Filter Subscribers & Clients for Task Notification:
  const [newFilteredAssignees, setNewFilteredAssignees] = useState([]);
  const [newFilteredClients, setNewFilteredClients] = useState([]);

  const [isEditTaskSave, setEditTaskSave] = useState(false);
  const [isSavingList, setIsSavingList] = useState(false);

  const [editorData, setEditorData] = useState("");
  const [editModalDescription, seteditModalDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectSubscriber, setSelectSubscribers] = useState([]);
  const [selectedListClient, setSelectedListClient] = useState([]);
  const [estHrsError, setEstHrsError] = useState("");
  const [estMinsError, setEstMinsError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [listSubscriberSearch, setListSubscriberSearch] = useState("");
  const [listClientSearch, setListClientSearch] = useState("");
  const [listAllUsers, setListAllUsers] = useState([]);
  const [userMasterSearchUsers, setUserMasterSearchUsers] = useState([]);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [isAddSubscriberModalOpen, setIsAddSubscriberModalOpen] = useState(false);
  const [creatingSubscriber, setCreatingSubscriber] = useState(false);
  const [subscriberRoles, setSubscriberRoles] = useState([]);
  const [subscriberRolesLoading, setSubscriberRolesLoading] = useState(false);
  const [projectDetails, setProjectDetails] = useState({});
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
      return;
    }

    setSelectedView("table");
    setTableTrue(true);
    setCookie("view_tasks", JSON.stringify("table"), { expires: 365 });
  }, []);

  const userMasterSearchTimerRef = useRef(null);
  const requestUserMasterSearch = useCallback((searchText) => {
    if (userMasterSearchTimerRef.current) {
      clearTimeout(userMasterSearchTimerRef.current);
    }

    const term = String(searchText || "").trim();
    if (!term) {
      setUserMasterSearchUsers([]);
      return;
    }

    userMasterSearchTimerRef.current = setTimeout(() => {
      Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsermaster,
        body: { pageNo: 1, limit: 100, search: term },
      })
        .then((res) => {
          const users = res?.data?.data || [];
          if (Array.isArray(users)) {
            setUserMasterSearchUsers(
              users
                .map((u) => ({ ...u, full_name: u.full_name || u.name || "" }))
                .filter((u) => u?._id)
            );
          }
        })
        .catch(() => {});
    }, 250);
  }, []);

  const handleSearch = (searchValue) => {
    setSearchKeyword(searchValue);
    requestUserMasterSearch(searchValue);
  };

  const handleListSubscriberSearch = (searchValue) => {
    setListSubscriberSearch(searchValue);
    requestUserMasterSearch(searchValue);
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
    setListClientSearch("");
  };

  const handleSelectedItemsChange = (selectedItemIds) => {
    const mergedUsers = [
      ...(assigneeOptions || []),
      ...(listAllUsers || []),
      ...(userMasterSearchUsers || []),
    ];
    const userById = new Map();
    mergedUsers.forEach((u) => {
      if (!u?._id) return;
      userById.set(u._id, { ...u, full_name: u.full_name || u.name || "" });
    });

    setSelectedItems(
      selectedItemIds.map((id) => userById.get(id)).filter(Boolean)
    );
    setSearchKeyword("");
  };

  const handleChangeData = (_, editor) => {
    const data = editor.getData();
    setEditorData(data);
    addform.setFieldsValue({
      descriptions: data
    });
  };

  const handleChnageDescription = useCallback((_, editor) => {
    const data = editor.getData();
    seteditModalDescription(data);
    editform.setFieldsValue({
      descriptions: data
    });
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
    employeeList,
    clientsList,
  } = useSelector((state) => state.apiData);

  const assigneeOptions = useMemo(() => {
    const mergedUsers = [...(subscribersList || []), ...(employeeList || [])];
    const uniqueUsers = new Map();

    mergedUsers.forEach((user) => {
      if (!user?._id) return;

      uniqueUsers.set(user._id, {
        ...user,
        full_name: user.full_name || user.name || "",
      });
    });

    return Array.from(uniqueUsers.values());
  }, [employeeList, subscribersList]);

  const assigneesDropdownData = useMemo(() => {
    const searchUsers =
      Array.isArray(userMasterSearchUsers) && userMasterSearchUsers.length > 0
        ? userMasterSearchUsers
        : listAllUsers || [];

    const merged = [
      ...(assigneeOptions || []),
      ...(selectedItems || []),
      ...(searchKeyword ? searchUsers : []),
    ];

    const uniqueUsers = new Map();
    merged.forEach((user) => {
      if (!user?._id) return;
      uniqueUsers.set(user._id, {
        ...user,
        full_name: user.full_name || user.name || "",
      });
    });

    return Array.from(uniqueUsers.values());
  }, [assigneeOptions, listAllUsers, searchKeyword, selectedItems, userMasterSearchUsers]);

  const subscribersDropdownData = useMemo(() => {
    const searchUsers =
      Array.isArray(userMasterSearchUsers) && userMasterSearchUsers.length > 0
        ? userMasterSearchUsers
        : listAllUsers || [];

    const mergedUsers = [
      ...(assigneeOptions || []),
      ...(listAllUsers || []),
      ...(userMasterSearchUsers || []),
    ];
    const userById = new Map();
    mergedUsers.forEach((u) => {
      if (!u?._id) return;
      userById.set(u._id, { ...u, full_name: u.full_name || u.name || "" });
    });

    const selectedUsers = (selectSubscriber || [])
      .map((id) => userById.get(id))
      .filter(Boolean);

    const merged = [
      ...(assigneeOptions || []),
      ...selectedUsers,
      ...(listSubscriberSearch ? searchUsers : []),
    ];

    const uniqueUsers = new Map();
    merged.forEach((user) => {
      if (!user?._id) return;
      uniqueUsers.set(user._id, {
        ...user,
        full_name: user.full_name || user.name || "",
      });
    });

    return Array.from(uniqueUsers.values());
  }, [assigneeOptions, listAllUsers, listSubscriberSearch, selectSubscriber, userMasterSearchUsers]);

  const listSubscriberOptions = useMemo(() => {
    if (Array.isArray(listAllUsers) && listAllUsers.length > 0) return listAllUsers;
    return assigneeOptions;
  }, [assigneeOptions, listAllUsers]);

  const { task_ids } = useSelector(({ common }) => common);

  const defaultStageId =
    projectWorkflowStage.find(
      (item) => item.title === "To-Do" && item?.isDefault === true
    )?._id ||
    projectWorkflowStage?.[0]?._id ||
    workflowStatusList.find(
      (item) => item.title === "To-Do" && item?.isDefault === true
    )?._id ||
    workflowStatusList?.[0]?._id;

  const { Option } = Select;
  const { companySlug, projectId } = useParams();
  const dispatch = useDispatch();
  const [addform] = Form.useForm();
  const [editform] = Form.useForm();
  const [listForm] = Form.useForm();
  const [addClientForm] = Form.useForm();
  const [addSubscriberForm] = Form.useForm();
  const [copyTaskList] = Form.useForm();
  const searchRef = useRef();
  const attachmentfileRef = useRef();
  const Search = Input.Search;

  const generateTempPassword = () => {
    const seed = Math.random().toString(36).slice(2, 8);
    return `Temp@${seed}`;
  };

  const fetchSubscriberRoles = useCallback(async () => {
    try {
      setSubscriberRolesLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getAllRole,
      });
      if (response?.data?.data?.length > 0) {
        setSubscriberRoles(response.data.data);
      } else {
        setSubscriberRoles([]);
      }
    } catch (error) {
      setSubscriberRoles([]);
    } finally {
      setSubscriberRolesLoading(false);
    }
  }, []);

  const handleSubscribersChange = (selectedItemIds) => {
    // This ensures that we keep track of selected items by their full details, not just ID
    setSelectSubscribers(selectedItemIds);
    setListSubscriberSearch("");
  };
  const getProjectByID = async () => {
    try {
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
        const project = response.data.data;
        const workflowId =
          project?.workFlow?._id ||
          project?.workflow?._id ||
          project?.work_flow?._id ||
          project?.workFlow ||
          project?.workflow ||
          project?.work_flow ||
          project?.workflow_id ||
          project?.work_flow_id ||
          "";

        setProjectDetails(project);
        setStagesId(typeof workflowId === "string" ? workflowId : "");
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoadingTasksPage(false);
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
    setIsTaskUpdating(true)
    if (!estHrs && !estMins && !getRoles(["Client"])) {
      setEstHrsError("Enter hours");
      setEstMinsError("Enter minutes");
      return;
    }
    if (String(estHrs) === "0" && !estMins) {
      setEstHrsError("Enter estimated hours");
      setEstMinsError("");
      return;
    }
    if (String(estMins) === "0" && !estHrs) {
      setEstMinsError("Enter estimated hours");
      setEstHrsError("");
    }
    if (String(estHrs) === "0" && String(estMins) === "0" && !getRoles(["Client"])) {
      setEstHrsError("Minutes and hours both cannot be 0");
      setEstMinsError("Minutes and hours both cannot be 0");
      return;
    }

    if (fileAttachment.length > 0) {
      const uploadedfile = await uploadFiles(fileAttachment, "task");
      if (uploadedfile.length > 0) {
        updateType
          ? await updateTasks(values, uploadedfile)
          : await addTasks(values, uploadedfile);
        return;
      } else {
        return message.error("File not uploaded something went wrong");
      }
    }
    setEstHrsError("");
    setEstMinsError("");
    updateType ? updateTasks(values) : addTasks(values);
    setIsTaskUpdating(false);
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
        estimated_hours: estHrs !== "" && estHrs != null ? estHrs : "00",
        estimated_minutes: estMins !== "" && estMins != null ? estMins : "00",

        task_progress: "0",
        recurringType:addInputTaskData?.recurringType || "",

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
          "attachments",
          "task_status",
          "pms_clients",
           "recurringType"
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
        start_date: addInputTaskData.start_date
          ? addInputTaskData.start_date
          : null,
        due_date: addInputTaskData.end_date ? addInputTaskData.end_date : null,
        pms_clients: selectedClients.map((item) => item._id),
        recurringType:addInputTaskData?.recurringType || "",

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
        await getBoardTasks(selectedTask._id);
        handleCancelTaskModal();
      } else {
        message.error(response.data.message);
      }
      // fetch current task data to get updated content
      setEditTaskSave(true); // Call API in tasklist component
      dispatch(hideAuthLoader());
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const getBoardTasks = async (main_task_id) => {
    try {
      setIsTasksLoading(true);
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
        // Show tasks immediately — no waiting for hasDraft
        setBoardTasks(response.data.data);
        setIsTasksLoading(false);
        // Update hasDraft in background after UI is unblocked
        Promise.all(
          response.data.data.map(async (column) => ({
            ...column,
            tasks: await Promise.all(
              column.tasks.map(async (task) => ({
                ...task,
                hasDraft: await hasDraftComment(task._id),
              }))
            ),
          }))
        ).then((enrichedData) => {
          setBoardTasks(enrichedData);
        });
      } else {
        message.error(response.data.message);
        setIsTasksLoading(false);
      }
    } catch (error) {
      console.log(error);
      setIsTasksLoading(false);
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

  const updateBoardTaskLocally = useCallback((updatedTask) => {
    if (!updatedTask?._id) return;

    setBoardTasks((prevBoards) =>
      prevBoards.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) =>
          task._id === updatedTask._id
            ? {
                ...task,
                ...updatedTask,
                hasDraft:
                  typeof task.hasDraft === "boolean"
                    ? task.hasDraft
                    : updatedTask.hasDraft,
              }
            : task
        ),
      }))
    );
  }, []);

  const getProjectMianTask = async (taskID, selectionFalse) => {
    try {
      setIsTasksLoading(true);
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
    } finally {
      setIsTasksLoading(false);
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

  const handleAddTaskClick = () => {
    showModalTaskModal();
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
      <Menu.Item onClick={handleAddTaskClick} key="1">
        Task
      </Menu.Item>
      <Menu.Item onClick={openEditList} key="2">
        List
      </Menu.Item>
    </Menu>
  );
  

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

  const updateSubTaskListInStatus = async (id, { suppressRefresh = false, suppressClearSelection = false } = {}) => {
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
        if (!suppressRefresh) {
          const currentListId = listID || selectedTask?._id;
          if (currentListId) await getBoardTasks(currentListId);
          setTimeout(() => getProjectMianTask(), 0);
        }
        if (!suppressClearSelection) {
          dispatch(moveWorkFlowTaskHandler([]));
        }
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateSubTaskListInMainTask = async (id, { suppressRefresh = false, suppressClearSelection = false } = {}) => {
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
        if (!suppressRefresh) {
          const currentListId = listID || selectedTask?._id;
          if (currentListId) await getBoardTasks(currentListId);
          setTimeout(() => getProjectMianTask(), 0);
        }
        if (!suppressClearSelection) {
          dispatch(moveWorkFlowTaskHandler([]));
        }
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // add projectmaintask
  const addProjectMainTask = async (values) => {
    if (isSavingList) return;
    try {
      setIsSavingList(true);
      dispatch(showAuthLoader());
      const subscriberStages = [];
      for (let i = 0; i < selectSubscriber.length; i++) {
        const stageValue = values.subscriber_stages?.[i] || defaultStageId;

        const subscriberStage = {
          subscriber_id: selectSubscriber[i],
          stages: stageValue,
        };
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
        const createdListId = response?.data?.data?._id;
        if (createdListId) {
          const searchParams = new URLSearchParams(location.search);
          searchParams.set("listID", createdListId);
          history.push({
            pathname: window.location.pathname,
            search: searchParams.toString(),
          });
        }
        await getProjectMianTask();
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
    } finally {
      setIsSavingList(false);
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
    if (isSavingList) return;
    try {
      setIsSavingList(true);
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
    } finally {
      setIsSavingList(false);
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
    setSelectedTaskToView(data);
    setIsEditTaskModalOpen(true);
    setShowSelectClient(true);
    setEditTaskData({ id: data?._id, workflow_id: workflowID });
    setPopulatedFiles(data?.attachments || []);
    seteditModalDescription(data?.descriptions);
    editform.setFieldsValue({
      title: data?.title,
      descriptions: removeHTMLTags(data?.descriptions ? data.descriptions : ""),
      labels: (data?.taskLabels || []).map((item) => item?.title).filter(Boolean),
    });

    setAddInputTaskData({
      start_date: data?.start_date,
      end_date: data?.due_date,
      labels: (data?.taskLabels || []).map((item) => item?._id).filter(Boolean).join(","),
      assignees: (data?.assignees || []).map((value) => value?._id).filter(Boolean),
      clients: addInputTaskData?.clients
        ? addInputTaskData?.clients.map((val) => val?._id)
        : (data?.pms_clients || []).map((value) => value?._id).filter(Boolean),
        recurringType: data?.recurringType || null,
    });
    setSelectedItems(data?.assignees || []);
    setSelectedClients(data?.pms_clients || []);
    setNewFilteredAssignees(
      (data?.assignees || []).map((value) => value?._id).filter(Boolean)
    );
    setNewFilteredClients(
      (data?.pms_clients || []).map((value) => value?._id).filter(Boolean)
    );

    setEstHrs(data?.estimated_hours);
    setEstMins(data?.estimated_minutes);
    setEstTime(`${data?.estimated_hours || "00"}:${data?.estimated_minutes || "00"}`);
    setIsAlterEstimatedTime(false);
    if ((data?.assignees || []).length > 0) {
      setShowSelectTask(true);
    } else {
      setShowSelectTask(false);
    }
    if ((data?.pms_clients || []).length > 0) {
      setShowSelectClient(true);
    } else {
      setShowSelectClient(false);
    }
  };

  const matchesLabelFilter = (task, labelFilter) => {
    if (!labelFilter) return true;

    if (labelFilter === "unlabelled") {
      return !task.task_labels || task.task_labels.length === 0;
    }

    if (Array.isArray(labelFilter) && labelFilter.length > 0) {
      if (!task.task_labels || task.task_labels.length === 0) return false;

      return task.task_labels.some((label) => labelFilter.includes(label._id));
    }

    return true;
  };

  const filterTasks = (boardTasks, filterSchema) => {
    if (!boardTasks || boardTasks.length === 0) {
      return [];
    }

    if (
      !filterSchema ||
      (!filterSchema.workflowStatusId &&
        (!filterSchema.tasks || Object.keys(filterSchema.tasks).length === 0))
    ) {
      return boardTasks;
    }

    const { workflowStatusId, tasks: taskFilters = {} } = filterSchema;
    const { assigneeIds, labelIds, startDate, dueDate, title } = taskFilters;

    // Helper function to check if a date matches the filter criteria
    const matchesDateFilter = (taskDate, filterValue) => {
      if (!filterValue || filterValue === "") return true;

      const taskMoment = moment(taskDate);

      // Handle special date values
      if (filterValue === "nodate") {
        return !taskDate;
      }

      if (filterValue === "next7days") {
        const today = moment().startOf("day");
        const next7Days = moment().add(7, "days").endOf("day");
        return taskMoment.isBetween(today, next7Days, null, "[]");
      }

      if (filterValue === "next30days") {
        const today = moment().startOf("day");
        const next30Days = moment().add(30, "days").endOf("day");
        return taskMoment.isBetween(today, next30Days, null, "[]");
      }

      // Handle array (date range)
      if (Array.isArray(filterValue) && filterValue.length === 2) {
        const [startDate, endDate] = filterValue;
        if (startDate && endDate) {
          const startMoment = moment(startDate).startOf("day");
          const endMoment = moment(endDate).endOf("day");
          return taskMoment.isBetween(startMoment, endMoment, null, "[]");
        }
      }

      // Handle single date
      if (typeof filterValue === "string") {
        const filterMoment = moment(filterValue);
        return taskMoment.isSame(filterMoment, "day");
      }

      return true;
    };

    // Helper function to check if a task matches assignee filter
    const matchesAssigneeFilter = (task, assigneeFilter) => {
      if (!assigneeFilter) return true;

      if (assigneeFilter === "unassigned") {
        return !task.assignees || task.assignees.length === 0;
      }

      if (Array.isArray(assigneeFilter) && assigneeFilter.length > 0) {
        if (!task.assignees || task.assignees.length === 0) return false;

        return task.assignees.some((assignee) =>
          assigneeFilter.includes(assignee._id)
        );
      }

      return true;
    };

    // Helper function to check if a task matches title filter
    const matchesTitleFilter = (task, titleFilter) => {
      if (!titleFilter || titleFilter.trim() === "") return true;

      return task.title
        ?.toLowerCase()
        .includes(titleFilter.toLowerCase().trim());
    };

    // Filter boards by workflow status if specified
    let filteredBoards = boardTasks;
    if (workflowStatusId) {
      filteredBoards = boardTasks.filter(
        (board) =>
          board.workflowStatus && board.workflowStatus._id === workflowStatusId
      );
    }

    // If no task-level filters are applied, return the status-filtered boards
    if (!assigneeIds && !labelIds && !startDate && !dueDate && !title) {
      return filteredBoards;
    }

    // Apply task-level filters
    return filteredBoards.map((board) => {
      if (!board.tasks || board.tasks.length === 0) {
        return board;
      }

      const filteredTasks = board.tasks.filter((task) => {
        // Check title filter
        if (!matchesTitleFilter(task, title)) {
          return false;
        }

        // Check assignee filter
        if (!matchesAssigneeFilter(task, assigneeIds)) {
          return false;
        }

        // Check label filter
        if (!matchesLabelFilter(task, labelIds)) {
          return false;
        }

        // Check start date filter
        if (!matchesDateFilter(task.start_date, startDate)) {
          return false;
        }

        // Check due date filter
        if (!matchesDateFilter(task.due_date, dueDate)) {
          return false;
        }

        return true;
      });

      return {
        ...board,
        tasks: filteredTasks,
        total_task: filteredTasks.length,
      };
    });
  };

  const countTasks = (data) => {
    const percent = (data?.totalDoneTasks * 100) / data?.totalTasks;
    return {
      taskCount: `${data?.totalDoneTasks}/${data?.totalTasks}`,
      percent,
    };
  };

  const filteredBoardTasks = filterTasks(boardTasks, filterSchema);
  const hasVisibleTasks = filteredBoardTasks.some(
    (board) => (board?.tasks?.length || 0) > 0
  );

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
    dispatch(moveWorkFlowTaskHandler([]));
    // Defer labels & employees — only needed when Add Task modal opens
    const t = setTimeout(() => {
      dispatch(getLables());
      dispatch(getEmployeeList());
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffectAfterMount(() => {
    if (!stagesId) return;
    dispatch(getSpecificProjectWorkflowStage(stagesId));
    getListWorkflowStatus();
  }, [stagesId]);

  useEffect(() => {
    if (!isModalOpenList) return;
    setListSubscriberSearch("");
    setListClientSearch("");

    // Always refresh dropdown data when the List modal opens
    if (projectId) dispatch(getSubscribersList(projectId));
    // Do NOT filter clients by project here — show full client master list
    dispatch(getClientList());

    if (!stagesId) getProjectByID();
    if (stagesId) dispatch(getSpecificProjectWorkflowStage(stagesId));

    // Load full employee master list (for "pure data" in Subscribers dropdown)
    Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.getUsermaster,
      body: { pageNo: 1, limit: 500, search: "" },
    })
      .then((res) => {
        const users = res?.data?.data || [];
        if (Array.isArray(users) && users.length > 0) {
          setListAllUsers(
            users
              .map((u) => ({ ...u, full_name: u.full_name || u.name || "" }))
              .filter((u) => u?._id)
          );
        }
      })
      .catch(() => {});
  }, [isModalOpenList, projectId, stagesId, dispatch]);

  useEffect(() => {
    if (!isModalOpenTaskModal) return;

    // Ensure we can search/select assignees outside current subscriber/employee lists
    Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.getUsermaster,
      body: { pageNo: 1, limit: 500, search: "" },
    })
      .then((res) => {
        const users = res?.data?.data || [];
        if (Array.isArray(users) && users.length > 0) {
          setListAllUsers(
            users
              .map((u) => ({ ...u, full_name: u.full_name || u.name || "" }))
              .filter((u) => u?._id)
          );
        }
      })
      .catch(() => {});
  }, [isModalOpenTaskModal]);

  const createClientFromListModal = async (values) => {
    const fullName = `${values.first_name} ${values.last_name}`.trim();
    const reqBody = {
      last_name: values.last_name,
      first_name: values.first_name,
      company_name: values.company_name,
      phone_number: values.phone_number,
      password: values?.plain_password,
      full_name: fullName,
      email: values.email,
      extra_details: values.extra_details,
      isActivate: values.status === "Active",
    };

    try {
      setCreatingClient(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.clientAdd,
        body: reqBody,
      });
      if (response?.data?.statusCode !== 201) {
        return message.error(response?.data?.message || "Unable to add client");
      }

      message.success(response?.data?.message || "Client added");
      setIsAddClientModalOpen(false);
      addClientForm.resetFields();
      dispatch(getClientList());
    } catch (e) {
      console.log(e);
      message.error("Unable to add client");
    } finally {
      setCreatingClient(false);
    }
  };

  const openAddSubscriberModal = () => {
    addSubscriberForm.setFieldsValue({
      first_name: "",
      last_name: "",
      email: "",
      pmsRoleId: undefined,
      password: generateTempPassword(),
      status: "Active",
    });
    setIsAddSubscriberModalOpen(true);
    fetchSubscriberRoles();
  };

  const createSubscriberFromListModal = async (values) => {
    const companyId = JSON.parse(localStorage.getItem("user_data") || "{}")?.companyId;
    if (!companyId) {
      return message.error("Company ID not found");
    }

    const payload = {
      firstName: values.first_name?.trim(),
      lastName: values.last_name?.trim(),
      companyId,
      isActivate: values.status === "Active",
      email: values.email?.trim(),
      password: values.password,
      pmsRoleId: values.pmsRoleId,
    };

    try {
      setCreatingSubscriber(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addUser,
        body: payload,
      });

      if (!response?.data?.data || !response?.data?.status) {
        return message.error(response?.data?.message || "Failed to create subscriber");
      }

      const newUser = response.data.data;
      const normalizedUser = {
        ...newUser,
        full_name:
          newUser?.full_name ||
          newUser?.name ||
          `${payload.firstName || ""} ${payload.lastName || ""}`.trim(),
      };

      setListAllUsers((prev) => {
        const existing = Array.isArray(prev) ? prev : [];
        const exists = existing.some((u) => u?._id === normalizedUser?._id);
        return exists ? existing : [...existing, normalizedUser];
      });
      setUserMasterSearchUsers((prev) => {
        const existing = Array.isArray(prev) ? prev : [];
        const exists = existing.some((u) => u?._id === normalizedUser?._id);
        return exists ? existing : [...existing, normalizedUser];
      });

      setSelectSubscribers((prev) => Array.from(new Set([...(prev || []), normalizedUser._id])).filter(Boolean));
      setListSubscriberSearch("");

      message.success(response?.data?.message || "Subscriber created");
      setIsAddSubscriberModalOpen(false);
      addSubscriberForm.resetFields();
    } catch (error) {
      const apiMsg = error?.response?.data?.message || error?.message;
      message.error(apiMsg || "Failed to create subscriber");
    } finally {
      setCreatingSubscriber(false);
    }
  };

  //Get Task By Redirect Link:
  useEffect(() => {
    if (listID && projectMianTask.length > 0) {
      let data = projectMianTask.filter((ele) => listID == ele?._id);
      setSelectedTask(data[0]);
      getListWorkflowStatus();
      if (boardTasksInitiatedRef.current) {
        boardTasksInitiatedRef.current = false;
      } else {
        getBoardTasks(listID);
      }
    }
  }, [listID, projectMianTask]);

  useEffect(() => {
    boardTasksInitiatedRef.current = false;
    getProjectByID();
    getProjectMianTask();
    if (listID) {
      boardTasksInitiatedRef.current = true;
      getBoardTasks(listID);
    }
    // Defer non-critical calls — only needed when modals open
    const deferTimer = setTimeout(() => {
      dispatch(getFolderList(projectId));
      dispatch(getClientList(projectId));
      dispatch(getSubscribersList(projectId));
    }, 800);
    return () => clearTimeout(deferTimer);
  }, [projectId]);

  useEffectAfterMount(() => {
    getProjectMianTask();
  }, [searchText]);

  useEffectAfterMount(() => {
    getProjectByID();
  }, [flag]);

  const csvRef = document.getElementById("test-table-xls-button");

  const menu = (
    <Menu selectedKeys={[selectedView]}>
      <Menu.Item key="table" onClick={() => handleChangeTableView("table")}>
        <i className="fa-solid fa-list" style={{ marginRight: 8 }} />
        Table View
      </Menu.Item>
      <Menu.Item key="board" onClick={() => handleChangeTableView("board")}>
        <i className="fa-solid fa-table-columns" style={{ marginRight: 8 }} />
        Board View
      </Menu.Item>
      <Menu.Item key="gantt" onClick={() => handleChangeTableView("gantt")}>
        <i className="fa-solid fa-bars-progress" style={{ marginRight: 8 }} />
        Gantt View
      </Menu.Item>
    </Menu>
  );

  const [movingTasks, setMovingTasks] = useState(false);
  const stageTiles = useMemo(() => {
    const fromBoard = Array.isArray(boardTasks)
      ? boardTasks
        .map((col) => {
          const ws = col?.workflowStatus || col?.workflow_status || col?.status || {};
          const id = ws?._id || ws?.id || col?._id;
          const title = ws?.title || col?.title || "";
          const color = ws?.color || col?.color || "";
          const count = Array.isArray(col?.tasks) ? col.tasks.length : (col?.tasks_count || 0);
          return id ? { id, title, key: normalizeStageKey(title), color, badgeColor: stageBadgeColor(title, color), count } : null;
        })
        .filter(Boolean)
      : [];

    const fromWorkflow = Array.isArray(workflowStatusList)
      ? workflowStatusList
        .map((ws) => {
          const title = ws?.title || "";
          const color = ws?.color || "";
          return { id: ws?._id || ws?.id, title, key: normalizeStageKey(title), color, badgeColor: stageBadgeColor(title, color), count: 0 };
        })
        .filter((x) => x.id)
      : [];

    const list = fromBoard.length ? fromBoard : fromWorkflow;
    const byKey = new Map(list.filter((x) => x.key).map((x) => [x.key, x]));

    // Fixed 4 columns: To-Do / In progress / On Hold / Done
    const wanted = [
      { key: "todo", label: "To-Do" },
      { key: "inprogress", label: "In progress" },
      { key: "onhold", label: "On Hold" },
      { key: "done", label: "Done" },
    ];

    return wanted.map((w) => {
      const hit = byKey.get(w.key);
      if (hit) return { ...hit, title: w.label };
      return { id: w.key, key: w.key, title: w.label, badgeColor: stageBadgeColor(w.label), count: 0 };
    });
  }, [boardTasks, workflowStatusList]);

  const listStageOptions = useMemo(() => {
    const wanted = [
      { key: "todo", label: "To-Do" },
      { key: "inprogress", label: "In progress" },
      { key: "onhold", label: "On Hold" },
      { key: "done", label: "Done" },
    ];

    const fromApi =
      Array.isArray(projectWorkflowStage) && projectWorkflowStage.length > 0
        ? projectWorkflowStage
        : Array.isArray(workflowStatusList) && workflowStatusList.length > 0
          ? workflowStatusList
          : [];

    if (fromApi.length > 0) {
      const byKey = new Map(
        fromApi
          .map((ws) => {
            const title = ws?.title || ws?.name || "";
            return [normalizeStageKey(title), ws];
          })
          .filter(([k]) => Boolean(k))
      );
      return wanted
        .map((w) => {
          const hit = byKey.get(w.key);
          if (!hit) return null;
          return { ...hit, _id: hit?._id || hit?.id, title: w.label };
        })
        .filter(Boolean);
    }

    const placeholderIds = new Set(["todo", "inprogress", "onhold", "done"]);
    const hasRealIds =
      Array.isArray(stageTiles) &&
      stageTiles.some(
        (t) => typeof t?.id === "string" && t.id.length > 8 && !placeholderIds.has(t.id)
      );
    if (!hasRealIds) return [];
    return wanted
      .map((w) => {
        const hit = stageTiles.find((t) => t?.key === w.key);
        if (!hit) return null;
        return { _id: hit.id, title: w.label };
      })
      .filter(Boolean);
  }, [projectWorkflowStage, stageTiles, workflowStatusList]);

  const handleSubmit = async () => {
    const now = Date.now();
    if (now - lastApplyRef.current < 600) return;
    lastApplyRef.current = now;

    const hasSelectedTasks = Array.isArray(task_ids) && task_ids.length > 0;
    if (movingTasks) return;
    setStageDropdownOpen(false);

    // If no tasks are selected, treat list/stage as view filters (not bulk move)
    if (!hasSelectedTasks) {
      setFilterSchema((prev) => ({
        ...(prev || {}),
        workflowStatusId:
          selectedWorkflowStatus && selectedWorkflowStatus !== "a"
            ? selectedWorkflowStatus
            : undefined,
      }));

      if (selectedMainTask && selectedMainTask !== "a") {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("listID", selectedMainTask);
        history.push({
          pathname: window.location.pathname,
          search: searchParams.toString(),
        });
      }
      return;
    }

    const currentListId = listID || selectedTask?._id;

    if (
      selectedMainTask &&
      selectedMainTask != "a" &&
      selectedWorkflowStatus == "a"
    ) {
      setMovingTasks(true);
      try {
        // Optimistic: moved out of current list, remove locally
        if (currentListId && selectedMainTask !== currentListId) {
          setBoardTasks((prev) =>
            (prev || []).map((col) => ({
              ...col,
              tasks: (col?.tasks || []).filter((t) => !task_ids.includes(t?._id)),
            }))
          );
        }
        await updateSubTaskListInMainTask(selectedMainTask);
        setSelectedMainTask("a");
      } finally {
        setMovingTasks(false);
      }
    } else if (
      selectedWorkflowStatus &&
      selectedWorkflowStatus != "a" &&
      selectedMainTask == "a"
    ) {
      setMovingTasks(true);
      try {
        // Optimistic: move cards between columns immediately
        setBoardTasks((prev) => {
          const boards = Array.isArray(prev) ? prev : [];
          const moved = [];
          const stripped = boards.map((col) => {
            const remaining = [];
            (col?.tasks || []).forEach((t) => {
              if (task_ids.includes(t?._id)) moved.push(t);
              else remaining.push(t);
            });
            return { ...col, tasks: remaining };
          });

          return stripped.map((col) => {
            const colId = col?.workflowStatus?._id;
            if (colId && colId === selectedWorkflowStatus) {
              return { ...col, tasks: [...moved, ...(col?.tasks || [])] };
            }
            return col;
          });
        });
        await updateSubTaskListInStatus(selectedWorkflowStatus);
        setSelectedWorkflowStatus("a");
      } finally {
        setMovingTasks(false);
      }
    } else if (selectedWorkflowStatus != "a" && selectedMainTask != "a") {
      setMovingTasks(true);
      try {
        // Optimistic: if moving to a different list, remove from current view
        if (currentListId && selectedMainTask !== currentListId) {
          setBoardTasks((prev) =>
            (prev || []).map((col) => ({
              ...col,
              tasks: (col?.tasks || []).filter((t) => !task_ids.includes(t?._id)),
            }))
          );
        }
        await updateSubTaskListInMainTask(selectedMainTask, { suppressRefresh: true, suppressClearSelection: true });
        await updateSubTaskListInStatus(selectedWorkflowStatus, { suppressRefresh: true, suppressClearSelection: true });
        // Single refresh/clear at the end (prevents multiple refreshes)
        if (currentListId) await getBoardTasks(currentListId);
        dispatch(moveWorkFlowTaskHandler([]));
        // Refresh left list in background (avoid blocking UI)
        setTimeout(() => {
          getProjectMianTask();
        }, 0);
        setSelectedMainTask("a");
        setSelectedWorkflowStatus("a");
      } finally {
        setMovingTasks(false);
      }
    } else {
      message.info("Select a list or stage to move task(s).");
    }
  };

  return (
    <>
      <div className="project-wrapper discussion-wrapper task-wrapper wm-force-dark-page">
        <div className="peoject-page">
          <div className="profileleftbar">
            <div className="add-project-wrapper">
              {hasPermission(["task_add"]) && (
                <Dropdown trigger={["click"]} overlay={yourMenu}>
                  <Button className="add-btn ant-btn-primary">
                    <PlusOutlined className="add-btn-leading-icon" />
                    <span>Add</span>
                    <DownOutlined className="add-btn-trailing-icon" />
                  </Button>
                </Dropdown>
              )}
              <Search
                ref={searchRef}
                placeholder="Search..."
                onSearch={onSearch}
                onKeyUp={resetSearchFilter}
                style={{ width: 200 }}
                className="mr2"
              />
            </div>

            <ul style={{ listStyle: "none", padding: "0" }}>
              {projectMianTask.length != 0 &&
                projectMianTask.map((item, index) => {
                  const tasksInfo = countTasks(item);
                  return (
                    <li
                      className="design-graph-wrapper"
                      key={`${index}_${item?._id}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSelectTask(item)}
                    >
                      <div
                        className={
                          selectedTask?._id == item?._id
                            ? "design-graph"
                            : "design-graph-inactive"
                        }
                      >
                        <span className="discussion-pin-wrapper">
                          {item.isPrivateList && (
                            <span className="flex">
                              {item.isPrivateList && (
                                <i className="fi fi-sr-lock"></i>
                              )}
                            </span>
                          )}
                          <span
                            className="label-of"
                            style={{
                              textTransform: "capitalize",
                              wordWrap: "break-word",
                            }}
                          >
                            {item?.title}
                          </span>
                        </span>
                        <div className="process_list">
                          <Progress percent={tasksInfo.percent} />
                          <span className="process_bar">
                            {tasksInfo.taskCount}
                          </span>
                        </div>
                        {hasPermission(["task_add"]) && (
                          <Dropdown
                            overlay={
                              <Menu onClick={handlemenuClick}>
                                <Menu.Item
                                  key="edit"
                                  onClick={() => showModalList(item?._id)}
                                  icon={
                                    <EditOutlined style={{ color: "green" }} />
                                  }
                                >
                                  Edit
                                </Menu.Item>
                                <Popconfirm
                                  title="Do you want to delete?"
                                  okText="Yes"
                                  cancelText="No"
                                  onConfirm={() =>
                                    deleteProjectmaintask(item?._id)
                                  }
                                >
                                  <Menu.Item
                                    key="delete"
                                    className="ant-delete"
                                    icon={
                                      <DeleteOutlined
                                        style={{ color: "red" }}
                                      />
                                    }
                                  >
                                    Delete
                                  </Menu.Item>
                                </Popconfirm>
                                <Menu.Item
                                  onClick={() => {
                                    setIsCopyModalOpen(true);
                                    showModalCopyList(item?._id);
                                  }}
                                  icon={<CopyOutlined />}
                                >
                                  Create a Copy
                                </Menu.Item>
                              </Menu>
                            }
                            trigger={["click"]}
                          >
                            <button
                              type="button"
                              onClick={(e) => e.preventDefault()}
                              style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
                              aria-label="More actions"
                            >
                              <MoreOutlined className="moreoutline-icon" />
                            </button>
                          </Dropdown>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>

          <div className="profilerightbar">
            {task_ids?.length > 0 ? (
              <div
                className={`profile-sub-head ${
                  task_ids?.length > 0 ? "update-task" : ""
                }`}
              >
                <div className="head-box-inner">
                  <div className="update-workflow-status">
                    <Form
                      onSubmitCapture={(e) => {
                        e.preventDefault();
                        handleSubmit();
                      }}
                      className="update-workflow-status-form"
                    >
                      {hasPermission(["task_add"]) && (
                        <Form.Item
                          name="mainTask"
                          className="update-workflow-status-formitem"
                        >
                          <Select
                            value={selectedMainTask === "a" ? undefined : selectedMainTask}
                            placeholder="Select list to move task"
                            onChange={(data) => setSelectedMainTask(data || "a")}
                            style={{ width: 200 }}
                            showSearch
                            filterOption={(input, option) =>
                              option.children
                                ?.toLowerCase()
                                ?.indexOf(input?.toLowerCase()) >= 0
                            }
                          >
                            {projectMianTask?.map((item, index) => (
                              <Option
                                key={index}
                                value={item?._id}
                                style={{ textTransform: "capitalize" }}
                              >
                                {item.title}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      )}
                      <Form.Item name="workflowStatus">
                        <Select
                          value={selectedWorkflowStatus === "a" ? undefined : selectedWorkflowStatus}
                          placeholder="Select stage to move task"
                          onChange={(data) => setSelectedWorkflowStatus(data || "a")}
                          style={{ width: 210 }}
                          open={stageDropdownOpen}
                          onDropdownVisibleChange={(open) => {
                            setStageDropdownOpen(open);
                            if (!open || !stagesId) return;
                            dispatch(getSpecificProjectWorkflowStage(stagesId));
                            getListWorkflowStatus();
                          }}
                          showSearch
                          filterOption={(input, option) =>
                            option.children
                              ?.toLowerCase()
                              ?.indexOf(input?.toLowerCase()) >= 0
                          }
                        >
                          {listStageOptions.map((item, index) => (
                            <Option
                              key={index}
                              value={item?._id}
                              style={{ textTransform: "capitalize" }}
                            >
                              {item.title}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item>
                        <Button
                          className="ant-btn-primary"
                          type="primary"
                          htmlType="button"
                          onClick={handleSubmit}
                          loading={movingTasks}
                          disabled={
                            movingTasks ||
                            (selectedMainTask == "a" &&
                              selectedWorkflowStatus == "a")
                              ? true
                              : false
                          }
                        >
                          Apply
                        </Button>
                      </Form.Item>
                      <Form.Item>
                        <Button
                          className="ant-delete"
                          type="primary"
                          htmlType="button"
                          icon={<CloseOutlined />}
                          onClick={() => {
                            setSelectedMainTask("a");
                            setSelectedWorkflowStatus("a");
                            setStageDropdownOpen(false);
                            setFilterSchema((prev) => ({ ...(prev || {}), workflowStatusId: undefined }));
                            dispatch(moveWorkFlowTaskHandler([]));
                          }}
                        >
                          Clear
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="profile-sub-head">
                <div className="task-sub-header">
                  <div className="head-box-inner">
                    <Search
                      ref={searchRef}
                      placeholder="Search..."
                      onSearch={onSearchTask}
                      style={{ width: 200 }}
                      className="mr2"
                    />
                    <div style={{ cursor: "pointer" }}>
                      <div className="status-content">
                        <ConfigProvider>
                          <Dropdown overlay={menu} trigger={["click"]}>
                            <div className="dropdown-trigger">
                              {selectedView === "table" ? "" : ""}
                              <i className="fa-solid fa-table"></i>
                            </div>
                          </Dropdown>
                        </ConfigProvider>
                      </div>
                    </div>
                  </div>

                  <div className="block-status-content">
                    <FilterUI
                      boardTasks={boardTasks}
                      subscribersList={subscribersList}
                      projectLabels={projectLabels}
                      onConfigUpdate={(config) => setFilterSchema(config)}
                    />
                  </div>
                </div>

                <div style={{ cursor: "pointer" }}>
                  <div hidden>
                    <ReactHTMLTableToExcel
                      id="test-table-xls-button"
                      className="ant-btn-primary"
                      table="table-to-xls"
                      filename="ProjectTasks"
                      sheet="tablexls"
                      buttonText="Export XLS"
                    />
                    <div
                      dangerouslySetInnerHTML={{ __html: html["html"] }}
                    ></div>
                  </div>
                  <Popover
                    placement="bottomRight"
                    overlayClassName="wm-ellipsis-popover"
	                    content={
	                      <div className="task-elipse-pop">
	                        {hasPermission(["task_add"]) && (
	                          <>
	                            <div
	                              className="sample-csv"
	                              onClick={() => exportSampleCSVfile()}
	                              role="button"
	                              tabIndex={0}
	                            >
	                              <h6>Sample CSV:</h6>
	                              <i className="fi fi-rr-file-download"></i>
	                              <input
	                                type="file"
	                                size="small"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  importCsvFile(file);
                                }}
                                onClick={(e) => (e.target.value = null)}
                                style={{ display: "none" }}
                                ref={importRef}
                                accept="xlsx, .xls, .csv"
                              />
                            </div>
                          </>
                        )}

	                        {hasPermission(["task_add"]) && (
	                          <>
	                            <div
	                              className="sample-csv"
	                              onClick={() => importRef.current.click()}
	                              role="button"
	                              tabIndex={0}
	                            >
	                              <h6>Import CSV:</h6>
	                              <i className="fi fi-rr-file-import"></i>
	                            </div>
	                          </>
	                        )}
	                        <div
	                          className="sample-csv"
	                          onClick={() => {
	                            exportCsv();
	                            csvRef.click();
	                          }}
	                          role="button"
	                          tabIndex={0}
	                        >
	                          <h6>Export CSV:</h6>
	                          <i className="fi fi-rr-file-download"></i>
	                        </div>
	                      </div>
	                    }
                    trigger="click"
                  >
                    <div style={{ cursor: "pointer" }}>
                      <label>
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                      </label>
                    </div>
                  </Popover>
                </div>
              </div>
            )}

            {isLoadingTasksPage || isTasksLoading ? (
              <div className="wm-kanban-skeleton">
                {/* Toolbar skeleton */}
                <div className="wm-skel-toolbar">
                  <div className="wm-skel-line" style={{ width: 220, height: 32, borderRadius: 8 }} />
                  <div className="wm-skel-line" style={{ width: 36, height: 32, borderRadius: 8 }} />
                  <div className="wm-skel-line" style={{ width: 80, height: 32, borderRadius: 8, marginLeft: "auto" }} />
                </div>
                {/* Kanban columns */}
                <div className="wm-skel-columns">
                  {[
                    { color: "#3b82f6", cards: 4 },
                    { color: "#f59e0b", cards: 3 },
                    { color: "#10b981", cards: 5 },
                    { color: "#8b5cf6", cards: 2 },
                    { color: "#ef4444", cards: 3 },
                  ].map((col, ci) => (
                    <div key={ci} className="wm-skel-col" style={{ "--skel-border": col.color }}>
                      {/* Column header */}
                      <div className="wm-skel-col-head">
                        <div className="wm-skel-line" style={{ width: 90, height: 13 }} />
                        <div className="wm-skel-badge" />
                      </div>
                      {/* Cards */}
                      <div className="wm-skel-col-body">
                        {Array.from({ length: col.cards }).map((_, ki) => (
                          <div key={ki} className="wm-skel-card">
                            <div className="wm-skel-line wm-skel-card-title" />
                            <div className="wm-skel-line wm-skel-card-sub" />
                            <div className="wm-skel-line wm-skel-card-date" />
                            <div className="wm-skel-card-footer">
                              <div className="wm-skel-avatar" />
                              <div className="wm-skel-line" style={{ width: 40, height: 10 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : projectMianTask.length === 0 ? (
              <div className="error-message">
                <p>No Data</p>
              </div>
            ) : !hasVisibleTasks ? (
              <div className="error-message">
                <p>No task found</p>
              </div>
            ) : null}
            {isLoadingTasksPage || isTasksLoading || projectMianTask.length === 0 ? null : selectedView === "board" ? (
              <TaskList
                updateTaskDraftStatus={updateTaskDraftStatus}
                updateBoardTaskLocally={updateBoardTaskLocally}
                checkTaskDrafts={""}
                boardTasks={boardTasks}
                tasks={filteredBoardTasks}
                showEditTaskModal={showEditTaskModal}
                showModalTaskModal={showModalTaskModal}
                getBoardTasks={getBoardTasks}
                selectedTask={selectedTask}
                deleteTasks={deleteTasks}
                getProjectMianTask={getProjectMianTask}
                projectDetails={projectDetails}
                isEditTaskSave={isEditTaskSave}
                setEditTaskSave={setEditTaskSave}
              />
            ) : selectedView === "gantt" ? (
              <TasksGanttView
                tasks={filteredBoardTasks}
                onTaskClick={(task) => showEditTaskModal(task, task?._stId || task?.task_status?._id || task?.task_status)}
              />
            ) : (
              <TasksTableView
                updateBoardTaskLocally={updateBoardTaskLocally}
                tasks={filteredBoardTasks}
                showEditTaskModal={showEditTaskModal}
                showModalTaskModal={showModalTaskModal}
                getBoardTasks={getBoardTasks}
                selectedTask={selectedTask}
                deleteTasks={deleteTasks}
                getProjectMianTask={getProjectMianTask}
                projectDetails={projectDetails}
                isEditTaskSave={isEditTaskSave}
              />
            )}
          </div>
        </div>
      </div>

      <Modal
        open={isModalOpenList}
        onCancel={handleCancelList}
        onOk={handleOkList}
        title={modalMode === "add" ? "Add List" : "Edit List"}
        className="add-task-modal add-list-modal"
        width={1000}
        footer={[
          <Button
            key="cancel"
            onClick={handleCancelList}
            className="delete-btn"
            size="large"
            disabled={isSavingList}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            className="square-primary-btn"
            size="large"
            onClick={() => listForm.submit()}
            loading={isSavingList}
            disabled={isSavingList}
          >
            Save
          </Button>,
        ]}
      >
        <div className="overview-modal-wrapper">
          <Form
            form={listForm}
            layout="vertical"
            initialValues={{ markAsPrivate: false }}
            onFinish={(values) => {
              modalMode === "add"
                ? addProjectMainTask(values)
                : editProjectmainTask(values);
            }}
          >
            <Row gutter={[0, 0]}>
              {/* Title Field */}
              <Col xs={24} sm={24} md={24} lg={24}>
                <Form.Item
                  label="Title"
                  name="title"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter a valid title",
                    },
                  ]}
                >
                  <Input placeholder="Enter title" size="large" />
                </Form.Item>
              </Col>

              {/* Subscribers */}
              <Col xs={24} sm={24} md={12} lg={12}>
                <Form.Item
                  label={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span>Subscribers</span>
                      <Button
                        type="link"
                        style={{ padding: 0, height: "auto" }}
                        onClick={openAddSubscriberModal}
                      >
                        + Add subscriber
                      </Button>
                    </div>
                  }
                  className="subscriber-section"
                >
                  <MultiSelect
                    onSearch={handleListSubscriberSearch}
                    onChange={handleSubscribersChange}
                    values={selectSubscriber}
                    listData={subscribersDropdownData}
                    search={listSubscriberSearch}
                  />

                  {selectSubscriber.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Button
                        className="list-clear-btn ant-delete"
                        onClick={() => setSelectSubscribers([])}
                        size="small"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </Form.Item>
              </Col>

              {/* Client */}
              <Col xs={24} sm={24} md={12} lg={12}>
                <Form.Item
                  label={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span>Client</span>
                      <Button
                        type="link"
                        style={{ padding: 0, height: "auto" }}
                        onClick={() => setIsAddClientModalOpen(true)}
                      >
                        + Add client
                      </Button>
                    </div>
                  }
                  className="client-section"
                >
                  <MultiSelect
                    onSearch={setListClientSearch}
                    onChange={handleListClientChange}
                    values={
                      selectedListClient
                        ? selectedListClient.map((item) => item?._id)
                        : []
                    }
                    listData={clientsList}
                    search={listClientSearch}
                  />

                  {selectedListClient && selectedListClient.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Button
                        className="list-clear-btn ant-delete"
                        onClick={() => setSelectedListClient([])}
                        size="small"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </Form.Item>
              </Col>

              {/* Dynamic Subscriber Stages */}
              {selectSubscriber.length > 0 && (
                <Col xs={24} sm={24} md={24} lg={24}>
                  <div className="subscriber-stages-section">
                    <h4
                      style={{
                        marginBottom: 16,
                        color: "#666",
                        fontSize: "16px",
                        fontWeight: 500,
                      }}
                    >
                      Assign Stages to Subscribers
                    </h4>
                    <Row gutter={[16, 16]}>
                      {selectSubscriber.map((subscriberId, index) => {
                        const subscriber = subscribersDropdownData.find(
                          (item) => item?._id === subscriberId
                        );

                        return (
                          <Col xs={24} sm={12} md={8} lg={8} key={index}>
                            <div className="subscriber-stage-card">
                              {/* Subscriber Info */}
                              <div className="subscriber-info">
                                <MyAvatar
                                  userName={subscriber?.full_name}
                                  key={subscriber?.full_name}
                                  alt={subscriber?.full_name}
                                  src={subscriber?.emp_img}
                                  size="default"
                                />
                                <span className="subscriber-name">
                                  {removeTitle(subscriber?.full_name)}
                                </span>
                              </div>

                              {/* Stage Selection */}
                              <Form.Item
  label="Stage"
  name={["subscriber_stages", index]}
  className="stage-select-item"
  initialValue={defaultStageId} // Add this
  rules={[
    {
      required: true,
      message: "Please select a stage",
    },
  ]}
>
  <Select
    size="large"
    placeholder="Select Stage"
    showSearch
    filterOption={(input, option) =>
      String(option?.children || "")
        .toLowerCase()
        .includes(input.toLowerCase())
    }
    filterSort={(optionA, optionB) =>
      String(optionA?.children || "")
        .toLowerCase()
        .localeCompare(String(optionB?.children || "").toLowerCase())
    }
    onDropdownVisibleChange={(open) => {
      if (!open || !stagesId) return;
      // Keep both in sync; some flows rely on local state
      dispatch(getSpecificProjectWorkflowStage(stagesId));
      getListWorkflowStatus();
    }}
  >
    {listStageOptions.map((item, stageIndex) => (
      <Option
        key={item?._id || stageIndex}
        value={item?._id}
        style={{ textTransform: "capitalize" }}
      >
        {item?.title || item?.name || "-"}
      </Option>
    ))}
  </Select>
</Form.Item>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                </Col>
              )}
              <Col xs={24} sm={24} md={12} lg={12}>
                <Form.Item
                  key="checkbox"
                  name="markAsPrivate"
                  valuePropName="checked"
                >
                  <Checkbox>Mark as Private</Checkbox>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>

      <Modal
        open={isAddSubscriberModalOpen}
        onCancel={() => {
          setIsAddSubscriberModalOpen(false);
          addSubscriberForm.resetFields();
        }}
        title="Add Subscriber"
        width={720}
        className="add-task-modal add-subscriber-from-list-modal"
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsAddSubscriberModalOpen(false);
              addSubscriberForm.resetFields();
            }}
            size="large"
            className="square-outline-btn ant-delete"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            className="square-primary-btn"
            loading={creatingSubscriber}
            onClick={() => addSubscriberForm.submit()}
          >
            Add
          </Button>,
        ]}
      >
        <Form
          form={addSubscriberForm}
          layout="vertical"
          initialValues={{ status: "Active" }}
          onFinish={createSubscriberFromListModal}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="First name"
                name="first_name"
                rules={[{ required: true, message: "First name is required" }]}
              >
                <Input size="large" placeholder="First name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Last name"
                name="last_name"
                rules={[{ required: true, message: "Last name is required" }]}
              >
                <Input size="large" placeholder="Last name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input size="large" placeholder="Email" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Role"
                name="pmsRoleId"
                rules={[{ required: true, message: "Role is required" }]}
              >
                <Select
                  size="large"
                  placeholder="Select role"
                  loading={subscriberRolesLoading}
                  showSearch
                  optionFilterProp="children"
                >
                  {(subscriberRoles || [])
                    .filter((r) => r?._id)
                    .map((r) => (
                      <Option key={r?._id} value={r?._id}>
                        {r?.role_name || r?.name || r?.title || "-"}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: "Password is required" }]}
              >
                <Input.Password size="large" placeholder="Password" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Status"
                name="status"
                rules={[{ required: true, message: "Status is required" }]}
              >
                <Select size="large" placeholder="Status">
                  <Option value="Active">Active</Option>
                  <Option value="Inactive">Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        open={isAddClientModalOpen}
        onCancel={() => {
          setIsAddClientModalOpen(false);
          addClientForm.resetFields();
        }}
        title="Add Client"
        width={720}
        className="add-task-modal add-client-from-list-modal"
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsAddClientModalOpen(false);
              addClientForm.resetFields();
            }}
            size="large"
            className="square-outline-btn ant-delete"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            className="square-primary-btn"
            loading={creatingClient}
            onClick={() => addClientForm.submit()}
          >
            Add
          </Button>,
        ]}
      >
        <Form
          form={addClientForm}
          layout="vertical"
          initialValues={{ status: "Active" }}
          onFinish={createClientFromListModal}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="First name"
                name="first_name"
                rules={[{ required: true, message: "First name is required" }]}
              >
                <Input size="large" placeholder="First name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Last name"
                name="last_name"
                rules={[{ required: true, message: "Last name is required" }]}
              >
                <Input size="large" placeholder="Last name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Company name"
                name="company_name"
                rules={[{ required: true, message: "Company name is required" }]}
              >
                <Input size="large" placeholder="Company" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input size="large" placeholder="Email" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Phone" name="phone_number">
                <Input size="large" placeholder="Phone (optional)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Password"
                name="plain_password"
                rules={[{ required: true, message: "Password is required" }]}
              >
                <Input.Password size="large" placeholder="Password" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Status"
                name="status"
                rules={[{ required: true, message: "Status is required" }]}
              >
                <Select size="large" placeholder="Status">
                  <Option value="Active">Active</Option>
                  <Option value="Inactive">Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item label="Extra details" name="extra_details">
                <Input.TextArea rows={3} placeholder="Notes (optional)" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Add Task"
        open={isModalOpenTaskModal}
        onCancel={handleCancelTaskModal}
        className="add-task-modal edit-details-task-model"
        width={1000}
        footer={[
          <Button
            key="cancel"
            onClick={handleCancelTaskModal}
            size="large"
            className="square-outline-btn ant-delete"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            className="square-primary-btn"
            onClick={() => addform.submit()}
          >
            Save
          </Button>,
        ]}
      >
        <div className="overview-modal-wrapper task-overview-modal-wrapper">
          <Form
            form={addform}
            layout="vertical"
            onFinish={(values) => {
              handleTaskOps(values);
            }}
          >
            <Row gutter={[0, 0]}>
              {/* Task Title - Full width */}
              <Col xs={24} sm={24} md={24} lg={24}>
                <Form.Item
                  label="Title"
                  name="title"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter a valid title",
                    },
                  ]}
                >
                  <Input placeholder="Title" size="large" />
                </Form.Item>
              </Col>

              {/* Description - Full width */}
              <Col xs={24} sm={24} md={24} lg={24}>
                <Form.Item label="Description" name="descriptions" rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter a descriptions",
                    },
                  ]}>
                  <CKEditor
                    editor={Custombuild}
                    data={editorData}
                    onChange={handleChangeData}
                    onPaste={handlePaste}
                    config={{
                      toolbar: [
                        "heading",
                        "|",
                        "bold",
                        "italic",
                        "underline",
                        "|",
                        "fontColor",
                        "fontBackgroundColor",
                        "|",
                        "link",
                        "|",
                        "numberedList",
                        "bulletedList",
                        "|",
                        "alignment:left",
                        "alignment:center",
                        "alignment:right",
                        "|",
                        "fontSize",
                        "|",
                        "print",
                      ],
                      fontSize: {
                        options: [
                          "default",
                          1,
                          2,
                          3,
                          4,
                          5,
                          6,
                          7,
                          8,
                          9,
                          10,
                          11,
                          12,
                          13,
                          14,
                          15,
                          16,
                          17,
                          18,
                          19,
                          20,
                          21,
                          22,
                          23,
                          24,
                          25,
                          26,
                          27,
                          28,
                          29,
                          30,
                          31,
                          32,
                        ],
                      },
                      styles: {
                        height: "10px",
                      },
                    }}
                  />
                </Form.Item>
              </Col>

              <Form.Item>
                <Col xs={24} sm={24} md={24} lg={24}>
                  <div className="table-schedule-wrapper">
                    <ul>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            <DatePicker
                              value={
                                addInputTaskData?.start_date &&
                                dayjs(
                                  addInputTaskData?.start_date,
                                  "YYYY-MM-DD"
                                )
                              }
                              placeholder="Start Date"
                              onChange={(date, dateString) =>
                                handleTaskInput("start_date", dateString)
                              }
                            />
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            <DatePicker
                              value={
                                addInputTaskData?.end_date &&
                                dayjs(addInputTaskData?.end_date, "YYYY-MM-DD")
                              }
                              placeholder="End Date"
                              onChange={(date, dateString) =>
                                handleTaskInput("end_date", dateString)
                              }
                              disabledDate={(current) =>
                                current &&
                                current <
                                  dayjs(
                                    addInputTaskData?.start_date,
                                    "YYYY-MM-DD"
                                  )
                              }
                            />
                          </div>
                        </div>
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rs-tags"></i>
                            <span className="schedule-label">Labels</span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <Select
                              value={addInputTaskData?.labels}
                              allowClear
                              placeholder="Select labels"
                              onChange={(value) =>
                                handleTaskInput("labels", value)
                              }
                            >
                              {projectLabels.map((item) => (
                                <Option
                                  key={item?._id}
                                  value={item?._id}
                                  style={{ textTransform: "capitalize" }}
                                >
                                  {item.title}
                                </Option>
                              ))}
                            </Select>
                          </div>
                        </div>
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-users"></i>
                            <span className="schedule-label">Assignees</span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <MultiSelect
                              onSearch={handleSearch}
                              onChange={handleSelectedItemsChange}
                              values={
                                selectedItems
                                  ? selectedItems.map((item) => item?._id)
                                  : []
                              }
                              listData={assigneesDropdownData}
                              search={searchKeyword}
                            />
                          </div>
                        </div>
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-clock"></i>
                            <span className="schedule-label">
                              Estimated Time
                              {!getRoles(["Client"]) && (
                                <span style={{ color: "red" }}>*</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <div className="estimated_time_input_container">
                              <div className="hours_min_container">
                                <Input
                                  min={0}
                                  value={estHrs}
                                  type="number"
                                  onChange={(e) =>
                                    handleEstTimeInput(
                                      "est_hrs",
                                      e.target.value
                                    )
                                  }
                                  className={`hours_input ${
                                    estHrsError && "error-border"
                                  }`}
                                  placeholder="Hours"
                                />
                                <div style={{ color: "red" }}>
                                  {estHrsError}
                                </div>
                              </div>
                              <div className="hours_min_container">
                                <Input
                                  min={0}
                                  max={59}
                                  type="number"
                                  value={estMins}
                                  onChange={(e) => {
                                    if (e.target.value * 1 > 60)
                                      return e.preventDefault();
                                    handleEstTimeInput(
                                      "est_mins",
                                      e.target.value
                                    );
                                  }}
                                  className={`hours_input ${
                                    estMinsError && "error-border"
                                  }`}
                                  placeholder="Minutes"
                                />
                                <div style={{ color: "red" }}>
                                  {estMinsError}
                                </div>
                              </div>
                            </div>
                            {!isAlterEstimatedTime && estTime && (
                              <div className="estimated_setTime_container">
                                <span
                                  onClick={() => setIsAlterEstimatedTime(true)}
                                  className="schedule-label"
                                >
                                  Estimated Time: {estTime}
                                </span>
                                <div className="est_time_crossIcon">
                                  <CloseCircleOutlined
                                    onClick={removeEstTIme}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-refresh"></i>
                            <span className="schedule-label">Recurring</span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <Select
                              value={addInputTaskData?.recurringType}
                              allowClear
                              onChange={(value) =>
                                handleTaskInput("recurringType", value)
                              }
                            >
                              <Option value="monthly" style={{ textTransform: "capitalize" }}>
                                Monthly
                              </Option>
                              <Option value="yearly" style={{ textTransform: "capitalize" }}>
                                Yearly
                              </Option>
                            </Select>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </Col>
              </Form.Item>

              <Col xs={24} sm={24} md={24} lg={24}>
                <div className="fileAttachment_container">
                  {fileAttachment.map((file, index) => (
                    <Badge
                      key={index}
                      count={
                        <CloseCircleOutlined
                          onClick={() => removeAttachmentFile(index, file)}
                        />
                      }
                    >
                      <div className="fileAttachment_Box">
                        <a
                          className="fileNameTxtellipsis"
                          href={`${process.env.REACT_APP_API_URL}/public/${file?.path}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {file.name.length > 15
                            ? `${file.name.slice(0, 15)}.....${file.file_type}`
                            : file.name + file.file_type}
                        </a>
                      </div>
                    </Badge>
                  ))}
                </div>
              </Col>
              <Col xs={24} sm={24} md={24} lg={24}>
                {fileAttachment.length > 0 && (
                  <div className="folder-comment">
                    <Form.Item
                      label="Folder"
                      name="folder"
                      initialValue={
                        foldersList.length > 0 ? foldersList[0]?._id : undefined
                      }
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <Select placeholder="Please Select Folder" showSearch>
                        {foldersList.map((data) => (
                          <Option
                            key={data?._id}
                            value={data?._id}
                            style={{ textTransform: "capitalize" }}
                          >
                            {data.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                )}
              </Col>

              <Col xs={24} sm={24}>
                <Tooltip key="attach" placement="top" title="Attached file">
                  <Button
                    className="link-btn"
                    onClick={() => attachmentfileRef.current.click()}
                    size="large"
                  >
                    <i className="fi fi-ss-link"></i> Attach files
                  </Button>
                </Tooltip>
              </Col>
              <Col xs={24} sm={24} md={12} lg={12}>
                <input
                  multiple
                  type="file"
                  accept="*"
                  onChange={onFileChange}
                  hidden
                  ref={attachmentfileRef}
                />
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>

      <TaskDetailModal
        open={isEditTaskModalOpen}
        onClose={() => {
          setIsEditTaskModalOpen(false);
          setSelectedTaskToView(null);
          handleCancelTaskModal();
        }}
        task={
          selectedTaskToView
            ? {
                ...selectedTaskToView,
                project:
                  selectedTaskToView?.project ||
                  (projectDetails?._id
                    ? { _id: projectDetails._id, title: projectDetails.title }
                    : selectedTaskToView?.project),
                mainTask:
                  selectedTaskToView?.mainTask ||
                  (selectedTask?._id
                    ? { _id: selectedTask._id, title: selectedTask.title }
                    : selectedTaskToView?.mainTask),
              }
            : selectedTaskToView
        }
        companySlug={companySlug}
        onOpenInProject={(url) => {
          window.location.href = url;
        }}
        onUpdateTask={async (updatedValues, uploadedFiles) => {
          try {
            const selectedTaskId = editTaskData?.id || updatedValues?._id;
            if (!selectedTaskId) throw new Error("missing_task_id");

            const taskLabels = Array.isArray(updatedValues?.taskLabels) ? updatedValues.taskLabels : [];
            const assignees = Array.isArray(updatedValues?.assignees) ? updatedValues.assignees : [];

            const existingAttachments = Array.isArray(updatedValues?.attachments) ? updatedValues.attachments : [];
            const normalizedExisting = existingAttachments
              .map((a) => ({
                file_name: a?.file_name || a?.name,
                file_path: a?.file_path || a?.path,
                _id: a?._id,
                file_type: a?.file_type,
              }))
              .filter((a) => a.file_name && a.file_path);

            const normalizedUploaded = Array.isArray(uploadedFiles)
              ? uploadedFiles
                  .map((a) => ({
                    file_name: a?.file_name || a?.name,
                    file_path: a?.file_path || a?.path,
                    _id: a?._id,
                    file_type: a?.file_type,
                  }))
                  .filter((a) => a.file_name && a.file_path)
              : [];

            const hasAttachmentsPayload = normalizedExisting.length > 0 || normalizedUploaded.length > 0;

            const updatedKeys = [
              "title",
              "descriptions",
              "task_labels",
              "start_date",
              "due_date",
              "assignees",
              "estimated_hours",
              "estimated_minutes",
              ...(hasAttachmentsPayload ? ["attachments"] : []),
              ...(editTaskData?.workflow_id ? ["task_status"] : []),
            ];

            const reqBody = {
              updated_key: updatedKeys,
              project_id: projectId,
              main_task_id: selectedTask?._id,
              title: (updatedValues?.title || "").trim(),
              descriptions: updatedValues?.descriptions || "",
              task_labels: taskLabels.filter(Boolean),
              assignees: assignees.filter(Boolean),
              ...(editTaskData?.workflow_id ? { task_status: editTaskData.workflow_id } : {}),
              estimated_hours: estHrs && estHrs !== "" ? String(estHrs) : "00",
              estimated_minutes: estMins && estMins !== "" ? String(estMins) : "00",
              start_date: updatedValues?.start_date || null,
              due_date: updatedValues?.due_date || null,
              ...(hasAttachmentsPayload ? { attachments: [...normalizedExisting, ...normalizedUploaded] } : {}),
            };

            dispatch(showAuthLoader());
            const response = await Service.makeAPICall({
              methodName: Service.putMethod,
              api_url: `${Service.taskPropUpdation}/${selectedTaskId}`,
              body: reqBody,
            });
            dispatch(hideAuthLoader());

            if (response?.data?.status) {
              message.success(response.data.message || "Task updated");
              await getBoardTasks(selectedTask?._id);
            } else {
              message.error(response?.data?.message || "Failed to update task");
              return false;
            }
            return true;
          } catch (e) {
            console.error("Update failed", e);
            dispatch(hideAuthLoader());
            return false;
          }
        }}
      />

      <Modal
        title={null}
        open={isCopyModalOpen}
        footer={null}
        onCancel={() => {
          setIsCopyModalOpen(false);
          copyTaskList.resetFields();
        }}
        className="copy-task-modal add-list-modal"
      >
        <div className="modal-header">
          <h1>Copy tasklist</h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form form={copyTaskList} onFinish={handleCopyTaskList}>
            <div className="topic-cancel-wrapper task-list-pop-wrapper">
              <Form.Item name="title">
                <Input
                  value={copyTaskListData.title}
                  placeholder="Title"
                  onChange={handleFieldChange}
                />
              </Form.Item>
              <Form.Item className="subscriber-btn" name="project_title">
                <Input
                  value={copyTaskListData.project_title}
                  placeholder="Project Title"
                  onChange={handleFieldChange}
                  disabled={true}
                />
              </Form.Item>
              <h2>Copy:</h2>
              <div className="coppy-task-data">
                <Form.Item name="task_status" valuePropName="checked">
                  <Checkbox
                    name="task_status"
                    checked={copyTaskListData.task_status}
                    onChange={handleFieldChange}
                  >
                    Task Stages
                  </Checkbox>
                </Form.Item>
              </div>

              <Form.Item name="subs_assignee" valuePropName="checked">
                <Checkbox
                  name="subs_assignee"
                  onChange={handleFieldChange}
                  checked={copyTaskListData.subs_assignee}
                >
                  Subscribers/Assignees
                </Checkbox>
              </Form.Item>

              <Form.Item name="clients" valuePropName="checked">
                <Checkbox
                  name="clients"
                  onChange={handleFieldChange}
                  checked={copyTaskListData.clients}
                >
                  Clients
                </Checkbox>
              </Form.Item>

              <Form.Item name="dates" valuePropName="checked">
                <Checkbox
                  name="dates"
                  onChange={handleFieldChange}
                  checked={copyTaskListData.dates}
                >
                  Dates
                </Checkbox>
              </Form.Item>

              <Form.Item name="comments" valuePropName="checked">
                <Checkbox
                  name="comments"
                  onChange={handleFieldChange}
                  checked={copyTaskListData.comments}
                >
                  Comments
                </Checkbox>
              </Form.Item>
            </div>
            <div className="modal-footer-flex">
              <div className="flex-btn">
                <Button
                  type="primary"
                  className="square-primary-btn"
                  htmlType="submit"
                  onClick={() => {
                    setIsCopyModalOpen(false);
                  }}
                >
                  Save
                </Button>
                <Button
                  className="square-outline-btn ant-delete"
                  onClick={() => {
                    setIsCopyModalOpen(false);
                    copyTaskList.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
};

export default TasksPMS;
