/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, eqeqeq, jsx-a11y/anchor-is-valid, no-useless-concat */
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Avatar,
  Checkbox,
  Modal,
  DatePicker,
  Input,
  Popover,
  Form,
  Select,
  Dropdown,
  Badge,
  Tooltip,
  ConfigProvider,
  Menu,
  Col,
  Row,
  message,
} from "antd";
import {
  CalendarOutlined,
  PlusOutlined,
  RightOutlined,
  ArrowRightOutlined,
  CloseCircleOutlined,
  CommentOutlined,
  PaperClipOutlined,
  HistoryOutlined,
  EditOutlined,
  SaveOutlined,
  UserOutlined,
  TagsOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  AudioOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

import Service from "../../service";
import "./style.css";
import "./BugDetailModal.css";
import dayjs from "dayjs";
import { useParams } from "react-router-dom";
import {
  getSubscribersList,
  getSpecificProjectWorkflowStage,
} from "../../appRedux/reducers/ApiData";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import BugList from "./BugsKanbanBoard";
import BugsController from "./BugsController";
import { hasPermission } from "../../util/hasPermission";
import ReactHTMLTableToExcel from "react-html-table-to-excel";
import MultiSelect from "../../components/CustomSelect/MultiSelect";
import { removeTitle } from "../../util/nameFilter";
import BugsTable from "./BugsTableView/BugsTable";
import BugsGanttView from "./BugsGanttView";
import MyAvatar from "../../components/Avatar/MyAvatar";
import BugFilter from "./BugFilter";
import { BugsSkeleton, BugsKanbanSkeleton } from "../../components/common/SkeletonLoader";

const parseBugUiDate = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value.isValid() ? value : null;
  if (value instanceof Date) {
    const parsedFromDate = dayjs(value);
    return parsedFromDate.isValid() ? parsedFromDate : null;
  }
  const raw = String(value).trim();
  const ddmmyyyyMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, dd, mm, yyyy] = ddmmyyyyMatch;
    const parsed = dayjs(`${yyyy}-${mm}-${dd}`);
    if (parsed.isValid()) return parsed;
  }
  const fallbackParsed = dayjs(raw);
  return fallbackParsed.isValid() ? fallbackParsed : null;
};

const BugsPMS = () => {
  const { projectId } = useParams();
  const [projectOverview, setProjectOverview] = useState(null);
  const [isAddStageModalOpen, setIsAddStageModalOpen] = useState(false);
  const [addStageSubmitting, setAddStageSubmitting] = useState(false);
  const [addStageForm] = Form.useForm();
  const [bugStageOrder, setBugStageOrder] = useState([]);
  const DEFAULT_BUG_STAGE_TITLES = ["open", "in progress", "to be tested", "on hold", "closed"];
  const {
    Search,
    searchRef,
    onSearchTask,
    filterStatus,
    handleFilterStatus,
    filterStatusSearchInput,
    setFilterStatusSearchInput,
    boardTasksBugs,
    setOpenStatus,
    openStatus,
    handleOpenChangeStatus,
    getStatusTitleById,
    filterAssigned,
    handleSelectionAssignedFilter,
    filterAssignedSearchInput,
    setFilterAssignedSearchInput,
    handleAllFilter,
    setOpenAssignees,
    openAssignees,
    handleOpenChangeAssignees,
    setIsPopoverVisibleView,
    isPopoverVisibleView,
    handleStartChange,
    DateOption,
    selectValStartdate,
    handleStartDateRange,
    handleDueChange,
    selectValDuedate,
    handleDueDateRange,
    handleStartDueFilter,
    filterStartDate,
    filterDueDate,
    setSelectValDuedate,
    filterOnLabels,
    handleSelectionlabelFilter,
    filterLabelsSearchInput,
    setFilterLabelsSearchInput,
    projectLabels,
    handleChangeLabels,
    filterTasks,
    filterSchema,
    showEditTaskModal,
    showModalTaskModal,
    getBoardTasks,
    selectedTask,
    deleteTasks,
    isModalOpenImport,
    handleImportClose,
    Dragger,
    props,
    workflowMenu,
    isModalOpenList,
    handleCancelList,
    handleOkList,
    modalMode,
    listForm,
    addProjectMainTask,
    editProjectmainTask,
    addform,
    handleTaskOps,
    addInputTaskData,
    handleTaskInput,
    taskList,
    Option,
    subscribersList,
    estHrs,
    handleEstTimeInput,
    estMins,
    fileAttachment,
    removeAttachmentFile,
    foldersList,
    attachmentfileRef,
    onFileChange,
    editform,
    setOpenLabels,
    openLabels,
    getWorkflow,
    workflow,
    handlerAssignes,
    projectWorkflowStage,
    isModalOpenTaskModal,
    handleCancelTaskModal,
    selectedsassignees,
    dispatch,
    setSelectedsassignees,
    isEditTaskModalOpen,
    importCsvFile,
    importRef,
    exportSampleCSVfile,
    onChange,
    editorData,
    handleChangeData,
    handlePaste,
    handlePasteData,
    editModalDescription,
    handleChnageDescription,
    selectedItems,
    handleSelectedItemsChange,
    searchKeyword,
    handleSearch,
    html,
    estHrsError,
    estMinsError,
    tableTrue,
    handleChangeTableView,
    selectedView,
    setFilterSchema,
    pageLoading,
    loadMoreBugs,
    loadingMore,
  } = BugsController();

  const csvRef = document.getElementById("test-table-xls-button");
  const menu = (
    <Menu selectedKeys={[selectedView]}>
      <Menu.Item key="table" onClick={() => handleChangeTableView("table")}>
        <i className="fa-solid fa-list" style={{ marginRight: 8 }} />
        Table View
      </Menu.Item>
      <Menu.Item key="board" onClick={() => handleChangeTableView("board")}>
        <i className="fa-solid fa-table-columns" style={{ marginRight: 8 }} />
        Board View
      </Menu.Item>
      <Menu.Item key="gantt" onClick={() => handleChangeTableView("gantt")}>
        <i className="fa-solid fa-bars-progress" style={{ marginRight: 8 }} />
        Gantt View
      </Menu.Item>
    </Menu>
  );

  const [addBugCommentDraft, setAddBugCommentDraft] = useState("");
  const [editBugCommentDraft, setEditBugCommentDraft] = useState("");
  const [addBugCommentFiles, setAddBugCommentFiles] = useState([]);
  const [editBugCommentFiles, setEditBugCommentFiles] = useState([]);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceInterimAdd, setVoiceInterimAdd] = useState("");
  const [voiceInterimEdit, setVoiceInterimEdit] = useState("");
  const [voiceListeningTarget, setVoiceListeningTarget] = useState(null);
  const addCommentFileInputRef = useRef(null);
  const editCommentFileInputRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR));
  }, []);

  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {
          // no-op
        }
      }
    };
  }, []);

  const resetVoiceSilenceTimeout = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    silenceTimeoutRef.current = setTimeout(() => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (error) {
          // no-op
        }
      }
    }, 3500);
  };

  const handleCommentFilesChange = (event, type = "add") => {
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
      if (type === "edit") {
        setEditBugCommentFiles((prev) => [...prev, ...allowedFiles]);
      } else {
        setAddBugCommentFiles((prev) => [...prev, ...allowedFiles]);
      }
    }
    if (event?.target) event.target.value = "";
  };

  const removeCommentFile = (index, type = "add") => {
    if (type === "edit") {
      setEditBugCommentFiles((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }
    setAddBugCommentFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleVoiceToggle = (target = "add") => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      message.error("Voice input is not supported in this browser.");
      return;
    }
    if (speechRecognitionRef.current && voiceListeningTarget === target) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // no-op
      }
      return;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // no-op
      }
    }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setVoiceListeningTarget(target);
      if (target === "edit") setVoiceInterimEdit("");
      else setVoiceInterimAdd("");
      resetVoiceSilenceTimeout();
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalTranscript += `${text} `;
        else interimTranscript += text;
      }
      if (target === "edit") {
        if (finalTranscript.trim()) {
          setEditBugCommentDraft((prev) => `${prev}${prev && !/\s$/.test(prev) ? " " : ""}${finalTranscript}`.trimStart());
        }
        setVoiceInterimEdit(interimTranscript);
      } else {
        if (finalTranscript.trim()) {
          setAddBugCommentDraft((prev) => `${prev}${prev && !/\s$/.test(prev) ? " " : ""}${finalTranscript}`.trimStart());
        }
        setVoiceInterimAdd(interimTranscript);
      }
      if (finalTranscript.trim() || interimTranscript.trim()) {
        resetVoiceSilenceTimeout();
      }
    };

    recognition.onerror = () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      setVoiceListeningTarget(null);
      setVoiceInterimAdd("");
      setVoiceInterimEdit("");
      speechRecognitionRef.current = null;
    };

    recognition.onend = () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      setVoiceListeningTarget(null);
      setVoiceInterimAdd("");
      setVoiceInterimEdit("");
      speechRecognitionRef.current = null;
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const handleComposerSubmit = (type = "add") => {
    const draft = type === "edit" ? editBugCommentDraft : addBugCommentDraft;
    const interim = type === "edit" ? voiceInterimEdit : voiceInterimAdd;
    const files = type === "edit" ? editBugCommentFiles : addBugCommentFiles;
    const composedValue = `${draft}${interim ? ` ${interim}` : ""}`.trim();
    if (!composedValue && files.length === 0) return;
    if (type === "edit") {
      message.info("Comment saving will be available after this bug record is loaded in detail view.");
      return;
    }
    message.info("Save the bug first, then add comments.");
  };

  const handleComposerPressEnter = (event, type = "add") => {
    if (event?.shiftKey) return;
    event?.preventDefault?.();
    handleComposerSubmit(type);
  };

  useEffect(() => {
    let active = true;

    const loadProjectOverview = async () => {
      if (!projectId) return;
      try {
        const response = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: `${Service.getOverview}/${projectId}`,
        });

        if (!active) return;
        if (response?.data?.status && response?.data?.data) {
          setProjectOverview(response.data.data);
        }
      } catch (error) {
        if (active) {
          setProjectOverview(null);
        }
      }
    };

    loadProjectOverview();

    return () => {
      active = false;
    };
  }, [projectId]);

  const viewIcon =
    selectedView === "table"
      ? "fa-solid fa-list"
      : selectedView === "gantt"
        ? "fa-solid fa-bars-progress"
        : "fa-solid fa-table-columns";

  const addBugFileCount = Array.isArray(fileAttachment) ? fileAttachment.length : 0;
  const addBugAssigneeCount = Array.isArray(selectedItems) ? selectedItems.length : 0;
  const addBugProjectValue =
    projectOverview?.title ||
    projectOverview?.name ||
    projectOverview?.project_name ||
    projectOverview?.project_title ||
    taskList?.[0]?.project_id?.code ||
    taskList?.[0]?.project?.code ||
    taskList?.[0]?.project_id?.title ||
    taskList?.[0]?.project?.title ||
    taskList?.[0]?.project_id?.name ||
    taskList?.[0]?.project?.name ||
    projectId ||
    "";

  useEffect(() => {
    const currentIds = (Array.isArray(boardTasksBugs) ? boardTasksBugs : [])
      .map((stage) => stage?._id)
      .filter(Boolean);
    setBugStageOrder((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const preserved = prevList.filter((id) => currentIds.includes(id));
      const extras = currentIds.filter((id) => !preserved.includes(id));
      return [...preserved, ...extras];
    });
  }, [boardTasksBugs]);

  const orderedBoardTasksBugs = useMemo(() => {
    const source = Array.isArray(boardTasksBugs) ? boardTasksBugs : [];
    if (!bugStageOrder.length) return source;
    const orderMap = new Map(bugStageOrder.map((id, index) => [id, index]));
    return [...source].sort((a, b) => {
      const aIndex = orderMap.has(a?._id) ? orderMap.get(a._id) : Number.MAX_SAFE_INTEGER;
      const bIndex = orderMap.has(b?._id) ? orderMap.get(b._id) : Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }, [boardTasksBugs, bugStageOrder]);

  const handleOpenAddStageModal = () => {
    setIsAddStageModalOpen(true);
  };

  const canEditBugStage = (stage) => {
    if (stage?.isDefault) return false;
    const title = String(stage?.title || "").trim().toLowerCase();
    return !DEFAULT_BUG_STAGE_TITLES.includes(title);
  };

  const handleRenameBugStage = async (stage, nextTitleRaw) => {
    if (!stage?._id || !canEditBugStage(stage)) return;
    const nextTitle = String(nextTitleRaw || "").trim();
    if (!nextTitle) {
      message.error("Stage name is required.");
      return;
    }
    if (nextTitle === String(stage?.title || "").trim()) return;
    try {
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateBugWorkflowStatus}/${stage._id}`,
        body: {
          title: nextTitle,
          color: stage?.color || "#64748b",
        },
      });
      if (response?.data?.status) {
        message.success(response?.data?.message || "Stage updated");
        await getBoardTasks();
      } else {
        message.error(response?.data?.message || "Failed to update stage");
      }
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to update stage");
    }
  };

  const handleReorderBugStages = async (dragStageId, dropStageId) => {
    if (!dragStageId || !dropStageId || dragStageId === dropStageId) return;
    let nextOrder = [];
    setBugStageOrder((prev) => {
      const current = [...(Array.isArray(prev) ? prev : [])];
      const fromIndex = current.indexOf(dragStageId);
      const toIndex = current.indexOf(dropStageId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, dragStageId);
      nextOrder = current;
      return current;
    });
    if (!nextOrder.length) return;
    try {
      await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.reorderBugWorkflowStatus,
        body: {
          ordered_stage_ids: nextOrder,
        },
      });
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to reorder stages");
      await getBoardTasks();
    }
  };

  const handleAddStageSubmit = async () => {
    try {
      const values = await addStageForm.validateFields();
      setAddStageSubmitting(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addBugWorkflowStatus,
        body: {
          title: String(values?.title || "").trim(),
          color: values?.color || "#64748b",
        },
      });
      if (response?.data?.status) {
        message.success(response?.data?.message || "Bug stage added");
        setIsAddStageModalOpen(false);
        addStageForm.resetFields();
        await getBoardTasks();
      } else {
        message.error(response?.data?.message || "Failed to add bug stage");
      }
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || "Failed to add bug stage");
    } finally {
      setAddStageSubmitting(false);
    }
  };

  if (pageLoading) return selectedView === "board" ? <BugsKanbanSkeleton /> : <BugsSkeleton />;

  return (
    <>
      <div className="project-wrapper discussion-wrapper task-wrapper bugs-task-wrapper wm-force-dark-page">
        <div className="peoject-page" style={{ overflow: "hidden" }}>
          <div className="profilerightbar" style={{ overflow: "hidden" }}>
            <div className="profile-sub-head">
              <div className="task-sub-header">
                <div className="head-box-inner">
                  {hasPermission(["bug_add"]) && (
                    <Button
                      onClick={() => showModalTaskModal()}
                      type="primary"
                      className=" add-btn"
                    >
                      <PlusOutlined />
                      Add Task Bug
                    </Button>
                  )}
                  <Search
                    ref={searchRef}
                    placeholder="Search..."
                    allowClear
                    onChange={(e) => onSearchTask(e.target.value)}
                    onSearch={onSearchTask}
                    style={{ width: 200 }}
                    className="mr2"
                  />

                  <div style={{ cursor: "pointer" }}>
                    <div className="status-content">
                      <ConfigProvider>
                        <Dropdown overlay={menu} trigger={["click"]}>
                          <Button
                            className="dropdown-trigger toolbar-icon-btn"
                            icon={<i className={viewIcon}></i>}
                          />
                        </Dropdown>
                      </ConfigProvider>
                    </div>
                  </div>
                </div>

                <div className="block-status-content">
                  <div className="filter-btn-wrapper">

                    <BugFilter
                      boardTasksBugs={boardTasksBugs}
                      subscribersList={subscribersList}
                      projectLabels={projectLabels}
                      onConfigUpdate={(config) => {
                        setFilterSchema(config)
                        getBoardTasks()
                      }}
                    />

                    <div style={{ cursor: "pointer" }}>
                      <div hidden>
                        <ReactHTMLTableToExcel
                          id="test-table-xls-button"
                          className="ant-btn-primary"
                          table="table-to-xls"
                          filename="ProjectTasks"
                          sheet="tablexls"
                          buttonText="Export XLS"
                        />
                        <div
                          dangerouslySetInnerHTML={{ __html: html["html"] }}
                        ></div>
                      </div>

                      <Popover
                        placement="bottomRight"
                        overlayClassName="wm-ellipsis-popover"
                        content={
                          <div className="task-elipse-pop">
                            {hasPermission(["bug_add"]) && (
                              <div className="status-content" onClick={() => exportSampleCSVfile()} role="button" tabIndex={0}>
                                <h6>Sample CSV:</h6>
                                <i className="fi fi-rr-file-download"></i>
                              </div>
                            )}
                            <input
                              className="employee-inoutbtn"
                              type="file"
                              size="small"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                importCsvFile(file);
                              }}
                              onClick={(e) => (e.target.value = null)}
                              style={{
                                display: "none",
                              }}
                              ref={importRef}
                              accept="xlsx, .xls, .csv"
                            />

                            {hasPermission(["bug_add"]) && (
                              <div className="status-content" onClick={() => importRef.current.click()} role="button" tabIndex={0}>
                                <h6>Import CSV:</h6>

                                <i className="fi fi-rr-file-import"></i>
                              </div>
                            )}
                            <div className="status-content" onClick={() => { csvRef.click(); }} role="button" tabIndex={0}>
                              <h6>Repeated Bug CSV:</h6>

                              <i className="fi fi-rr-file-download"></i>
                            </div>
                          </div>
                        }
                        trigger="click"
                      >
                        <Button
                          className="dropdown-trigger toolbar-icon-btn toolbar-more-btn"
                          icon={<MoreOutlined />}
                        />
                      </Popover>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {orderedBoardTasksBugs.length === 0 && (
              <div className="error-message">
                <p>No Data</p>
              </div>
            )}
            {selectedView === "board" ? (
              <BugList
                tasks={filterTasks(orderedBoardTasksBugs, filterSchema)}
                showEditTaskModal={showEditTaskModal}
                showModalTaskModal={showModalTaskModal}
                getBoardTasks={getBoardTasks}
                selectedTask={selectedTask}
                boardTasksBugs={orderedBoardTasksBugs}
                deleteTasks={deleteTasks}
                loadMoreBugs={loadMoreBugs}
                loadingMore={loadingMore}
                onAddStageClick={handleOpenAddStageModal}
                onStageRename={handleRenameBugStage}
                onStageReorder={handleReorderBugStages}
                canEditStage={canEditBugStage}
              />
            ) : selectedView === "table" ? (
              <BugsTable
                tasks={filterTasks(orderedBoardTasksBugs, filterSchema)}
                showEditTaskModal={showEditTaskModal}
                showModalTaskModal={showModalTaskModal}
                getBoardTasks={getBoardTasks}
                selectedTask={selectedTask}
                boardTasksBugs={orderedBoardTasksBugs}
                deleteTasks={deleteTasks}
              />
            ) : (
              <BugsGanttView
                tasks={filterTasks(orderedBoardTasksBugs, filterSchema)}
                showEditTaskModal={showEditTaskModal}
                showModalTaskModal={showModalTaskModal}
                getBoardTasks={getBoardTasks}
                selectedTask={selectedTask}
                boardTasksBugs={orderedBoardTasksBugs}
                deleteTasks={deleteTasks}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        open={isAddStageModalOpen}
        title="Add Bug Stage"
        okText="Save"
        onOk={handleAddStageSubmit}
        onCancel={() => {
          setIsAddStageModalOpen(false);
          addStageForm.resetFields();
        }}
        confirmLoading={addStageSubmitting}
      >
        <Form
          form={addStageForm}
          layout="vertical"
          initialValues={{ title: "", color: "#64748b" }}
        >
          <Form.Item
            name="title"
            label="Stage Name"
            rules={[
              { required: true, whitespace: true, message: "Please enter stage name" },
            ]}
          >
            <Input placeholder="e.g. In Review" maxLength={60} />
          </Form.Item>
          <Form.Item
            name="color"
            label="Color"
            rules={[{ required: true, message: "Please choose color" }]}
          >
            <Input type="color" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modals */}
      <Modal
        open={isModalOpenImport}
        width={720}
        title={null}
        footer={null}
        onCancel={() => handleImportClose(false)}
        className="upload-modal add-task-modal"
      >
        <div className="modal-header">
          <h1>Import Tasks</h1>
        </div>
        <div className="overview-modal-wrapper">
          <h4 className="file-selector-head">
            Use the sample CSV and fill your own data:{" "}
            <span>Download Sample CSV file</span>
          </h4>
          <Dragger {...props}>
            <p className="ant-upload-drag-icon"></p>
            <p className="ant-upload-text">
              <Button className="add-btn" icon={<PlusOutlined />}></Button>
              <p>Select a CSV file to import</p>
              <small>Drag a file here</small>
            </p>
          </Dragger>
          <Form>
            <div className="topic-cancel-wrapper">
              <Form.Item label="Associate Workflow :">
                <Dropdown trigger={["click"]} overlay={workflowMenu}>
                  <span>
                    <Input></Input>
                  </span>
                </Dropdown>
              </Form.Item>
              <h4 className="file-selector-head">
                To Learn how to import data from other tools.{" "}
                <span>click here</span>
              </h4>
              <h4>Note:</h4>
              <small>
                <i>
                  Before uploading the CSV make sure its encoded in UTF-8
                  format.
                </i>
              </small>
              <div className="modal-footer-flex pt-2">
                <Button type="primary" className="square-primary-btn">
                  Next <ArrowRightOutlined />
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        open={isModalOpenList}
        onCancel={handleCancelList}
        onOk={handleOkList}
        title={modalMode === "add" ? "Add List" : "Edit List"}
        className="add-task-modal add-list-modal"
        width="90%"
        style={{ maxWidth: 800 }}
        footer={[
          <Button
            key="cancel"
            onClick={handleCancelList}
            className="square-outline-btn"
            size="large"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            className="square-primary-btn"
            size="large"
            onClick={() => listForm.submit()}
          >
            Save
          </Button>,
        ]}
      >
        <div className="overview-modal-wrapper">
          <Form
            form={listForm}
            layout="vertical"
            initialValues={{ isPrivateList: false }}
            onFinish={(values) => {
              modalMode === "add"
                ? addProjectMainTask(values)
                : editProjectmainTask(values);
            }}
          >
            <Row gutter={[0, 0]}>
              {/* Title Field */}
              <Col xs={24} sm={24} md={24} lg={24}>
                <Form.Item
                  label="Title"
                  name="title"
                  rules={[
                    {
                      required: true,
                      message: "Please enter a title",
                    },
                  ]}
                >
                  <Input placeholder="Enter title" size="large" />
                </Form.Item>
              </Col>

              {/* Associate Workflow */}
              <Col xs={24} sm={24} md={12} lg={12}>
                <Form.Item
                  label="Associate Workflow"
                  name="workflow_id"
                  rules={[
                    {
                      required: true,
                      message: "Please select a workflow",
                    },
                  ]}
                >
                  <Select
                    disabled={modalMode !== "add"}
                    placeholder="Select Workflow"
                    size="large"
                    showSearch
                    filterOption={(input, option) =>
                      option.children
                        ?.toLowerCase()
                        ?.indexOf(input?.toLowerCase()) >= 0
                    }
                    onDropdownVisibleChange={(open) => open && getWorkflow()}
                    onChange={(id) => {
                      dispatch(getSpecificProjectWorkflowStage(id));
                    }}
                  >
                    {workflow.map((item, index) => (
                      <Option
                        key={index}
                        value={item._id}
                        style={{ textTransform: "capitalize" }}
                      >
                        {item.project_workflow}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {/* Assignees */}
              <Col xs={24} sm={24} md={12} lg={12}>
                <Form.Item label="Assignees">
                  <Select
                    size="large"
                    showSearch
                    mode="multiple"
                    placeholder="Select Assignees"
                    style={{ width: "100%" }}
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children
                        ?.toLowerCase()
                        .indexOf(input?.toLowerCase()) >= 0
                    }
                    filterSort={(optionA, optionB) =>
                      optionA.children
                        ?.toLowerCase()
                        .localeCompare(optionB.children?.toLowerCase())
                    }
                    onChange={handlerAssignes}
                    value={selectedsassignees}
                    onDropdownVisibleChange={(open) =>
                      open && dispatch(getSubscribersList())
                    }
                  >
                    {subscribersList?.map((item, index) => (
                      <Option
                        key={index}
                        value={item._id}
                        style={{ textTransform: "capitalize" }}
                      >
                        {item.full_name}
                      </Option>
                    ))}
                  </Select>

                  {selectedsassignees.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Button
                        className="delete-btn"
                        onClick={() => setSelectedsassignees([])}
                        size="small"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </Form.Item>
              </Col>

              {/* Dynamic Assignee Stages */}
              {selectedsassignees.length > 0 && (
                <Col xs={24} sm={24} md={24} lg={24}>
                  <div className="assignee-stages-section">
                    <h4 style={{ marginBottom: 16, color: '#666' }}>
                      Assign Stages to Selected Members
                    </h4>
                    <Row gutter={[16, 16]}>
                      {subscribersList
                        .filter((value) => selectedsassignees.includes(value._id))
                        .map((data, index) => (
                          <Col xs={24} sm={12} md={8} lg={6} key={index}>
                            <div className="assignee-stage-card">
                              {/* Assignee Info */}
                              <div className="assignee-info">
                                <Avatar
                                  src={`${Service.HRMS_Base_URL}/uploads/emp_images/${data?.emp_img}`}
                                  size="default"
                                />
                                <span className="assignee-name">
                                  {data.full_name}
                                </span>
                              </div>

                              {/* Stage Selection */}
                              <Form.Item
                                label="Stage"
                                name={`task_status_${data._id}`}
                                className="stage-select-item"
                                rules={[
                                  {
                                    required: true,
                                    message: "Please select a stage",
                                  },
                                ]}
                              >
                                <Select
                                  size="large"
                                  placeholder="Select Stage"
                                  showSearch
                                  filterOption={(input, option) =>
                                    option.children
                                      ?.toLowerCase()
                                      .indexOf(input?.toLowerCase()) >= 0
                                  }
                                  filterSort={(optionA, optionB) =>
                                    optionA.children
                                      ?.toLowerCase()
                                      .localeCompare(optionB.children?.toLowerCase())
                                  }
                                >
                                  {projectWorkflowStage.map((item) => (
                                    <Option
                                      key={item._id}
                                      value={item._id}
                                      style={{ textTransform: "capitalize" }}
                                    >
                                      {item.title}
                                    </Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </div>
                          </Col>
                        ))}
                    </Row>
                  </div>
                </Col>
              )}
            </Row>
          </Form>
        </div>
      </Modal>


      <Modal
        open={isModalOpenTaskModal}
        onCancel={handleCancelTaskModal}
        footer={null}
        width={1100}
        centered
        className="modern-bug-detail-modal add-bug-modern-modal"
      >
        <div className="bug-detail-content-premium add-bug-content-premium">
          <div className="bug-detail-modal-left">
            <div className="bug-detail-header-premium">
              <div className="bug-header-top-row">
                <div className="bug-header-statusblock">
                  <div className="bug-header-status-text">OPEN</div>
                </div>
              </div>


            </div>

            <Form
              form={addform}
              layout="vertical"
              onFinish={(values) => handleTaskOps(values)}
            >
              <div className="task-detail-content-grid">
              <div className="bug-tittle">
  <Form.Item
    label="Bug Name"
    name="title"
    style={{ marginBottom: 0 }}
  >
    <Input
      value={addInputTaskData?.title || ""}
      placeholder="Enter Bug Name"
   
      bordered={false}
      onChange={(e) => {
        handleTaskInput("title", e.target.value);
        addform.setFieldValue("title", e.target.value);
      }}
    />
  </Form.Item>
</div>
                <div className="section-card">
                  <div className="section-card-title">
                    <span>Task Brief</span>
                  </div>
                  <div className="section-card-main-title">Description</div>
                  <Form.Item
                    name="descriptions"
                    style={{ marginBottom: 0 }}
                  >
                    <div className="description-editor-wrapper add-bug-editor-shell">
                      <CKEditor
                        editor={Custombuild}
                        data={editorData}
                        onChange={handleChangeData}
                        onPast={handlePaste}
                        config={{
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
                            "|",
                            "print",
                          ],
                          fontSize: {
                            options: [
                              "default",
                              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                              13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
                              23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
                            ],
                          },
                          print: {},
                        }}
                      />
                    </div>
                  </Form.Item>
                </div>

                <div className="card-row">
                  <div className="section-card">
                    <div className="section-card-title">
                      <span>Start Date</span>
                    </div>
                    <div className="meta-value">
                      <DatePicker
                        value={parseBugUiDate(addInputTaskData?.start_date)}
                        format="DD-MM-YYYY"
                        placeholder="Select date"
                        style={{ width: "100%" }}
                        onChange={(date, dateString) =>
                          handleTaskInput("start_date", dateString)
                        }
                      />
                    </div>
                  </div>

                  <div className="section-card">
                    <div className="section-card-title">
                      <span>End Date</span>
                    </div>
                    <div className="meta-value">
                      <DatePicker
                        value={parseBugUiDate(addInputTaskData?.end_date)}
                        format="DD-MM-YYYY"
                        placeholder="Select date"
                        style={{ width: "100%" }}
                        disabledDate={(current) => {
                          const startDate = parseBugUiDate(addInputTaskData?.start_date);
                          if (!startDate || !current) return false;
                          return current.isBefore(startDate, "day");
                        }}
                        onChange={(date, dateString) =>
                          handleTaskInput("end_date", dateString)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="section-card add-bug-assignee-card">
                  <div className="section-card-title">
                    <span>Assignee(s)</span>
                  </div>
                  <div className="meta-value">
                    <Form.Item name="selectedItems" style={{ marginBottom: 0, width: "100%" }}>
                      <MultiSelect
                        onSearch={handleSearch}
                        onChange={handleSelectedItemsChange}
                        values={selectedItems && selectedItems.map((item) => item._id)}
                        listData={subscribersList}
                        search={searchKeyword}
                        showTagLabel
                      />
                    </Form.Item>
                  </div>
                </div>

                <div className="card-row">
                  <div className="section-card">
                    <div className="section-card-title">
                      <span>Labels</span>
                    </div>
                    <div className="meta-value">
                      <Select
                        allowClear
                        value={addInputTaskData?.labels}
                        showSearch
                        placeholder="Labels"
                        style={{ width: "100%" }}
                        onChange={(value) => handleTaskInput("labels", value)}
                      >
                        {projectLabels.map((item) => (
                          <Option
                            key={item._id}
                            value={item._id}
                            style={{ textTransform: "capitalize" }}
                          >
                            {item.title}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="card-row">
                  <div className="section-card">
                    <div className="section-card-title">
                      <span>Project</span>
                    </div>
                    <div className="meta-value">
                      <Input
                        value={addBugProjectValue}
                        placeholder="Project"
                        size="large"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="section-card">
                  <div className="section-card-title">
                    <span>Attachments</span>
                    <Button
                      type="link"
                      size="small"
                      icon={<PaperClipOutlined />}
                      onClick={() => attachmentfileRef.current.click()}
                    >
                      Add Files
                    </Button>
                  </div>
                  <div className="bug-files-container">
                    {fileAttachment.length > 0 ? (
                      fileAttachment.map((file, index) => (
                        <Badge
                          key={index}
                          count={
                            <CloseCircleOutlined onClick={() => removeAttachmentFile(index)} />
                          }
                        >
                          <div className="bug-file-card">
                            <div className="bug-file-info">
                              <PaperClipOutlined />
                              <span>{file.name}</span>
                            </div>
                          </div>
                        </Badge>
                      ))
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                        No attachments added yet.
                      </div>
                    )}
                  </div>
                  {fileAttachment.length > 0 && (
                    <Form.Item
                      label="Folder"
                      name="folder"
                      initialValue={foldersList.length > 0 ? foldersList[0]._id : undefined}
                      rules={[{ required: true }]}
                      style={{ marginTop: 12, marginBottom: 0 }}
                    >
                      <Select placeholder="Please Select Folder" showSearch>
                        {foldersList.map((data) => (
                          <Option
                            key={data._id}
                            value={data._id}
                            style={{ textTransform: "capitalize" }}
                          >
                            {data.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}
                  <input
                    multiple
                    type="file"
                    accept="*"
                    onChange={onFileChange}
                    hidden
                    ref={attachmentfileRef}
                  />
                </div>

                <div className="bug-footer-toggles add-bug-footer-toggles">
                  <div className="footer-left">
                    <Form.Item name="repeatedBug" valuePropName="checked" style={{ marginBottom: 0 }}>
                      <Checkbox onChange={onChange}>Repeated Bug</Checkbox>
                    </Form.Item>
                    <div className="flexible-time" style={{ marginLeft: 24, display: "flex", alignItems: "center", gap: "8px" }}>
                      <ClockCircleOutlined style={{ color: "#64748b" }} />
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Estimate:</span>
                      <div className="estimate-inputs" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Input
                          min={0}
                          value={estHrs}
                          type="number"
                          onChange={(e) => handleEstTimeInput("est_hrs", e.target.value)}
                          className={estHrsError && "error-border"}
                          placeholder="Hours"
                          style={{ width: 84 }}
                        />
                        <Input
                          min={0}
                          max={59}
                          type="number"
                          value={estMins}
                          onChange={(e) => {
                            if (e.target.value * 1 > 60) return e.preventDefault();
                            handleEstTimeInput("est_mins", e.target.value);
                          }}
                          className={estMinsError && "error-border"}
                          placeholder="Minutes"
                          style={{ width: 92 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bug-detail-modal-footer-actions">
                <Button
                  className="add-btn"
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => {
                    addform.validateFields(["title"]).then((values) => {
                      handleTaskOps({ ...addform.getFieldsValue(), ...values });
                    }).catch(() => { });
                  }}
                >
                  Save
                </Button>
                <Button className="delete-btn" onClick={handleCancelTaskModal}>
                  Close
                </Button>
              </div>
            </Form>
          </div>

          <div className="bug-detail-modal-right">
            <div className="sidebar-header">
              <div>
                <div style={{ fontSize: "10px", fontWeight: "400", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: "4px" }}>WORKSPACE</div>
                <div className="sidebar-header-title">Discussion and activity</div>
              </div>
            </div>
            <div className="sidebar-tabs">
              <div className="sidebar-tab-btn active">
                <CommentOutlined />
                Comments
                <span className="tab-badge">0</span>
              </div>
              <div className="sidebar-tab-btn">
                <PaperClipOutlined />
                Files
              </div>
              <div className="sidebar-tab-btn">
                <HistoryOutlined />
                Activity
              </div>
            </div>
            <div className="sidebar-content">
              <div className="bug-detail-discussion">
                <div className="bug-comment-list-box">
                  <div className="comment-list-wrapper">
                    <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "40px" }}>No Comments</div>
                  </div>
                </div>
                <div className="bug-detail-sidebar-footer-card">
                  <div className="bug-detail-composer-title">Add to the conversation</div>
                  <Input.TextArea
                    className="bug-detail-composer-input"
                    rows={3}
                    placeholder="Share an update, mention blockers, or document the next step..."
                    value={`${addBugCommentDraft}${voiceInterimAdd ? `${addBugCommentDraft ? " " : ""}${voiceInterimAdd}` : ""}`}
                    onChange={(e) => setAddBugCommentDraft(e.target.value)}
                    onPressEnter={(event) => handleComposerPressEnter(event, "add")}
                    readOnly={voiceListeningTarget === "add"}
                  />
                  {addBugCommentFiles.length > 0 && (
                    <div className="bug-detail-composer-file-list">
                      {addBugCommentFiles.map((file, index) => (
                        <span key={`${file?.name || "file"}-${index}`} className="bug-detail-composer-file-chip">
                          <span title={file?.name}>{file?.name || `File ${index + 1}`}</span>
                          <button type="text"
                            size="small" onClick={() => removeCommentFile(index, "add")}>
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="bug-detail-composer-actions">
                    <div className="bug-detail-composer-left-actions">
                      <Button
                        type="default"
                        icon={<PaperClipOutlined />}
                        onClick={() => addCommentFileInputRef.current?.click()}
                      >
                        Attach
                      </Button>
                      {voiceSupported && (
                        <Button
                          type={voiceListeningTarget === "add" ? "primary" : "default"}
                          icon={voiceListeningTarget === "add" ? <LoadingOutlined spin /> : <AudioOutlined />}
                          onClick={() => handleVoiceToggle("add")}
                        >
                          {voiceListeningTarget === "add" ? "Stop recording" : "Voice"}
                        </Button>
                      )}
                    </div>
                    <Button
                      className="bug-detail-comment-submit"
                      type="primary"
                      disabled={!`${addBugCommentDraft}${voiceInterimAdd ? ` ${voiceInterimAdd}` : ""}`.trim() && addBugCommentFiles.length === 0}
                      onClick={() => handleComposerSubmit("add")}
                    >
                      Send
                    </Button>
                  </div>
                  <input
                    ref={addCommentFileInputRef}
                    type="file"
                    multiple
                    accept="*"
                    style={{ display: "none" }}
                    onChange={(event) => handleCommentFilesChange(event, "add")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={isEditTaskModalOpen}
        onCancel={handleCancelTaskModal}
        footer={null}
        width={1100}
        centered
        className="modern-bug-detail-modal add-bug-modern-modal"
      >
        <div className="bug-detail-content-premium add-bug-content-premium">
          <div className="bug-detail-modal-left">
            <div className="bug-detail-header-premium">
              <div className="bug-header-top-row">
                <div className="bug-header-statusblock">
                  <div className="bug-header-status-text">OPEN</div>
                </div>
              </div>

              <div className="bug-display-title">
                <h1>{addInputTaskData?.title || "Edit Task Bug"}</h1>
              </div>

              <div className="bug-breadcrumb-text">Update bug details and activity</div>

              <div className="header-meta-cards">
                <div className="meta-card">
                  <div className="meta-card-label">ASSIGNEES</div>
                  <div className="meta-card-value">
                    {addBugAssigneeCount} Member{addBugAssigneeCount !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="meta-card">
                  <div className="meta-card-label">ASSETS</div>
                  <div className="meta-card-value">
                    {addBugFileCount} attachment{addBugFileCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>

            <Form
              form={editform}
              layout="vertical"
              onFinish={(values) => handleTaskOps(values, true)}
            >
              <div className="task-detail-content-grid">
                <div className="section-card">
                  <div className="section-card-title">
                    <span>Bug Setup</span>
                  </div>
                  <div className="card-row">
                    <Form.Item
                      label="Title"
                      name="title"
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: "Please enter a valid title",
                        },
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="Title" size="large" />
                    </Form.Item>

                    <Form.Item
                      label="Task"
                      name="task_id"
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        placeholder="Task"
                        size="large"
                        showSearch
                        filterSort={(optionA, optionB) =>
                          optionA.children
                            ?.toLowerCase()
                            .localeCompare(optionB.children?.toLowerCase())
                        }
                        onChange={(value) => handleTaskInput("task_id", value)}
                      >
                        {taskList.map((item, index) => (
                          <Option
                            key={index}
                            value={item._id}
                            style={{ textTransform: "capitalize" }}
                          >
                            {item.title}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                </div>

                <div className="section-card">
                  <div className="section-card-title">
                    <span>Task Brief</span>
                  </div>
                  <div className="section-card-main-title">Description</div>
                  <Form.Item
                    name="descriptions"
                    style={{ marginBottom: 0 }}
                  >
                    <div className="add-bug-editor-shell">
                      <CKEditor
                        editor={Custombuild}
                        data={editModalDescription}
                        onChange={handleChnageDescription}
                        onPast={handlePasteData}
                        config={{
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
                            "|",
                            "print",
                          ],
                          fontSize: {
                            options: [
                              "default",
                              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                              13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
                              23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
                            ],
                          },
                          print: {},
                        }}
                      />
                    </div>
                  </Form.Item>
                </div>

                <div className="card-row">
                  <div className="section-card">
                    <div className="section-card-title">
                      <span>Start Date</span>
                    </div>
                    <div className="meta-value">
                      <DatePicker
                        value={
                          parseBugUiDate(addInputTaskData?.start_date)
                        }
                        format="DD-MM-YYYY"
                        placeholder="Start Date"
                        style={{ width: "100%" }}
                        onChange={(date, dateString) =>
                          handleTaskInput("start_date", dateString)
                        }
                      />
                    </div>
                  </div>

                  <div className="section-card">
                    <div className="section-card-title">
                      <span>End Date</span>
                    </div>
                    <div className="meta-value">
                      <DatePicker
                        value={
                          parseBugUiDate(addInputTaskData?.end_date)
                        }
                        format="DD-MM-YYYY"
                        disabledDate={(current) => {
                          const startDate = parseBugUiDate(addInputTaskData?.start_date);
                          if (!startDate || !current) return false;
                          return current.isBefore(startDate, "day");
                        }}
                        placeholder="End Date"
                        style={{ width: "100%" }}
                        onChange={(date, dateString) =>
                          handleTaskInput("end_date", dateString)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="card-row">
                  <div className="section-card">
                    <div className="section-card-title">
                      <span>Labels</span>
                    </div>
                    <div className="meta-value">
                      <Select
                        allowClear
                        value={addInputTaskData?.labels}
                        showSearch
                        placeholder="Select"
                        style={{ width: "100%" }}
                        onChange={(value) => handleTaskInput("labels", value)}
                      >
                        {projectLabels.map((item) => (
                          <Option
                            key={item._id}
                            value={item._id}
                            style={{ textTransform: "capitalize" }}
                          >
                            {item.title}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="section-card">
                    <div className="section-card-title">
                      <span>Assignee(s)</span>
                    </div>
                    <div className="meta-value">
                      <Form.Item
                        name="selectedItems"
                        rules={[
                          {
                            required: true,
                            message: "Please select at least one assignee!",
                            type: "array",
                            min: 1,
                          },
                        ]}
                        style={{ marginBottom: 0, width: "100%" }}
                      >
                        <MultiSelect
                          onSearch={handleSearch}
                          onChange={handleSelectedItemsChange}
                          values={
                            selectedItems &&
                            selectedItems.map((item) => item._id)
                          }
                          listData={subscribersList}
                          search={searchKeyword}
                          showTagLabel
                        />
                      </Form.Item>
                    </div>
                  </div>
                </div>

                <div className="section-card">
                  <div className="section-card-title">
                    <span>Attachments</span>
                    <Button
                      type="link"
                      size="small"
                      icon={<PaperClipOutlined />}
                      onClick={() => attachmentfileRef.current.click()}
                    >
                      Add Files
                    </Button>
                  </div>
                  <div className="bug-files-container">
                    {fileAttachment.length > 0 ? (
                      fileAttachment.map((file, index) => (
                        <Badge
                          key={index}
                          count={
                            <CloseCircleOutlined onClick={() => removeAttachmentFile(index)} />
                          }
                        >
                          <div className="bug-file-card">
                            <div className="bug-file-info">
                              <PaperClipOutlined />
                              <span>{file.name}</span>
                            </div>
                          </div>
                        </Badge>
                      ))
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                        No attachments added yet.
                      </div>
                    )}
                  </div>
                  {fileAttachment.length > 0 && (
                    <Form.Item
                      label="Folder"
                      name="folder"
                      initialValue={foldersList.length > 0 ? foldersList[0]._id : undefined}
                      rules={[{ required: true }]}
                      style={{ marginTop: 12, marginBottom: 0 }}
                    >
                      <Select placeholder="Please Select Folder" showSearch>
                        {foldersList.map((data) => (
                          <Option
                            key={data._id}
                            value={data._id}
                            style={{ textTransform: "capitalize" }}
                          >
                            {data.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}
                  <input
                    multiple
                    type="file"
                    accept="*"
                    onChange={onFileChange}
                    hidden
                    ref={attachmentfileRef}
                  />
                </div>

                <div className="bug-footer-toggles add-bug-footer-toggles">
                  <div className="footer-left">
                    <Form.Item name="isrepeated" valuePropName="checked" style={{ marginBottom: 0 }}>
                      <Checkbox onChange={onChange}>Repeated Bug</Checkbox>
                    </Form.Item>
                    <div className="flexible-time" style={{ marginLeft: 24, display: "flex", alignItems: "center", gap: "8px" }}>
                      <ClockCircleOutlined style={{ color: "#64748b" }} />
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Estimate:</span>
                      <div className="estimate-inputs" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Input
                          min={0}
                          value={estHrs}
                          type="number"
                          onChange={(e) =>
                            handleEstTimeInput("est_hrs", e.target.value)
                          }
                          className={estHrsError && "error-border"}
                          placeholder="Hours"
                          style={{ width: 84 }}
                        />
                        <Input
                          min={0}
                          max={59}
                          type="number"
                          value={estMins}
                          onChange={(e) => {
                            if (e.target.value * 1 > 60) return e.preventDefault();
                            handleEstTimeInput("est_mins", e.target.value);
                          }}
                          className={estMinsError && "error-border"}
                          placeholder="Minutes"
                          style={{ width: 92 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bug-detail-modal-footer-actions">
                <Button
                  className="add-btn"
                  type="primary"

                  onClick={() => editform.submit()}
                >
                  Save
                </Button>
                <Button className="delete-btn" onClick={handleCancelTaskModal}>
                  Close
                </Button>
              </div>
            </Form>
          </div>

          <div className="bug-detail-modal-right">
            <div className="sidebar-header">
              <div>
                <div style={{ fontSize: "10px", fontWeight: "400", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: "4px" }}>WORKSPACE</div>
                <div className="sidebar-header-title">Discussion and activity</div>
              </div>
            </div>
            <div className="sidebar-tabs">
              <div className="sidebar-tab-btn active">
                <CommentOutlined />
                Comments
                <span className="tab-badge">0</span>
              </div>
              <div className="sidebar-tab-btn">
                <PaperClipOutlined />
                Files
              </div>
              <div className="sidebar-tab-btn">
                <HistoryOutlined />
                Activity
              </div>
            </div>
            <div className="sidebar-content">
              <div className="bug-detail-discussion">
                <div className="bug-comment-list-box">
                  <div className="comment-list-wrapper">
                    <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "40px" }}>No Comments</div>
                  </div>
                </div>
                <div className="bug-detail-sidebar-footer-card">
                  <div className="bug-detail-composer-title">Add to the conversation</div>
                  <Input.TextArea
                    className="bug-detail-composer-input"
                    rows={3}
                    placeholder="Share an update, mention blockers, or document the next step..."
                    value={`${editBugCommentDraft}${voiceInterimEdit ? `${editBugCommentDraft ? " " : ""}${voiceInterimEdit}` : ""}`}
                    onChange={(e) => setEditBugCommentDraft(e.target.value)}
                    onPressEnter={(event) => handleComposerPressEnter(event, "edit")}
                    readOnly={voiceListeningTarget === "edit"}
                  />
                  {editBugCommentFiles.length > 0 && (
                    <div className="bug-detail-composer-file-list">
                      {editBugCommentFiles.map((file, index) => (
                        <span key={`${file?.name || "file"}-${index}`} className="bug-detail-composer-file-chip">
                          <span title={file?.name}>{file?.name || `File ${index + 1}`}</span>
                          <button type="text"
                            size="small" onClick={() => removeCommentFile(index, "edit")}>
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="bug-detail-composer-actions">
                    <div className="bug-detail-composer-left-actions">
                      <Button
                        type="default"
                        icon={<PaperClipOutlined />}
                        onClick={() => editCommentFileInputRef.current?.click()}
                      >
                        Attach
                      </Button>
                      {voiceSupported && (
                        <Button
                          type={voiceListeningTarget === "edit" ? "primary" : "default"}
                          icon={voiceListeningTarget === "edit" ? <LoadingOutlined spin /> : <AudioOutlined />}
                          onClick={() => handleVoiceToggle("edit")}
                        >
                          {voiceListeningTarget === "edit" ? "Stop recording" : "Voice"}
                        </Button>
                      )}
                    </div>
                    <Button
                      className="bug-detail-comment-submit"
                      type="primary"
                      disabled={!`${editBugCommentDraft}${voiceInterimEdit ? ` ${voiceInterimEdit}` : ""}`.trim() && editBugCommentFiles.length === 0}
                      onClick={() => handleComposerSubmit("edit")}
                    >
                      Send
                    </Button>
                  </div>
                  <input
                    ref={editCommentFileInputRef}
                    type="file"
                    multiple
                    accept="*"
                    style={{ display: "none" }}
                    onChange={(event) => handleCommentFilesChange(event, "edit")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default memo(BugsPMS);
