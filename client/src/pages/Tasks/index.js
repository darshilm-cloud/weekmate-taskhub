import React, { useMemo } from "react";
import {
  Button,
  Menu,
  Avatar,
  Checkbox,
  Modal,
  DatePicker,
  Input,
  Popover,
  Form,
  Select,
  Dropdown,
  Progress,
  Popconfirm,
  Badge,
  Tooltip,
  ConfigProvider,
  Row,
  Col,
} from "antd";
import {
  CalendarOutlined,
  RightOutlined,
  EditOutlined,
  MoreOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import TaskList from "./TasksKanbanBoard";
import "./style.css";
import dayjs from "dayjs";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import { getSpecificProjectWorkflowStage } from "../../appRedux/reducers/ApiData";
import ReactHTMLTableToExcel from "react-html-table-to-excel";
import TasksController from "./TasksController";
import { getRoles, hasPermission } from "../../util/hasPermission";
import MultiSelect from "../../components/CustomSelect/MultiSelect";
import MyAvatarGroup from "../../components/AvatarGroup/MyAvatarGroup";
import { removeTitle } from "../../util/nameFilter";
import MyAvatar from "../../components/Avatar/MyAvatar";
import TasksTableView from "./TasksTableView/TasksTableView";

function TasksPMS({ flag }) {
  const {
    yourMenu,
    Search,
    searchRef,
    onSearch,
    resetSearchFilter,
    projectMianTask,
    countTasks,
    handleSelectTask,
    selectedTask,
    handlemenuClick,
    showModalList,
    deleteProjectmaintask,
    filterStatus,
    handleFilterStatus,
    filterStatusSearchInput,
    setFilterStatusSearchInput,
    boardTasks,
    filterAssigned,
    handleSelectionAssignedFilter,
    filterAssignedSearchInput,
    setFilterAssignedSearchInput,
    subscribersList,
    clientsList,
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
    deleteTasks,
    isModalOpenList,
    handleCancelList,
    handleOkList,
    modalMode,
    listForm,
    addProjectMainTask,
    editProjectmainTask,
    dispatch,
    projectId,
    stagesId,
    defaultStageId,
    projectWorkflowStage,
    isModalOpenTaskModal,
    handleCancelTaskModal,
    addform,
    handleTaskOps,
    addInputTaskData,
    handleTaskInput,
    isAlterEstimatedTime,
    estHrs,
    handleEstTimeInput,
    estMins,
    setIsAlterEstimatedTime,
    estTime,
    removeEstTIme,
    fileAttachment,
    attachmentfileRef,
    removeAttachmentFile,
    foldersList,
    onFileChange,
    onSearchTask,
    handleAllFilter,
    setOpenStatus,
    openStatus,
    handleOpenChangeStatus,
    getStatusTitleById,
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
    Option,
    getProjectMianTask,
    isEditTaskModalOpen,
    editform,
    openLabels,
    setOpenLabels,
    isPrivate,
    setIsprivate,
    exportCsv,
    html,
    editorData,
    handleChangeData,
    handlePaste,
    handlePasteData,
    editModalDescription,
    handleChnageDescription,
    handleSelectedItemsChange,
    selectedItems,
    selectSubscriber,
    setSelectSubscribers,
    handleSubscribersChange,
    selectedListClient,
    setSelectedListClient,
    handleListClientChange,
    searchKeyword,
    handleSearch,
    estHrsError,
    estMinsError,
    projectAssignees,
    importRef,
    exportSampleCSVfile,
    importCsvFile,
    setIsCopyModalOpen,
    isCopyModalOpen,
    showModalCopyList,
    copyTaskList,
    copyTaskListData,
    handleCopyTaskList,
    handleFieldChange,
    ManagePeople,
    setManagePeople,
    tableTrue,
    handleChangeTableView,
    selectedView,
    workflowStatusList,
    updateSubTaskListInStatus,
    updateSubTaskListInMainTask,
    task_ids,
    selectedWorkflowStatus,
    setSelectedWorkflowStatus,
    selectedMainTask,
    setSelectedMainTask,
    updateTaskDraftStatus,
    checkTaskDrafts,
  } = TasksController({ flag });

  const csvRef = document.getElementById("test-table-xls-button");
  const menu = (
    <Menu>
      <Menu.Item key="1" onClick={ () => handleChangeTableView("table") }>
        Table View
      </Menu.Item>
      <Menu.Item key="2" onClick={ () => handleChangeTableView("board") }>
        Board View
      </Menu.Item>
    </Menu>
  );

  const handleSubmit = () => {
    if (
      selectedMainTask &&
      selectedMainTask != "a" &&
      selectedWorkflowStatus == "a"
    ) {
      updateSubTaskListInMainTask(selectedMainTask);
      setSelectedMainTask("a");
    } else if (
      selectedWorkflowStatus &&
      selectedWorkflowStatus != "a" &&
      selectedMainTask == "a"
    ) {
      updateSubTaskListInStatus(selectedWorkflowStatus);
      setSelectedWorkflowStatus("a");
    } else if (selectedWorkflowStatus != "a" && selectedMainTask != "a") {
      updateSubTaskListInMainTask(selectedMainTask);
      updateSubTaskListInStatus(selectedWorkflowStatus);
      setSelectedMainTask("a");
      setSelectedWorkflowStatus("a");
    } else {
      return;
    }
  };

  const filteredTasks = useMemo(
    () => filterTasks(boardTasks, filterSchema),
    [boardTasks, filterSchema]
  );

  return (
    <>
      <div className="project-wrapper discussion-wrapper task-wrapper">
        <div className="peoject-page">
          <div className="profileleftbar">
            <div className="add-project-wrapper">
              { hasPermission(["task_add"]) && (
                <Dropdown trigger={ ["click"] } overlay={ yourMenu }>
                  <Button className="add-btn">
                    <i className="fi fi-br-plus"></i> Add
                    <i className="fi fi-ss-angle-small-down"></i>
                  </Button>
                </Dropdown>
              ) }
              <Search
                ref={ searchRef }
                placeholder="Search..."
                onSearch={ onSearch }
                onKeyUp={ resetSearchFilter }
                style={ { width: 200 } }
                className="mr2"
              />
            </div>

            <ul style={ { listStyle: "none", padding: "0" } }>
              { projectMianTask.length != 0 &&
                projectMianTask.map((item, index) => {
                  const tasksInfo = countTasks(item);
                  return (
                    <li
                      className="design-graph-wrapper"
                      key={ `${index}_${item?._id}` }
                      style={ { cursor: "pointer" } }
                      onClick={ () => handleSelectTask(item) }
                    >
                      <div
                        className={
                          selectedTask?._id == item?._id
                            ? "design-graph"
                            : "design-graph-inactive"
                        }
                      >
                        <span className="discussion-pin-wrapper">
                          { item.isPrivateList && (
                            <span className="flex">
                              { item.isPrivateList && (
                                <i className="fi fi-sr-lock"></i>
                              ) }
                            </span>
                          ) }
                          <span
                            className="label-of"
                            style={ {
                              textTransform: "capitalize",
                              wordWrap: "break-word",
                            } }
                          >
                            { item?.title }
                          </span>
                        </span>
                        <div className="process_list">
                          <Progress percent={ tasksInfo.percent } />
                          <span className="process_bar">
                            { tasksInfo.taskCount }
                          </span>
                        </div>
                        { hasPermission(["task_add"]) && (
                          <Dropdown
                            overlay={
                              <Menu onClick={ handlemenuClick }>
                                <Menu.Item
                                  key="edit"
                                  onClick={ () => showModalList(item?._id) }
                                  icon={
                                    <EditOutlined style={ { color: "green" } } />
                                  }
                                >
                                  Edit
                                </Menu.Item>
                                <Popconfirm
                                  title="Do you want to delete?"
                                  okText="Yes"
                                  cancelText="No"
                                  onConfirm={ () =>
                                    deleteProjectmaintask(item?._id)
                                  }
                                >
                                  <Menu.Item
                                    key="delete"
                                    className="ant-delete"
                                    icon={
                                      <DeleteOutlined
                                        style={ { color: "red" } }
                                      />
                                    }
                                  >
                                    Delete
                                  </Menu.Item>
                                </Popconfirm>
                                <Menu.Item
                                  onClick={ () => {
                                    setIsCopyModalOpen(true);
                                    showModalCopyList(item?._id);
                                  } }
                                  icon={ <CopyOutlined /> }
                                >
                                  Create a Copy
                                </Menu.Item>
                              </Menu>
                            }
                            trigger={ ["click"] }
                          >
                            <a onClick={ (e) => e.preventDefault() }>
                              <MoreOutlined className="moreoutline-icon" />
                            </a>
                          </Dropdown>
                        ) }
                      </div>
                    </li>
                  );
                }) }
            </ul>
          </div>

          <div className="profilerightbar">
            { task_ids?.length > 0 ? (
              <div
                className={ `profile-sub-head ${task_ids?.length > 0 ? "update-task" : ""
                  }` }
              >
                <div className="head-box-inner">
                  <div className="update-workflow-status">
                    <Form
                      onFinish={ handleSubmit }
                      className="update-workflow-status-form"
                    >
                      { hasPermission(["task_add"]) && (
                        <Form.Item
                          name="mainTask"
                          className="update-workflow-status-formitem"
                        >
                          <Select
                            defaultValue={ selectedMainTask }
                            onChange={ (data) => setSelectedMainTask(data) }
                            style={ { width: 200 } }
                            showSearch
                            filterOption={ (input, option) =>
                              option.children
                                ?.toLowerCase()
                                ?.indexOf(input?.toLowerCase()) >= 0
                            }
                          >
                            <Option key={ "a" } disabled>
                              Select list to move task
                            </Option>
                            { projectMianTask?.map((item, index) => (
                              <Option
                                key={ index }
                                value={ item?._id }
                                style={ { textTransform: "capitalize" } }
                              >
                                { item.title }
                              </Option>
                            )) }
                          </Select>
                        </Form.Item>
                      ) }
                      <Form.Item name="workflowStatus">
                        <Select
                          defaultValue={ selectedWorkflowStatus }
                          onChange={ (data) => setSelectedWorkflowStatus(data) }
                          style={ { width: 210 } }
                          showSearch
                          filterOption={ (input, option) =>
                            option.children
                              ?.toLowerCase()
                              ?.indexOf(input?.toLowerCase()) >= 0
                          }
                        >
                          <Option key={ "a" } disabled>
                            Select stage to move task
                          </Option>
                          { workflowStatusList?.map((item, index) => (
                            <Option
                              key={ index }
                              value={ item?._id }
                              style={ { textTransform: "capitalize" } }
                            >
                              { item.title }
                            </Option>
                          )) }
                        </Select>
                      </Form.Item>
                      <Form.Item>
                        <Button
                          className="ant-btn-primary"
                          type="primary"
                          htmlType="submit"
                          disabled={
                            selectedMainTask == "a" &&
                              selectedWorkflowStatus == "a"
                              ? true
                              : false
                          }
                        >
                          Apply
                        </Button>
                      </Form.Item>
                      <Form.Item>
                        <Button
                          className="ant-delete"
                          type="primary"
                          htmlType="reset"
                          onClick={ () => {
                            setSelectedMainTask("a");
                            setSelectedWorkflowStatus("a");
                          } }
                        >
                          Clear
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="profile-sub-head">
                <div className="task-sub-header">
                  <div className="head-box-inner">
                    <Search
                      ref={ searchRef }
                      placeholder="Search..."
                      onSearch={ onSearchTask }
                      style={ { width: 200 } }
                      className="mr2"
                    />
                    <div style={ { cursor: "pointer" } }>
                      <div className="status-content">
                        <ConfigProvider>
                          <Dropdown overlay={ menu } trigger={ ["click"] }>
                            <div className="dropdown-trigger">
                              { selectedView === "table"
                                ? "Table View"
                                : "Board View" }
                              <i className="fa-solid fa-table"></i>
                            </div>
                          </Dropdown>
                        </ConfigProvider>
                      </div>
                    </div>
                  </div>

                  <div className="block-status-content">
                    <div className="filter-btn-wrapper">
                      <div
                        style={ { cursor: "pointer" } }
                        className="status-content"
                      >
                        <Popover
                          placement="bottomRight"
                          content={
                            <div className="right-popover-wrapper">
                              <ul>
                                <li>
                                  <Checkbox
                                    checked={ filterStatus == "" }
                                    value={ "" }
                                    onChange={ handleFilterStatus }
                                  >
                                    { " " }
                                    All
                                  </Checkbox>
                                </li>
                              </ul>

                              <div>
                                <Search
                                  value={ filterStatusSearchInput }
                                  onSearch={ (val) =>
                                    setFilterStatusSearchInput(val)
                                  }
                                  onChange={ (e) =>
                                    setFilterStatusSearchInput(e.target.value)
                                  }
                                />
                              </div>
                              <ul className="assigness-data">
                                { boardTasks
                                  ?.filter((item) =>
                                    item.workflowStatus?.title
                                      .toLowerCase()
                                      .includes(
                                        filterStatusSearchInput.toLowerCase()
                                      )
                                  )
                                  .map((val, index) => (
                                    <li key={ index }>
                                      <Checkbox
                                        checked={
                                          filterStatus ==
                                          val?.workflowStatus?._id
                                        }
                                        value={ val?.workflowStatus?._id }
                                        onChange={ handleFilterStatus }
                                      >
                                        { " " }
                                        { val?.workflowStatus?.title }{ " " }
                                      </Checkbox>
                                    </li>
                                  )) }
                              </ul>
                              <div className="popver-footer-btn">
                                <Button
                                  onClick={ () =>
                                    handleAllFilter(
                                      "workflowStatusId",
                                      filterStatus
                                    )
                                  }
                                  type="primary"
                                  className="square-primary-btn ant-btn-primary"
                                >
                                  Apply
                                </Button>
                                <Button
                                  className="square-outline-btn ant-delete"
                                  onClick={ () => {
                                    setOpenStatus(false);
                                    setFilterStatusSearchInput("");
                                  } }
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          }
                          trigger="click"
                          open={ projectMianTask.length > 0 ? openStatus : false }
                          onOpenChange={ handleOpenChangeStatus }
                        >
                          <Button className="dropdown-button">
                            <span className="filter-text">
                              <span>Status:</span>
                              <span>
                                { filterStatus
                                  ? getStatusTitleById(filterStatus)
                                  : "All" }
                              </span>
                            </span>
                          </Button>
                        </Popover>
                      </div>

                      <div
                        style={ { cursor: "pointer" } }
                        className="status-content"
                      >
                        <Popover
                          placement="bottomRight"
                          content={
                            <div className="right-popover-wrapper">
                              <ul>
                                <div className="filter-search-box">
                                  <ul>
                                    <li>
                                      <Checkbox
                                        checked={ filterAssigned.length == 0 }
                                        onChange={ () =>
                                          handleSelectionAssignedFilter(
                                            "",
                                            true
                                          )
                                        }
                                      >
                                        { " " }
                                        All
                                      </Checkbox>
                                    </li>

                                    <li>
                                      <Checkbox
                                        checked={ filterAssigned == "unassigned" }
                                        onChange={ () =>
                                          handleSelectionAssignedFilter(
                                            "unassigned"
                                          )
                                        }
                                      >
                                        { " " }
                                        Unassigned Tasks
                                      </Checkbox>
                                    </li>
                                  </ul>
                                  <div>
                                    <Search
                                      value={ filterAssignedSearchInput }
                                      onSearch={ (val) =>
                                        setFilterAssignedSearchInput(val)
                                      }
                                      onChange={ (e) =>
                                        setFilterAssignedSearchInput(
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                                <ul className="assigness-data">
                                  {/* {employeeList */ }
                                  { subscribersList
                                    .filter((item) =>
                                      item?.full_name
                                        .toLowerCase()
                                        .includes(
                                          filterAssignedSearchInput.toLowerCase()
                                        )
                                    )
                                    .map((item, index) => (
                                      <li
                                        key={ index }
                                        className={
                                          filterAssigned.includes(item?._id)
                                            ? "selected-filter-member"
                                            : ""
                                        }
                                      >
                                        <Checkbox
                                          key={ index }
                                          checked={ filterAssigned.includes(
                                            item?._id
                                          ) }
                                          onChange={ () =>
                                            handleSelectionAssignedFilter(
                                              item?._id
                                            )
                                          }
                                        />
                                        <MyAvatar
                                          userName={ item?.full_name }
                                          key={ item?._id }
                                          alt={ item?.full_name }
                                          src={ item.emp_img }
                                        />

                                        { removeTitle(item.full_name) }
                                      </li>
                                    )) }
                                </ul>
                                <div className="popver-footer-btn">
                                  <Button
                                    onClick={ () =>
                                      handleAllFilter(
                                        "assigneeIds",
                                        filterAssigned
                                      )
                                    }
                                    type="primary"
                                    className="square-primary-btn ant-btn-primary"
                                  >
                                    Apply
                                  </Button>
                                  <Button
                                    className="square-outline-btn ant-delete"
                                    onClick={ () => {
                                      setOpenAssignees(false);
                                      setFilterAssignedSearchInput("");
                                    } }
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </ul>
                            </div>
                          }
                          trigger="click"
                          open={ openAssignees && projectMianTask.length > 0 }
                          onOpenChange={ handleOpenChangeAssignees }
                        >
                          <Button className="dropdown-button">
                            <span className="filter-text">
                              <span>Assigned:</span>
                              <span>
                                { filterAssigned.length == 0
                                  ? "All"
                                  : filterAssigned == "unassigned"
                                    ? "Unassigned Tasks"
                                    : "Selected" }
                              </span>
                            </span>
                          </Button>
                        </Popover>
                      </div>

                      <div
                        style={ { cursor: "pointer" } }
                        className="status-content"
                      >
                        <Popover
                          placement="bottom"
                          trigger="click"
                          content={
                            <div className="right-popover-wrapper popover-task">
                              <Form.Item label="Start Date">
                                <Select
                                  defaultValue="Any"
                                  onChange={ handleStartChange }
                                  options={ DateOption }
                                ></Select>
                                { selectValStartdate && (
                                  <div className="calender-event-block">
                                    <Form.Item>
                                      <DatePicker
                                        onChange={ (_, dateString) =>
                                          handleStartDateRange(0, dateString)
                                        }
                                      >
                                        <CalendarOutlined />
                                      </DatePicker>
                                    </Form.Item>
                                    to
                                    <Form.Item>
                                      <DatePicker
                                        onChange={ (_, dateString) =>
                                          handleStartDateRange(1, dateString)
                                        }
                                      >
                                        <CalendarOutlined />
                                      </DatePicker>
                                    </Form.Item>
                                  </div>
                                ) }
                              </Form.Item>

                              <Form.Item label="Due Date">
                                <Select
                                  defaultValue="Any"
                                  onChange={ handleDueChange }
                                  options={ DateOption }
                                ></Select>
                                { selectValDuedate && (
                                  <div className="calender-event-block">
                                    <Form.Item>
                                      <DatePicker
                                        onChange={ (_, dateString) =>
                                          handleDueDateRange(0, dateString)
                                        }
                                      >
                                        <CalendarOutlined />
                                      </DatePicker>
                                    </Form.Item>
                                    to
                                    <Form.Item>
                                      <DatePicker
                                        onChange={ (_, dateString) =>
                                          handleDueDateRange(0, dateString)
                                        }
                                      >
                                        <CalendarOutlined />
                                      </DatePicker>
                                    </Form.Item>
                                  </div>
                                ) }
                              </Form.Item>
                              <div className="popver-footer-btn">
                                <Button
                                  onClick={ () => {
                                    handleStartDueFilter(
                                      filterStartDate,
                                      filterDueDate
                                    );
                                  } }
                                  type="primary"
                                  className="square-primary-btn ant-btn-primary"
                                >
                                  Apply
                                </Button>
                                <Button
                                  type="outlined"
                                  onClick={ () => {
                                    setIsPopoverVisibleView(false);
                                    setSelectValDuedate(false);
                                  } }
                                  className="square-outline-btn ant-delete"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          }
                          visible={
                            isPopoverVisibleView && projectMianTask.length > 0
                          }
                          onVisibleChange={ setIsPopoverVisibleView }
                        >
                          <Button className="dropdown-button">
                            <span className="filter-text">
                              <span
                                onClick={ () =>
                                  setIsPopoverVisibleView(!isPopoverVisibleView)
                                }
                              >
                                View:
                              </span>
                              <span>
                                <i className="fi fi-rr-calendar-minus"></i>
                                Start:{ " " }
                                { !Array.isArray(filterStartDate)
                                  ? DateOption.find(
                                    (val) => val.value == filterStartDate
                                  ).label
                                  : "Custom" }
                                , Due:{ " " }
                                { !Array.isArray(filterDueDate)
                                  ? DateOption.find(
                                    (val) => val.value == filterDueDate
                                  ).label
                                  : "Custom" }
                              </span>
                            </span>
                          </Button>
                        </Popover>
                      </div>

                      <div
                        style={ { cursor: "pointer" } }
                        className="status-content"
                      >
                        <Popover
                          placement="bottomRight"
                          content={
                            <div className="right-popover-wrapper">
                              <ul>
                                <li>
                                  <Checkbox
                                    checked={ filterOnLabels.length == 0 }
                                    onChange={ () =>
                                      handleSelectionlabelFilter("", true)
                                    }
                                  >
                                    All
                                  </Checkbox>
                                </li>
                                <li>
                                  <Checkbox
                                    checked={ filterOnLabels == "unlabelled" }
                                    onChange={ () =>
                                      handleSelectionlabelFilter("unlabelled")
                                    }
                                  >
                                    Unlabelled Task
                                  </Checkbox>
                                </li>
                              </ul>
                              <div>
                                <Search
                                  value={ filterLabelsSearchInput }
                                  onSearch={ (val) =>
                                    setFilterLabelsSearchInput(val)
                                  }
                                  onChange={ (e) =>
                                    setFilterLabelsSearchInput(e.target.value)
                                  }
                                />
                              </div>

                              <span>
                                <RightOutlined />
                                Global Labels
                              </span>
                              <ul className="assigness-data">
                                { projectLabels
                                  .filter((item) =>
                                    item.title
                                      .toLowerCase()
                                      .includes(
                                        filterLabelsSearchInput.toLowerCase()
                                      )
                                  )
                                  .map((item) => (
                                    <li
                                      onClick={ () =>
                                        handleSelectionlabelFilter(item?._id)
                                      }
                                      className={
                                        filterOnLabels.includes(item?._id)
                                          ? "selected-filter-member"
                                          : ""
                                      }
                                      key={ item?._id }
                                    >
                                      <Avatar
                                        style={ { background: item.color } }
                                      ></Avatar>{ " " }
                                      { item.title }
                                    </li>
                                  )) }
                              </ul>
                              <div className="popver-footer-btn">
                                <Button
                                  onClick={ () =>
                                    handleAllFilter("labelIds", filterOnLabels)
                                  }
                                  type="primary"
                                  className="square-primary-btn ant-btn-primary"
                                >
                                  Apply
                                </Button>
                                <Button
                                  className="square-outline-btn ant-delete"
                                  onClick={ () => {
                                    setOpenLabels(false);
                                    setFilterLabelsSearchInput("");
                                  } }
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          }
                          trigger="click"
                          open={ openLabels && projectMianTask.length > 0 }
                          onOpenChange={ handleChangeLabels }
                        >
                          <Button className="dropdown-button">
                            <span className="filter-text">
                              <span>Labels:</span>
                              <span>
                                { filterOnLabels.length == 0
                                  ? "All"
                                  : filterOnLabels == "unlabelled"
                                    ? "Unlabelled Task"
                                    : "Selected" }
                              </span>
                            </span>
                          </Button>
                        </Popover>
                      </div>

                      <div className="status-content after-border">
                        <div className="avtar-group">
                          <MyAvatarGroup
                            key={ projectId }
                            customStyle={ { height: "30px", width: "30px" } }
                            record={ projectAssignees?.assignees }
                            maxPopoverTrigger={ "click" }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={ { cursor: "pointer" } }>
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
                      dangerouslySetInnerHTML={ { __html: html["html"] } }
                    ></div>
                  </div>
                  <Popover
                    placement="bottomRight"
                    content={
                      <div className="task-elipse-pop">
                        { hasPermission(["task_add"]) && (
                          <>
                            <div className="sample-csv">
                              <h6>Sample CSV:</h6>
                              <i
                                onClick={ () => exportSampleCSVfile() }
                                style={ {
                                  color: "#358CC0",
                                  fontSize: "16px",
                                  cursor: "pointer",
                                } }
                                className="fi fi-rr-file-download"
                              ></i>
                              <input
                                type="file"
                                size="small"
                                onChange={ (e) => {
                                  const file = e.target.files[0];
                                  importCsvFile(file);
                                } }
                                onClick={ (e) => (e.target.value = null) }
                                style={ { display: "none" } }
                                ref={ importRef }
                                accept="xlsx, .xls, .csv"
                              />
                            </div>
                          </>
                        ) }

                        { hasPermission(["task_add"]) && (
                          <>
                            <div className="sample-csv">
                              <h6>Import CSV:</h6>
                              <i
                                style={ {
                                  color: "#358CC0",
                                  fontSize: "16px",
                                  cursor: "pointer",
                                } }
                                onClick={ () => importRef.current.click() }
                                className="fi fi-rr-file-import"
                              ></i>
                            </div>
                          </>
                        ) }
                        <div className="sample-csv">
                          <h6>Export CSV:</h6>
                          <i
                            onClick={ () => {
                              exportCsv();
                              csvRef.click();
                            } }
                            style={ {
                              color: "#358CC0",
                              fontSize: "16px",
                              cursor: "pointer",
                            } }
                            className="fi fi-rr-file-download"
                          ></i>
                        </div>
                      </div>
                    }
                    trigger="click"
                  >
                    <div style={ { cursor: "pointer" } }>
                      <label>
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                      </label>
                    </div>
                  </Popover>
                </div>
              </div>
            ) }

            { projectMianTask.length === 0 && (
              <div className="error-message">
                <p>No Data</p>
              </div>
            ) }
            { console.log("RENDER") }
            { tableTrue === false ? (
              <TaskList
                updateTaskDraftStatus={ updateTaskDraftStatus }
                checkTaskDrafts={ checkTaskDrafts }
                boardTasks={ boardTasks }
                tasks={ filteredTasks }
                showEditTaskModal={ showEditTaskModal }
                showModalTaskModal={ showModalTaskModal }
                getBoardTasks={ getBoardTasks }
                selectedTask={ selectedTask }
                deleteTasks={ deleteTasks }
                getProjectMianTask={ getProjectMianTask }
              />
            ) : (
              <TasksTableView
                tasks={ filteredTasks }
                showEditTaskModal={ showEditTaskModal }
                showModalTaskModal={ showModalTaskModal }
                getBoardTasks={ getBoardTasks }
                selectedTask={ selectedTask }
                deleteTasks={ deleteTasks }
                getProjectMianTask={ getProjectMianTask }
              />
            ) }
          </div>
        </div>
      </div>

      <Modal
        open={ isModalOpenList }
        onCancel={ handleCancelList }
        onOk={ handleOkList }
        title={ modalMode === "add" ? "Add List" : "Ed it List" }
        className="add-task-modal add-list-modal"
        width={ 800 }

        footer={ [

          <Button
            key="cancel"
            onClick={ handleCancelList }
            className="delete-btn"
            size="large"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            className="square-primary-btn"
            size="large"
            onClick={ () => listForm.submit() }
          >
            Save
          </Button>,
        ] }
      >
        <div className="overview-modal-wrapper">
          <Form
            form={ listForm }
            layout="vertical"
            initialValues={ { isPrivateList: false } }
            onFinish={ (values) => {
              modalMode === "add"
                ? addProjectMainTask(values)
                : editProjectmainTask(values);
            } }
          >
            <Row gutter={ [0, 0] }>
              {/* Title Field */ }
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Form.Item
                  label="Title"
                  name="title"
                  rules={ [
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter a valid title",
                    },
                  ] }
                >
                  <Input placeholder="Enter title" size="large" />
                </Form.Item>
              </Col>

              {/* Subscribers */ }
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item label="Subscribers" className="subscriber-section">
                  <MultiSelect
                    onSearch={ handleSearch }
                    onChange={ handleSubscribersChange }
                    values={ selectSubscriber }
                    listData={ subscribersList }
                    search={ searchKeyword }
                  />

                  { selectSubscriber.length > 0 && (
                    <div style={ { marginTop: 8 } }>
                      <Button
                        className="list-clear-btn ant-delete"
                        onClick={ () => setSelectSubscribers([]) }
                        size="small"
                      >
                        Clear
                      </Button>
                    </div>
                  ) }
                </Form.Item>
              </Col>

              {/* Client */ }
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item label="Client" className="client-section">
                  <MultiSelect
                    onSearch={ handleSearch }
                    onChange={ handleListClientChange }
                    values={
                      selectedListClient
                        ? selectedListClient.map((item) => item?._id)
                        : []
                    }
                    listData={ clientsList }
                    search={ searchKeyword }
                  />

                  { selectedListClient && selectedListClient.length > 0 && (
                    <div style={ { marginTop: 8 } }>
                      <Button
                        className="list-clear-btn ant-delete"
                        onClick={ () => setSelectedListClient([]) }
                        size="small"
                      >
                        Clear
                      </Button>
                    </div>
                  ) }
                </Form.Item>
              </Col>

              {/* Dynamic Subscriber Stages */ }
              { selectSubscriber.length > 0 && (
                <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                  <div className="subscriber-stages-section">
                    <h4
                      style={ {
                        marginBottom: 16,
                        color: "#666",
                        fontSize: "16px",
                        fontWeight: 500,
                      } }
                    >
                      Assign Stages to Subscribers
                    </h4>
                    <Row gutter={ [16, 16] }>
                      { selectSubscriber.map((subscriberId, index) => {
                        const subscriber = subscribersList.find(
                          (item) => item?._id === subscriberId
                        );

                        return (
                          <Col xs={ 24 } sm={ 12 } md={ 8 } lg={ 8 } key={ index }>
                            <div className="subscriber-stage-card">
                              {/* Subscriber Info */ }
                              <div className="subscriber-info">
                                <MyAvatar
                                  userName={ subscriber?.full_name }
                                  key={ subscriber?.full_name }
                                  alt={ subscriber?.full_name }
                                  src={ subscriber?.emp_img }
                                  size="default"
                                />
                                <span className="subscriber-name">
                                  { removeTitle(subscriber?.full_name) }
                                </span>
                              </div>

                              {/* Stage Selection */ }
                              <Form.Item
                                label="Stage"
                                name={ ["subscriber_stages", index] }
                                className="stage-select-item"
                                rules={ [
                                  {
                                    required: true,
                                    message: "Please select a stage",
                                  },
                                ] }
                              >
                                <Select
                                  size="large"
                                  placeholder="Select Stage"
                                  showSearch
                                  filterOption={ (input, option) =>
                                    option.children
                                      .toLowerCase()
                                      .indexOf(input.toLowerCase()) >= 0
                                  }
                                  filterSort={ (optionA, optionB) =>
                                    optionA.children
                                      .toLowerCase()
                                      .localeCompare(
                                        optionB.children.toLowerCase()
                                      )
                                  }
                                  onDropdownVisibleChange={ (open) =>
                                    open &&
                                    dispatch(
                                      getSpecificProjectWorkflowStage(stagesId)
                                    )
                                  }
                                  defaultValue={ defaultStageId }
                                >
                                  { projectWorkflowStage.map(
                                    (item, stageIndex) => (
                                      <Option
                                        key={ stageIndex }
                                        value={ item?._id }
                                        style={ { textTransform: "capitalize" } }
                                      >
                                        { item.title }
                                      </Option>
                                    )
                                  ) }
                                </Select>
                              </Form.Item>
                            </div>
                          </Col>
                        );
                      }) }
                    </Row>
                  </div>
                </Col>
              ) }
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>

                <Form.Item
                  key="checkbox"
                  name="markAsPrivate"
                  valuePropName="checked"

                >
                  <Checkbox
                    checked={ isPrivate === true ? true : false }
                    onChange={ e => setIsprivate(e.target.checked) }
                  >
                    Mark as Private
                  </Checkbox>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>

      <Modal
        title="Add Task"
        open={ isModalOpenTaskModal }
        width={ 880 }
        onCancel={ handleCancelTaskModal }
        className="add-task-modal model-task-add-details"

        footer={ [
          <Button key="cancel" className="delete-btn" onClick={ handleCancelTaskModal } size="large">
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            onClick={ () => addform.submit() }
          >
            Save
          </Button>,

        ] }
      >
        <div className="overview-modal-wrapper">
          <Form
            form={ addform }
            onFinish={ (values) => {
              handleTaskOps(values);
            } }
          >
            <Row gutter={ [0, 0] }>
              {/* Title - Full width */ }
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Form.Item
                  name="title"
                  rules={ [
                    {
                      required: true,
                      whitespace: true, // Trims whitespace
                      message: "Please enter a valid title",
                    },
                  ] }
                >
                  <Input placeholder="Title" />
                </Form.Item>
              </Col>
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>

                <Form.Item colon={ false } name="descriptions">
                  <CKEditor
                    editor={ Custombuild }
                    data={ editorData }
                    onChange={ handleChangeData }
                    onPaste={ handlePaste }
                    config={ {
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
                      styles: {
                        height: "10px",
                      },
                    } }
                  />
                </Form.Item>
              </Col>

              <Form.Item name="start_date">
                <div className="table-schedule-wrapper">
                  <ul>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-calendar-day"></i>
                          <DatePicker
                            value={
                              addInputTaskData?.start_date &&
                              dayjs(addInputTaskData?.start_date, "YYYY-MM-DD")
                            }
                            onChange={ (date, dateString) =>
                              handleTaskInput("start_date", dateString)
                            }
                            placeholder="Start Date"
                          />
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <i className="fi fi-rr-calendar-day"></i>
                          <DatePicker
                            value={
                              addInputTaskData?.end_date &&
                              dayjs(addInputTaskData?.end_date, "YYYY-MM-DD")
                            }
                            disabledDate={ (current) =>
                              current &&
                              current <
                              dayjs(
                                addInputTaskData?.start_date,
                                "YYYY-MM-DD"
                              )
                            }
                            placeholder="End Date"
                            onChange={ (date, dateString) =>
                              handleTaskInput("end_date", dateString)
                            }
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
                          <Select
                            value={ addInputTaskData?.labels }
                            // showSearch
                            allowClear
                            placeholder="Select"
                            onChange={ (value) =>
                              handleTaskInput("labels", value)
                            }
                          >
                            { projectLabels.map((item, index) => (
                              <Option
                                key={ item?._id }
                                value={ item?._id }
                                style={ { textTransform: "capitalize" } }
                              >
                                { item.title }
                              </Option>
                            )) }
                          </Select>
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
                          <MultiSelect
                            onSearch={ handleSearch }
                            onChange={ handleSelectedItemsChange }
                            values={
                              selectedItems
                                ? selectedItems.map((item) => item?._id)
                                : []
                            }
                            listData={ subscribersList }
                            search={ searchKeyword }
                          />
                        </div>
                      </div>
                    </li>

                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-clock"></i>
                          <span className="schedule-label">
                            Estimated Time
                            { !getRoles(["Client"]) && (
                              <span style={ { color: "red" } }>*</span>
                            ) }
                          </span>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <div className="estimated_time_input_container">
                            <div className="hours_min_container">
                              <Input
                                min={ 0 }
                                value={ estHrs }
                                type="number"
                                onChange={ (e) =>
                                  handleEstTimeInput("est_hrs", e.target.value)
                                }
                                className={ `hours_input ${estHrsError && "error-border"
                                  }` }
                                placeholder="Hours"
                              />
                              <div style={ { color: "red" } }>{ estHrsError }</div>
                            </div>
                            <div className="hours_min_container">
                              <Input
                                min={ 0 }
                                max={ 59 }
                                type="number"
                                value={ estMins }
                                onChange={ (e) => {
                                  if (e.target.value * 1 > 60)
                                    return e.preventDefault();
                                  handleEstTimeInput(
                                    "est_mins",
                                    e.target.value
                                  );
                                } }
                                className={ `hours_input ${estMinsError && "error-border"
                                  }` }
                                placeholder="Minutes"
                              />
                              <div style={ { color: "red" } }>{ estMinsError }</div>
                            </div>
                          </div>

                          { !isAlterEstimatedTime && estTime && (
                            <div className="estimated_setTime_container">
                              <span
                                onClick={ () => setIsAlterEstimatedTime(true) }
                                className="schedule-label"
                              >
                                Estimated Time: { estTime }
                              </span>
                              <div className="est_time_crossIcon">
                                <CloseCircleOutlined onClick={ removeEstTIme } />
                              </div>
                            </div>
                          ) }
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </Form.Item>

              <div className="fileAttachment_container">
                { fileAttachment.map((file, index) => (
                  <Badge
                    key={ index }
                    count={
                      <CloseCircleOutlined
                        onClick={ () => removeAttachmentFile(index) }
                      />
                    }
                  >
                    <div className="fileAttachment_Box">
                      <p className="fileNameTxtellipsis">
                        { file.name.length > 15
                          ? `${file.name.slice(0, 15)}.....${file.type}`
                          : file.name + file.type }
                      </p>
                    </div>
                  </Badge>
                )) }
              </div>
              { fileAttachment.length > 0 && (
                <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                  <Form.Item
                    label="Folder"
                    name="folder"
                    initialValue={
                      foldersList.length > 0 ? foldersList[0]?._id : undefined
                    }
                    rules={ [
                      {
                        required: true,
                      },
                    ] }
                  >
                    <Select placeholder="Please Select Folder" showSearch>
                      { foldersList.map(data => (
                        <Option
                          key={ data?._id }
                          value={ data?._id }
                          style={ { textTransform: "capitalize" } }
                        >
                          { data.name }
                        </Option>
                      )) }
                    </Select>
                  </Form.Item>
                </Col>
              ) }
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Tooltip placement="top" title="Attached file">
                  <Button
                    className="link-btn"
                    onClick={ () => attachmentfileRef.current.click() }
                  >
                    <i className="fi fi-ss-link"></i>Attach files
                  </Button>
                </Tooltip>
                <input
                  multiple
                  type="file"
                  accept="*"
                  onChange={ onFileChange }
                  hidden
                  ref={ attachmentfileRef }
                />
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>



      <Modal
        open={ isEditTaskModalOpen }
        onCancel={ handleCancelTaskModal }
        title="Edit Task"
        className="edit-task-modal edit-details-task-model"
        width="90%"
        style={ { maxWidth: 1000 } }
        zIndex={ 2000 }
        footer={ [
          <Button key="cancel" onClick={ handleCancelTaskModal } size="large" className="square-outline-btn ant-delete">
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            className="square-primary-btn"
            onClick={ () => editform.submit() }
          >
            Save
          </Button>,

        ] }
      >
        <div className="overview-modal-wrapper task-overview-modal-wrapper">
          <Form
            form={ editform }
            layout="vertical"
            onFinish={ (values) => {
              handleTaskOps(values, true);
            } }
          >
            <Row gutter={ [0, 0] }>
              {/* Task Title - Full width */ }
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Form.Item
                  label="Title"
                  name="title"
                  rules={ [
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter a valid title",
                    },
                  ] }
                >
                  <Input placeholder="Title" size="large" />
                </Form.Item>
              </Col>

              {/* Description - Full width */ }
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Form.Item label="Description" name="descriptions">
                  <CKEditor
                    editor={ Custombuild }
                    data={ editModalDescription }
                    onChange={ handleChnageDescription }
                    onPaste={ handlePasteData }
                    config={ {
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
                      styles: {
                        height: "10px",
                      },
                    } }
                  />
                </Form.Item>
              </Col>

              <Form.Item>
                <div className="table-schedule-wrapper">
                  <ul>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-calendar-day"></i>
                          <DatePicker
                            value={
                              addInputTaskData?.start_date &&
                              dayjs(addInputTaskData?.start_date, "YYYY-MM-DD")
                            }
                            placeholder="Start Date"
                            onChange={ (date, dateString) =>
                              handleTaskInput("start_date", dateString)
                            }
                          />
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <i className="fi fi-rr-calendar-day"></i>
                          <DatePicker
                            value={
                              addInputTaskData?.end_date &&
                              dayjs(addInputTaskData?.end_date, "YYYY-MM-DD")
                            }
                            placeholder="End Date"
                            onChange={ (date, dateString) =>
                              handleTaskInput("end_date", dateString)
                            }
                            disabledDate={ (current) =>
                              current &&
                              current <
                              dayjs(
                                addInputTaskData?.start_date,
                                "YYYY-MM-DD"
                              )
                            }
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
                          <Select
                            // mode="multiple"
                            value={ addInputTaskData?.labels }
                            showSearch
                            placeholder="Select labels"
                            onChange={ (value) =>
                              handleTaskInput("labels", value)
                            }
                          >
                            { projectLabels.map((item) => (
                              <Option
                                key={ item?._id }
                                value={ item?._id }
                                style={ { textTransform: "capitalize" } }
                              >
                                { item.title }
                              </Option>
                            )) }
                          </Select>
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
                          <MultiSelect
                            onSearch={ handleSearch }
                            onChange={ handleSelectedItemsChange }
                            values={
                              selectedItems
                                ? selectedItems.map((item) => item?._id)
                                : []
                            }
                            listData={ subscribersList }
                            search={ searchKeyword }
                          />
                        </div>
                      </div>
                    </li>

                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-clock"></i>
                          <span className="schedule-label">
                            Estimated Time
                            { !getRoles(["Client"]) && (
                              <span style={ { color: "red" } }>*</span>
                            ) }
                          </span>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <div className="estimated_time_input_container">
                            <div className="hours_min_container">
                              <Input
                                min={ 0 }
                                value={ estHrs }
                                type="number"
                                onChange={ (e) =>
                                  handleEstTimeInput("est_hrs", e.target.value)
                                }
                                className={ `hours_input ${estHrsError && "error-border"
                                  }` }
                                placeholder="Hours"
                              />
                              <div style={ { color: "red" } }>{ estHrsError }</div>
                            </div>
                            <div className="hours_min_container">
                              <Input
                                min={ 0 }
                                max={ 59 }
                                type="number"
                                value={ estMins }
                                onChange={ (e) => {
                                  if (e.target.value * 1 > 60)
                                    return e.preventDefault();
                                  handleEstTimeInput(
                                    "est_mins",
                                    e.target.value
                                  );
                                } }
                                className={ `hours_input ${estMinsError && "error-border"
                                  }` }
                                placeholder="Minutes"
                              />
                              <div style={ { color: "red" } }>{ estMinsError }</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </Form.Item>
            <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>

            <div className="fileAttachment_container">
              { fileAttachment?.map((file, index) => (
                <Badge
                  key={ index }
                  count={
                    <CloseCircleOutlined
                      onClick={ () => removeAttachmentFile(index, file) }
                    />
                  }
                >
                  <div className="fileAttachment_Box">
                    <a
                      className="fileNameTxtellipsis"
                      href={ `${process.env.REACT_APP_API_URL}/public/${file?.path}` }
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      { file.name.length > 15
                        ? `${file.name.slice(0, 15)}.....${file.file_type}`
                        : file.name + file.file_type }
                    </a>
                  </div>
                </Badge>
              )) }
            </div>
            { fileAttachment.length > 0 && (
              <div className="folder-comment">
                <Form.Item
                  label="Folder"
                  initialValue={
                    foldersList.length > 0 ? foldersList[0]?._id : undefined
                  }
                  name="folder"
                  rules={ [
                    {
                      required: true,
                    },
                  ] }
                >
                  <Select placeholder="Please Select Folder" showSearch>
                    { foldersList.map((data) => (
                      <Option
                        key={ data?._id }
                        value={ data?._id }
                        style={ { textTransform: "capitalize" } }
                      >
                        { data.name }
                      </Option>
                    )) }
                  </Select>
                </Form.Item>
              </div>
            ) }
            </Col>


            {/* Folder */ }
            { fileAttachment.length > 0 && (
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item
                  label="Folder"
                  name="folder"
                  initialValue={
                    foldersList.length > 0 ? foldersList[0]?._id : undefined
                  }
                  rules={ [{ required: true }] }
                >
                  <Select placeholder="Please Select Folder" size="large" showSearch>
                    { foldersList.map((data) => (
                      <Option
                        key={ data?._id }
                        value={ data?._id }
                        style={ { textTransform: "capitalize" } }
                      >
                        { data.name }
                      </Option>
                    )) }
                  </Select>
                </Form.Item>
              </Col>
            ) }
            <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>

              <Tooltip key="attach" placement="top" title="Attached file">
                <Button
                  className="link-btn"
                  onClick={ () => attachmentfileRef.current.click() }
                  size="large"
                >
                  <i className="fi fi-ss-link"></i> Attach files
                </Button>
              </Tooltip>,
            </Col>
            <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>

              <input
                multiple
                type="file"
                accept="*"
                onChange={ onFileChange }
                hidden
                ref={ attachmentfileRef }
              />
            </Col>

          </Row>
        </Form>
      </div>
    </Modal >

      <Modal
        open={ ManagePeople }
        onCancel={ () => {
          setManagePeople(false);
        } }
        footer={ null }
      >
        <div className="modal-header">
          <h1>Manage People</h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form>
            <div className="topic-cancel-wrapper task-list-pop-wrapper">
              <Form.Item name="assignees" label="Assignees">
                <MultiSelect
                  mode="multiple"
                  style={ { width: "100%" } }
                  showSearch
                  maxTagCount={ 3 }
                />
              </Form.Item>

              <Form.Item label="Clients" name="clients">
                <MultiSelect
                  mode="multiple"
                  style={ { width: "100%" } }
                  showSearch
                  maxTagCount={ 3 }
                />
              </Form.Item>
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
                  className="square-outline-btn ant-delete"
                  onClick={ () => {
                    setManagePeople(false);
                  } }
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        title={ null }
        open={ isCopyModalOpen }
        footer={ null }
        onCancel={ () => {
          setIsCopyModalOpen(false);
          copyTaskList.resetFields();
        } }
        className="copy-task-modal add-list-modal"
      >
        <div className="modal-header">
          <h1>Copy tasklist</h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form form={ copyTaskList } onFinish={ handleCopyTaskList }>
            <div className="topic-cancel-wrapper task-list-pop-wrapper">
              <Form.Item name="title">
                <Input
                  value={ copyTaskListData.title }
                  placeholder="Title"
                  onChange={ handleFieldChange }
                />
              </Form.Item>
              <Form.Item className="subscriber-btn" name="project_title">
                <Input
                  value={ copyTaskListData.project_title }
                  placeholder="Project Title"
                  onChange={ handleFieldChange }
                  disabled={ true }
                />
              </Form.Item>
              <h2>Copy:</h2>
              <div className="coppy-task-data">
                <Form.Item name="task_status" valuePropName="checked">
                  <Checkbox
                    name="task_status"
                    checked={ copyTaskListData.task_status }
                    onChange={ handleFieldChange }
                  >
                    Task Stages
                  </Checkbox>
                </Form.Item>
              </div>

              <Form.Item name="subs_assignee" valuePropName="checked">
                <Checkbox
                  name="subs_assignee"
                  onChange={ handleFieldChange }
                  checked={ copyTaskListData.subs_assignee }
                >
                  Subscribers/Assignees
                </Checkbox>
              </Form.Item>

              <Form.Item name="clients" valuePropName="checked">
                <Checkbox
                  name="clients"
                  onChange={ handleFieldChange }
                  checked={ copyTaskListData.clients }
                >
                  Clients
                </Checkbox>
              </Form.Item>

              <Form.Item name="dates" valuePropName="checked">
                <Checkbox
                  name="dates"
                  onChange={ handleFieldChange }
                  checked={ copyTaskListData.dates }
                >
                  Dates
                </Checkbox>
              </Form.Item>

              <Form.Item name="comments" valuePropName="checked">
                <Checkbox
                  name="comments"
                  onChange={ handleFieldChange }
                  checked={ copyTaskListData.comments }
                >
                  Comments
                </Checkbox>
              </Form.Item>
            </div>
            <div className="modal-footer-flex">
              <div className="flex-btn">
                <Button
                  type="primary"
                  className="square-primary-btn"
                  htmlType="submit"
                  onClick={ () => {
                    setIsCopyModalOpen(false);
                  } }
                >
                  Save
                </Button>
                <Button
                  className="square-outline-btn ant-delete"
                  onClick={ () => {
                    setIsCopyModalOpen(false);
                    copyTaskList.resetFields();
                  } }
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
}

export default TasksPMS;
