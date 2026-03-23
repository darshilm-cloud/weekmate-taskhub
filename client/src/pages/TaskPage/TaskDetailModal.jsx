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

const TaskDetailModal = ({ open, onClose, task, companySlug, onOpenInProject }) => {
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

  useEffect(() => {
    if (open && task) {
      fetchTaskDetails();
    } else if (!open) {
      setDetails(null);
      setComments([]);
      setTaskHistory([]);
      setActiveTab("comments");
      setCommentText("");
      setExpandHistoryId(null);
    }
  }, [open, task, fetchTaskDetails]);

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
  const labelNames = details?.taskLabels?.length > 0 ? details.taskLabels.map((l) => l.title) : [];
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

  return (
    <Modal
      className="task-page-detail-modal"
      open={open}
      onCancel={onClose}
      footer={null}
      width={1180}
      closeIcon={<CloseOutlined />}
      destroyOnClose
    >
      <div className="task-detail-modal-body">
        <div className="task-detail-modal-left">
          <div className="task-detail-hero">
            <div className="task-detail-topbar">
              <div className="task-detail-topbar-left">
                <span
                  className="task-detail-status-pill"
                  style={{
                    borderColor: `${taskStatusColor}22`,
                    color: taskStatusColor,
                    background: `${taskStatusColor}12`,
                  }}
                >
                  {taskStatusTitle}
                </span>
                {displayTask?._id && (
                  <span className="task-detail-task-id">TASK-{String(displayTask._id).slice(-6)}</span>
                )}
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
                  className="task-detail-icon-btn"
                  type="text"
                  onClick={handleOpenInProject}
                  icon={<LinkOutlined />}
                />
              </div>
            </div>

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

            <h2 className="task-detail-title">{displayTask?.title || "—"}</h2>

            <div className="task-detail-meta">
              <div className="task-detail-metric-card">
                <span className="task-detail-metric-label">Due date</span>
                <span className="task-detail-metric-value">
                  <CalendarOutlined />
                  {displayTask?.due_date
                    ? dayjs(displayTask.due_date).format("MMM D, YYYY")
                    : "Not set"}
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
            <div className="task-detail-section task-detail-section-featured">
              <div className="task-detail-section-head">
                <div>
                  <div className="task-detail-label">Task brief</div>
                  <div className="task-detail-section-title">Description</div>
                </div>
              </div>
              <div
                className="task-detail-description"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </div>

            <div className="task-detail-section-grid">
              <div className="task-detail-section">
                <div className="task-detail-label">Project</div>
                <div className="task-detail-value">{displayTask?.project?.title || "—"}</div>
              </div>

              <div className="task-detail-section">
                <div className="task-detail-label">Assignee(s)</div>
                <div className="task-detail-value task-detail-assignees">
                  {assigneeNames.length > 0 ? assigneeNames.join(", ") : "—"}
                </div>
              </div>

              <div className="task-detail-section">
                <div className="task-detail-label">Start date</div>
                <div className="task-detail-value">
                  {details?.start_date ? dayjs(details.start_date).format("MMM D, YYYY") : "—"}
                </div>
              </div>

              <div className="task-detail-section">
                <div className="task-detail-label">Labels</div>
                <div className="task-detail-value">
                  {labelNames.length > 0 ? labelNames.join(", ") : "—"}
                </div>
              </div>
            </div>

            <div className="task-detail-section">
              <div className="task-detail-section-head">
                <div>
                  <div className="task-detail-label">Files</div>
                  <div className="task-detail-section-title">Attachments</div>
                </div>
                <span className="task-detail-section-count">{attachmentCount}</span>
              </div>
              {details?.attachments?.length > 0 ? (
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
              )}
            </div>

            <div className="task-detail-modal-footer-actions">
              <Button className="task-detail-primary-btn" type="primary" onClick={handleOpenInProject}>
                <LinkOutlined /> Open in project
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
                              href={`${process.env.REACT_APP_API_URL || ""}/public/${att?.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {att?.name || "File"}
                            </a>
                            <Button
                              type="text"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => handleDownloadFile(att)}
                            />
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
