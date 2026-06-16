/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo } from "react";
import moment from "moment";
import { Table } from "antd";
import "../../Tasks/TasksTableView/tasktableview.css";
import "../../Tasks/style.css";
import BugsKanbanController from "../BugsKanbanBoard/BugsKanbanController";
import BugDetailModal from "../BugDetailModal";
import EditCommentModal from "../../../components/Modal/EditCommentModal";
import AddTimeModal from "../../../components/Modal/AddTimeModal";
import { hasPermission } from "../../../util/hasPermission";

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
    activeTab,
    comments,
    addComments,
    setTextAreaValue,
    isTextAreaFocused,
    setIsTextAreaFocused,
    textAreaValue,
    taggedUserList,
    taskHistory,
    addform,
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
    isModalOpenTaskModal,
    handleTabChange,
    getBughistory,
    handleCancelTaskModal,
    handleTaskOps,
    setTempBoard,
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
    isEditable,
    setIsEditable,
    viewBug,
    handleViewBug,
    handleFieldClick,
    handleEstTimeViewInput,
    handleChangedescription,
    editorData,
    handlePaste,
    updateviewBug,
    isUpdatingBug,
    isAddingLoggedHours,
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

  const rows = useMemo(() => {
    const grouped = Array.isArray(tasks) ? tasks : [];
    return grouped.flatMap((board) =>
      (board?.bugs || []).map((bug) => ({
        ...bug,
        _boardBugsRef: board?.bugs || [],
        _bugStatus: Array.isArray(bug?.bug_status_details) ? bug.bug_status_details[0] : null,
      }))
    );
  }, [tasks]);

  const columns = useMemo(() => {
    return [
      {
        title: "Card",
        dataIndex: "title",
        key: "title",
        render: (value) => (
          <div className="ttv-title-cell">
            <div className="ttv-title" title={value}>
              {value || "—"}
            </div>
          </div>
        ),
      },
      {
        title: "List",
        key: "list",
        width: 160,
        render: (_, record) => {
          const st = record?._bugStatus;
          const title = st?.title || record?.bug_status || "—";
          const color = st?.color || "#94a3b8";
          return (
            <span className="ttv-list-cell" title={title}>
              <span className="ttv-status-dot" style={{ background: color }} />
              <span className="ttv-list-title">{title}</span>
            </span>
          );
        },
      },
      {
        title: "Labels",
        key: "labels",
        width: 220,
        render: (_, record) => {
          const labels = Array.isArray(record?.bug_labels) ? record.bug_labels : [];
          if (labels.length === 0) return <span className="ttv-muted">—</span>;
          return (
            <div className="ttv-labels">
              {labels.slice(0, 3).map((lbl) => (
                <span
                  key={lbl?._id || lbl?.title}
                  className="ttv-label"
                  style={{
                    borderColor: lbl?.color || "#e2e8f0",
                    background: lbl?.color ? `${lbl.color}1a` : "#f8fafc",
                    color: lbl?.color || "#64748b",
                  }}
                  title={lbl?.title}
                >
                  <span className="ttv-label-dot" style={{ background: lbl?.color || "#94a3b8" }} />
                  {lbl?.title}
                </span>
              ))}
              {labels.length > 3 ? <span className="ttv-muted">+{labels.length - 3}</span> : null}
            </div>
          );
        },
      },
      {
        title: "Members",
        dataIndex: "assignees",
        key: "assignees",
        width: 140,
        render: (assignees) => {
          const list = Array.isArray(assignees) ? assignees : [];
          if (list.length === 0) return <span className="ttv-muted">—</span>;
          const names = list
            .map((a) => a?.full_name || a?.name || a?.email || "")
            .map((n) => String(n || "").trim())
            .filter(Boolean);
          const shown = names.slice(0, 2).join(", ");
          const extra = names.length > 2 ? ` +${names.length - 2}` : "";
          return <span className="ttv-members-text" title={names.join(", ")}>{shown || "—"}{extra}</span>;
        },
      },
      {
        title: "Due date",
        dataIndex: "due_date",
        key: "due_date",
        width: 130,
        align: "right",
        render: (due, record) => {
          if (!due) return <span className="ttv-muted">—</span>;
          const statusLower = String(record?._bugStatus?.title || record?.bug_status || "").toLowerCase();
          const isOverdue = moment(due).isBefore(moment(), "day") && !statusLower.includes("closed");
          return <span className={isOverdue ? "ttv-due overdue" : "ttv-due"}>{moment(due).format("DD-MM-YYYY")}</span>;
        },
      },
    ];
  }, []);

  return (
    <>
      <div className="tasks-table-view-wrapper">
        <div className="block-table-content new-block-table">
          <div className="ttv-table-card">
            <Table
              className="ttv-table"
              columns={columns}
              dataSource={rows}
              rowKey={(r) => r?._id || `${r?.title}-${r?.due_date || ""}`}
              pagination={false}
              sticky
              size="small"
              scroll={{ x: true, y: "calc(100vh - 330px)" }}
              rowClassName={() => "ttv-row"}
              onRow={(record) => ({
                onClick: () => {
                  getTaskByIdDetails(record._id);
                  getComment(record._id);
                  setTempBoard(record._boardBugsRef || []);
                  setSelectedBugId(record._id);
                },
              })}
            />
          </div>
        </div>
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
        loading={isUpdatingBug}
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
        loading={isAddingLoggedHours}
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
    </>
  );
};

export default BugsTable;
