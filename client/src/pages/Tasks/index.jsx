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
  Spin,
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
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
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
  setData,
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
import getRoleLabel from "../../util/roleLabels";
import taskCSV from "../../../src/taskCSV.csv";
import "./style.css";
import "../TaskPage/TaskDetailModal.css";
import AddTaskModal from "./AddTaskModal";
import CommonTaskFormModal from "./CommonTaskFormModal";

function stageBadgeColor(title, fallback) {
  const t = String(title || "").toLowerCase();
  const compact = t.replace(/[\s_-]+/g, "");
  if (compact.includes("todo")) return "#64748b";
  if (t.includes("progress")) return "#ef4444";
  if (t.includes("hold") || t.includes("review")) return "#3b82f6";
  if (t.includes("done") || t.includes("complete") || t.includes("closed")) return "#22c55e";
  return fallback || "#64748b";
}

function normalizeStageKey(title) {
  const t = String(title || "").toLowerCase();
  const compact = t.replace(/[\s_-]+/g, "");
  if (compact.includes("todo")) return "todo";
  if (compact.includes("inprogress") || t.includes("progress")) return "inprogress";
  if (compact.includes("onhold") || t.includes("hold")) return "onhold";
  if (t.includes("done") || t.includes("complete") || t.includes("closed")) return "done";
  return "";
}

function getStageColumnKey(title) {
  const normalizedDefault = normalizeStageKey(title);
  if (normalizedDefault) return normalizedDefault;
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");
}

function getStageDisplayKey(status = {}) {
  const title =
    status?.title ||
    status?.name ||
    status ||
    "";
  const key = getStageColumnKey(title);
  if (key) return key;
  return String(status?._id || status?.id || "").trim();
}
const DEFAULT_STAGE_KEYS = new Set(["todo", "inprogress", "onhold", "done"]);

const { Search } = Input;

const normalizeMainTaskListResponse = (data) => {
  if (Array.isArray(data)) return data;
  return data ? [data] : [];
};

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
  const [, setStageHeaderSaving] = useState(false);
  const [addTaskModalSessionKey, setAddTaskModalSessionKey] = useState(0);
  const [modalInitialStatusId, setModalInitialStatusId] = useState(null);
  const [projectMianTask, setProjectMianTask] = useState([]);
  const [boardTasks, setBoardTasks] = useState([]);
  /** When set, `boardTasks` was last loaded for this main-task (phase) id — used for sidebar totals. */
  const [boardSnapshotListId, setBoardSnapshotListId] = useState(null);
  const lastBoardFetchListIdRef = useRef(null);
  const [selectedTask, setSelectedTask] = useState({});
  const [addInputTaskData, setAddInputTaskData] = useState({});
  const [isAlterEstimatedTime, setIsAlterEstimatedTime] = useState(false);
  const [estHrs, setEstHrs] = useState("");
  const [estMins, setEstMins] = useState("");
  const [estTime, setEstTime] = useState("");
  /** Initial shell: hide only after phase lists + board (when applicable) have been fetched. */
  const [taskListsHydrated, setTaskListsHydrated] = useState(false);
  const [boardHydrated, setBoardHydrated] = useState(false);
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
  const suppressNextBoardReloadRef = useRef(false);
  const lastApplyRef = useRef(0);
  const locallyCreatedTaskIdRef = useRef(null);
  const skipNextLocalTaskCreatedEventRef = useRef(false);

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
        .catch(() => { });
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
    workflowStatusList?.[0]?._id ||
    "todo";

  const currentListWorkflowId = useMemo(() => {
    const currentList =
      (Array.isArray(projectMianTask) ? projectMianTask : []).find((item) => item?._id === listID) ||
      selectedTask ||
      editList;

    const candidates = [
      currentList?.workflows?._id,
      currentList?.workflow?._id,
      currentList?.workFlow?._id,
      currentList?.workflows,
      currentList?.workflow,
      currentList?.workFlow,
      stagesId,
    ];

    return candidates.find((value) => typeof value === "string" && value.trim()) || "";
  }, [editList, listID, projectMianTask, selectedTask, stagesId]);

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
        setSubscriberRoles(response.data.data.filter((r) => r.role_name !== "AM")); // AM role hidden
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

  const resolveWorkflowId = useCallback((project = {}) => {
    const candidates = [
      project?.workFlow?._id,
      project?.workflow?._id,
      project?.work_flow?._id,
      project?.workFlow,
      project?.workflow,
      project?.work_flow,
      project?.workflow_id,
      project?.work_flow_id,
    ];

    return candidates.find((value) => typeof value === "string" && value.trim()) || "";
  }, []);

  const fetchWorkflowStagesById = useCallback(
    async () => {
      try {
        const aggregated = [];
        let pageNo = 1;
        const limit = 200;
        let total = 0;

        do {
          const query = new URLSearchParams({
            pageNo: String(pageNo),
            limit: String(limit),
            search: "",
          }).toString();
          const response = await Service.makeAPICall({
            methodName: Service.getMethod,
            api_url: `${Service.listWorkflowStages}?${query}`,
          });
          const list = Array.isArray(response?.data?.data) ? response.data.data : [];
          const meta = response?.data?.metaData || response?.data?.metadata || {};
          total = Number(meta?.total || list.length || 0);
          aggregated.push(...list);
          pageNo += 1;
          if (list.length === 0) break;
        } while (aggregated.length < total);

        const stages = aggregated
          .map((stage) => ({
            ...stage,
            _id: stage?._id || stage?.id,
          }))
          .filter((stage) => Boolean(stage?._id))
          .filter((stage, index, arr) => {
            const id = String(stage?._id || "");
            return arr.findIndex((row) => String(row?._id || "") === id) === index;
          })
          .sort((a, b) => Number(a?.sequence || 0) - Number(b?.sequence || 0));

        setWorkflowStatusList(stages);
        return stages;
      } catch (error) {
        setWorkflowStatusList((prev) => (Array.isArray(prev) ? prev : []));
        return [];
      }
    },
    [dispatch]
  );

  const fetchStageOptionsFromBoard = useCallback(
    async (mainTaskId) => {
      if (!projectId || !mainTaskId) return [];

      try {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectBoardTasks,
          body: {
            project_id: projectId,
            main_task_id: mainTaskId,
          },
        });

        const columns = Array.isArray(response?.data?.data) ? response.data.data : [];
        return columns
          .map((column) => {
            const workflowStatus = column?.workflowStatus || column?.workflow_status || {};
            const id = workflowStatus?._id || workflowStatus?.id;
            const title = workflowStatus?.title || workflowStatus?.name || column?.title || "";
            return id ? { _id: id, id, title } : null;
          })
          .filter(Boolean);
      } catch (error) {
        return [];
      }
    },
    [projectId]
  );

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
        const workflowId = resolveWorkflowId(project);

        setProjectDetails(project);
        setStagesId(workflowId);
        if (workflowId) {
          fetchWorkflowStagesById(workflowId);
        }
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
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
      setIsTaskUpdating(false);
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
        task_status: boardTasks?.length > 0 ? boardTasks[0].workflowStatus._id : undefined,
        estimated_hours: estHrs !== "" && estHrs !== null && estHrs !== undefined ? estHrs : "00",
        estimated_minutes: estMins !== "" && estMins !== null && estMins !== undefined ? estMins : "00",

        task_progress: "0",
        recurringType: addInputTaskData?.recurringType || "",

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
        const createdTask = response.data.data;
        const currentListId =
          createdTask?.mainTask?._id ||
          createdTask?.main_task_id?._id ||
          createdTask?.main_task_id ||
          selectedTask?._id;

        await emitEvent(socketEvents.ADD_TASK_ASSIGNEE, createdTask);
        handleCancelTaskModal();
        await getProjectMianTask("", false, { silent: true });
        if (currentListId) {
          await getBoardTasks(currentListId);
        }
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
        estimated_hours: estHrs && estHrs !== "" ? estHrs : "00",
        estimated_minutes: estMins && estMins !== "" ? estMins : "00",
        start_date: addInputTaskData.start_date
          ? addInputTaskData.start_date
          : null,
        due_date: addInputTaskData.end_date ? addInputTaskData.end_date : null,
        pms_clients: selectedClients.map((item) => item._id),
        recurringType: addInputTaskData?.recurringType || "",

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

  const getBoardTasks = async (main_task_id, { silent = false } = {}) => {
    try {
      if (String(lastBoardFetchListIdRef.current || "") !== String(main_task_id || "")) {
        lastBoardFetchListIdRef.current = main_task_id;
        setBoardSnapshotListId(null);
      }
      if (!silent) {
        setIsTasksLoading(true);
      }
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
        setBoardSnapshotListId(String(main_task_id || ""));
        setBoardHydrated(true);
        if (!silent) {
          setIsTasksLoading(false);
        }
        // Avoid a second full-board render during silent refreshes (e.g. create task).
        if (!silent) {
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
        }
      } else {
        message.error(response.data.message);
        setBoardHydrated(true);
        if (!silent) {
          setIsTasksLoading(false);
        }
      }
    } catch (error) {
      console.log(error);
      setBoardHydrated(true);
      if (!silent) {
        setIsTasksLoading(false);
      }
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

    const isPopulatedArray = (arr) =>
      Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null && "_id" in arr[0];

    setBoardTasks((prevBoards) =>
      prevBoards.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) =>
          task._id === updatedTask._id
            ? {
              ...task,
              ...updatedTask,
              task_labels:
                isPopulatedArray(updatedTask.task_labels)
                  ? updatedTask.task_labels
                  : task.task_labels,
              assignees:
                isPopulatedArray(updatedTask.assignees)
                  ? updatedTask.assignees
                  : task.assignees,
              subscribers:
                isPopulatedArray(updatedTask.subscribers)
                  ? updatedTask.subscribers
                  : task.subscribers,
              attachments:
                Array.isArray(updatedTask.attachments) && updatedTask.attachments.length > 0
                  ? updatedTask.attachments
                  : task.attachments,
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


  const moveBoardTaskLocally = useCallback((taskId, nextStatusId, nextStatusPatch = {}) => {
    if (!taskId || !nextStatusId) return;

    setBoardTasks((prevBoards) => {
      if (!Array.isArray(prevBoards) || prevBoards.length === 0) return prevBoards;

      let movedTask = null;
      const strippedBoards = prevBoards.map((column) => {
        const remainingTasks = [];

        (column?.tasks || []).forEach((task) => {
          if (task?._id === taskId) {
            movedTask = {
              ...task,
              _stId: nextStatusId,
              task_status:
                typeof task.task_status === "object" && task.task_status !== null
                  ? { ...task.task_status, ...nextStatusPatch, _id: nextStatusId }
                  : { ...nextStatusPatch, _id: nextStatusId },
            };
          } else {
            remainingTasks.push(task);
          }
        });

        return { ...column, tasks: remainingTasks };
      });

      if (!movedTask) return prevBoards;

      return strippedBoards.map((column) => {
        const columnStatusId = column?.workflowStatus?._id;
        if (columnStatusId !== nextStatusId) return column;

        return {
          ...column,
          tasks: [movedTask, ...(column?.tasks || [])],
        };
      });
    });
  }, []);

  const getProjectMianTask = async (taskID, selectionFalse, { silent = false } = {}) => {
    try {
      if (!silent) {
        setIsTasksLoading(true);
      }
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
      const mainTaskList = normalizeMainTaskListResponse(response?.data?.data);

      if (mainTaskList.length > 0) {
        const totalMainTasks =
          Number(response?.data?.metadata?.total) || mainTaskList.length;

        if (filterData?.isActive === true) {
          setPagination((prevPagination) => ({
            ...prevPagination,
            total: totalMainTasks,
          }));
        } else {
          setPagination({
            ...pagination,
            total: totalMainTasks,
          });
        }
        setProjectMianTask(mainTaskList);
        if (selectionFalse) {
          // Suppress the board reload that useEffect([listID, projectMianTask]) would trigger,
          // since the caller (addProjectMainTask) already loaded the board via getBoardTasks.
          suppressNextBoardReloadRef.current = true;
          const preservedListId =
            taskID ||
            listID ||
            selectedTask?._id ||
            mainTaskList[0]?._id;

          if (preservedListId) {
            const matchedList = mainTaskList.find(
              (item) => String(item?._id || "") === String(preservedListId)
            );
            if (matchedList) {
              setSelectedTask(matchedList);
            }
          }

          if (preservedListId) {
            getBoardTasks(preservedListId, { silent });
          }
          return;
        }
        if (!listID) {
          const searchParams = new URLSearchParams(location.search);
          searchParams.set("listID", mainTaskList[0]._id);
          history.push({
            pathname: window.location.pathname,
            search: searchParams.toString(),
          });
        }
        if (listID) return;
      } else {
        // When called after creating a list (selectionFalse=true), the server may
        // return empty due to a timing edge case — keep the optimistic state.
        if (!selectionFalse) {
          setSelectedTask(null);
          setProjectMianTask([]);
          setBoardTasks([]);
          setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
        }
        setBoardHydrated(true);
      }
    } catch (error) {
      console.log(error);
      if (!silent) {
        setBoardHydrated(true);
      }
    } finally {
      if (!silent) {
        setIsTasksLoading(false);
        setTaskListsHydrated(true);
      }
    }
  };

  const refreshProjectMainTasks = useCallback(
    async ({ suppressBoardReload = false } = {}) => {
      if (suppressBoardReload) {
        suppressNextBoardReloadRef.current = true;
      }
      await getProjectMianTask("", false, { silent: true });
    },
    [getProjectMianTask]
  );

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

  useEffect(() => {
    if (!html?.html) return;
    const exportButton = document.getElementById("test-table-xls-button");
    if (exportButton && typeof exportButton.click === "function") {
      exportButton.click();
    }
  }, [html]);

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
        // setIsprivate(response.data.data.isPrivateList);
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

  const showModalTaskModal = (statusId = null) => {
    if (projectMianTask.length === 0) {
      return message.error("Please add Tasklist first");
    }
    setModalInitialStatusId(typeof statusId === "string" ? statusId : null);
    setAddTaskModalSessionKey((prev) => prev + 1);
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
      const response = await fetchWorkflowStagesById();
      dispatch(hideAuthLoader());
      if (Array.isArray(response) && response.length > 0) {
        setWorkflowStatusList(response);
      }
    } catch (error) {
      console.log(error);
    } finally {
      dispatch(hideAuthLoader());
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
      const subscriberStages = await buildSubscriberStagesForSubmit(values);
      const reqBody = {
        title: values.title.trim(),
        project_id: projectId,
        subscriber_stages: subscriberStages || [],
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
        const createdList = response?.data?.data;
        // if (createdListId) {
        //   // suppressNextBoardReloadRef.current = true;
        //   setSelectedTask(createdList);
        //   setProjectMianTask((prev) => {
        //     const currentList = Array.isArray(prev) ? prev : [];
        //     const remainingLists = currentList.filter(
        //       (item) => String(item?._id || "") !== String(createdListId)
        //     );
        //     return [createdList, ...remainingLists];
        //   });
        //   setTaskListsHydrated(true);
        //   // setBoardHydrated(false);

        //   const searchParams = new URLSearchParams(location.search);
        //   searchParams.set("listID", createdListId);
        //   history.push({
        //     pathname: window.location.pathname,
        //     search: searchParams.toString(),
        //   });

        //   await getBoardTasks(createdListId, { silent: true });
        // }
        // AFTER
        if (createdListId) {
          setSelectedTask(createdList);
          setProjectMianTask((prev) => {
            const currentList = Array.isArray(prev) ? prev : [];
            const remainingLists = currentList.filter(
              (item) => String(item?._id || "") !== String(createdListId)
            );
            return [createdList, ...remainingLists];
          });

          const searchParams = new URLSearchParams(location.search);
          searchParams.set("listID", createdListId);
          history.push({
            pathname: window.location.pathname,
            search: searchParams.toString(),
          });
        }
        // AFTER:
        handleCancelList();
        setOpenStatus(false);
        setOpenAssignees(false);
        setIsPopoverVisibleView(false);
        setOpenLabels(false);
        await getProjectMianTask("", true);
        if (createdListId) {
          await getBoardTasks(createdListId, { silent: true });
        }
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
      if (response?.data?.statusCode === 200 && response?.data?.status) {
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
      const subscriberStages = await buildSubscriberStagesForSubmit(values);
      const reqBody = {
        title: values.title.trim(),
        project_id: projectId,
        subscribers: selectSubscriber,
        subscriber_stages: subscriberStages || [],
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

  const showEditTaskModal = async (data, workflowID) => {
    const taskId = data?._id;
    const fallbackProjectId =
      projectId ||
      data?.project?._id ||
      data?.project_id ||
      selectedTask?.project?._id ||
      selectedTask?.project_id;
    const fallbackMainTaskId =
      selectedTask?._id ||
      listID ||
      data?.mainTask?._id ||
      data?.main_task_id;

    let taskPayload = data;
    if (taskId && fallbackProjectId && fallbackMainTaskId) {
      try {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getTasks,
          body: {
            _id: taskId,
            project_id: fallbackProjectId,
            main_task_id: fallbackMainTaskId,
          },
        });
        if (response?.data?.status && response?.data?.data) {
          taskPayload = response.data.data;
        }
      } catch (error) {
        // Fallback to card payload if details fetch fails.
      }
    }

    setSelectedTaskToView(taskPayload);
    setIsEditTaskModalOpen(true);
    setEditTaskData({
      id: taskPayload?._id || data?._id,
      workflow_id:
        workflowID ||
        taskPayload?._stId ||
        taskPayload?.task_status?._id ||
        taskPayload?.task_status,
    });
  };

  const mapTaskToDynamicInitialValues = useCallback((task) => {
    if (!task) return {};
    const labelByTitle = new Map(
      (projectLabels || []).map((item) => [String(item?.title || "").trim().toLowerCase(), item?._id])
    );
    const assigneeByName = new Map(
      (assigneeOptions || []).map((item) => [String(item?.full_name || item?.name || "").trim().toLowerCase(), item?._id])
    );

    const normalizedLabels = (Array.isArray(task?.taskLabels) ? task.taskLabels : Array.isArray(task?.task_labels) ? task.task_labels : [])
      .map((item) => {
        if (typeof item === "object") return item?._id || labelByTitle.get(String(item?.title || "").trim().toLowerCase());
        const maybeId = String(item || "");
        return labelByTitle.get(maybeId.trim().toLowerCase()) || maybeId;
      })
      .filter(Boolean);

    const normalizedAssignees = (Array.isArray(task?.assignees) ? task.assignees : [])
      .map((item) => {
        if (typeof item === "object") return item?._id || assigneeByName.get(String(item?.full_name || item?.name || "").trim().toLowerCase());
        const maybeName = String(item || "");
        return assigneeByName.get(maybeName.trim().toLowerCase()) || maybeName;
      })
      .filter(Boolean);

    const normalizedDescription =
      task?.description ??
      task?.descriptions ??
      task?.custom_fields?.description ??
      task?.custom_fields?.descriptions ??
      "";

    return {
      _id: task?._id,
      title: task?.title || "",
      description: normalizedDescription,
      task_labels: normalizedLabels,
      assignees: normalizedAssignees,
      start_date: task?.start_date ? dayjs(task.start_date) : null,
      end_date: task?.due_date ? dayjs(task.due_date) : null,
      priority: task?.priority || "Low",
      recurringType: task?.recurringType || "",
      project_id:
        (typeof task?.project === "object" && task?.project?._id) ||
        task?.project_id ||
        projectId,
      main_task_id:
        (typeof task?.mainTask === "object" && task?.mainTask?._id) ||
        (typeof task?.main_task_id === "object" && task?.main_task_id?._id) ||
        task?.main_task_id ||
        selectedTask?._id,
      custom_fields: task?.custom_fields || {},
    };
  }, [projectId, selectedTask?._id, projectLabels, assigneeOptions]);

  const handleDynamicTaskUpdate = useCallback(
    async (values) => {
      try {
        const selectedTaskId = selectedTaskToView?._id || editTaskData?.id;
        if (!selectedTaskId) return;

        const payload = {
          updated_key: [
            "title",
            "descriptions",
            "task_labels",
            "start_date",
            "due_date",
            "assignees",
            "task_status",
            "priority",
            "custom_fields",
          ],
          project_id: projectId,
          main_task_id:
            values?.main_task_id ||
            selectedTask?._id ||
            (typeof selectedTaskToView?.mainTask === "object" && selectedTaskToView?.mainTask?._id) ||
            selectedTaskToView?.main_task_id,
          title: values?.title?.trim?.() || "",
          status: "active",
          descriptions: values?.description || "",
          task_labels: values?.task_labels || [],
          assignees: values?.assignees || [],
          task_status:
            editTaskData?.workflow_id ||
            selectedTaskToView?._stId ||
            selectedTaskToView?.task_status?._id ||
            selectedTaskToView?.task_status,
          start_date: values?.start_date || null,
          due_date: values?.end_date || null,
          priority: values?.priority || "Low",
          recurringType: values?.recurringType || "",
          custom_fields: values?.custom_fields || {},
        };

        const response = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: `${Service.taskPropUpdation}/${selectedTaskId}`,
          body: payload,
        });

        if (response?.data?.status) {
          message.success(response?.data?.message || "Task updated");
          setIsEditTaskModalOpen(false);
          setSelectedTaskToView(null);
          handleCancelTaskModal();
          if (selectedTask?._id) {
            getBoardTasks(selectedTask._id);
          } else {
            getProjectMianTask("", true);
          }
        } else {
          message.error(response?.data?.message || "Failed to update task");
        }
      } catch (error) {
        message.error("Failed to update task");
      }
    },
    [
      selectedTaskToView,
      editTaskData?.id,
      editTaskData?.workflow_id,
      projectId,
      selectedTask?._id,
      getBoardTasks,
      getProjectMianTask,
    ]
  );

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
    const totalTasks = Number(data?.totalTasks) || 0;
    const totalDoneTasks = Number(data?.totalDoneTasks) || 0;
    const percent = totalTasks > 0 ? (totalDoneTasks * 100) / totalTasks : 0;
    return {
      taskCount: `${totalDoneTasks}/${totalTasks}`,
      percent,
    };
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
    dispatch(moveWorkFlowTaskHandler([]));
    // Defer labels & employees — only needed when Add Task modal opens
    const t = setTimeout(() => {
      dispatch(getLables());
      dispatch(getEmployeeList());
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffectAfterMount(() => {
    const workflowId = currentListWorkflowId || stagesId;
    if (workflowId) {
      dispatch(getSpecificProjectWorkflowStage(workflowId));
    }
    getListWorkflowStatus();
    fetchWorkflowStagesById();
  }, [currentListWorkflowId, stagesId, fetchWorkflowStagesById]);

  useEffect(() => {
    if (!isModalOpenList) return;
    setListSubscriberSearch("");
    setListClientSearch("");

    // Always refresh dropdown data when the List modal opens
    if (projectId) dispatch(getSubscribersList(projectId));
    // Do NOT filter clients by project here — show full client master list
    dispatch(getClientList());

    if (!stagesId) getProjectByID();
    const workflowId = currentListWorkflowId || stagesId;
    if (workflowId) {
      dispatch(getSpecificProjectWorkflowStage(workflowId));
    }
    fetchWorkflowStagesById();

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
      .catch(() => { });
  }, [isModalOpenList, projectId, stagesId, currentListWorkflowId, dispatch, fetchWorkflowStagesById]);

  useEffect(() => {
    if (!isModalOpenList) return;

    const hasRealStageIds = [
      ...(Array.isArray(projectWorkflowStage) ? projectWorkflowStage : []),
      ...(Array.isArray(workflowStatusList) ? workflowStatusList : []),
    ].some((stage) => {
      const id = stage?._id || stage?.id;
      return typeof id === "string" && id.length > 8;
    });

    if (hasRealStageIds) return;

    const fallbackMainTaskId = listID || selectedTask?._id || projectMianTask?.[0]?._id;
    if (!fallbackMainTaskId) return;

    fetchStageOptionsFromBoard(fallbackMainTaskId).then((boardStages) => {
      if (!Array.isArray(boardStages) || boardStages.length === 0) return;
      setWorkflowStatusList(boardStages);
    });
  }, [
    dispatch,
    fetchStageOptionsFromBoard,
    isModalOpenList,
    listID,
    projectMianTask,
    projectWorkflowStage,
    selectedTask?._id,
    workflowStatusList,
  ]);

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
      .catch(() => { });
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
  // useEffect(() => {
  //   if (listID && projectMianTask.length > 0) {
  //     let data = projectMianTask.filter((ele) => listID === ele?._id);
  //     setSelectedTask(data[0]);
  //     getListWorkflowStatus();
  //     if (boardTasksInitiatedRef.current) {
  //       boardTasksInitiatedRef.current = false;
  //     } else if (suppressNextBoardReloadRef.current) {
  //       suppressNextBoardReloadRef.current = false;
  //     } else {
  //       getBoardTasks(listID);
  //     }
  //   }
  // }, [listID, projectMianTask]);
  // AFTER:
  useEffect(() => {
    if (listID && projectMianTask.length > 0) {
      let data = projectMianTask.filter((ele) => listID === ele?._id);
      if (!data[0]) return;  // <-- ADD THIS: don't clobber selectedTask if not found yet
      setSelectedTask(data[0]);
      getListWorkflowStatus();
      if (boardTasksInitiatedRef.current) {
        boardTasksInitiatedRef.current = false;
      } else if (suppressNextBoardReloadRef.current) {
        suppressNextBoardReloadRef.current = false;
      } else {
        getBoardTasks(listID);
      }
    }
  }, [listID, projectMianTask]);

  useEffect(() => {
    boardTasksInitiatedRef.current = false;
    setTaskListsHydrated(false);
    setBoardHydrated(false);
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

  useEffect(() => {
    const handleExternalTaskCreated = async (event) => {
      if (skipNextLocalTaskCreatedEventRef.current) {
        skipNextLocalTaskCreatedEventRef.current = false;
        return;
      }
      const createdTask = event?.detail?.task || {};
      const createdTaskId = createdTask?._id || createdTask?.id || null;
      if (createdTaskId && String(locallyCreatedTaskIdRef.current || "") === String(createdTaskId)) {
        locallyCreatedTaskIdRef.current = null;
        return;
      }
      const createdProjectId =
        createdTask?.project?._id ||
        createdTask?.project_id?._id ||
        createdTask?.project_id ||
        event?.detail?.projectId ||
        null;
      const createdMainTaskId =
        createdTask?.mainTask?._id ||
        createdTask?.main_task_id?._id ||
        createdTask?.main_task_id ||
        event?.detail?.mainTaskId ||
        null;

      if (createdProjectId && String(createdProjectId) !== String(projectId)) {
        return;
      }

      if (createdMainTaskId) {
        const activeListId = listID || selectedTask?._id;
        if (String(activeListId || "") === String(createdMainTaskId)) {
          await getBoardTasks(createdMainTaskId, { silent: true });
        }
      }

      await getProjectMianTask("", false, { silent: true });
    };

    window.addEventListener("weekmate:task-created", handleExternalTaskCreated);
    return () => {
      window.removeEventListener("weekmate:task-created", handleExternalTaskCreated);
    };
  }, [getProjectMianTask, projectId, listID, selectedTask?._id]);

  useEffectAfterMount(() => {
    getProjectMianTask();
  }, [searchText]);

  useEffectAfterMount(() => {
    getProjectByID();
  }, [flag]);


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
    const byDisplayKey = new Map();
    const sequenceByDisplayKey = new Map();

    (Array.isArray(workflowStatusList) ? workflowStatusList : []).forEach((ws, idx) => {
      const id = String(ws?._id || ws?.id || "").trim();
      if (!id) return;
      const title = ws?.title || ws?.name || "Untitled";
      const color = ws?.color || "";
      const displayKey = getStageDisplayKey(ws) || id;
      byDisplayKey.set(displayKey, {
        id,
        key: displayKey,
        title,
        color,
        badgeColor: stageBadgeColor(title, color),
        count: 0,
      });
      sequenceByDisplayKey.set(
        displayKey,
        Number.isFinite(Number(ws?.sequence)) ? Number(ws.sequence) : idx
      );
    });

    (Array.isArray(boardTasks) ? boardTasks : []).forEach((col, idx) => {
      const ws = col?.workflowStatus || col?.workflow_status || col?.status || {};
      const id = String(ws?._id || ws?.id || col?._id || "").trim();
      if (!id) return;
      const title = ws?.title || ws?.name || col?.title || "Untitled";
      const color = ws?.color || col?.color || "";
      const count = Array.isArray(col?.tasks) ? col.tasks.length : (col?.tasks_count || 0);
      const displayKey = getStageDisplayKey({ ...ws, title }) || id;
      const previous = byDisplayKey.get(displayKey);
      byDisplayKey.set(displayKey, {
        id: previous?.id || id,
        key: displayKey,
        title: previous?.title || title,
        color: previous?.color || color,
        badgeColor: stageBadgeColor(previous?.title || title, previous?.color || color),
        count: (previous?.count || 0) + Number(count || 0),
      });
      if (!sequenceByDisplayKey.has(displayKey)) {
        sequenceByDisplayKey.set(
          displayKey,
          Number.isFinite(Number(ws?.sequence)) ? Number(ws.sequence) : idx + 1000
        );
      }
    });

    return [...byDisplayKey.values()].sort(
      (a, b) =>
        Number(sequenceByDisplayKey.get(a.key) || 0) -
        Number(sequenceByDisplayKey.get(b.key) || 0)
    );
  }, [boardTasks, workflowStatusList]);

  const listStageOptions = useMemo(() => {
    const source =
      (Array.isArray(projectWorkflowStage) && projectWorkflowStage.length > 0
        ? projectWorkflowStage
        : Array.isArray(workflowStatusList) && workflowStatusList.length > 0
          ? workflowStatusList
          : []) || [];

    const byId = new Map();
    source.forEach((stage) => {
      const id = String(stage?._id || stage?.id || "").trim();
      if (!id) return;
      byId.set(id, {
        ...stage,
        _id: id,
        title: stage?.title || stage?.name || "Untitled",
      });
    });

    if (byId.size > 0) return [...byId.values()];
    return (stageTiles || []).map((tile) => ({ _id: tile.id, title: tile.title }));
  }, [projectWorkflowStage, stageTiles, workflowStatusList]);

  const fixedBoardTasks = useMemo(() => {
    const inputColumns = Array.isArray(boardTasks) ? boardTasks : [];
    const byDisplayKey = new Map();

    inputColumns.forEach((column) => {
      const workflowStatus =
        column?.workflowStatus || column?.workflow_status || column?.status || {};
      const stageId = workflowStatus?._id || workflowStatus?.id || column?._id || "";
      if (!stageId) return;
      const stageTitle = workflowStatus?.title || workflowStatus?.name || column?.title || "";
      const displayKey = getStageDisplayKey({ ...workflowStatus, title: stageTitle });
      if (!displayKey) return;
      const normalized = {
        ...column,
        _id: column?._id || stageId,
        workflowStatus: {
          ...workflowStatus,
          _id: stageId,
          title: stageTitle || "Untitled",
          color: workflowStatus?.color || column?.color || "#64748b",
        },
        tasks: Array.isArray(column?.tasks) ? [...column.tasks] : [],
      };

      if (!byDisplayKey.has(displayKey)) {
        byDisplayKey.set(displayKey, normalized);
        return;
      }

      const existing = byDisplayKey.get(displayKey);
      existing.tasks = [
        ...(Array.isArray(existing?.tasks) ? existing.tasks : []),
        ...(Array.isArray(normalized?.tasks) ? normalized.tasks : []),
      ];
    });

    const knownStages = [
      ...(Array.isArray(projectWorkflowStage) ? projectWorkflowStage : []),
      ...(Array.isArray(workflowStatusList) ? workflowStatusList : []),
    ]
      .filter((stage) => stage?._id || stage?.id)
      .filter((stage, index, arr) => {
        const id = String(stage?._id || stage?.id || "");
        return id && arr.findIndex((row) => String(row?._id || row?.id || "") === id) === index;
      })
      .sort((a, b) => Number(a?.sequence || 0) - Number(b?.sequence || 0));

    const orderedDisplayKeys = [];
    const orderedStageMeta = new Map();
    knownStages.forEach((stage) => {
      const stageId = String(stage?._id || stage?.id || "");
      if (!stageId) return;
      const stageTitle = stage?.title || stage?.name || "Untitled";
      const displayKey = getStageDisplayKey({ ...stage, title: stageTitle }) || stageId;
      if (!byDisplayKey.has(displayKey)) {
        byDisplayKey.set(displayKey, {
          _id: stageId,
          workflowStatus: {
            ...stage,
            _id: stageId,
            title: stageTitle,
            color: stage?.color || "#64748b",
          },
          tasks: [],
        });
      }
      if (!orderedStageMeta.has(displayKey)) {
        orderedStageMeta.set(displayKey, {
          _id: stageId,
          title: stageTitle,
          color: stage?.color || "#64748b",
          sequence: Number(stage?.sequence || 0),
        });
      }
      if (!orderedDisplayKeys.includes(displayKey)) {
        orderedDisplayKeys.push(displayKey);
      }
    });

    // Preserve any stage columns that are not part of the canonical workflow list.
    inputColumns.forEach((column) => {
      const workflowStatus =
        column?.workflowStatus || column?.workflow_status || column?.status || {};
      const stageId = String(workflowStatus?._id || workflowStatus?.id || column?._id || "").trim();
      if (!stageId) return;
      const displayKey = getStageDisplayKey(workflowStatus) || stageId;
      if (orderedDisplayKeys.includes(displayKey) || !byDisplayKey.has(displayKey)) return;
      orderedDisplayKeys.push(displayKey);
      if (!orderedStageMeta.has(displayKey)) {
        orderedStageMeta.set(displayKey, {
          _id: stageId,
          title: workflowStatus?.title || workflowStatus?.name || column?.title || "Untitled",
          color: workflowStatus?.color || column?.color || "#64748b",
          sequence: Number.MAX_SAFE_INTEGER,
        });
      }
    });

    return orderedDisplayKeys
      .map((displayKey) => {
        const col = byDisplayKey.get(displayKey);
        const meta = orderedStageMeta.get(displayKey);
        if (!col || !meta) return null;
        return {
          ...col,
          _id: meta._id || col?._id || displayKey,
          workflowStatus: {
            ...(col?.workflowStatus || {}),
            _id: meta._id || col?.workflowStatus?._id || displayKey,
            title: meta.title || col?.workflowStatus?.title || "Untitled",
            color: meta.color || col?.workflowStatus?.color || "#64748b",
            sequence: Number(meta?.sequence || 0),
          },
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          Number(a?.workflowStatus?.sequence || 0) -
          Number(b?.workflowStatus?.sequence || 0)
      );
  }, [boardTasks, projectWorkflowStage, workflowStatusList]);

  /** Totals for the left sidebar fraction — derived from the Kanban payload, not stale `projectMianTask` aggregates. */
  const boardListProgressForSidebar = useMemo(() => {
    const cols = Array.isArray(fixedBoardTasks) ? fixedBoardTasks : [];
    let totalTasks = 0;
    let totalDoneTasks = 0;
    cols.forEach((col) => {
      const n = Array.isArray(col?.tasks) ? col.tasks.length : 0;
      totalTasks += n;
      const ws = col?.workflowStatus || col?.workflow_status || {};
      const title = ws?.title || ws?.name || "";
      if (normalizeStageKey(title) === "done") {
        totalDoneTasks += n;
      }
    });
    return { totalTasks, totalDoneTasks };
  }, [fixedBoardTasks]);

  const filteredBoardTasks = filterTasks(fixedBoardTasks, filterSchema);
  const hasVisibleTasks = filteredBoardTasks.some(
    (board) => (board?.tasks?.length || 0) > 0
  );
  const hasAnyBoardTasks = fixedBoardTasks.some(
    (board) => (board?.tasks?.length || 0) > 0
  );
  const activeFilterCount = useMemo(() => {
    const taskFilters = filterSchema?.tasks || {};
    let count = 0;
    if (filterSchema?.workflowStatusId) count += 1;
    if (
      Array.isArray(taskFilters.assigneeIds)
        ? taskFilters.assigneeIds.length > 0
        : Boolean(taskFilters.assigneeIds)
    ) {
      count += 1;
    }
    if (
      Array.isArray(taskFilters.labelIds)
        ? taskFilters.labelIds.length > 0
        : Boolean(taskFilters.labelIds)
    ) {
      count += 1;
    }
    if (taskFilters.startDate) count += 1;
    if (taskFilters.dueDate) count += 1;
    if (String(taskFilters.title || "").trim()) count += 1;
    return count;
  }, [filterSchema]);
  const ganttTasks = useMemo(() => {
    if (!hasVisibleTasks && hasAnyBoardTasks) {
      return fixedBoardTasks;
    }
    return filteredBoardTasks;
  }, [filteredBoardTasks, fixedBoardTasks, hasAnyBoardTasks, hasVisibleTasks]);
  const ganttDebugInfo = useMemo(() => {
    const countNested = (boards = []) =>
      (Array.isArray(boards) ? boards : []).reduce(
        (sum, board) => sum + (Array.isArray(board?.tasks) ? board.tasks.length : 0),
        0
      );
    const sectionCount = (Array.isArray(ganttTasks) ? ganttTasks : []).filter(
      (board) => Array.isArray(board?.tasks) && board.tasks.length > 0
    ).length;
    return {
      boardCount: countNested(fixedBoardTasks),
      filteredCount: countNested(filteredBoardTasks),
      ganttCount: countNested(ganttTasks),
      sectionCount,
    };
  }, [filteredBoardTasks, fixedBoardTasks, ganttTasks]);

  const resolveStageValueForSubmit = useCallback(
    (value) => {
      if (!value) return "";
      return String(value).trim();
    },
    []
  );

  const buildSubscriberStagesForSubmit = useCallback(
    async (values) => {
      let stageSource = [
        ...(Array.isArray(projectWorkflowStage) ? projectWorkflowStage : []),
        ...(Array.isArray(workflowStatusList) ? workflowStatusList : []),
      ];

      const hasRealStageIds = stageSource.some((stage) => {
        const id = stage?._id || stage?.id;
        return typeof id === "string" && id.length > 8;
      });

      if (!hasRealStageIds && stagesId) {
        const fetchedStages = await fetchWorkflowStagesById(stagesId);
        if (Array.isArray(fetchedStages) && fetchedStages.length > 0) {
          stageSource = fetchedStages;
        }
      }

      const stillHasNoRealStageIds = !stageSource.some((stage) => {
        const id = stage?._id || stage?.id;
        return typeof id === "string" && id.length > 8;
      });

      if (stillHasNoRealStageIds) {
        const candidateMainTaskId =
          listID || selectedTask?._id || projectMianTask?.[0]?._id || editList?._id;
        const boardStages = await fetchStageOptionsFromBoard(candidateMainTaskId);
        if (Array.isArray(boardStages) && boardStages.length > 0) {
          stageSource = boardStages;
        }
      }

      const resolveFromStageSource = (value) => {
        if (!value) return "";
        return String(value).trim();
      };

      const subscriberStages = [];
      for (let i = 0; i < selectSubscriber.length; i++) {
        const selectedStageValue = values.subscriber_stages?.[i] || defaultStageId;
        const stageValue =
          resolveFromStageSource(selectedStageValue) ||
          resolveStageValueForSubmit(selectedStageValue);

        if (!stageValue) return null;

        subscriberStages.push({
          subscriber_id: selectSubscriber[i],
          stages: stageValue,
        });
      }

      return subscriberStages;
    },
    [
      defaultStageId,
      editList?._id,
      fetchStageOptionsFromBoard,
      fetchWorkflowStagesById,
      listID,
      projectMianTask,
      projectWorkflowStage,
      resolveStageValueForSubmit,
      selectedTask?._id,
      selectSubscriber,
      stagesId,
      workflowStatusList,
    ]
  );

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
    const resolvedWorkflowStatus =
      selectedWorkflowStatus && selectedWorkflowStatus !== "a"
        ? resolveStageValueForSubmit(selectedWorkflowStatus)
        : selectedWorkflowStatus;

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
      if (!resolvedWorkflowStatus || resolvedWorkflowStatus === "a") {
        message.error("Please select a valid stage.");
        return;
      }
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
            if (colId && colId === resolvedWorkflowStatus) {
              return { ...col, tasks: [...moved, ...(col?.tasks || [])] };
            }
            return col;
          });
        });
        await updateSubTaskListInStatus(resolvedWorkflowStatus);
        setSelectedWorkflowStatus("a");
      } finally {
        setMovingTasks(false);
      }
    } else if (selectedWorkflowStatus != "a" && selectedMainTask != "a") {
      if (!resolvedWorkflowStatus || resolvedWorkflowStatus === "a") {
        message.error("Please select a valid stage.");
        return;
      }
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
        await updateSubTaskListInStatus(resolvedWorkflowStatus, { suppressRefresh: true, suppressClearSelection: true });
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
        <div className="peoject-page" style={{ overflow: "hidden" }}>
          <div className="profileleftbar">
            <div className="add-project-wrapper">
              {hasPermission(["task_add"]) && (
                <Dropdown trigger={["click"]} overlay={yourMenu}>
                  <Button className="add-btn ant-btn-primary" type="primary">
                    <PlusOutlined className="add-btn-leading-icon" />
                    <span>Add</span>
                    <DownOutlined className="add-btn-trailing-icon" />
                  </Button>
                </Dropdown>
              )}
              <Search
                value={searchText}
                placeholder="Search..."
                onChange={(e) => {
                  setSearchText(e.target.value);
                  if (!e.target.value) setSearchEnabled(false);
                }}
                style={{ width: 200 }}
                className="mr2"
                allowClear
              />
            </div>

            <ul style={{ listStyle: "none", padding: "0" }}>
              {projectMianTask.length != 0 &&
                projectMianTask.map((item, index) => {
                  const activeListId = String(listID || selectedTask?._id || "");
                  const useBoardCountsForSidebar =
                    activeListId &&
                    String(item?._id) === activeListId &&
                    String(boardSnapshotListId || "") === activeListId;
                  const tasksInfo = countTasks(
                    useBoardCountsForSidebar ? { ...item, ...boardListProgressForSidebar } : item
                  );
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
                              style={{ background: "transparent", border: "none", cursor: "pointer" }}
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

          <div className="profilerightbar" style={{ overflow: "hidden" }}>
            {task_ids?.length > 0 ? (
              <div
                className={`profile-sub-head ${task_ids?.length > 0 ? "update-task" : ""
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
                            const workflowId = currentListWorkflowId || stagesId;
                            if (!open || !workflowId) return;
                            dispatch(getSpecificProjectWorkflowStage(workflowId));
                            getListWorkflowStatus();
                            fetchWorkflowStagesById(workflowId);
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
                          className="add-btn"
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
                          className="delete-btn"

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
                  <div className="block-status-content">
                    <ConfigProvider>
                      <Dropdown overlay={menu} trigger={["click"]}>
                        <Button
                          className="dropdown-trigger toolbar-icon-btn"
                          icon={<i className="fa-solid fa-table"></i>}
                        />
                      </Dropdown>
                    </ConfigProvider>
                    <FilterUI
                      boardTasks={fixedBoardTasks}
                      subscribersList={subscribersList}
                      projectLabels={projectLabels}
                      onConfigUpdate={(config) => setFilterSchema(config)}
                    />
                    <div style={{ display: "none" }}>
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
                    <div className="csv-dropdown-anchor">
                      <Dropdown
                        placement="bottomRight"
                        trigger={["click"]}
                        overlayClassName="wm-csv-dropdown"
                        getPopupContainer={() => document.body}
                        // overlay={
                        //   <Menu style={{ padding: '8px', borderRadius: '10px', minWidth: '160px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        overlay={
                          <Menu style={{
                            padding: '6px',
                            borderRadius: '10px',
                            minWidth: '160px',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                            border: '1px solid #e8edf3',
                            background: '#ffffff'
                          }}>
                            {hasPermission(["task_add"]) && (
                              <Menu.Item
                                key="sample-csv"
                                onClick={() => exportSampleCSVfile()}
                                style={{ padding: '8px 12px', borderRadius: '8px', marginBottom: '4px' }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '15px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Sample CSV:</span>
                                  <i className="fi fi-rr-file-download" style={{ color: '#2563eb', fontSize: '16px' }}></i>
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
                              </Menu.Item>
                            )}
                            {hasPermission(["task_add"]) && (
                              <Menu.Item
                                key="import-csv"
                                onClick={() => importRef.current.click()}
                                style={{ padding: '8px 12px', borderRadius: '8px', marginBottom: '4px' }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '15px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Import CSV:</span>
                                  <i className="fi fi-rr-file-import" style={{ color: '#2563eb', fontSize: '16px' }}></i>
                                </div>
                              </Menu.Item>
                            )}
                            <Menu.Item
                              key="export-csv"
                              onClick={() => {
                                exportCsv();
                              }}
                              style={{ padding: '8px 12px', borderRadius: '8px' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '15px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Export CSV:</span>
                                <i className="fi fi-rr-file-download" style={{ color: '#2563eb', fontSize: '16px' }}></i>
                              </div>
                            </Menu.Item>
                          </Menu>
                        }
                      >
                        <Button
                          className="dropdown-trigger toolbar-icon-btn toolbar-more-btn"
                          icon={<MoreOutlined />}
                        />
                      </Dropdown>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isTasksLoading || !taskListsHydrated || !boardHydrated ? (
              selectedView === "board" ? (
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
              ) : (
                <div className="error-message" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0" }}>
                  <Spin size="large" />
                </div>
              )
            ) : projectMianTask.length === 0 ? (
              <div className="error-message" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                <NoDataFoundIcon />
                <p style={{ marginTop: 16, color: '#7b8898', fontSize: 16 }}>No Data</p>
              </div>
            ) : !hasVisibleTasks ? (
              <div className="error-message" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                {/* <NoDataFoundIcon  />
                <p style={{ marginTop: 16, color: '#7b8898', fontSize: 16 }}>No task found</p> */}
              </div>
            ) : null}
            {isTasksLoading || !taskListsHydrated || !boardHydrated || projectMianTask.length === 0 ? null : selectedView === "board" ? (
              <TaskList
                updateTaskDraftStatus={updateTaskDraftStatus}
                updateBoardTaskLocally={updateBoardTaskLocally}
                moveBoardTaskLocally={moveBoardTaskLocally}
                refreshProjectMainTasks={refreshProjectMainTasks}
                checkTaskDrafts={""}
                boardTasks={fixedBoardTasks}
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
                tasks={ganttTasks}
                activeFilterCount={activeFilterCount}
                onResetFilters={() => setFilterSchema({ tasks: {} })}
                debugInfo={ganttDebugInfo}
                onTaskClick={(task) => showEditTaskModal(task, task?._stId || task?.task_status?._id || task?.task_status)}
              />
            ) : (
              <TasksTableView
                updateBoardTaskLocally={updateBoardTaskLocally}
                moveBoardTaskLocally={moveBoardTaskLocally}
                refreshProjectMainTasks={refreshProjectMainTasks}
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
        width="100%"
        style={{ maxWidth: 1000 }}
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
            <Row gutter={[24, 16]}>

              {/* Title */}
              <Col xs={24}>
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
              <Col xs={24} md={12}>
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
                        className="delete-btn"
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
              <Col xs={24} md={12}>
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
                        className="delete-btn"
                        onClick={() => setSelectedListClient([])}
                        size="small"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </Form.Item>
              </Col>

              {/* Subscriber Stages */}
              {selectSubscriber.length > 0 && (
                <Col xs={24}>
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
                          <Col xs={24} md={12} key={index}>
                            <div className="subscriber-stage-card">

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

                              <Form.Item
                                label="Stage"
                                name={["subscriber_stages", index]}
                                className="stage-select-item"
                                initialValue={defaultStageId}
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
                                      .localeCompare(
                                        String(optionB?.children || "").toLowerCase()
                                      )
                                  }
                                  onDropdownVisibleChange={(open) => {
                                    if (!open || !stagesId) return;
                                    dispatch(
                                      getSpecificProjectWorkflowStage(stagesId)
                                    );
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

              {/* Private Checkbox */}
              <Col xs={24}>
                <Form.Item name="markAsPrivate" valuePropName="checked">
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
                        {getRoleLabel(r?.role_name || r?.name || r?.title) || "-"}
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

      <AddTaskModal
        key={`tasks-add-modal-${addTaskModalSessionKey}`}
        open={isModalOpenTaskModal}
        initialStatusId={modalInitialStatusId}
        onCancel={() => {
          setModalInitialStatusId(null);
          handleCancelTaskModal();
        }}
        onSuccess={async (newTask) => {
          skipNextLocalTaskCreatedEventRef.current = true;
          const newTaskId = newTask?._id || newTask?.id || null;
          if (newTaskId) {
            locallyCreatedTaskIdRef.current = String(newTaskId);
          }
          if (newTask) {
            await emitEvent(socketEvents.ADD_TASK_ASSIGNEE, newTask);
          }
          const currentListId =
            newTask?.mainTask?._id ||
            newTask?.main_task_id?._id ||
            newTask?.main_task_id ||
            selectedTask?._id;
          handleCancelTaskModal();
          if (currentListId) {
            await getBoardTasks(currentListId, { silent: true });
          }
          await getProjectMianTask("", false, { silent: true });
        }}
        projectId={projectId}
        mainTaskId={selectedTask?._id}
        boardTasks={boardTasks}
        subscribersList={assigneeOptions}
        projectLabels={projectLabels}
        fileAttachment={fileAttachment}
        onFileChange={onFileChange}
        removeAttachmentFile={removeAttachmentFile}
        attachmentfileRef={attachmentfileRef}
        foldersList={foldersList}
      />

      <CommonTaskFormModal
        key={selectedTaskToView?._id || "tasks-page-task-detail"}
        open={isEditTaskModalOpen}
        mode="edit"
        title="Edit Task"
        submitText="Save Changes"
        initialValues={mapTaskToDynamicInitialValues(selectedTaskToView)}
        lockedProjectId={projectId}
        lockedMainTaskId={selectedTask?._id}
        showListSelector={false}
        viewOnly={false}
        taskId={selectedTaskToView?._id}
        onCancel={() => {
          setIsEditTaskModalOpen(false);
          setSelectedTaskToView(null);
          handleCancelTaskModal();
        }}
        onSubmit={handleDynamicTaskUpdate}
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
