import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Input, Button, Modal, Form, Select, message, Spin, Popconfirm, Tooltip, Avatar, Skeleton, Pagination
} from "antd";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  PlusOutlined, SearchOutlined, SendOutlined,
  TeamOutlined, UserOutlined, DeleteOutlined, EditOutlined, MoreOutlined, CloseOutlined
} from "@ant-design/icons";
import Service from "../../service";
import "./Discussion.css";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [topicsError, setTopicsError] = useState("");
  const [totalTopics, setTotalTopics] = useState(0);
  const [pageSize] = useState(25); // Fixed at 25 for infinite scroll
  const [hasMore, setHasMore] = useState(true);
  const [allTopics, setAllTopics] = useState([]); // For infinite scroll accumulation
  const bottomRef = useRef(null);

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
      setCurrentPage(1);
      setAllTopics([]);
      setHasMore(true);
    }
    
    if (initialLoadDone.current && !reset) {
      // Don't show skeleton on scroll load - only on initial load or search
    } else {
      setLoadingTopics(true);
    }
    setTopicsError("");
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionTopic,
        body: {
          pageNo: reset ? 1 : currentPage,
          limit: pageSize,
          sortBy: "desc",
          type: activeTab,
          ...(searchVal ? { search: searchVal } : {}),
        },
      });
      const data = res?.data?.data;
      const meta = res?.data?.metadata;
      const newTopics = Array.isArray(data) ? data : [];
      
      setAllTopics(prev => {
        const updatedTopics = reset ? newTopics : [...prev, ...newTopics];
        
        // Check if there are more items to load
        const hasMoreItems = newTopics.length === pageSize && updatedTopics.length < (meta?.total || 0);
        setHasMore(hasMoreItems);
        
        return updatedTopics;
      });
      
      setTopics(newTopics); // For backward compatibility with existing logic
      setTotalTopics(meta?.total || 0);
      
      if (!reset) {
        setCurrentPage(prev => prev + 1);
      }
    } catch (e) {
      console.error(e);
      setTopics([]);
      setAllTopics([]);
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load discussions";
      setTopicsError(msg);
      setHasMore(false);
    } finally {
      setLoadingTopics(false);
      initialLoadDone.current = true;
    }
  }, [activeTab, currentPage, pageSize]);

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

  if (loadingTopics) {
    return (
      <div className={`disc-page${isDark ? " disc-dark" : ""}`}>
        {/* Left Skeleton */}
        <div className="disc-left">
          <div className="disc-left-header">
            <Skeleton.Input active size="small" style={{ width: 100, borderRadius: 6 }} />
          </div>
          <div className="disc-add-btns">
            <Skeleton.Button active style={{ flex: 1, borderRadius: 8 }} />
            <Skeleton.Button active style={{ flex: 1, borderRadius: 8 }} />
          </div>
          <div className="disc-tabs" style={{ padding: "8px 12px" }}>
            <Skeleton.Input active size="small" style={{ width: 60, borderRadius: 6 }} />
            <Skeleton.Input active size="small" style={{ width: 50, borderRadius: 6, marginLeft: 8 }} />
          </div>
          <div className="disc-search">
            <Skeleton.Input active block style={{ borderRadius: 8 }} />
          </div>
          <div className="disc-topic-skeleton">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="disc-skeleton-topic-item">
                <Skeleton.Avatar active size={38} />
                <div className="disc-skeleton-topic-info">
                  <Skeleton.Input active size="small" style={{ width: 100 + (i % 3) * 25, height: 13, borderRadius: 6 }} />
                  <Skeleton.Input active size="small" style={{ width: 65 + (i % 2) * 20, height: 10, borderRadius: 6, marginTop: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Skeleton */}
        <div className="disc-right">
          <div className="disc-chat-header" style={{ gap: 12 }}>
            <Skeleton.Avatar active size={40} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton.Input active size="small" style={{ width: 140, borderRadius: 6 }} />
              <Skeleton.Input active size="small" style={{ width: 90, height: 10, borderRadius: 6 }} />
            </div>
          </div>
          <div className="disc-messages">
            <div className="disc-msg-skeleton">
              {[120, 180, 100, 200, 140, 160, 110].map((w, i) => (
                <div key={i} className={`disc-skeleton-row${i % 3 === 1 ? " me" : ""}`}>
                  {i % 3 !== 1 && <Skeleton.Avatar active size={32} />}
                  <Skeleton.Input active size="small" style={{ width: w, borderRadius: 12, height: 36 }} />
                </div>
              ))}
            </div>
          </div>
          <div className="disc-input-bar">
            <Skeleton.Input active block style={{ borderRadius: 20 }} />
            <Skeleton.Avatar active size={38} shape="circle" />
          </div>
        </div>
      </div>
    );
  }

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
          <Button className="add-btn" type="primary" onClick={() => openAdd("General")}>
            <PlusOutlined /> Group Chat
          </Button>
          <Button className="add-btn"  type="primary" onClick={() => openAdd("Member")}>
            <PlusOutlined /> Member chat
          </Button>
        </div>

        {/* Tabs */}
        <div className="disc-tabs">
          <button className={`disc-tab${activeTab === "General" ? " active" : ""}`} onClick={() => setActiveTab("General")}>General</button>
          <button className={`disc-tab${activeTab === "Task" ? " active" : ""}`} onClick={() => setActiveTab("Task")}>Task</button>
        </div>

        {/* Search */}
        <div className="disc-search">
          <Input.Search placeholder="Search discussions..." value={search} onChange={(e) => setSearch(e.target.value)} allowClear className="ap-search-input" />
        </div>

        {/* Topics List with Infinite Scroll */}
        <div className="disc-topics" id="disc-topics-container">
          <InfiniteScroll
            dataLength={allTopics.length}
            next={loadMoreTopics}
            hasMore={hasMore}
            loader={
              <div className="disc-loading-more">
                <Spin size="small" />
                <span>Loading more...</span>
              </div>
            }
            scrollableTarget="disc-topics-container"
            endMessage={
              allTopics.length > 0 && (
                <div className="disc-end-message">
                  <span>No more discussions</span>
                </div>
              )
            }
          >
            {loadingTopics && allTopics.length === 0 ? (
              <div className="disc-loading">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="disc-topic-skeleton">
                    <Skeleton.Avatar active size={32} />
                    <div className="disc-topic-skeleton-content">
                      <Skeleton.Input active size="small" style={{ width: 120 + (i * 20), borderRadius: 4 }} />
                      <Skeleton.Input active size="small" style={{ width: 80 + (i * 10), borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : allTopics.length === 0 && !debouncedSearch ? (
              <div className="disc-empty">
                <div className="disc-empty-icon">No discussions yet</div>
                <p className="disc-empty-title">Start a conversation!</p>
                <p className="disc-empty-sub">Create your first discussion topic.</p>
              </div>
            ) : allTopics.length === 0 && debouncedSearch ? (
              <div className="disc-empty">
                <div className="disc-empty-icon">No results</div>
                <p className="disc-empty-title">No discussions found</p>
                <p className="disc-empty-sub">Try adjusting your search terms.</p>
              </div>
            ) : (
              allTopics.map((t, i) => {
                const senderName = t.createdBy?.full_name || t.createdBy?.name || "Unknown";
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
                    <Popconfirm title="Delete?" onConfirm={(e) => { e.stopPropagation(); handleDeleteTopic(t._id); }} okText="Yes" cancelText="No">
                      <button className="disc-topic-del" onClick={(e) => e.stopPropagation()}><DeleteOutlined /></button>
                    </Popconfirm>
                  </div>
                );
              })
            )}
          </InfiniteScroll>
        </div>
      </div>

      {/* Right Panel */}
      <div className="disc-right">
        {!selectedTopic ? (
          <div className="disc-no-selection">
            <div className="disc-no-selection-icon">💬</div>
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
