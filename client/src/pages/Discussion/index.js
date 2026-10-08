import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Input, Button, Modal, Form, Select, message, Spin, Popconfirm, Tooltip, Avatar, Skeleton, Pagination, Dropdown, Popover
} from "antd";
// InfiniteScroll removed for a more reliable native implementation
import {
  PlusOutlined, SearchOutlined, SendOutlined,
  TeamOutlined, UserOutlined, DeleteOutlined, EditOutlined, MoreOutlined, CloseOutlined, CopyOutlined,
  UpOutlined, DownOutlined, PaperClipOutlined, CloseCircleFilled
} from "@ant-design/icons";
import Service from "../../service";
import "./Discussion.css";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import { fileImageSelect } from "../../util/FIleSelection";

const checkIsDark = () =>
  document.body.classList.contains("dark-theme") ||
  document.body.getAttribute("data-theme") === "dark";

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (name[0] || "?").toUpperCase();
};

// Blue-only palette (varying shades for visual distinction between people)
// to match the app's blue-and-white theme — was previously a rainbow of
// purple/pink/orange/green/amber.
const AVATAR_COLORS = ["#0b3a5b","#0369a1","#0284c7","#2563eb","#3b82f6","#1d4ed8","#1e40af","#075985"];
const getAvatarColor = (str = "") => AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];

export default function DiscussionPage() {
  const location = useLocation();
  const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
  const [isDark, setIsDark] = useState(checkIsDark);
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(checkIsDark()));
    obs.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => obs.disconnect();
  }, []);

  const [activeTab, setActiveTab] = useState("General");
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [commentText, setCommentText] = useState("");
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchValue, setChatSearchValue] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [sendingComment, setSendingComment] = useState(false);
  const [folderId, setFolderId] = useState(null);
  const [chatAttachments, setChatAttachments] = useState([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [allTopics, setAllTopics] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isTopicScrollLoading, setIsTopicScrollLoading] = useState(false);
  const [pageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTopics, setTotalTopics] = useState(0);
  const [topicsError, setTopicsError] = useState("");

  const isTopicScrollLoadingRef = useRef(false);
  const topicsContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const messageInputRef = useRef(null);
  const chatFileInputRef = useRef(null);
  const messageRowRefs = useRef({});
  const currentPageRef = useRef(1);
  // Persistent refs for the scroll listener
  const activeTabRef = useRef(activeTab);
  const debouncedSearchRef = useRef(debouncedSearch);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { debouncedSearchRef.current = debouncedSearch; }, [debouncedSearch]);

  // Add Topic modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const selectedAddProjectId = Form.useWatch("project_id", addForm);
  const [projects, setProjects] = useState([]);
  const [projectTasksMap, setProjectTasksMap] = useState({});
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addType, setAddType] = useState("General"); // General or Member

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const initialLoadDone = React.useRef(false);

  const fetchTopics = useCallback(async (searchVal = "", reset = false) => {
    
    if (reset) {
      setLoadingTopics(true);
      setIsTopicScrollLoading(false);
      setAllTopics([]);
      setHasMore(true);
      currentPageRef.current = 1;
    }

    setTopicsError("");
    try {
      // Use ref to get the current page without stale closure
      const pageToFetch = currentPageRef.current;

      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionTopic,
        body: {
          pageNo: pageToFetch,
          limit: pageSize,
          sortBy: "desc",
          type: activeTab,
          ...(searchVal ? { search: searchVal } : {}),
        },
      });

      const data = (res?.data?.data || []).filter(
        (t) => t?.project?.project_status?.title?.toLowerCase() !== "archived"
      );
      const meta = res?.data?.metadata || {};
      const total = meta.total || 0;

      if (reset) {
        setAllTopics(data);
        currentPageRef.current = 2;
        setHasMore(data.length < total && data.length > 0);
      } else {
        setAllTopics(prev => {
          const updated = [...prev, ...data];
          // Check if we have loaded all items
          setHasMore(updated.length < total && data.length > 0);
          return updated;
        });
        currentPageRef.current += 1;
      }

      setTotalTopics(total);
    } catch (e) {
      console.error("fetchTopics error", e);
      if (reset) setAllTopics([]);
      setTopicsError(e?.response?.data?.message || e?.message || "Failed to load discussions");
      setHasMore(false);
    } finally {
      setLoadingTopics(false);
      setIsTopicScrollLoading(false);
      isTopicScrollLoadingRef.current = false;
    }
  }, [activeTab, pageSize]);

  const onLoadMoreTopics = useCallback(() => {
    if (isTopicScrollLoadingRef.current || !hasMore) return;
    isTopicScrollLoadingRef.current = true;
    setIsTopicScrollLoading(true);
    fetchTopics(debouncedSearch, false);
  }, [hasMore, debouncedSearch, fetchTopics]);

  const handleTabChange = (tabName) => {
    // Prevent rapid tab switching while API is in-flight.
    if (loadingTopics || isTopicScrollLoading) return;
    if (activeTab === tabName) return;
    setActiveTab(tabName);
  };

  /* ── Native Scroll Listener (Reliable Pattern) ── */
  useEffect(() => {
    const container = topicsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Trigger when user scrolls to the bottom (with small buffer)
      if (scrollHeight - scrollTop - clientHeight < 50) {
        onLoadMoreTopics();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [onLoadMoreTopics]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchTopics(debouncedSearch, true); // Reset on search, tab change, or initial load
  }, [fetchTopics, activeTab, debouncedSearch]);


  const fetchComments = async (topicId, projectId, showLoader = true, searchVal = "") => {
    if (showLoader) setLoadingComments(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionComment,
        // The backend already supports filtering comments by title via `search`
        // (discussionsTopicsDetails.getDiscussionsTopicsDetails) — "Find in
        // chat" uses that directly instead of filtering the loaded page client-side.
        body: { topic_id: topicId, project_id: projectId, ...(searchVal ? { search: searchVal } : {}) },
      });
      const data = res?.data?.data;
      setComments(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally {
      setLoadingComments(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const fetchFolder = async (projectId) => {
    if (!projectId) return;
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getFolderslist,
        body: { project_id: projectId },
      });
      const list = res?.data?.data;
      if (Array.isArray(list) && list.length > 0) {
        setFolderId(list[0]._id);
      }
    } catch (e) { console.error(e); }
  };

  const loadMoreTopics = () => {
    if (hasMore && !loadingTopics) {
      fetchTopics(debouncedSearch, false); // Don't reset, just load more
    }
  };

  const selectTopic = (topic) => {
    setSelectedTopic(topic);
    setChatSearchOpen(false);
    setChatSearchValue("");
    const pid = topic.project?._id || topic.project_id;
    fetchComments(topic._id, pid);
    fetchFolder(pid);
  };

  // "Find in chat" — re-queries the backend (not a client-side filter of the
  // already-loaded page) every time the search text settles.
  useEffect(() => {
    if (!selectedTopic) return;
    const pid = selectedTopic.project?._id || selectedTopic.project_id;
    const handler = setTimeout(() => {
      fetchComments(selectedTopic._id, pid, true, chatSearchValue);
    }, 350);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSearchValue]);

  // Jump to a specific match in the (already search-filtered) message list,
  // scrolling it into view and tracking which one is "current" for the
  // "X of Y" counter — mirrors the up/down navigation of a normal find-in-page.
  const scrollToMatch = (index) => {
    const target = comments[index];
    const node = target && messageRowRefs.current[target._id];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const goToPrevMatch = () => {
    if (!comments.length) return;
    const next = (searchMatchIndex - 1 + comments.length) % comments.length;
    setSearchMatchIndex(next);
    scrollToMatch(next);
  };

  const goToNextMatch = () => {
    if (!comments.length) return;
    const next = (searchMatchIndex + 1) % comments.length;
    setSearchMatchIndex(next);
    scrollToMatch(next);
  };

  // A fresh result set (new search term, or a topic switch) always starts
  // back at the first match.
  useEffect(() => {
    setSearchMatchIndex(0);
  }, [comments]);

  // Everyone with access to this thread: the creator plus subscribers and any
  // pms clients — all already populated by the topics-list endpoint, so this
  // needs no extra API call.
  const topicMembers = useMemo(() => {
    if (!selectedTopic) return [];
    const seen = new Set();
    const list = [];
    const addMember = (person, role) => {
      if (!person?._id || seen.has(person._id)) return;
      seen.add(person._id);
      list.push({
        _id: person._id,
        name: person.full_name || person.name || "Unknown",
        img: person.emp_img || person.client_img || "",
        role,
      });
    };
    addMember(selectedTopic.createdBy, "Owner");
    (selectedTopic.subscribers || []).forEach((s) => addMember(s, "Member"));
    (selectedTopic.pms_clients || []).forEach((c) => addMember(c, "Client"));
    return list;
  }, [selectedTopic]);

  // Deep-link support: the dashboard's "Recent Discussion" list passes the
  // full topic it was already holding via navigation state, so the matching
  // thread opens immediately on arrival instead of landing on just the list.
  useEffect(() => {
    const incomingTopic = location.state?.topic;
    if (incomingTopic) {
      setActiveTab(incomingTopic.task_id ? "Task" : "General");
      selectTopic(incomingTopic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus the message input whenever a thread becomes selected — both the
  // deep-linked redirect above and a normal manual click in the topic list.
  useEffect(() => {
    if (selectedTopic) {
      const timer = setTimeout(() => messageInputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [selectedTopic]);

  // Same 20MB-per-file convention as the rest of the app's comment/attachment
  // flows (ReuseComponent/AddComment, components/Discussion/DiscussionForm).
  const MAX_ATTACHMENT_MB = 20;

  const onChatFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const valid = [];
    selected.forEach((file) => {
      if (file.size / (1024 * 1024) <= MAX_ATTACHMENT_MB) {
        valid.push(file);
      } else {
        message.error(`"${file.name}" exceeds the ${MAX_ATTACHMENT_MB}MB limit.`);
      }
    });
    if (valid.length) setChatAttachments((prev) => [...prev, ...valid]);
    e.target.value = ""; // allow re-selecting the same file afterwards
  };

  const removeChatAttachment = (index) => {
    setChatAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Same two-step flow as the rest of the app: raw files go to /files/upload
  // first, and the returned {file_name, file_path, file_size} entries are
  // what actually gets attached to the comment.
  const uploadChatAttachments = async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("document", file));
    const response = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: `${Service.fileUpload}?file_for=discussionsTopicsDetails`,
      body: formData,
      options: { "content-type": "multipart/form-data" },
    });
    return response?.data?.data || [];
  };

  const sendComment = async () => {
    if ((!commentText.trim() && chatAttachments.length === 0) || !selectedTopic) return;
    setSendingComment(true);
    try {
      const project_id = selectedTopic.project?._id || selectedTopic.project_id;

      let uploaded = [];
      if (chatAttachments.length > 0) {
        setUploadingAttachments(true);
        uploaded = await uploadChatAttachments(chatAttachments);
        setUploadingAttachments(false);
        if (!uploaded.length) {
          message.error("File upload failed, please try again.");
          setSendingComment(false);
          return;
        }
      }

      const body = { topic_id: selectedTopic._id, title: commentText.trim(), project_id, taggedUsers: [] };
      if (folderId) body.folder_id = folderId;
      if (uploaded.length > 0) body.attachments = uploaded;

      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addDiscussionTopicList,
        body,
      });
      if (res?.data?.status || res?.data?.data || res?.data?.success) {
        setCommentText("");
        setChatAttachments([]);
        fetchComments(selectedTopic._id, project_id, false);
      } else {
        message.error(res?.data?.message || "Failed to send");
      }
    } catch (e) { message.error("Failed to send"); }
    finally { setSendingComment(false); setUploadingAttachments(false); }
  };

  const loadProjects = async () => {
    try {
      const res = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectList,
      });
      const data = res?.data?.data;
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setProjects(list);
    } catch (e) {
      console.error("loadProjects error", e);
    }
  };

  const openAdd = async (type) => {
    setAddType(type);
    setAddOpen(true);
    await loadProjects();
  };

  const loadProjectTasks = async (projectId) => {
    if (!projectId) return;
    if (projectTasksMap[projectId]) return;
    setLoadingTasks(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getTaskDropdown}/${projectId}`,
      });
      const list = res?.data?.data || [];
      setProjectTasksMap((prev) => ({ ...prev, [projectId]: Array.isArray(list) ? list : [] }));
    } catch (e) {
      console.error("loadProjectTasks error", e);
      setProjectTasksMap((prev) => ({ ...prev, [projectId]: [] }));
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleAddProjectChange = async (projectId) => {
    addForm.setFieldValue("task_id", undefined);
    if (addType === "Member") {
      await loadProjectTasks(projectId);
    }
  };

  const handleAdd = async () => {
    try {
      const values = await addForm.validateFields();
      setAddSubmitting(true);
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addDiscussion,
        body: {
          title: values.title,
          project_id: values.project_id,
          ...(addType === "Member" && values.task_id ? { task_id: values.task_id } : {}),
          subscribers: values.subscribers || [],
        },
      });
      if (res?.data?.status === 1 || res?.data?.success) {
        message.success("Discussion created");
        addForm.resetFields(); setAddOpen(false);
        fetchTopics(debouncedSearch, true);
      } else { message.error(res?.data?.message || "Failed"); }
    } catch (e) { if (e?.errorFields) return; message.error("Something went wrong"); }
    finally { setAddSubmitting(false); }
  };

  const handleDeleteTopic = async (id) => {
    try {
      await Service.makeAPICall({ methodName: Service.deleteMethod, api_url: `${Service.deleteDiscussionTopic}/${id}` });
      message.success("Discussion deleted");
      if (selectedTopic?._id === id) { setSelectedTopic(null); setComments([]); }
      fetchTopics(debouncedSearch, true);
    } catch (e) { message.error("Delete failed"); }
  };

  const handleEditComment = (comment) => {
    const raw = (comment.title || comment.description || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    setEditingCommentId(comment._id);
    setEditingText(raw);
  };

  const handleSaveEdit = async () => {
    if (!editingText.trim() || !selectedTopic) return;
    setSavingEdit(true);
    try {
      const project_id = selectedTopic.project?._id || selectedTopic.project_id;
      const res = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateDiscussionComment}/${editingCommentId}`,
        body: { title: editingText.trim(), topic_id: selectedTopic._id, project_id },
      });
      if (res?.data?.status === 1 || res?.data?.success || res?.data?.data) {
        setEditingCommentId(null);
        setEditingText("");
        fetchComments(selectedTopic._id, project_id, false);
      } else {
        message.error(res?.data?.message || "Failed to update");
      }
    } catch (e) { message.error("Failed to update"); }
    finally { setSavingEdit(false); }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText("");
  };

  const handleDeleteComment = async (commentId) => {
    if (!selectedTopic) return;
    try {
      const project_id = selectedTopic.project?._id || selectedTopic.project_id;
      await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteDiscussionComment}/${commentId}`,
      });
      message.success("Message deleted");
      fetchComments(selectedTopic._id, project_id, false);
    } catch (e) { message.error("Delete failed"); }
  };

  const handleCopyComment = (comment) => {
    const raw = (comment.title || comment.description || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    navigator.clipboard?.writeText(raw).then(() => message.success("Copied")).catch(() => message.error("Copy failed"));
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredTopics = topics;

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  };

  // Removed flickering early return. Skeleton is now handled inside the topic list area.

  return (
    <div className={`disc-page${isDark ? " disc-dark" : ""}`}>
      {/* Left Panel */}
      <div className="disc-left">
        {/* Left Header */}
        <div className="disc-left-header">
          <span className="disc-left-title">Discussion</span>
        </div>

        {/* Add buttons */}
        <div className="disc-add-btns">
          <Button className="add-btn" icon={ <PlusOutlined />}  type="primary" onClick={() => openAdd("General")}>
            Group Chat
          </Button>
          <Button className="add-btn" icon={ <PlusOutlined />}  type="primary" onClick={() => openAdd("Member")}>
           Member chat
          </Button>
        </div>

        {/* Tabs */}
        <div className="disc-tabs">
          <button
            className={`disc-tab${activeTab === "General" ? " active" : ""}`}
            onClick={() => handleTabChange("General")}
            disabled={loadingTopics || isTopicScrollLoading}
          >
            General
          </button>
          <button
            className={`disc-tab${activeTab === "Task" ? " active" : ""}`}
            onClick={() => handleTabChange("Task")}
            disabled={loadingTopics || isTopicScrollLoading}
          >
            Task
          </button>
        </div>

        {/* Search */}
        <div className="disc-search">
          <Input.Search placeholder="Search discussions..." value={search} onChange={(e) => setSearch(e.target.value)} allowClear className="ap-search-input" />
        </div>

        <div className="disc-topics" id="disc-topics-container" ref={topicsContainerRef}>
          {loadingTopics && allTopics.length === 0 && !isTopicScrollLoading ? (
            <div className="disc-loading">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="disc-topic-skeleton" style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <Skeleton.Avatar active size={38} />
                  <div className="disc-topic-skeleton-content" style={{ flex: 1 }}>
                    <Skeleton.Input active size="small" style={{ width: "60%", height: 14, borderRadius: 4 }} />
                    <Skeleton.Input active size="small" style={{ width: "40%", height: 10, borderRadius: 4, marginTop: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : allTopics.length === 0 ? (
            <div className="disc-empty">
            </div>
          ) : (
            <>
              {allTopics.map((t) => {
                const senderName = t.createdBy?.full_name || t.createdBy?.name || t.createdBy?.first_name || "Unknown";
                const initials = getInitials(senderName);
                const color = getAvatarColor(senderName);
                return (
                  <div
                    key={t._id}
                    className={`disc-topic${selectedTopic?._id === t._id ? " disc-topic-active" : ""}`}
                    onClick={() => selectTopic(t)}
                  >
                    <div className="disc-topic-avatar" style={{ background: color }}>{initials}</div>
                    <div className="disc-topic-info">
                      <p className="disc-topic-name">{t.title}</p>
                      <span className="disc-topic-sub">{t.project?.title || ""}</span>
                    </div>
                    {(t.isDeletable || t.createdBy?._id === userData?._id) && (
                      <Popconfirm 
                        title="Delete this discussion?" 
                        onConfirm={(e) => { e.stopPropagation(); handleDeleteTopic(t._id); }} 
                        okText="Yes" 
                        cancelText="No"
                      >
                        <button className="disc-topic-del" onClick={(e) => e.stopPropagation()}>
                          <DeleteOutlined />
                        </button>
                      </Popconfirm>
                    )}
                  </div>
                );
              })}
              
              {isTopicScrollLoading && (
                <div className="disc-loading-more" style={{ textAlign: "center", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <Spin size="medium" />
                  <span style={{ fontSize: 12, color: "#8c8c8c" }}>Loading more discussions...</span>
                </div>
              )}

              {!hasMore && allTopics.length > pageSize && (
                <div className="disc-end-message" style={{ textAlign: "center", padding: "16px", opacity: 0.6, fontSize: 12 }}>
                  No more discussions
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="disc-right">
        {!selectedTopic ? (
          <div className="disc-no-selection">
            <div className="disc-no-selection-bg" aria-hidden="true">
              <span className="disc-bubble disc-bubble-1" />
              <span className="disc-bubble disc-bubble-2" />
              <span className="disc-bubble disc-bubble-3" />
            </div>
            <div className="disc-no-selection-icon"><NoDataFoundIcon /></div>
            <p className="disc-no-selection-title">No Discussion selected</p>
            <p className="disc-no-selection-sub">Pick a conversation from the list to start collaborating with your team.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="disc-chat-header">
              <div className="disc-chat-header-left">
                <div className="disc-chat-avatar" style={{ background: getAvatarColor(selectedTopic.title) }}>
                  {getInitials(selectedTopic.title)}
                </div>
                <div>
                  <p className="disc-chat-title">{selectedTopic.title}</p>
                  <span className="disc-chat-sub">{selectedTopic.project?.title || ""}</span>
                </div>
              </div>
              <div className="disc-chat-header-actions">
                <button
                  className={`disc-icon-btn${chatSearchOpen ? " active" : ""}`}
                  title="Find in chat"
                  onClick={() => setChatSearchOpen((prev) => {
                    if (prev) setChatSearchValue("");
                    return !prev;
                  })}
                >
                  <SearchOutlined />
                </button>
                <Popover
                  trigger="click"
                  placement="bottomRight"
                  title={`Members (${topicMembers.length})`}
                  content={
                    <div className="disc-members-list">
                      {topicMembers.length === 0 ? (
                        <div className="disc-members-empty">No members yet</div>
                      ) : (
                        topicMembers.map((m) => (
                          <div key={m._id} className="disc-member-row">
                            <span className="disc-member-avatar" style={{ background: getAvatarColor(m.name) }}>
                              {m.img ? <img src={m.img} alt={m.name} /> : getInitials(m.name)}
                            </span>
                            <span className="disc-member-name">{m.name}</span>
                            <span className={`disc-member-role disc-member-role-${m.role.toLowerCase()}`}>{m.role}</span>
                          </div>
                        ))
                      )}
                    </div>
                  }
                >
                  <button className="disc-icon-btn" title="Members">
                    <TeamOutlined />
                  </button>
                </Popover>
                <button className="disc-icon-btn" onClick={() => { setSelectedTopic(null); setComments([]); }}>
                  <CloseOutlined />
                </button>
              </div>
            </div>

            {chatSearchOpen && (
              <div className="disc-chat-search-bar">
                <Input
                  autoFocus
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="Find in this chat..."
                  value={chatSearchValue}
                  onChange={(e) => setChatSearchValue(e.target.value)}
                  onPressEnter={(e) => (e.shiftKey ? goToPrevMatch() : goToNextMatch())}
                />
                {chatSearchValue && (
                  <div className="disc-search-nav">
                    <span className="disc-search-count">
                      {comments.length > 0 ? `${searchMatchIndex + 1} of ${comments.length}` : "0 results"}
                    </span>
                    <button className="disc-icon-btn" title="Previous match" disabled={!comments.length} onClick={goToPrevMatch}>
                      <UpOutlined />
                    </button>
                    <button className="disc-icon-btn" title="Next match" disabled={!comments.length} onClick={goToNextMatch}>
                      <DownOutlined />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="disc-messages">
              {loadingComments ? (
                <div className="disc-msg-skeleton">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`disc-skeleton-row${i % 2 === 0 ? "" : " me"}`}>
                      {i % 2 === 0 && <Skeleton.Avatar active size={32} />}
                      <Skeleton.Input active size="small" className="disc-skeleton-bubble" style={{ width: i % 2 === 0 ? 180 + (i * 20) : 140 + (i * 15), borderRadius: 12 }} />
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="disc-no-msg">
                  <div className="disc-no-selection-bg" aria-hidden="true">
                    <span className="disc-bubble disc-bubble-1" />
                    <span className="disc-bubble disc-bubble-2" />
                    <span className="disc-bubble disc-bubble-3" />
                  </div>
                  <div className="disc-no-selection-icon"><NoDataFoundIcon /></div>
                  <p className="disc-no-msg-text">
                    {chatSearchValue ? `No messages match "${chatSearchValue}"` : "No messages yet. Start the conversation!"}
                  </p>
                </div>
              ) : (
                comments.map((c, i) => {
                  const senderName = c.createdBy?.full_name || c.createdBy?.name || "User";
                  const isMe = c.createdBy?._id === userData?._id || c.createdBy === userData?._id;
                  const initials = getInitials(senderName);
                  const color = getAvatarColor(senderName);
                  const isEditing = editingCommentId === c._id;

                  // The backend auto-creates one of these per topic (title is
                  // always the generic "Added this topic") — show who started
                  // the conversation and when instead of that placeholder text.
                  if (c.isDefault) {
                    return (
                      <div
                        key={c._id || i}
                        ref={(el) => { if (c._id) messageRowRefs.current[c._id] = el; }}
                        className="disc-system-msg"
                      >
                        <span className="disc-system-msg-text">
                          <strong>{senderName}</strong> started this discussion on {formatDate(c.createdAt)} at {formatTime(c.createdAt)}
                        </span>
                      </div>
                    );
                  }

                  const moreMenuItems = [
                    isMe && {
                      key: "edit",
                      icon: <EditOutlined />,
                      label: "Edit",
                      onClick: () => handleEditComment(c),
                    },
                    {
                      key: "copy",
                      icon: <CopyOutlined />,
                      label: "Copy",
                      onClick: () => handleCopyComment(c),
                    },
                    isMe && {
                      key: "delete",
                      icon: <DeleteOutlined />,
                      label: "Delete",
                      danger: true,
                      onClick: () => Modal.confirm({
                        title: "Delete this message?",
                        okText: "Yes",
                        cancelText: "No",
                        onOk: () => handleDeleteComment(c._id),
                      }),
                    },
                  ].filter(Boolean);

                  return (
                    <div
                      key={c._id || i}
                      ref={(el) => { if (c._id) messageRowRefs.current[c._id] = el; }}
                      className={`disc-msg-row${isMe ? " me" : ""}${chatSearchValue && i === searchMatchIndex ? " disc-msg-current-match" : ""}`}
                    >
                      {!isMe && (
                        <div className="disc-msg-avatar" style={{ background: color }}>{initials}</div>
                      )}
                      <div className="disc-msg-body">
                        {!isMe && <span className="disc-msg-sender">{senderName}</span>}
                        <div className="disc-msg-bubble-row">
                          {isEditing ? (
                            <div className="disc-edit-box">
                              <Input.TextArea
                                autoFocus
                                rows={2}
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSaveEdit(); } }}
                              />
                              <div className="disc-edit-actions">
                                <Button size="small" type="primary" loading={savingEdit} onClick={handleSaveEdit}>Save</Button>
                                <Button size="small" onClick={handleCancelEdit}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="disc-msg-bubble">
                              {(c.title || c.description) && (
                                <div dangerouslySetInnerHTML={{ __html: c.title || c.description || "" }} />
                              )}
                              {Array.isArray(c.attachments) && c.attachments.length > 0 && (
                                <div className="disc-msg-attachments">
                                  {c.attachments.map((file) => {
                                    const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(
                                      (file.file_type || "").toLowerCase()
                                    );
                                    const fileUrl = `${process.env.REACT_APP_API_URL}/public/${file.path}`;
                                    return isImage ? (
                                      <a
                                        key={file._id}
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="disc-msg-attachment-image"
                                      >
                                        <img src={fileUrl} alt={file.name} />
                                      </a>
                                    ) : (
                                      <a
                                        key={file._id}
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="disc-msg-attachment-file"
                                      >
                                        <span className="disc-msg-attachment-icon">
                                          {fileImageSelect(file.file_type, "22px")}
                                        </span>
                                        <span className="disc-msg-attachment-name">{file.name}{file.file_type}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                          {!isEditing && (
                            <Dropdown menu={{ items: moreMenuItems }} trigger={["click"]} placement={isMe ? "bottomRight" : "bottomLeft"}>
                              <button className="disc-msg-more">
                                <MoreOutlined />
                              </button>
                            </Dropdown>
                          )}
                        </div>
                        <span className="disc-msg-time">{formatTime(c.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="disc-input-bar disc-input-bar-stacked">
              {chatAttachments.length > 0 && (
                <div className="disc-pending-attachments">
                  {chatAttachments.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="disc-pending-attachment">
                      <span className="disc-pending-attachment-icon">{fileImageSelect(`.${file.name.split(".").pop()}`, "16px")}</span>
                      <span className="disc-pending-attachment-name">{file.name}</span>
                      <CloseCircleFilled
                        className="disc-pending-attachment-remove"
                        onClick={() => removeChatAttachment(index)}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="disc-input-row">
                <Input
                  ref={messageInputRef}
                  className="disc-input"
                  placeholder="Type a message..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                />
                <input
                  multiple
                  type="file"
                  hidden
                  ref={chatFileInputRef}
                  onChange={onChatFileChange}
                />
                <Tooltip title="Attach files">
                  <button
                    type="button"
                    className="disc-icon-btn disc-attach-btn"
                    onClick={() => chatFileInputRef.current?.click()}
                  >
                    <PaperClipOutlined />
                  </button>
                </Tooltip>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={sendComment}
                  loading={sendingComment || uploadingAttachments}
                  className="disc-send-btn"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Discussion Modal */}
      <Modal
        title={`New ${addType === "Member" ? "Member Chat" : "Group Chat"}`}
        open={addOpen}
        onCancel={() => { setAddOpen(false); addForm.resetFields(); }}
        cancelButtonProps={{className:"delete-btn"}}
        onOk={handleAdd}
        confirmLoading={addSubmitting}
        okText="Create"
        destroyOnClose
        className="global-app-modal disc-create-modal"
        width={640}
      >
        <Form form={addForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title required" }]}>
            <Input placeholder="Discussion title" />
          </Form.Item>
          <Form.Item name="project_id" label="Project" rules={[{ required: true, message: "Select a project" }]}>
            <Select showSearch placeholder="Select project" onChange={handleAddProjectChange}
              filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
              options={projects.map((p) => ({ value: p._id, label: p.title }))} />
          </Form.Item>
          {addType === "Member" && (
            <Form.Item name="task_id" label="Task" rules={[{ required: true, message: "Select a task" }]}>
              <Select
                showSearch
                placeholder="Select task"
                loading={loadingTasks}
                optionFilterProp="label"
                filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                options={(projectTasksMap[selectedAddProjectId] || []).map((task) => ({
                  value: task._id,
                  label: task.title || task.task || task.name || "Untitled task",
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
