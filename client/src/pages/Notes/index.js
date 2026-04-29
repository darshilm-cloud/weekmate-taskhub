import React, { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { Button, Modal, Form, Select, message, Skeleton, Popconfirm, Tooltip, Popover, Input, Spin, Row, Col, Card } from "antd";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import InfiniteScroll from "react-infinite-scroll-component";
import GlobalSearchInput from "../../components/common/GlobalSearchInput";
import "../../components/CkEditorSuperBuild/ckEditor.css";
import {
  PlusOutlined,
  PushpinOutlined,
  DeleteOutlined,
  EditOutlined,
  UserAddOutlined,
  BgColorsOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import Service from "../../service";
import "./Notes.css";

const NOTES_CKEDITOR_CONFIG = {
  toolbar: [
    "heading",
    "|",
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
  fontSize: {
    options: ["default", 10, 11, 12, 13, 14, 15, 16, 18, 20],
  },
};

/** Ant Design Form.Item compatible wrapper (value / onChange = HTML string). */
function NotesFormCkEditor({ value, onChange }) {
  const html = value ?? "";
  return (
    <div className="notes-modal-ckeditor-wrap">
      <CKEditor
        editor={Custombuild}
        data={html}
        config={NOTES_CKEDITOR_CONFIG}
        onChange={(event, editor) => {
          onChange?.(editor.getData());
        }}
      />
    </div>
  );
}

const CARD_COLORS_LIGHT = ["#e0f7fa", "#e8f5e9", "#fff9c4", "#fce4ec", "#ede7f6", "#fff3e0", "#f3e5f5", "#e3f2fd"];
const CARD_COLORS_DARK = [
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

const MODAL_OK_BUTTON_PROPS = {
  className: "add-btn",
  type: "primary",
};

const NOTES_PAGE_SIZE = 25;

export default function NotesPage() {
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [totalNotes, setTotalNotes] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const latestFetchIdRef = useRef(0);

  // Add / Edit note (single modal, same form)
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalMode, setNoteModalMode] = useState("add");
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [notebooksLoading, setNotebooksLoading] = useState(false);
  const [noteModalSubmitting, setNoteModalSubmitting] = useState(false);

  // View note (read-only)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewNote, setViewNote] = useState(null);

  // Subscribers modal
  const [subOpen, setSubOpen] = useState(false);
  const [subNote, setSubNote] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subForm] = Form.useForm();

  // Color popover
  const [colorNoteId, setColorNoteId] = useState(null);

  const fetchNotesPage = useCallback(
    async ({ page, append = false, searchVal = "", silent = false }) => {
      const fetchId = ++latestFetchIdRef.current;
      if (append) {
        setLoadingMore(true);
      } else if (!silent) {
        setLoading(true);
      }
      try {
        const res = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getNotes,
          body: {
            pageNo: page,
            limit: NOTES_PAGE_SIZE,
            sort: "_id",
            sortBy: "desc",
            tab: activeTab,
            ...(searchVal ? { search: searchVal } : {}),
          },
        });

        const data = res?.data?.data;
        const meta = res?.data?.metadata;
        const total = meta?.total ?? meta?.totalCount ?? 0;
        const list = (Array.isArray(data) ? data : []).filter(
          (n) => n?.project?.project_status?.title?.toLowerCase() !== "archived"
        );

        if (fetchId !== latestFetchIdRef.current) return;

        let nextList = [];
        flushSync(() => {
          setNotes((prev) => {
            nextList = append ? [...prev, ...list] : list;
            return nextList;
          });
        });
        const nextLoaded = nextList.length;
        let more =
          total > 0 ? nextLoaded < total : list.length >= NOTES_PAGE_SIZE;
        if (append && list.length === 0) {
          more = false;
        }
        setHasMore(more);
        setTotalNotes(total);
        setCurrentPage(page);
      } catch (e) {
        console.error(e);
      } finally {
        if (fetchId === latestFetchIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [activeTab]
  );

  useEffect(() => {
    const debounceMs = search.trim() ? 400 : 0;
    const t = setTimeout(() => {
      setCurrentPage(1);
      setHasMore(false);
      fetchNotesPage({ page: 1, append: false, searchVal: search.trim(), silent: false });
    }, debounceMs);
    return () => clearTimeout(t);
  }, [search, activeTab, fetchNotesPage]);

  const loadMoreNotes = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchNotesPage({
      page: currentPage + 1,
      append: true,
      searchVal: search.trim(),
    });
  }, [loading, loadingMore, hasMore, currentPage, search, fetchNotesPage]);

  const refreshNotes = useCallback(() => {
    fetchNotesPage({ page: 1, append: false, searchVal: search.trim(), silent: true });
  }, [fetchNotesPage, search]);

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

  const loadAllUsers = useCallback(async () => {
    if (allUsers.length > 0) return;
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsermaster,
        body: { pageNo: 1, limit: 500 },
      });
      const list = res?.data?.data?.data || res?.data?.data || [];
      setAllUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("loadAllUsers error", e);
    }
  }, [allUsers.length]);

  const loadNotebooksForProject = async (pid) => {
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
    } catch (e) {
      console.error(e);
    } finally {
      setNotebooksLoading(false);
    }
  };

  const openAddNote = async () => {
    setNoteModalMode("add");
    setEditingNote(null);
    noteForm.resetFields();
    setNotebooks([]);
    setNoteModalOpen(true);
    try {
      await Promise.all([loadProjects(), loadAllUsers()]);
    } catch (e) {
      console.error(e);
    }
  };

  const openNoteEdit = async (note) => {
    setNoteModalMode("edit");
    setEditingNote(note);
    setNotebooks([]);
    try {
      await Promise.all([loadProjects(), loadAllUsers()]);
      const pid = note.project?._id || note.project_id;
      // const nbId = note.noteBook_id || note.notebook?._id || note.notebook;
      noteForm.setFieldsValue({
        title: note.title,
        notesInfo: note.notesInfo || "",
        project_id: pid,
        // noteBook_id: nbId,
        subscribers: (note.subscribers || []).map((s) => s._id || s),
      });
      if (pid) await loadNotebooksForProject(pid);
      setNoteModalOpen(true);
    } catch (e) {
      console.error(e);
      message.error("Could not open note for editing");
    }
  };

  const onProjectChange = async (pid) => {
    noteForm.setFieldValue("noteBook_id", undefined);
    await loadNotebooksForProject(pid);
  };

  const closeNoteModal = () => {
    setNoteModalOpen(false);
    noteForm.resetFields();
    setEditingNote(null);
    setNotebooks([]);
  };

  const handleSaveNote = async () => {
    try {
      const values = await noteForm.validateFields();
      setNoteModalSubmitting(true);
      const subscribers = Array.isArray(values.subscribers) ? values.subscribers : [];
      if (noteModalMode === "add") {
        const res = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.addNotes,
          body: {
            title: values.title,
            notesInfo: values.notesInfo || "",
            project_id: values.project_id,
            ...(values.noteBook_id ? { noteBook_id: values.noteBook_id } : {}),
            isPrivate: false,
            subscribers,
            pms_clients: [],
          },
        });
        if (res?.data?.status === 1 || res?.data?.success) {
          message.success("Note added successfully");
          closeNoteModal();
          refreshNotes();
        } else {
          message.error(res?.data?.message || "Failed to add note");
        }
      } else if (editingNote?._id) {
        const res = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: `${Service.updateNotes}/${editingNote._id}`,
          body: {
            title: values.title,
            notesInfo: values.notesInfo || "",
            subscribers,
            pms_clients: editingNote.pms_clients || [],
            // notebook_id: values.noteBook_id || null,
          },
        });
        if (res?.data?.status === 1 || res?.data?.success) {
          message.success("Note updated");
          closeNoteModal();
          refreshNotes();
        } else {
          message.error(res?.data?.message || "Update failed");
        }
      }
    } catch (e) {
      if (e?.errorFields) return;
      message.error("Something went wrong");
    } finally {
      setNoteModalSubmitting(false);
    }
  };

  const openViewNote = (note) => {
    setViewNote(note);
    setViewOpen(true);
  };

  const closeViewNote = () => {
    setViewOpen(false);
    setViewNote(null);
  };

  const goFromViewToEdit = async () => {
    if (!viewNote) return;
    const n = viewNote;
    closeViewNote();
    await openNoteEdit(n);
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
        refreshNotes();
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
      refreshNotes();
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

  const getModalTitle = (title, subtitle) => (
    <div className="notes-modal-title-wrap">
      <div>
        <div className="notes-modal-title">{title}</div>
        <p className="notes-modal-subtitle">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="notes-page">
      {/* Header */}
      <div className="notes-page-header">
        <h2 className="notes-page-title">Notes</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddNote} className="add-btn">Add Note</Button>
      </div>

      {/* Tabs */}
      <div className="notes-page-tabs">
        <button className={`notes-tab-btn${activeTab === "all" ? " active" : ""}`} type="button" onClick={() => setActiveTab("all")}>
          All
        </button>
        <button className={`notes-tab-btn${activeTab === "created" ? " active" : ""}`} type="button" onClick={() => setActiveTab("created")}>
          Created
        </button>
        {/* <button className={`notes-tab-btn${activeTab === "shared" ? " active" : ""}`} type="button" onClick={() => setActiveTab("shared")}>
          Shared
        </button> */}
      </div>

      {/* Search */}
      <div className="notes-page-search">
        <GlobalSearchInput
          placeholder="Search..."
          value={search}
          onChange={(val) => setSearch(val)}
          allowClear
          className="notes-search-input"
        />
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="notes-cards-grid">
          {Array.from({ length: 10 }).map((_, i) => (
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
      ) : notes.length === 0 ? (
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddNote} className="add-btn">Add Note</Button>
        </div>
      ) : (
        <Card className="main-content-wrapper">
          <div className="global-search">

          <p className="notes-count-label">
            {totalNotes} note{totalNotes === 1 ? "" : "s"}
          </p>
          </div>
          <div id="notes-infinite-scroll" className="notes-infinite-scroll-wrap">
            <InfiniteScroll
              key={activeTab}
              scrollableTarget="notes-infinite-scroll"
              dataLength={notes.length}
              next={loadMoreNotes}
              hasMore={hasMore && !loading}
              loader={
                loadingMore ? (
                  <div className="notes-infinite-loader">
                    <Spin size="small" tip="Loading more..." />
                  </div>
                ) : null
              }
              scrollThreshold="8px"
            >
              <div className="notes-cards-grid">
                {notes.map((note, idx) => {
                  const bgColor = isDark
                    ? CARD_COLORS[idx % CARD_COLORS.length]
                    : (isLightColor(note.color) ? note.color : CARD_COLORS[idx % CARD_COLORS.length]);
                  const content = note.notesInfo ? note.notesInfo.replace(/<[^>]*>/g, "").slice(0, 120) : "";
                  return (
                    <div key={note._id} className="note-card" style={{ background: bgColor }}>
                      <div
                        className="note-card-body"
                        role="button"
                        tabIndex={0}
                        onClick={() => openViewNote(note)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openViewNote(note);
                          }
                        }}
                      >
                        <div className="note-card-header">
                          <span className="note-card-title">{note.title}</span>
                          <button
                            className={`note-card-pin-btn${note.isBookmark ? " active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookmarkToggle(note._id, note.isBookmark);
                            }}
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
                      </div>
                      <div className="note-card-footer" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Subscribers">
                          <button type="button" className="note-card-action" onClick={() => openSubscribers(note)}>
                            <UserAddOutlined />
                          </button>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <button type="button" className="note-card-action" onClick={() => openNoteEdit(note)}>
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
                            <button type="button" className="note-card-action">
                              <BgColorsOutlined />
                            </button>
                          </Tooltip>
                        </Popover>
                        <Popconfirm title="Delete this note?" onConfirm={() => handleDelete(note._id)} okText="Yes" cancelText="No">
                          <Tooltip title="Delete">
                            <button type="button" className="note-card-action delete"><DeleteOutlined /></button>
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>
                  );
                })}
              </div>
            </InfiniteScroll>
          </div>
        </Card>
      )}

      {/* Add / Edit note (same modal & fields) */}
      <Modal
        title={getModalTitle(
          noteModalMode === "edit" ? "Edit Note" : "Add New Note"
        )}
        open={noteModalOpen}
        onCancel={closeNoteModal}
        cancelButtonProps={{ className: "delete-btn" }}
        onOk={handleSaveNote}
        confirmLoading={noteModalSubmitting}
        okText="Save"
        okButtonProps={{className: "add-btn", type: "primary"}}
        destroyOnClose
        className="global-app-modal notes-modal-shell"
        width="100%"
        style={{ maxWidth: 640 }}
      >
        <Form form={noteForm} layout="vertical" className="notes-modal-form">
          <Row gutter={[24, 0]}>

            {/* Title */}
            <Col xs={24}>
              <Form.Item
                name="title"
                label="Title"
                rules={[{ required: true, message: "Title required" }]}
              >
                <Input placeholder="Enter note title" />
              </Form.Item>
            </Col>

            {/* Content */}
            <Col xs={24}>
              <Form.Item name="notesInfo" label="Content" initialValue="">
                <NotesFormCkEditor
                  key={
                    noteModalMode === "edit"
                      ? editingNote?._id || "edit"
                      : "add"
                  }
                />
              </Form.Item>
            </Col>

            {/* Project */}
            <Col xs={24} sm={12}>
              <Form.Item
                name="project_id"
                label="Project"
                rules={[{ required: true, message: "Select a project" }]}
              >
                <Select
                  showSearch
                  placeholder="Select project"
                  disabled={noteModalMode === "edit"}
                  onChange={onProjectChange}
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={projects.map((p) => ({
                    value: p._id,
                    label: p.title,
                  }))}
                />
              </Form.Item>
            </Col>

            {/* Subscribers */}
            <Col xs={24} sm={12}>
              <Form.Item name="subscribers" label="Subscribers">
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  placeholder="Select subscribers"
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={allUsers.map((u) => ({
                    value: u._id,
                    label: u.full_name || u.name || u.email,
                  }))}
                />
              </Form.Item>
            </Col>

          </Row>
        </Form>
      </Modal>

      {/* View note (read-only) */}
      <Modal
        title={getModalTitle(
          viewNote?.title || "Note",
        )}
        open={viewOpen}
        onCancel={closeViewNote}
        footer={[
          <Button key="close" onClick={closeViewNote}>
            Close
          </Button>,
        ]}
        destroyOnClose
        className="global-app-modal notes-modal-shell notes-view-modal"
        width={720}
      >
        {viewNote ? (
          <div className="notes-view-modal-body">
            <div className="notes-view-meta">
              <div className="notes-view-meta-row">
                <span className="notes-view-meta-label">Project</span>
                <span className="notes-view-meta-value">{viewNote.project?.title || "—"}</span>
              </div>
              {/* <div className="notes-view-meta-row">
                <span className="notes-view-meta-label">Notebook</span>
                <span className="notes-view-meta-value">{viewNote.notebook?.title || "—"}</span>
              </div> */}
              <div className="notes-view-meta-row">
                <span className="notes-view-meta-label">Subscribers</span>
                <span className="notes-view-meta-value">
                  {Array.isArray(viewNote.subscribers) && viewNote.subscribers.length > 0
                    ? viewNote.subscribers
                      .map((s) => s.full_name || s.name || s.email || "")
                      .filter(Boolean)
                      .join(", ")
                    : "—"}
                </span>
              </div>
            </div>
            <div className="notes-view-section-label">Content</div>
            <div
              className="notes-view-html"
              dangerouslySetInnerHTML={{
                __html: viewNote.notesInfo?.trim()
                  ? viewNote.notesInfo
                  : '<p class="notes-view-empty">No content</p>',
              }}
            />
          </div>
        ) : null}
      </Modal>

      {/* Subscribers Modal */}
      <Modal
        title={getModalTitle(
          "Manage Subscribers",
          "Choose who should be able to access this note."
        )}
        open={subOpen}
        onCancel={() => {
          setSubOpen(false);
          setSubNote(null);
        }}
        cancelButtonProps={{ className: "delete-btn" }}
        onOk={handleSubSave}
        confirmLoading={subSubmitting}
        okText="Save"

        okButtonProps={MODAL_OK_BUTTON_PROPS}
        destroyOnClose
        className="global-app-modal notes-modal-shell"
        width="100%"
        style={{ maxWidth: 640 }}
      >
        <Form form={subForm} layout="vertical" className="notes-modal-form">

          <Row gutter={[16, 16]}>

            <Col xs={24}>
              <Form.Item name="subscribers" label="Subscribers">
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="Select subscribers"
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={allUsers.map((u) => ({
                    value: u._id,
                    label: u.full_name || u.name || u.email,
                  }))}
                />
              </Form.Item>
            </Col>

          </Row>

        </Form>
      </Modal>
    </div>
  );
}
