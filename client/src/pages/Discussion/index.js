import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Input, Button, Modal, Form, Select, message, Spin, Popconfirm, Tooltip, Avatar, Skeleton, Pagination
} from "antd";
// InfiniteScroll removed for a more reliable native implementation
import {
  PlusOutlined, SearchOutlined, SendOutlined,
  TeamOutlined, UserOutlined, DeleteOutlined, EditOutlined, MoreOutlined, CloseOutlined
} from "@ant-design/icons";
import Service from "../../service";
import "./Discussion.css";
import NoChatIcon from "../../components/common/NoChatIcon";

const checkIsDark = () =>
  document.body.classList.contains("dark-theme") ||
  document.body.getAttribute("data-theme") === "dark";

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (name[0] || "?").toUpperCase();
};

const AVATAR_COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f97316","#10b981","#06b6d4","#f59e0b","#6366f1"];
const getAvatarColor = (str = "") => AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];

export default function DiscussionPage() {
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
  const [sendingComment, setSendingComment] = useState(false);
  const [folderId, setFolderId] = useState(null);
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


  const fetchComments = async (topicId, projectId, showLoader = true) => {
    if (showLoader) setLoadingComments(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionComment,
        body: { topic_id: topicId, project_id: projectId },
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
    const pid = topic.project?._id || topic.project_id;
    fetchComments(topic._id, pid);
    fetchFolder(pid);
  };

  const sendComment = async () => {
    if (!commentText.trim() || !selectedTopic) return;
    setSendingComment(true);
    try {
      const project_id = selectedTopic.project?._id || selectedTopic.project_id;
      const body = { topic_id: selectedTopic._id, title: commentText.trim(), project_id, taggedUsers: [] };
      if (folderId) body.folder_id = folderId;
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addDiscussionTopicList,
        body,
      });
      if (res?.data?.status || res?.data?.data || res?.data?.success) {
        setCommentText("");
        fetchComments(selectedTopic._id, project_id, false);
      } else {
        message.error(res?.data?.message || "Failed to send");
      }
    } catch (e) { message.error("Failed to send"); }
    finally { setSendingComment(false); }
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
        fetchTopics(search);
      } else { message.error(res?.data?.message || "Failed"); }
    } catch (e) { if (e?.errorFields) return; message.error("Something went wrong"); }
    finally { setAddSubmitting(false); }
  };

  const handleDeleteTopic = async (id) => {
    try {
      await Service.makeAPICall({ methodName: Service.deleteMethod, api_url: `${Service.deleteDiscussionTopic}/${id}` });
      message.success("Discussion deleted");
      if (selectedTopic?._id === id) { setSelectedTopic(null); setComments([]); }
      fetchTopics(search);
    } catch (e) { message.error("Delete failed"); }
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
            <div className="disc-no-selection-icon"><NoChatIcon/></div>
            <p className="disc-no-selection-title">No Discussion selected</p>
            <p className="disc-no-selection-sub">Please add new discussion for chat room view.</p>
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
              <button className="disc-icon-btn" onClick={() => { setSelectedTopic(null); setComments([]); }}>
                <CloseOutlined />
              </button>
            </div>

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
                <div className="disc-no-msg">No messages yet. Start the conversation!</div>
              ) : (
                comments.map((c, i) => {
                  const senderName = c.createdBy?.full_name || c.createdBy?.name || "User";
                  const isMe = c.createdBy?._id === userData?._id || c.createdBy === userData?._id;
                  const initials = getInitials(senderName);
                  const color = getAvatarColor(senderName);
                  const text = (c.title || c.description || "")?.replace(/<[^>]*>/g, "");
                  return (
                    <div key={c._id || i} className={`disc-msg-row${isMe ? " me" : ""}`}>
                      {!isMe && (
                        <div className="disc-msg-avatar" style={{ background: color }}>{initials}</div>
                      )}
                      <div className="disc-msg-body">
                        {!isMe && <span className="disc-msg-sender">{senderName}</span>}
                        <div className="disc-msg-bubble">{text}</div>
                        <span className="disc-msg-time">{formatTime(c.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="disc-input-bar">
              <Input
                className="disc-input"
                placeholder="Type a message..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
              />
              <Button type="primary" icon={<SendOutlined />} onClick={sendComment} loading={sendingComment} className="disc-send-btn" />
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
