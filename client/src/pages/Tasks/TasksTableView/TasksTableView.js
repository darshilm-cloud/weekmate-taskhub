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
  Modal,
  Dropdown,
  DatePicker,
  Tooltip,
  Menu,
  Popover,
  Badge,
  Popconfirm,
} from "antd";
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

const TasksTableView = ({
  tasks,
  showModalTaskModal,
  showEditTaskModal,
  selectedTask,
  deleteTasks,
  getProjectMianTask,
  getBoardTasks,
  updateTasks,
}) => {
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
    Option,
    setTempBoard,
    tempBoard,
    projectWorkflowStage,
    isPopoverVisible,
    setIsPopoverVisible,
    handleTaskStatusClick,
    taskId,
    projectId,
    setIssuetitle,
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
  } = TaskKanbanController({
    tasks,
    showModalTaskModal,
    showEditTaskModal,
    selectedTask,
    deleteTasks,
    getProjectMianTask,
    getBoardTasks,
    updateTasks,
  });

  const observer = useRef();
  const userColors = useUserColors(comments);

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
              {tasks?.map((boardData, index) => (
                <React.Fragment key={`${boardData._id}_${index}`}>
                  <tr
                    className={`order small-box ${
                      dragged ? "dragged-over" : ""
                    }`}
                    onDragLeave={(e) => onDragLeave(e)}
                    onDragEnter={(e) => onDragEnter(e)}
                    onDragEnd={(e) => onDragEnd(e)}
                    onDragOver={(e) => onDragOver(e)}
                    onDrop={(e) => onDrop(e, boardData.workflowStatus._id)}
                  >
                    <td
                      colSpan="8"
                      className="project-title"
                      onClick={() =>
                        toggleCollapse(boardData.workflowStatus._id)
                      }
                    >
                      <h3>
                        {collapsedRows[boardData.workflowStatus._id] ? (
                          <DownCircleOutlined />
                        ) : (
                          <UpCircleOutlined />
                        )}
                        {boardData?.workflowStatus?.title}
                        <span>{"    (" + boardData?.total_task + ")"}</span>
                      </h3>
                    </td>
                  </tr>

                  {!collapsedRows[boardData.workflowStatus._id] &&
                  boardData?.total_task > 0
                    ? boardData?.tasks?.map((item, cardIndex) => {
                        const isLastTask =
                          cardIndex ===
                          boardData.tasks.slice(0, sliceState).length - 1;
                        return (
                          <tr
                            className={`card ${dragged ? "dragged" : ""}`}
                            key={item?._id}
                            id={item?._id}
                            draggable
                            onDragStart={(e) => onDragStart(e, item)}
                            onDragEnd={(e) => onDragEnd(e)}
                            ref={isLastTask ? lastTaskElementRef : null}
                            onClick={(e) => {
                              e.stopPropagation();
                              getTaskByIdDetails(item._id);
                              getComment(item._id);
                              setTempBoard(boardData);
                              setSelectedTaskId(item._id);
                            }}
                            onDragLeave={(e) => onDragLeave(e)}
                            onDragEnter={(e) => onDragEnter(e)}
                            onDragOver={(e) => onDragOver(e)}
                            onDrop={(e) =>
                              onDrop(e, boardData.workflowStatus._id)
                            }
                          >
                            <td>
                              <span className="bug-title"> {item?.title} </span>
                              <Tooltip title="Comments" placement="left">
                                <span className="table-task-comments-count">
                                  {item?.comments}
                                </span>
                              </Tooltip>
                            </td>
                            <td>
                              {item?.start_date
                                ? new Date(
                                    item?.start_date
                                  ).toLocaleDateString()
                                : "-"}
                            </td>
                            <td>
                              {item?.due_date
                                ? new Date(item?.due_date).toLocaleDateString()
                                : "-"}
                            </td>
                            <td
                              style={{
                                background: `${boardData?.workflowStatus?.color}`,
                                color: textColorPicker(
                                  boardData?.workflowStatus?.color
                                ),
                              }}
                            >
                              {boardData?.workflowStatus?.title}
                            </td>

                            <td>
                              <MyAvatarGroup
                                record={item.assignees.map((ele) => {
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
                              {" "}
                              {item?.task_labels.map((t) => {
                                return (
                                  <span
                                    className="highlabel"
                                    style={{ background: t.color }}
                                  >
                                    {t.title}
                                  </span>
                                );
                              })}
                            </td>
                          </tr>
                        );
                      })
                    : !collapsedRows[boardData.workflowStatus._id] && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center" }}>
                            No data Found
                          </td>
                        </tr>
                      )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <Modal
          className="task-detail-popup"
          open={modalIsOpen}
          width={1000}
          footer={null}
          onCancel={() => {
            handleCancel();
            setSelectedTaskId(null);
          }}
        >
          <div className="task-detail-panel task-model">
            <div className="left-task-detail-panel">
              <div className="head-toolbar">
                <div className="status-button">
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    visible={isPopoverVisible}
                    onVisibleChange={setIsPopoverVisible}
                    content={
                      <div className="assignees-popover stages-task-popover">
                        <ul
                          className="workflow-stages-task-main-wrapper"
                          style={{ paddingLeft: "0px !important" }}
                        >
                          {projectWorkflowStage.map((item) => (
                            <div
                              className="workflow-stages-task"
                              key={item._id}
                              style={{
                                display: "flex",
                                cursor: "pointer",
                                justifyContent: "space-between",
                                gap: "20px !important",
                              }}
                            >
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "10px",
                                    height: "10px",
                                    backgroundColor: `${item.color}`,
                                    borderRadius: "50%",
                                  }}
                                ></div>
                                <div
                                  onClick={() =>
                                    handleTaskStatusClick(item._id, taskId)
                                  }
                                >
                                  {item.title}
                                </div>
                              </span>
                              {selectedTaskStatusTitle === item.title && (
                                <span style={{ float: "right" }}>
                                  <i class="fi fi-br-check"></i>
                                </span>
                              )}
                            </div>
                          ))}
                        </ul>
                      </div>
                    }
                  >
                    <Button className="done-btn">
                      <i
                        className="fi fi-ss-check-circle"
                        style={{ color: taskDetails?.task_status?.color }}
                      ></i>
                      {selectedTaskStatusTitle ||
                        taskDetails?.task_status?.title}
                    </Button>
                  </Popover>

                  <span>{taskDetails?.taskId}</span>
                </div>
                <div className="task-editbtn">
                  {hasPermission(["task_edit"]) && (
                    <EditOutlined
                      style={{ color: "green" }}
                      onClick={() => {
                        getTaskByIdDetails(taskDetails?._id, {
                          editFlag: true,
                          boardID: tempBoard?.workflowStatus._id,
                        });
                      }}
                    />
                  )}
                  {hasPermission(["task_delete"]) && (
                    <Popconfirm
                      title="Do you want to delete?"
                      onConfirm={() => handleTaskDelete(taskDetails._id)}
                      okText="Yes"
                      cancelText="No"
                      placement="bottom"
                    >
                      <Button danger>
                        <i className="fi fi-rs-trash"></i>
                        {/* Delete */}
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </div>

              <div className="task-inner-card">
                <div className="bredcamp-panel">
                  <ul>
                    <li>
                      <p>
                        {taskDetails?.project?.color && (
                          <div
                            className="color-div"
                            style={{ background: taskDetails?.project?.color }}
                          ></div>
                        )}
                        {taskDetails?.project?.title}
                      </p>
                    </li>
                    <li>
                      <i className="fi fi-rr-angle-small-right"></i>
                    </li>
                    <li>
                      <span>{taskDetails?.mainTask?.title}</span>
                    </li>
                  </ul>
                </div>

                <h3>{taskDetails?.title}</h3>
                <div className="item-inner">
                  <p
                    dangerouslySetInnerHTML={{
                      __html: taskDetails?.descriptions,
                    }}
                  ></p>
                </div>

                <div className="table-schedule-wrapper">
                  <ul>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-calendar-day"></i>
                          <DatePicker
                            open={false}
                            inputReadOnly
                            placeholder="Start"
                            value={
                              taskDetails?.start_date &&
                              dayjs(taskDetails?.start_date, "YYYY-MM-DD")
                            }
                            allowClear={false}
                            onChange={onChange}
                          />
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <i className="fi fi-rr-calendar-day"></i>
                          <DatePicker
                            open={false}
                            inputReadOnly
                            placeholder="Due"
                            value={
                              taskDetails?.due_date &&
                              dayjs(taskDetails?.due_date, "YYYY-MM-DD")
                            }
                            allowClear={false}
                            onChange={onChange}
                          />
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rs-tags"></i>
                          <span className="schedule-label">Labels</span>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          {taskDetails?.taskLabels?.map((val, index) => (
                            <div key={index}>
                              {" "}
                              {val.title.charAt(0).toUpperCase() +
                                val.title.slice(1)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </li>

                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-users"></i>
                          <span className="schedule-label">Assignees</span>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <Avatar.Group
                            maxCount={2}
                            maxPopoverTrigger="click"
                            size="default"
                            maxStyle={{
                              color: "#f56a00",
                              backgroundColor: "#fde3cf",
                              cursor: "pointer",
                            }}
                          >
                            {taskDetails?.assignees &&
                              taskDetails?.assignees?.map((data) => (
                                <Tooltip
                                  title={removeTitle(data.name)}
                                  key={data._id}
                                >
                                  <MyAvatar
                                    userName={data.name}
                                    alt={data.name}
                                    src={data?.emp_img}
                                    key={data._id}
                                  />
                                </Tooltip>
                              ))}
                          </Avatar.Group>
                        </div>
                      </div>
                    </li>
                    {hasPermission(["view_timesheet"]) && (
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-clock"></i>
                            <span className="schedule-label">
                              Estimated Time
                            </span>
                          </div>
                        </div>
                        <div
                          className="table-right"
                          style={{ cursor: "pointer" }}
                        >
                          <Popover
                            visible={visible}
                            arrow={false}
                            placement="bottom"
                            style={{ margin: "0" }}
                            content={
                              <>
                                <div
                                  onClick={popOver}
                                  style={{ cursor: "pointer" }}
                                >
                                  <p>
                                    {" "}
                                    <EditOutlined
                                      style={{
                                        marginRight: "20px",
                                        marginBottom: "10px",
                                        color: "green",
                                      }}
                                    />{" "}
                                    Track Manually
                                  </p>
                                </div>
                                {hasPermission(["view_timesheet"]) && (
                                  <div
                                    onClick={() => {
                                      popOverTimeLogged();
                                      getTimeLogged(taskId);
                                      setExpandedRowKey(null);
                                    }}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <p>
                                      {" "}
                                      <FieldTimeOutlined
                                        style={{ marginRight: "20px" }}
                                      />{" "}
                                      Logged Time Detail
                                    </p>
                                  </div>
                                )}
                              </>
                            }
                            trigger="click"
                            className="flex-table"
                            onVisibleChange={openPopOver}
                          >
                            {isLoggedHoursMoreThanEstimated(
                              taskDetails.time,
                              `${taskDetails?.estimated_hours}:${taskDetails?.estimated_minutes}`
                            ) && (
                              <i
                                style={{ color: "red" }}
                                className="fi fi-ss-triangle-warning"
                              ></i>
                            )}
                            <p className="logged-time">
                              <span>Logged Time : </span>
                              {taskDetails?.time} /{" "}
                              <span>Estimated time : </span>
                              {`${taskDetails?.estimated_hours}:${taskDetails?.estimated_minutes}`}
                            </p>
                          </Popover>

                          {estError && (
                            <div className="error-message">
                              Logged hours cannot be greater than estimated
                              hours.
                            </div>
                          )}
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
                <div className="file-upload">
                  <h5>Attached Files</h5>
                </div>

                <div className="fileAttachment_container">
                  {taskDetails?.attachments &&
                  taskDetails?.attachments.length > 0 ? (
                    taskDetails?.attachments?.map((val, index) => (
                      <div key={index} className="fileAttachment_viewBox">
                        {fileImageSelect(val?.file_type, "35px")}
                        <a
                          style={{ wordBreak: "break-all" }}
                          href={`${process.env.REACT_APP_API_URL}/public/${val?.path}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {val?.name.length > 15
                            ? `${val?.name.slice(0, 15)}.....${val?.file_type}`
                            : val?.name + val?.file_type}
                        </a>
                      </div>
                    ))
                  ) : (
                    <div>No Attached Files</div>
                  )}
                </div>
                <div className="attachment-comment">
                  <div
                    className="table-schedule-wrapper"
                    style={{ background: "white" }}
                  >
                    <h5>Bugs</h5>
                    <ul>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">Id</div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">Name</div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">Status</div>
                        </div>
                        <div className="table-right">
                          <div className="bug-iconwrapper">
                            <i class="fi fi-rr-briefcase"></i>
                            <div className="flex-table">Reporter</div>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="bug-iconwrapper">
                            <i class="fi fi-tr-boss"></i>
                            <div className="flex-table">Assignee</div>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="bug-iconwrapper">
                            <i class="fi fi-rr-calendar"></i>
                            <div className="flex-table"> Due Date</div>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="bug-iconwrapper">
                            <i class="fi fi-rr-calendar"></i>
                            <div className="flex-table"> Created At</div>
                          </div>
                        </div>
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>
                        <div className="table-left">
                          {hasPermission(["bug_add"]) && issuetitleflag ? (
                            <Input
                              name="issue"
                              placeholder="Enter bug title"
                              onChange={(e) => {
                                setIssuetitle(e.target.value);
                              }}
                              onPressEnter={(e) => handleissuedata(e)}
                            />
                          ) : (
                            <div
                              className="flex-table"
                              onClick={() => setIssuetitleflag(true)}
                            >
                              <span className="add-bug">
                                Add Bug and hit enter key
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>{" "}
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>{" "}
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>{" "}
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>
                      </li>
                      {issuedata?.map((value) => {
                        return (
                          <li>
                            <div className="table-left">
                              <div className="flex-table">{value?.bugId}</div>
                            </div>
                            <div className="table-left">
                              <div className="flex-table">
                                <Link
                                  to={`/project/app/${projectId}?tab=Bugs&bugID=${value?._id}`}
                                >
                                  {value?.title}
                                </Link>
                              </div>
                            </div>
                            <div className="table-left">
                              <div
                                className="flex-table"
                                style={{ color: "orange" }}
                              >
                                {value?.bug_status}
                              </div>
                            </div>

                            <div className="table-left">
                              <Tooltip
                                title={removeTitle(value?.reporter)}
                                key={value?.reporter}
                              >
                                <MyAvatar
                                  userName={value?.reporter}
                                  alt={value?.reporter}
                                  key={value?.reporter}
                                />
                              </Tooltip>
                            </div>
                            <div className="table-left">
                              {value?.assignees?.length > 0 ? (
                                <Avatar.Group
                                  maxCount={2}
                                  maxPopoverTrigger="click"
                                  size="default"
                                  maxStyle={{
                                    color: "#f56a00",
                                    backgroundColor: "#fde3cf",
                                    cursor: "pointer",
                                  }}
                                >
                                  {value?.assignees &&
                                    value?.assignees?.map((data) => (
                                      <Tooltip
                                        title={removeTitle(data.full_name)}
                                        key={data.full_name}
                                      >
                                        <MyAvatar
                                          userName={data.full_name}
                                          alt={data.full_name}
                                          src={data.emp_img}
                                          key={data.full_name}
                                        />
                                      </Tooltip>
                                    ))}
                                </Avatar.Group>
                              ) : (
                                "-"
                              )}
                            </div>
                            <div className="table-left">
                              <div className="flex-table">
                                {moment(value?.due_date).format(
                                  "DD-MMM-YYYY"
                                ) == "Invalid date"
                                  ? "-"
                                  : moment(value?.due_date).format(
                                      "DD-MMM-YYYY"
                                    )}
                              </div>
                            </div>
                            <div className="table-left">
                              <div className="flex-table">
                                {moment(value?.createdAt).format("DD-MMM-YYYY")}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="right-task-detail-panel">
              <div className="right-toolbar">
                <div className="right-toolbar-tab">
                  <label
                    onClick={() => {
                      handleTabChange("comments");
                      getComment(taskDetails?._id);
                    }}
                    style={{ cursor: "pointer" }}
                    className={`${activeClass()}`}
                  >
                    Comments
                    <span className="comment-badge">
                      {comments.length || 0}
                    </span>
                  </label>

                  <label
                    onClick={() => {
                      handleTabChange("task");
                      getTaskhistory();
                    }}
                    style={{ cursor: "pointer" }}
                    className={`${activeClass1()}`}
                  >
                    Task History
                  </label>
                </div>
              </div>

              <div
                className={` task-history-inner  task-detail-inner ${activeTab?.toLowerCase()}`}
              >
                {activeTab === "comments" ? (
                  <>
                    <div className="comment-list-wrapper" ref={commentListRef}>
                      {comments && comments.length > 0 ? (
                        comments?.map((item, index) => {
                          const commentValue = item.comment;

                          return (
                            <div className="main-comment-wrapper" key={index}>
                              <div className="main-avatar-wrapper">
                                <MyAvatar
                                  src={item.profile_pic}
                                  userName={item.sender}
                                  alt={item.sender}
                                  key={item.sender}
                                />
                                <div className="comment-sender-name">
                                  <h1
                                    style={{
                                      color: userColors[item.sender] || "#000",
                                    }}
                                  >
                                    {removeTitle(item.sender)}
                                  </h1>
                                  <h4>
                                    {calculateTimeDifference(item.createdAt)}
                                  </h4>
                                </div>

                                {isCreatedBy(item?.sender_id) && (
                                  <div className="edit-bar">
                                    <Dropdown
                                      trigger={["click"]}
                                      overlay={
                                        <Menu>
                                          <Menu.Item
                                            key="1"
                                            onClick={() => {
                                              setOpenCommentModle(true);
                                              handleEditComment(item._id);
                                            }}
                                          >
                                            <EditOutlined
                                              style={{ color: "green" }}
                                            />
                                            Edit
                                          </Menu.Item>
                                          <Menu.Item
                                            key="2"
                                            onClick={() => {
                                              deleteComment(item._id);
                                            }}
                                            className="ant-delete"
                                          >
                                            <DeleteOutlined
                                              style={{ color: "red" }}
                                            />
                                            Delete
                                          </Menu.Item>
                                        </Menu>
                                      }
                                      onClick={handleDropdownClick}
                                    >
                                      <MoreOutlined
                                        style={{ cursor: "pointer" }}
                                      />
                                    </Dropdown>
                                  </div>
                                )}
                              </div>
                              <div className="comment-wrapper">
                                <p key={index}>
                                  {commentValue

                                    .split(/(\S+)/g)
                                    .map((part, partIndex) => {
                                      if (part.startsWith("@")) {
                                        return (
                                          <span
                                            key={partIndex}
                                            className="mention-user-comment"
                                          >
                                            {part.replace("@", "")}
                                          </span>
                                        );
                                      } else {
                                        return (
                                          <span
                                            dangerouslySetInnerHTML={{
                                              __html: part.replace(
                                                /\n/g,
                                                "<br>"
                                              ),
                                            }}
                                          ></span>
                                        );
                                      }
                                    })}
                                </p>
                                <div className="task-all-file-wrapper">
                                  {item?.attachments.map((file, index) => (
                                    <Badge key={index}>
                                      <div className="fileAttachment_Box">
                                        <div className="fileAttachment_box-img">
                                          {fileImageSelect(file?.file_type)}
                                        </div>
                                        <div
                                          style={{
                                            display: "flex",
                                            marginBottom: "10px",
                                            width: "100%",
                                            justifyContent: "space-between",
                                          }}
                                        >
                                          <p
                                            style={{ margin: "0px 10px" }}
                                            className="fileNameTxtellipsis"
                                          >
                                            <a
                                              className="fileNameTxtellipsis"
                                              href={`${process.env.REACT_APP_API_URL}/public/${file?.path}`}
                                              rel="noopener noreferrer"
                                              target="_blank"
                                            >
                                              {file.name.length > 15
                                                ? `${file.name.slice(
                                                    0,
                                                    15
                                                  )}.....${file.file_type}`
                                                : file.name + file.file_type}
                                            </a>
                                          </p>
                                        </div>
                                      </div>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="task-no-comments">No comments</div>
                      )}
                    </div>

                    <AddComment
                      addComment={addComments} // Function to handle adding comments
                      id={taskDetails?._id} // Task ID
                      setTextAreaValue={setTextAreaValue} // Function to set text area value
                      isTextAreaFocused={isTextAreaFocused} // Boolean for text area focus state
                      setIsTextAreaFocused={setIsTextAreaFocused} // Function to set focus state
                      textAreaValue={textAreaValue}
                      // userList={taskDetails?.assignees}
                      userList={taggedUserList}
                      getBoardTasks={getBoardTasks}
                      mainTaskId={taskDetails?.mainTask?._id}
                    />
                  </>
                ) : activeTab === "issue" ? (
                  <div
                    className="table-schedule-wrapper"
                    style={{ background: "white" }}
                  >
                    <ul>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">Id</div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">Name</div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">Status</div>
                        </div>
                        <div className="table-right">
                          <i class="fi fi-rr-briefcase"></i>
                          <div className="flex-table">Reporter</div>
                        </div>
                        <div className="table-right">
                          <i class="fi fi-tr-boss"></i>
                          <div className="flex-table">Assignee</div>
                        </div>
                        <div className="table-right">
                          <i class="fi fi-rr-calendar"></i>
                          <div className="flex-table"> Due Date</div>
                        </div>
                        <div className="table-right">
                          <i class="fi fi-rr-calendar"></i>
                          <div className="flex-table"> Created At</div>
                        </div>
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>
                        <div className="table-left">
                          {issuetitleflag ? (
                            <Input
                              name="issue"
                              placeholder="Enter bug title"
                              onChange={(e) => {
                                setIssuetitle(e.target.value);
                              }}
                              onPressEnter={(e) => handleissuedata(e)}
                            />
                          ) : (
                            <div
                              className="flex-table"
                              onClick={() => setIssuetitleflag(true)}
                            >
                              Add Bug and hit enter key
                            </div>
                          )}
                        </div>
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>{" "}
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>{" "}
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>{" "}
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>
                        <div className="table-left">
                          <div className="flex-table"></div>
                        </div>
                      </li>
                      {issuedata?.map((value) => {
                        return (
                          <li>
                            <div className="table-left">
                              <div className="flex-table">{value?.bugId}</div>
                            </div>
                            <div className="table-left">
                              <div className="flex-table">
                                <Link
                                  to={`/project/app/${projectId}?tab=Bugs&bugID=${value?._id}`}
                                >
                                  {value?.title}
                                </Link>
                              </div>
                            </div>
                            <div className="table-left">
                              <div
                                className="flex-table"
                                style={{ color: "orange" }}
                              >
                                {value?.bug_status}
                              </div>
                            </div>

                            <div className="table-left">
                              <Tooltip
                                title={removeTitle(value?.reporter)}
                                key={value?.reporter}
                              >
                                <MyAvatar
                                  userName={value?.reporter}
                                  alt={value?.reporter}
                                  key={value?.reporter}
                                />
                              </Tooltip>
                            </div>
                            <div className="table-left">
                              {value?.assignees.length > 0 ? (
                                <Avatar.Group
                                  maxCount={2}
                                  maxPopoverTrigger="click"
                                  size="default"
                                  maxStyle={{
                                    color: "#f56a00",
                                    backgroundColor: "#fde3cf",
                                    cursor: "pointer",
                                  }}
                                >
                                  {value?.assignees &&
                                    value?.assignees?.map((data) => (
                                      <Tooltip
                                        title={removeTitle(data.full_name)}
                                        key={data.full_name}
                                      >
                                        <MyAvatar
                                          key={data.full_name}
                                          userName={data.full_name}
                                          alt={data.full_name}
                                          src={data.emp_img}
                                        />
                                      </Tooltip>
                                    ))}
                                </Avatar.Group>
                              ) : (
                                "-"
                              )}
                            </div>
                            <div className="table-left">
                              <div className="flex-table">
                                {moment(value?.due_date).format(
                                  "DD-MMM-YYYY"
                                ) == "Invalid date"
                                  ? "-"
                                  : moment(value?.due_date).format(
                                      "DD-MMM-YYYY"
                                    )}
                              </div>
                            </div>
                            <div className="table-left">
                              <div className="flex-table">
                                {moment(value?.createdAt).format("DD-MMM-YYYY")}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className="task-history">
                    {taskHistory.map((item, index) => {
                      let updateKey = item?.updated_key
                        .replace("_", " ")
                        .includes("assignee")
                        ? "Assigned people"
                        : item?.updated_key.replace("_", " ");

                      return (
                        <div className="task-history-wrapper" key={item._id}>
                          {item.updated_key === "createdAt" ? (
                            <div className="task-history-img">
                              <MyAvatar
                                key={item._id}
                                userName={item.createdBy?.full_name}
                                alt={item.createdBy?.full_name}
                                src={item.createdBy?.emp_img}
                              />
                              <span className="history-details">
                                {removeTitle(item.createdBy.full_name)} added
                                the task &nbsp;
                                <span className="hitory-time">
                                  {calculateTimeDifference(item?.createdAt)}
                                </span>
                              </span>
                            </div>
                          ) : (
                            <div className="task-history-img">
                              <MyAvatar
                                key={item._id}
                                userName={item.updatedBy?.full_name}
                                alt={item.updatedBy?.full_name}
                                src={item.updatedBy?.emp_img}
                              />

                              <span className="history-details">
                                {item.updatedBy.full_name} updated the task
                                &nbsp;
                                <span className="hitory-time">
                                  {calculateTimeDifference(item?.updatedAt)}
                                </span>
                              </span>
                              <div
                                className="history-icon"
                                onClick={() => handleToggle(item, index)}
                                style={{ cursor: "pointer" }}
                              >
                                {storeIndex === item._id && showTaskHistory ? (
                                  <DownOutlined />
                                ) : (
                                  <RightOutlined />
                                )}
                              </div>
                              {storeIndex === item._id && (
                                <div
                                  className="history-data-wrapper"
                                  style={{ textTransform: "capitalize" }}
                                >
                                  <div className="history-prev">
                                    <h2>Previous:</h2>
                                  </div>
                                  <div className="history-data">
                                    <h5>
                                      {item.pervious_value
                                        ? item?.updated_key === "start_date" ||
                                          item?.updated_key === "due_date"
                                          ? item?.pervious_value
                                            ? updateKey +
                                              " : " +
                                              moment(
                                                item.pervious_value
                                              ).format("DD MMM, YY")
                                            : updateKey + " : " + "-"
                                          : updateKey +
                                            " : " +
                                            item.pervious_value
                                        : updateKey + " : " + "-"}
                                    </h5>
                                  </div>
                                  <div className="history-prev">
                                    <h2>New:</h2>
                                  </div>
                                  <div className="history-data">
                                    <h5>
                                      {item.new_value
                                        ? item?.updated_key === "start_date" ||
                                          item?.updated_key === "due_date"
                                          ? item?.new_value
                                            ? updateKey +
                                              " : " +
                                              moment(item.new_value).format(
                                                "DD MMM, YY"
                                              )
                                            : updateKey + " : " + "-"
                                          : updateKey + " : " + item.new_value
                                        : updateKey + " : " + "-"}
                                    </h5>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>

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
