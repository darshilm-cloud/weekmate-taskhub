import React, { useMemo } from "react";
import "./tasktableview.css";
import { Table } from "antd";
import "../style.css";
import moment from "moment";
import TaskKanbanController from "../TasksKanbanBoard/TaskKanbanController";
import AddTimeModal from "../../../components/Modal/AddTimeModal";
import LoggedTimeDetail from "../../../components/Modal/LoggedTimeDetail";
import ManagePeopleModal from "../../../components/Modal/ManagePeopleModal";
import EditCommentModal from "../../../components/Modal/EditCommentModal";
import { isEqual } from "lodash";
import TaskDetailModal from "../../TaskPage/TaskDetailModal";

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
    getTaskByIdDetails,
    getTimeLogged,
    getComment,
    modalIsOpen,
    handleCancel,
    taskDetails,
    subscribersList,
    taggedUserList,
    setOpenCommentModle,
    setIsTextAreaFocused,
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
    setTempBoard,
    taskId,
    setIssuetitle,
    issuetitle,
    handleissuedata,
    issuedata,
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
    handleChangedescription,
    editorData,
    handlePaste,
    handleCancelManagePeople,
    setDetailsClientSubs,
    deleteTime,
    updateviewTask,
    newBugData,
    setNewBugData,
    editBug,
    deleteBug,
    addissue,
    updateBugWorkflow,
    bugWorkflowStatuses,
    estHrsError,
    estMinsError,
    estHrs,
    estMins,
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

  const handleCancelLoggedTime = () => {
    setVisibleTime(false);
  };

  const rows = useMemo(() => {
    const grouped = Array.isArray(tasks) ? tasks : [];
    return grouped.flatMap((board) =>
      (board?.tasks || []).map((task) => ({
        ...task,
        _boardData: board,
        _workflowStatus: board?.workflowStatus,
      }))
    );
  }, [tasks]);

  const columns = useMemo(() => {
    return [
      {
        title: "Card",
        dataIndex: "title",
        key: "title",
        render: (value, record) => (
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
          const ws = record?._workflowStatus;
          const title = ws?.title || record?.task_status?.title || "—";
          const color = ws?.color || record?.task_status?.color || "#94a3b8";
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
          const labels = Array.isArray(record?.task_labels) ? record.task_labels : [];
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
        render: (due) => {
          if (!due) return <span className="ttv-muted">—</span>;
          const isOverdue = moment(due).isBefore(moment(), "day");
          return (
            <span className={isOverdue ? "ttv-due overdue" : "ttv-due"}>
              {moment(due).format("DD-MM-YYYY")}
            </span>
          );
        },
      },
    ];
  }, []);

  return (
    <>
      <div className="tasks-table-view-wrapper">
        <div className=" new-block-table">
          <div className="ttv-table-card">
            <Table
              className="ttv-table"
              columns={columns}
              dataSource={rows}
              rowKey={(r) => r?._id}
              pagination={false}
              sticky
              size="small"
              scroll={{ x: true, y: "calc(100vh - 330px)" }}
              rowClassName={() => "ttv-row"}
              onRow={(record) => ({
                onClick: () => {
                  if (!record?._id) return;
                  void getTaskByIdDetails(
                    record._id,
                    {
                      projectId: record?.project_id || record?.project?._id,
                      mainTaskId:
                        record?.main_task_id ||
                        record?.main_task?._id ||
                        selectedTask?._id,
                    },
                    false
                  );
                  getComment(record._id);
                  setTempBoard(record._boardData || {});
                  setSelectedTaskId(record._id);
                },
              })}
            />
          </div>
        </div>
        <TaskDetailModal
          open={modalIsOpen}
          onClose={() => {
            handleCancel();
            setSelectedTaskId(null);
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
