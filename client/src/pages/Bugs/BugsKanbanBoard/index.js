/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, eqeqeq, jsx-a11y/anchor-is-valid, no-useless-concat */
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import BugDetailModal from "../BugDetailModal";
import moment from "moment";
import {
  PlusOutlined,
  PaperClipOutlined,
  TagOutlined,
  DownOutlined,
  UserAddOutlined,
  CalendarOutlined,
  DeleteOutlined,
  MoreOutlined,
  CloseCircleOutlined,
  EditOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { fileImageSelect } from "../../../util/FIleSelection";
import AddComment from "../../../ReuseComponent/AddComment/AddComment";
import {
  Avatar,
  Button,
  Tooltip,
  Input,
  Modal,
  Badge,
  Dropdown,
  DatePicker,
  Menu,
  Select,
  Popover,
  Form,
  Checkbox,
  Popconfirm,
} from "antd";
import dayjs from "dayjs";
import BugsKanbanController from "./BugsKanbanController";
import { getRoles, hasPermission } from "../../../util/hasPermission";
import useUserColors from "../../../hooks/customColor";
import config from "../../../settings/config.json";
import { isCreatedBy } from "../../../util/isCreatedBy";
import { calculateTimeDifference } from "../../../util/formatTimeDifference";
import { removeTitle } from "../../../util/nameFilter";
import MyAvatar from "../../../components/Avatar/MyAvatar";
import EditCommentModal from "../../../components/Modal/EditCommentModal";
import AddTimeModal from "../../../components/Modal/AddTimeModal";
import MultiSelect from "../../../components/CustomSelect/MultiSelect";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import { setData } from "../../../appRedux/reducers/ApiData";
import { useDispatch } from "react-redux";
import { hasBugCommentDraft } from "../../../cacheDB";

const BugList = ({
  tasks,
  showModalTaskModal,
  showEditTaskModal,
  getBoardTasks,
  boardTasksBugs,
  selectedTask,
  deleteTasks,
  projectId,
}) => {

  const {
    dragged,
    onDragLeave,
    onDragEnter,
    onDragEnd,
    onDragOver,
    onDrop,
    showTextArea,
    setShowTextArea,
    getTaskByIdDetails,
    getComment,
    modalIsOpen,
    handleCancel,
    taskDetails,
    viewBug,
    isEditable,
    handleTaskDelete,
    estError,
    visible,
    popOver,
    openPopOver,
    isLoggedHoursMoreThanEstimated,
    onChange,
    activeClass,
    activeClass1,
    activeTab,
    comments,
    handleEditComment,
    deleteComment,
    handleDropdownClick,
    addComments,
    setTextAreaValue,
    isTextAreaFocused,
    setIsTextAreaFocused,
    textAreaValue,
    subscribersList,
    employeeList,
    taggedUserList,
    taskHistory,
    showTaskHistory,
    handleToggle,
    storeIndex,
    addform,
    taskdropdown,
    Option,
    addInputTaskData,
    handleTaskInput,
    handleEstTimeInput,
    openCommentModel,
    setCommentVal,
    handleSelect,
    commentVal,
    fileAttachment,
    populatedFiles,
    removeAttachmentFile,
    foldersList,
    attachmentfileRef,
    onFileChange,
    isModalOpenTaskModal,
    onDragStart,
    handleTabChange,
    getBughistory,
    setOpenCommentModle,
    handleCancelTaskModal,
    handleTaskOps,
    formComment,
    handleComments,
    setTempBoard,
    tempBoard,
    bugWorkFlowStatusList,
    isPopoverVisible,
    setIsPopoverVisible,
    handleBugStatusClick,
    bugId,
    estHrsError,
    estMinsError,
    estHrs,
    estMins,
    selectedBugStatusTitle,
    selectedBugStatusColor,
    currDate,
    setSelectedBugId,
    commentListRef,
    handleCancelCommentModel,
    handleChangedescription,
    editorData,
    handlePaste,
    handleViewBug,
    handleFieldClick,
    handleEstTimeViewInput,
    handleSearch,
    handleSelectedItemsChange,
    handleSelectedLabelsChange,
    searchKeyword,
    projectLabels,
    removeAttachmentViewFile,
    populatedViewFiles,
    fileViewAttachment,
    onFileViewChange,
    attachmentViewfileRef,
    setIsEditable,
    setPopulatedFiles,
    deleteFileData,
    setDeleteFileData,
    updateviewBug,
  } = BugsKanbanController({
    tasks,
    showModalTaskModal,
    showEditTaskModal,
    getBoardTasks,
    boardTasksBugs,
    selectedTask,
    deleteTasks,
  });

  const dispatch = useDispatch();
  const userColors = useUserColors(comments);

  const [editorInstance, setEditorInstance] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});

  useEffect(() => {
    const loadDrafts = async () => {
      const draftPromises = tasks.flatMap((board) =>
        board.bugs.map(async (bug) => {
          const hasDraft = await hasBugCommentDraft(bug._id);
          if (hasDraft) {
            setCommentDrafts((prev) => ({
              ...prev,
              [bug._id]: true,
            }));
          }
        })
      );

      await Promise.all(draftPromises);
    };

    loadDrafts();
  }, [tasks]);

  const handleDraftChange = async (bugId, hasDraft) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [bugId]: hasDraft,
    }));
  };

  const bugColColor = (title, fallback) => {
    const t = (title || "").toLowerCase();
    if (t.includes("open"))       return "#3b82f6";
    if (t.includes("progress"))   return "#f59e0b";
    if (t.includes("test"))       return "#22c55e";
    if (t.includes("hold"))       return "#8b5cf6";
    if (t.includes("close"))      return "#ef4444";
    return fallback || "#3b82f6";
  };

  return (
    <>
      <div className="container project-task-section">
        {tasks.map((boardData, index) => {
          const colColor = bugColColor(boardData.title, boardData.color);
          return (
          <div
            key={boardData._id}
            className={`order small-box ${dragged ? "dragged-over" : ""}`}
            style={{ "--wm-col-border-color": colColor }}
            onDragLeave={(e) => onDragLeave(e)}
            onDragEnter={(e) => onDragEnter(e)}
            onDragEnd={(e) => onDragEnd(e)}
            onDragOver={(e) => onDragOver(e)}
            onDrop={(e) => onDrop(e, boardData?._id)}
          >
            <section className="drag_container">
              <div className="container project-task-list">
                <div className="drag_column">
                  <h4>
                    <span className="wm-col-title" style={{ color: colColor }}>
                      {boardData.title}
                    </span>
                    <span
                      className="wm-col-count"
                      style={{
                        background: "transparent",
                        color: colColor,
                        border: `1.5px solid ${colColor}`,
                      }}
                    >
                      {boardData.bugs.length}
                    </span>
                  </h4>
                  

                  <div className="drag_row">
                    {showTextArea && index == 0 && (
                      <div className="project-add-task">
                        <Input.TextArea
                          autoFocus
                          rows={4}
                          onClick={() => setShowTextArea(false)}
                          placeholder="add task and hit enter key"
                        />
                        <div className="project-task-icons">
                          <CalendarOutlined />
                          <div className="project-task-inner-icon">
                            <TagOutlined />
                            <UserAddOutlined />
                            <PaperClipOutlined />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="kanbanView-bugs-data">
                      {boardData.bugs.length === 0 && (
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "40px 16px",
                          opacity: 0.45,
                        }}>
                          <i className="fi fi-rr-bug" style={{ fontSize: "32px", marginBottom: "10px" }} />
                          <span style={{ fontSize: "13px" }}>No bugs here</span>
                        </div>
                      )}
                      {boardData.bugs.map((task) => (
                        <div
                          className={`wm-task-card ${dragged ? "dragged" : ""}${boardData?.title === "Closed" ? " wm-task-card-done" : ""}`}
                          key={task._id}
                          id={task._id}
                          draggable
                          onDragStart={(e) => onDragStart(e)}
                          onDragEnd={(e) => onDragEnd(e)}
                          style={{ position: "relative" }}
                        >
                          <div
                            className={`wm-task-box ${boardData?.title === "Closed" ? "wm-task-box-done" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              getTaskByIdDetails(task._id);
                              getComment(task._id);
                              setTempBoard(boardData);
                              setSelectedBugId(task._id);
                            }}
                          >
                            {/* Labels */}
                            {task.bug_labels?.length > 0 && (
                              <div className="wm-card-labels">
                                {task.bug_labels.map((item) => (
                                  <span
                                    key={item._id}
                                    className="wm-card-label"
                                    style={{
                                      background: item.color || "#e5e7eb",
                                      color: item.color ? "#fff" : "#374151",
                                    }}
                                  >
                                    {item.title}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Title */}
                            <div
                              className="wm-card-title"
                              id={`bug-${task._id}`}
                              style={{
                                textDecoration: boardData?.title === "Closed" ? "line-through" : "none",
                              }}
                            >
                              {task.title}
                            </div>

                            {/* Project name */}
                            {selectedTask?.title && (
                              <div className="wm-card-list">{selectedTask.title}</div>
                            )}

                            {/* Due date */}
                            <div
                              className="wm-card-due"
                              style={{
                                color: task.due_date && moment(task.due_date).isBefore(currDate, "day") ? "#f87171" : undefined,
                              }}
                            >
                              {task.due_date ? (
                                <>
                                  <i className="fa-regular fa-calendar-days" style={{ marginRight: 4 }}></i>
                                  {moment(task.due_date).format("MMM D, YYYY")}
                                </>
                              ) : "—"}
                            </div>

                            {/* Footer: assignees + progress */}
                            <div className="wm-card-footer">
                              <span className="wm-card-assignees">
                                {task.assignees?.length > 0
                                  ? task.assignees.map((a) => a.full_name).filter(Boolean).slice(0, 2).join(", ")
                                  : "Unassigned"}
                              </span>
                              <span className="wm-card-meta">
                                {task.progress || "0"}%
                              </span>
                            </div>

                          </div>
                          {/* Checkbox + 3-dot menu */}
                          <div>
                            <input
                              type="checkbox"
                              style={{
                                position: "absolute",
                                top: "17px",
                                right: "34px",
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                              }}
                            />
                            <Dropdown
                              overlay={
                                <Menu>
                                  {hasPermission(["bug_edit"]) && (
                                    <Menu.Item
                                      onClick={(e) => {
                                        e.domEvent.stopPropagation();
                                        getTaskByIdDetails(task._id, {
                                          editFlag: true,
                                          boardID: boardData?._id,
                                        });
                                      }}
                                    >
                                      <EditOutlined style={{ color: "green" }} /> Edit
                                    </Menu.Item>
                                  )}
                                  {hasPermission(["bug_delete"]) && (
                                    <Popconfirm
                                      title="Are you sure you want to delete this bug?"
                                      onConfirm={() => handleTaskDelete(task._id)}
                                      okText="Yes"
                                      cancelText="No"
                                    >
                                      <Menu.Item className="ant-delete" onClick={(e) => e.domEvent.stopPropagation()}>
                                        <DeleteOutlined style={{ color: "red" }} /> Delete
                                      </Menu.Item>
                                    </Popconfirm>
                                  )}
                                </Menu>
                              }
                              trigger={["click"]}
                            >
                              <a
                                style={{
                                  position: "absolute",
                                  top: "14px",
                                  right: "10px",
                                  display: "flex",
                                  alignItems: "center",
                                  color: "#94a3b8",
                                }}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              >
                                <MoreOutlined style={{ fontSize: "16px" }} />
                              </a>
                            </Dropdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
          );
        })}
      </div>      <BugDetailModal
        open={modalIsOpen && taggedUserList.length > 0}
        onCancel={() => {
          dispatch(setData({ stateName: "taggedUserList", data: [] }));
          handleCancel();
          setSelectedBugId(null);
          setOpenCommentModle(false);
          setTextAreaValue("");
          setIsEditable({
            title: false,
            proj_description: false,
            start_date: true,
            end_date: true,
            taskLabels: false,
            assignees: false,
            estimated_time: false,
          });
        }}
        taskDetails={taskDetails}
        comments={comments}
        taskHistory={taskHistory}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        getComment={getComment}
        getBughistory={getBughistory}
        handleBugStatusClick={handleBugStatusClick}
        bugWorkFlowStatusList={bugWorkFlowStatusList}
        isPopoverVisible={isPopoverVisible}
        setIsPopoverVisible={setIsPopoverVisible}
        selectedBugStatusTitle={selectedBugStatusTitle}
        selectedBugStatusColor={selectedBugStatusColor}
        handleTaskDelete={handleTaskDelete}
        hasPermission={hasPermission}
        isEditable={isEditable}
        setIsEditable={setIsEditable}
        viewBug={viewBug}
        handleViewBug={handleViewBug}
        handleFieldClick={handleFieldClick}
        handleEstTimeViewInput={handleEstTimeViewInput}
        estHrsError={estHrsError}
        estMinsError={estMinsError}
        subscribersList={subscribersList}
        employeeList={employeeList}
        projectLabels={projectLabels}
        handleSearch={handleSearch}
        handleSelectedItemsChange={handleSelectedItemsChange}
        handleSelectedLabelsChange={handleSelectedLabelsChange}
        searchKeyword={searchKeyword}
        isLoggedHoursMoreThanEstimated={isLoggedHoursMoreThanEstimated}
        visible={visible}
        popOver={popOver}
        openPopOver={openPopOver}
        estError={estError}
        fileViewAttachment={fileViewAttachment}
        populatedViewFiles={populatedViewFiles}
        removeAttachmentViewFile={removeAttachmentViewFile}
        onFileViewChange={onFileViewChange}
        attachmentViewfileRef={attachmentViewfileRef}
        projectId={projectId}
        getBoardTasks={getBoardTasks}
        addComments={addComments}
        setTextAreaValue={setTextAreaValue}
        isTextAreaFocused={isTextAreaFocused}
        setIsTextAreaFocused={setIsTextAreaFocused}
        textAreaValue={textAreaValue}
        taggedUserList={taggedUserList}
        handleTaskOps={handleTaskOps}
        addform={addform}
        formComment={formComment}
        bugId={bugId}
        updateviewBug={updateviewBug}
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
        type="bug"
      />

      <EditCommentModal
        open={false}
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
      />
    </>
  );
};

BugList.propTypes = {
  tasks: PropTypes.array.isRequired,
  showModalTaskModal: PropTypes.func.isRequired,
  showEditTaskModal: PropTypes.func.isRequired,
  getBoardTasks: PropTypes.func.isRequired,
  selectedTask: PropTypes.object.isRequired,
  deleteTasks: PropTypes.func.isRequired,
};
export default BugList;
