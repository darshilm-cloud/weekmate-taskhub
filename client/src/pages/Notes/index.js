import React, { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useLocation, useHistory } from "react-router-dom";
import { Button, DatePicker, Modal, Form, Select, message, Skeleton, Popconfirm, Tooltip, Popover, Input, Spin, Row, Col, Card } from "antd";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import InfiniteScroll from "react-infinite-scroll-component";
import GlobalSearchInput from "../../components/common/GlobalSearchInput";
import "../../components/CkEditorSuperBuild/ckEditor.css";
import {
  PlusOutlined,
  PushpinOutlined,
  UserAddOutlined,
  BgColorsOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import Service from "../../service";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import "./Notes.css";
import NotesPageFilter, { EMPTY_NOTE_FILTERS, countNoteFilters } from "./NotesPageFilter";
import { EditActionIcon, DeleteActionIcon } from "../../components/common/ActionIcons";
import { can } from "../../util/hasPermission";
import { displayNoteAccent } from "./noteAccent";
import { htmlToText } from "../../util/csvExport";

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

// Accent-bar colors for notes (applied as a thin bottom stripe on a white
// card, matching the blue/white stat-card pattern used elsewhere in the app -
// e.g. ProjectExpense's .pe-stat-card and EmployeeList's .ud-stat-card).
const DEFAULT_NOTE_ACCENT = "#2563eb";
const NOTE_ACCENT_PALETTE = [
  "#2563eb", // primary blue
  "#0ea5e9", // sky
  "#0b3a5b", // navy
  "#16a34a", // green
  "#f59e0b", // amber
  "#dc2626", // red
  "#64748b", // slate
];

const isValidHexColor = (hex) => typeof hex === "string" && /^#([0-9a-fA-F]{3}){1,2}$/.test(hex);

const MODAL_OK_BUTTON_PROPS = {
  className: "add-btn",
  type: "primary",
};

const NOTES_PAGE_SIZE = 25;

export default function NotesPage() {
  const location = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(location.search);
  const urlTab = searchParams.get("tab");

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(() => urlTab && ["all", "created", "pinned"].includes(urlTab) ? urlTab : "all");
  const [filters, setFilters] = useState(EMPTY_NOTE_FILTERS);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const latestFetchIdRef = useRef(0);

  const handleSetActiveTab = useCallback((tab) => {
    setActiveTab(tab);
    const currentSearch = window.location.search;
    const newParams = new URLSearchParams(currentSearch);
    newParams.set("tab", tab);
    history.push(`${window.location.pathname}?${newParams.toString()}`);
  }, [history]);

  // Add / Edit note (single modal, same form)
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalMode, setNoteModalMode] = useState("add");
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm] = Form.useForm();
  const noteProjectId = Form.useWatch("project_id", noteForm);
  const [projects, setProjects] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [notebooksLoading, setNotebooksLoading] = useState(false);
  const [noteModalSubmitting, setNoteModalSubmitting] = useState(false);
  // Subscriber choices for the add/edit and manage-subscribers modals: the selected project's members
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectMembersLoading, setProjectMembersLoading] = useState(false);

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
  // Which note's delete confirmation is open. Its "Delete" tooltip is hidden meanwhile
  // (on a phone the tooltip stayed up after the tap and covered the Yes / No buttons).
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  // Touch screens have no hover: tooltips would only ever get stuck open after a tap.
  const isTouchDevice =
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none)").matches;
  const tipOpen = (hidden = false) => (isTouchDevice || hidden ? { open: false } : {});

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
            ...(filters.projects?.length ? { projects: filters.projects } : {}),
            ...(filters.created_by?.length ? { created_by: filters.created_by } : {}),
            ...(filters.subscribers?.length ? { subscribers: filters.subscribers } : {}),
            ...(filters.colors?.length ? { colors: filters.colors } : {}),
            ...(filters.range?.[0] ? { start_date: filters.range[0].startOf("day").toISOString() } : {}),
            ...(filters.range?.[1] ? { end_date: filters.range[1].endOf("day").toISOString() } : {}),
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
    [activeTab, filters]
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

  const filterCount = countNoteFilters(filters);
  const hasActiveQuery = filterCount > 0 || search.trim().length > 0;

  // Filter option lists are only fetched the first time the filter panel opens.
  const handleOpenFilter = () => {
    if (projects.length === 0) loadProjects();
    loadAllUsers();
  };

  // The same project list the Tasks page filter uses: every project you can access whatever its status
  // (the older master list only returned projects whose status is literally "Active").
  const loadProjects = async () => {
    try {
      const PAGE = 100;
      let all = [];
      for (let pageNo = 1; pageNo <= 50; pageNo += 1) {
        const res = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.myProjects,
          body: { pageNo, limit: PAGE, search: "" },
        });
        const batch = Array.isArray(res?.data?.data) ? res.data.data : [];
        all = all.concat(batch);
        if (batch.length < PAGE) break;
      }
      setProjects(all);
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

  // Manager + active assignees of the project, the same list the in-project Notes tab offers
  const loadProjectMembers = async (pid) => {
    setProjectMembers([]);
    if (!pid) return;
    setProjectMembersLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getMasterSubscribers}/${pid}`,
      });
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setProjectMembers(list);
    } catch (e) {
      console.error("loadProjectMembers error", e);
    } finally {
      setProjectMembersLoading(false);
    }
  };

  // Keeps already-saved subscribers selectable (and labelled) even if they have since left the project
  const subscriberOptions = (savedSubscribers = []) => {
    const seen = new Set();
    return [...projectMembers, ...savedSubscribers.filter((s) => s && typeof s === "object")]
      .filter((u) => u._id && !seen.has(u._id) && seen.add(u._id))
      .map((u) => ({ value: u._id, label: u.full_name || u.name || u.email }));
  };

  const openAddNote = async () => {
    setNoteModalMode("add");
    setEditingNote(null);
    noteForm.resetFields();
    setNotebooks([]);
    setProjectMembers([]);
    setNoteModalOpen(true);
    try {
      await loadProjects();
    } catch (e) {
      console.error(e);
    }
  };

  const openNoteEdit = async (note) => {
    setNoteModalMode("edit");
    setEditingNote(note);
    setNotebooks([]);
    try {
      const pid = note.project?._id || note.project_id;
      await Promise.all([loadProjects(), loadProjectMembers(pid)]);
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
    noteForm.setFieldsValue({ noteBook_id: undefined, subscribers: [] });
    await Promise.all([loadNotebooksForProject(pid), loadProjectMembers(pid)]);
  };

  const closeNoteModal = () => {
    setNoteModalOpen(false);
    noteForm.resetFields();
    setEditingNote(null);
    setNotebooks([]);
    setProjectMembers([]);
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
    await loadProjectMembers(note.project?._id || note.project_id);
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
      {NOTE_ACCENT_PALETTE.map((c) => (
        <button
          key={c}
          className="color-swatch"
          style={{ background: displayNoteAccent(c) }}
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
      <div className="inout-header text-left">
        <h2>Notes</h2>
        <div className="header-btns">
          {can("notes_add") && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddNote} className="add-btn">Note</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="notes-page-tabs">
        <button className={`notes-tab-btn${activeTab === "all" ? " active" : ""}`} type="button" onClick={() => handleSetActiveTab("all")}>
          All
        </button>
        <button className={`notes-tab-btn${activeTab === "created" ? " active" : ""}`} type="button" onClick={() => handleSetActiveTab("created")}>
          Created
        </button>
        <button className={`notes-tab-btn${activeTab === "pinned" ? " active" : ""}`} type="button" onClick={() => handleSetActiveTab("pinned")}>
          Pinned
        </button>
        {/* <button className={`notes-tab-btn${activeTab === "shared" ? " active" : ""}`} type="button" onClick={() => handleSetActiveTab("shared")}>
          Shared
        </button> */}
      </div>

      <Card className="main-content-wrapper notes-list-card">
        {/* Toolbar band: search + filter live inside the card (HRMS list layout) */}
        <div className="global-search notes-toolbar">
          <GlobalSearchInput
            placeholder="Search..."
            value={search}
            onChange={(val) => setSearch(val)}
            allowClear
            className="notes-search-input"
          />
          <div className="notes-toolbar-actions">
            <NotesPageFilter
              value={filters}
              onApply={setFilters}
              projects={projects}
              users={allUsers}
              extraColors={notes.map((n) => n.color)}
              onOpen={handleOpenFilter}
            />
          </div>
        </div>

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
          <NoDataFoundIcon />
        </div>
      ) : (
        <>
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
                {notes.map((note) => {
                  const accentColor = displayNoteAccent(isValidHexColor(note.color) ? note.color : DEFAULT_NOTE_ACCENT);
                  const content = htmlToText(note.notesInfo).slice(0, 120);
                  return (
                    <div key={note._id} className="note-card" style={{ "--note-accent": accentColor }}>
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
                        {can("notes_edit") && (
                        <>
                        <Tooltip title="Subscribers" {...tipOpen()}>
                          <button type="button" className="note-card-action" onClick={() => openSubscribers(note)}>
                            <UserAddOutlined />
                          </button>
                        </Tooltip>
                        <Tooltip title="Edit" {...tipOpen()}>
                          <button type="button" className="note-card-action" onClick={() => openNoteEdit(note)}>
                            <EditActionIcon />
                          </button>
                        </Tooltip>
                        <Popover
                          content={colorPickerContent(note._id)}
                          title="Pick a color"
                          trigger="click"
                          open={colorNoteId === note._id}
                          onOpenChange={(v) => setColorNoteId(v ? note._id : null)}
                        >
                          <Tooltip title="Change color" {...tipOpen()}>
                            <button type="button" className="note-card-action">
                              <BgColorsOutlined />
                            </button>
                          </Tooltip>
                        </Popover>
                        </>
                        )}
                        {can("notes_delete") && (
                        <Popconfirm
                          title="Delete this note?"
                          onConfirm={() => handleDelete(note._id)}
                          okText="Yes"
                          cancelText="No"
                          open={deleteConfirmId === note._id}
                          onOpenChange={(v) => setDeleteConfirmId(v ? note._id : null)}
                        >
                          <Tooltip title="Delete" {...tipOpen(deleteConfirmId === note._id)}>
                            <button type="button" className="note-card-action delete"><DeleteActionIcon /></button>
                          </Tooltip>
                        </Popconfirm>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </InfiniteScroll>
          </div>
        </>
      )}
      </Card>

      {/* Add / Edit note (same modal & fields) */}
      <Modal
        title={getModalTitle(
          noteModalMode === "edit" ? "Edit Note" : "Add New Note"
        )}
        open={noteModalOpen}
        onCancel={closeNoteModal}
        cancelButtonProps={{ className: "cancel-btn" }}
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
                  className="notes-modal-select"
                  showSearch
                  placeholder="Select project"
                  disabled={noteModalMode === "edit"}
                  onChange={onProjectChange}
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  // my-project leaves out e.g. archived projects; keep the edited note's own project
                  // in the list so the locked field shows its name rather than the raw id
                  options={[
                    ...projects,
                    ...(editingNote?.project?._id &&
                    !projects.some((p) => p._id === editingNote.project._id)
                      ? [editingNote.project]
                      : []),
                  ].map((p) => ({
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
                  className="notes-modal-select"
                  mode="multiple"
                  showSearch
                  allowClear
                  placeholder={noteProjectId ? "Select subscribers" : "Select a project first"}
                  disabled={!noteProjectId}
                  loading={projectMembersLoading}
                  notFoundContent={projectMembersLoading ? "Loading..." : "No members in this project"}
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={subscriberOptions(editingNote?.subscribers)}
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
                <span className="notes-view-meta-value">{viewNote.project?.title || "-"}</span>
              </div>
              {/* <div className="notes-view-meta-row">
                <span className="notes-view-meta-label">Notebook</span>
                <span className="notes-view-meta-value">{viewNote.notebook?.title || "-"}</span>
              </div> */}
              <div className="notes-view-meta-row">
                <span className="notes-view-meta-label">Subscribers</span>
                <span className="notes-view-meta-value">
                  {Array.isArray(viewNote.subscribers) && viewNote.subscribers.length > 0
                    ? viewNote.subscribers
                      .map((s) => s.full_name || s.name || s.email || "")
                      .filter(Boolean)
                      .join(", ")
                    : "-"}
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
        cancelButtonProps={{ className: "cancel-btn" }}
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
                  loading={projectMembersLoading}
                  notFoundContent={projectMembersLoading ? "Loading..." : "No members in this project"}
                  options={subscriberOptions(subNote?.subscribers)}
                />
              </Form.Item>
            </Col>

          </Row>

        </Form>
      </Modal>
    </div>
  );
}
