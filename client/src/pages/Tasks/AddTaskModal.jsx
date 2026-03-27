/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Tabs,
  Switch,
  Checkbox,
  message,
  Dropdown,
  Menu,
} from "antd";
import {
  CloseOutlined,
  SendOutlined,
  PaperClipOutlined,
  SaveOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  MoreOutlined,
  MergeCellsOutlined,
  DeleteOutlined,
  CommentOutlined,
  HistoryOutlined,
  EditOutlined,
} from "@ant-design/icons";
import Service from "../../service";
import { useDispatch, useSelector } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { getSubscribersList } from "../../appRedux/reducers/ApiData";
import TaskDetailModal from "../TaskPage/TaskDetailModal";
import MyAvatar from "../../components/Avatar/MyAvatar";
import "../TaskPage/TaskDetailModal.css";
import "./AddTaskModal.css";

const { TextArea } = Input;
const { Option } = Select;

export default function AddTaskModal({
  open,
  onCancel,
  onSuccess,
  standalone = false,
  projectId: propProjectId,
  mainTaskId: propMainTaskId,
  mainTaskList = [],
  boardTasks = [],
  subscribersList = [],
  addform: externalForm,
  editorData,
  setEditorData,
  handleChangeData,
  addInputTaskData,
  handleTaskInput,
  selectedItems,
  handleSelectedItemsChange,
  selectedClients,
  handleClientChange,
  estHrs,
  estMins,
  handleEstTimeInput,
  estHrsError,
  estMinsError,
  fileAttachment,
  onFileChange,
  removeAttachmentFile,
  attachmentfileRef,
  foldersList,
  projectLabels,
  handleTaskOps,
  projectMembers = { staff: [], manager: [], client: [] },
  projectWorkflowId,
  defaultAssigneeIds = [],
}) {
  const dispatch = useDispatch();
  const subscribersFromRedux = useSelector((state) => state.ApiData?.subscribersList || []);
  const [form] = Form.useForm(externalForm);
  const [activeRightTab, setActiveRightTab] = useState("comment");
  const [commentText, setCommentText] = useState("");
  const [localComments, setLocalComments] = useState([]);
  const [localBugs, setLocalBugs] = useState([]);
  const [localBugTitle, setLocalBugTitle] = useState("");
  const [statusLabel, setStatusLabel] = useState("Pending");
  const [priorityLabel, setPriorityLabel] = useState("Low");
  const [projects, setProjects] = useState([]);
  const [mainTasks, setMainTasks] = useState([]);
  const [firstWorkflowStatusId, setFirstWorkflowStatusId] = useState(null);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMainTasks, setLoadingMainTasks] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [listSearchText, setListSearchText] = useState("");
  const [assigneeSearchText, setAssigneeSearchText] = useState("");
  const [followerSearchText, setFollowerSearchText] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserTarget, setCreateUserTarget] = useState(null);
  const [pendingUserName, setPendingUserName] = useState("");
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserForm] = Form.useForm();
  const [workflowCache, setWorkflowCache] = useState({});
  const [workflowStatusList, setWorkflowStatusList] = useState([]);
  const [labelOptions, setLabelOptions] = useState([]);
  const [localFileAttachment, setLocalFileAttachment] = useState([]);
  const [localFoldersList, setLocalFoldersList] = useState([]);
  const mainTaskCacheRef = React.useRef({});
  const mainTaskInFlightRef = React.useRef(new Set());
  const localAttachmentfileRef = useRef(null);
  const watchedMainTaskId = Form.useWatch("main_task_id", form);
  const watchedProjectId = Form.useWatch("project_id", form);
  const effectiveFoldersList = Array.isArray(foldersList) && foldersList.length > 0 ? foldersList : localFoldersList;
  const defaultFolderId = effectiveFoldersList?.[0]?._id;
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user_data") || "{}");
    } catch {
      return {};
    }
  }, []);

  const isStandalone = standalone;
  const projectId = propProjectId;
  const mainTaskId = propMainTaskId;
  const effectiveProjectId = isStandalone ? (watchedProjectId || projectId) : projectId;
  const effectiveFileAttachment = Array.isArray(fileAttachment) ? fileAttachment : localFileAttachment;
  const effectiveAttachmentfileRef = attachmentfileRef || localAttachmentfileRef;
  const getMemberLabel = useCallback((member) => {
    if (!member || typeof member !== "object") return "";
    const explicitName = String(member.full_name || member.name || "").trim();
    if (explicitName) return explicitName;

    const firstName = String(member.first_name || member.firstName || "").trim();
    const lastName = String(member.last_name || member.lastName || "").trim();
    const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (combinedName) return combinedName;

    return String(member.email || member.userName || "").trim();
  }, []);

  const normalizeMemberOptions = useCallback((items = []) => {
    const seen = new Set();
    return items
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const id = item._id || item.id;
        const label = getMemberLabel(item);
        if (!id || !label) return null;
        return { ...item, _id: id, full_name: label };
      })
      .filter((item) => {
        if (!item || seen.has(item._id)) return false;
        seen.add(item._id);
        return true;
      });
  }, [getMemberLabel]);

  const currentUserName = useMemo(
    () => currentUser?.full_name || currentUser?.name || "You",
    [currentUser]
  );
  const currentUserInitials = useMemo(() => {
    return String(currentUserName)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "Y";
  }, [currentUserName]);

  const effectiveOnFileChange = useCallback((event) => {
    if (typeof onFileChange === "function") {
      onFileChange(event);
      return;
    }

    const files = Array.from(event?.target?.files || []);
    if (!files.length) return;

    setLocalFileAttachment((prev) => [...prev, ...files]);
    if (event?.target) event.target.value = "";
  }, [onFileChange]);

  const effectiveRemoveAttachmentFile = useCallback((index, file) => {
    if (typeof removeAttachmentFile === "function") {
      removeAttachmentFile(index, file);
      return;
    }

    setLocalFileAttachment((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  }, [removeAttachmentFile]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: {},
      });
      if (res?.status === 200 && Array.isArray(res?.data?.data)) {
        setProjects(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchMainTasks = useCallback(async (pid) => {
    if (!pid) return;
    try {
      if (Object.prototype.hasOwnProperty.call(mainTaskCacheRef.current, pid)) {
        const cached = mainTaskCacheRef.current[pid] || [];
        setMainTasks(cached);
        return cached;
      }
      if (mainTaskInFlightRef.current.has(pid)) {
        return;
      }
      mainTaskInFlightRef.current.add(pid);
      setLoadingMainTasks(true);
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectMianTask,
        body: {
          project_id: pid,
          search: "",
          sort: "_id",
          sortBy: "des",
        },
      });
      if (res?.status === 200 && Array.isArray(res?.data?.data)) {
        setMainTasks(res.data.data);
        mainTaskCacheRef.current[pid] = res.data.data;
        return res.data.data;
      }
      setMainTasks([]);
      mainTaskCacheRef.current[pid] = [];
      return [];
    } catch (e) {
      setMainTasks([]);
      mainTaskCacheRef.current[pid] = [];
      return [];
    } finally {
      if (pid) mainTaskInFlightRef.current.delete(pid);
      setLoadingMainTasks(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      setRolesLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getAllRole,
      });
      if (response?.data?.data?.length > 0) {
        setRoles(response.data.data);
      } else {
        setRoles([]);
      }
    } catch (error) {
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const fetchWorkflowStatusList = useCallback(async (workflowId) => {
    if (!workflowId) return;
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getworkflowStatus}/${workflowId}`,
      });
      if (response?.data?.data && response?.data?.status) {
        setWorkflowStatusList(response.data.data);
      } else {
        setWorkflowStatusList([]);
      }
    } catch (e) {
      setWorkflowStatusList([]);
    }
  }, []);

  const fetchProjectLabels = useCallback(async (pid) => {
    const normalizeLabels = (items = []) => {
      const seen = new Set();
      return items.filter((item) => {
        const id = item?._id || item?.id || item?.title;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    };

    try {
      const body = { isDropdown: true };
      if (pid) body.project_id = pid;

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectLabels,
        body,
      });

      if (Array.isArray(response?.data?.data) && response.data.data.length > 0) {
        setLabelOptions(normalizeLabels(response.data.data));
        return;
      }

      const fallbackResponse = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectLabels,
        body: { isDropdown: true },
      });

      if (Array.isArray(fallbackResponse?.data?.data) && fallbackResponse.data.data.length > 0) {
        setLabelOptions(normalizeLabels(fallbackResponse.data.data));
        return;
      }
    } catch (error) {
      console.error("Failed to fetch labels:", error);
    }

    setLabelOptions(normalizeLabels(Array.isArray(projectLabels) ? projectLabels : []));
  }, [projectLabels]);

  const fetchProjectAssignees = useCallback(async (pid) => {
    if (!pid) {
      setAssigneeOptions([]);
      setLoadingAssignees(false);
      return;
    }

    try {
      setLoadingAssignees(true);
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getMasterSubscribers}/${pid}`,
      });

      const subscribers = response?.data?.data;
      if (Array.isArray(subscribers) && subscribers.length > 0) {
        setAssigneeOptions(normalizeMemberOptions(subscribers));
        return;
      }
      try {
        const cached = sessionStorage.getItem("atm_all_users");
        if (cached) {
          setAssigneeOptions(normalizeMemberOptions(JSON.parse(cached)));
          return;
        }
      } catch (error) {
        console.error("Failed to read cached users:", error);
      }
    } catch (error) {
      console.error("Failed to fetch project assignees:", error);
    } finally {
      setLoadingAssignees(false);
    }

    setAssigneeOptions([]);
  }, [normalizeMemberOptions]);

  const fetchProjectFolders = useCallback(async (pid) => {
    if (!pid) {
      setLocalFoldersList([]);
      return;
    }

    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getFolderslist,
        body: { project_id: pid },
      });

      if (Array.isArray(response?.data?.data)) {
        setLocalFoldersList(response.data.data);
        return;
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }

    setLocalFoldersList([]);
  }, []);

  const generateTempPassword = () => {
    const seed = Math.random().toString(36).slice(2, 8);
    return `Temp@${seed}`;
  };

  const splitName = (name) => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { first: "", last: "" };
    if (parts.length === 1) return { first: parts[0], last: "" };
    return { first: parts[0], last: parts.slice(1).join(" ") };
  };

  const uploadFiles = useCallback(async (files, type = "task") => {
    try {
      const validFiles = Array.isArray(files)
        ? files.filter((file) => file instanceof File || file?.originFileObj instanceof File)
        : [];
      if (!validFiles.length) return [];

      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append("document", file?.originFileObj || file);
      });

      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileUpload}?file_for=${type}`,
        body: formData,
        options: { "content-type": "multipart/form-data" },
      });
      return Array.isArray(res?.data?.data) ? res.data.data : [];
    } catch (error) {
      console.error("Task attachment upload failed:", error);
      return [];
    }
  }, []);

  const addTaskComment = useCallback(async (taskId, commentTxt, folderId) => {
    if (!taskId || !commentTxt) return false;
    try {
      const reqBody = {
        task_id: taskId,
        taggedUsers: [],
        comment: commentTxt,
        attachments: [],
      };
      if (folderId) reqBody.folder_id = folderId;
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addTaskComments,
        body: reqBody,
      });
      return Boolean(res?.data?.status);
    } catch (error) {
      console.error("Add task comment failed:", error);
      return false;
    }
  }, []);

  const addTaskBug = useCallback(async (taskId, pid, bug) => {
    if (!taskId || !pid || !bug?.title) return false;
    try {
      const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
      const reqBody = {
        project_id: pid,
        task_id: taskId,
        title: bug.title,
        bugId: bug.bugId || undefined,
        createdBy: userData?._id || undefined,
        assignees: Array.isArray(bug.assignees) ? bug.assignees : [],
      };
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addBug,
        body: reqBody,
      });
      return Boolean(res?.data?.status);
    } catch (error) {
      console.error("Add task bug failed:", error);
      return false;
    }
  }, []);

  const openCreateUser = (name, target) => {
    const { first, last } = splitName(name);
    setPendingUserName(name);
    setCreateUserTarget(target);
    createUserForm.setFieldsValue({
      first_name: first,
      last_name: last,
      email: "",
      pmsRoleId: undefined,
      password: generateTempPassword(),
    });
    setCreateUserOpen(true);
    fetchRoles();
  };

  const handleCreateUser = async () => {
    try {
      const values = await createUserForm.validateFields();
      const companyId = JSON.parse(localStorage.getItem("user_data") || "{}")?.companyId;
      if (!companyId) {
        message.error("Company ID not found");
        return;
      }
      setCreateUserLoading(true);
      const payload = {
        firstName: values.first_name?.trim(),
        lastName: values.last_name?.trim(),
        companyId,
        isActivate: true,
        email: values.email?.trim(),
        password: values.password,
        pmsRoleId: values.pmsRoleId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addUser,
        body: payload,
      });
      if (response?.data?.data && response?.data?.status) {
        const newUser = response.data.data;
        setAssigneeOptions((prev) => {
          const normalizedUser = normalizeMemberOptions([newUser])[0];
          if (!normalizedUser) return prev;
          const exists = prev.some((p) => p?._id === normalizedUser?._id);
          return exists ? prev : [...prev, normalizedUser];
        });
        if (createUserTarget) {
          const current = form.getFieldValue(createUserTarget) || [];
          const next = Array.from(new Set([...current, newUser._id])).filter(Boolean);
          form.setFieldsValue({ [createUserTarget]: next });
          saveDraft(projectId, { [createUserTarget]: next });
        }
        message.success("User created");
        setCreateUserOpen(false);
        setPendingUserName("");
        setCreateUserTarget(null);
      } else {
        message.error(response?.data?.message || "Failed to create user");
      }
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || "Failed to create user");
    } finally {
      setCreateUserLoading(false);
    }
  };

  const createListFromSearch = async (rawTitle) => {
    const title = (rawTitle || "").trim();
    const pid = form.getFieldValue("project_id") || projectId;
    if (!title || !pid) {
      message.error("Please select a project first");
      return;
    }
    const existing = mainTasks.find(
      (t) => (t?.title || "").trim().toLowerCase() === title.toLowerCase()
    );
    if (existing?._id) {
      form.setFieldsValue({ main_task_id: existing._id });
      saveDraft(pid, { main_task_id: existing._id });
      return;
    }
    try {
      setCreatingList(true);
      const reqBody = {
        title,
        project_id: pid,
        subscriber_stages: [],
        subscribers: [],
        pms_clients: [],
        status: "active",
        isPrivateList: false,
        isDisplayInGantt: false,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectMainTask,
        body: reqBody,
      });
      if (response?.data?.data && response?.data?.status) {
        const newList = response.data.data;
        setMainTasks((prev) => [...prev, newList]);
        if (pid) {
          const cached = mainTaskCacheRef.current[pid] || [];
          mainTaskCacheRef.current[pid] = [...cached, newList];
        }
        form.setFieldsValue({ main_task_id: newList._id });
        saveDraft(pid, { main_task_id: newList._id });
        message.success("List created");
      } else {
        message.error(response?.data?.message || "Failed to create list");
      }
    } catch (error) {
      const apiMsg = error?.response?.data?.message || error?.message;
      message.error(apiMsg || "Failed to create list");
      console.error("Create list failed:", error?.response?.data || error);
    } finally {
      setCreatingList(false);
    }
  };

  const getDraftKey = (pid) => (pid ? `addTaskDraft:${pid}` : "addTaskDraft:unknown");

  const loadDraft = useCallback(
    (pid) => {
      try {
        const raw = localStorage.getItem(getDraftKey(pid));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch (e) {
        return null;
      }
    },
    []
  );

  const saveDraft = useCallback((pid, patch) => {
    if (!pid) return;
    try {
      const current = loadDraft(pid) || {};
      const next = { ...current, ...patch };
      localStorage.setItem(getDraftKey(pid), JSON.stringify(next));
    } catch (e) {
      // no-op
    }
  }, [loadDraft]);

  const fetchBoardTasksForWorkflow = useCallback(async (pid, mainId) => {
    if (!pid || !mainId) return null;
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectBoardTasks,
        body: { project_id: pid, main_task_id: mainId },
      });
      if (res?.status === 200 && res?.data?.data?.length > 0) {
        const firstCol = res.data.data[0];
        return firstCol?.workflowStatus?._id || null;
      }
      return null;
    } catch (e) {
      return null;
    }
  }, []);

  const cacheWorkflow = (pid, mainId, workflowId) => {
    if (!pid || !mainId || !workflowId) return;
    const key = `${pid}:${mainId}`;
    setWorkflowCache((prev) => ({ ...prev, [key]: workflowId }));
  };

  useEffect(() => {
    if (open && isStandalone) {
      fetchProjects();
      // If form already has a project selected, reload its lists
      const existingPid = form.getFieldValue("project_id");
      if (existingPid && mainTasks.length === 0) {
        delete mainTaskCacheRef.current[existingPid];
        fetchMainTasks(existingPid);
      }
      // Load all users upfront so Assignee/Follower dropdowns are pre-populated
      const cached = sessionStorage.getItem("atm_all_users");
      if (cached) {
        try { setAssigneeOptions(normalizeMemberOptions(JSON.parse(cached))); } catch {}
      }
      // Always refresh in background
      Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsermaster,
        body: { pageNo: 1, limit: 500, search: "" },
      }).then((res) => {
        const users = res?.data?.data || [];
        if (users.length) {
          setAssigneeOptions(normalizeMemberOptions(users));
          sessionStorage.setItem("atm_all_users", JSON.stringify(users));
        }
      }).catch(() => {});
    }
  }, [open, isStandalone, fetchProjects, fetchMainTasks, normalizeMemberOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && projectId && isStandalone) {
      form.setFieldsValue({ project_id: projectId });
    }
    if (open && !isStandalone && projectId) {
      setMainTasks(mainTaskList);
    }
  }, [open, projectId, isStandalone, mainTaskList, form]);

  useEffect(() => {
    if (!open) return;
    void fetchProjectLabels(effectiveProjectId);
  }, [open, effectiveProjectId, fetchProjectLabels]);

  useEffect(() => {
    if (!open || !isStandalone) return;
    void fetchProjectAssignees(effectiveProjectId);
  }, [open, isStandalone, effectiveProjectId, fetchProjectAssignees]);

  useEffect(() => {
    if (!open || !isStandalone) return;
    void fetchProjectFolders(effectiveProjectId);
  }, [open, isStandalone, effectiveProjectId, fetchProjectFolders]);

  useEffect(() => {
    if (!open || !effectiveProjectId || !isStandalone) return;
    if (Object.prototype.hasOwnProperty.call(mainTaskCacheRef.current, effectiveProjectId)) {
      setMainTasks(mainTaskCacheRef.current[effectiveProjectId] || []);
    } else {
      fetchMainTasks(effectiveProjectId);
    }
  }, [open, isStandalone, effectiveProjectId, fetchMainTasks]);

  useEffect(() => {
    if (open) {
      setListSearchText("");
    }
  }, [open, projectId]);

  useEffect(() => {
    if (!open || !projectId || draftLoaded) return;
    const draft = loadDraft(projectId);
    if (!draft) {
      setDraftLoaded(true);
      return;
    }
    form.setFieldsValue({
      main_task_id: draft.main_task_id || undefined,
      assignees: Array.isArray(draft.assignees) ? draft.assignees : undefined,
      followers: Array.isArray(draft.followers) ? draft.followers : undefined,
    });
    setDraftLoaded(true);
  }, [open, projectId, draftLoaded, loadDraft, form]);

  useEffect(() => {
    if (open && projectId && mainTaskId && isStandalone) {
      fetchBoardTasksForWorkflow(projectId, mainTaskId).then(setFirstWorkflowStatusId);
    }
    if (open && !isStandalone && boardTasks?.length > 0) {
      setFirstWorkflowStatusId(boardTasks[0]?.workflowStatus?._id || null);
    }
  }, [open, projectId, mainTaskId, isStandalone, boardTasks, fetchBoardTasksForWorkflow]);

  useEffect(() => {
    if (!open || !isStandalone) return;
    const pid = form.getFieldValue("project_id") || projectId;
    const mid = watchedMainTaskId;
    if (!pid || !mid) return;
    const key = `${pid}:${mid}`;
    const cached = workflowCache[key] || firstWorkflowStatusId;
    if (cached) return;
    fetchBoardTasksForWorkflow(pid, mid).then((wf) => {
      if (wf) {
        setFirstWorkflowStatusId(wf);
        cacheWorkflow(pid, mid, wf);
      } else if (workflowStatusList.length > 0) {
        const fallback = workflowStatusList[0]?._id || null;
        if (fallback) {
          setFirstWorkflowStatusId(fallback);
          cacheWorkflow(pid, mid, fallback);
        }
      }
    });
  }, [open, isStandalone, watchedMainTaskId, projectId, workflowCache, firstWorkflowStatusId, workflowStatusList, fetchBoardTasksForWorkflow]);

  useEffect(() => {
    if (open && projectWorkflowId) {
      fetchWorkflowStatusList(projectWorkflowId);
    }
  }, [open, projectWorkflowId, fetchWorkflowStatusList]);

  useEffect(() => {
    if (open && projectId && !isStandalone) {
      setLoadingAssignees(true);
      dispatch(getSubscribersList(projectId));
    }
  }, [open, projectId, isStandalone, dispatch]);

  const assigneeList = subscribersList?.length ? subscribersList : subscribersFromRedux;
  const fallbackAssignees = useMemo(() => {
    const pool = [
      ...(projectMembers?.staff || []),
      ...(projectMembers?.manager || []),
      ...(projectMembers?.client || []),
    ];
    const seen = new Set();
    return pool.filter((p) => {
      const key = p?._id || p?.id || p?.email || p?.name || p?.full_name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [projectMembers]);
  useEffect(() => {
    if (isStandalone) return; // standalone uses direct API fetch in onChange
    if (open && effectiveProjectId && assigneeList.length) {
      setAssigneeOptions(normalizeMemberOptions(assigneeList));
      setLoadingAssignees(false);
      return;
    }
    if (open && effectiveProjectId && !assigneeList.length) {
      if (fallbackAssignees.length) {
        setAssigneeOptions(normalizeMemberOptions(fallbackAssignees));
      } else {
        setAssigneeOptions([]);
      }
      setLoadingAssignees(false);
    }
  }, [open, effectiveProjectId, assigneeList, fallbackAssignees, isStandalone, normalizeMemberOptions]);

  useEffect(() => {
    if (!open || !projectId) return;
    const draft = loadDraft(projectId);
    if (!draft) return;
    if (Array.isArray(mainTasks) && mainTasks.length > 0 && draft.main_task_id) {
      const exists = mainTasks.some((t) => t?._id === draft.main_task_id);
      if (exists) form.setFieldsValue({ main_task_id: draft.main_task_id });
    }
  }, [open, projectId, mainTasks, loadDraft, form]);

  useEffect(() => {
    if (!open || !projectId) return;
    const draft = loadDraft(projectId);
    if (!draft) return;
    const optIds = new Set(assigneeOptions.map((o) => o?._id));
    const draftAssignees = Array.isArray(draft.assignees)
      ? draft.assignees.filter((id) => optIds.has(id))
      : undefined;
    const draftFollowers = Array.isArray(draft.followers)
      ? draft.followers.filter((id) => optIds.has(id))
      : undefined;
    if (draftAssignees?.length) form.setFieldsValue({ assignees: draftAssignees });
    if (draftFollowers?.length) form.setFieldsValue({ followers: draftFollowers });
  }, [open, projectId, assigneeOptions, loadDraft, form]);

  useEffect(() => {
    if (!open || !Array.isArray(defaultAssigneeIds) || !defaultAssigneeIds.length) return;
    const currentAssignees = form.getFieldValue("assignees");
    if (Array.isArray(currentAssignees) && currentAssignees.length > 0) return;
    const optionIds = new Set(assigneeOptions.map((item) => item?._id));
    const nextAssignees = defaultAssigneeIds.filter((id) => optionIds.has(id));
    if (nextAssignees.length) {
      form.setFieldsValue({ assignees: nextAssignees });
    }
  }, [open, defaultAssigneeIds, assigneeOptions, form]);

  useEffect(() => {
    if (!labelOptions.length && Array.isArray(projectLabels) && projectLabels.length > 0) {
      setLabelOptions(projectLabels);
    }
  }, [projectLabels, labelOptions.length]);


  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const pid = isStandalone ? values.project_id : projectId;
      const mainId = isStandalone ? values.main_task_id : mainTaskId;
      if (!pid || !mainId) {
        message.error("Please select Project and List");
        return;
      }
      const key = `${pid}:${mainId}`;
      let workflowId = firstWorkflowStatusId || workflowCache[key];
      if (!workflowId) {
        workflowId = await fetchBoardTasksForWorkflow(pid, mainId);
        setFirstWorkflowStatusId(workflowId);
        cacheWorkflow(pid, mainId, workflowId);
      }
      if (!workflowId && workflowStatusList.length > 0) {
        workflowId = workflowStatusList[0]?._id || null;
        if (workflowId) {
          setFirstWorkflowStatusId(workflowId);
          cacheWorkflow(pid, mainId, workflowId);
        }
      }
      if (!workflowId) {
        message.error("Workflow not found for this list. Please set up a workflow.");
        return;
      }
      setLoading(true);
      dispatch(showAuthLoader());
      const folderId = form.getFieldValue("folder") || defaultFolderId;
      let uploadedFiles = [];
      if (Array.isArray(effectiveFileAttachment) && effectiveFileAttachment.length > 0) {
        uploadedFiles = await uploadFiles(effectiveFileAttachment, "task");
        if (effectiveFileAttachment.length > 0 && uploadedFiles.length === 0) {
          dispatch(hideAuthLoader());
          setLoading(false);
          message.error("File upload failed. Please try again.");
          return;
        }
      }
      const reqBody = {
        project_id: pid,
        main_task_id: mainId,
        title: (values.title || "").trim(),
        status: "active",
        descriptions: values.descriptions || "",
        due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
        start_date: values.start_date ? values.start_date.format("YYYY-MM-DD") : null,
        assignees: Array.isArray(values.assignees) ? values.assignees : [],
        pms_clients: Array.isArray(values.followers) ? values.followers : [],
        task_status: workflowId,
        task_labels: Array.isArray(values.task_labels) ? values.task_labels : [],
        estimated_hours: "00",
        estimated_minutes: "00",
        task_progress: "0",
        recurringType: "",
      };
      if (uploadedFiles.length > 0) {
        reqBody.attachments = uploadedFiles;
        if (folderId) reqBody.folder_id = folderId;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskaddition,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      setLoading(false);
      const msgText = String(response?.data?.message || "").toLowerCase();
      const isOk =
        response?.data?.status === true ||
        response?.data?.success === true ||
        response?.data?.statusCode === 200 ||
        response?.data?.statusCode === 201 ||
        response?.status === 200 ||
        response?.status === 201 ||
        msgText.includes("success");
      if (isOk) {
        const createdTask = response?.data?.data || {};
        const createdTaskId = createdTask?._id || createdTask?.id;
        const commentResults = await Promise.all(
          (localComments || []).map((comment) => addTaskComment(createdTaskId, comment?.text, folderId))
        );
        const bugResults = await Promise.all(
          (localBugs || []).map((bug) => addTaskBug(createdTaskId, pid, bug))
        );

        const failedComments = commentResults.filter((ok) => !ok).length;
        const failedBugs = bugResults.filter((ok) => !ok).length;

        message.success(response?.data?.message || "Task added");
        if (failedComments || failedBugs) {
          const warnings = [];
          if (failedComments) warnings.push(`${failedComments} comment`);
          if (failedBugs) warnings.push(`${failedBugs} bug`);
          message.warning(`${warnings.join(" and ")} could not be saved.`);
        }
        setCommentText("");
        setLocalComments([]);
        setLocalBugs([]);
        setLocalBugTitle("");
        setLocalFileAttachment([]);
        form.resetFields();
        onSuccess?.(createdTask);
      } else {
        const apiMsg =
          response?.data?.message ||
          response?.data?.error ||
          response?.data?.errors?.[0]?.msg;
        message.error(apiMsg || "Failed to add task");
        console.error("Add task failed:", response?.data || response);
      }
    } catch (err) {
      setLoading(false);
      dispatch(hideAuthLoader());
      if (err?.errorFields) return;
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.errors?.[0]?.msg;
      message.error(apiMsg || "Please fill required fields");
    }
  };

  const selectedAssigneeNames = (form.getFieldValue("assignees") || [])
    .map((id) => {
      const found = assigneeOptions.find((e) => e._id === id);
      return found ? (found.full_name || found.name || "") : "";
    })
    .filter(Boolean);

  const createLeftPanel = (
    <>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Hero Section — matches task detail */}
        <div className="task-detail-hero">
          <div className="task-detail-topbar">
            <div className="task-detail-topbar-left">
              <div className="task-detail-status-text">NEW TASK</div>
            </div>
            <div className="task-detail-topbar-actions">
              <Button
                className="task-detail-icon-btn"
                type="text"
                icon={<CommentOutlined />}
                onClick={() => setActiveRightTab("comment")}
                title="Comments"
              />
              <Button
                className="task-detail-icon-btn"
                type="text"
                icon={<PaperClipOutlined />}
                onClick={() => setActiveRightTab("attachment")}
                title="Files"
              />
              <Button
                className="task-detail-icon-btn"
                type="text"
                icon={<HistoryOutlined />}
                onClick={() => setActiveRightTab("activity")}
                title="Activity"
              />
              <Button
                className="task-detail-icon-btn"
                type="text"
                icon={<EditOutlined />}
                title="Edit"
              />
            </div>
          </div>

          <Form.Item
            name="title"
            rules={[{ required: true, message: "Enter task title" }]}
            style={{ marginBottom: 8 }}
          >
            <Input
              className="task-detail-edit-title-input"
              placeholder="Enter task title"
              size="large"
            />
          </Form.Item>

          {isStandalone && (
            <div className="task-detail-breadcrumb" style={{ marginBottom: 8 }}>
              <div className="task-detail-breadcrumb-trail" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Form.Item name="project_id" noStyle>
                  <Select
                    placeholder="Select project"
                    allowClear
                    size="small"
                    style={{ minWidth: 160 }}
                    onChange={(id) => {
                      form.setFieldValue("main_task_id", undefined);
                      form.setFieldValue("task_labels", []);
                      form.setFieldValue("assignees", []);
                      form.setFieldValue("followers", []);
                      setMainTasks([]);
                      setLabelOptions([]);
                      setAssigneeOptions([]);
                      setLocalFoldersList([]);
                      setFirstWorkflowStatusId(null);
                      void fetchProjectLabels(id);
                      if (isStandalone) void fetchProjectAssignees(id);
                      if (isStandalone) void fetchProjectFolders(id);
                      if (id) {
                        fetchMainTasks(id);
                      }
                    }}
                  >
                    {projects.map((p) => (
                      <Option key={p._id} value={p._id}>{p.title}</Option>
                    ))}
                  </Select>
                </Form.Item>
                <span className="task-detail-breadcrumb-sep">/</span>
                <Form.Item name="main_task_id" noStyle>
                  <Select
                    placeholder="Select list"
                    allowClear
                    size="small"
                    style={{ minWidth: 160 }}
                    loading={loadingMainTasks || creatingList}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      String(option?.children || "").toLowerCase().includes(input.toLowerCase())
                    }
                    onSearch={setListSearchText}
                    getPopupContainer={(node) => node.parentElement}
                    onDropdownVisibleChange={(visible) => {
                      if (!visible) return;
                      const pid = form.getFieldValue("project_id");
                      if (pid && !mainTaskInFlightRef.current.has(pid) && mainTasks.length === 0 && !loadingMainTasks) {
                        delete mainTaskCacheRef.current[pid];
                        fetchMainTasks(pid);
                      }
                    }}
                    onInputKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (listSearchText?.trim()) createListFromSearch(listSearchText);
                      }
                    }}
                    notFoundContent={
                      listSearchText?.trim()
                        ? <Button type="link" onClick={() => createListFromSearch(listSearchText)} style={{ padding: 0 }}>Create list "{listSearchText.trim()}"</Button>
                        : "No lists found"
                    }
                    onChange={(mid) => {
                      const pid = form.getFieldValue("project_id");
                      saveDraft(pid, { main_task_id: mid || undefined });
                      if (pid && mid) {
                        const key = `${pid}:${mid}`;
                        const cached = workflowCache[key];
                        if (cached) {
                          setFirstWorkflowStatusId(cached);
                        } else {
                          fetchBoardTasksForWorkflow(pid, mid).then((wf) => {
                            if (wf) {
                              setFirstWorkflowStatusId(wf);
                              cacheWorkflow(pid, mid, wf);
                            } else if (workflowStatusList.length > 0) {
                              const fallback = workflowStatusList[0]?._id || null;
                              setFirstWorkflowStatusId(fallback);
                              cacheWorkflow(pid, mid, fallback);
                            }
                          });
                        }
                      }
                    }}
                  >
                    {mainTasks.map((m) => (
                      <Option key={m._id} value={m._id}>{m.title}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </div>
          )}

          {/* Meta info bar — Due Date / Assignees / Assets */}
          <div className="task-detail-meta">
            <div className="task-detail-metric-card">
              <span className="task-detail-metric-label">Due date</span>
              <span className="task-detail-metric-value">
                <CalendarOutlined />
                <Form.Item name="due_date" noStyle>
                  <DatePicker
                    size="small"
                    className="task-detail-edit-datepicker"
                    format="MMM D, YYYY"
                    allowClear
                    placeholder="Set date"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </span>
            </div>
            <div className="task-detail-metric-card">
              <span className="task-detail-metric-label">Assignees</span>
              <span className="task-detail-metric-value">
                {selectedAssigneeNames.length || 0} member{selectedAssigneeNames.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="task-detail-metric-card">
              <span className="task-detail-metric-label">Assets</span>
              <span className="task-detail-metric-value">
                  {effectiveFileAttachment?.length || 0} attachment{(effectiveFileAttachment?.length || 0) === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <div className="task-detail-content-grid">
          {/* Description */}
          <div className="task-detail-section task-detail-section-featured">
            <div className="task-detail-section-head">
              <div>
                <div className="task-detail-label">Task brief</div>
                <div className="task-detail-section-title">Description</div>
              </div>
            </div>
            <div className="task-detail-edit-description-wrapper">
              <Form.Item name="descriptions" noStyle>
                <TextArea
                  className="task-detail-edit-description"
                  rows={4}
                  placeholder="Enter task description..."
                />
              </Form.Item>
            </div>
          </div>

          {/* Meta grid — Project, Assignees, Start Date, Labels */}
          <div className="task-detail-section-grid">
            <div className="task-detail-section">
              <div className="task-detail-label">Priority</div>
              <div className="task-detail-value">
                <Select
                  value={priorityLabel}
                  onChange={setPriorityLabel}
                  size="small"
                  style={{ width: "100%" }}
                  options={[
                    { value: "Low", label: "Low" },
                    { value: "Medium", label: "Medium" },
                    { value: "High", label: "High" },
                  ]}
                />
              </div>
            </div>

            <div className="task-detail-section">
              <div className="task-detail-label">Assignee(s)</div>
              <div className="task-detail-value">
                <Form.Item name="assignees" noStyle>
                  <Select
                    mode="multiple"
                    size="small"
                    style={{ width: "100%" }}
                    placeholder="Select assignees"
                    options={assigneeOptions.map((e) => ({ value: e._id, label: e.full_name || e.name }))}
                    showSearch
                    loading={loadingAssignees}
                    onSearch={setAssigneeSearchText}
                    onInputKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const name = assigneeSearchText?.trim();
                        if (name) openCreateUser(name, "assignees");
                      }
                    }}
                    notFoundContent={
                      assigneeSearchText?.trim()
                        ? <Button type="link" onClick={() => openCreateUser(assigneeSearchText.trim(), "assignees")} style={{ padding: 0 }}>Create user "{assigneeSearchText.trim()}"</Button>
                        : null
                    }
                    onChange={(vals) => saveDraft(projectId, { assignees: vals || [] })}
                    filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                    allowClear
                  />
                </Form.Item>
              </div>
            </div>

            <div className="task-detail-section">
              <div className="task-detail-label">Start date</div>
              <div className="task-detail-value">
                <Form.Item name="start_date" noStyle>
                  <DatePicker
                    size="small"
                    className="task-detail-edit-datepicker"
                    format="MMM D, YYYY"
                    allowClear
                    placeholder="Set date"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </div>
            </div>

            <div className="task-detail-section">
              <div className="task-detail-label">Followers</div>
              <div className="task-detail-value">
                <Form.Item name="followers" noStyle>
                  <Select
                    mode="multiple"
                    size="small"
                    style={{ width: "100%" }}
                    placeholder="Select followers"
                    options={assigneeOptions.map((e) => ({ value: e._id, label: e.full_name || e.name }))}
                    allowClear
                    loading={loadingAssignees}
                    onSearch={setFollowerSearchText}
                    onInputKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const name = followerSearchText?.trim();
                        if (name) openCreateUser(name, "followers");
                      }
                    }}
                    notFoundContent={
                      followerSearchText?.trim()
                        ? <Button type="link" onClick={() => openCreateUser(followerSearchText.trim(), "followers")} style={{ padding: 0 }}>Create user "{followerSearchText.trim()}"</Button>
                        : null
                    }
                    onChange={(vals) => saveDraft(projectId, { followers: vals || [] })}
                    filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </div>
            </div>

            <div className="task-detail-section">
              <div className="task-detail-label">Labels</div>
              <div className="task-detail-value">
                <Form.Item name="task_labels" noStyle initialValue={[]}>
                  <Select
                    mode="multiple"
                    size="small"
                    style={{ width: "100%" }}
                    placeholder="Select labels"
                    options={(labelOptions || []).map((lbl) => ({
                      value: lbl?._id,
                      label: lbl?.title,
                    }))}
                    showSearch
                    optionFilterProp="label"
                    allowClear
                    filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="task-detail-section">
            <div className="task-detail-section-head">
              <div>
                <div className="task-detail-label">Files</div>
                <div className="task-detail-section-title">Attachments</div>
              </div>
              <span className="task-detail-section-count">{effectiveFileAttachment?.length || 0}</span>
            </div>
            {effectiveFileAttachment?.length > 0 ? (
              <div className="task-detail-attachments">
                {effectiveFileAttachment.map((file, index) => (
                  <div className="task-detail-attachment-card" key={index}>
                    <span className="task-detail-attachment-link">
                      {file.name?.length > 30 ? `${file.name.slice(0, 30)}...${file.file_type || ""}` : (file.name || "File") + (file.file_type || "")}
                    </span>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => effectiveRemoveAttachmentFile(index, file)}
                      title="Remove"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="task-detail-empty-state">No attachments added yet.</div>
            )}
            <Button
              type="link"
              icon={<PaperClipOutlined />}
              onClick={() => effectiveAttachmentfileRef?.current?.click?.()}
              style={{ marginTop: 8, padding: 0 }}
            >
              Attach files
            </Button>
            <input
              multiple
              type="file"
              accept="*"
              onChange={effectiveOnFileChange}
              hidden
              ref={effectiveAttachmentfileRef}
            />
          </div>

          {/* Quality Control / Bugs Section */}
          <div className="task-detail-section task-detail-bugs-section">
            <div className="task-detail-section-head">
              <div>
                <div className="task-detail-label">Quality control</div>
                <div className="task-detail-section-title">Bugs</div>
              </div>
              <span className="task-detail-section-count">{localBugs.length}</span>
            </div>
            <div className="task-detail-bug-input-wrapper">
              <span className="task-detail-bug-input-plus">+</span>
              <input
                className="task-detail-bug-input"
                type="text"
                placeholder="Quick add an issue title and press Enter..."
                value={localBugTitle}
                onChange={(e) => setLocalBugTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && localBugTitle.trim()) {
                    const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
                    const reporterName = userData?.full_name || userData?.name || "You";
                    setLocalBugs((prev) => [
                      ...prev,
                      {
                        id: Date.now(),
                        bugId: `#${Math.floor(100000 + Math.random() * 900000)}`,
                        title: localBugTitle.trim(),
                        status: "Open",
                        reporter: reporterName,
                        assignees: [],
                      },
                    ]);
                    setLocalBugTitle("");
                  }
                }}
              />
            </div>
            {localBugs.length > 0 ? (
              <div className="task-detail-bug-table-wrapper">
                <table className="task-detail-bug-table">
                  <thead>
                    <tr>
                      <th className="bug-id-cell">Bug ID</th>
                      <th className="bug-title-cell">Title</th>
                      <th className="bug-status-cell">Status</th>
                      <th className="bug-reporter-cell">Reporter</th>
                      <th className="bug-assignees-cell">Assignees</th>
                      <th className="bug-actions-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localBugs.map((bug) => (
                      <tr key={bug.id}>
                        <td className="bug-id-cell">{bug.bugId}</td>
                        <td className="bug-title-cell">{bug.title}</td>
                        <td className="bug-status-cell">
                          <Select
                            size="small"
                            value={bug.status}
                            onChange={(val) =>
                              setLocalBugs((prev) =>
                                prev.map((b) => (b.id === bug.id ? { ...b, status: val } : b))
                              )
                            }
                            style={{ width: 100 }}
                            options={[
                              { value: "Open", label: "Open" },
                              { value: "In Progress", label: "In Progress" },
                              { value: "Closed", label: "Closed" },
                            ]}
                          />
                        </td>
                        <td className="bug-reporter-cell">{bug.reporter}</td>
                        <td className="bug-assignees-cell">
                          <Select
                            mode="multiple"
                            size="small"
                            style={{ width: "100%", minWidth: 120 }}
                            placeholder="Assign"
                            value={bug.assignees || []}
                            onChange={(val) =>
                              setLocalBugs((prev) =>
                                prev.map((b) => (b.id === bug.id ? { ...b, assignees: val } : b))
                              )
                            }
                            options={assigneeOptions.map((e) => ({
                              value: e._id,
                              label: e.full_name || e.name,
                            }))}
                            showSearch
                            optionFilterProp="label"
                            allowClear
                          />
                        </td>
                        <td className="bug-actions-cell">
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => setLocalBugs((prev) => prev.filter((b) => b.id !== bug.id))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="task-detail-empty-state">No issues tracked yet.</div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="task-detail-modal-footer-actions">
            <Button
              className="task-detail-primary-btn"
              type="primary"
              onClick={handleSubmit}
              loading={loading}
              icon={<SaveOutlined />}
            >
              Save
            </Button>
            <Button className="task-detail-secondary-btn" onClick={onCancel}>Close</Button>
          </div>
        </div>
      </Form>
    </>
  );

  const createRightPanel = (
    <>
      <div className="task-detail-sidebar-head">
        <div className="task-detail-sidebar-kicker">Workspace</div>
        <div className="task-detail-sidebar-title">Discussion and activity</div>
      </div>
      <Tabs
        activeKey={activeRightTab}
        onChange={setActiveRightTab}
        className="task-detail-tabs"
        destroyInactiveTabPane
        items={[
          {
            key: "comment",
            label: (
              <span className="task-detail-tab-label">
                <CommentOutlined /> Comments
                <span className="comment-badge">{localComments.length}</span>
              </span>
            ),
            children: (
              <div className="task-detail-tab-content task-detail-comments">
                <div className="comment-list-box">
                  <div className="comment-list-wrapper">
                    {localComments.length > 0 ? (
                      localComments.map((c, i) => (
                        <div className="main-comment-wrapper task-detail-comment-item" key={i}>
                          <div className="main-avatar-wrapper">
                            <div className="task-detail-local-avatar">
                              {currentUserInitials}
                            </div>
                            <div className="comment-sender-name">
                              <h1>{currentUserName}</h1>
                              <h4>{c.time}</h4>
                            </div>
                            <Dropdown
                              trigger={["click"]}
                              overlay={
                                <Menu>
                                  <Menu.Item
                                    key={`delete-${i}`}
                                    onClick={() => setLocalComments((prev) => prev.filter((_, idx) => idx !== i))}
                                    className="ant-delete"
                                  >
                                    <DeleteOutlined style={{ color: "red" }} /> Delete
                                  </Menu.Item>
                                </Menu>
                              }
                            >
                              <Button
                                className="task-detail-comment-menu"
                                type="text"
                                size="small"
                                icon={<MoreOutlined />}
                              />
                            </Dropdown>
                          </div>
                          <div className="comment-wrapper">
                            <p>{c.text}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="task-no-comments">No comments</div>
                    )}
                  </div>
                </div>
                <div className="task-detail-add-comment">
                  <div className="task-detail-composer-title">Add to the conversation</div>
                  <TextArea
                    rows={3}
                    placeholder="Share an update, mention blockers, or document the next step..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className="task-detail-composer-actions">
                    <Button
                      className="task-detail-comment-submit"
                      type="primary"
                      disabled={!commentText.trim()}
                      onClick={() => {
                        if (!commentText.trim()) return;
                        const now = new Date();
                        const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        setLocalComments((prev) => [...prev, { text: commentText.trim(), time, sender: currentUserName }]);
                        setCommentText("");
                      }}
                    >
                      Add comment
                    </Button>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "attachment",
            label: (
              <span className="task-detail-tab-label">
                <PaperClipOutlined /> Files
              </span>
            ),
            children: (
              <div className="task-detail-tab-content">
                {effectiveFileAttachment?.length > 0 ? (
                  <ul className="task-detail-attachment-list">
                    {effectiveFileAttachment.map((file, i) => (
                      <li key={i}>
                        <span className="task-detail-attachment-link">
                          {(file.name || "File") + (file.file_type || "")}
                        </span>
                        <div className="task-detail-attachment-actions">
                          <Button
                            type="text"
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => effectiveRemoveAttachmentFile(i, file)}
                            title="Remove"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="task-detail-tab-hint">No attachments yet.</p>
                )}
              </div>
            ),
          },
          {
            key: "activity",
            label: (
              <span className="task-detail-tab-label">
                <HistoryOutlined /> Activity
              </span>
            ),
            children: (
              <div className="task-detail-tab-content">
                <p className="task-detail-tab-hint">No activity yet.</p>
              </div>
            ),
          },
        ]}
      />
    </>
  );

  return (
    <>
      <TaskDetailModal
        open={open}
        onClose={onCancel}
        mode="create"
        createWidth={1100}
        createLeftPanel={createLeftPanel}
        createRightPanel={createRightPanel}
      />
      <Modal
        open={createUserOpen}
        onCancel={() => {
          setCreateUserOpen(false);
          setPendingUserName("");
          setCreateUserTarget(null);
        }}
        title={`Create User${pendingUserName ? `: ${pendingUserName}` : ""}`}
        okText="Create"
        onOk={handleCreateUser}
        confirmLoading={createUserLoading}
        destroyOnClose
      >
        <Form form={createUserForm} layout="vertical">
          <Form.Item
            name="first_name"
            label="First Name"
            rules={[{ required: true, message: "First name is required" }]}
          >
            <Input placeholder="First name" />
          </Form.Item>
          <Form.Item name="last_name" label="Last Name">
            <Input placeholder="Last name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: "email", message: "Valid email required" }]}
          >
            <Input placeholder="Email" />
          </Form.Item>
          <Form.Item
            name="pmsRoleId"
            label="Role"
            rules={[{ required: true, message: "Select a role" }]}
          >
            <Select placeholder="Select a role" loading={rolesLoading} allowClear>
              {roles.map((role) => (
                <Option key={role._id} value={role._id}>
                  {role.role_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password placeholder="Password" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
