import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
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

  return (
    <>
      <div className="container project-task-section">
        {tasks.map((boardData, index) => (
          <div
            key={boardData._id}
            className={`order small-box ${dragged ? "dragged-over" : ""}`}
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
                    {boardData.title}
                    <span
                      style={{
                        background: boardData.color,
                        color: "black",
                      }}
                    >
                      ({boardData.bugs.length})
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
                      {boardData.bugs.map((task) => (
                        <div
                          className={`card ${dragged ? "dragged" : ""}`}
                          key={task._id}
                          id={task._id}
                          draggable
                          onDragStart={(e) => onDragStart(e)}
                          onDragEnd={(e) => onDragEnd(e)}
                        >
                          <div
                            className="task-box"
                            onClick={() => {
                              getTaskByIdDetails(task._id);
                              getComment(task._id);
                              setTempBoard(boardData);
                              setSelectedBugId(task._id);
                            }}
                            style={{
                              background:
                                boardData?.title == "Closed" && "#cffdcf",
                            }}
                          >
                            <div className="taskHeader">
                              <h3
                                id={`bug-${task._id}`}
                                style={{
                                  color:
                                    boardData?.title == "Closed" && "green",
                                  "-webkit-text-fill-color":
                                    boardData?.title == "Closed" && "green",
                                  textDecoration:
                                    boardData?.title == "Closed" &&
                                    "line-through",
                                }}
                              >
                                {task.title}
                              </h3>
                            </div>
                            <span
                              className="highlabel"
                              style={{
                                backgroundColor: task.bug_labels.map(
                                  (item) => item.color
                                ),
                                textTransform: "capitalize",
                              }}
                            >
                              {task.bug_labels.map((item) => item.title)}
                            </span>
                            {task.due_date && (
                              <div className="task-due-date-wrapper">
                                <div className="task-due-date">
                                  <a href="">
                                    <i class="fa-regular fa-calendar-days"></i>{" "}
                                    Due date
                                  </a>
                                </div>
                                <div
                                  className="task-due-date"
                                  style={{
                                    color: moment(task.due_date).isBefore(
                                      currDate,
                                      "day"
                                    )
                                      ? "red"
                                      : "inherit",
                                  }}
                                >
                                  {moment(task.due_date).format("D MMM")}
                                </div>
                              </div>
                            )}
                            
                            <div
                              className="assignees"
                              style={{
                                borderBottom:
                                  boardData?.title == "Closed" &&
                                  "1px solid green",
                              }}
                            >
                              <div className="assignee-name">
                                <i className="fi fi-rr-users"></i>
                                <p>Assignees</p>
                              </div>
                              <div className="avtar-group">
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
                                  {task.assignees &&
                                    task.assignees.map((data) => (
                                      <MyAvatar
                                        userName={data.full_name}
                                        alt={data.full_name}
                                        key={data._id}
                                        src={data.emp_img}
                                      />
                                    ))}
                                </Avatar.Group>
                                <Button
                                  onClick={() =>
                                    getTaskByIdDetails(task._id, {
                                      editFlag: true,
                                      boardID: boardData?._id,
                                    })
                                  }
                                  icon={<PlusOutlined />}
                                  disabled={
                                    !getRoles(["Admin"]) ||
                                    boardData?.title == "Closed" || !hasPermission(["bug_edit"])
                                  }
                                />
                              </div>
                            </div>

                            <div className="assignee-name">
                              {((task?.total_logged_hours !== "" &&
                                parseInt(task?.total_logged_hours) > 0) ||
                                (task?.total_logged_minutes !== "" &&
                                  parseInt(task?.total_logged_minutes) > 0) ||
                                (task?.estimated_hours !== "" &&
                                  parseInt(task?.estimated_hours) > 0) ||
                                (task?.estimated_minutes !== "" &&
                                  parseInt(task?.estimated_minutes) > 0)) && (
                                <div className="assignee-task-time">
                                  <i className="fi fi-rr-clock"></i>
                                  <p>Logged Time</p>
                                </div>
                              )}
                              <div className="task-time">
                                <Tooltip
                                  placement="topLeft"
                                  title={"Logged Time"}
                                  arrow={false}
                                >
                                  {task?.total_logged_hours !== "" &&
                                  parseInt(task?.total_logged_hours) > 0 ? (
                                    <span>{task?.total_logged_hours}h </span>
                                  ) : (
                                    ""
                                  )}
                                  {task?.total_logged_minutes !== "" &&
                                  parseInt(task?.total_logged_minutes) > 0 ? (
                                    <span>{task?.total_logged_minutes}m </span>
                                  ) : (
                                    ""
                                  )}
                                  {(parseInt(task?.total_logged_hours) > 0 ||
                                    parseInt(task?.total_logged_minutes) > 0) &&
                                  (parseInt(task?.estimated_hours) > 0 ||
                                    parseInt(task?.estimated_minutes) > 0)
                                    ? " / "
                                    : ""}
                                </Tooltip>
                                <Tooltip
                                  placement="topLeft"
                                  title={"Estimated Time"}
                                  arrow={false}
                                >
                                  {task?.estimated_hours !== "" &&
                                  parseInt(task?.estimated_hours) > 0 ? (
                                    <span>{task?.estimated_hours}h </span>
                                  ) : (
                                    ""
                                  )}
                                  {task?.estimated_minutes !== "" &&
                                  parseInt(task?.estimated_minutes) > 0 ? (
                                    <span>{task?.estimated_minutes}m </span>
                                  ) : (
                                    ""
                                  )}
                                </Tooltip>
                              </div>
                            </div>
                            
                            <div className="task-comment-hour-detail-wrapper">
                              <div className="task-comment-bar">
                                <Tooltip title="Comments" placement="right">
                                  <div className="bug-comment-icon">
                                    <a href="#">
                                      <i class="fa-regular fa-comment"></i>
                                    </a>
                                    {task.comments}
                                    {commentDrafts[task._id] && (
                                      <span
                                        className="draft-indicator"
                                        style={{
                                          color: "#ff4d4f",
                                          marginLeft: "4px",
                                        }}
                                      >
                                        Draft
                                      </span>
                                    )}
                                  </div>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ))}
      </div>

      <Modal
        destroyOnClose
        className="task-detail-popup"
        open={modalIsOpen && taggedUserList.length > 0}
        width={1000}
        footer={null}
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
              {hasPermission(["bug_edit"]) && isEditable.title ? (
                <Tooltip title="Enter the title and hit enter key">
                  <Input
                    placeholder="Title"
                    defaultValue={viewBug?.title}
                    onPressEnter={(e) => {
                      const value = e.target.value;
                      handleViewBug("title", value);
                    }}
                  />
                </Tooltip>
              ) : (
                <h3
                  onClick={() => {
                    handleFieldClick("title");
                  }}
                >
                  {taskDetails?.title}
                </h3>
              )}
              {hasPermission(["bug_edit"]) && isEditable.proj_description ? (
                <div>
                  <CKEditor
                    editor={Custombuild}
                    data={viewBug?.descriptions}
                    onReady={(editor) => {
                      setEditorInstance(editor);
                    }}
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
                          1,
                          2,
                          3,
                          4,
                          5,
                          6,
                          7,
                          8,
                          9,
                          10,
                          11,
                          12,
                          13,
                          14,
                          15,
                          16,
                          17,
                          18,
                          19,
                          20,
                          21,
                          22,
                          23,
                          24,
                          25,
                          26,
                          27,
                          28,
                          29,
                          30,
                          31,
                          32,
                        ],
                      },
                      print: {
                        // Implement print functionality here
                      },
                      styles: {
                        height: "10px",
                      },
                    }}
                  />
                  <div className="modal-footer-flex">
                    <div className="flex-btn">
                      <Button
                        htmlType="submit"
                        type="primary"
                        className="square-primary-btn"
                        onClick={() => {
                          if (editorInstance) {
                            const data = editorInstance.getData();
                            handleViewBug("descriptions", data);
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() =>
                          setIsEditable((prevState) => ({
                            ...prevState,
                            proj_description: false,
                          }))
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="item-inner"
                  onClick={() => {
                    handleFieldClick("proj_description");
                  }}
                >
                  <p
                    dangerouslySetInnerHTML={{
                      __html: taskDetails?.descriptions,
                    }}
                  ></p>
                </div>
              )}

              <Form>
                <Form.Item>
                  <div className="table-schedule-wrapper">
                    <ul>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            {hasPermission(["bug_edit"]) &&
                            isEditable.start_date ? (
                              <DatePicker
                                value={
                                  viewBug?.start_date &&
                                  dayjs(viewBug?.start_date, "YYYY-MM-DD")
                                }
                                placeholder="Start Date"
                                onChange={(date, dateString) =>
                                  handleViewBug(
                                    "start_date",
                                    dateString,
                                    viewBug
                                  )
                                }
                                allowClear={false}
                              />
                            ) : (
                              <div
                                onClick={() => handleFieldClick("start_date")}
                              >
                                <DatePicker
                                  open={false}
                                  inputReadOnly
                                  placeholder="Start Date"
                                  value={
                                    taskDetails?.start_date &&
                                    dayjs(taskDetails?.start_date, "YYYY-MM-DD")
                                  }
                                  allowClear={false}
                                  onChange={onChange}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            {hasPermission(["bug_edit"]) &&
                            isEditable.end_date ? (
                              <DatePicker
                                value={
                                  viewBug?.due_date &&
                                  dayjs(viewBug?.due_date, "YYYY-MM-DD")
                                }
                                placeholder="End Date"
                                onChange={(date, dateString) =>
                                  handleViewBug("due_date", dateString, viewBug)
                                }
                                disabledDate={(current) =>
                                  current &&
                                  current <
                                    dayjs(viewBug?.start_date, "YYYY-MM-DD")
                                }
                                allowClear={false}
                              />
                            ) : (
                              <div onClick={() => handleFieldClick("end_date")}>
                                <DatePicker
                                  open={false}
                                  inputReadOnly
                                  placeholder="End Date"
                                  value={
                                    taskDetails?.due_date &&
                                    dayjs(taskDetails?.due_date, "YYYY-MM-DD")
                                  }
                                  allowClear={false}
                                  onChange={onChange}
                                />
                              </div>
                            )}
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
                          {hasPermission(["bug_edit"]) &&
                          isEditable.bug_labels ? (
                            <Select
                              value={viewBug?.bug_labels[0]?.title}
                              showSearch
                              placeholder="Select labels"
                              onChange={handleSelectedLabelsChange}
                              bordered={false}
                            >
                              {projectLabels.map((item) => (
                                <Option
                                  key={item?._id}
                                  value={item?._id}
                                  style={{ textTransform: "capitalize" }}
                                >
                                  {item.title}
                                </Option>
                              ))}
                            </Select>
                          ) : (
                            <div onClick={() => handleFieldClick("bug_labels")}>
                              {taskDetails?.bug_labels?.length > 0 ? (
                                taskDetails?.bug_labels?.map((label) => (
                                  <div key={label._id}>
                                    {label.title.charAt(0).toUpperCase() +
                                      label.title.slice(1)}
                                  </div>
                                ))
                              ) : (
                                <div>Select</div>
                              )}
                            </div>
                          )}
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
                          {hasPermission(["bug_edit"]) &&
                          isEditable.assignees ? (
                            <MultiSelect
                              onSearch={handleSearch}
                              onChange={handleSelectedItemsChange}
                              values={
                                viewBug
                                  ? viewBug?.assignees?.map((item) => item?._id)
                                  : []
                              }
                              listData={subscribersList}
                              search={searchKeyword}
                              bordered={false}
                            />
                          ) : (
                            <div onClick={() => handleFieldClick("assignees")}>
                              {taskDetails?.assignees?.length > 0 ? (
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
                              ) : (
                                <div>Select</div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-clock"></i>
                            <span className="schedule-label">
                              Estimated Time
                              {!getRoles(["Client"]) && (
                                <span style={{ color: "red" }}>*</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            {hasPermission(["bug_edit"]) &&
                            isEditable.estimated_time ? (
                              <div className="estimated_time_input_container">
                                <div className="hours_min_container">
                                  <Tooltip title="Add hours and press enter key">
                                    <Input
                                      min={0}
                                      defaultValue={viewBug.estimated_hours}
                                      type="number"
                                      onPressEnter={(e) => {
                                        const value = e.target.value;
                                        handleEstTimeViewInput(
                                          "est_hrs",
                                          value
                                        );
                                      }}
                                      className={`hours_input ${
                                        estHrsError && "error-border"
                                      }`}
                                      placeholder="Hours"
                                    />
                                  </Tooltip>
                                  <div style={{ color: "red" }}>
                                    {estHrsError}
                                  </div>
                                </div>
                                <div className="hours_min_container">
                                  <Tooltip title="Add mins and press enter key">
                                    <Input
                                      min={0}
                                      max={59}
                                      type="number"
                                      defaultValue={viewBug.estimated_minutes}
                                      className={`hours_input ${
                                        estMinsError && "error-border"
                                      }`}
                                      placeholder="Minutes"
                                      onPressEnter={(e) => {
                                        const value = e.target.value;
                                        handleEstTimeViewInput(
                                          "est_mins",
                                          value
                                        );
                                      }}
                                    />
                                  </Tooltip>
                                  <div style={{ color: "red" }}>
                                    {estMinsError}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="table-right"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  handleFieldClick("estimated_time");
                                }}
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
                                  trigger="hover"
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
                                    {taskDetails?.time}/{" "}
                                    <span>Estimated time : </span>
                                    {`${taskDetails?.estimated_hours}:${taskDetails?.estimated_minutes}`}
                                  </p>
                                </Popover>
                                {estError && (
                                  <div className="error-message">
                                    Logged hours cannot be greater than
                                    estimated hours.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </Form.Item>
              </Form>

              <div style={{ textAlign: "end" }}>
                <Checkbox
                  checked={taskDetails.isRepeated}
                  onChange={(e) => {
                    handleViewBug("isRepeated", e.target.checked);
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>Repeated Bug</span>
                </Checkbox>
              </div>
              <div className="file-upload">
                <h5>Attached Files</h5>
              </div>
              <div className="fileAttachment_container">
                {[...fileViewAttachment, ...populatedViewFiles]?.map(
                  (file, index) => (
                    <Badge
                      key={index}
                      count={
                        <CloseCircleOutlined
                          onClick={() => removeAttachmentViewFile(index, file)}
                        />
                      }
                    >
                      <div className="fileAttachment_Box">
                        <a
                          className="fileNameTxtellipsis"
                          href={`${process.env.REACT_APP_API_URL}/public/${file?.path}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {file.name.length > 15
                            ? `${file.name.slice(0, 15)}.....${file.file_type}`
                            : file.name + file.file_type}
                        </a>
                      </div>
                    </Badge>
                  )
                )}
              </div>
              {populatedViewFiles?.length > 0 && (
                <div className="folder-comment">
                  <Form.Item
                    label="Folder"
                    initialValue={
                      foldersList.length > 0 ? foldersList[0]?._id : undefined
                    }
                    name="folder"
                    rules={[
                      {
                        required: true,
                      },
                    ]}
                  >
                    <Select placeholder="Please Select Folder" showSearch>
                      {foldersList.map((data) => (
                        <Option
                          key={data?._id}
                          value={data?._id}
                          style={{ textTransform: "capitalize" }}
                        >
                          {data.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              )}

              <Tooltip placement="top" title="Attached file">
                <Button
                  className="link-btn"
                  onClick={() => attachmentViewfileRef.current.click()}
                >
                  <i className="fi fi-ss-link"></i> Attach files
                </Button>
              </Tooltip>
              <input
                multiple
                type="file"
                accept="*"
                onChange={onFileViewChange}
                hidden
                ref={attachmentViewfileRef}
              />
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
                  <span className="comment-badge">{comments.length || 0}</span>
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
                                    color: userColors[item.sender] || "#000",
                                  }}
                                >
                                  {removeTitle(item.sender)}
                                </h1>
                                <h4>
                                  {calculateTimeDifference(item.createdAt)} (
                                  {moment(item?.createdAt).format("DD-MM-YYYY")}
                                  )
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
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: item?.comment.replace(
                                      /\n/g,
                                      "<br>"
                                    ),
                                  }}
                                ></span>
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
                    editFlagObj={{
                      flag: openCommentModel,
                      setFn: setOpenCommentModle,
                      submitFn: handleComments,
                    }}
                    populatedFiles={populatedFiles}
                    setPopulatedFiles={setPopulatedFiles}
                    deleteFileData={deleteFileData}
                    setDeleteFileData={setDeleteFileData}
                    addComment={addComments} // Function to handle adding comments
                    id={taskDetails?._id} // Task ID
                    setTextAreaValue={setTextAreaValue} // Function to set text area value
                    isTextAreaFocused={isTextAreaFocused} // Boolean for text area focus state
                    setIsTextAreaFocused={setIsTextAreaFocused} // Function to set focus state
                    textAreaValue={textAreaValue}
                    userList={taggedUserList}
                    getBoardTasks={getBoardTasks}
                    projectId={projectId}
                    onDraftChange={handleDraftChange}
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
                              {removeTitle(item.createdBy.full_name)} added the
                              bug &nbsp;
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
                                            moment(item.pervious_value).format(
                                              "DD MMM, YY"
                                            )
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
