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
import "./TaskDetailModal.css";

const { TextArea } = Input;

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

const TaskDetailModal = ({
  open,
  onClose,
  task,
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

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [fileList, setFileList] = useState([]);

  // Options for assignees and labels dropdowns
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [labelOptions, setLabelOptions] = useState([]);

  const fetchTaskDetails = useCallback(async () => {
    if (!task?.project?._id || !task?.mainTask?._id || !task?._id) return;
    setLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTasks,
        body: {
          project_id: task.project._id,
          main_task_id: task.mainTask._id,
          _id: task._id,
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
  }, [task?._id, task?.project?._id, task?.mainTask?._id]);

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
    }
  }, [open, task, fetchTaskDetails, fetchDropdownOptions]);


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
    const labelIds = (details?.taskLabels || []).map((l) =>
      typeof l === "object" ? l._id : l
    ).filter(Boolean);

    setEditData({
      title: src?.title || "",
      descriptions: src?.descriptions || "",
      due_date: src?.due_date || null,
      start_date: src?.start_date || null,
      assignees: assigneeIds,
      taskLabels: labelIds,
      bugs: bugs || [],
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
    setFileList([]);
  };

  const handleSaveEdit = async () => {
    if (!onUpdateTask) {
      message.warning("Save not available in this view");
      setIsEditing(false);
      return;
    }
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
        // Keep assignees as IDs array for the API
        assignees: editData.assignees || [],
        // Keep labels as IDs array for the API
        taskLabels: editData.taskLabels || [],
        labels: editData.taskLabels || [],
      };
      await onUpdateTask(updatedTask, uploadedFiles, true);

      // Save bug edits if there are any changes
      if (editData.bugs && onBugEdit) {
        for (const bug of editData.bugs) {
          const originalBug = bugs.find((b) => b._id === bug._id);
          // Check if anything actually changed
          const reporterId = typeof bug.createdBy === "object" ? bug.createdBy?._id : bug.createdBy || (typeof bug.reporter === "object" ? bug.reporter?._id : null);
          const originalReporterId = typeof originalBug?.createdBy === "object" ? originalBug?.createdBy?._id : originalBug?.createdBy || (typeof originalBug?.reporter === "object" ? originalBug?.reporter?._id : null);
          const assigneesChanged = JSON.stringify(bug.assignees) !== JSON.stringify((originalBug?.assignees || []).map(a => typeof a === "object" ? a._id : a));
          
          let bugStatusId = typeof bug.bug_status === "object" ? bug.bug_status?._id : bug.bug_status;
          if (typeof bugStatusId === "string" && !bugStatuses.some(s => s._id === bugStatusId)) {
            // Reverse lookup ID if it's the title string
            const matchedStatus = bugStatuses.find(s => s.title === bugStatusId);
            if (matchedStatus) bugStatusId = matchedStatus._id;
          }
          
          let originalBugStatusId = typeof originalBug?.bug_status === "object" ? originalBug?.bug_status?._id : originalBug?.bug_status;
          if (typeof originalBugStatusId === "string" && !bugStatuses.some(s => s._id === originalBugStatusId)) {
            const matchedOriginalStatus = bugStatuses.find(s => s.title === originalBugStatusId);
            if (matchedOriginalStatus) originalBugStatusId = matchedOriginalStatus._id;
          }

          const statusChanged = bugStatusId && originalBugStatusId && (bugStatusId !== originalBugStatusId);

          if (bug.title !== originalBug?.title || reporterId !== originalReporterId || assigneesChanged || statusChanged) {
             await onBugEdit(bug._id, bug.title, {
                createdBy: reporterId || originalReporterId,
                assignees: bug.assignees,
                bug_status: bugStatusId,
             });
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
    const taskId = details?._id || task?._id;
    if (!taskId || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await addComments(taskId, [], undefined, [], commentText.trim());
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleOpenInProject = () => {
    if (task?.project?._id) {
      const listId = task?.mainTask?._id;
      const q = listId ? `?tab=Tasks&listID=${listId}` : "?tab=Tasks";
      if (onOpenInProject) {
        onOpenInProject(`/${companySlug}/project/app/${task.project._id}${q}`);
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
  const labelNames = (details?.taskLabels || details?.task_labels || [])
    .map(l => typeof l === 'object' ? l.title : null)
    .filter(Boolean);
  const attachmentCount = details?.attachments?.length || 0;
  const descriptionHtml = displayTask?.descriptions || "<p>No detailed description has been added yet.</p>";

  const renderCommentsTab = () => (
    <div className="task-detail-tab-content task-detail-comments">
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
          <span className="task-detail-composer-hint" style={isDark ? { color: '#64748b' } : {}}>
            Comments stay attached to this task for the team.
          </span>
          <Button
            className="task-detail-comment-submit"
            type="primary"
            onClick={handleAddComment}
            loading={submittingComment}
            disabled={!commentText.trim()}
          >
            Post update
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

  // ── Bugs Section ──
  const renderBugsSection = () => (
    <div className="task-detail-section task-detail-bugs-section">
      <div className="task-detail-section-head">
        <div>
          <div className="task-detail-label">Quality control</div>
          <div className="task-detail-section-title">Bugs</div>
        </div>
        <span className="task-detail-section-count">{bugs?.length || 0}</span>
      </div>

      {/* Quick add bug input */}
      {onBugAdd && (
        <div className="task-detail-bug-input-wrapper">
          <span className="task-detail-bug-input-plus">+</span>
          <input
            className="task-detail-bug-input"
            type="text"
            placeholder="Quick add an issue title and press Enter..."
            value={issueTitle || ""}
            onChange={(e) => onIssueTitleChange && onIssueTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (onIssueDataKeypress) {
                  onIssueDataKeypress(e);
                } else if (onBugAdd) {
                  onBugAdd();
                }
              }
            }}
          />
        </div>
      )}

      {/* Bug table */}
      {bugs?.length > 0 ? (
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
              {(isEditing ? editData.bugs || [] : bugs).map((bug, idx) => {
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
                      {isEditing && bugStatuses?.length > 0 ? (
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
                        {bugStatuses.map((s) => (
                          <Select.Option key={s._id} value={s._id}>
                            {s.title}
                          </Select.Option>
                        ))}
                      </Select>
                    ) : (
                      <span>{typeof bug.bug_status === "string" && !bugStatuses.some(s => s._id === bug.bug_status) ? bug.bug_status : (bugStatuses?.find(s => s._id === (typeof bug.bug_status === "object" ? bug.bug_status?._id : bug.bug_status))?.title || bug.bug_status?.title || bug.bug_status_details?.[0]?.title || "—")}</span>
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
                        {onBugDelete && (
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => onBugDelete(bug._id)}
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
        <div className="task-detail-empty-state">No issues tracked yet.</div>
      )}
    </div>
  );

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

                {/* Edit icon button */}
                <Button
                  className={`task-detail-icon-btn ${isEditing ? 'task-detail-icon-btn-active' : ''}`}
                  type="text"
                  onClick={isEditing ? handleCancelEdit : handleEditClick}
                  icon={isEditing ? <CloseOutlined /> : <EditOutlined />}
                  title={isEditing ? "Cancel Editing" : "Edit Task"}
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
              <div className="task-detail-metric-card">
                <span className="task-detail-metric-label">Assets</span>
                <span className="task-detail-metric-value">
                  {attachmentCount} attachment{attachmentCount === 1 ? "" : "s"}
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
                <div className="task-detail-label">Start date</div>
                <div className="task-detail-value">
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
                    displayTask?.start_date ? moment(displayTask.start_date).format("MMM D, YYYY") : "—"
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
                  <div className="task-detail-empty-state">No attachments added yet.</div>
                )
              )}
            </div>

            {/* Bugs Section */}
            {renderBugsSection()}

            {/* Footer Actions */}
            <div className="task-detail-modal-footer-actions">
              <Button
                className="task-detail-primary-btn"
                type="primary"
                onClick={handleSaveEdit}
                loading={saving}
                icon={<SaveOutlined />}
              >
                Save
              </Button>
              <Button className="task-detail-secondary-btn" onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>

        <div className="task-detail-modal-right">
          <div className="task-detail-sidebar-head">
            <div className="task-detail-sidebar-kicker">Workspace</div>
            <div className="task-detail-sidebar-title">Discussion and activity</div>
          </div>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="task-detail-tabs"
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
        </div>
      </div>
    </Modal>
  );
};


export default TaskDetailModal;
