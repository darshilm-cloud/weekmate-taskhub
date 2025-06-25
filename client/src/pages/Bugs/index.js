import React from "react";
import {
  Button,
  Avatar,
  Checkbox,
  Modal,
  DatePicker,
  Input,
  Popover,
  Form,
  Select,
  Dropdown,
  Badge,
  Tooltip,
  ConfigProvider,
  Menu,
} from "antd";
import {
  CalendarOutlined,
  PlusOutlined,
  RightOutlined,
  ArrowRightOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

import Service from "../../service";
import "./style.css";
import dayjs from "dayjs";
import {
  getSubscribersList,
  getSpecificProjectWorkflowStage,
} from "../../appRedux/reducers/ApiData";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import BugList from "./BugsKanbanBoard";
import BugsController from "./BugsController";
import { hasPermission } from "../../util/hasPermission";
import ReactHTMLTableToExcel from "react-html-table-to-excel";
import MultiSelect from "../../components/CustomSelect/MultiSelect";
import { removeTitle } from "../../util/nameFilter";
import BugsTable from "./BugsTableView/BugsTable";
import MyAvatar from "../../components/Avatar/MyAvatar";

const BugsPMS = () => {
  const {
    Search,
    searchRef,
    onSearchTask,
    filterStatus,
    handleFilterStatus,
    filterStatusSearchInput,
    setFilterStatusSearchInput,
    boardTasksBugs,
    setOpenStatus,
    openStatus,
    handleOpenChangeStatus,
    getStatusTitleById,
    filterAssigned,
    handleSelectionAssignedFilter,
    filterAssignedSearchInput,
    setFilterAssignedSearchInput,
    handleAllFilter,
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
    selectedTask,
    deleteTasks,
    isModalOpenImport,
    handleImportClose,
    Dragger,
    props,
    workflowMenu,
    isModalOpenList,
    handleCancelList,
    handleOkList,
    modalMode,
    listForm,
    addProjectMainTask,
    editProjectmainTask,
    addform,
    handleTaskOps,
    addInputTaskData,
    handleTaskInput,
    taskList,
    Option,
    subscribersList,
    estHrs,
    handleEstTimeInput,
    estMins,
    fileAttachment,
    removeAttachmentFile,
    foldersList,
    attachmentfileRef,
    onFileChange,
    editform,
    setOpenLabels,
    openLabels,
    getWorkflow,
    workflow,
    handlerAssignes,
    projectWorkflowStage,
    isModalOpenTaskModal,
    handleCancelTaskModal,
    selectedsassignees,
    dispatch,
    setSelectedsassignees,
    isEditTaskModalOpen,
    importCsvFile,
    importRef,
    exportSampleCSVfile,
    onChange,
    editorData,
    handleChangeData,
    handlePaste,
    handlePasteData,
    editModalDescription,
    handleChnageDescription,
    selectedItems,
    handleSelectedItemsChange,
    searchKeyword,
    handleSearch,
    html,
    estHrsError,
    estMinsError,
    tableTrue,
    handleChangeTableView,
    selectedView,
  } = BugsController();

  const csvRef = document.getElementById("test-table-xls-button");
  const menu = (
    <Menu>
      <Menu.Item key="1" onClick={() => handleChangeTableView("table")}>
        Table View
      </Menu.Item>
      <Menu.Item key="2" onClick={() => handleChangeTableView("board")}>
        Board View
      </Menu.Item>
    </Menu>
  );
  return (
    <>
      <div className="project-wrapper discussion-wrapper bugs-task-wrapper">
        <div className="peoject-page">
          <div className="profilerightbar">
            <div className="profile-sub-head">
              <div className="task-sub-header">
                <div className="head-box-inner">
                  {hasPermission(["bug_add"]) && (
                    <Button
                      onClick={() => showModalTaskModal()}
                      className="add-task"
                    >
                      <PlusOutlined />
                      Add Task Bug
                    </Button>
                  )}
                  <Search
                    ref={searchRef}
                    placeholder="Search..."
                    onSearch={onSearchTask}
                    style={{ width: 200 }}
                    className="mr2"
                  />

                  <div style={{ cursor: "pointer" }}>
                    <div className="status-content">
                      <ConfigProvider>
                        <Dropdown overlay={menu} trigger={["click"]}>
                          <div className="dropdown-trigger">
                            {selectedView === "table"
                              ? "Table View"
                              : "Board View"}
                            <i className="fa-solid fa-table"></i>
                          </div>
                        </Dropdown>
                      </ConfigProvider>
                    </div>
                  </div>
                </div>

                <div className="block-status-content">
                  <div className="status-content">
                    <div style={{ cursor: "pointer" }}>
                      <h6>Status:</h6>

                      <Popover
                        placement="bottomRight"
                        content={
                          <div className="right-popover-wrapper">
                            <ul>
                              <li>
                                <Checkbox
                                  checked={filterStatus == ""}
                                  onChange={handleFilterStatus}
                                >
                                  {" "}
                                  All
                                </Checkbox>
                              </li>
                            </ul>
                            <div>
                              <Search
                                value={filterStatusSearchInput}
                                onSearch={(val) =>
                                  setFilterStatusSearchInput(val)
                                }
                                onChange={(e) =>
                                  setFilterStatusSearchInput(e.target.value)
                                }
                              />
                            </div>
                            <ul className="assigness-data">
                              {boardTasksBugs
                                ?.filter((item) =>
                                  item?.title
                                    ?.toLowerCase()
                                    .includes(
                                      filterStatusSearchInput?.toLowerCase()
                                    )
                                )
                                .map((val, index) => (
                                  <li key={index}>
                                    <Checkbox
                                      checked={filterStatus == val?._id}
                                      value={val?._id}
                                      onChange={handleFilterStatus}
                                    >
                                      {" "}
                                      {val?.title}{" "}
                                    </Checkbox>
                                  </li>
                                ))}
                            </ul>
                            <div className="popver-footer-btn">
                              <Button
                                onClick={() =>
                                  handleAllFilter("Status", filterStatus)
                                }
                                type="primary"
                                className="square-primary-btn ant-btn-primary"
                              >
                                Apply
                              </Button>
                              <Button
                                className="square-outline-btn ant-delete"
                                onClick={() => {
                                  setOpenStatus(false);
                                  setFilterStatusSearchInput("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        }
                        trigger="click"
                        open={boardTasksBugs.length > 0 ? openStatus : false}
                        onOpenChange={handleOpenChangeStatus}
                      >
                        <i className="fi fi-rs-check-circle"></i>{" "}
                        {filterStatus
                          ? getStatusTitleById(filterStatus)
                          : "All"}
                      </Popover>
                    </div>
                  </div>

                  <div style={{ cursor: "pointer" }} className="status-content">
                    <h6>Assigned:</h6>
                    <Popover
                      placement="bottomRight"
                      content={
                        <div className="right-popover-wrapper">
                          <ul>
                            <div className="filter-search-box">
                              <li>
                                <Checkbox
                                  checked={filterAssigned.length == 0}
                                  onChange={() =>
                                    handleSelectionAssignedFilter("", true)
                                  }
                                >
                                  {" "}
                                  All
                                </Checkbox>
                              </li>
                              <li>
                                <Checkbox
                                  checked={filterAssigned == "unassigned"}
                                  onChange={() =>
                                    handleSelectionAssignedFilter("unassigned")
                                  }
                                >
                                  {" "}
                                  Unassigned Tasks
                                </Checkbox>
                              </li>

                              <li>
                                <Search
                                  value={filterAssignedSearchInput}
                                  onSearch={(val) =>
                                    setFilterAssignedSearchInput(val)
                                  }
                                  onChange={(e) =>
                                    setFilterAssignedSearchInput(e.target.value)
                                  }
                                />
                              </li>
                            </div>
                            <div className="filter-assignees assigness-data">
                              {/* {employeeList */}
                              {subscribersList
                                .filter((item) =>
                                  item.full_name
                                    ?.toLowerCase()
                                    .includes(
                                      filterAssignedSearchInput?.toLowerCase()
                                    )
                                )
                                .map((item, index) => (
                                  <li
                                    key={index}
                                    className={
                                      filterAssigned.includes(item._id)
                                        ? "selected-filter-member"
                                        : ""
                                    }
                                  >
                                    <Checkbox
                                      key={index}
                                      checked={filterAssigned.includes(
                                        item._id
                                      )}
                                      onChange={() =>
                                        handleSelectionAssignedFilter(item._id)
                                      }
                                    />
                                    <MyAvatar
                                      userName={item?.full_name}
                                      key={item?._id}
                                      alt={item?.full_name}
                                      src={item.emp_img}
                                    />

                                    {removeTitle(item.full_name)}
                                  </li>
                                ))}
                            </div>
                            <div className="popver-footer-btn">
                              <Button
                                onClick={() =>
                                  handleAllFilter("assigneeIds", filterAssigned)
                                }
                                type="primary"
                                className="square-primary-btn ant-btn-primary"
                              >
                                Apply
                              </Button>
                              <Button
                                className="square-outline-btn ant-delete"
                                onClick={() => {
                                  setOpenAssignees(false);
                                  setFilterAssignedSearchInput("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </ul>
                        </div>
                      }
                      trigger="click"
                      open={openAssignees && boardTasksBugs.length > 0}
                      onOpenChange={handleOpenChangeAssignees}
                    >
                      <i className="fi fi-rr-users"></i>
                      {filterAssigned.length == 0
                        ? "All"
                        : filterAssigned == "unassigned"
                        ? "Unassigned Tasks"
                        : "Selected"}
                    </Popover>
                  </div>

                  <div style={{ cursor: "pointer" }} className="status-content">
                    <h6
                      onClick={() =>
                        setIsPopoverVisibleView(!isPopoverVisibleView)
                      }
                    >
                      Date Range:
                    </h6>
                    <Popover
                      placement="bottom"
                      trigger="click"
                      content={
                        <div className="right-popover-wrapper popover-task">
                          <Form.Item label="Start Date">
                            <Select
                              defaultValue="Any"
                              onChange={handleStartChange}
                              options={DateOption}
                            ></Select>
                            {selectValStartdate && (
                              <div className="calender-event-block">
                                <Form.Item>
                                  <DatePicker
                                    onChange={(_, dateString) =>
                                      handleStartDateRange(0, dateString)
                                    }
                                  >
                                    <CalendarOutlined />
                                  </DatePicker>
                                </Form.Item>
                                to
                                <Form.Item>
                                  <DatePicker
                                    onChange={(_, dateString) =>
                                      handleStartDateRange(1, dateString)
                                    }
                                  >
                                    <CalendarOutlined />
                                  </DatePicker>
                                </Form.Item>
                              </div>
                            )}
                          </Form.Item>

                          <Form.Item label="Due Date">
                            <Select
                              defaultValue="Any"
                              onChange={handleDueChange}
                              options={DateOption}
                            ></Select>
                            {selectValDuedate && (
                              <div className="calender-event-block">
                                <Form.Item>
                                  <DatePicker
                                    onChange={(_, dateString) =>
                                      handleDueDateRange(0, dateString)
                                    }
                                  >
                                    <CalendarOutlined />
                                  </DatePicker>
                                </Form.Item>
                                to
                                <Form.Item>
                                  <DatePicker
                                    onChange={(_, dateString) =>
                                      handleDueDateRange(0, dateString)
                                    }
                                  >
                                    <CalendarOutlined />
                                  </DatePicker>
                                </Form.Item>
                              </div>
                            )}
                          </Form.Item>
                          <div className="popver-footer-btn">
                            <Button
                              onClick={() => {
                                handleStartDueFilter(
                                  filterStartDate,
                                  filterDueDate
                                );
                              }}
                              type="primary"
                              className="square-primary-btn ant-btn-primary"
                            >
                              Apply
                            </Button>
                            <Button
                              type="outlined"
                              onClick={() => {
                                setIsPopoverVisibleView(false);
                                setSelectValDuedate(false);
                              }}
                              className="square-outline-btn ant-delete"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      }
                      open={isPopoverVisibleView && boardTasksBugs.length > 0}
                      onVisibleChange={setIsPopoverVisibleView}
                    >
                      <span>
                        <i className="fi fi-rr-calendar-minus"></i>
                        Start:{" "}
                        {!Array.isArray(filterStartDate)
                          ? DateOption.find(
                              (val) => val.value == filterStartDate
                            ).label
                          : "Custom"}
                        , Due:{" "}
                        {!Array.isArray(filterDueDate)
                          ? DateOption.find((val) => val.value == filterDueDate)
                              .label
                          : "Custom"}
                      </span>
                    </Popover>
                  </div>
                  <div style={{ cursor: "pointer" }} className="status-content">
                    <h6>Labels:</h6>
                    <Popover
                      placement="bottomRight"
                      content={
                        <div className="right-popover-wrapper">
                          <ul>
                            <li>
                              <Checkbox
                                checked={filterOnLabels.length == 0}
                                onChange={() =>
                                  handleSelectionlabelFilter("", true)
                                }
                              >
                                All
                              </Checkbox>
                            </li>
                            <li>
                              <Checkbox
                                checked={filterOnLabels == "unlabelled"}
                                onChange={() =>
                                  handleSelectionlabelFilter("unlabelled")
                                }
                              >
                                Unlabelled bug
                              </Checkbox>
                            </li>
                            <li>
                              <Search
                                value={filterLabelsSearchInput}
                                onSearch={(val) =>
                                  setFilterLabelsSearchInput(val)
                                }
                                onChange={(e) =>
                                  setFilterLabelsSearchInput(e.target.value)
                                }
                              />
                            </li>
                          </ul>
                          <span>
                            <RightOutlined />
                            Global Labels
                          </span>
                          <ul>
                            {projectLabels
                              .filter((item) =>
                                item.title
                                  ?.toLowerCase()
                                  .includes(
                                    filterLabelsSearchInput?.toLowerCase()
                                  )
                              )
                              .map((item) => (
                                <li
                                  onClick={() =>
                                    handleSelectionlabelFilter(item._id)
                                  }
                                  className={
                                    filterOnLabels.includes(item._id)
                                      ? "selected-filter-member"
                                      : ""
                                  }
                                  key={item._id}
                                >
                                  <Avatar
                                    style={{ background: item.color }}
                                  ></Avatar>{" "}
                                  {item.title}
                                </li>
                              ))}
                          </ul>
                          <div className="popver-footer-btn">
                            <Button
                              onClick={() =>
                                handleAllFilter("labelIds", filterOnLabels)
                              }
                              type="primary"
                              className="square-primary-btn ant-btn-primary"
                            >
                              Apply
                            </Button>
                            <Button
                              className="square-outline-btn ant-delete"
                              onClick={() => {
                                setOpenLabels(false);
                                setFilterLabelsSearchInput("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      }
                      trigger="click"
                      open={openLabels && boardTasksBugs.length > 0}
                      onOpenChange={handleChangeLabels}
                    >
                      <i className="fi fi-rr-tags"></i>
                      {filterOnLabels.length == 0
                        ? "All"
                        : filterOnLabels == "unlabelled"
                        ? "Unlabelled Task"
                        : "Selected"}
                    </Popover>
                  </div>

                  <div style={{ cursor: "pointer" }}>
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
                        dangerouslySetInnerHTML={{ __html: html["html"] }}
                      ></div>
                    </div>

                    <Popover
                      placement="bottomRight"
                      content={
                        <div className="task-elipse-pop">
                          {hasPermission(["bug_add"]) && (
                            <div className="status-content">
                              <h6>Sample CSV:</h6>
                              <i
                                onClick={() => exportSampleCSVfile()}
                                style={{ color: "#358CC0", fontSize: "16px" }}
                                className="fi fi-rr-file-download"
                              ></i>
                            </div>
                          )}
                          <input
                            className="employee-inoutbtn"
                            type="file"
                            size="small"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              importCsvFile(file);
                            }}
                            onClick={(e) => (e.target.value = null)}
                            style={{
                              display: "none",
                            }}
                            ref={importRef}
                            accept="xlsx, .xls, .csv"
                          />

                          {hasPermission(["bug_add"]) && (
                            <div className="status-content">
                              <h6>Import CSV:</h6>

                              <i
                                style={{ color: "#358CC0", fontSize: "16px" }}
                                onClick={() => importRef.current.click()}
                                className="fi fi-rr-file-import"
                              ></i>
                            </div>
                          )}
                          <div className="status-content">
                            <h6>Repeated Bug CSV:</h6>

                            <i
                              onClick={() => {
                                csvRef.click();
                              }}
                              style={{ color: "#358CC0", fontSize: "16px" }}
                              className="fi fi-rr-file-download"
                            ></i>
                          </div>
                        </div>
                      }
                      trigger="click"
                    >
                      <div style={{ cursor: "pointer" }}>
                        <label>
                          <i class="fa-solid fa-ellipsis-vertical"></i>
                        </label>
                      </div>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
            {boardTasksBugs.length === 0 && (
              <div className="error-message">
                <p>No Data</p>
              </div>
            )}
            {tableTrue === false ? (
              <BugList
                tasks={filterTasks(boardTasksBugs, filterSchema)}
                showEditTaskModal={showEditTaskModal}
                showModalTaskModal={showModalTaskModal}
                getBoardTasks={getBoardTasks}
                selectedTask={selectedTask}
                boardTasksBugs={boardTasksBugs}
                deleteTasks={deleteTasks}
              />
            ) : (
              <BugsTable
                tasks={filterTasks(boardTasksBugs, filterSchema)}
                showEditTaskModal={showEditTaskModal}
                showModalTaskModal={showModalTaskModal}
                getBoardTasks={getBoardTasks}
                selectedTask={selectedTask}
                boardTasksBugs={boardTasksBugs}
                deleteTasks={deleteTasks}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        open={isModalOpenImport}
        width={600}
        title={null}
        footer={null}
        onCancel={() => handleImportClose(false)}
        className="upload-modal add-task-modal"
      >
        <div className="modal-header">
          <h1>Import Tasks</h1>
        </div>
        <div className="overview-modal-wrapper">
          <h4 className="file-selector-head">
            Use the sample CSV and fill your own data:{" "}
            <span>Download Sample CSV file</span>
          </h4>
          <Dragger {...props}>
            <p className="ant-upload-drag-icon"></p>
            <p className="ant-upload-text">
              <Button className="list-add-btn" icon={<PlusOutlined />}></Button>
              <p>Select a CSV file to import</p>
              <small>Drag a file here</small>
            </p>
          </Dragger>
          <Form>
            <div className="topic-cancel-wrapper">
              <Form.Item label="Associate Workflow :">
                <Dropdown trigger={["click"]} overlay={workflowMenu}>
                  <span>
                    <Input></Input>
                  </span>
                </Dropdown>
              </Form.Item>
              <h4 className="file-selector-head">
                To Learn how to import data from other tools.{" "}
                <span>click here</span>
              </h4>
              <h4>Note:</h4>
              <small>
                <i>
                  Before uploading the CSV make sure its encoded in UTF-8
                  format.
                </i>
              </small>
              <div className="modal-footer-flex pt-2">
                <Button type="primary" className="square-primary-btn">
                  Next <ArrowRightOutlined />
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        title={null}
        open={isModalOpenList}
        footer={null}
        onCancel={handleCancelList}
        onOk={handleOkList}
        className="add-task-modal add-list-modal"
      >
        <div className="modal-header">
          <h1>{modalMode === "add" ? "Add List" : "Edit List"}</h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form
            form={listForm}
            initialValues={{ isPrivateList: false }}
            onFinish={(values) => {
              modalMode === "add"
                ? addProjectMainTask(values)
                : editProjectmainTask(values);
            }}
          >
            <div className="topic-cancel-wrapper">
              <Form.Item
                name="title"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Input placeholder="Title"></Input>
              </Form.Item>
              <Form.Item
                label="Associate Workflow"
                name="workflow_id"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select
                  disabled={modalMode !== "add"}
                  size="large"
                  showSearch
                  onDropdownVisibleChange={(open) => open && getWorkflow()}
                  onChange={(id) => {
                    dispatch(getSpecificProjectWorkflowStage(id));
                  }}
                >
                  {workflow.map((item, index) => (
                    <>
                      <Option
                        key={index}
                        value={item._id}
                        style={{ textTransform: "capitalize" }}
                      >
                        {item.project_workflow}
                      </Option>
                    </>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item className="subscriber-btn">
                <Select
                  size="large"
                  showSearch
                  mode="multiple"
                  placeholder="Please Select"
                  style={{ width: 200 }} // Enable multiple selections
                  optionFilterProp="children"
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
                  onChange={handlerAssignes}
                  value={selectedsassignees} // Provide an array of selected values
                  // onDropdownVisibleChange={(open) =>
                  //   open && dispatch(getEmployeeList())
                  // }
                  onDropdownVisibleChange={(open) =>
                    open && dispatch(getSubscribersList())
                  }
                >
                  {subscribersList?.map((item, index) => (
                    <Option
                      key={index}
                      value={item._id}
                      style={{ textTransform: "capitalize" }}
                    >
                      {item.full_name}
                    </Option>
                  ))}
                </Select>

                {selectedsassignees.length > 0 && (
                  <Button
                    className="list-clear-btn ant-delete"
                    onClick={() => setSelectedsassignees([])}
                  >
                    Clear
                  </Button>
                )}
              </Form.Item>
              {selectedsassignees.length > 0 && (
                <div className="list-modal-stages">
                  {subscribersList
                    .filter((value) => selectedsassignees.includes(value._id))
                    .map((data, index) => (
                      <div key={index} className="subsListContainer">
                        <div className="list-modal-inner-stage">
                          <Avatar
                            src={`${Service.HRMS_Base_URL}/uploads/emp_images/${data?.emp_img}`}
                          />
                          <p>{data.full_name}</p>
                        </div>
                        <Form.Item label="Stages" name="task_status">
                          <Select
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
                          >
                            {projectWorkflowStage.map((item) => (
                              <>
                                <Option
                                  key={item._id}
                                  value={item._id}
                                  style={{ textTransform: "capitalize" }}
                                >
                                  {item.title}
                                </Option>
                              </>
                            ))}
                          </Select>
                        </Form.Item>
                      </div>
                    ))}
                </div>
              )}
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
                  onClick={handleCancelList}
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
        footer={null}
        open={isModalOpenTaskModal}
        width={700}
        onCancel={handleCancelTaskModal}
        className="add-task-modal"
      >
        <div className="modal-header">
          <h1>Add Task Bug</h1>
        </div>
        <div className="overview-modal-wrapper bug-pop-wrapper time-pop-wrapper">
          <Form form={addform} onFinish={(values) => handleTaskOps(values)}>
            <div className="topic-cancel-wrapper">
              <Form.Item
                name="title"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Input placeholder="Title" />
              </Form.Item>
              <Form.Item
                name="task_id"
                // rules={[
                //   {
                //     required: true,
                //   }
                // ]}
              >
                <Select
                  placeholder="Task"
                  size="large"
                  showSearch
                  filterSort={(optionA, optionB) =>
                    optionA.children
                      ?.toLowerCase()
                      .localeCompare(optionB.children?.toLowerCase())
                  }
                  value={addInputTaskData?.task_id}
                  onChange={(value) => handleTaskInput("task_id", value)}
                >
                  {taskList.map((item, index) => (
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
              <Form.Item
                name="descriptions"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <CKEditor
                  editor={Custombuild}
                  data={editorData}
                  onChange={handleChangeData}
                  onPast={handlePaste}
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
              </Form.Item>
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
                            onChange={(date, dateString) =>
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
                            disabledDate={(current) =>
                              current &&
                              current <
                                dayjs(
                                  addInputTaskData?.start_date,
                                  "YYYY-MM-DD"
                                )
                            }
                            placeholder="End Date"
                            onChange={(date, dateString) =>
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
                            // mode="multiple"
                            allowClear
                            value={addInputTaskData?.labels}
                            showSearch
                            placeholder="Select"
                            onChange={(value) =>
                              handleTaskInput("labels", value)
                            }
                          >
                            {projectLabels.map((item) => (
                              <Option
                                key={item._id}
                                value={item._id}
                                style={{ textTransform: "capitalize" }}
                              >
                                {item.title}
                              </Option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-users"></i>
                          <span className="schedule-label">
                            Assignees
                            <span style={{ color: "red" }}>*</span>
                          </span>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <Form.Item
                            name="selectedItems"
                            rules={[
                              {
                                required: true,
                                message: "Please select at least one item!",
                                type: "array",
                                min: 1,
                              },
                            ]}
                          >
                            <MultiSelect
                              onSearch={handleSearch}
                              onChange={handleSelectedItemsChange}
                              values={
                                selectedItems &&
                                selectedItems.map((item) => item._id)
                              }
                              listData={subscribersList}
                              search={searchKeyword}
                            />
                          </Form.Item>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-clock"></i>
                          <span className="schedule-label">
                            Estimated Time
                            <span style={{ color: "red" }}>*</span>
                          </span>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <div className="estimated_time_input_container">
                            <div className="hours_min_container">
                              <Input
                                min={0}
                                value={estHrs}
                                type="number"
                                onChange={(e) =>
                                  handleEstTimeInput("est_hrs", e.target.value)
                                }
                                className={`hours_input ${
                                  estHrsError && "error-border"
                                }`}
                                placeholder="Hours"
                              />
                              <div style={{ color: "red" }}>{estHrsError}</div>
                            </div>
                            <div className="hours_min_container">
                              <Input
                                min={0}
                                max={59}
                                type="number"
                                value={estMins}
                                onChange={(e) => {
                                  if (e.target.value * 1 > 60)
                                    return e.preventDefault();
                                  handleEstTimeInput(
                                    "est_mins",
                                    e.target.value
                                  );
                                }}
                                className={`hours_input ${
                                  estMinsError && "error-border"
                                }`}
                                placeholder="Minutes"
                              />
                              <div style={{ color: "red" }}>{estMinsError}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </Form.Item>
            </div>
            <div className="fileAttachment_container">
              {fileAttachment.map((file, index) => (
                <Badge
                  key={index}
                  count={
                    <CloseCircleOutlined
                      onClick={() => removeAttachmentFile(index)}
                    />
                  }
                >
                  <div className="fileAttachment_Box">
                    <p className="fileNameTxtellipsis">{file.name}</p>
                  </div>
                </Badge>
              ))}
            </div>
            {fileAttachment.length > 0 && (
              <div className="folder-comment">
                <Form.Item
                  label="Folder"
                  name="folder"
                  initialValue={
                    foldersList.length > 0 ? foldersList[0]._id : undefined
                  }
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                >
                  <Select placeholder="Please Select Folder" showSearch>
                    {foldersList.map((data) => (
                      <Option
                        key={data._id}
                        value={data._id}
                        style={{ textTransform: "capitalize" }}
                      >
                        {data.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            )}
            <div className="modal-footer-flex">
              <div className="flex-btn">
                <Button
                  htmlType="submit"
                  type="primary"
                  className="square-primary-btn"
                >
                  Save
                </Button>
                <Button
                  onClick={handleCancelTaskModal}
                  className="square-outline-btn ant-delete"
                >
                  Cancel
                </Button>
                <Tooltip placement="top" title="Attached file">
                  <Button
                    className="link-btn"
                    onClick={() => attachmentfileRef.current.click()}
                  >
                    <i className="fi fi-ss-link">Attach files</i>
                  </Button>
                </Tooltip>
                <input
                  multiple
                  type="file"
                  accept="*"
                  onChange={onFileChange}
                  hidden
                  ref={attachmentfileRef}
                />
              </div>
              <div style={{ textAlign: "center" }}>
                <Checkbox onChange={onChange}>
                  <span style={{ fontWeight: "bold" }}>Repeated Bug</span>
                </Checkbox>
              </div>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        footer={null}
        open={isEditTaskModalOpen}
        width={650}
        onCancel={handleCancelTaskModal}
        className="edit-task-modal"
      >
        <div className="modal-header">
          <h1>Edit Task Bug </h1>
        </div>
        <div className="overview-modal-wrapper bug-overview-modal-wrapper">
          <Form
            form={editform}
            onFinish={(values) => {
              handleTaskOps(values, true);
            }}
          >
            <div className="topic-cancel-wrapper">
              <Form.Item
                name="title"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Input placeholder="Title" />
              </Form.Item>

              <Form.Item
                name="task_id"
                // rules={[
                //   {
                //     required: true,
                //   },
                // ]}
              >
                <Select
                  placeholder="Task"
                  size="large"
                  showSearch
                  filterSort={(optionA, optionB) =>
                    optionA.children
                      ?.toLowerCase()
                      .localeCompare(optionB.children?.toLowerCase())
                  }
                  onChange={(value) => handleTaskInput("task_id", value)}
                >
                  {taskList.map((item, index) => (
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
              <Form.Item label="Description" colon={false} name="descriptions">
                <CKEditor
                  editor={Custombuild}
                  data={editModalDescription}
                  onChange={handleChnageDescription}
                  onPast={handlePasteData}
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
              </Form.Item>
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
                            onChange={(date, dateString) =>
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
                            disabledDate={(current) =>
                              current &&
                              current <
                                dayjs(
                                  addInputTaskData?.start_date,
                                  "YYYY-MM-DD"
                                )
                            }
                            placeholder="End Date"
                            onChange={(date, dateString) =>
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
                            // mode="multiple"
                            value={addInputTaskData?.labels}
                            showSearch
                            placeholder="Select labels"
                            onChange={(value) =>
                              handleTaskInput("labels", value)
                            }
                          >
                            {projectLabels.map((item) => (
                              <Option
                                key={item._id}
                                value={item._id}
                                style={{ textTransform: "capitalize" }}
                              >
                                {item.title}
                              </Option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-users"></i>
                          <span className="schedule-label">
                            Assignees
                            <span style={{ color: "red" }}>*</span>
                          </span>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <Form.Item
                            name="selectedItems"
                            rules={[
                              {
                                required: true,
                                message: "Please select at least one item!",
                                type: "array",
                                min: 1,
                              },
                            ]}
                            initialValue={selectedItems.map((item) => ({
                              value: item._id,
                              label: (
                                <>
                                  <MyAvatar
                                    userName={item?.full_name}
                                    alt={item?.full_name}
                                    key={item._id}
                                    src={item.emp_img}
                                  />
                                  {item.full_name}
                                </>
                              ),
                            }))}
                          >
                            <MultiSelect
                              onSearch={handleSearch}
                              onChange={handleSelectedItemsChange}
                              values={
                                selectedItems &&
                                selectedItems.map((item) => item._id)
                              }
                              listData={subscribersList}
                              search={searchKeyword}
                            />
                          </Form.Item>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-clock"></i>
                          <span className="schedule-label">
                            Estimated Time
                            <span style={{ color: "red" }}>*</span>
                          </span>
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <div className="estimated_time_input_container">
                            <div className="hours_min_container">
                              <Input
                                value={estHrs}
                                type="number"
                                onChange={(e) =>
                                  handleEstTimeInput("est_hrs", e.target.value)
                                }
                                className={`hours_input ${
                                  estHrsError && "error-border"
                                }`}
                                placeholder="Hours"
                              />
                              <div style={{ color: "red" }}>{estHrsError}</div>
                            </div>
                            <div className="hours_min_container">
                              <Input
                                type="number"
                                value={estMins}
                                onChange={(e) =>
                                  handleEstTimeInput("est_mins", e.target.value)
                                }
                                className={`hours_input ${
                                  estMinsError && "error-border"
                                }`}
                                placeholder="Minutes"
                              />
                              <div style={{ color: "red" }}>{estMinsError}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </Form.Item>
            </div>
            {console.log(fileAttachment, "fileAttachmentbug")}
            <div className="fileAttachment_container">
              {fileAttachment.map((file, index) => (
                <Badge
                  key={index}
                  count={
                    <CloseCircleOutlined
                      onClick={() => removeAttachmentFile(index)}
                    />
                  }
                >
                  <div className="fileAttachment_Box">
                    <p className="fileNameTxtellipsis">{file.name}</p>
                  </div>
                </Badge>
              ))}
            </div>
            {fileAttachment.length > 0 && (
              <div>
                <Form.Item
                  label="Folder"
                  name="folder"
                  initialValue={
                    foldersList.length > 0 ? foldersList[0]._id : undefined
                  }
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                >
                  <Select placeholder="Please Select Folder" showSearch>
                    {foldersList.map((data) => (
                      <Option
                        key={data._id}
                        value={data._id}
                        style={{ textTransform: "capitalize" }}
                      >
                        {data.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            )}
            <div className="modal-footer-flex">
              <div className="flex-btn">
                <Button
                  htmlType="submit"
                  type="primary"
                  className="square-primary-btn"
                >
                  Save
                </Button>
                <Button
                  onClick={handleCancelTaskModal}
                  className="square-outline-btn ant-delete"
                >
                  Cancel
                </Button>
                <Tooltip placement="top" title="Attached file">
                  <Button
                    className="link-btn"
                    onClick={() => attachmentfileRef.current.click()}
                  >
                    <i className="fi fi-ss-link"></i>Attach files
                  </Button>
                </Tooltip>
                <input
                  multiple
                  type="file"
                  accept="*"
                  onChange={onFileChange}
                  hidden
                  ref={attachmentfileRef}
                />
              </div>
              <div>
                <Form.Item name="isrepeated" valuePropName="checked">
                  <Checkbox onChange={onChange}>
                    <span style={{ fontWeight: "bold" }}>Repeated Bug</span>
                  </Checkbox>
                </Form.Item>
              </div>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
};

export default BugsPMS;
