// Modernized Bug Detail Modal component
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Button,
  Avatar,
  Tooltip,
  Badge,
  Popover,
  DatePicker,
  Select,
  Checkbox,
  Input,
  Popconfirm,
  message,
} from "antd";
import {
  CommentOutlined,
  PaperClipOutlined,
  AudioOutlined,
  StopOutlined,
  HistoryOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseOutlined,
  UserOutlined,
  CalendarOutlined,
	  TagsOutlined,
	  ClockCircleOutlined,
	  CheckCircleFilled,
	  SaveOutlined,
	  MoreOutlined,
	  DownloadOutlined,
	} from "@ant-design/icons";
import dayjs from "dayjs";
import moment from "moment";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import MyAvatar from "../../components/Avatar/MyAvatar";
import { removeTitle } from "../../util/nameFilter";
import { calculateTimeDifference } from "../../util/formatTimeDifference";
import { isCreatedBy } from "../../util/isCreatedBy";
import { fileImageSelect } from "../../util/FIleSelection";
import config from "../../settings/config.json";
import "./BugDetailModal.css";
import Service from "../../service";

const { Option } = Select;

const BugDetailModal = ({
  open,
  onCancel,
  taskDetails,
  comments,
  taskHistory,
  activeTab,
  onTabChange,
  getComment,
  getBughistory,
  handleBugStatusClick,
  bugWorkFlowStatusList,
  isPopoverVisible,
  setIsPopoverVisible,
  selectedBugStatusTitle,
  selectedBugStatusColor,
  handleTaskDelete,
  hasPermission,
  isEditable,
  setIsEditable,
  viewBug,
  handleViewBug,
  handleFieldClick,
  handleEstTimeViewInput,
  estHrsError,
  estMinsError,
  subscribersList,
  employeeList,
  projectLabels,
  handleSearch,
  handleSelectedItemsChange,
  handleSelectedLabelsChange,
  searchKeyword,
  isLoggedHoursMoreThanEstimated,
  visible,
  popOver,
  openPopOver,
  estError,
  fileViewAttachment,
  populatedViewFiles,
  removeAttachmentViewFile,
  onFileViewChange,
  attachmentViewfileRef,
  foldersList,
  projectId,
  getBoardTasks,
  addComments,
  setTextAreaValue,
  isTextAreaFocused,
  setIsTextAreaFocused,
  textAreaValue,
  taggedUserList,
  handleTaskOps,
  addform,
  formComment,
  bugId,
  updateviewBug,
  loading,
}) => {
  const [editorInstance, setEditorInstance] = useState(null);
  const [postingComment, setPostingComment] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [commentFolderId, setCommentFolderId] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceInterim, setVoiceInterim] = useState("");
  const [expandHistoryId, setExpandHistoryId] = useState(null);
  const isApplyingEditorDataRef = useRef(false);
  const lastEditorInitRef = useRef({ bugId: null, wasEditing: false });
  const commentFileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (open && taskDetails?._id) {
      getComment(taskDetails._id);
      getBughistory(taskDetails._id);
    }
  }, [open, taskDetails?._id]);

  const commentValue = typeof setTextAreaValue === "function" ? (textAreaValue || "") : "";
  const setCommentValue = typeof setTextAreaValue === "function" ? setTextAreaValue : () => {};
  const availableFolders = Array.isArray(foldersList) ? foldersList : [];
  const hasCommentFiles = commentAttachments.length > 0;

  useEffect(() => {
    if (availableFolders.length === 0) {
      setCommentFolderId(null);
      return;
    }
    setCommentFolderId((prev) =>
      prev && availableFolders.some((f) => f?._id === prev)
        ? prev
        : availableFolders[0]?._id || null
    );
  }, [foldersList]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR));
  }, []);

  useEffect(() => {
    if (!open && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // no-op
      }
      recognitionRef.current = null;
      setIsVoiceListening(false);
      setVoiceInterim("");
    }
  }, [open]);

  const uploadCommentFiles = async (files) => {
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
    return response?.data?.data || [];
  };

  const onCommentFilesChange = (event) => {
    const selectedFiles = Array.from(event?.target?.files || []);
    const allowedFiles = [];
    selectedFiles.forEach((file) => {
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB <= 20) {
        allowedFiles.push(file);
      } else {
        message.error(`File '${file.name}' exceeds the 20MB file size limit.`);
      }
    });
    if (allowedFiles.length > 0) {
      setCommentAttachments((prev) => [...prev, ...allowedFiles]);
    }
    if (event?.target) event.target.value = "";
  };

  const removeCommentAttachment = (index) => {
    setCommentAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVoiceToggle = () => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      message.error("Voice input is not supported in this browser.");
      return;
    }

    if (isVoiceListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
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
      setVoiceInterim("");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }
      if (finalTranscript.trim()) {
        const prev = String(commentValue || "");
        const spacer = prev && !/\s$/.test(prev) ? " " : "";
        setCommentValue(`${prev}${spacer}${finalTranscript}`.trimStart());
      }
      setVoiceInterim(interimTranscript);
    };

    recognition.onerror = () => {
      setIsVoiceListening(false);
      setVoiceInterim("");
    };

    recognition.onend = () => {
      setIsVoiceListening(false);
      setVoiceInterim("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handlePostComment = async () => {
    const taskId = taskDetails?._id;
    const next = (commentValue || "").trim();
    if (!taskId || (!next && !hasCommentFiles)) return;
    if (hasCommentFiles && !commentFolderId) {
      message.error("Please select a folder before attaching files.");
      return;
    }
    setPostingComment(true);
    try {
      let uploadedAttachments = [];
      if (hasCommentFiles) {
        uploadedAttachments = await uploadCommentFiles(commentAttachments);
      }
      await addComments?.(taskId, [], commentFolderId || null, uploadedAttachments, next);
      setCommentValue("");
      setCommentAttachments([]);
      setVoiceInterim("");
      await getComment?.(taskId);
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  };

  const formatHistoryValue = (updatedKey, value) => {
    if (value == null || value === "") return "Not found";
    const toPlainText = (v) => {
      if (v == null) return "";
      const raw = typeof v === "string" ? v : JSON.stringify(v);
      // Fast path: no HTML-ish chars
      if (!/[<&]/.test(raw)) return raw.trim();
      try {
        if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
          const doc = new window.DOMParser().parseFromString(raw, "text/html");
          return (doc?.body?.textContent || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
        }
      } catch (e) {
        // fall through to regex stripping
      }
      return raw
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const key = String(updatedKey || "").toLowerCase();
    if (key.includes("date")) {
      try {
        return moment(value).format("DD-MM-YYYY");
      } catch (e) {
        return toPlainText(value) || String(value);
      }
    }
    return toPlainText(value) || String(value);
  };

  const getHistoryPrevValue = (history) =>
    history?.pervious_value ??
    history?.previous_value ??
    history?.old_value ??
    history?.prev_value ??
    history?.before ??
    null;

  const getHistoryNewValue = (history) =>
    history?.new_value ??
    history?.updated_value ??
    history?.next_value ??
    history?.after ??
    null;

  const getPublicFileUrl = (filePath) => {
    if (!filePath) return "";
    const raw = String(filePath);
    if (/^https?:\/\//i.test(raw)) return raw;

    const apiBase = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
    const normalized = raw.startsWith("/") ? raw : `/${raw}`;

    // If API base isn't configured, fall back to an absolute path so SPA routing doesn't hijack it.
    if (!apiBase) {
      return normalized.startsWith("/public/") ? normalized : `/public${normalized}`;
    }

    if (normalized.startsWith("/public/")) return `${apiBase}${normalized}`;
    if (normalized.startsWith("/uploads/") || normalized.startsWith("/files/")) return `${apiBase}${normalized}`;

    // Most uploads are served under `/public/<path>`
    return `${apiBase}/public${normalized}`;
  };

  const handleDownloadFile = async (file) => {
    try {
      const url = getPublicFileUrl(file?.path || file?.file_path);
      if (!url) return;
      const name =
        (file?.name || file?.file_name || "file") +
        (file?.file_type || file?.type || "");

      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (e) {
      message.error("Download failed");
    }
  };

  const handleEditorReady = (editor) => {
    setEditorInstance(editor);
  };

  // Keep CKEditor uncontrolled: initialize its data only when entering edit mode
  // or when switching to a different bug. Avoid feeding `data={...}` on every render,
  // which can cause "auto fill/reset" behavior while typing.
  useEffect(() => {
    if (!editorInstance) return;

    const currentBugId = viewBug?._id || bugId || taskDetails?._id || null;
    const isEditingNow = !!Object.values(isEditable || {}).some((v) => v === true);
    const prev = lastEditorInitRef.current;

    const enteredEditMode = isEditingNow && !prev.wasEditing;
    const switchedBug =
      currentBugId && prev.bugId && currentBugId !== prev.bugId;

    if (enteredEditMode || switchedBug) {
      isApplyingEditorDataRef.current = true;
      try {
        const nextHtml = viewBug?.descriptions || "";
        // Avoid extra work if it's already the same.
        if (editorInstance.getData() !== nextHtml) {
          editorInstance.setData(nextHtml);
        }
      } finally {
        isApplyingEditorDataRef.current = false;
      }
    }

    lastEditorInitRef.current = { bugId: currentBugId, wasEditing: isEditingNow };
  }, [editorInstance, isEditable, viewBug?._id, bugId, taskDetails?._id]);

  const statusMenu = (
    <div className="status-popup-menu">
      {Array.isArray(bugWorkFlowStatusList) && bugWorkFlowStatusList.map((status, index) => (
        <div
          key={status._id}
          className="status-popup-item"
          onClick={() => {
            handleBugStatusClick(status.title, taskDetails?._id);
            setIsPopoverVisible(false);
          }}
        >
          <div 
            className="status-dot" 
            style={{ background: config.COLORS[index % config.COLORS.length] }} 
          />
          <span>{status.title}</span>
          {selectedBugStatusTitle === status.title && (
            <CheckCircleFilled className="status-check" />
          )}
        </div>
      ))}
    </div>
  );

  const fileCount = (Array.isArray(fileViewAttachment) ? fileViewAttachment.length : 0) + (Array.isArray(populatedViewFiles) ? populatedViewFiles.length : 0);
  const isGlobalEditActive = Object.values(isEditable || {}).some(v => v === true);

  const projectName =
    taskDetails?.project?.title ||
    taskDetails?.project?.name ||
    taskDetails?.project_id?.title ||
    taskDetails?.project_id?.name ||
    viewBug?.project?.title ||
    viewBug?.project?.name ||
    viewBug?.project_title ||
    viewBug?.project_name ||
    "";

  const breadcrumbText = (() => {
    // Prefer a single breadcrumb string coming from backend (database).
    const direct =
      taskDetails?.breadcrumb ||
      taskDetails?.breadcrumb_text ||
      taskDetails?.breadcrumbText ||
      viewBug?.breadcrumb ||
      viewBug?.breadcrumb_text ||
      viewBug?.breadcrumbText ||
      "";

    if (direct && String(direct).trim()) return String(direct).trim();

    // Otherwise show only code-like fields (avoid guessing via title/name).
    const parts = [
      taskDetails?.project?.code,
      taskDetails?.mainTask?.code,
      taskDetails?.task?.code,
      taskDetails?.bug_status?.title || selectedBugStatusTitle,
    ]
      .map((p) => (typeof p === "string" ? p.trim() : p))
      .filter(Boolean);

    return parts.length ? parts.join(" / ") : "";
  })();

  const assigneeOptions = (() => {
    const listA = Array.isArray(subscribersList) ? subscribersList : [];
    const listB = Array.isArray(employeeList) ? employeeList : [];
    const listC = Array.isArray(taggedUserList) ? taggedUserList : [];
    const listD = Array.isArray(viewBug?.assignees) ? viewBug.assignees : [];
    const merged = [...listA, ...listB, ...listC, ...listD].filter(Boolean);

    const seen = new Set();
    const options = [];

    for (const user of merged) {
      const id = user?._id || user?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      options.push({
        label: user?.full_name || user?.name || user?.username || "User",
        value: id,
      });
    }

    return options;
  })();

  const selectedAssigneeIds = Array.isArray(viewBug?.assignees)
    ? viewBug.assignees
        .map((a) => (typeof a === "object" ? a?._id || a?.id : a))
        .filter(Boolean)
    : [];

  const disableAllEdits = () => {
    if (typeof setIsEditable !== "function") return;
    const keys = Object.keys(isEditable || {});
    if (!keys.length) {
      setIsEditable({});
      return;
    }
    const next = {};
    for (const key of keys) next[key] = false;
    setIsEditable(next);
  };

  const handleGlobalEditToggle = () => {
    if (isGlobalEditActive) {
      disableAllEdits();
      return;
    }
    handleFieldClick?.("all");
  };

  return (
	    <Modal
	      open={open}
	      onCancel={onCancel}
	      footer={null}
	      width={1100}
	      centered
	      className="modern-bug-detail-modal"
	      closeIcon={<CloseOutlined style={{ color: "white" }} />}
	    >
      <div className="bug-detail-content-premium">
        <div className="bug-detail-modal-left">
          <div className="bug-detail-header-premium">
            <div className="bug-header-top-row">
              <div className="bug-header-statusblock">
                <div className="bug-header-status-text">
                  {viewBug?.bug_status?.title ||
                    viewBug?.status?.title ||
                    viewBug?.status ||
                    selectedBugStatusTitle ||
                    taskDetails?.bug_status?.title ||
                    "OPEN"}
                </div>
              </div>
            </div>

            <div className="bug-display-title">
              {isEditable?.title ? (
                <Input
                  value={viewBug?.title}
                  onChange={(e) => handleViewBug("title", e.target.value)}
                  onBlur={() => setIsEditable({ ...isEditable, title: false })}
                  autoFocus
                  className="title-edit-input"
                />
              ) : (
                <h1>{viewBug?.title || taskDetails?.title || "Untitled Bug"}</h1>
              )}
            </div>

            {breadcrumbText ? (
              <div className="bug-breadcrumb-text">{breadcrumbText}</div>
            ) : null}

            <div className="header-meta-cards">
              <div className="meta-card">
                <div className="meta-card-label">DUE DATE</div>
                <div className="meta-card-value">
                  <CalendarOutlined style={{ marginRight: "8px" }} />
                  {isEditable?.end_date ? (
                    <DatePicker
                      size="small"
                      style={{ width: "100%" }}
                      value={viewBug?.due_date ? dayjs(viewBug.due_date) : null}
                      onChange={(date) =>
                        handleViewBug("due_date", date ? date.toISOString() : null)
                      }
                      allowClear
                      getPopupContainer={(trigger) => trigger?.parentElement || document.body}
                    />
                  ) : (
                    <span
                      onClick={() => handleFieldClick?.("end_date")}
                      style={{ cursor: "pointer" }}
                      title="Click to edit due date"
                    >
                      {viewBug?.due_date
                        ? moment(viewBug.due_date).format("DD-MM-YYYY")
                        : "Set Date"}
                    </span>
                  )}
                </div>
              </div>
              <div className="meta-card">
                <div className="meta-card-label">ASSIGNEES</div>
                <div className="meta-card-value">
                  {Array.isArray(viewBug?.assignees) && viewBug.assignees.length > 0 
                    ? `${viewBug.assignees.length} Member${viewBug.assignees.length > 1 ? 's' : ''}` 
                    : "0 member"}
                </div>
              </div>
              <div className="meta-card">
                <div className="meta-card-label">ASSETS</div>
                <div className="meta-card-value">
                  {fileCount} attachment{fileCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
          <div className="section-card">
            <div className="section-card-title">
              <span>TASK BRIEF</span>
            </div>
            <div className="section-card-main-title">Description</div>
            <div className="bug-description-content">
              {isGlobalEditActive ? (
                <div className="description-editor-wrapper">
                  <CKEditor
                    editor={Custombuild}
                    onReady={handleEditorReady}
                    onChange={(event, editor) => {
                      if (isApplyingEditorDataRef.current) return;
                      const data = editor.getData();
                      handleViewBug("descriptions", data);
                    }}
                  />
                </div>
              ) : (
                <div 
                  dangerouslySetInnerHTML={{ __html: viewBug?.descriptions || "No description provided." }} 
                  onClick={() => handleFieldClick("proj_description")}
                  style={{ cursor: "pointer" }}
                />
              )}
            </div>
          </div>

          <div className="card-row">
            <div className="section-card">
              <div className="section-card-title">
                <span>Project</span>
              </div>
              <div className="meta-value">
                <Input value={projectName || "N/A"} disabled />
              </div>
            </div>
            <div className="section-card">
              <div className="section-card-title">
                <span>Assignee(s)</span>
              </div>
              <div className="meta-value">
                <Select
                  mode="multiple"
                  size="middle"
                  style={{ width: "100%" }}
                  placeholder="Assignees"
                  disabled={!isEditable?.assignees}
                  value={selectedAssigneeIds}
                  onChange={handleSelectedItemsChange}
                  options={assigneeOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
            </div>
          </div>

          <div className="card-row">
            <div className="section-card">
              <div className="section-card-title">
                <span>Start Date</span>
              </div>
              <div className="meta-value">
                <DatePicker
                  style={{ width: "100%" }}
                  disabled={!isEditable?.start_date}
                  value={viewBug?.start_date ? dayjs(viewBug.start_date) : null}
                  onChange={(date) => handleViewBug("start_date", date ? date.toISOString() : null)}
                />
              </div>
            </div>
            <div className="section-card">
              <div className="section-card-title">
                <span>Labels</span>
              </div>
              <div className="meta-value">
                <Select
                  mode="multiple"
                  size="middle"
                  style={{ width: "100%" }}
                  placeholder="Labels"
                  maxTagCount="responsive"
                  disabled={!isEditable?.bug_labels}
                  value={Array.isArray(viewBug?.bug_labels) ? viewBug.bug_labels.map(l => l?._id || l?.id || l) : []}
                  onChange={handleSelectedLabelsChange}
                  options={Array.isArray(projectLabels) ? projectLabels.map(l => ({ label: l.title, value: l?._id || l?.id })) : []}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-title">
              <span>Attachments</span>
              {isGlobalEditActive && (
                <Button 
                  type="link" 
                  size="small" 
                  icon={<PaperClipOutlined />} 
                  onClick={() => attachmentViewfileRef.current.click()}
                >
                  Add Files
                </Button>
              )}
              <input
                type="file"
                multiple
                ref={attachmentViewfileRef}
                style={{ display: "none" }}
                onChange={onFileViewChange}
              />
            </div>
            <div className="bug-files-container">
              {[...fileViewAttachment, ...populatedViewFiles].length > 0 ? (
                [...fileViewAttachment, ...populatedViewFiles].map((file, index) => (
                  <div key={file._id || index} className="bug-file-card">
                    <div className="bug-file-info">
                      {fileImageSelect(file.file_type || file.type)}
                      <a
                        href={getPublicFileUrl(file.path || file.file_path)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {file.name || file.file_name}
                      </a>
                    </div>
                    <div className="bug-file-actions">
                      <Button
                        type="text"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadFile(file)}
                        title="Download"
                      />
                      {isGlobalEditActive && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeAttachmentViewFile(index, file)}
                          title="Remove"
                        />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                  No attachments added yet.
                </div>
              )}
            </div>
          </div>

	            <div className="bug-footer-toggles">
	            <div className="footer-left">
              <Checkbox
                checked={viewBug?.isRepeated}
                onChange={(e) => handleViewBug("isRepeated", e.target.checked)}
                disabled={!isGlobalEditActive}
              >
                Repeated Bug
              </Checkbox>
              <div className="flexible-time" style={{ marginLeft: 24, display: "flex", alignItems: "center", gap: "8px" }}>
                <ClockCircleOutlined style={{ color: "#64748b" }} />
                <span style={{ fontSize: "12px", color: "#64748b" }}>Estimate:</span>
                <div className="estimate-inputs" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Input
                    className="time-input"
                    size="small"
                    style={{ width: "40px", textAlign: "center" }}
                    value={viewBug?.estimated_hours}
                    onChange={(e) => handleEstTimeViewInput("est_hrs", e.target.value)}
                    placeholder="HH"
                    disabled={!isGlobalEditActive}
                  />
                  <span>:</span>
                  <Input
                    className="time-input"
                    size="small"
                    style={{ width: "40px", textAlign: "center" }}
                    value={viewBug?.estimated_minutes}
                    onChange={(e) => handleEstTimeViewInput("est_mins", e.target.value)}
                    placeholder="MM"
                    disabled={!isGlobalEditActive}
                  />
                </div>
              </div>
	            </div>
	          </div>
		          <div className="bug-detail-modal-footer-actions">
		            <Button
		              className="bug-detail-primary-btn"
		              type="primary"
		              icon={<SaveOutlined />}
		              onClick={() => updateviewBug(viewBug)}
		              title="Save changes"
		              loading={loading}
		            >
		              Save
		            </Button>
		            <Button className="bug-detail-secondary-btn" onClick={onCancel}>
		              Close
	            </Button>
	          </div>
	        </div>

        <div className="bug-detail-modal-right">
          <div className="sidebar-header">
            <div>
              <div style={{ fontSize: "10px", fontWeight: "400", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: "4px" }}>WORKSPACE</div>
              <div className="sidebar-header-title">Discussion and activity</div>
            </div>
          </div>
          <div className="sidebar-tabs">
            <div 
              className={`sidebar-tab-btn ${activeTab === "comments" ? "active" : ""}`}
              onClick={() => onTabChange("comments")}
            >
              <CommentOutlined />
              Comments
              <span className="tab-badge">{comments?.length || 0}</span>
            </div>
            <div 
              className={`sidebar-tab-btn ${activeTab === "files" ? "active" : ""}`}
              onClick={() => onTabChange("files")}
            >
              <PaperClipOutlined />
              Files
            </div>
            <div 
              className={`sidebar-tab-btn ${(activeTab === "history" || activeTab === "task") ? "active" : ""}`}
              onClick={() => onTabChange("history")}
            >
              <HistoryOutlined />
              Activity
            </div>
          </div>
          <div className="sidebar-content">
            {activeTab === "comments" && (
              <div className="bug-detail-discussion">
                <div className="bug-comment-list-box">
                  <div className="comment-list-wrapper">
                    {comments && comments.length > 0 ? (
                      comments.map((comment, index) => (
                        <div key={comment._id || index} className="main-comment-wrapper">
                          <MoreOutlined className="comment-options-trigger" />
                          <div className="main-avatar-wrapper">
                            <MyAvatar
                              full_name={comment.user_id?.full_name || comment.user_id?.name || comment.sender}
                              src={comment.user_id?.profile_image || comment.user_id?.emp_img || comment.profile_pic}
                            />
                            <div className="comment-sender-name">
                              <h1>{comment.user_id?.full_name || comment.user_id?.name || removeTitle(comment.sender)}</h1>
                              <h4>{calculateTimeDifference(comment.createdAt)} {comment.createdAt ? `(${moment(comment.createdAt).format("DD-MM-YYYY")})` : ""}</h4>
                            </div>
                          </div>
                          <div className="comment-content" dangerouslySetInnerHTML={{ __html: comment.comment }} />
                          {Array.isArray(comment?.attachments) && comment.attachments.length > 0 && (
                            <div className="comment-attachment-list">
                              {comment.attachments.map((file, fileIndex) => (
                                <div key={file?._id || `${comment?._id}-file-${fileIndex}`} className="comment-attachment-item">
                                  <div className="comment-attachment-name">
                                    {fileImageSelect(file.file_type || file.type)}
                                    <span>{file.name || file.file_name || "Attachment"}</span>
                                  </div>
                                  <Button
                                    type="text"
                                    icon={<DownloadOutlined />}
                                    onClick={() => handleDownloadFile(file)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "40px" }}>No Comments</div>
                    )}
                  </div>
                </div>
                <div className="bug-detail-sidebar-footer-card">
                  <div className="bug-detail-composer-title">Add to the conversation</div>
                  <Input.TextArea
                    className="bug-detail-composer-input"
                    rows={3}
                    placeholder="Share an update, mention blockers, or document the next step..."
                    value={commentValue}
                    onChange={(e) => setCommentValue(e.target.value)}
                    disabled={!taskDetails?._id}
                  />
                  {!!voiceInterim && (
                    <div className="bug-detail-composer-voice-preview">
                      Listening: {voiceInterim}
                    </div>
                  )}
                  {hasCommentFiles && (
                    <div className="bug-detail-composer-file-list">
                      {commentAttachments.map((file, index) => (
                        <div key={`${file?.name || "file"}-${index}`} className="bug-detail-composer-file-chip">
                          <PaperClipOutlined />
                          <span>{file?.name || `File ${index + 1}`}</span>
                          <Button
                            type="text"
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => removeCommentAttachment(index)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bug-detail-composer-actions">
                    <div className="bug-detail-composer-left-actions">
                      <Tooltip title="Attach files">
                        <Button
                          type="default"
                          icon={<PaperClipOutlined />}
                          onClick={() => commentFileInputRef.current?.click()}
                          disabled={!taskDetails?._id || postingComment}
                        >
                          Attach
                        </Button>
                      </Tooltip>
                      {voiceSupported && (
                        <Tooltip title={isVoiceListening ? "Stop voice input" : "Start voice input"}>
                          <Button
                            type={isVoiceListening ? "primary" : "default"}
                            icon={isVoiceListening ? <StopOutlined /> : <AudioOutlined />}
                            onClick={handleVoiceToggle}
                            disabled={!taskDetails?._id || postingComment}
                          >
                            {isVoiceListening ? "Stop" : "Voice"}
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                    {hasCommentFiles && (
                      <Select
                        className="bug-detail-composer-folder-select"
                        placeholder="Select folder"
                        value={commentFolderId}
                        onChange={setCommentFolderId}
                        options={availableFolders.map((folder) => ({
                          value: folder?._id,
                          label: folder?.name,
                        }))}
                        disabled={postingComment}
                      />
                    )}
                    <Button
                      className="bug-detail-primary-btn"
                      type="primary"
                      onClick={handlePostComment}
                      loading={postingComment}
                      disabled={!commentValue.trim() && !hasCommentFiles}
                    >
Send                    </Button>
                  </div>
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    multiple
                    accept="*"
                    style={{ display: "none" }}
                    onChange={onCommentFilesChange}
                  />
                </div>
              </div>
            )}

            {activeTab === "files" && (
              <div className="bug-files-list">
                {(() => {
                  const files = [
                    ...(Array.isArray(fileViewAttachment) ? fileViewAttachment : []),
                    ...(Array.isArray(populatedViewFiles) ? populatedViewFiles : []),
                  ];

                  if (files.length === 0) {
                    return (
                      <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "40px" }}>
                        No uploaded files yet.
                      </div>
                    );
                  }

                  return files.map((file, index) => (
                    <div key={file._id || index} className="bug-file-card">
                      <div className="bug-file-info">
                        {fileImageSelect(file.file_type || file.type)}
                        <a
                          href={getPublicFileUrl(file.path || file.file_path)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {file.name || file.file_name}
                        </a>
                      </div>
                      <div className="bug-file-actions">
                        <Button
                          type="text"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadFile(file)}
                          title="Download"
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {(activeTab === "history" || activeTab === "task") && (
              <div className="bug-history-list">
                {taskHistory && taskHistory.length > 0 ? (
                  taskHistory.map((history, index) => (
                    <div
                      key={history._id || index}
                      className="main-comment-wrapper bug-history-card"
                    >
                      <div className="bug-history-header">
                        <MyAvatar
                          full_name={
                            history.updatedBy?.full_name ||
                            history.user_id?.full_name ||
                            history.user?.full_name ||
                            history.createdBy?.full_name ||
                            history.sender
                          }
                          src={
                            history.updatedBy?.emp_img ||
                            history.user_id?.profile_image ||
                            history.user_id?.emp_img ||
                            history.user?.profile_image ||
                            history.createdBy?.emp_img ||
                            history.profile_pic
                          }
                        />

                        <div className="bug-history-meta">
                          <div className="bug-history-title">
                            <strong>
                              {removeTitle(
                                history.updatedBy?.full_name ||
                                  history.user_id?.full_name ||
                                  history.user?.full_name ||
                                  history.createdBy?.full_name ||
                                  history.sender ||
                                  "Someone"
                              )}
                            </strong>{" "}
                            {history.updated_key === "createdAt" ? "added the task" : "updated the task"}
                          </div>
                          <div className="bug-history-time">
                            {calculateTimeDifference(history.updatedAt || history.createdAt)}{" "}
                            {history.updatedAt || history.createdAt
                              ? `(${moment(history.updatedAt || history.createdAt).format("DD-MM-YYYY")})`
                              : ""}
                          </div>
                        </div>

                        {(history?.pervious_value != null ||
                          history?.previous_value != null ||
                          history?.old_value != null ||
                          history?.prev_value != null ||
                          history?.before != null ||
                          history?.new_value != null ||
                          history?.updated_value != null ||
                          history?.next_value != null ||
                          history?.after != null ||
                          history?.updated_key) && (
                          <Button
                            type="text"
                            size="small"
                            className="bug-history-toggle"
                            onClick={() =>
                              setExpandHistoryId(
                                expandHistoryId === (history._id || String(index))
                                  ? null
                                  : (history._id || String(index))
                              )
                            }
                          >
                            {expandHistoryId === (history._id || String(index)) ? "▼" : "▶"}
                          </Button>
                        )}
                      </div>

                      {expandHistoryId === (history._id || String(index)) && (
                        <div className="bug-history-data-wrapper">
                          <div className="bug-history-row">
                            <div className="bug-history-key">Previous:</div>
                            <div className="bug-history-val">
                              {formatHistoryValue(history.updated_key, getHistoryPrevValue(history))}
                            </div>
                          </div>
                          <div className="bug-history-row">
                            <div className="bug-history-key">New:</div>
                            <div className="bug-history-val">
                              {formatHistoryValue(history.updated_key, getHistoryNewValue(history))}
                            </div>
                          </div>
                        </div>
                      )}

                      {(!history?.updated_key ||
                        (getHistoryPrevValue(history) == null && getHistoryNewValue(history) == null)) &&
                        history?.message && (
                          <div className="bug-history-message">{history.message}</div>
                        )}
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "40px" }}>No activity logs.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BugDetailModal;
