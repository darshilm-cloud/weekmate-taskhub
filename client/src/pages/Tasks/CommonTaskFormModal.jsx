/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, Col, DatePicker, Dropdown, Form, Input, Menu, Mentions, Modal, Row, Select, Spin, Tabs, Upload, message } from "antd";
import { AudioOutlined, ClockCircleOutlined, CloseOutlined, CommentOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, HistoryOutlined, LoadingOutlined, MoreOutlined, PaperClipOutlined, PlayCircleOutlined, StopOutlined } from "@ant-design/icons";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import dayjs from "dayjs";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";
import "../TaskPage/TaskDetailModal.css";

const BACKEND_ONLY_KEYS = new Set(["id", "created_by", "created_at", "updated_at"]);
const BUILTIN_KEYS = new Set([
  "title",
  "description",
  "priority",
  "assignee_id",
  "labels",
  "start_date",
  "end_date",
  "project_id",
]);
const HIDDEN_RUNTIME_KEYS = new Set(["due_date", "main_task_id"]);
const PROJECT_DEPENDENT_LINKED_MODULES = new Set(["project_lists"]);
const modalDataCache = {
  taskFormFields: null,
  projects: null,
  mainTasksByProject: {},
  assigneesByProject: {},
  labelsByProject: {},
  linkedOptions: {},
};

const toLabel = (key = "") =>
  String(key)
    .split("_")
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() || ""}${word.slice(1)}`)
    .join(" ");

const canonicalFieldKey = (key = "") => {
  const normalized = String(key || "").trim().toLowerCase();
  if (normalized === "descriptions") return "description";
  return normalized;
};

const normalizeUploadFileEvent = (event) => {
  if (Array.isArray(event)) return event;
  return event?.fileList || [];
};
const asArray = (response) => {
  const value =
    response?.data?.data?.data ||
    response?.data?.data?.rows ||
    response?.data?.data?.docs ||
    response?.data?.data;
  return Array.isArray(value) ? value : [];
};
const normalizePeople = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      value: item?._id || item?.id,
      label: item?.full_name || item?.name || item?.email,
    }))
    .filter((item) => item.value && item.label);
const getSubscribersArray = (response) => {
  const payload = response?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const merged = []
      .concat(Array.isArray(payload.staff) ? payload.staff : [])
      .concat(Array.isArray(payload.manager) ? payload.manager : [])
      .concat(Array.isArray(payload.client) ? payload.client : [])
      .concat(Array.isArray(payload.users) ? payload.users : []);
    if (merged.length) return merged;
  }
  return [];
};

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "mov", "m4v", "avi", "mkv"];

const getAttachmentExtension = (value = "") => {
  const normalized = String(value || "").split("?")[0];
  const parts = normalized.split(".");
  return (parts.length > 1 ? parts.pop() : "").toLowerCase();
};

const resolveAttachmentUrl = (file) => {
  const rawPath = file?.path || file?.file_path;
  if (!rawPath) return "";
  const apiBase = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
  const normalized = String(rawPath).startsWith("/")
    ? String(rawPath)
    : `/${rawPath}`;
  if (/^https?:\/\//i.test(String(rawPath))) return String(rawPath);
  if (apiBase) {
    return `${apiBase}${normalized.startsWith("/public/") ? normalized : `/public${normalized}`}`;
  }
  return normalized.startsWith("/public/") ? normalized : `/public${normalized}`;
};

const getAttachmentKind = (file) => {
  const mime = String(file?.file_type || "").toLowerCase();
  const ext = getAttachmentExtension(file?.name || file?.file_name || file?.path || file?.file_path);
  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (mime.startsWith("video/") || VIDEO_EXTENSIONS.includes(ext)) return "video";
  return "document";
};

export default function CommonTaskFormModal({
  open,
  mode = "create",
  title,
  submitText,
  initialValues = {},
  lockedProjectId,
  lockedMainTaskId,
  showListSelector = true,
  onCancel,
  onSubmit,
  submitting = false,
  viewOnly = false,
  taskId,
}) {
  const [form] = Form.useForm();
  const [taskFormFields, setTaskFormFields] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [projects, setProjects] = useState([]);
  const [mainTasks, setMainTasks] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [labelOptions, setLabelOptions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingMainTasks, setLoadingMainTasks] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [linkedOptionsByField, setLinkedOptionsByField] = useState({});
  const [linkedLoadingByField, setLinkedLoadingByField] = useState({});
  const [activeRightTab, setActiveRightTab] = useState("comments");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentFiles, setCommentFiles] = useState([]);
  const [playingAttachmentByComment, setPlayingAttachmentByComment] = useState({});
  const [selectedCommentFolderId, setSelectedCommentFolderId] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceInterimText, setVoiceInterimText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [editingCommentAttachments, setEditingCommentAttachments] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [timeLogsLoading, setTimeLogsLoading] = useState(false);
  const [timesheetOptions, setTimesheetOptions] = useState([]);
  const [selectedTimesheetId, setSelectedTimesheetId] = useState(null);
  const [logHours, setLogHours] = useState("");
  const [logMinutes, setLogMinutes] = useState("");
  const [logDate, setLogDate] = useState(null);
  const [logDescription, setLogDescription] = useState("");
  const [submittingTimeLog, setSubmittingTimeLog] = useState(false);
  const [editingTimeLogId, setEditingTimeLogId] = useState(null);
  const [timeLogModalMode, setTimeLogModalMode] = useState("add");
  const [isTimeLogModalOpen, setIsTimeLogModalOpen] = useState(false);
  const hasHydratedForOpenRef = useRef(false);
  const inFlightRef = useRef(new Set());
  const previousSelectedProjectIdRef = useRef(null);
  const commentFileInputRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const effectiveTaskId = taskId || initialValues?._id || null;
  const loggedInUserId = useMemo(() => {
    try {
      return String(JSON.parse(localStorage.getItem("user_data") || "{}")?._id || "");
    } catch {
      return "";
    }
  }, []);

  const mentionOptions = (assigneeOptions || [])
    .filter((user) => user?.value && user?.label)
    .map((user) => ({
      key: user.value,
      value: removeTitle(user.label).trim(),
      label: user.label,
    }));

  const getTaggedUserIdsFromComment = useCallback(
    (commentText = "") =>
      mentionOptions
        .filter((user) => String(commentText || "").includes(`@${user.value}`))
        .map((user) => user.key),
    [mentionOptions]
  );

  const visibleFields = useMemo(() => {
    const normalized = (taskFormFields || [])
      .map((field) => {
        const normalizedKey = canonicalFieldKey(field?.key);
        return {
          ...field,
          key: normalizedKey,
        };
      })
      .filter((field) => field?.key && !BACKEND_ONLY_KEYS.has(field.key))
      .filter((field) => {
        const key = field.key;
        if (key === "status") return false;
        if (HIDDEN_RUNTIME_KEYS.has(key)) return false;
        if (showListSelector && (key === "project_id" || key === "main_task_id")) return false;
        return true;
      });

    const hasDescription = normalized.some((field) => field.key === "description");
    if (!hasDescription) {
      normalized.push({
        key: "description",
        label: "Description",
        type: "textarea",
        required: false,
        isDefault: true,
        order: 2,
      });
    }

    return normalized.sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
  }, [taskFormFields, showListSelector]);

  const selectedProjectId = Form.useWatch("project_id", form);
  const effectiveProjectId = lockedProjectId || selectedProjectId;
  const watchedTitle = Form.useWatch("title", form);
  const watchedStartDate = Form.useWatch("start_date", form);
  const watchedEndDate = Form.useWatch("end_date", form);
  const watchedAssignees = Form.useWatch("assignees", form);
  const watchedMainTaskId = Form.useWatch("main_task_id", form);
  const watchedHoursAssigned = Form.useWatch("hours_assigned", form);
  const watchedCustomHoursAssigned = Form.useWatch(["custom_fields", "hours_assigned"], form);
  const effectiveMainTaskId = lockedMainTaskId || watchedMainTaskId;

  const fetchTaskFormConfig = useCallback(async () => {
    if (Array.isArray(modalDataCache.taskFormFields) && modalDataCache.taskFormFields.length > 0) {
      setTaskFormFields(modalDataCache.taskFormFields);
      return;
    }
    if (inFlightRef.current.has("taskFormConfig")) return;
    inFlightRef.current.add("taskFormConfig");
    try {
      setLoadingConfig(true);
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getTaskFormConfig,
      });
      if (response?.data?.status === 1 && Array.isArray(response?.data?.data?.fields)) {
        modalDataCache.taskFormFields = response.data.data.fields;
        setTaskFormFields(response.data.data.fields);
      } else {
        setTaskFormFields([]);
      }
    } catch (error) {
      setTaskFormFields([]);
    } finally {
      setLoadingConfig(false);
      inFlightRef.current.delete("taskFormConfig");
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    if (Array.isArray(modalDataCache.projects) && modalDataCache.projects.length > 0) {
      setProjects(modalDataCache.projects);
      return;
    }
    if (inFlightRef.current.has("projects")) return;
    inFlightRef.current.add("projects");
    setLoadingProjects(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: { pageNo: 1, limit: 200, search: "" },
      });
      const list = res?.data?.data?.data || res?.data?.data || [];
      const safe = Array.isArray(list) ? list : [];
      modalDataCache.projects = safe;
      setProjects(safe);
    } catch (e) {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
      inFlightRef.current.delete("projects");
    }
  }, []);

  const fetchMainTasks = useCallback(async (projectId) => {
    if (!projectId) {
      setMainTasks([]);
      return;
    }
    if (Array.isArray(modalDataCache.mainTasksByProject[projectId])) {
      setMainTasks(modalDataCache.mainTasksByProject[projectId]);
      return;
    }
    const key = `mainTasks:${projectId}`;
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);
    setLoadingMainTasks(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectMianTask,
        body: { project_id: projectId, search: "", sort: "_id", sortBy: "des" },
      });
      const safe = Array.isArray(res?.data?.data) ? res.data.data : [];
      modalDataCache.mainTasksByProject[projectId] = safe;
      setMainTasks(safe);
    } catch (e) {
      setMainTasks([]);
    } finally {
      setLoadingMainTasks(false);
      inFlightRef.current.delete(key);
    }
  }, []);

  const fetchAssignees = useCallback(async (projectId) => {
    const cacheKey = projectId || "__none__";
    if (Array.isArray(modalDataCache.assigneesByProject[cacheKey])) {
      setAssigneeOptions(modalDataCache.assigneesByProject[cacheKey]);
      return;
    }
    const key = `assignees:${cacheKey}`;
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);

    setLoadingAssignees(true);
    try {
      let safe = [];
      if (projectId) {
        const res = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: `${Service.getMasterSubscribers}/${projectId}`,
        });
        safe = getSubscribersArray(res);
      } else {
        safe = [];
      }

      const normalized = normalizePeople(safe);
      modalDataCache.assigneesByProject[cacheKey] = normalized;
      setAssigneeOptions(normalized);
    } catch (e) {
      setAssigneeOptions([]);
    } finally {
      setLoadingAssignees(false);
      inFlightRef.current.delete(key);
    }
  }, []);

  const fetchLabels = useCallback(async (projectId) => {
    const cacheKey = projectId || "__global__";
    if (Array.isArray(modalDataCache.labelsByProject[cacheKey])) {
      setLabelOptions(modalDataCache.labelsByProject[cacheKey]);
      return;
    }
    const inFlightKey = `labels:${cacheKey}`;
    if (inFlightRef.current.has(inFlightKey)) return;
    inFlightRef.current.add(inFlightKey);
    try {
      const body = projectId ? { isDropdown: true, project_id: projectId } : { isDropdown: true };
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectLabels,
        body,
      });
      const safe = Array.isArray(res?.data?.data) ? res.data.data : [];
      modalDataCache.labelsByProject[cacheKey] = safe;
      setLabelOptions(safe);
    } catch (e) {
      setLabelOptions([]);
    } finally {
      inFlightRef.current.delete(inFlightKey);
    }
  }, []);

  const fetchLinkedModuleOptions = useCallback(async (moduleKey, projectId) => {
    try {
      if (moduleKey === "employees") {
        if (Array.isArray(assigneeOptions) && assigneeOptions.length > 0) {
          return assigneeOptions;
        }
        if (projectId) {
          const response = await Service.makeAPICall({
            methodName: Service.getMethod,
            api_url: `${Service.getMasterSubscribers}/${projectId}`,
          });
          const items = getSubscribersArray(response);
          if (items.length > 0) {
            return normalizePeople(items);
          }
        }
        const dropdownResponse = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: Service.getEmployees,
        });
        const dropdownItems = asArray(dropdownResponse);
        if (dropdownItems.length > 0) {
          return normalizePeople(dropdownItems);
        }
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getUsermaster,
          body: { pageNo: 1, limit: 500, search: "" },
        });
        const items = asArray(response);
        return normalizePeople(items);
      }

      if (moduleKey === "clients") {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getClients,
          body: { isDropdown: true },
        });
        let items = asArray(response);
        if (!items.length) {
          const fallback = await Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: Service.clientlist,
            body: { pageNo: 1, limit: 200, search: "" },
          });
          items = asArray(fallback);
        }
        return items.map((item) => ({
          value: item?._id,
          label: item?.full_name || item?.name || item?.company_name || item?.email,
        }));
      }

      if (moduleKey === "project_labels") {
        if (Array.isArray(labelOptions) && labelOptions.length > 0) {
          return labelOptions.map((item) => ({ value: item?._id, label: item?.title }));
        }
        const body = projectId ? { isDropdown: true, project_id: projectId } : { isDropdown: true };
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectLabels,
          body,
        });
        const items = asArray(response);
        return items.map((item) => ({ value: item?._id, label: item?.title }));
      }

      if (moduleKey === "projects") {
        if (Array.isArray(projects) && projects.length > 0) {
          return projects.map((item) => ({ value: item?._id, label: item?.title }));
        }
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.myProjects,
          body: { pageNo: 1, limit: 200, search: "" },
        });
        const safeItems = asArray(response);
        return safeItems.map((item) => ({ value: item?._id, label: item?.title }));
      }

      if (moduleKey === "project_lists") {
        if (Array.isArray(mainTasks) && mainTasks.length > 0) {
          return mainTasks.map((item) => ({ value: item?._id, label: item?.title }));
        }
        if (!projectId) return [];
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectMianTask,
          body: { project_id: projectId, search: "", sort: "_id", sortBy: "des" },
        });
        const items = asArray(response);
        return items.map((item) => ({ value: item?._id, label: item?.title }));
      }
    } catch (error) {
      return [];
    }
    return [];
  }, [assigneeOptions, labelOptions, mainTasks, projects]);

  useEffect(() => {
    if (!open) return;
    fetchTaskFormConfig();
    fetchProjects();
  }, [open]);

  useEffect(() => {
    if (!open) {
      hasHydratedForOpenRef.current = false;
      previousSelectedProjectIdRef.current = null;
      return;
    }
    if (hasHydratedForOpenRef.current) return;

    const presetProject = lockedProjectId || initialValues?.project_id;
    const presetList = lockedMainTaskId || initialValues?.main_task_id;
    form.resetFields();
    form.setFieldsValue({
      ...initialValues,
      priority: initialValues?.priority || "Low",
      project_id: presetProject || initialValues?.project_id,
      main_task_id: presetList || initialValues?.main_task_id,
    });
    if (presetProject) {
      fetchMainTasks(presetProject);
      fetchAssignees(presetProject);
      fetchLabels(presetProject);
    }
    hasHydratedForOpenRef.current = true;
  }, [open, lockedProjectId, lockedMainTaskId, form, fetchMainTasks, fetchAssignees, fetchLabels]); 

  useEffect(() => {
    if (!open) return;
    const pid = lockedProjectId || selectedProjectId;

    if (!lockedProjectId) {
      const previousProjectId = previousSelectedProjectIdRef.current;
      if (
        previousProjectId &&
        pid &&
        String(previousProjectId) !== String(pid)
      ) {
        form.setFieldsValue({
          main_task_id: undefined,
          assignees: [],
        });
      }
      previousSelectedProjectIdRef.current = pid || null;
    }

    if (pid) {
      fetchMainTasks(pid);
      fetchAssignees(pid);
      fetchLabels(pid);
      return;
    }
    // Strict mode: assignees only from selected project's subscribers.
    setAssigneeOptions([]);
    fetchLabels(null);
  }, [selectedProjectId, open, lockedProjectId]);

  const fetchComments = useCallback(async () => {
    if (!effectiveTaskId) return;
    setCommentsLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.listTaskComments,
        body: { task_id: effectiveTaskId },
      });
      if (res?.data?.status) {
        setComments(Array.isArray(res?.data?.data) ? res.data.data : []);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [effectiveTaskId]);

  const fetchCommentFolders = useCallback(async () => {
    if (!effectiveProjectId) {
      setSelectedCommentFolderId(null);
      return;
    }
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getFolderslist,
        body: { project_id: effectiveProjectId },
      });
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      if (list.length > 0) {
        setSelectedCommentFolderId((prev) =>
          prev && list.some((item) => item?._id === prev) ? prev : list[0]?._id || null
        );
      } else {
        setSelectedCommentFolderId(null);
      }
    } catch {
      setSelectedCommentFolderId(null);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    if (!open || mode !== "view" || !effectiveTaskId) return;
    fetchComments();
  }, [open, mode, effectiveTaskId, fetchComments]);

  useEffect(() => {
    if (!open || mode !== "view") return;
    fetchCommentFolders();
  }, [open, mode, fetchCommentFolders]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR));
  }, []);

  useEffect(() => {
    if (!open && speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // no-op
      }
      speechRecognitionRef.current = null;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      setIsVoiceListening(false);
      setVoiceInterimText("");
    }
  }, [open]);

  const resetVoiceSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    silenceTimeoutRef.current = setTimeout(() => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {
          // no-op
        }
      }
    }, 3500);
  }, []);

  const uploadCommentFiles = useCallback(async (files) => {
    if (!Array.isArray(files) || files.length === 0) return [];
    const formData = new FormData();
    files.forEach((file) => formData.append("document", file));
    const response = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: `${Service.fileUpload}?file_for=comment`,
      body: formData,
      options: {
        "content-type": "multipart/form-data",
      },
    });
    return Array.isArray(response?.data?.data) ? response.data.data : [];
  }, []);

  const handleCommentFilesChange = useCallback((event) => {
    const selectedFiles = Array.from(event?.target?.files || []);
    const allowed = [];
    selectedFiles.forEach((file) => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB <= 20) {
        allowed.push(file);
      } else {
        message.error(`File '${file.name}' exceeds the 20MB file size limit.`);
      }
    });
    if (allowed.length) setCommentFiles((prev) => [...prev, ...allowed]);
    if (event?.target) event.target.value = "";
  }, []);

  const removeCommentFile = useCallback((index) => {
    setCommentFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDownloadAttachment = useCallback((file) => {
    const href = resolveAttachmentUrl(file);
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      message.error("Voice input is not supported in this browser.");
      return;
    }
    if (isVoiceListening && speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // no-op
      }
      return;
    }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsVoiceListening(true);
      setVoiceInterimText("");
      resetVoiceSilenceTimeout();
    };
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalTranscript += `${text} `;
        else interimTranscript += text;
      }
      if (finalTranscript.trim()) {
        setCommentText((prev) => `${prev}${prev && !/\s$/.test(prev) ? " " : ""}${finalTranscript}`.trimStart());
      }
      setVoiceInterimText(interimTranscript);
      if (finalTranscript.trim() || interimTranscript.trim()) {
        resetVoiceSilenceTimeout();
      }
    };
    recognition.onerror = () => {
      setIsVoiceListening(false);
      setVoiceInterimText("");
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    };
    recognition.onend = () => {
      setIsVoiceListening(false);
      setVoiceInterimText("");
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      speechRecognitionRef.current = null;
    };
    speechRecognitionRef.current = recognition;
    recognition.start();
  }, [isVoiceListening, resetVoiceSilenceTimeout]);

  const handleAddComment = useCallback(async () => {
    const hasFiles = commentFiles.length > 0;
    const commentToSend = `${commentText}${voiceInterimText ? ` ${voiceInterimText}` : ""}`.trim();
    if (!effectiveTaskId || (!commentToSend && !hasFiles)) return;
    if (hasFiles && !selectedCommentFolderId) {
      message.error("Please select a folder before attaching files.");
      return;
    }
    setSubmittingComment(true);
    try {
      let uploadedAttachments = [];
      const taggedUsers = getTaggedUserIdsFromComment(commentToSend);
      if (hasFiles) {
        uploadedAttachments = await uploadCommentFiles(commentFiles);
      }
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addTaskComments,
        body: {
          task_id: effectiveTaskId,
          comment: commentToSend,
          taggedUsers,
          attachments: uploadedAttachments,
          ...(hasFiles ? { folder_id: selectedCommentFolderId } : {}),
        },
      });
      if (res?.data?.status) {
        setCommentText("");
        setCommentFiles([]);
        setVoiceInterimText("");
        fetchComments();
      } else {
        message.error(res?.data?.message || "Failed to add comment");
      }
    } catch {
      message.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  }, [effectiveTaskId, commentText, voiceInterimText, commentFiles, selectedCommentFolderId, uploadCommentFiles, fetchComments, getTaggedUserIdsFromComment]);

  const handleCommentInputPressEnter = useCallback((event) => {
    if (event?.shiftKey) return;
    event?.preventDefault?.();
    if (submittingComment) return;
    const composedComment = `${commentText}${voiceInterimText ? ` ${voiceInterimText}` : ""}`.trim();
    if (!composedComment && commentFiles.length === 0) return;
    handleAddComment();
  }, [submittingComment, commentText, voiceInterimText, commentFiles.length, handleAddComment]);

  const handleDeleteComment = useCallback(async (commentId) => {
    if (!commentId) return;
    try {
      const res = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteTaskComments}/${commentId}`,
      });
      if (res?.data?.status) {
        message.success("Comment deleted");
        fetchComments();
      } else {
        message.error(res?.data?.message || "Failed to delete comment");
      }
    } catch {
      message.error("Failed to delete comment");
    }
  }, [fetchComments]);

  const handleStartEditComment = useCallback((comment) => {
    setEditingCommentId(comment?._id || null);
    setEditingCommentText(comment?.comment || "");
    setEditingCommentAttachments(Array.isArray(comment?.attachments) ? comment.attachments : []);
  }, []);

  const handleCancelEditComment = useCallback(() => {
    setEditingCommentId(null);
    setEditingCommentText("");
    setEditingCommentAttachments([]);
  }, []);

  const handleSaveEditComment = useCallback(async () => {
    if (!editingCommentId) return;
    try {
      const taggedUsers = getTaggedUserIdsFromComment(editingCommentText);
      const res = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.editTaskComments}/${editingCommentId}`,
        body: {
          comment: editingCommentText,
          taggedUsers,
          attachments: editingCommentAttachments,
        },
      });
      if (res?.data?.status) {
        message.success("Comment updated");
        setEditingCommentId(null);
        setEditingCommentText("");
        setEditingCommentAttachments([]);
        fetchComments();
      } else {
        message.error(res?.data?.message || "Failed to update comment");
      }
    } catch {
      message.error("Failed to update comment");
    }
  }, [editingCommentId, editingCommentText, editingCommentAttachments, fetchComments, getTaggedUserIdsFromComment]);

  const fetchTaskTimeLogs = useCallback(async () => {
    if (!effectiveTaskId || !effectiveProjectId) return;
    setTimeLogsLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskLoggedHours,
        body: {
          project_id: effectiveProjectId,
          task_id: effectiveTaskId,
        },
      });
      if (res?.data?.status) {
        setTimeLogs(Array.isArray(res?.data?.data) ? res.data.data : []);
      } else {
        setTimeLogs([]);
      }
    } catch {
      setTimeLogs([]);
    } finally {
      setTimeLogsLoading(false);
    }
  }, [effectiveTaskId, effectiveProjectId]);

  const fetchProjectTimesheets = useCallback(async () => {
    if (!effectiveProjectId) return;
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTimesheet,
        body: { project_id: effectiveProjectId },
      });
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setTimesheetOptions(list);
      if (list.length > 0) {
        setSelectedTimesheetId((prev) => prev || list[0]?._id || null);
      }
    } catch {
      setTimesheetOptions([]);
    }
  }, [effectiveProjectId]);

  const resetTimeLogForm = useCallback(() => {
    setEditingTimeLogId(null);
    setTimeLogModalMode("add");
    setLogHours("");
    setLogMinutes("");
    setLogDate(null);
    setLogDescription("");
    setIsTimeLogModalOpen(false);
  }, []);

  const openAddTimeLogModal = useCallback(() => {
    setEditingTimeLogId(null);
    setTimeLogModalMode("add");
    setLogHours("");
    setLogMinutes("");
    setLogDate(null);
    setLogDescription("");
    setIsTimeLogModalOpen(true);
  }, []);

  const handleDeleteTimeLog = useCallback(
    async (timeLogId) => {
      if (!timeLogId) return;
      try {
        const res = await Service.makeAPICall({
          methodName: Service.deleteMethod,
          api_url: `${Service.deleteTime}/${timeLogId}`,
        });
        if (res?.data?.status) {
          message.success(res?.data?.message || "Logged hour deleted");
          fetchTaskTimeLogs();
          if (editingTimeLogId === timeLogId) {
            resetTimeLogForm();
          }
        } else {
          message.error(res?.data?.message || "Failed to delete logged hour");
        }
      } catch {
        message.error("Failed to delete logged hour");
      }
    },
    [fetchTaskTimeLogs, editingTimeLogId, resetTimeLogForm]
  );

  const handleEditTimeLog = useCallback((entry) => {
    if (!entry?._id) return;
    setTimeLogModalMode("edit");
    setEditingTimeLogId(entry._id);
    setLogHours(String(entry?.logged_hours || ""));
    setLogMinutes(String(entry?.logged_minutes || ""));
    setLogDescription(String(entry?.descriptions || ""));
    setLogDate(entry?.logged_date ? dayjs(entry.logged_date, "DD-MM-YYYY") : null);
    const entryTimesheetId =
      (typeof entry?.timesheet_id === "object" ? entry?.timesheet_id?._id : entry?.timesheet_id) ||
      entry?.timesheet?._id ||
      null;
    if (entryTimesheetId) setSelectedTimesheetId(String(entryTimesheetId));
    setIsTimeLogModalOpen(true);
  }, []);

  const openViewTimeLogModal = useCallback((entry) => {
    if (!entry?._id) return;
    setTimeLogModalMode("view");
    setEditingTimeLogId(entry._id);
    setLogHours(String(entry?.logged_hours || ""));
    setLogMinutes(String(entry?.logged_minutes || ""));
    setLogDescription(String(entry?.descriptions || ""));
    setLogDate(entry?.logged_date ? dayjs(entry.logged_date, "DD-MM-YYYY") : null);
    const entryTimesheetId =
      (typeof entry?.timesheet_id === "object" ? entry?.timesheet_id?._id : entry?.timesheet_id) ||
      entry?.timesheet?._id ||
      null;
    if (entryTimesheetId) setSelectedTimesheetId(String(entryTimesheetId));
    setIsTimeLogModalOpen(true);
  }, []);

  const handleAddTimeLog = useCallback(async () => {
    if (!effectiveTaskId || !effectiveProjectId) return;
    if (!selectedTimesheetId) {
      message.error("Please select a timesheet.");
      return;
    }
    if (!logDate) {
      message.error("Please choose a log date.");
      return;
    }
    if (!String(logHours || "").trim() && !String(logMinutes || "").trim()) {
      message.error("Please enter logged hours or minutes.");
      return;
    }
    setSubmittingTimeLog(true);
    try {
      const payload = {
        descriptions: logDescription || "",
        logged_hours: String(logHours || "00"),
        logged_minutes: String(logMinutes || "00"),
        logged_date: dayjs(logDate).format("DD-MM-YYYY"),
      };
      const res = await Service.makeAPICall({
        methodName: editingTimeLogId ? Service.putMethod : Service.postMethod,
        api_url: editingTimeLogId
          ? `${Service.updateTimesheet}/${editingTimeLogId}`
          : Service.addLoggedHours,
        body: editingTimeLogId
          ? payload
          : {
              ...payload,
              project_id: effectiveProjectId,
              task_id: effectiveTaskId,
              timesheet_id: selectedTimesheetId,
              logged_status: "Billable",
              isManuallyAdded: true,
            },
      });
      if (res?.data?.status) {
        message.success(
          res?.data?.message || (editingTimeLogId ? "Logged hour updated" : "Hours logged")
        );
        resetTimeLogForm();
        fetchTaskTimeLogs();
      } else {
        message.error(
          res?.data?.message ||
            (editingTimeLogId ? "Failed to update logged hour" : "Failed to log hours")
        );
      }
    } catch {
      message.error(editingTimeLogId ? "Failed to update logged hour" : "Failed to log hours");
    } finally {
      setSubmittingTimeLog(false);
    }
  }, [
    effectiveTaskId,
    effectiveProjectId,
    selectedTimesheetId,
    logDate,
    logHours,
    logMinutes,
    logDescription,
    editingTimeLogId,
    resetTimeLogForm,
    fetchTaskTimeLogs,
  ]);

  useEffect(() => {
    if (!open || mode !== "view" || !effectiveTaskId || !effectiveProjectId) return;
    fetchTaskTimeLogs();
    fetchProjectTimesheets();
  }, [open, mode, effectiveTaskId, effectiveProjectId, fetchTaskTimeLogs, fetchProjectTimesheets]);

  useEffect(() => {
    if (!open) return;
    const linkedFields = (visibleFields || []).filter(
      (field) =>
        (field?.type === "select" || field?.type === "multiselect") &&
        field?.optionSource === "linked" &&
        field?.linkedModule
    );
    if (!linkedFields.length) {
      setLinkedOptionsByField({});
      return;
    }

    Promise.all(
      linkedFields.map(async (field) => {
        const options = await fetchLinkedModuleOptions(field.linkedModule, effectiveProjectId);
        return { key: field.key, options };
      })
    ).then((results) => {
      const next = {};
      results.forEach((result) => {
        if (result?.key) next[result.key] = result.options || [];
      });
      setLinkedOptionsByField(next);
    });
  }, [open, visibleFields, effectiveProjectId, fetchLinkedModuleOptions]);

  const loadLinkedOptionsForField = useCallback(
    async (field, force = false) => {
      const key = String(field?.key || "");
      const moduleKey = String(field?.linkedModule || "");
      const linkedCacheKey = `${moduleKey}::${effectiveProjectId || "global"}`;
      if (!key || !moduleKey) return;
      if (
        PROJECT_DEPENDENT_LINKED_MODULES.has(moduleKey) &&
        !effectiveProjectId
      ) {
        setLinkedOptionsByField((prev) => ({ ...prev, [key]: [] }));
        return;
      }
      if (!force && Array.isArray(linkedOptionsByField[key]) && linkedOptionsByField[key].length > 0) {
        return;
      }
      if (!force && Array.isArray(modalDataCache.linkedOptions[linkedCacheKey])) {
        setLinkedOptionsByField((prev) => ({
          ...prev,
          [key]: modalDataCache.linkedOptions[linkedCacheKey],
        }));
        return;
      }
      setLinkedLoadingByField((prev) => ({ ...prev, [key]: true }));
      try {
        const options = await fetchLinkedModuleOptions(moduleKey, effectiveProjectId);
        modalDataCache.linkedOptions[linkedCacheKey] = options || [];
        setLinkedOptionsByField((prev) => ({ ...prev, [key]: options || [] }));
      } finally {
        setLinkedLoadingByField((prev) => ({ ...prev, [key]: false }));
      }
    },
    [effectiveProjectId, fetchLinkedModuleOptions, linkedOptionsByField]
  );

  const renderFieldControl = (field, formName) => {
    const key = canonicalFieldKey(field?.key);
    const placeholder = field.label || toLabel(key);
    if (key === "title") {
      return <Input placeholder={placeholder} readOnly={viewOnly} />;
    }
    if (key === "description") {
      const descriptionValue = form.getFieldValue(formName) || "";
      if (viewOnly) {
        return (
          <div
            className="task-detail-description"
            dangerouslySetInnerHTML={{ __html: descriptionValue || "<p>-</p>" }}
          />
        );
      }
      return (
        <div className="pfm-editor-wrapper">
          <CKEditor
            editor={Custombuild}
            data={descriptionValue}
            config={{
              toolbar: [
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
              ],
              removePlugins: ["MediaEmbed", "ImageUpload", "EasyImage", "CKFinderUploadAdapter"],
            }}
            onChange={(event, editor) => {
              form.setFieldValue(formName, editor.getData());
            }}
          />
        </div>
      );
    }
    if (key === "priority") {
      return (
        <Select
          disabled={viewOnly}
          options={[
            { value: "Low", label: "Low" },
            { value: "Medium", label: "Medium" },
            { value: "High", label: "High" },
          ]}
        />
      );
    }
    if (key === "assignee_id") {
      return (
        <Select
          mode="multiple"
          placeholder="Select assignees"
          disabled={viewOnly || !effectiveProjectId}
          loading={loadingAssignees}
          showSearch
          optionFilterProp="label"
          options={(assigneeOptions || [])
            .map((u) => ({
              value: u?.value || u?._id || u?.id,
              label: u?.label || u?.full_name || u?.name || u?.email,
            }))
            .filter((opt) => opt.value && opt.label)}
          allowClear
          notFoundContent={!effectiveProjectId ? "Select project first" : undefined}
        />
      );
    }
    if (key === "labels") {
      return (
        <Select
          disabled={viewOnly}
          placeholder="Select labels"
          showSearch
          optionFilterProp="label"
          options={labelOptions.map((lbl) => ({ value: lbl?._id, label: lbl?.title }))}
          allowClear
        />
      );
    }
    if (key === "start_date") {
      return (
        <DatePicker
          style={{ width: "100%" }}
          disabled={viewOnly}
          disabledDate={(current) => {
            const endDate = form.getFieldValue("end_date");
            return !!(endDate && current && current.isAfter(dayjs(endDate), "day"));
          }}
        />
      );
    }
    if (key === "end_date") {
      return (
        <DatePicker
          style={{ width: "100%" }}
          disabled={viewOnly}
          disabledDate={(current) => {
            const startDate = form.getFieldValue("start_date");
            if (!startDate || !current) return false;
            return current.isBefore(dayjs(startDate), "day");
          }}
        />
      );
    }
    if (key === "project_id") {
      return (
        <Select
          disabled={viewOnly || Boolean(lockedProjectId)}
          loading={loadingProjects}
          placeholder="Select project"
          showSearch
          optionFilterProp="label"
          options={projects.map((p) => ({ value: p?._id, label: p?.title }))}
        />
      );
    }
    if (field?.type === "textarea") {
      return <Input.TextArea rows={3} placeholder={placeholder} readOnly={viewOnly} />;
    }
    if (field?.type === "number") {
      return <Input type="number" placeholder={placeholder} readOnly={viewOnly} />;
    }
    if (field?.type === "date" || field?.type === "datetime") {
      return <DatePicker style={{ width: "100%" }} showTime={field?.type === "datetime"} disabled={viewOnly} />;
    }
    if (field?.type === "select" || field?.type === "multiselect") {
      const isLinked = field?.optionSource === "linked" && field?.linkedModule;
      const linkedOptions = linkedOptionsByField[key] || [];
      const requiresProject = PROJECT_DEPENDENT_LINKED_MODULES.has(String(field?.linkedModule || ""));
      const linkedDisabled = Boolean(requiresProject && !effectiveProjectId);
      const options =
        isLinked
          ? (linkedOptions.length > 0
              ? linkedOptions
              : (field?.options || []).map((opt) => ({ value: opt, label: opt })))
          : (field?.options || []).map((opt) => ({ value: opt, label: opt }));

      if (viewOnly) {
        const currentValue = form.getFieldValue(formName);
        const optionMap = new Map(options.map((opt) => [String(opt?.value), opt?.label]));
        const values = Array.isArray(currentValue) ? currentValue : [currentValue];
        const labels = values
          .filter((value) => value !== undefined && value !== null && value !== "")
          .map((value) => optionMap.get(String(value)) || String(value));
        return <span>{labels.length ? labels.join(", ") : "-"}</span>;
      }
      return (
        <Select
          mode={field?.type === "multiselect" ? "multiple" : undefined}
          disabled={viewOnly || linkedDisabled}
          loading={Boolean(linkedLoadingByField[key])}
          options={options}
          onDropdownVisibleChange={(visible) => {
            if (visible && isLinked) {
              loadLinkedOptionsForField(field, false);
            }
          }}
          notFoundContent={
            linkedDisabled
              ? "Select a project first"
              : undefined
          }
          allowClear
          placeholder={
            isLinked
              ? `Select ${placeholder.toLowerCase()} from linked ${String(field?.linkedModule || "").replace(/_/g, " ")}`
              : placeholder
          }
        />
      );
    }
    if (field?.type === "checkbox") {
      return <Checkbox disabled={viewOnly}>{placeholder}</Checkbox>;
    }
    if (field?.type === "file") {
      if (viewOnly) {
        return <Input placeholder="File attachments are view-only in detail modal." readOnly />;
      }
      return (
        <Upload.Dragger beforeUpload={() => false} maxCount={1} multiple={false}>
          <p style={{ margin: 0 }}>Click or drag file to upload</p>
        </Upload.Dragger>
      );
    }
    return <Input placeholder={placeholder} readOnly={viewOnly} />;
  };

  const handleOk = async () => {
    if (viewOnly) {
      onCancel?.();
      return;
    }
    try {
      const values = await form.validateFields();
      const normalizedTaskLabels = Array.isArray(values?.task_labels)
        ? values.task_labels
        : values?.task_labels
        ? [values.task_labels]
        : [];
      const projectId = lockedProjectId || values.project_id;
      const mainTaskId = lockedMainTaskId || values.main_task_id;
      const mainTaskBelongsToSelectedProject =
        !showListSelector ||
        Boolean(lockedMainTaskId) ||
        (Array.isArray(mainTasks) &&
          mainTasks.some((task) => String(task?._id) === String(mainTaskId)));
      if (!projectId) {
        message.error("Project is required.");
        return;
      }
      if (showListSelector && !mainTaskId) {
        message.error("List is required.");
        return;
      }
      if (!mainTaskBelongsToSelectedProject) {
        message.error("Please select a valid list for the selected project.");
        return;
      }
      onSubmit?.({
        ...values,
        task_labels: normalizedTaskLabels,
        project_id: projectId,
        main_task_id: mainTaskId,
        taskFormFields: visibleFields,
      });
    } catch (e) {
      console.log("Form validation failed:", e);
      // form validation errors handled by antd, but if a hidden field fails, it might be invisible
      message.error("Please fill in all required fields.");
    }
  };

  const getFieldFormName = useCallback((field) => {
    const key = canonicalFieldKey(field?.key);
    if (key === "title") return "title";
    if (key === "description") return "description";
    if (key === "priority") return "priority";
    if (key === "assignee_id") return "assignees";
    if (key === "labels") return "task_labels";
    if (key === "start_date" || key === "end_date") return key;
    if (key === "project_id" || key === "main_task_id") return key;
    return ["custom_fields", key];
  }, []);
  const selectedProjectName = useMemo(
    () => projects.find((project) => project?._id === effectiveProjectId)?.title || "",
    [projects, effectiveProjectId]
  );
  const selectedListName = useMemo(
    () => mainTasks.find((item) => item?._id === effectiveMainTaskId)?.title || "",
    [mainTasks, effectiveMainTaskId]
  );
  const selectedAssigneeCount = Array.isArray(watchedAssignees) ? watchedAssignees.length : 0;
  const totalAssignedHoursDisplay = useMemo(() => {
    const rawValue =
      watchedHoursAssigned ??
      watchedCustomHoursAssigned ??
      initialValues?.hours_assigned ??
      initialValues?.custom_fields?.hours_assigned ??
      initialValues?.estimatedHours ??
      "";
    const normalized = String(rawValue || "").trim();
    return normalized ? `${normalized}h` : "--";
  }, [
    watchedHoursAssigned,
    watchedCustomHoursAssigned,
    initialValues?.hours_assigned,
    initialValues?.custom_fields?.hours_assigned,
    initialValues?.estimatedHours,
  ]);
  const formatMetricDate = (value) => {
    if (!value) return "Not set";
    if (value?.format) return value.format("DD-MM-YYYY");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Modal
      className="task-page-detail-modal"
      open={open}
      onCancel={onCancel}
      width={1100}
      title={null}
      footer={null}
      closeIcon={<CloseOutlined />}
      destroyOnClose
    >
      <div className="task-detail-modal-body">
        <div className="task-detail-modal-left">
          <Form form={form} layout="vertical" initialValues={{ priority: "Low" }}>
            <div className="task-detail-hero">
              <div className="task-detail-topbar">
                <div className="task-detail-topbar-left">
                  <div className="task-detail-status-text">{mode === "edit" ? "EDIT TASK" : mode === "view" ? "VIEW TASK" : "NEW TASK"}</div>
                </div>
                {mode === "view" && (
                  <div className="task-detail-topbar-actions">
                    <Button
                      className="task-detail-log-hours-btn"
                      type="text"
                      icon={<ClockCircleOutlined />}
                      onClick={() => {
                        setActiveRightTab("hours-log");
                        openAddTimeLogModal();
                      }}
                    >
                      Log hours
                    </Button>
                  </div>
                )}
              </div>
              <h2 className="task-detail-title" style={{ marginBottom: 10 }}>
                {String(watchedTitle || "").trim() || "Untitled Task"}
              </h2>
              <div className="task-detail-breadcrumb">
                <div className="task-detail-breadcrumb-trail">
                  <span>{selectedProjectName || "Select project"}</span>
                  <span className="task-detail-breadcrumb-sep">/</span>
                  <span>{selectedListName || "Select list"}</span>
                </div>
              </div>
              <div className="task-detail-meta">
                <div className="task-detail-metric-card">
                  <span className="task-detail-metric-label">Start date</span>
                  <span className="task-detail-metric-value">{formatMetricDate(watchedStartDate)}</span>
                </div>
                <div className="task-detail-metric-card">
                  <span className="task-detail-metric-label">Due date</span>
                  <span className="task-detail-metric-value">{formatMetricDate(watchedEndDate)}</span>
                </div>
                <div className="task-detail-metric-card">
                  <span className="task-detail-metric-label">Assignees</span>
                  <span className="task-detail-metric-value">
                    {selectedAssigneeCount} member{selectedAssigneeCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>

            <div className="task-detail-content-grid" style={{ marginTop: 8 }}>
          {showListSelector && (
            <div className="task-detail-section-grid">
              {!lockedProjectId && (
                <div className="task-detail-section">
                  <div className="task-detail-label">Project</div>
                  <div className="task-detail-value">
                    <Form.Item name="project_id" noStyle rules={[{ required: true, message: "Project is required" }]}>
                      <Select
                        loading={loadingProjects}
                        showSearch
                        optionFilterProp="label"
                        options={projects.map((p) => ({ value: p?._id, label: p?.title }))}
                        placeholder="Select project"
                      />
                    </Form.Item>
                  </div>
                </div>
              )}
              {!lockedMainTaskId && (
                <div className="task-detail-section">
                  <div className="task-detail-label">List</div>
                  <div className="task-detail-value">
                    <Form.Item name="main_task_id" noStyle rules={[{ required: true, message: "List is required" }]}>
                      <Select
                        loading={loadingMainTasks}
                        showSearch
                        optionFilterProp="label"
                        options={mainTasks.map((m) => ({ value: m?._id, label: m?.title }))}
                        placeholder="Select list"
                      />
                    </Form.Item>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="task-detail-section-grid">
            {visibleFields.map((field) => {
              const key = canonicalFieldKey(field?.key);
              const formName = getFieldFormName(field);
              return (
                <div
                  className="task-detail-section"
                  key={key}
                  style={["description", "title"].includes(key) ? { gridColumn: "1 / -1" } : undefined}
                >
                  <div className="task-detail-label">{field?.label || toLabel(key)}</div>
                  <div className="task-detail-value">
                    <Form.Item
                      name={formName}
                      initialValue={key === "priority" ? "Low" : undefined}
                      valuePropName={field?.type === "checkbox" ? "checked" : field?.type === "file" ? "fileList" : "value"}
                      getValueFromEvent={field?.type === "file" ? normalizeUploadFileEvent : undefined}
                      style={{ marginBottom: 0 }}
                      rules={[
                        ...(field?.required || key === "start_date" || key === "end_date"
                          ? [{ required: true, message: `${field?.label || toLabel(key)} is required` }]
                          : []),
                        ...(key === "end_date"
                          ? [
                              ({ getFieldValue }) => ({
                                validator(_, value) {
                                  const startDate = getFieldValue("start_date");
                                  if (!value || !startDate || !dayjs(value).isBefore(dayjs(startDate), "day"))
                                    return Promise.resolve();
                                  return Promise.reject(new Error("End date must be the same or later than start date"));
                                },
                              }),
                            ]
                          : []),
                      ]}
                    >
                      {renderFieldControl(field, formName)}
                    </Form.Item>
                  </div>
                </div>
              );
            })}
          </div>

            </div>
          <div className="task-detail-modal-footer-actions">
             <Button className="delete-btn" onClick={onCancel}>
              Close
            </Button>
            {!viewOnly && (
              
              <Button
                className="add-btn"
                type="primary"
                onClick={handleOk}
                loading={submitting}
              >
                {submitText || (mode === "edit" ? "Save Changes" : "Save")}
              </Button>
            )}
         
          </div>
            {loadingConfig && <div style={{ color: "#8c8c8c", padding: "0 20px 18px" }}>Loading form configuration...</div>}
          </Form>
        </div>
        <div className="task-detail-modal-right">
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
                key: "comments",
                label: (
                  <span className="task-detail-tab-label">
                    <CommentOutlined /> Comments
                    <span className="comment-badge">{comments.length || 0}</span>
                  </span>
                ),
                children: (
                  <div className="task-detail-tab-content task-detail-comments">
                    <div className="comment-list-box">
                      <div className="comment-list-wrapper" style={{ background: "linear-gradient(180deg, #f4f7fb 0%, #eef3f9 100%)", padding: 10, borderRadius: 10 }}>
                        {commentsLoading ? (
                          <div className="task-detail-loading-inline"><Spin size="small" /></div>
                        ) : comments.length > 0 ? (
                          comments.map((item, index) => {
                            const isOwnComment = String(item?.sender_id || "") === loggedInUserId;
                            return (
                              <div
                                className="main-comment-wrapper task-detail-comment-item"
                                key={item?._id || index}
                                style={{
                                  display: "flex",
                                  justifyContent: isOwnComment ? "flex-end" : "flex-start",
                                  marginBottom: 8,
                                  background: "transparent",
                                  border: "none",
                                  boxShadow: "none",
                                  padding: 0,
                                }}
                              >
                                <div
                                  className="comment-wrapper"
                                  style={{
                                    width: "fit-content",
                                    maxWidth: "88%",
                                    minWidth: 120,
                                    borderRadius: 12,
                                    padding: "10px 12px 8px",
                                    border: "none",
                                    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.12)",
                                    background: isOwnComment ? "#d7f8c9" : "#ffffff",
                                  }}
                                >
                                  {editingCommentId === item?._id ? (
                                    <>
                                      <Mentions
                                        rows={3}
                                        value={editingCommentText}
                                        onChange={setEditingCommentText}
                                        options={mentionOptions}
                                        prefix={["@"]}
                                      />
                                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                        <Button type="primary" size="small" onClick={handleSaveEditComment} disabled={!editingCommentText.trim()}>
                                          Save
                                        </Button>
                                        <Button size="small" onClick={handleCancelEditComment}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                                        <p style={{ marginBottom: 6, marginTop: 0, wordBreak: "break-word", flex: 1 }} dangerouslySetInnerHTML={{ __html: item?.comment || "" }} />
                                        {isOwnComment && (
                                          <Dropdown
                                            trigger={["click"]}
                                            overlay={
                                              <Menu>
                                                <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => handleStartEditComment(item)}>
                                                  Edit
                                                </Menu.Item>
                                                <Menu.Item key="delete" icon={<DeleteOutlined />} danger onClick={() => handleDeleteComment(item?._id)}>
                                                  Delete
                                                </Menu.Item>
                                              </Menu>
                                            }
                                          >
                                            <Button
                                              type="text"
                                              size="small"
                                              icon={<MoreOutlined />}
                                              style={{
                                                marginTop: -4,
                                                marginRight: -6,
                                                background: "transparent",
                                                border: "none",
                                                boxShadow: "none",
                                                padding: 0,
                                                minWidth: "auto",
                                                width: 18,
                                                height: 18,
                                              }}
                                            />
                                          </Dropdown>
                                        )}
                                      </div>
                                      <div style={{ fontSize: 11, color: "#6d7784", textAlign: "right" }}>
                                        {new Date(item?.createdAt || item?.updatedAt || Date.now()).toLocaleString()}
                                      </div>
                                      {Array.isArray(item?.attachments) && item.attachments.length > 0 && (
                                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                                          {item.attachments.map((file, fileIndex) => (
                                            (() => {
                                              const attachmentKey = file?._id || `${item?._id}-file-${fileIndex}`;
                                              const attachmentName = file?.name || file?.file_name || "Attachment";
                                              const attachmentUrl = resolveAttachmentUrl(file);
                                              const kind = getAttachmentKind(file);
                                              const isVideoPlaying = Boolean(playingAttachmentByComment[attachmentKey]);

                                              return (
                                                <div
                                                  key={attachmentKey}
                                                  style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 8,
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 8,
                                                    padding: "6px 8px",
                                                    background: "#f8fafc",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      justifyContent: "space-between",
                                                      gap: 8,
                                                    }}
                                                  >
                                                    <span style={{ fontSize: 12, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                      {attachmentName}
                                                    </span>
                                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                      {kind === "video" && attachmentUrl && (
                                                        <Button
                                                          type="text"
                                                          size="small"
                                                          icon={<PlayCircleOutlined />}
                                                          onClick={() =>
                                                            setPlayingAttachmentByComment((prev) => ({
                                                              ...prev,
                                                              [attachmentKey]: !prev[attachmentKey],
                                                            }))
                                                          }
                                                        />
                                                      )}
                                                      <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<DownloadOutlined />}
                                                        onClick={() => handleDownloadAttachment(file)}
                                                      />
                                                    </div>
                                                  </div>

                                                  {kind === "image" && attachmentUrl && (
                                                    <img
                                                      src={attachmentUrl}
                                                      alt={attachmentName}
                                                      style={{
                                                        width: "100%",
                                                        maxWidth: 260,
                                                        borderRadius: 8,
                                                        objectFit: "cover",
                                                        border: "1px solid #dbe4f0",
                                                      }}
                                                    />
                                                  )}

                                                  {kind === "video" && attachmentUrl && isVideoPlaying && (
                                                    <video
                                                      src={attachmentUrl}
                                                      controls
                                                      style={{
                                                        width: "100%",
                                                        maxWidth: 300,
                                                        borderRadius: 8,
                                                        border: "1px solid #dbe4f0",
                                                        background: "#000",
                                                      }}
                                                    />
                                                  )}
                                                </div>
                                              );
                                            })()
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="task-no-comments">No comments</div>
                        )}
                      </div>
                    </div>
                    <div className="task-detail-add-comment">
                      {mode === "view" ? (
                        <>
                          <div className="task-detail-composer-title">Add to the conversation</div>
                          <Mentions
                            rows={4}
                            placeholder="Share an update with @..."
                            value={`${commentText}${voiceInterimText ? `${commentText ? " " : ""}${voiceInterimText}` : ""}`}
                            onChange={setCommentText}
                            options={mentionOptions}
                            prefix={["@"]}
                            onPressEnter={handleCommentInputPressEnter}
                            readOnly={isVoiceListening}
                          />
                          {commentFiles.length > 0 && (
                            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {commentFiles.map((file, index) => (
                                <span
                                  key={`${file?.name || "file"}-${index}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    border: "1px solid #dbe4f0",
                                    borderRadius: 999,
                                    background: "#f8fafc",
                                    padding: "3px 8px",
                                    maxWidth: 240,
                                  }}
                                >
                                  <PaperClipOutlined />
                                  <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {file?.name || `File ${index + 1}`}
                                  </span>
                                  <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => removeCommentFile(index)} />
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="task-detail-composer-actions">
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <Button
                                type="default"
                                icon={<PaperClipOutlined />}
                                onClick={() => commentFileInputRef.current?.click()}
                                disabled={!effectiveTaskId || submittingComment}
                              >
                                Attach
                              </Button>
                              {voiceSupported && (
                                <Button
                                  type={isVoiceListening ? "primary" : "default"}
                                  icon={isVoiceListening ? <LoadingOutlined spin /> : <AudioOutlined />}
                                  onClick={handleVoiceToggle}
                                  disabled={!effectiveTaskId || submittingComment}
                                >
                                  {isVoiceListening ? "Stop recording" : "Voice"}
                                </Button>
                              )}
                            </div>
                            <Button
                              className="task-detail-comment-submit"
                              type="primary"
                              onClick={handleAddComment}
                              loading={submittingComment}
                              disabled={!`${commentText}${voiceInterimText ? ` ${voiceInterimText}` : ""}`.trim() && commentFiles.length === 0}
                            >
                              Send
                            </Button>
                          </div>
                          <input
                            ref={commentFileInputRef}
                            type="file"
                            multiple
                            accept="*"
                            style={{ display: "none" }}
                            onChange={handleCommentFilesChange}
                          />
                        </>
                      ) : (
                        <div className="task-detail-composer-title">Comments are available in view mode.</div>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "hours-log",
                label: (
                  <span className="task-detail-tab-label">
                    <ClockCircleOutlined /> Hours Log
                    <span className="comment-badge">{timeLogs.length || 0}</span>
                  </span>
                ),
                children: (
                  <div className="task-detail-tab-content task-detail-hours-tab">
                    {mode !== "view" ? (
                      <p className="task-detail-tab-hint">Hours log is available in view mode.</p>
                    ) : (
                      <>
                        <div className="task-hours-log-actions">
                          <Button className="task-detail-comment-submit" type="primary" onClick={openAddTimeLogModal}>
                            Log hours
                          </Button>
                        </div>
                        <div className="task-hours-log-list-wrapper">
                          {timeLogsLoading ? (
                            <div className="task-detail-loading-inline"><Spin size="small" /></div>
                          ) : timeLogs.length > 0 ? (
                            timeLogs.map((entry, index) => (
                              <div
                                key={entry?._id || index}
                                className="task-hours-log-item"
                              >
                                <div className="task-hours-log-item-header">
                                  <div className="task-hours-log-item-actions">
                                    <Dropdown
                                      trigger={["click"]}
                                      overlay={
                                        <Menu>
                                          <Menu.Item
                                            key={`edit-log-${entry?._id || index}`}
                                            icon={<EditOutlined />}
                                            onClick={() => handleEditTimeLog(entry)}
                                          >
                                            Edit
                                          </Menu.Item>
                                          <Menu.Item
                                            key={`delete-log-${entry?._id || index}`}
                                            icon={<DeleteOutlined />}
                                            danger
                                            onClick={() => handleDeleteTimeLog(entry?._id)}
                                          >
                                            Delete
                                          </Menu.Item>
                                        </Menu>
                                      }
                                    >
                                      <Button type="text" size="small" icon={<MoreOutlined />} className="task-hours-log-menu-btn" />
                                    </Dropdown>
                                  </div>
                                </div>
                                <div className="task-hours-log-main-row">
                                  <div>
                                    <div className="task-hours-log-label">Logged hours</div>
                                    <div className="task-hours-log-time">
                                      {entry?.logged_hours || "00"}h {entry?.logged_minutes || "00"}m / {totalAssignedHoursDisplay}
                                    </div>
                                  </div>
                                  <div className="task-hours-log-date">{entry?.logged_date || "--"}</div>
                                </div>
                                {entry?.descriptions ? (
                                  <div className="task-hours-log-description-wrap">
                                    <Button
                                      size="small"
                                      className="task-hours-log-description-btn"
                                      onClick={() => openViewTimeLogModal(entry)}
                                    >
                                      View description
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <div className="task-detail-tab-hint">No hours logged yet.</div>
                          )}
                        </div>
                      </>
                    )}
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
                    <p className="task-detail-tab-hint">No attachments yet.</p>
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
        </div>
      </div>
      <Modal
        open={isTimeLogModalOpen}
        onCancel={resetTimeLogForm}
        footer={null}
        width={760}
        title={timeLogModalMode === "view" ? "View Time" : editingTimeLogId ? "Edit Time" : "Add Time"}
        destroyOnClose
        className="task-hours-entry-modal"
      >
        <div className="task-hours-entry-body">
          <div className="task-hours-entry-label">Timesheet</div>
          <Select
            className="task-hours-log-input"
            placeholder="Select timesheet"
            value={selectedTimesheetId}
            onChange={setSelectedTimesheetId}
            disabled={timeLogModalMode === "view"}
            options={timesheetOptions.map((item) => ({
              value: item?._id,
              label: item?.title || "Untitled timesheet",
            }))}
          />
          <div className="task-hours-entry-grid">
            <DatePicker
              className="task-hours-log-input"
              value={logDate}
              onChange={setLogDate}
              disabled={timeLogModalMode === "view"}
              format="DD-MM-YYYY"
              placeholder="When"
            />
            <Input
              className="task-hours-log-input"
              placeholder="Hours"
              value={logHours}
              disabled={timeLogModalMode === "view"}
              onChange={(event) => setLogHours(event.target.value.replace(/[^\d]/g, ""))}
            />
            <Input
              className="task-hours-log-input"
              placeholder="Minutes"
              value={logMinutes}
              disabled={timeLogModalMode === "view"}
              onChange={(event) => setLogMinutes(event.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className="task-hours-entry-label">Description</div>
          <div className="task-hours-entry-editor">
            {timeLogModalMode === "view" ? (
              <div
                className="task-hours-entry-description-preview"
                dangerouslySetInnerHTML={{
                  __html: logDescription || "<p>No description provided.</p>",
                }}
              />
            ) : (
              <CKEditor
                editor={Custombuild}
                data={logDescription || ""}
                config={{
                  toolbar: ["heading", "|", "bold", "italic", "link", "|", "numberedList", "bulletedList"],
                  removePlugins: ["MediaEmbed", "ImageUpload", "EasyImage", "CKFinderUploadAdapter"],
                }}
                onChange={(_, editor) => {
                  const data = editor.getData();
                  setLogDescription(data);
                }}
              />
            )}
          </div>
          <div className="task-hours-entry-actions">
            <Button onClick={resetTimeLogForm}>{timeLogModalMode === "view" ? "Close" : "Cancel"}</Button>
            {timeLogModalMode !== "view" ? (
              <Button
                className="task-detail-comment-submit"
                type="primary"
                onClick={handleAddTimeLog}
                loading={submittingTimeLog}
              >
                {editingTimeLogId ? "Update hours" : "Log hours"}
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
