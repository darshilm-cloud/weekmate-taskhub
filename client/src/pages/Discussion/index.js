import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Input, Button, Modal, Form, Select, message, Spin, Popconfirm, Tooltip, Avatar, Skeleton, Pagination
} from "antd";
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
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [folderId, setFolderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [topicsError, setTopicsError] = useState("");
  const pageSize = 15;
  const bottomRef = useRef(null);

  // Add Topic modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addType, setAddType] = useState("General"); // General or Member

  const initialLoadDone = React.useRef(false);

  const fetchTopics = useCallback(async (searchVal = "") => {
    if (initialLoadDone.current) {
      // Don't show skeleton on search/filter — only on initial load
    } else {
      setLoadingTopics(true);
    }
    setTopicsError("");
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getDiscussionTopic,
        body: {
          pageNo: 1,
          limit: 9999,
          sortBy: "desc",
          ...(searchVal ? { search: searchVal } : {}),
        },
      });
      const data = res?.data?.data;
      setTopics(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTopics([]);
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load discussions";
      setTopicsError(msg);
    } finally {
      setLoadingTopics(false);
      initialLoadDone.current = true;
    }
  }, []);

  useEffect(() => {
    fetchTopics(search);
  }, [fetchTopics]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search]);


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

  const allFilteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesTab = activeTab === "General" ? !t.task_id : !!t.task_id;
      if (!matchesTab) return false;
      if (!normalizedSearch) return true;

      const topicTitle = String(t.title || t.topic || "").toLowerCase();
      const projectTitle = String(t.project?.title || "").toLowerCase();
      const creatorName = String(t.createdBy?.full_name || t.createdBy?.name || "").toLowerCase();

      return (
        topicTitle.includes(normalizedSearch) ||
        projectTitle.includes(normalizedSearch) ||
        creatorName.includes(normalizedSearch)
      );
    });
  }, [topics, activeTab, normalizedSearch]);

  const filteredTopics = allFilteredTopics.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
          <Tooltip title="Search"><button className="disc-icon-btn"><SearchOutlined /></button></Tooltip>
        </div>

        {/* Add buttons */}
        <div className="disc-add-btns">
          <button className="disc-add-btn" onClick={() => openAdd("General")}>
            <PlusOutlined /> Group Chat
          </button>
          <button className="disc-add-btn" onClick={() => openAdd("Member")}>
            <PlusOutlined /> Member chat
          </button>
        </div>

        {/* Tabs */}
        <div className="disc-tabs">
          <button className={`disc-tab${activeTab === "General" ? " active" : ""}`} onClick={() => setActiveTab("General")}>General</button>
          <button className={`disc-tab${activeTab === "Task" ? " active" : ""}`} onClick={() => setActiveTab("Task")}>Task</button>
        </div>

        {/* Search */}
        <div className="disc-search">
          <Input placeholder="Search discussions..." value={search} onChange={(e) => setSearch(e.target.value)} prefix={<SearchOutlined style={{ color: "#94a3b8" }} />} allowClear />
        </div>

        {/* Topic List */}
        <div className="disc-topic-list">
          {topicsError ? (
            <div className="disc-error">{topicsError}</div>
          ) : null}
          {filteredTopics.length === 0 ? (
            <div className="disc-empty-topics">No {activeTab} Discussion found</div>
          ) : (
            filteredTopics.map((t) => {
              const name = t.createdBy?.full_name || t.createdBy?.name || "User";
              const initials = getInitials(name);
              const color = getAvatarColor(name);
              return (
                <div
                  key={t._id}
                  className={`disc-topic-item${selectedTopic?._id === t._id ? " selected" : ""}`}
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
        </div>

        {/* Pagination */}
        {allFilteredTopics.length > pageSize && (
          <div className="disc-pagination">
            <Pagination
              size="small"
              current={currentPage}
              total={allFilteredTopics.length}
              pageSize={pageSize}
              onChange={(p) => setCurrentPage(p)}
              showSizeChanger={false}
            />
          </div>
        )}
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
            <Select showSearch placeholder="Select project"
              filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
              options={projects.map((p) => ({ value: p._id, label: p.title }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
