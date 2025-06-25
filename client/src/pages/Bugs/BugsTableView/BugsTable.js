import BugsKanbanController from "../BugsKanbanBoard/BugsKanbanController";
import React, { useState } from "react";
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
  } = BugsKanbanController({
    tasks,
    showModalTaskModal,
    showEditTaskModal,
    getBoardTasks,
    boardTasksBugs,
    selectedTask,
    deleteTasks,
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
        <Modal
          className="task-detail-popup"
          open={modalIsOpen}
          width={1000}
          footer={null}
          onCancel={() => {
            handleCancel();
            setSelectedBugId(null);
          }}
        >
          <div className="task-detail-panel bug-task-panel">
            <div className="left-task-detail-panel">
              <div className="head-toolbar">
                <div className="status-button">
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    visible={isPopoverVisible}
                    onVisibleChange={setIsPopoverVisible}
                    content={
                      <div className="assignees-popover stages-bug-popover">
                        <ul style={{ paddingLeft: "0px" }}>
                          {bugWorkFlowStatusList.map((item, index) => (
                            <div
                              key={item._id}
                              style={{
                                display: "flex",
                                cursor: "pointer",
                                justifyContent: "space-between",
                                gap: "20px ",
                                paddingBottom: "9px",
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
                                    backgroundColor: `${config.COLORS[index]}`,
                                    borderRadius: "50%",
                                  }}
                                ></div>
                                <div
                                  onClick={() =>
                                    handleBugStatusClick(item._id, bugId)
                                  }
                                >
                                  {item.title}
                                </div>
                              </span>
                              {selectedBugStatusTitle === item.title && (
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
                        style={{ color: selectedBugStatusColor }}
                      ></i>
                      {selectedBugStatusTitle || taskDetails?.bug_status?.title}
                    </Button>
                  </Popover>

                  <span>{taskDetails?.bugId}</span>
                </div>
                <div className="bug-editbtn">
                  {hasPermission(["bug_edit"]) && (
                    <EditOutlined
                      style={{ color: "green" }}
                      onClick={() => {
                        getTaskByIdDetails(taskDetails?._id, {
                          editFlag: true,
                          boardID: tempBoard?._id,
                        });
                      }}
                    />
                  )}
                  {hasPermission(["bug_delete"]) && (
                    <Popconfirm
                      title="Do you want to delete?"
                      onConfirm={() => handleTaskDelete(taskDetails._id)}
                      okText="Yes"
                      cancelText="No"
                      placement="bottom"
                    >
                      <Button danger>
                        <i className="fi fi-rs-trash"></i>
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </div>
              <div className="task-inner-card">
                <div className="bredcamp-panel">
                  <ul>
                    <li>
                      <p>{taskDetails?.project?.title}</p>
                    </li>
                    <li>
                      <i className="fi fi-rr-angle-small-right"></i>
                      <span className="pop-bug-title">
                        {taskDetails?.task?.title}
                      </span>
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
                            allowClear={false}
                            placeholder="Start"
                            value={
                              taskDetails?.start_date &&
                              dayjs(taskDetails?.start_date, "YYYY-MM-DD")
                            }
                            onChange={onChange}
                          />
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <i className="fi fi-rr-calendar-day"></i>
                          <DatePicker
                            open={false}
                            allowClear={false}
                            inputReadOnly
                            placeholder="Due"
                            value={
                              taskDetails?.due_date &&
                              dayjs(taskDetails?.due_date, "YYYY-MM-DD")
                            }
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
                          {taskDetails?.bug_labels?.map((val, index) => (
                            <div key={index}>
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
                                    key={data._id}
                                    alt={data.name}
                                    src={data.emp_img}
                                  />
                                </Tooltip>
                              ))}
                          </Avatar.Group>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-clock"></i>
                          <span className="schedule-label">Estimated Time</span>
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
                            <div
                              onClick={popOver}
                              style={{ cursor: "pointer" }}
                            >
                              <p>
                                {" "}
                                <EditOutlined
                                  style={{
                                    marginRight: "20px",
                                    color: "green",
                                  }}
                                />{" "}
                                Track Manually
                              </p>
                            </div>
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
                            {taskDetails?.time}/ <span>Estimated time : </span>
                            {`${taskDetails?.estimated_hours}:${taskDetails?.estimated_minutes}`}
                          </p>
                        </Popover>
                        {estError && (
                          <div className="error-message">
                            Logged hours cannot be greater than estimated hours.
                          </div>
                        )}
                      </div>
                    </li>
                  </ul>
                </div>
                <div style={{ textAlign: "end" }}>
                  <Checkbox checked={taskDetails?.isRepeated}>
                    <span style={{ fontWeight: "bold" }}>Repeated Bug</span>
                  </Checkbox>
                </div>
                <div className="file-upload">
                  <h5>Attach Files</h5>
                  <div className="fileAttachment_container">
                    {taskDetails?.attachments &&
                    taskDetails?.attachments.length > 0 ? (
                      taskDetails?.attachments?.map((val, index) => (
                        <div key={index} className="fileAttachment_viewBox">
                          {fileImageSelect(val?.file_type, "35px")}
                          <a
                            href={`${process.env.REACT_APP_API_URL}/public/${val?.path}`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {val?.name.length > 15
                              ? `${val?.name.slice(0, 15)}.....${
                                  val?.file_type
                                }`
                              : val?.name + val?.file_type}
                          </a>
                          <br />
                        </div>
                      ))
                    ) : (
                      <div>No Attached Files</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="right-task-detail-panel right-bug-panel">
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
                      getBughistory(taskDetails?._id);
                    }}
                    style={{ cursor: "pointer" }}
                    className={`${activeClass1()}`}
                  >
                    Bug History
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
                                  userName={item.sender}
                                  src={item.profile_pic}
                                  alt={item.sender}
                                />
                                <div className="comment-sender-name">
                                  <h1
                                    style={{
                                      color:
                                        useUserColors[item.sender] || "#000",
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
                                            key={partIndex}
                                          ></span>
                                        );
                                      }
                                    })}
                                </p>

                                <div className="bug-all-file-wrapper">
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
                                            style={{ margin: "0px 15px" }}
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
                                                  )}.....${
                                                    file.file_type || file.type
                                                  }`
                                                : file.name + file.file_type ||
                                                  file.type}
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
                        <div className="bug-no-comments">No Comments</div>
                      )}
                    </div>

                    <AddComment
                      addComment={addComments} // Function to handle adding comments
                      id={taskDetails?._id} // Task ID
                      setTextAreaValue={setTextAreaValue} // Function to set text area value
                      isTextAreaFocused={isTextAreaFocused} // Boolean for text area focus state
                      setIsTextAreaFocused={setIsTextAreaFocused} // Function to set focus state
                      textAreaValue={textAreaValue}
                      userList={taggedUserList}
                      getBoardTasks={getBoardTasks}
                      projectId={projectId}
                    />
                  </>
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
                                userName={item.createdBy?.full_name}
                                src={item.createdBy?.emp_img}
                                alt={item.createdBy?.full_name}
                                key={item._id}
                              />
                              <span className="history-details">
                                {removeTitle(item.createdBy.full_name)} added
                                the bug &nbsp;
                                <span className="hitory-time">
                                  {calculateTimeDifference(item?.createdAt)}
                                </span>
                              </span>
                            </div>
                          ) : (
                            <div className="task-history-img">
                              <MyAvatar
                                userName={item.updatedBy?.full_name}
                                alt={item.updatedBy?.full_name}
                                key={item._id}
                                src={item.updatedBy?.emp_img}
                              />
                              <span className="history-details">
                                {removeTitle(item.updatedBy.full_name)} updated
                                the bug &nbsp;
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
