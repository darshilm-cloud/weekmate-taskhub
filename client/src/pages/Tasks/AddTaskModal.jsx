/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "antd";
import {
  CloseOutlined,
  SendOutlined,
  PaperClipOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  MoreOutlined,
  MergeCellsOutlined,
} from "@ant-design/icons";
import Service from "../../service";
import { useDispatch, useSelector } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { getSubscribersList } from "../../appRedux/reducers/ApiData";
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
}) {
  const dispatch = useDispatch();
  const subscribersFromRedux = useSelector((state) => state.ApiData?.subscribersList || []);
  const [form] = Form.useForm(externalForm);
  const [activeRightTab, setActiveRightTab] = useState("comment");
  const [commentText, setCommentText] = useState("");
  const [localComments, setLocalComments] = useState([]);
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
  const mainTaskCacheRef = React.useRef({});
  const mainTaskInFlightRef = React.useRef(new Set());
  const watchedMainTaskId = Form.useWatch("main_task_id", form);
  const watchedProjectId = Form.useWatch("project_id", form);

  const isStandalone = standalone;
  const projectId = propProjectId;
  const mainTaskId = propMainTaskId;
  const effectiveProjectId = isStandalone ? (watchedProjectId || projectId) : projectId;

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
          const exists = prev.some((p) => p?._id === newUser?._id);
          return exists ? prev : [...prev, newUser];
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
        try { setAssigneeOptions(JSON.parse(cached)); } catch {}
      }
      // Always refresh in background
      Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsermaster,
        body: { pageNo: 1, limit: 500, search: "" },
      }).then((res) => {
        const users = res?.data?.data || [];
        if (users.length) {
          setAssigneeOptions(users);
          sessionStorage.setItem("atm_all_users", JSON.stringify(users));
        }
      }).catch(() => {});
    }
  }, [open, isStandalone, fetchProjects, fetchMainTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && projectId && isStandalone) {
      form.setFieldsValue({ project_id: projectId });
    }
    if (open && !isStandalone && projectId) {
      setMainTasks(mainTaskList);
    }
  }, [open, projectId, isStandalone, mainTaskList, form]);

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

  const assigneeList = isStandalone ? subscribersFromRedux : (subscribersList || []);
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
      setAssigneeOptions(assigneeList);
      setLoadingAssignees(false);
      return;
    }
    if (open && effectiveProjectId && !assigneeList.length) {
      if (fallbackAssignees.length) {
        setAssigneeOptions(fallbackAssignees);
      } else {
        setAssigneeOptions([]);
      }
      setLoadingAssignees(false);
    }
  }, [open, effectiveProjectId, assigneeList, fallbackAssignees, isStandalone]);

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
      const reqBody = {
        project_id: pid,
        main_task_id: mainId,
        title: (values.title || "").trim(),
        status: "active",
        descriptions: values.descriptions || "",
        due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
        start_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
        assignees: Array.isArray(values.assignees) ? values.assignees : [],
        pms_clients: Array.isArray(values.followers) ? values.followers : [],
        task_status: workflowId,
        task_labels: "",
        estimated_hours: "00",
        estimated_minutes: "00",
        task_progress: "0",
        recurringType: "",
      };
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
        message.success(response?.data?.message || "Task added");
        form.resetFields();
        onSuccess?.(response?.data?.data);
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

  const footer = (
    <div className="add-task-modal-footer">
      <Button type="button" size="large" className="add-task-btn-close" onClick={onCancel}>
        Close
      </Button>
      <Button type="primary" size="large" className="add-task-btn-submit" onClick={handleSubmit} loading={loading}>
        Submit
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        onCancel={onCancel}
        footer={null}
        width={900}
        className="add-task-modal-v2"
        closable={false}
        destroyOnClose
      >
        <div className="add-task-modal-v2-inner">
          <div className="add-task-modal-header">
            <span className="add-task-modal-header-title">Create New Task</span>
            <button type="button" className="add-task-modal-close-btn" onClick={onCancel} aria-label="Close">
              <CloseOutlined />
            </button>
          </div>

          <div className="add-task-modal-body">
            <div className="add-task-modal-left">
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item
                  name="title"
                  label="Write your task"
                  rules={[{ required: true, message: "Enter task title" }]}
                >
                  <Input placeholder="Task title" size="large" prefix={<span className="input-prefix-check">✓</span>} />
                </Form.Item>
                <div className="add-task-due-row">
                  <CalendarOutlined className="due-row-icon" />
                  <span className="due-row-label">Due Date</span>
                  <Form.Item name="due_date" noStyle>
                    <DatePicker style={{ flex: 1, minWidth: 0 }} format="YYYY-MM-DD" />
                  </Form.Item>
                  <Select
                    value={statusLabel}
                    onChange={setStatusLabel}
                    className="due-row-status-select"
                    options={[
                      { value: "Pending", label: "Pending" },
                      { value: "In Progress", label: "In Progress" },
                      { value: "Done", label: "Done" },
                    ]}
                  />
                  <Select
                    value={priorityLabel}
                    onChange={setPriorityLabel}
                    className="due-row-priority-select"
                    options={[
                      { value: "Low", label: "Low" },
                      { value: "Medium", label: "Medium" },
                      { value: "High", label: "High" },
                    ]}
                  />
                </div>
                <Form.Item name="descriptions" label="Task description">
                  <TextArea rows={4} placeholder="Description" />
                </Form.Item>
                {isStandalone && (
                  <>
                    <Form.Item name="project_id" label="Projects">
                      <Select
                        placeholder="Project"
                        allowClear
                        onChange={(id) => {
                          form.setFieldValue("main_task_id", undefined);
                          setMainTasks([]);
                          setFirstWorkflowStatusId(null);
                          if (id) {
                            fetchMainTasks(id);
                            if (!isStandalone) dispatch(getSubscribersList(id));
                            // In standalone mode, fetch project subscribers; fallback to all users
                            if (isStandalone) {
                              setLoadingAssignees(true);
                              Service.makeAPICall({
                                methodName: Service.getMethod,
                                api_url: `${Service.getMasterSubscribers}/${id}`,
                              }).then((res) => {
                                const subs = res?.data?.data;
                                if (Array.isArray(subs) && subs.length > 0) {
                                  setAssigneeOptions(subs);
                                } else {
                                  // fallback to pre-loaded all-users
                                  try {
                                    const cached = sessionStorage.getItem("atm_all_users");
                                    if (cached) setAssigneeOptions(JSON.parse(cached));
                                  } catch {}
                                }
                              }).catch(() => {
                                try {
                                  const cached = sessionStorage.getItem("atm_all_users");
                                  if (cached) setAssigneeOptions(JSON.parse(cached));
                                } catch {}
                              }).finally(() => setLoadingAssignees(false));
                            }
                          } else {
                            // project cleared — restore all users
                            if (isStandalone) {
                              try {
                                const cached = sessionStorage.getItem("atm_all_users");
                                if (cached) setAssigneeOptions(JSON.parse(cached));
                              } catch {}
                            } else {
                              setAssigneeOptions([]);
                            }
                          }
                        }}
                      >
                        {projects.map((p) => (
                          <Option key={p._id} value={p._id}>{p.title}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  <Form.Item name="main_task_id" label="List">
                    <Select
                      placeholder="Select list"
                      allowClear
                      disabled={false}
                      loading={loadingMainTasks || creatingList}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        String(option?.children || "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      onSearch={setListSearchText}
                      getPopupContainer={(node) => node.parentElement}
                      onDropdownVisibleChange={(visible) => {
                        if (!visible) return;
                        const pid = form.getFieldValue("project_id");
                        if (
                          pid &&
                          !mainTaskInFlightRef.current.has(pid) &&
                          mainTasks.length === 0 &&
                          !loadingMainTasks
                        ) {
                          // Clear stale cache entry so fetchMainTasks re-fetches
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
                          ? (
                            <Button
                              type="link"
                              onClick={() => createListFromSearch(listSearchText)}
                              style={{ padding: 0 }}
                            >
                              Create list "{listSearchText.trim()}"
                            </Button>
                          )
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
                  </>
                )}
              <Form.Item name="assignees" label="Assignee Team" >
                <Select
                  mode="multiple"
                  placeholder="Assignee/Team group *"
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
                      ? (
                        <Button
                          type="link"
                          onClick={() => openCreateUser(assigneeSearchText.trim(), "assignees")}
                          style={{ padding: 0 }}
                        >
                          Create user "{assigneeSearchText.trim()}"
                        </Button>
                      )
                      : null
                  }
                  onChange={(vals) => saveDraft(projectId, { assignees: vals || [] })}
                  filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
              <Form.Item name="followers" label="Follower">
                <Select
                  mode="multiple"
                  placeholder="Follower"
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
                      ? (
                        <Button
                          type="link"
                          onClick={() => openCreateUser(followerSearchText.trim(), "followers")}
                          style={{ padding: 0 }}
                        >
                          Create user "{followerSearchText.trim()}"
                        </Button>
                      )
                      : null
                  }
                  onChange={(vals) => saveDraft(projectId, { followers: vals || [] })}
                />
              </Form.Item>
                <div className="add-task-modal-row">
                  <UserOutlined className="add-task-modal-row-icon" />
                  <span className="add-task-modal-row-label">Select Multiple sub task assignee</span>
                  <Switch size="small" />
                </div>
                <div className="add-task-modal-links">
                  <Button
                    type="link"
                    className="link-upload"
                    disabled={isStandalone}
                    onClick={() => !isStandalone && attachmentfileRef?.current?.click?.()}
                  >
                    + Upload Document
                  </Button>
                  <Button type="link" className="link-subtask">+ Add Sub Task</Button>
                </div>
                <Form.Item name="mark_mandatory" valuePropName="checked" initialValue={false}>
                  <Checkbox>Mark as mandatory</Checkbox>
                </Form.Item>
              </Form>
            </div>

            <div className="add-task-modal-right">
              <Tabs
                activeKey={activeRightTab}
                onChange={setActiveRightTab}
                className="add-task-right-tabs"
                items={[
                  { key: "comment", label: "Comment" },
                  { key: "attachment", label: "Attachment" },
                  { key: "activity", label: "Log Activity" },
                ]}
              />
              <div className="add-task-right-content">
                {activeRightTab === "comment" && (
                  <div className="add-task-comment-list">
                    <div className="comment-date-divider">Today</div>
                    {localComments.length === 0 && (
                      <div className="comment-empty">No comments yet.</div>
                    )}
                    {localComments.map((c, i) => (
                      <div key={i} className="add-task-comment-item">
                        <div className="add-task-comment-bubble">{c.text}</div>
                        <div className="add-task-comment-time">{c.time}</div>
                      </div>
                    ))}
                  </div>
                )}
                {activeRightTab === "attachment" && <div className="add-task-comment-placeholder">No attachments.</div>}
                {activeRightTab === "activity" && <div className="add-task-comment-placeholder">No activity.</div>}
              </div>
              <div className="add-task-right-input">
                <Input
                  placeholder="Type a message"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="add-task-message-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && commentText.trim()) {
                      const now = new Date();
                      const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      setLocalComments((prev) => [...prev, { text: commentText.trim(), time }]);
                      setCommentText("");
                      setActiveRightTab("comment");
                    }
                  }}
                />
                <PaperClipOutlined className="input-icon" />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  className="input-send"
                  onClick={() => {
                    if (!commentText.trim()) return;
                    const now = new Date();
                    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    setLocalComments((prev) => [...prev, { text: commentText.trim(), time }]);
                    setCommentText("");
                    setActiveRightTab("comment");
                  }}
                />
              </div>
            </div>
          </div>

          {footer}
        </div>
      </Modal>
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
