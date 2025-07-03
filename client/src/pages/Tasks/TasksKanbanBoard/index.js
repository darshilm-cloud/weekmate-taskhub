import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  PlusOutlined,
  PaperClipOutlined,
  TagOutlined,
  UserAddOutlined,
  CalendarOutlined,
  MoreOutlined,
  DeleteOutlined,
  RightOutlined,
  EditOutlined,
  DownOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  LinkOutlined,
  FieldTimeOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import {
  Avatar,
  Button,
  Input,
  Modal,
  Dropdown,
  DatePicker,
  Tooltip,
  Menu,
  Select,
  Popover,
  Form,
  Badge,
  Popconfirm,
  Checkbox,
} from "antd";
import dayjs from "dayjs";
import "../style.css";
import moment from "moment";
import AddComment from "../../../ReuseComponent/AddComment/AddComment";
import { fileImageSelect } from "../../../util/FIleSelection";
import TaskKanbanController from "./TaskKanbanController";
import { getRoles, hasPermission } from "../../../util/hasPermission";
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
import MultiSelect from "../../../components/CustomSelect/MultiSelect";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import textColorPicker from "../../../util/textColorPicker";
import { setData } from "../../../appRedux/reducers/ApiData";
import { useDispatch, useSelector } from "react-redux";
import { moveWorkFlowTaskHandler } from "../../../appRedux/actions/Common";
import isEqual from "lodash/isEqual";

const TaskList = ({
  tasks,
  showModalTaskModal,
  showEditTaskModal,
  selectedTask,
  deleteTasks,
  getProjectMianTask,
  getBoardTasks,
  updateTasks,
  updateTaskDraftStatus,
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
    onDragStart,
    getTaskByIdDetails,
    getTimeLogged,
    getComment,
    modalIsOpen,
    handleCancel,
    taskDetails,
    viewTask,
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
    handleViewTask,
    handleEstTimeInput,
    openCommentModel,
    handleCancelCommentModel,
    formComment,
    handleComments,
    commentVal,
    setCommentVal,
    handleSelect,
    fileAttachment,
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
    copyform,
    isCopyModalOpen,
    handleCancelCopyModal,
    handleOkCopyModal,
    setIsCopyModalOpen,
    projectTitle,
    mainTask,
    addCopyOfTask,
    copyFormData,
    setCopyFormData,
    handleDelete,
    setManagePeople,
    ManagePeople,
    handleCopyTaskLink,
    clientsList,
    detailClientSubs,
    getDetailsClientSubs,
    handleChange,
    managePeopleForm,
    handleManagePeople,
    setTaskId,
    isVisibleTime,
    setVisibleTime,
    columnDetails,
    expandedRowKey,
    setExpandedRowKey,
    currDate,
    setSelectedTaskId,
    commentListRef,
    handleChangedescription,
    editorData,
    handlePaste,
    handleCancelManagePeople,
    setDetailsClientSubs,
    isEditable,
    setIsEditable,
    projectLabels,
    handleSearch,
    searchKeyword,
    handleSelectedItemsChange,
    viewEdit,
    handleViewEdit,
    handleFieldClick,
    handleSelectedLabelsChange,
    handleEstTimeViewInput,
    editViewModalDescription,
    removeAttachmentViewFile,
    populatedViewFiles,
    fileViewAttachment,
    onFileViewChange,
    attachmentViewfileRef,
    setDeleteFileData,
    deleteFileData,
    populatedFiles,
    setPopulatedFiles,
    deleteTime,
    setTextAreaValue,
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

  const dispatch = useDispatch();
  const observers = useRef({});
  const userColors = useUserColors(comments);

  const { task_ids } = useSelector(({ common }) => common);

  const [editorInstance, setEditorInstance] = useState(null);
  const [sliceStates, setSliceStates] = useState(6);
  const [taskDrafts, setTaskDrafts] = useState({});

  const handleCancelLoggedTime = () => {
    setVisibleTime(false);
    setIsEditable((prevState) => ({ ...prevState, estimated_time: false }));
  };

  const loadMoreTasks = (columnId) => {
    setSliceStates((prevState) => ({
      ...prevState,
      [columnId]: prevState[columnId] + 6, // Increase the slice value
    }));
  };

  const lastTaskElementRef = useCallback((node, columnId) => {
    if (observers.current[columnId]) observers.current[columnId].disconnect();

    observers.current[columnId] = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && node) {
        loadMoreTasks(columnId);
      }
    });

    if (node) observers.current[columnId].observe(node);
  }, []);

  useEffect(() => {
    const initialSliceState = tasks.reduce((acc, boardData) => {
      acc[boardData.workflowStatus._id] = 6;
      return acc;
    }, {});
    console.log("initialSliceState", initialSliceState);
    setSliceStates(initialSliceState);
  }, [tasks]);

  const moveTaskHandler = (taskId, isChecked) => {
    if (isChecked) {
      dispatch(moveWorkFlowTaskHandler([...task_ids, taskId]));
    } else {
      dispatch(moveWorkFlowTaskHandler(task_ids.filter((id) => id !== taskId)));
    }
  };

  const handleDraftChange = (taskId, hasDraft) => {
    setTaskDrafts((prev) => ({
      ...prev,
      [taskId]: hasDraft,
    }));
  };

  return (
    <>
      <div className="container project-task-section">
        {tasks.map((boardData, index) => (
          <div
            key={`${boardData._id}_${index}`}
            className={`order small-box ${dragged ? "dragged-over" : ""}`}
            onDragLeave={(e) => onDragLeave(e)}
            onDragEnter={(e) => onDragEnter(e)}
            onDragEnd={(e) => onDragEnd(e)}
            onDragOver={(e) => onDragOver(e)}
            onDrop={(e) => onDrop(e, boardData.workflowStatus._id)}
          >
            <section className="drag_container">
              <div className="container project-task-list">
                <div className="drag_column">
                  <h4>
                    {boardData?.workflowStatus?.title}{" "}
                    <span
                      style={{
                        background: boardData?.workflowStatus?.color,
                        color: textColorPicker(
                          boardData?.workflowStatus?.color
                        ),
                      }}
                    >
                      ({boardData.tasks.length})
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

                    <div className="borad-task-data">
                      {boardData.tasks
                        .slice(0, sliceStates[boardData.workflowStatus._id])
                        .map((task, cardIndex) => {
                          const isLastTask =
                            cardIndex ===
                            boardData.tasks.slice(
                              0,
                              sliceStates[boardData.workflowStatus._id]
                            ).length -
                              1;
                          return (
                            <>
                              <div
                                className={`card ${dragged ? "dragged" : ""}`}
                                key={task._id}
                                id={task._id}
                                draggable
                                onDragStart={(e) => onDragStart(e)}
                                onDragEnd={(e) => onDragEnd(e)}
                                ref={
                                  isLastTask &&
                                  boardData.tasks.length >
                                    sliceStates[boardData.workflowStatus._id]
                                    ? (node) =>
                                        lastTaskElementRef(
                                          node,
                                          boardData.workflowStatus._id
                                        )
                                    : null
                                }
                              >
                                <div
                                  className="task-box"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    getTaskByIdDetails(task._id);
                                    getComment(task._id);
                                    setTempBoard(boardData);
                                    setSelectedTaskId(task._id);
                                  }}
                                  style={{
                                    background:
                                      boardData.workflowStatus.title ==
                                        "Done" && "#cffdcf",
                                  }}
                                >
                                  <div
                                    className="taskHeader"
                                    style={{ maxWidth: "90%" }}
                                  >
                                    <h3
                                      id={`title-${task._id}`}
                                      style={{
                                        color:
                                          boardData.workflowStatus.title ==
                                            "Done" && "green",
                                        "-webkit-text-fill-color":
                                          boardData.workflowStatus.title ==
                                            "Done" && "green",
                                        textDecoration:
                                          boardData.workflowStatus.title ==
                                            "Done" && "line-through",
                                      }}
                                    >
                                      {task.title}
                                    </h3>
                                    <span></span>
                                  </div>

                                  <span
                                    className="highlabel"
                                    style={{
                                      backgroundColor: task.task_labels.map(
                                        (item) => item.color
                                      ),
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {task.task_labels.map((item) => item.title)}
                                  </span>
                                  {task.due_date && (
                                    <div className="task-due-date-wrapper">
                                      <div className="task-due-date">
                                        <span>
                                          <i className="fa-regular fa-calendar-days"></i>{" "}
                                          Due date
                                        </span>
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
                                        boardData.workflowStatus.title ==
                                          "Done" && "1px solid green",
                                    }}
                                  >
                                    <div className="assignee-name">
                                      <i className="fi fi-rr-users"></i>
                                      <p>Assignees</p>
                                    </div>
                                    <div className="avtar-group">
                                      <MyAvatarGroup
                                        record={task.assignees.map((ele) => {
                                          let obj = {
                                            ...ele,
                                            name: ele?.full_name,
                                          };
                                          return obj;
                                        })}
                                      />

                                      <Button
                                        onClick={() =>
                                          getTaskByIdDetails(task._id, {
                                            editFlag: true,
                                            boardID:
                                              boardData.workflowStatus._id,
                                          })
                                        }
                                        icon={<PlusOutlined />}
                                        disabled={
                                          !getRoles(["Admin", "Admin"]) ||
                                          boardData.workflowStatus.title ===
                                            "Done"
                                        }
                                      ></Button>
                                    </div>
                                  </div>

                                  {hasPermission(["view_timesheet"]) && (
                                    <div className="assignee-name">
                                      {((task?.total_logged_hours !== "" &&
                                        parseInt(task?.total_logged_hours) >
                                          0) ||
                                        (task?.total_logged_minutes !== "" &&
                                          parseInt(task?.total_logged_minutes) >
                                            0) ||
                                        (task?.estimated_hours !== "" &&
                                          parseInt(task?.estimated_hours) >
                                            0) ||
                                        (task?.estimated_minutes !== "" &&
                                          parseInt(task?.estimated_minutes) >
                                            0)) && (
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
                                          parseInt(task?.total_logged_hours) >
                                            0 ? (
                                            <span>
                                              {task?.total_logged_hours}h{" "}
                                            </span>
                                          ) : (
                                            ""
                                          )}
                                          {task?.total_logged_minutes !== "" &&
                                          parseInt(task?.total_logged_minutes) >
                                            0 ? (
                                            <span>
                                              {task?.total_logged_minutes}m{" "}
                                            </span>
                                          ) : (
                                            ""
                                          )}
                                          {(parseInt(task?.total_logged_hours) >
                                            0 ||
                                            parseInt(
                                              task?.total_logged_minutes
                                            ) > 0) &&
                                          (parseInt(task?.estimated_hours) >
                                            0 ||
                                            parseInt(task?.estimated_minutes) >
                                              0)
                                            ? " / "
                                            : ""}
                                        </Tooltip>
                                        <Tooltip
                                          placement="topLeft"
                                          title={"Estimated Time"}
                                          arrow={false}
                                        >
                                          {task?.estimated_hours !== "" &&
                                          parseInt(task?.estimated_hours) >
                                            0 ? (
                                            <span>
                                              {task?.estimated_hours}h{" "}
                                            </span>
                                          ) : (
                                            ""
                                          )}
                                          {task?.estimated_minutes !== "" &&
                                          parseInt(task?.estimated_minutes) >
                                            0 ? (
                                            <span>
                                              {task?.estimated_minutes}m{" "}
                                            </span>
                                          ) : (
                                            ""
                                          )}
                                        </Tooltip>
                                      </div>
                                    </div>
                                  )}

                                  <div className="task-comment-hour-detail-wrapper">
                                    <div className="task-comment-bar">
                                      <Tooltip
                                        title="Comments"
                                        placement="right"
                                      >
                                        <div className="task-comment-icon">
                                          <a href="#">
                                            <i class="fa-regular fa-comment"></i>
                                          </a>
                                          {task.comments}{" "}
                                          {(taskDrafts[task._id] ||
                                            task.hasDraft) && (
                                            <span
                                              className="draft-indicator"
                                              style={{ color: "#ff4d4f" }}
                                            >
                                              Draft
                                            </span>
                                          )}
                                        </div>
                                      </Tooltip>

                                      <Tooltip
                                        placement="topLeft"
                                        title={`Created On: ${moment(
                                          task?.createdAt
                                        ).format("DD-MM-YYYY")}`}
                                        arrow={false}
                                      >
                                        {moment(task?.createdAt).fromNow()}
                                      </Tooltip>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <input
                                    type="checkbox"
                                    style={{
                                      position: "absolute",
                                      top: "17px",
                                      right: "25px",
                                    }}
                                    onChange={(e) =>
                                      moveTaskHandler(
                                        task?._id,
                                        e?.target?.checked
                                      )
                                    }
                                  />
                                  <Dropdown
                                    overlay={
                                      <Menu>
                                        {hasPermission(["task_edit"]) && (
                                          <Menu.Item
                                            onClick={() => {
                                              getTaskByIdDetails(task._id, {
                                                editFlag: true,
                                                boardID:
                                                  boardData?.workflowStatus._id,
                                              });
                                            }}
                                          >
                                            <EditOutlined
                                              style={{ color: "green" }}
                                            />{" "}
                                            Edit
                                          </Menu.Item>
                                        )}

                                        {hasPermission(["task_delete"]) && (
                                          <Popconfirm
                                            title="Are you sure you want to delete this task?"
                                            onConfirm={() => {
                                              handleDelete(task._id);
                                            }}
                                            okText="Yes"
                                            cancelText="No"
                                          >
                                            <Menu.Item className="ant-delete">
                                              <DeleteOutlined
                                                style={{ color: "red" }}
                                              />{" "}
                                              Delete
                                            </Menu.Item>
                                          </Popconfirm>
                                        )}
                                        {hasPermission(["task_add"]) && (
                                          <Menu.Item
                                            onClick={() => {
                                              setIsCopyModalOpen(true);
                                              copyform.setFieldsValue({
                                                title: "",
                                                project_id: "",
                                                task_id: "",
                                                task_status: "",
                                                assignee: true,
                                                client: true,
                                                dates: true,
                                                comments: true,
                                              });
                                              setCopyFormData({
                                                title: "",
                                                project_id: "",
                                                task_id: "",
                                                task_status: "",
                                                isCopyAssignee: true,
                                                isCopyClients: true,
                                                isCopyDates: true,
                                                isCopyComments: true,
                                              });
                                              getTaskByIdDetails(
                                                task._id,
                                                "",
                                                true
                                              );
                                            }}
                                          >
                                            <CopyOutlined />
                                            Create a Copy
                                          </Menu.Item>
                                        )}

                                        <Menu.Item
                                          onClick={() =>
                                            handleCopyTaskLink(task._id)
                                          }
                                        >
                                          <LinkOutlined />
                                          Copy Task Link
                                        </Menu.Item>
                                        {hasPermission(
                                          ["task_edit"] && ["manage_people"]
                                        ) && (
                                          <Menu.Item
                                            onClick={() => {
                                              setTaskId(task._id);
                                              setManagePeople(true);

                                              managePeopleForm.setFieldsValue({
                                                assignees:
                                                  detailClientSubs?.assignees?.map(
                                                    (item) => item._id
                                                  ),
                                                clients:
                                                  detailClientSubs?.pms_clients?.map(
                                                    (item) => item._id
                                                  ),
                                              });
                                            }}
                                          >
                                            <i className="fi fi-rr-users"></i>{" "}
                                            Manage People
                                          </Menu.Item>
                                        )}
                                      </Menu>
                                    }
                                    trigger={["click"]}
                                  >
                                    <a
                                      className="task-edit-pop-btn"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                      onClick={(e) => e.preventDefault()}
                                    >
                                      <MoreOutlined
                                        onClick={() => {
                                          getDetailsClientSubs(
                                            projectId,
                                            task._id,
                                            true
                                          );
                                          managePeopleForm.setFieldsValue({
                                            assignees:
                                              detailClientSubs?.assignees?.map(
                                                (item) => item._id
                                              ),
                                            clients:
                                              detailClientSubs?.pms_clients?.map(
                                                (item) => item._id
                                              ),
                                          });
                                        }}
                                      />
                                    </a>
                                  </Dropdown>
                                </div>
                              </div>
                            </>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ))}
      </div>

      <Modal
        title={null}
        open={isCopyModalOpen}
        footer={null}
        onCancel={handleCancelCopyModal}
        onOk={handleOkCopyModal}
        className="copy-task-modal add-list-modal"
      >
        <div className="modal-header">
          <h1>Copy Task</h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form form={copyform} onFinish={addCopyOfTask}>
            <div className="topic-cancel-wrapper task-list-pop-wrapper">
              <Form.Item>
                <Input
                  name="title"
                  placeholder="Title"
                  value={copyFormData.title || `Copy Of ${taskDetails?.title}`}
                  onChange={(e) =>
                    setCopyFormData({ ...copyFormData, title: e.target.value })
                  }
                />
              </Form.Item>
              <Form.Item className="subscriber-btn">
                <Select
                  disabled={true}
                  placeholder="select project"
                  size="large"
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
                  value={projectTitle}
                >
                  <option>{projectTitle}</option>
                </Select>
              </Form.Item>
              <Form.Item className="subscriber-btn">
                <Select
                  placeholder="select Task"
                  size="large"
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
                  value={copyFormData.task_id || taskDetails?.mainTask?.title}
                  onChange={(value) =>
                    setCopyFormData({ ...copyFormData, task_id: value })
                  }
                >
                  {mainTask.map((item, index) => (
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
              <Form.Item className="subscriber-btn">
                <Select
                  placeholder="select workflow stage"
                  size="large"
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
                  value={
                    copyFormData.task_status || taskDetails?.task_status?._id
                  }
                  onChange={(value) =>
                    setCopyFormData({ ...copyFormData, task_status: value })
                  }
                >
                  {projectWorkflowStage.map((item, index) => (
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

              <h2>Copy:</h2>
              <div className="coppy-task-data">
                <Form.Item
                  name="assignee"
                  valuePropName="checked"
                  initialValue={copyFormData.isCopyAssignee}
                >
                  <Checkbox
                    value={copyFormData.isCopyAssignee}
                    checked={true}
                    onChange={(e) =>
                      setCopyFormData({
                        ...copyFormData,
                        isCopyAssignee: e.target.checked,
                      })
                    }
                  >
                    Assignees
                  </Checkbox>
                </Form.Item>

                <Form.Item
                  name="dates"
                  valuePropName="checked"
                  initialValue={copyFormData.isCopyDates}
                >
                  <Checkbox
                    value={copyFormData.isCopyDates}
                    onChange={(e) =>
                      setCopyFormData({
                        ...copyFormData,
                        isCopyDates: e.target.checked,
                      })
                    }
                  >
                    Dates
                  </Checkbox>
                </Form.Item>

                <Form.Item
                  name="comments"
                  valuePropName="checked"
                  initialValue={copyFormData.isCopyComments}
                >
                  <Checkbox
                    value={copyFormData.isCopyComments}
                    onChange={(e) =>
                      setCopyFormData({
                        ...copyFormData,
                        isCopyComments: e.target.checked,
                      })
                    }
                  >
                    Comments
                  </Checkbox>
                </Form.Item>
              </div>
            </div>

            <div className="modal-footer-flex">
              <div className="flex-btn">
                <Button
                  type="primary"
                  className="square-primary-btn"
                  htmlType="submit"
                >
                  Save
                </Button>
                <Button
                  onClick={handleCancelCopyModal}
                  className="square-outline-btn ant-delete"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        className="task-detail-popup"
        open={modalIsOpen && taggedUserList.length > 0}
        destroyOnClose
        width={1000}
        footer={null}
        onCancel={() => {
          dispatch(setData({ stateName: "taggedUserList", data: [] }));
          handleCancel();
          setSelectedTaskId(null);
          setOpenCommentModle(false);
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
        zIndex={1000}
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
                    {selectedTaskStatusTitle || taskDetails?.task_status?.title}
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
              {hasPermission(["task_edit"]) && isEditable.title ? (
                <Tooltip title="Enter the title and hit enter key">
                  <Input
                    placeholder="Title"
                    defaultValue={viewTask?.title}
                    onPressEnter={(e) => {
                      const value = e.target.value;
                      handleViewTask("title", value);
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
              {hasPermission(["task_edit"]) && isEditable.proj_description ? (
                <div>
                  <CKEditor
                    editor={Custombuild}
                    data={editViewModalDescription || viewTask?.descriptions}
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
                            handleViewTask("descriptions", data);
                          }
                          setIsEditable((prevState) => ({
                            ...prevState,
                            proj_description: false,
                          }));
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

              <Form form={viewEdit} onFinish={handleViewEdit}>
                <Form.Item>
                  <div className="table-schedule-wrapper">
                    <ul>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            {hasPermission(["task_edit"]) &&
                            isEditable.start_date ? (
                              <DatePicker
                                value={
                                  viewTask?.start_date &&
                                  dayjs(viewTask?.start_date, "YYYY-MM-DD")
                                }
                                placeholder="Start Date"
                                onChange={(date, dateString) =>
                                  handleViewTask("start_date", dateString)
                                }
                                allowClear={false}
                              />
                            ) : (
                              <div>
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
                            {hasPermission(["task_edit"]) &&
                            isEditable.end_date ? (
                              <DatePicker
                                value={
                                  viewTask?.due_date &&
                                  dayjs(viewTask?.due_date, "YYYY-MM-DD")
                                }
                                placeholder="End Date"
                                onChange={(date, dateString) =>
                                  handleViewTask("due_date", dateString)
                                }
                                disabledDate={(current) =>
                                  current &&
                                  current <
                                    dayjs(viewTask?.start_date, "YYYY-MM-DD")
                                }
                                allowClear={false}
                              />
                            ) : (
                              <div>
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
                          {hasPermission(["task_edit"]) &&
                          isEditable.taskLabels ? (
                            <Select
                              value={viewTask?.taskLabels[0]?.title}
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
                            <div onClick={() => handleFieldClick("taskLabels")}>
                              {taskDetails?.taskLabels?.length > 0 ? (
                                taskDetails.taskLabels.map((label) => (
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
                          {hasPermission(["task_edit"]) &&
                          isEditable.assignees ? (
                            <MultiSelect
                              onSearch={handleSearch}
                              onChange={handleSelectedItemsChange}
                              values={
                                viewTask
                                  ? viewTask?.assignees?.map(
                                      (item) => item?._id
                                    )
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
                                  {taskDetails.assignees.map((data) => (
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
                            {hasPermission(["task_edit"]) &&
                            isEditable.estimated_time ? (
                              <div className="estimated_time_input_container">
                                <div className="hours_min_container">
                                  <Tooltip title="Add hours and press enter key">
                                    <Input
                                      min={0}
                                      defaultValue={viewTask.estimated_hours}
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
                                      defaultValue={viewTask.estimated_minutes}
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
                              <>
                                <div style={{ cursor: "pointer" }}>
                                  <Popover
                                    trigger="hover"
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
                                              setIsEditable((prevState) => ({
                                                ...prevState,
                                                estimated_time: false,
                                              }));
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
                                      <span
                                        onClick={() =>
                                          handleFieldClick("estimated_time")
                                        }
                                      >
                                        {`${taskDetails?.estimated_hours}:${taskDetails?.estimated_minutes}`}
                                      </span>
                                    </p>
                                  </Popover>
                                  {estError && (
                                    <div className="error-message">
                                      Logged hours cannot be greater than
                                      estimated hours.
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </Form.Item>
              </Form>

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
                              {moment(value?.due_date).format("DD-MMM-YYYY") ==
                              "Invalid date"
                                ? "-"
                                : moment(value?.due_date).format("DD-MMM-YYYY")}
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
                  <span className="comment-badge">{comments.length || 0}</span>
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
                                    __html: item?.comment,
                                  }}
                                ></span>
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
                    mainTaskId={taskDetails?.mainTask?._id}
                    onDraftChange={handleDraftChange}
                    updateTaskDraftStatus={updateTaskDraftStatus}
                  />
                </>
              ) : activeTab === "issue" ? (
                <div
                  className="tab-schedule-wrapper"
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
                              {moment(value?.due_date).format("DD-MMM-YYYY") ==
                              "Invalid date"
                                ? "-"
                                : moment(value?.due_date).format("DD-MMM-YYYY")}
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
                              <strong>
                                {removeTitle(item.createdBy.full_name)}
                              </strong>{" "}
                              added the task &nbsp;
                              <span className="hitory-time">
                                {calculateTimeDifference(item?.createdAt)} (
                                {moment(item?.createdAt).format("DD-MM-YYYY")})
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
                              {item.updatedBy.full_name} updated the task &nbsp;
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
        setOpenCommentModle={setOpenCommentModle}
      />
    </>
  );
};

TaskList.propTypes = {
  tasks: PropTypes.array.isRequired,
  showModalTaskModal: PropTypes.func.isRequired,
  showEditTaskModal: PropTypes.func.isRequired,
  getBoardTasks: PropTypes.func.isRequired,
  selectedTask: PropTypes.shape({
    project: PropTypes.shape({
      _id: PropTypes.string.isRequired,
    }),
    _id: PropTypes.string.isRequired,
  }),
  deleteTasks: PropTypes.func.isRequired,
  getProjectMianTask: PropTypes.func.isRequired,
};

export default React.memo(TaskList, (prevProps, nextProps) => {
  return isEqual(prevProps.tasks, nextProps.tasks);
});
