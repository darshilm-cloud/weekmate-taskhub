import React, { useState, useEffect, useCallback } from "react";
import { Input, Button, Modal, Form, Select, message, Skeleton, Popconfirm, Tooltip, Popover } from "antd";
import {
  PlusOutlined,
  PushpinOutlined,
  DeleteOutlined,
  EditOutlined,
  UserAddOutlined,
  BgColorsOutlined,
} from "@ant-design/icons";
import Service from "../../service";
import "./Notes.css";

const CARD_COLORS_LIGHT = ["#e0f7fa", "#e8f5e9", "#fff9c4", "#fce4ec", "#ede7f6", "#fff3e0", "#f3e5f5", "#e3f2fd"];
const CARD_COLORS_DARK  = [
  "#0d2137",  // deep ocean blue
  "#1e1040",  // deep indigo
  "#2d0f1a",  // dark rose wine
  "#0a2430",  // dark teal slate
  "#1a0a2e",  // royal night purple
  "#2a0d35",  // deep violet
  "#1f0a00",  // dark copper
  "#001a2e",  // midnight navy
  "#1a1200",  // dark amber
  "#2d0d2a",  // dark magenta
  "#0d1a2e",  // steel blue night
  "#2a1a00",  // dark bronze
];
const COLOR_PALETTE_LIGHT = [
  "#e0f7fa", "#e8f5e9", "#fff9c4", "#fce4ec",
  "#ede7f6", "#fff3e0", "#f3e5f5", "#e3f2fd",
  "#f0fdf4", "#fef9c3", "#fff1f2", "#f0f4ff",
];
const COLOR_PALETTE_DARK = [
  "#0d2137", "#1e1040", "#2d0f1a", "#0a2430",
  "#1a0a2e", "#2a0d35", "#1f0a00", "#001a2e",
  "#1a1200", "#2d0d2a", "#0d1a2e", "#2a1a00",
];

const isLightColor = (hex) => {
  if (!hex || !hex.startsWith("#")) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
};

const checkIsDark = () =>
  document.body.classList.contains("dark-theme") ||
  document.body.getAttribute("data-theme") === "dark";

export default function NotesPage() {
  const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
  const currentUserId = userData?._id;

  const [isDark, setIsDark] = useState(checkIsDark);

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(checkIsDark()));
    observer.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, []);

  const CARD_COLORS = isDark ? CARD_COLORS_DARK : CARD_COLORS_LIGHT;
  const COLOR_PALETTE = isDark ? COLOR_PALETTE_DARK : COLOR_PALETTE_LIGHT;

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("created");

  // Add Note modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [notebooksLoading, setNotebooksLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editNote, setEditNote] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Subscribers modal
  const [subOpen, setSubOpen] = useState(false);
  const [subNote, setSubNote] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subForm] = Form.useForm();

  // Color popover
  const [colorNoteId, setColorNoteId] = useState(null);

  const fetchNotes = useCallback(async (searchVal = "") => {
    setLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getNotes,
        body: { pageNo: 1, limit: 200, sort: "_id", sortBy: "desc", ...(searchVal ? { search: searchVal } : {}) },
      });
      const data = res?.data?.data;
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => {
    const t = setTimeout(() => fetchNotes(search), 400);
    return () => clearTimeout(t);
  }, [search, fetchNotes]);

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

  const openAddNote = async () => { setAddOpen(true); try { await loadProjects(); } catch (e) { console.error(e); } };

  const onProjectChange = async (pid) => {
    addForm.setFieldValue("noteBook_id", undefined);
    setNotebooks([]);
    if (!pid) return;
    setNotebooksLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getNotebook,
        body: { project_id: pid, pageNo: 1, limit: 200, sort: "_id", sortBy: "desc" },
      });
      const list = res?.data?.data?.data || res?.data?.data || [];
      setNotebooks(Array.isArray(list) ? list : []);
    } catch (e) { console.error(e); }
    finally { setNotebooksLoading(false); }
  };

  const handleAddNote = async () => {
    try {
      const values = await addForm.validateFields();
      setSubmitting(true);
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addNotes,
        body: { title: values.title, project_id: values.project_id, ...(values.noteBook_id ? { noteBook_id: values.noteBook_id } : {}), isPrivate: false, subscribers: [], pms_clients: [] },
      });
      if (res?.data?.status === 1 || res?.data?.success) {
        message.success("Note added successfully");
        addForm.resetFields(); setAddOpen(false); setNotebooks([]);
        fetchNotes(search);
      } else { message.error(res?.data?.message || "Failed to add note"); }
    } catch (e) { if (e?.errorFields) return; message.error("Something went wrong"); }
    finally { setSubmitting(false); }
  };

  // ── Edit ──────────────────────────────────────────────────
  const openEdit = (note) => {
    setEditNote(note);
    editForm.setFieldsValue({ title: note.title });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setEditSubmitting(true);
      const res = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateNotes}/${editNote._id}`,
        body: { title: values.title, project_id: editNote.project?._id || editNote.project_id, subscribers: (editNote.subscribers || []).map(s => s._id || s), pms_clients: editNote.pms_clients || [] },
      });
      if (res?.data?.status === 1 || res?.data?.success) {
        message.success("Note updated");
        setEditOpen(false); editForm.resetFields(); setEditNote(null);
        fetchNotes(search);
      } else { message.error(res?.data?.message || "Update failed"); }
    } catch (e) { if (e?.errorFields) return; message.error("Something went wrong"); }
    finally { setEditSubmitting(false); }
  };

  // ── Subscribers ───────────────────────────────────────────
  const openSubscribers = async (note) => {
    setSubNote(note);
    const currentSubs = (note.subscribers || []).map(s => s._id || s);
    subForm.setFieldsValue({ subscribers: currentSubs });
    setSubOpen(true);
    if (allUsers.length === 0) {
      try {
        const res = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getUsermaster,
          body: { pageNo: 1, limit: 500 },
        });
        const list = res?.data?.data?.data || res?.data?.data || [];
        setAllUsers(Array.isArray(list) ? list : []);
      } catch (e) { console.error(e); }
    }
  };

  const handleSubSave = async () => {
    try {
      const values = subForm.getFieldsValue();
      setSubSubmitting(true);
      const res = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateNotes}/${subNote._id}`,
        body: { title: subNote.title, project_id: subNote.project?._id || subNote.project_id, subscribers: values.subscribers || [], pms_clients: subNote.pms_clients || [] },
      });
      if (res?.data?.status === 1 || res?.data?.success) {
        message.success("Subscribers updated");
        setSubOpen(false); setSubNote(null);
        fetchNotes(search);
      } else { message.error(res?.data?.message || "Failed"); }
    } catch (e) { message.error("Something went wrong"); }
    finally { setSubSubmitting(false); }
  };

  // ── Color ─────────────────────────────────────────────────
  const handleColorChange = async (noteId, color) => {
    setColorNoteId(null);
    try {
      await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateNotes}/${noteId}`,
        body: { color },
      });
      setNotes(prev => prev.map(n => n._id === noteId ? { ...n, color } : n));
    } catch (e) { message.error("Color update failed"); }
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await Service.makeAPICall({ methodName: Service.deleteMethod, api_url: `${Service.deleteNotes}/${id}` });
      message.success("Note deleted");
      fetchNotes(search);
    } catch (e) { message.error("Delete failed"); }
  };

  const handleBookmarkToggle = async (noteId, isBookmark) => {
    try {
      const nextBookmarkState = !isBookmark;
      await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.notesBookmark}/${noteId}`,
        body: { isBookmark: nextBookmarkState },
      });
      setNotes((prev) =>
        prev.map((note) =>
          note._id === noteId ? { ...note, isBookmark: nextBookmarkState } : note
        )
      );
      window.dispatchEvent(
        new CustomEvent("weekmate:notes-bookmark-updated", {
          detail: { noteId, isBookmark: nextBookmarkState },
        })
      );
    } catch (e) {
      message.error("Pin update failed");
    }
  };

  const filteredNotes = notes.filter((note) => {
    const isCreator = note.createdBy === currentUserId || note.createdBy?._id === currentUserId || note.createdBy?.toString() === currentUserId;
    if (activeTab === "created") return isCreator;
    const isSubscriber = (note.subscribers || []).some(s => (s?._id || s?.toString()) === currentUserId);
    return !isCreator && isSubscriber;
  });

  const colorPickerContent = (noteId) => (
    <div className="color-picker-grid">
      {COLOR_PALETTE.map((c) => (
        <button
          key={c}
          className="color-swatch"
          style={{ background: c }}
          onClick={() => handleColorChange(noteId, c)}
        />
      ))}
    </div>
  );

  return (
    <div className="notes-page">
      {/* Header */}
      <div className="notes-page-header">
        <h2 className="notes-page-title">Notes</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddNote}>Add Note</Button>
      </div>

      {/* Tabs */}
      <div className="notes-page-tabs">
        <button className={`notes-tab-btn${activeTab === "created" ? " active" : ""}`} onClick={() => setActiveTab("created")}>
          <PushpinOutlined style={{ marginRight: 6 }} />Created
        </button>
        <button className={`notes-tab-btn${activeTab === "shared" ? " active" : ""}`} onClick={() => setActiveTab("shared")}>
          Shared
        </button>
      </div>

      {/* Search */}
      <div className="notes-page-search">
        <Input placeholder="Type here to Search" value={search} onChange={(e) => setSearch(e.target.value)} allowClear prefix={<span style={{ color: "#94a3b8" }}>🔍</span>} />
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="notes-cards-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="note-card note-card-skeleton">
              <div className="note-card-header">
                <Skeleton.Input active size="small" style={{ width: "60%", borderRadius: 6 }} />
              </div>
              <div style={{ marginTop: 10 }}>
                <Skeleton active paragraph={{ rows: 2, width: ["90%", "70%"] }} title={false} />
              </div>
              <div className="note-card-footer" style={{ marginTop: 8 }}>
                <Skeleton.Button active size="small" style={{ width: 24, borderRadius: 6 }} />
                <Skeleton.Button active size="small" style={{ width: 24, borderRadius: 6 }} />
                <Skeleton.Button active size="small" style={{ width: 24, borderRadius: 6 }} />
                <Skeleton.Button active size="small" style={{ width: 24, borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="notes-page-empty">
          <svg width="120" height="120" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="100" fill="#EFF6FF" />
            <rect x="55" y="50" width="90" height="110" rx="8" fill="#BFDBFE" />
            <rect x="65" y="70" width="70" height="8" rx="4" fill="#3B82F6" />
            <rect x="65" y="88" width="50" height="6" rx="3" fill="#93C5FD" />
            <rect x="65" y="102" width="60" height="6" rx="3" fill="#93C5FD" />
            <circle cx="145" cy="145" r="25" fill="#1D4ED8" />
            <rect x="133" y="143" width="24" height="4" rx="2" fill="white" />
            <rect x="143" y="133" width="4" height="24" rx="2" fill="white" />
          </svg>
          <p className="notes-empty-title">Add your first notes</p>
          <p className="notes-empty-sub">Relax write something beautiful</p>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddNote}>Add Note</Button>
        </div>
      ) : (
        <>
          <p className="notes-count-label">All</p>
          <div className="notes-cards-grid">
            {filteredNotes.map((note, idx) => {
              const bgColor = isDark
                ? CARD_COLORS[idx % CARD_COLORS.length]
                : (isLightColor(note.color) ? note.color : CARD_COLORS[idx % CARD_COLORS.length]);
              const content = note.notesInfo ? note.notesInfo.replace(/<[^>]*>/g, "").slice(0, 120) : "";
              return (
                <div key={note._id} className="note-card" style={{ background: bgColor }}>
                  <div className="note-card-header">
                    <span className="note-card-title">{note.title}</span>
                    <button
                      className={`note-card-pin-btn${note.isBookmark ? " active" : ""}`}
                      onClick={() => handleBookmarkToggle(note._id, note.isBookmark)}
                      type="button"
                      aria-label={note.isBookmark ? "Unpin note" : "Pin note"}
                    >
                      <PushpinOutlined style={{ fontSize: 14 }} />
                      {note.isBookmark && <span className="note-card-pin-cross" aria-hidden="true" />}
                    </button>
                  </div>
                  <div className="note-card-content">
                    {content || <span style={{ color: "#94a3b8", fontSize: 12 }}>No content</span>}
                  </div>
                  <div className="note-card-footer">
                    <Tooltip title="Subscribers">
                      <button className="note-card-action" onClick={() => openSubscribers(note)}>
                        <UserAddOutlined />
                      </button>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <button className="note-card-action" onClick={() => openEdit(note)}>
                        <EditOutlined />
                      </button>
                    </Tooltip>
                    <Popover
                      content={colorPickerContent(note._id)}
                      title="Pick a color"
                      trigger="click"
                      open={colorNoteId === note._id}
                      onOpenChange={(v) => setColorNoteId(v ? note._id : null)}
                    >
                      <Tooltip title="Change color">
                        <button className="note-card-action">
                          <BgColorsOutlined />
                        </button>
                      </Tooltip>
                    </Popover>
                    <Popconfirm title="Delete this note?" onConfirm={() => handleDelete(note._id)} okText="Yes" cancelText="No">
                      <Tooltip title="Delete">
                        <button className="note-card-action delete"><DeleteOutlined /></button>
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Note Modal */}
      <Modal title="Add New Note" open={addOpen} onCancel={() => { setAddOpen(false); addForm.resetFields(); setNotebooks([]); }} onOk={handleAddNote} confirmLoading={submitting} okText="Save" destroyOnClose className="global-app-modal" width={640}>
        <Form form={addForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title required" }]}>
            <Input placeholder="Enter note title" />
          </Form.Item>
          <Form.Item name="project_id" label="Project" rules={[{ required: true, message: "Select a project" }]}>
            <Select showSearch placeholder="Select project" onChange={onProjectChange}
              filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
              options={projects.map((p) => ({ value: p._id, label: p.title }))} />
          </Form.Item>
          <Form.Item name="noteBook_id" label="Notebook (optional)">
            <Select showSearch placeholder="Select notebook" loading={notebooksLoading} allowClear
              options={notebooks.map((nb) => ({ value: nb._id, label: nb.title }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal title="Edit Note" open={editOpen} onCancel={() => { setEditOpen(false); editForm.resetFields(); setEditNote(null); }} onOk={handleEdit} confirmLoading={editSubmitting} okText="Save" destroyOnClose className="global-app-modal" width={640}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title required" }]}>
            <Input placeholder="Enter note title" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Subscribers Modal */}
      <Modal title="Manage Subscribers" open={subOpen} onCancel={() => { setSubOpen(false); setSubNote(null); }} onOk={handleSubSave} confirmLoading={subSubmitting} okText="Save" destroyOnClose className="global-app-modal" width={640}>
        <Form form={subForm} layout="vertical">
          <Form.Item name="subscribers" label="Subscribers">
            <Select
              mode="multiple"
              showSearch
              placeholder="Select subscribers"
              optionFilterProp="label"
              filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
              options={allUsers.map((u) => ({ value: u._id, label: u.full_name || u.name || u.email }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
