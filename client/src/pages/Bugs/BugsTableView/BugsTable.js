/* eslint-disable no-useless-concat */
import BugsKanbanController from "../BugsKanbanBoard/BugsKanbanController";
import React, { useState } from "react";
import BugDetailModal from "../BugDetailModal";
import moment from "moment";
import {
  DownOutlined,
  DeleteOutlined,
  MoreOutlined,
  EditOutlined,
  RightOutlined,
  DownCircleOutlined,
  UpCircleOutlined,
} from "@ant-design/icons";
import "./bugstableview.css";
import { fileImageSelect } from "../../../util/FIleSelection";
import AddComment from "../../../ReuseComponent/AddComment/AddComment";
import {
  Avatar,
  Button,
  Tooltip,
  Modal,
  Badge,
  Dropdown,
  DatePicker,
  Menu,
  Popover,
  Checkbox,
  Popconfirm,
} from "antd";
import dayjs from "dayjs";
import { hasPermission } from "../../../util/hasPermission";
import useUserColors from "../../../hooks/customColor";
import config from "../../../settings/config.json";
import { isCreatedBy } from "../../../util/isCreatedBy";
import { calculateTimeDifference } from "../../../util/formatTimeDifference";
import { removeTitle } from "../../../util/nameFilter";
import MyAvatar from "../../../components/Avatar/MyAvatar";
import EditCommentModal from "../../../components/Modal/EditCommentModal";
import AddTimeModal from "../../../components/Modal/AddTimeModal";
import MyAvatarGroup from "../../../components/AvatarGroup/MyAvatarGroup";

const BugsTable = ({
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
    getTaskByIdDetails,
    getComment,
    modalIsOpen,
    handleCancel,
    taskDetails,
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
    taggedUserList,
    taskHistory,
    showTaskHistory,
    handleToggle,
    storeIndex,
    addform,
    taskdropdown,
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
    setSelectedBugId,
    commentListRef,
    handleCancelCommentModel,
    handleChangedescription,
    editorData,
    handlePaste,
    // Add missing handlers for inline editing
    isEditable,
    setIsEditable,
    viewBug,
    handleViewBug,
    handleFieldClick,
    handleEstTimeViewInput,
    subscribersList,
    employeeList,
    projectLabels,
    handleSearch,
    handleSelectedItemsChange,
    handleSelectedLabelsChange,
    searchKeyword,
    fileViewAttachment,
    populatedViewFiles,
    removeAttachmentViewFile,
    onFileViewChange,
    attachmentViewfileRef,
    updateviewBug,
  } = BugsKanbanController({
    tasks,
    showModalTaskModal,
    showEditTaskModal,
    getBoardTasks,
    boardTasksBugs,
    selectedTask,
    deleteTasks,
    projectId,
  });

  const [collapsedRows, setCollapsedRows] = useState({});

  const toggleCollapse = (taskId) => {
    setCollapsedRows((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  return (
    <>
      <div className="bugs-table-view-wrapper">
        <div className="block-table-content new-block-table">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Title</th>
                <th className="data-table-fix-width">Start Date</th>
                <th className="data-table-fix-width">Due Date</th>
                <th className="data-table-fix-width">Stage</th>
                <th className="data-table-fix-width">Assignees</th>
                <th className="data-table-fix-width">Labels</th>
              </tr>
            </thead>
            <tbody>
              {tasks?.map((item) => (
                <React.Fragment key={item?._id}>
                  <tr
                    className={`order small-box ${
                      dragged ? "dragged-over" : ""
                    }`}
                    onDragLeave={(e) => onDragLeave(e)}
                    onDragEnter={(e) => onDragEnter(e)}
                    onDragEnd={(e) => onDragEnd(e)}
                    onDragOver={(e) => onDragOver(e)}
                    onDrop={(e) => onDrop(e, item?._id)}
                  >
                    <td
                      colSpan="7"
                      className="project-title"
                      onClick={() => toggleCollapse(item?._id)}
                    >
                      <h3>
                        {collapsedRows[item._id] ? (
                          <DownCircleOutlined />
                        ) : (
                          <UpCircleOutlined />
                        )}
                        {item?.title}
                        <span>{"    (" + item?.bugs.length + ")"}</span>
                      </h3>
                    </td>
                  </tr>

                  {!collapsedRows[item._id] && item?.bugs.length > 0
                    ? item?.bugs.map((bug) => (
                        <tr
                          className={`card ${dragged ? "dragged" : ""}`}
                          key={bug._id}
                          id={`bug-${bug._id}`}
                          style={{
                            cursor: "pointer",
                            background: bug.title === "Closed" && "#cffdcf",
                          }}
                          draggable
                          onDragStart={(e) => onDragStart(e)}
                          onDragEnd={(e) => onDragEnd(e)}
                          onClick={() => {
                            getTaskByIdDetails(bug._id);
                            getComment(bug._id);
                            setTempBoard(item?.bugs);
                            setSelectedBugId(bug._id);
                          }}
                          onDragOver={(e) => onDragOver(e)}
                          onDrop={(e) => onDrop(e, item?._id)}
                        >
                          <td>
                            <span className="bug-title">{bug.title}</span>
                            <Tooltip title="Comments" placement="left">
                            <span className="table-task-comments-count">
                              {bug?.comments}
                            </span>
                            </Tooltip>
                            
                          </td>
                          <td>
                            {bug.start_date
                              ? new Date(bug.start_date).toLocaleDateString()
                              : "-"}
                          </td>
                          <td>
                            {bug.due_date
                              ? new Date(bug.due_date).toLocaleDateString()
                              : "-"}
                          </td>
                          {bug.bug_status_details?.map((status) => (
                            <td
                              key={status._id}
                              style={{
                                background: status.color,
                                color: "white",
                              }}
                            >
                              {status.title}
                            </td>
                          ))}
                          <td>
                            <MyAvatarGroup
                              record={bug?.assignees.map((ele) => {
                                let obj = {
                                  ...ele,
                                  name: ele?.full_name,
                                };
                                return obj;
                              })}
                              size={"small"}
                              customStyle={{ height: "20px", width: "20px" }}
                            />
                          </td>
                          <td>
                            {bug.bug_labels.map((label) => (
                              <span
                                className="highlabel"
                                key={label._id}
                                style={{ backgroundColor: label?.color }}
                              >
                                {label.title}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))
                    : !collapsedRows[item._id] && (
                        <tr>
                                 <td colSpan={6} style={{textAlign:"center"}}>No data Found
                            </td> 
                        </tr>
                      )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <BugDetailModal
          open={modalIsOpen}
          onCancel={() => {
            handleCancel();
            setSelectedBugId(null);
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
        />
      </div>
    </>
  );
}

export default BugsTable;
