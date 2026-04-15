/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Spin,
  Tabs,
  Button,
  Input,
  message,
  Badge,
  Dropdown,
  Menu,
  DatePicker,
  Select,
  Upload,
} from "antd";
import {
  CloseOutlined,
  CalendarOutlined,
  LinkOutlined,
  PaperClipOutlined,
  CommentOutlined,
  HistoryOutlined,
  MoreOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  CheckOutlined,
  SaveOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import moment from "moment";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";
import { calculateTimeDifference } from "../../util/formatTimeDifference";
import { isCreatedBy } from "../../util/isCreatedBy";
import { fileImageSelect } from "../../util/FIleSelection";
import MyAvatar from "../../components/Avatar/MyAvatar";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import "./TaskDetailModal.css";

const { TextArea } = Input;

function getMaybeId(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") return v._id || v.id || null;
  return null;
}

function looksLikeObjectId(v) {
  const s = typeof v === "string" ? v : "";
  return /^[a-f0-9]{24}$/i.test(s);
}

function pickObjectId(...vals) {
  for (const v of vals) {
    const id = getMaybeId(v);
    if (looksLikeObjectId(id)) return id;
  }
  return null;
}

function getProjectIdFromUrl() {
  try {
    const m = String(window.location.pathname || "").match(/\/project\/app\/([^/?#]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function getListIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("listID") || params.get("listId") || null;
  } catch {
    return null;
  }
}

function getTaskIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("taskID") || params.get("taskId") || null;
  } catch {
    return null;
  }
}

function getAssigneeName(a) {
  if (!a) return "";
  if (typeof a === "object") {
    if (a.full_name && String(a.full_name).trim()) return a.full_name.trim();
    if (a.name && String(a.name).trim()) return a.name.trim();
    const first = a.first_name ? String(a.first_name).trim() : "";
    const last = a.last_name ? String(a.last_name).trim() : "";
    return [first, last].filter(Boolean).join(" ") || "";
  }
  return "";
}

function htmlToPlainText(html) {
  const s = typeof html === "string" ? html : "";
  if (!s) return "";
  // Fast path: already looks like plain text.
  if (!/[<>]/.test(s) && !/&[a-zA-Z]+;/.test(s)) return s;

  try {
    const doc = new DOMParser().parseFromString(s, "text/html");
    // Replace non-breaking spaces that commonly come from rich text editors.
    return String(doc.body.textContent || "").replace(/\u00a0/g, " ");
  } catch {
    return s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

function getTaskContext(task) {
  const projectId = pickObjectId(
    task?.project?._id,
    task?.project,
    task?.project_id,
    task?.projectId,
    getProjectIdFromUrl()
  );

  const mainTaskId = pickObjectId(
    task?.mainTask?._id,
    task?.mainTask,
    task?.main_task_id,
    task?.mainTaskId,
    task?.main_task?._id,
    getListIdFromUrl()
  );

  const taskId = pickObjectId(task?._id, getTaskIdFromUrl());

  return { projectId, mainTaskId, taskId };
}

const TaskDetailModal = ({
  open,
  onClose,
  task,
  mode = "detail",
  companySlug,
  onOpenInProject,
  // Edit mode props
  onUpdateTask,
  // Bug tracking props
  bugs = [],
  bugStatuses = [],
  onBugAdd,
  onBugDelete,
  onBugEdit,
  onBugStatusUpdate,
  issueTitle,
  onIssueTitleChange,
  newBugData,
  onNewBugDataChange,
  onIssueDataKeypress,
  createLeftPanel = null,
  createRightPanel = null,
  createWidth = 1100,
}) => {
  const isDark = document.body.classList.contains("dark-theme") || document.body.getAttribute("data-theme") === "dark";
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [taskHistory, setTaskHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandHistoryId, setExpandHistoryId] = useState(null);

  // Internal bugs (used when parent doesn't provide bug props)
  const [internalBugs, setInternalBugs] = useState([]);
  const [internalBugStatuses, setInternalBugStatuses] = useState([]);
  const [internalIssueTitle, setInternalIssueTitle] = useState("");
  const [internalBugsLoading, setInternalBugsLoading] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [fileList, setFileList] = useState([]);

  // Options for assignees and labels dropdowns
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [labelOptions, setLabelOptions] = useState([]);

  const hasExternalBugControls = Boolean(onBugAdd || onBugDelete || onBugEdit || onBugStatusUpdate);

  const fetchTaskDetails = useCallback(async () => {
    const { projectId, mainTaskId, taskId } = getTaskContext(task);
    if (!projectId || !mainTaskId || !taskId) return;
    setLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTasks,
        body: {
          project_id: projectId,
          main_task_id: mainTaskId,
          _id: taskId,
        },
      });
      if (res?.data?.data) {
        setDetails(res.data.data);
      } else {
        setDetails(null);
      }
    } catch (e) {
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [task]);

  const fetchInternalBugStatuses = useCallback(async () => {
    try {
      const res = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getBugWorkFlowStatus,
      });
      if (res?.data?.status) setInternalBugStatuses(res.data.data || []);
    } catch {
      setInternalBugStatuses([]);
    }
  }, []);

  const fetchInternalBugs = useCallback(async () => {
    const base = details || task;
    const { projectId, taskId } = getTaskContext(base);
    if (!projectId || !taskId) return;
    setInternalBugsLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getissuedata,
        body: { project_id: projectId, task_id: taskId },
      });
      if (res?.data?.status && Array.isArray(res?.data?.data)) {
        setInternalBugs(res.data.data);
      } else {
        setInternalBugs([]);
      }
    } catch {
      setInternalBugs([]);
    } finally {
      setInternalBugsLoading(false);
    }
  }, [details, task]);

  const addInternalBug = useCallback(async () => {
    const title = String(internalIssueTitle || "").trim();
    if (!title) return false;
    const base = details || task;
    const { projectId, taskId } = getTaskContext(base);
    if (!projectId || !taskId) {
      message.error("Unable to add bug (missing project/task context).");
      return false;
    }

    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addBug,
        body: { project_id: projectId, title, task_id: taskId },
      });
      if (res?.data?.status) {
        setInternalIssueTitle("");
        await fetchInternalBugs();
        return true;
      }
      message.error(res?.data?.message || "Failed to add bug");
      return false;
    } catch {
      message.error("Failed to add bug");
      return false;
    }
  }, [details, task, internalIssueTitle, fetchInternalBugs]);

  const editInternalBug = useCallback(async (bugId, title, additionalFields = {}) => {
    const base = details || task;
    const { projectId } = getTaskContext(base);
    if (!bugId || !projectId) return false;

    try {
      const updatedKeys = ["title", ...Object.keys(additionalFields)];
      const res = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.editBugTask}/${bugId}`,
        body: {
          updated_key: updatedKeys,
          title,
          project_id: projectId,
          ...additionalFields,
        },
      });
      if (res?.data?.status) {
        await fetchInternalBugs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [details, task, fetchInternalBugs]);

  const deleteInternalBug = useCallback(async (bugId) => {
    if (!bugId) return false;
    try {
      const res = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteBugs}/${bugId}`,
      });
      if (res?.data?.status) {
        await fetchInternalBugs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchInternalBugs]);

  const updateTaskViaApi = useCallback(async (updatedTask, uploadedFiles) => {
    const base = updatedTask || details || task;
    const { projectId, mainTaskId, taskId } = getTaskContext(base);
    if (!projectId || !mainTaskId || !taskId) {
      message.error("Unable to update task (missing project/list context).");
      return false;
    }

    const existingAttachments = Array.isArray(details?.attachments) ? details.attachments : [];
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

    const taskStatusId =
      getMaybeId(base?.task_status?._id) || getMaybeId(base?.task_status) || undefined;

    const hasAttachmentsPayload = normalizedExisting.length > 0 || normalizedUploaded.length > 0;

    const updatedKeys = [
      "title",
      "descriptions",
      "task_labels",
      "start_date",
      "due_date",
      "assignees",
      "custom_fields",
      ...(hasAttachmentsPayload ? ["attachments"] : []),
      ...(taskStatusId ? ["task_status"] : []),
    ];

    const reqBody = {
      updated_key: updatedKeys,
      project_id: projectId,
      main_task_id: mainTaskId,
      title: String(editData.title || "").trim(),
      descriptions: editData.descriptions || "",
      start_date: editData.start_date || null,
      due_date: editData.due_date || null,
      assignees: Array.isArray(editData.assignees) ? editData.assignees : [],
      task_labels: Array.isArray(editData.taskLabels) ? editData.taskLabels.filter(Boolean) : [],
      custom_fields: editData.custom_fields || {},
      ...(taskStatusId ? { task_status: taskStatusId } : {}),
      ...(hasAttachmentsPayload ? { attachments: [...normalizedExisting, ...normalizedUploaded] } : {}),
    };

    const res = await Service.makeAPICall({
      methodName: Service.putMethod,
      api_url: `${Service.taskPropUpdation}/${taskId}`,
      body: reqBody,
    });

    if (res?.data?.status) return true;
    message.error(res?.data?.message || "Failed to update task");
    return false;
  }, [details, task, editData]);

  const getComment = useCallback(async (taskId) => {
    if (!taskId) return;
    setCommentsLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.listTaskComments,
        body: { task_id: taskId },
      });
      if (res?.data?.data && res?.data?.status) {
        setComments(res.data.data);
      } else {
        setComments([]);
      }
    } catch (e) {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const getTaskhistory = useCallback(async (taskId) => {
    if (!taskId) return;
    setHistoryLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTaskHistory,
        body: { task_id: taskId },
      });
      if (res?.data?.data && res?.data?.status) {
        setTaskHistory(res.data.data);
      } else {
        setTaskHistory([]);
      }
    } catch (e) {
      setTaskHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const uploadFiles = useCallback(async (files, type) => {
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("document", file);
      }
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileUpload}?file_for=${type}`,
        body: formData,
        options: { "content-type": "multipart/form-data" },
      });
      return res?.data?.data || [];
    } catch (e) {
      return [];
    }
  }, []);

  const addComments = useCallback(
    async (id, taggedUser, folderId, attachments, commentTxt) => {
      try {
        const reqBody = {
          task_id: id,
          taggedUsers: taggedUser || [],
          comment: commentTxt,
          attachments: attachments || [],
        };
        if (folderId) reqBody.folder_id = folderId;
        const res = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.addTaskComments,
          body: reqBody,
        });
        if (res?.data?.data && res?.data?.status) {
          message.success(res.data.message || "Comment added");
          setCommentText("");
          getComment(id);
        } else {
          message.error(res.data?.message || "Failed to add comment");
        }
      } catch (e) {
        message.error("Failed to add comment");
      }
    },
    [getComment]
  );

  const deleteComment = useCallback(
    async (commentId) => {
      try {
        const res = await Service.makeAPICall({
          methodName: Service.deleteMethod,
          api_url: Service.deleteTaskComments + `/${commentId}`,
        });
        if (res?.data?.status) {
          message.success(res.data.message || "Comment deleted");
          getComment(details?._id || task?._id);
        } else {
          message.error(res.data?.message || "Failed to delete");
        }
      } catch (e) {
        message.error("Failed to delete comment");
      }
    },
    [getComment, details?._id, task?._id]
  );

  const handleDownloadFile = useCallback((file) => {
    try {
      const path = file?.path || file?.file_path;
      const name = (file?.name || file?.file_name || "file") + (file?.file_type || file?.type || "");
      fetch(`${process.env.REACT_APP_API_URL || ""}/public/${path}`)
        .then((r) => r.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        });
    } catch (e) {
      message.error("Download failed");
    }
  }, []);

  // Fetch assignees and labels options for dropdowns
  const fetchDropdownOptions = useCallback(async () => {
    try {
      const [empRes, labelRes] = await Promise.all([
        Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: Service.getEmployees,
        }),
        Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectLables,
          body: { isDropdown: true },
        }),
      ]);
      if (empRes?.data?.data) setAssigneeOptions(empRes.data.data);
      if (labelRes?.data?.data) setLabelOptions(labelRes.data.data);
    } catch (e) {
      // silently fail — dropdowns will just be empty
    }
  }, []);

  useEffect(() => {
    if (open && task) {
      fetchTaskDetails();
      fetchDropdownOptions();
    } else if (!open) {
      setDetails(null);
      setComments([]);
      setTaskHistory([]);
      setActiveTab("comments");
      setCommentText("");
      setExpandHistoryId(null);
      setIsEditing(false);
      setEditData({});
      setInternalBugs([]);
      setInternalIssueTitle("");
    }
  }, [open, task, fetchTaskDetails, fetchDropdownOptions]);

  useEffect(() => {
    if (!open) return;
    if (hasExternalBugControls) return;
    void fetchInternalBugStatuses();
    void fetchInternalBugs();
  }, [open, hasExternalBugControls, fetchInternalBugStatuses, fetchInternalBugs]);


  useEffect(() => {
    const taskId = details?._id || task?._id;
    if (open && taskId && activeTab === "comments") {
      getComment(taskId);
    }
  }, [open, activeTab, details?._id, task?._id, getComment]);

  useEffect(() => {
    const taskId = details?._id || task?._id;
    if (open && taskId && activeTab === "activity") {
      getTaskhistory(taskId);
    }
  }, [open, activeTab, details?._id, task?._id, getTaskhistory]);

  // Initialize edit data when entering edit mode
  const handleEditClick = () => {
    const src = details || task;
    const assigneeIds = (src?.assignees || []).map((a) =>
      typeof a === "object" ? a._id : a
    ).filter(Boolean);
    const labelIds = (src?.taskLabels || src?.task_labels || details?.taskLabels || details?.task_labels || [])
      .map((l) => (typeof l === "object" ? l._id : l))
      .filter(Boolean);

    const bugsForEdit = hasExternalBugControls ? (bugs || []) : (internalBugs || []);

    setEditData({
      title: src?.title || "",
      descriptions: htmlToPlainText(src?.descriptions || ""),
      due_date: src?.due_date || null,
      start_date: src?.start_date || null,
      assignees: assigneeIds,
      taskLabels: labelIds,
      custom_fields: src?.custom_fields || {},
      bugs: bugsForEdit,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
    setFileList([]);
  };

  useEffect(() => {
    if (!isEditing) return;

    const latestBugs = (hasExternalBugControls ? bugs : internalBugs) || [];
    if (!latestBugs.length) return;

    setEditData((prev) => {
      const currentBugs = Array.isArray(prev?.bugs) ? prev.bugs.filter(Boolean) : [];
      if (currentBugs.length > 0) return prev;
      return {
        ...prev,
        bugs: latestBugs.filter(Boolean),
      };
    });
  }, [isEditing, hasExternalBugControls, bugs, internalBugs]);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      let uploadedFiles = undefined;
      if (fileList.length > 0) {
        const filesToUpload = fileList.map(f => f.originFileObj).filter(Boolean);
        if (filesToUpload.length > 0) {
          uploadedFiles = await uploadFiles(filesToUpload, "task");
        }
      }

      const updatedTask = {
        ...(details || task),
        title: editData.title,
        descriptions: editData.descriptions,
        due_date: editData.due_date,
        start_date: editData.start_date,
        custom_fields: editData.custom_fields || {},
        // Keep assignees as IDs array for the API
        assignees: editData.assignees || [],
        // Keep labels as IDs array for the API
        taskLabels: editData.taskLabels || [],
        labels: editData.taskLabels || [],
      };
      if (onUpdateTask) {
        const ok = await onUpdateTask(updatedTask, uploadedFiles, true);
        if (ok === false) throw new Error("task_update_failed");
      } else {
        const ok = await updateTaskViaApi(updatedTask, uploadedFiles);
        if (!ok) throw new Error("update_failed");
      }

      // Save bug edits if there are any changes
      if (editData.bugs && (onBugEdit || (!hasExternalBugControls && editInternalBug))) {
        for (const bug of editData.bugs) {
          const originalBug = bugs.find((b) => b._id === bug._id);
          const internalOriginalBug = internalBugs.find((b) => b._id === bug._id);
          const baseOriginalBug = originalBug || internalOriginalBug;
          // Check if anything actually changed
          const reporterId = typeof bug.createdBy === "object" ? bug.createdBy?._id : bug.createdBy || (typeof bug.reporter === "object" ? bug.reporter?._id : null);
          const originalReporterId = typeof baseOriginalBug?.createdBy === "object" ? baseOriginalBug?.createdBy?._id : baseOriginalBug?.createdBy || (typeof baseOriginalBug?.reporter === "object" ? baseOriginalBug?.reporter?._id : null);
          const assigneesChanged = JSON.stringify(bug.assignees) !== JSON.stringify((baseOriginalBug?.assignees || []).map(a => typeof a === "object" ? a._id : a));

          let bugStatusId = typeof bug.bug_status === "object" ? bug.bug_status?._id : bug.bug_status;
          const statusPool = (hasExternalBugControls ? bugStatuses : internalBugStatuses) || [];
          if (typeof bugStatusId === "string" && !statusPool.some(s => s._id === bugStatusId)) {
            const matchedStatus = statusPool.find(s => s.title === bugStatusId);
            if (matchedStatus) bugStatusId = matchedStatus._id;
          }

          let originalBugStatusId = typeof baseOriginalBug?.bug_status === "object" ? baseOriginalBug?.bug_status?._id : baseOriginalBug?.bug_status;
          if (typeof originalBugStatusId === "string" && !statusPool.some(s => s._id === originalBugStatusId)) {
            const matchedOriginalStatus = statusPool.find(s => s.title === originalBugStatusId);
            if (matchedOriginalStatus) originalBugStatusId = matchedOriginalStatus._id;
          }

          const statusChanged = bugStatusId && originalBugStatusId && (bugStatusId !== originalBugStatusId);

          if (bug.title !== baseOriginalBug?.title || reporterId !== originalReporterId || assigneesChanged || statusChanged) {
            if (onBugEdit) {
              await onBugEdit(bug._id, bug.title, {
                createdBy: reporterId || originalReporterId,
                assignees: bug.assignees,
                bug_status: bugStatusId,
              });
            } else {
              const ok = await editInternalBug(bug._id, bug.title, {
                createdBy: reporterId || originalReporterId,
                assignees: bug.assignees,
                bug_status: bugStatusId,
              });
              if (!ok) throw new Error("bug_update_failed");
            }
          }
        }
      }

      setIsEditing(false);
      setFileList([]);
      message.success("Task updated successfully");
      fetchTaskDetails();
    } catch (e) {
      message.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    const taskId = details?._id || task?._id || getTaskIdFromUrl();
    if (!taskId || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await addComments(taskId, [], undefined, [], commentText.trim());
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleOpenInProject = () => {
    const { projectId, mainTaskId } = getTaskContext(task);
    if (projectId) {
      const listId = mainTaskId;
      const q = listId ? `?tab=Tasks&listID=${listId}` : "?tab=Tasks";
      if (onOpenInProject) {
        onOpenInProject(`/${companySlug}/project/app/${projectId}${q}`);
      }
    }
    onClose();
  };

  const displayTask = details || task;
  const taskId = details?._id || task?._id;
  const taskStatusTitle = displayTask?.task_status?.title || "Open";
  const taskStatusColor = displayTask?.task_status?.color || "#2563eb";
  const assigneeNames = displayTask?.assignees
    ? Array.isArray(displayTask.assignees)
      ? displayTask.assignees.map((a) => getAssigneeName(a)).filter(Boolean)
      : []
    : [];
  const labelNames = (displayTask?.taskLabels || displayTask?.task_labels || [])
    .map((l) => (typeof l === "object" ? l.title : String(l || "").trim() || null))
    .filter(Boolean);
  const attachmentCount = details?.attachments?.length || 0;
  const descriptionHtml = displayTask?.descriptions || "<p>No detailed description has been added yet.</p>";

  const renderCommentsTab = () => (
    <div className="task-detail-tab-content task-detail-comments">
      <div className="comment-list-box">
        <div className="comment-list-wrapper">
          {commentsLoading ? (
            <div className="task-detail-loading-inline"><Spin size="small" /></div>
          ) : comments?.length > 0 ? (
            comments.map((item, index) => (
              <div className="main-comment-wrapper task-detail-comment-item" key={item._id || index}>
                <div className="main-avatar-wrapper">
                  <MyAvatar
                    src={item.profile_pic}
                    userName={item.sender}
                    alt={item.sender}
                  />
                  <div className="comment-sender-name">
                    <h1>{removeTitle(item.sender)}</h1>
                    <h4>
                      {calculateTimeDifference(item.createdAt)} (
                      {moment(item?.createdAt).format("DD-MM-YYYY")})
                    </h4>
                  </div>
                  {isCreatedBy(item?.sender_id) && (
                    <Dropdown
                      trigger={["click"]}
                      overlay={
                        <Menu>
                          <Menu.Item
                            key="delete"
                            onClick={() => deleteComment(item._id)}
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
                  )}
                </div>
                <div className="comment-wrapper">
                  <p dangerouslySetInnerHTML={{ __html: item?.comment }} />
                  {item?.attachments?.length > 0 && (
                    <div className="task-all-file-wrapper">
                      {item.attachments.map((file, i) => (
                        <Badge key={i}>
                          <div className="fileAttachment_Box">
                            <div className="fileAttachment_box-img">
                              {fileImageSelect(file?.file_type)}
                            </div>
                            <a
                              className="fileNameTxtellipsis"
                              href={`${process.env.REACT_APP_API_URL || ""}/public/${file?.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {(file.name || "").length > 15
                                ? `${(file.name || "").slice(0, 15)}.....${file.file_type || ""}`
                                : (file.name || "") + (file.file_type || "")}
                            </a>
                            <Button
                              type="text"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => handleDownloadFile(file)}
                            />
                          </div>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="task-no-comments">No comments</div>
          )}
        </div>
      </div>
      <div className="task-detail-add-comment" style={isDark ? { background: 'rgba(10,18,32,0.98)', backgroundColor: 'rgba(10,18,32,0.98)', borderColor: 'rgba(51,65,85,0.6)' } : {}}>
        <div className="task-detail-composer-title">Add to the conversation</div>
        <TextArea
          rows={4}
          placeholder="Share an update, mention blockers, or document the next step..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          disabled={!taskId}
          style={isDark ? { background: 'rgba(7,17,31,0.9)', backgroundColor: 'rgba(7,17,31,0.9)', borderColor: 'rgba(51,65,85,0.8)', color: '#e2e8f0' } : {}}
          styles={{ textarea: isDark ? { background: 'rgba(7,17,31,0.9)', backgroundColor: 'rgba(7,17,31,0.9)', color: '#e2e8f0' } : {} }}
        />
        <div className="task-detail-composer-actions" style={isDark ? { background: 'transparent' } : {}}>
          <Button
            className="task-detail-comment-submit"
            type="primary"
            onClick={handleAddComment}
            loading={submittingComment}
            disabled={!commentText.trim()}
          >
            Add comment
          </Button>
        </div>
      </div>
    </div>
  );

  const renderHistoryTab = () => {
    if (historyLoading) {
      return (
        <div className="task-detail-tab-content">
          <div className="task-detail-loading-inline"><Spin size="small" /></div>
        </div>
      );
    }
    if (!taskHistory?.length) {
      return (
        <div className="task-detail-tab-content">
          <p className="task-detail-tab-hint">No activity yet.</p>
        </div>
      );
    }
    return (
      <div className="task-detail-tab-content task-detail-history">
        {taskHistory.map((item) => {
          const updateKey = item?.updated_key
            ?.replace("_", " ")
            .includes("assignee")
            ? "Assigned people"
            : (item?.updated_key || "").replace("_", " ");
          const isExpanded = expandHistoryId === item._id;
          return (
            <div className="task-history-wrapper" key={item._id}>
              {item.updated_key === "createdAt" ? (
                <div className="task-history-img">
                  <MyAvatar
                    userName={item.createdBy?.full_name}
                    alt={item.createdBy?.full_name}
                    src={item.createdBy?.emp_img}
                  />
                  <span className="history-details">
                    <strong>{removeTitle(item.createdBy?.full_name)}</strong> added the task{" "}
                    <span className="hitory-time">
                      {calculateTimeDifference(item?.createdAt)} (
                      {moment(item?.createdAt).format("DD-MM-YYYY")})
                    </span>
                  </span>
                </div>
              ) : (
                <div className="task-history-img">
                  <MyAvatar
                    userName={item.updatedBy?.full_name}
                    alt={item.updatedBy?.full_name}
                    src={item.updatedBy?.emp_img}
                  />
                  <span className="history-details">
                    {item.updatedBy?.full_name} updated the task{" "}
                    <span className="hitory-time">
                      {calculateTimeDifference(item?.updatedAt)}
                    </span>
                  </span>
                  <div
                    className="history-icon"
                    onClick={() => setExpandHistoryId(isExpanded ? null : item._id)}
                    style={{ cursor: "pointer" }}
                  >
                    {isExpanded ? <span>▼</span> : <span>▶</span>}
                  </div>
                  {isExpanded && (
                    <div className="history-data-wrapper" style={{ textTransform: "capitalize" }}>
                      <div className="history-prev"><h2>Previous:</h2></div>
                      <div className="history-data">
                        <h5>
                          {item.pervious_value != null && item.pervious_value !== ""
                            ? item.updated_key === "start_date" || item.updated_key === "due_date"
                              ? moment(item.pervious_value).format("DD MMM, YY")
                              : String(item.pervious_value)
                            : "—"}
                        </h5>
                      </div>
                      <div className="history-prev"><h2>New:</h2></div>
                      <div className="history-data">
                        <h5>
                          {item.new_value != null && item.new_value !== ""
                            ? item.updated_key === "start_date" || item.updated_key === "due_date"
                              ? moment(item.new_value).format("DD MMM, YY")
                              : String(item.new_value)
                            : "—"}
                        </h5>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const liveBugList = (hasExternalBugControls ? bugs : internalBugs) || [];
  const displayBugs = (
    isEditing
      ? ((Array.isArray(editData?.bugs) && editData.bugs.length > 0) ? editData.bugs : liveBugList)
      : liveBugList
  ).filter(Boolean);

  // ── Bugs Section ──
  const renderBugsSection = () => (
    <div className="task-detail-section task-detail-bugs-section">
      <div className="task-detail-section-head">
        <div>
          <div className="task-detail-label">Quality control</div>
          <div className="task-detail-section-title">Bugs</div>
        </div>
        <span className="task-detail-section-count">
          {displayBugs.length}
        </span>
      </div>

      {/* Quick add bug input */}
      {(onBugAdd || (!hasExternalBugControls && taskId)) && (
        <div className="task-detail-bug-input-wrapper">
          <span className="task-detail-bug-input-plus">+</span>
          <input
            className="task-detail-bug-input"
            type="text"
            placeholder="Quick add an issue title and press Enter..."
            value={onBugAdd ? (issueTitle || "") : internalIssueTitle}
            onChange={(e) => {
              const v = e.target.value;
              if (onBugAdd) {
                onIssueTitleChange && onIssueTitleChange(v);
              } else {
                setInternalIssueTitle(v);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (onIssueDataKeypress) {
                  onIssueDataKeypress(e);
                } else if (onBugAdd) {
                  onBugAdd();
                } else {
                  void addInternalBug();
                }
              }
            }}
          />
        </div>
      )}

      {/* Bug table */}
      {displayBugs.length > 0 ? (
        <div className="task-detail-bug-table-wrapper">
          <table className="task-detail-bug-table">
            <thead>
              <tr>
                <th className="bug-id-cell">Bug ID</th>
                <th className="bug-title-cell">Title</th>
                <th className="bug-status-cell">Status</th>
                <th className="bug-reporter-cell">Reporter</th>
                <th className="bug-assignees-cell">Assignees</th>
                {!isEditing && <th className="bug-actions-cell">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayBugs.map((bug, idx) => {
                return (
                  <tr key={bug._id || idx}>
                    <td className="bug-id-cell">{bug.bugId || idx + 1}</td>
                    <td className="bug-title-cell">
                      {isEditing ? (
                        <Input
                          size="small"
                          value={bug.title}
                          onChange={(e) => {
                            const newBugs = [...(editData.bugs || [])];
                            newBugs[idx] = { ...bug, title: e.target.value };
                            setEditData({ ...editData, bugs: newBugs });
                          }}
                        />
                      ) : (
                        bug.title || "—"
                      )}
                    </td>
                    <td className="bug-status-cell">
                      {isEditing && (hasExternalBugControls ? bugStatuses : internalBugStatuses)?.length > 0 ? (
                        <Select
                          size="small"
                          value={typeof bug.bug_status === "object" ? bug.bug_status?._id : bug.bug_status}
                          onChange={(val) => {
                            const newBugs = [...(editData.bugs || [])];
                            newBugs[idx] = { ...bug, bug_status: val };
                            setEditData({ ...editData, bugs: newBugs });
                          }}
                          style={{ width: 120 }}
                          dropdownMatchSelectWidth={false}
                          showSearch
                          optionFilterProp="children"
                        >
                          {(hasExternalBugControls ? bugStatuses : internalBugStatuses).map((s) => (
                            <Select.Option key={s._id} value={s._id}>
                              {s.title}
                            </Select.Option>
                          ))}
                        </Select>
                      ) : (
                        <span>{typeof bug.bug_status === "string" && !(hasExternalBugControls ? bugStatuses : internalBugStatuses).some(s => s._id === bug.bug_status) ? bug.bug_status : ((hasExternalBugControls ? bugStatuses : internalBugStatuses)?.find(s => s._id === (typeof bug.bug_status === "object" ? bug.bug_status?._id : bug.bug_status))?.title || bug.bug_status?.title || bug.bug_status_details?.[0]?.title || "—")}</span>
                      )}
                    </td>
                    <td className="bug-reporter-cell">
                      {isEditing ? (
                        <Select
                          size="small"
                          style={{ width: "100%", minWidth: 100 }}
                          value={typeof bug.reporter === "object" ? bug.reporter?._id : (bug.createdBy?._id || bug.createdBy)}
                          onChange={(val) => {
                            const newBugs = [...(editData.bugs || [])];
                            newBugs[idx] = { ...bug, createdBy: val };
                            setEditData({ ...editData, bugs: newBugs });
                          }}
                          options={assigneeOptions.map((emp) => ({
                            value: emp._id,
                            label: emp.full_name || emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
                          }))}
                          showSearch
                          optionFilterProp="label"
                          allowClear
                          placeholder="Select reporter"
                        />
                      ) : (
                        typeof bug.reporter === "string" ? bug.reporter : (bug.createdBy?.full_name || bug.reporter?.full_name || "—")
                      )}
                    </td>
                    <td className="bug-assignees-cell">
                      {isEditing ? (
                        <Select
                          mode="multiple"
                          size="small"
                          style={{ width: "100%", minWidth: 140 }}
                          value={(bug.assignees || []).map((a) => (typeof a === "object" ? a._id : a))}
                          onChange={(val) => {
                            const newBugs = [...(editData.bugs || [])];
                            newBugs[idx] = { ...bug, assignees: val };
                            setEditData({ ...editData, bugs: newBugs });
                          }}
                          options={assigneeOptions.map((emp) => ({
                            value: emp._id,
                            label: emp.full_name || emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
                          }))}
                          showSearch
                          optionFilterProp="label"
                          allowClear
                          placeholder="Select assignees"
                        />
                      ) : (
                        <div className="bug-assignee-avatars">
                          {bug.assignees?.length > 0 ? bug.assignees.map((a, i) => (
                            <MyAvatar
                              key={a?._id || i}
                              userName={getAssigneeName(a)}
                              src={a?.emp_img || a?.profile_pic}
                              size={26}
                            />
                          )) : "—"}
                        </div>
                      )}
                    </td>
                    {!isEditing && (
                      <td className="bug-actions-cell">
                        {(onBugDelete || (!hasExternalBugControls && deleteInternalBug)) && (
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              if (onBugDelete) return onBugDelete(bug._id);
                              void deleteInternalBug(bug._id);
                            }}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="task-detail-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
          <NoDataFoundIcon  />
          <span style={{ marginTop: 8, color: '#7b8898', fontSize: 14 }}>No issues tracked yet.</span>
        </div>
      )}
    </div>
  );

  if (mode === "create") {
    return (
      <Modal
        className="task-page-detail-modal"
        open={open}
        onCancel={onClose}
        footer={null}
        width={createWidth}
        closeIcon={<CloseOutlined />}
        destroyOnClose
      >
        <div className="task-detail-modal-body">
          <div className="task-detail-modal-left">
            {createLeftPanel}
          </div>
          <div className="task-detail-modal-right">
            {createRightPanel}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      className="task-page-detail-modal"
      open={open}
      onCancel={onClose}
      footer={null}
      width={1100}
      closeIcon={<CloseOutlined />}
      destroyOnClose
    >
      <div className="task-detail-modal-body">
        <div className="task-detail-modal-left">
          <div className="task-detail-hero">
            <div className="task-detail-topbar">
              <div className="task-detail-topbar-left">
                <div className="task-detail-status-text">{taskStatusTitle}</div>
              </div>

              <div className="task-detail-topbar-actions">
                <Button
                  className="task-detail-icon-btn"
                  type="text"
                  onClick={() => setActiveTab("comments")}
                  icon={<CommentOutlined />}
                />
                <Button
                  className="task-detail-icon-btn"
                  type="text"
                  onClick={() => setActiveTab("attachment")}
                  icon={<PaperClipOutlined />}
                />
                <Button
                  className="task-detail-icon-btn"
                  type="text"
                  onClick={() => setActiveTab("activity")}
                  icon={<HistoryOutlined />}
                />

           
                <Button
                  className={`task-detail-icon-btn ${isEditing ? 'task-detail-icon-btn-active' : ''}`}
                  type="text"
                  onClick={handleEditClick}
                  icon={<EditOutlined />}
                  title="Edit Task"
                />
              </div>
            </div>

            {/* Title: editable or static */}
            {isEditing ? (
              <Input
                className="task-detail-edit-title-input"
                value={editData.title}
                onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Task title"
              />
            ) : (
              <h2 className="task-detail-title">{displayTask?.title || "—"}</h2>
            )}

            <div className="task-detail-breadcrumb">
              <div className="task-detail-breadcrumb-trail">
                {displayTask?.project?.title && (
                  <span className="task-detail-breadcrumb-project">
                    {displayTask.project.title}
                  </span>
                )}
                {displayTask?.mainTask?.title && (
                  <>
                    <span className="task-detail-breadcrumb-sep">/</span>
                    <span className="task-detail-breadcrumb-list">
                      {displayTask.mainTask.title}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="task-detail-meta">
              <div className="task-detail-metric-card">
                <span className="task-detail-metric-label">Start date</span>
                <span className="task-detail-metric-value">
                  {isEditing ? (
                    <DatePicker
                      size="small"
                      className="task-detail-edit-datepicker"
                      value={editData.start_date ? dayjs(editData.start_date) : null}
                      onChange={(d) => setEditData((p) => ({ ...p, start_date: d ? d.toISOString() : null }))}
                      format="MMM D, YYYY"
                      allowClear
                      style={{ width: "100%" }}
                    />
                  ) : (
                    <>
                      <CalendarOutlined />
                      {displayTask?.start_date ? moment(displayTask.start_date).format("MMM D, YYYY") : "Not set"}
                    </>
                  )}
                </span>
              </div>
              <div className="task-detail-metric-card">
                <span className="task-detail-metric-label">Due date</span>
                <span className="task-detail-metric-value">
                  {isEditing ? (
                    <DatePicker
                      size="small"
                      className="task-detail-edit-datepicker"
                      value={editData.due_date ? dayjs(editData.due_date) : null}
                      onChange={(d) => setEditData((p) => ({ ...p, due_date: d ? d.toISOString() : null }))}
                      format="MMM D, YYYY"
                      allowClear
                    />
                  ) : (
                    <>
                      <CalendarOutlined />
                      {displayTask?.due_date
                        ? dayjs(displayTask.due_date).format("MMM D, YYYY")
                        : "Not set"}
                    </>
                  )}
                </span>
              </div>
              <div className="task-detail-metric-card">
                <span className="task-detail-metric-label">Assignees</span>
                <span className="task-detail-metric-value">
                  {assigneeNames.length || 0} member{assigneeNames.length === 1 ? "" : "s"}
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
              {isEditing ? (
                <div className="task-detail-edit-description-wrapper">
                  <TextArea
                    className="task-detail-edit-description"
                    rows={5}
                    value={editData.descriptions}
                    onChange={(e) => setEditData((p) => ({ ...p, descriptions: e.target.value }))}
                    placeholder="Enter task description..."
                  />
                </div>
              ) : (
                <div
                  className="task-detail-description"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              )}
            </div>

            {/* Meta grid */}
            <div className="task-detail-section-grid">
              <div className="task-detail-section">
                <div className="task-detail-label">Project</div>
                <div className="task-detail-value">{displayTask?.project?.title || "—"}</div>
              </div>

              <div className="task-detail-section">
                <div className="task-detail-label">Assignee(s)</div>
                <div className="task-detail-value">
                  {isEditing ? (
                    <Select
                      mode="multiple"
                      size="small"
                      style={{ width: "100%" }}
                      placeholder="Select assignees"
                      value={editData.assignees || []}
                      onChange={(val) => setEditData((p) => ({ ...p, assignees: val }))}
                      showSearch
                      optionFilterProp="label"
                      options={assigneeOptions.map((emp) => ({
                        value: emp._id,
                        label: emp.full_name || emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
                      }))}
                      allowClear
                    />
                  ) : (
                    assigneeNames.length > 0 ? assigneeNames.join(", ") : "—"
                  )}
                </div>
              </div>

              <div className="task-detail-section">
                <div className="task-detail-label">Labels</div>
                <div className="task-detail-value">
                  {isEditing ? (
                    <Select
                      mode="multiple"
                      size="small"
                      style={{ width: "100%" }}
                      placeholder="Select labels"
                      value={editData.taskLabels || []}
                      onChange={(val) => setEditData((p) => ({ ...p, taskLabels: val }))}
                      showSearch
                      optionFilterProp="label"
                      options={labelOptions.map((lbl) => ({
                        value: lbl._id,
                        label: lbl.title,
                      }))}
                      allowClear
                    />
                  ) : (
                    labelNames.length > 0 ? (
                      <div className="task-detail-tags">
                        {labelNames.map((l, i) => (
                          <span key={i} className="task-detail-tag">{l}</span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )
                  )}
                </div>
              </div>

              {Object.keys(isEditing ? (editData.custom_fields || {}) : (displayTask?.custom_fields || {})).map((fieldKey) => {
                const currentValue = isEditing
                  ? editData?.custom_fields?.[fieldKey]
                  : displayTask?.custom_fields?.[fieldKey];
                return (
                  <div className="task-detail-section" key={`custom-${fieldKey}`}>
                    <div className="task-detail-label">
                      {String(fieldKey || "")
                        .split("_")
                        .filter(Boolean)
                        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
                        .join(" ")}
                    </div>
                    <div className="task-detail-value">
                      {isEditing ? (
                        <Input
                          size="small"
                          value={Array.isArray(currentValue) ? currentValue.join(", ") : (currentValue || "")}
                          onChange={(event) =>
                            setEditData((prev) => ({
                              ...prev,
                              custom_fields: {
                                ...(prev.custom_fields || {}),
                                [fieldKey]: event.target.value,
                              },
                            }))
                          }
                          placeholder="Enter value"
                        />
                      ) : (
                        String(
                          Array.isArray(currentValue)
                            ? currentValue.join(", ")
                            : currentValue === null || currentValue === undefined
                            ? "—"
                            : currentValue
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attachments */}
            <div className="task-detail-section">
              <div className="task-detail-section-head">
                <div>
                  <div className="task-detail-label">Files</div>
                  <div className="task-detail-section-title">Attachments</div>
                </div>
                <span className="task-detail-section-count">{attachmentCount + fileList.length}</span>
              </div>

              {isEditing ? (
                <div className="task-detail-attachments-edit">
                  <div className="task-detail-attachments">
                    {details?.attachments?.map((att, i) => (
                      <div className="task-detail-attachment-card" key={i}>
                        <span className="task-detail-attachment-link">{att?.name || "File"}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <Upload
                      listType="picture-card"
                      fileList={fileList}
                      onChange={({ fileList: fl }) => setFileList(fl)}
                      beforeUpload={() => false}
                    >
                      {fileList.length >= 8 ? null : (
                        <div>
                          <PlusOutlined />
                          <div style={{ marginTop: 8 }}>Upload</div>
                        </div>
                      )}
                    </Upload>
                  </div>
                </div>
              ) : (
                details?.attachments?.length > 0 ? (
                  <div className="task-detail-attachments">
                    {details.attachments.map((att, i) => (
                      <div className="task-detail-attachment-card" key={i}>
                        <a
                          href={`${process.env.REACT_APP_API_URL || ""}/public/${att?.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="task-detail-attachment-link"
                        >
                          {att?.name || "File"}
                        </a>
                        <Button
                          type="text"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadFile(att)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="task-detail-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                    <NoDataFoundIcon  />
                    <span style={{ marginTop: 8, color: '#7b8898', fontSize: 14 }}>No attachments added yet.</span>
                  </div>
                )
              )}
            </div>

            {/* Bugs Section */}
            {renderBugsSection()}

            {/* Footer Actions */}
            <div className="task-detail-modal-footer-actions">
              <Button
                className="add-btn"
                type="primary"
                onClick={handleSaveEdit}
                loading={saving}
                icon={<SaveOutlined />}
              >
                <span>

                Save
                </span>
              </Button>
              <Button className="task-detail-secondary-btn" onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>

        {!isEditing && <div className="task-detail-modal-right">
          <div className="task-detail-sidebar-head">
            <div className="task-detail-sidebar-kicker">Workspace</div>
            <div className="task-detail-sidebar-title">Discussion and activity</div>
          </div>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
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
                children: renderCommentsTab(),
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
                    {details?.attachments?.length > 0 ? (
                      <ul className="task-detail-attachment-list">
                        {details.attachments.map((att, i) => (
                          <li key={i}>
                            <a
                              className="task-detail-attachment-link"
                              href={`${process.env.REACT_APP_API_URL || ""}/public/${att?.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {att?.name || "File"}
                            </a>
                            <div className="task-detail-attachment-actions">
                              <Button
                                type="text"
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadFile(att)}
                                title="Download"
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
                children: renderHistoryTab(),
              },
            ]}
          />
        </div>}
      </div>
    </Modal>
  );
};


export default TaskDetailModal;
