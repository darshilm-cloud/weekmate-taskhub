import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  MoreOutlined,
  DeleteOutlined,
  RightOutlined,
  EditOutlined,
  DownOutlined,
  FieldTimeOutlined,
  DownCircleOutlined,
  UpCircleOutlined,
} from "@ant-design/icons";
import "./tasktableview.css";
import {
  Avatar,
  Button,
  Input,
  Dropdown,
  DatePicker,
  Tooltip,
  Menu,
  Popover,
  Badge,
  Popconfirm,
  Select,
} from "antd";
import MultiSelect from "../../../components/CustomSelect/MultiSelect";
import dayjs from "dayjs";
import "../style.css";
import moment from "moment";
import AddComment from "../../../ReuseComponent/AddComment/AddComment";
import { fileImageSelect } from "../../../util/FIleSelection";
import TaskKanbanController from "../TasksKanbanBoard/TaskKanbanController";
import { hasPermission } from "../../../util/hasPermission";
import { Link } from "react-router-dom";
import useUserColors from "../../../hooks/customColor";
import { isCreatedBy } from "../../../util/isCreatedBy";
import { calculateTimeDifference } from "../../../util/formatTimeDifference";
import { removeTitle } from "../../../util/nameFilter";
import MyAvatarGroup from "../../../components/AvatarGroup/MyAvatarGroup";
import MyAvatar from "../../../components/Avatar/MyAvatar";
import AddTimeModal from "../../../components/Modal/AddTimeModal";
import LoggedTimeDetail from "../../../components/Modal/LoggedTimeDetail";
import ManagePeopleModal from "../../../components/Modal/ManagePeopleModal";
import EditCommentModal from "../../../components/Modal/EditCommentModal";
import textColorPicker from "../../../util/textColorPicker";
import isEqual from "lodash/isEqual";
import TaskDetailModal from "../../TaskPage/TaskDetailModal";

const normalizeStageTitle = (title = "") =>
  title.toLowerCase().trim().replace(/\s+/g, "-");

const withAlpha = (color, alpha, fallback = "rgba(148, 163, 184, 0.2)") => {
  if (!color) return fallback;

  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  const rgb = color.match(/\d+/g);
  if (rgb && rgb.length >= 3) {
    const [r, g, b] = rgb.map(Number);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return fallback;
};

const TasksTableView = ({
  tasks,
  showModalTaskModal,
  showEditTaskModal,
  selectedTask,
  deleteTasks,
  getProjectMianTask,
  getBoardTasks,
  updateTasks,
  updateBoardTaskLocally,
}) => {
  const companySlug = localStorage.getItem("companyDomain");
  
  const {
    dragged,
    onDragLeave,
    onDragEnter,
    onDragEnd,
    onDragOver,
    onDrop,
    onDragStart,
    getTaskByIdDetails,
    getTimeLogged,
    getComment,
    modalIsOpen,
    handleCancel,
    taskDetails,
    handleTaskDelete,
    estError,
    visible,
    popOver,
    popOverTimeLogged,
    openPopOver,
    isLoggedHoursMoreThanEstimated,
    textAreaValue,
    subscribersList,
    taggedUserList,
    activeClass,
    activeClass1,
    activeTab,
    comments,
    setOpenCommentModle,
    handleEditComment,
    deleteComment,
    handleDropdownClick,
    addComments,
    setTextAreaValue,
    isTextAreaFocused,
    setIsTextAreaFocused,
    taskHistory,
    handleToggle,
    storeIndex,
    showTaskHistory,
    isModalOpenTaskModal,
    handleCancelTaskModal,
    addform,
    handleTaskOps,
    taskdropdown,
    addInputTaskData,
    handleTaskInput,
    handleEstTimeInput,
    openCommentModel,
    handleCancelCommentModel,
    formComment,
    handleComments,
    commentVal,
    setCommentVal,
    handleSelect,
    fileAttachment,
    populatedFiles,
    removeAttachmentFile,
    attachmentfileRef,
    foldersList,
    onFileChange,
    onChange,
    handleTabChange,
    getTaskhistory,
    setTempBoard,
    tempBoard,
    projectWorkflowStage,
    isPopoverVisible,
    setIsPopoverVisible,
    handleTaskStatusClick,
    taskId,
    projectId,
    setIssuetitle,
    issuetitle,
    setIssuetitleflag,
    issuetitleflag,
    handleissuedata,
    issuedata,
    estHrsError,
    estMinsError,
    estHrs,
    estMins,
    selectedTaskStatusTitle,
    ManagePeople,
    clientsList,
    detailClientSubs,
    handleChange,
    managePeopleForm,
    handleManagePeople,
    isVisibleTime,
    setVisibleTime,
    columnDetails,
    expandedRowKey,
    setExpandedRowKey,
    setSelectedTaskId,
    commentListRef,
    handleChangedescription,
    editorData,
    handlePaste,
    handleCancelManagePeople,
    setDetailsClientSubs,
    deleteTime,
    viewTask,
    setViewTask,
    updateviewTask,
    newBugData,
    setNewBugData,
    handleSelectedLabelsChange,
    handleSelectedItemsChange,
    handleSearch,
    searchKeyword,
    assigneeOptions,
    projectLabels,
    editBug,
    deleteBug,
    addissue,
    updateBugWorkflow,
    bugWorkflowStatuses,
  } = TaskKanbanController({
    tasks,
    showModalTaskModal,
    showEditTaskModal,
    selectedTask,
    deleteTasks,
    getProjectMianTask,
    getBoardTasks,
    updateTasks,
    updateBoardTaskLocally,
  });

  const observer = useRef();
  const tableViewEditorRef = useRef(null);
  const [editingBugId, setEditingBugId] = useState(null);
  const [editingBugTitle, setEditingBugTitle] = useState("");
  const [editingBugCode, setEditingBugCode] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const [sliceState, setSliceState] = useState(6);

  useEffect(() => {
    setSliceState(6);
  }, [tasks]);

  const lastTaskElementRef = useCallback((node) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && node) {
        setSliceState((prevSliceState) => prevSliceState + 6);
      }
    });
    if (node) observer.current.observe(node);
  }, []);
  const [collapsedRows, setCollapsedRows] = useState({});

  const toggleCollapse = (statusId) => {
    setCollapsedRows((prev) => ({
      ...prev,
      [statusId]: !prev[statusId],
    }));
  };

  const handleCancelLoggedTime = () => {
    setVisibleTime(false);
  };

  return (
    <>
      <div className="tasks-table-view-wrapper">
        <div className="block-table-content new-block-table">
          <div className="ttv-card-layout">
            {tasks?.map((boardData, index) => (
              <div
                key={`${boardData._id}_${index}`}
                className={`ttv-status-group ${dragged ? "dragged-over" : ""}`}
                style={{ "--wm-col-border-color": boardData?.workflowStatus?.color || "#3b82f6" }}
                onDragLeave={(e) => onDragLeave(e)}
                onDragEnter={(e) => onDragEnter(e)}
                onDragEnd={(e) => onDragEnd(e)}
                onDragOver={(e) => onDragOver(e)}
                onDrop={(e) => onDrop(e, boardData.workflowStatus?._id)}
              >
                {/* Status group header */}
                <div
                  className="ttv-status-header"
                  onClick={() => toggleCollapse(boardData?.workflowStatus?._id)}
                >
                  <span
                    className="wm-col-title"
                    style={{ color: boardData?.workflowStatus?.color || "#3b82f6" }}
                  >
                    {boardData?.workflowStatus?.title}
                  </span>
                  <span
                    className="wm-col-count"
                    style={{
                      background: `${boardData?.workflowStatus?.color || "#3b82f6"}22`,
                      color: boardData?.workflowStatus?.color || "#3b82f6",
                      border: `1px solid ${boardData?.workflowStatus?.color || "#3b82f6"}55`,
                    }}
                  >
                    {boardData?.total_task}
                  </span>
                  {collapsedRows[boardData.workflowStatus?._id] ? (
                    <DownCircleOutlined />
                  ) : (
                    <UpCircleOutlined />
                  )}
                </div>

                {/* Task cards */}
                {!collapsedRows[boardData.workflowStatus?._id] && boardData?.total_task > 0 ? (
                  <div className="ttv-cards-list">
                    {boardData?.tasks?.map((item, cardIndex) => {
                      const isDoneColumn = boardData.workflowStatus?.title === "Done";
                      const isLastTask = cardIndex === boardData.tasks.slice(0, sliceState).length - 1;
                      return (
                        <div
                          className={`wm-task-card ${dragged ? "dragged" : ""}${isDoneColumn ? " wm-task-card-done" : ""}`}
                          key={item?._id}
                          id={item?._id}
                          draggable
                          onDragStart={(e) => onDragStart(e, item)}
                          onDragEnd={(e) => onDragEnd(e)}
                          ref={isLastTask ? lastTaskElementRef : null}
                          onDragLeave={(e) => onDragLeave(e)}
                          onDragEnter={(e) => onDragEnter(e)}
                          onDragOver={(e) => onDragOver(e)}
                          onDrop={(e) => onDrop(e, boardData.workflowStatus?._id)}
                        >
                          <div
                            className={`wm-task-box ${isDoneColumn ? "wm-task-box-done" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              getTaskByIdDetails(item?._id);
                              getComment(item?._id);
                              setTempBoard(boardData);
                              setSelectedTaskId(item?._id);
                            }}
                          >
                            {/* Labels */}
                            {item.task_labels?.length > 0 && (
                              <div className="wm-card-labels">
                                {item.task_labels.map((lbl) => (
                                  <span
                                    key={lbl._id}
                                    className="wm-card-label"
                                    style={{ background: lbl.color || "#e5e7eb", color: lbl.color ? "#fff" : "#374151" }}
                                  >
                                    {lbl.title}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Title */}
                            <div className="wm-card-title" style={{ textDecoration: isDoneColumn ? "line-through" : "none" }}>
                              {item.title}
                            </div>

                            {/* List name */}
                            {selectedTask?.title && (
                              <div className="wm-card-list">{selectedTask.title}</div>
                            )}

                            {/* Due date */}
                            <div
                              className="wm-card-due"
                              style={{ color: item.due_date && moment(item.due_date).isBefore(moment(), "day") ? "#f87171" : undefined }}
                            >
                              {item.due_date ? (
                                <>
                                  <i className="fa-regular fa-calendar-days" style={{ marginRight: 4 }}></i>
                                  {moment(item.due_date).format("MMM D, YYYY")}
                                </>
                              ) : "—"}
                            </div>

                            {/* Footer: assignees + progress */}
                            <div className="wm-card-footer">
                              <span className="wm-card-assignees">
                                {item.assignees?.length > 0
                                  ? item.assignees.map((a) => a.full_name).filter(Boolean).slice(0, 2).join(", ") || "Unassigned"
                                  : "Unassigned"}
                              </span>
                              <span className="wm-card-meta">
                                {item.task_progress || "0"}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : !collapsedRows[boardData.workflowStatus?._id] && (
                  <div className="ttv-no-data">No data Found</div>
                )}
              </div>
            ))}
          </div>
        </div>
        <TaskDetailModal
          open={modalIsOpen}
          onClose={() => {
            handleCancel();
            setSelectedTaskId(null);
            setIsEditMode(false);
            setEditingBugId(null);
          }}
          task={taskDetails}
          companySlug={companySlug}
          onOpenInProject={(url) => {
            window.location.href = url;
          }}
          // Bug tracking props
          bugs={issuedata}
          bugStatuses={bugWorkflowStatuses}
          onBugAdd={addissue}
          onBugDelete={deleteBug}
          onBugEdit={editBug}
          onBugStatusUpdate={updateBugWorkflow}
          issueTitle={issuetitle}
          onIssueTitleChange={setIssuetitle}
          newBugData={newBugData}
          onNewBugDataChange={setNewBugData}
          onIssueDataKeypress={handleissuedata}
          // Edit mode prop
          onUpdateTask={updateviewTask}
        />

        <AddTimeModal
          openModal={isModalOpenTaskModal}
          cancelModal={handleCancelTaskModal}
          formName={addform}
          onFinish={handleTaskOps}
          taskdropdown={taskdropdown}
          addInputTaskData={addInputTaskData}
          handleTaskInput={handleTaskInput}
          estHrs={estHrs}
          handleEstTimeInput={handleEstTimeInput}
          estHrsError={estHrsError}
          estMins={estMins}
          estMinsError={estMinsError}
          handleChangedescription={handleChangedescription}
          editorData={editorData}
          handlePaste={handlePaste}
          type="task"
        />

        <LoggedTimeDetail
          isVisibleTime={isVisibleTime}
          setVisibleTime={setVisibleTime}
          columnDetails={columnDetails}
          setExpandedRowKey={setExpandedRowKey}
          expandedRowKey={expandedRowKey}
          deleteTime={deleteTime}
          getTimeLogged={getTimeLogged}
          taskId={taskId}
          // setIsEditable={setIsEditable}
          getTaskByIdDetails={getTaskByIdDetails}
          getBoardTasks={getBoardTasks}
          onCancel={handleCancelLoggedTime}
          selectedTask={selectedTask}
        />

        <ManagePeopleModal
          open={ManagePeople}
          cancel={handleCancelManagePeople}
          formName={managePeopleForm}
          onFinish={handleManagePeople}
          subscribersList={subscribersList}
          clientsList={clientsList}
          type="task"
          onChange={handleChange}
          assignees={detailClientSubs?.assignees}
          clients={detailClientSubs?.clients}
          detailClientSubs={detailClientSubs}
          setDetailsClientSubs={setDetailsClientSubs}
        />

        <EditCommentModal
          open={openCommentModel}
          cancel={handleCancelCommentModel}
          formName={formComment}
          onFinish={handleComments}
          Mentionvalue={commentVal}
          onChange={setCommentVal}
          onSelect={handleSelect}
          fileAttachment={fileAttachment}
          populatedFiles={populatedFiles}
          removeAttachmentFile={removeAttachmentFile}
          attachmentfileRef={attachmentfileRef}
          foldersList={foldersList}
          onFileChange={onFileChange}
          setIsTextAreaFocused={setIsTextAreaFocused}
          userList={taggedUserList}
          setOpenCommentModle={setOpenCommentModle}
        />
      </div>
    </>
  );
};

export default React.memo(TasksTableView, (prevProps, nextProps) => {
  return isEqual(prevProps.tasks, nextProps.tasks);
});
