/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, eqeqeq, jsx-a11y/anchor-is-valid, no-useless-concat */
import React, { memo } from "react";
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
  Col,
  Row,
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
import BugFilter from "./BugFilter";

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
    setFilterSchema
  } = BugsController();

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
  return (
    <>
      <div className="project-wrapper discussion-wrapper bugs-task-wrapper">
        <div className="peoject-page">
          <div className="profilerightbar">
            <div className="profile-sub-head">
              <div className="task-sub-header">
                <div className="head-box-inner">
                  { hasPermission(["bug_add"]) && (
                    <Button
                      onClick={ () => showModalTaskModal() }
                      type="primary"
                      className=" add-btn"
                    >
                      <PlusOutlined />
                      Add Task Bug
                    </Button>
                  ) }
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
                              ? ""
                              : "" }
                            <i className="fa-solid fa-table"></i>
                          </div>
                        </Dropdown>
                      </ConfigProvider>
                    </div>
                  </div>
                </div>

                <div className="block-status-content">
                  <div className="filter-btn-wrapper">

                    <BugFilter 
                      boardTasksBugs={boardTasksBugs}
                      subscribersList={subscribersList}
                      projectLabels={projectLabels}
                      onConfigUpdate={(config) => {
                        setFilterSchema(config)
                        getBoardTasks()
                        }}
                    />

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
                            { hasPermission(["bug_add"]) && (
                              <div className="status-content">
                                <h6>Sample CSV:</h6>
                                <i
                                  onClick={ () => exportSampleCSVfile() }
                                  style={ { color: "#358CC0", fontSize: "16px" } }
                                  className="fi fi-rr-file-download"
                                ></i>
                              </div>
                            ) }
                            <input
                              className="employee-inoutbtn"
                              type="file"
                              size="small"
                              onChange={ (e) => {
                                const file = e.target.files[0];
                                importCsvFile(file);
                              } }
                              onClick={ (e) => (e.target.value = null) }
                              style={ {
                                display: "none",
                              } }
                              ref={ importRef }
                              accept="xlsx, .xls, .csv"
                            />

                            { hasPermission(["bug_add"]) && (
                              <div className="status-content">
                                <h6>Import CSV:</h6>

                                <i
                                  style={ { color: "#358CC0", fontSize: "16px" } }
                                  onClick={ () => importRef.current.click() }
                                  className="fi fi-rr-file-import"
                                ></i>
                              </div>
                            ) }
                            <div className="status-content">
                              <h6>Repeated Bug CSV:</h6>

                              <i
                                onClick={ () => {
                                  csvRef.click();
                                } }
                                style={ { color: "#358CC0", fontSize: "16px" } }
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

                </div>
              </div>
            </div>
            { boardTasksBugs.length === 0 && (
              <div className="error-message">
                <p>No Data</p>
              </div>
            ) }
            { tableTrue === false ? (
              <BugList
                tasks={ filterTasks(boardTasksBugs, filterSchema) }
                showEditTaskModal={ showEditTaskModal }
                showModalTaskModal={ showModalTaskModal }
                getBoardTasks={ getBoardTasks }
                selectedTask={ selectedTask }
                boardTasksBugs={ boardTasksBugs }
                deleteTasks={ deleteTasks }
              />
            ) : (
              <BugsTable
                tasks={ filterTasks(boardTasksBugs, filterSchema) }
                showEditTaskModal={ showEditTaskModal }
                showModalTaskModal={ showModalTaskModal }
                getBoardTasks={ getBoardTasks }
                selectedTask={ selectedTask }
                boardTasksBugs={ boardTasksBugs }
                deleteTasks={ deleteTasks }
              />
            ) }
          </div>
        </div>
      </div>

      {/* Modals */ }
      <Modal
        open={ isModalOpenImport }
        width={ 600 }
        title={ null }
        footer={ null }
        onCancel={ () => handleImportClose(false) }
        className="upload-modal add-task-modal"
      >
        <div className="modal-header">
          <h1>Import Tasks</h1>
        </div>
        <div className="overview-modal-wrapper">
          <h4 className="file-selector-head">
            Use the sample CSV and fill your own data:{ " " }
            <span>Download Sample CSV file</span>
          </h4>
          <Dragger { ...props }>
            <p className="ant-upload-drag-icon"></p>
            <p className="ant-upload-text">
              <Button className="list-add-btn" icon={ <PlusOutlined /> }></Button>
              <p>Select a CSV file to import</p>
              <small>Drag a file here</small>
            </p>
          </Dragger>
          <Form>
            <div className="topic-cancel-wrapper">
              <Form.Item label="Associate Workflow :">
                <Dropdown trigger={ ["click"] } overlay={ workflowMenu }>
                  <span>
                    <Input></Input>
                  </span>
                </Dropdown>
              </Form.Item>
              <h4 className="file-selector-head">
                To Learn how to import data from other tools.{ " " }
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
        open={ isModalOpenList }
        onCancel={ handleCancelList }
        onOk={ handleOkList }
        title={ modalMode === "add" ? "Add List" : "Edit List" }
        className="add-task-modal add-list-modal"
        width="90%"
        style={ { maxWidth: 800 } }
        footer={ [
          <Button
            key="cancel"
            onClick={ handleCancelList }
            className="square-outline-btn"
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
                      message: "Please enter a title",
                    },
                  ] }
                >
                  <Input placeholder="Enter title" size="large" />
                </Form.Item>
              </Col>

              {/* Associate Workflow */ }
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item
                  label="Associate Workflow"
                  name="workflow_id"
                  rules={ [
                    {
                      required: true,
                      message: "Please select a workflow",
                    },
                  ] }
                >
                  <Select
                    disabled={ modalMode !== "add" }
                    placeholder="Select Workflow"
                    size="large"
                    showSearch
                    filterOption={ (input, option) =>
                      option.children
                        ?.toLowerCase()
                        ?.indexOf(input?.toLowerCase()) >= 0
                    }
                    onDropdownVisibleChange={ (open) => open && getWorkflow() }
                    onChange={ (id) => {
                      dispatch(getSpecificProjectWorkflowStage(id));
                    } }
                  >
                    { workflow.map((item, index) => (
                      <Option
                        key={ index }
                        value={ item._id }
                        style={ { textTransform: "capitalize" } }
                      >
                        { item.project_workflow }
                      </Option>
                    )) }
                  </Select>
                </Form.Item>
              </Col>

              {/* Assignees */ }
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item label="Assignees">
                  <Select
                    size="large"
                    showSearch
                    mode="multiple"
                    placeholder="Select Assignees"
                    style={ { width: "100%" } }
                    optionFilterProp="children"
                    filterOption={ (input, option) =>
                      option.children
                        ?.toLowerCase()
                        .indexOf(input?.toLowerCase()) >= 0
                    }
                    filterSort={ (optionA, optionB) =>
                      optionA.children
                        ?.toLowerCase()
                        .localeCompare(optionB.children?.toLowerCase())
                    }
                    onChange={ handlerAssignes }
                    value={ selectedsassignees }
                    onDropdownVisibleChange={ (open) =>
                      open && dispatch(getSubscribersList())
                    }
                  >
                    { subscribersList?.map((item, index) => (
                      <Option
                        key={ index }
                        value={ item._id }
                        style={ { textTransform: "capitalize" } }
                      >
                        { item.full_name }
                      </Option>
                    )) }
                  </Select>

                  { selectedsassignees.length > 0 && (
                    <div style={ { marginTop: 8 } }>
                      <Button
                        className="list-clear-btn ant-delete"
                        onClick={ () => setSelectedsassignees([]) }
                        size="small"
                      >
                        Clear
                      </Button>
                    </div>
                  ) }
                </Form.Item>
              </Col>

              {/* Dynamic Assignee Stages */ }
              { selectedsassignees.length > 0 && (
                <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                  <div className="assignee-stages-section">
                    <h4 style={ { marginBottom: 16, color: '#666' } }>
                      Assign Stages to Selected Members
                    </h4>
                    <Row gutter={ [16, 16] }>
                      { subscribersList
                        .filter((value) => selectedsassignees.includes(value._id))
                        .map((data, index) => (
                          <Col xs={ 24 } sm={ 12 } md={ 8 } lg={ 6 } key={ index }>
                            <div className="assignee-stage-card">
                              {/* Assignee Info */ }
                              <div className="assignee-info">
                                <Avatar
                                  src={ `${Service.HRMS_Base_URL}/uploads/emp_images/${data?.emp_img}` }
                                  size="default"
                                />
                                <span className="assignee-name">
                                  { data.full_name }
                                </span>
                              </div>

                              {/* Stage Selection */ }
                              <Form.Item
                                label="Stage"
                                name={ `task_status_${data._id}` }
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
                                      ?.toLowerCase()
                                      .indexOf(input?.toLowerCase()) >= 0
                                  }
                                  filterSort={ (optionA, optionB) =>
                                    optionA.children
                                      ?.toLowerCase()
                                      .localeCompare(optionB.children?.toLowerCase())
                                  }
                                >
                                  { projectWorkflowStage.map((item) => (
                                    <Option
                                      key={ item._id }
                                      value={ item._id }
                                      style={ { textTransform: "capitalize" } }
                                    >
                                      { item.title }
                                    </Option>
                                  )) }
                                </Select>
                              </Form.Item>
                            </div>
                          </Col>
                        )) }
                    </Row>
                  </div>
                </Col>
              ) }
            </Row>
          </Form>
        </div>
      </Modal>


      <Modal
        open={ isModalOpenTaskModal }
        onCancel={ handleCancelTaskModal }
        title="Add Task Bug"
        className="add-task-modal edit-details-task-model"
        width={ 800 }
        footer={ [
          <Button
            key="cancel"
            onClick={ handleCancelTaskModal }
            size="large"
            className="square-outline-btn ant-delete"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            className="square-primary-btn"
            onClick={ () => {
              addform.validateFields(["title"]).then((values) => {
                handleTaskOps({ ...addform.getFieldsValue(), ...values });
              }).catch(() => {});
            } }
          >
            Save
          </Button>,
        ] }
      >
        <div className="overview-modal-wrapper task-overview-modal-wrapper">
          <Form
            form={ addform }
            layout="vertical"
            onFinish={ (values) => handleTaskOps(values) }
          >
            <Row gutter={ [0, 0] }>
              {/* Title - Full width */ }
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

              {/* Task ID - Full width */ }
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Form.Item
                  label="Task"
                  name="task_id"
                // rules={[{ required: true }]}
                >
                  <Select
                    placeholder="Task"
                    size="large"
                    showSearch
                    filterOption={(input, option) =>
                      option?.children?.toLowerCase().includes(input.toLowerCase())
                    }
                    value={ addInputTaskData?.task_id }
                    onChange={ (value) => handleTaskInput("task_id", value) }
                  >
                    { taskList.map((item, index) => (
                      <Option
                        key={ index }
                        value={ item._id }
                        style={ { textTransform: "capitalize" } }
                      >
                        { item.title }
                      </Option>
                    )) }
                  </Select>
                </Form.Item>
              </Col>

              {/* Description - Full width */ }
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Form.Item
                  label="Description"
                  name="descriptions"
                  
                >
                  <CKEditor
                    editor={ Custombuild }
                    data={ editorData }
                    onChange={ handleChangeData }
                    onPast={ handlePaste }
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
                      print: {
                        // Implement print functionality here
                      },
                      styles: {
                        height: "10px",
                      },
                    } }
                  />
                </Form.Item>
              </Col>

              <Form.Item>
                <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                  <div className="table-schedule-wrapper">
                    <ul>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            <span className="schedule-label">Start Date</span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
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
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            <span className="schedule-label">End Date</span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <DatePicker
                              value={
                                addInputTaskData?.end_date &&
                                dayjs(addInputTaskData?.end_date, "YYYY-MM-DD")
                              }
                              disabledDate={ (current) =>
                                current &&
                                current <
                                dayjs(addInputTaskData?.start_date, "YYYY-MM-DD")
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
                              // mode="multiple"
                              allowClear
                              value={ addInputTaskData?.labels }
                              showSearch
                              placeholder="Select"
                              onChange={ (value) => handleTaskInput("labels", value) }
                            >
                              { projectLabels.map((item) => (
                                <Option
                                  key={ item._id }
                                  value={ item._id }
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
                            <span className="schedule-label">
                              Assignees
                              <span style={ { color: "red" } }>*</span>
                            </span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <Form.Item
                              name="selectedItems"
                            >
                              <MultiSelect
                                onSearch={ handleSearch }
                                onChange={ handleSelectedItemsChange }
                                values={
                                  selectedItems &&
                                  selectedItems.map((item) => item._id)
                                }
                                listData={ subscribersList }
                                search={ searchKeyword }
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
                              <span style={ { color: "red" } }>*</span>
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
                                    handleEstTimeInput("est_mins", e.target.value);
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
                </Col>
              </Form.Item>

              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
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
                          { file.name }
                        </p>
                      </div>
                    </Badge>
                  )) }
                </div>
                { fileAttachment.length > 0 && (
                  <div className="folder-comment">
                    <Form.Item
                      label="Folder"
                      name="folder"
                      initialValue={
                        foldersList.length > 0 ? foldersList[0]._id : undefined
                      }
                      rules={ [{ required: true }] }
                    >
                      <Select placeholder="Please Select Folder" showSearch>
                        { foldersList.map((data) => (
                          <Option
                            key={ data._id }
                            value={ data._id }
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

              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Tooltip key="attach" placement="top" title="Attached file">
                  <Button
                    className="link-btn"
                    onClick={ () => attachmentfileRef.current.click() }
                    size="large"
                  >
                    <i className="fi fi-ss-link">
                    </i>
                    Attach files
                  </Button>
                </Tooltip>
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
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item name="repeatedBug" valuePropName="checked">
                  <Checkbox onChange={ onChange }>
                    <span style={ { fontWeight: "bold" } }>Repeated Bug</span>
                  </Checkbox>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>

      <Modal
        open={ isEditTaskModalOpen }
        onCancel={ handleCancelTaskModal }
        title="Edit Task Bug"
        className="add-task-modal edit-details-task-model"
        width={ 800 }
        footer={ [
          <Button
            key="cancel"
            onClick={ handleCancelTaskModal }
            size="large"
            className="square-outline-btn ant-delete"
          >
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
            onFinish={ (values) => handleTaskOps(values, true) }
          >
            <Row gutter={ [0, 0] }>
              {/* Title - Full width */ }
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

              {/* Task ID - Full width */ }
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Form.Item
                  label="Task"
                  name="task_id"
                // rules={[{ required: true }]}
                >
                  <Select
                    placeholder="Task"
                    size="large"
                    showSearch
                    filterSort={ (optionA, optionB) =>
                      optionA.children
                        ?.toLowerCase()
                        .localeCompare(optionB.children?.toLowerCase())
                    }
                    onChange={ (value) => handleTaskInput("task_id", value) }
                  >
                    { taskList.map((item, index) => (
                      <Option
                        key={ index }
                        value={ item._id }
                        style={ { textTransform: "capitalize" } }
                      >
                        { item.title }
                      </Option>
                    )) }
                  </Select>
                </Form.Item>
              </Col>

              {/* Description - Full width */ }
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                <Form.Item
                  label="Description"
                  name="descriptions"
                  rules={ [{ required: true }] }
                >
                  <CKEditor
                    editor={ Custombuild }
                    data={ editModalDescription }
                    onChange={ handleChnageDescription }
                    onPast={ handlePasteData }
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
                      print: {
                        // Implement print functionality here
                      },
                      styles: {
                        height: "10px",
                      },
                    } }
                  />
                </Form.Item>
              </Col>

              <Form.Item>
                <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
                  <div className="table-schedule-wrapper">
                    <ul>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            <span className="schedule-label">Start Date</span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
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
                      </li>
                      <li>
                        <div className="table-left">
                          <div className="flex-table">
                            <i className="fi fi-rr-calendar-day"></i>
                            <span className="schedule-label">End Date</span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <DatePicker
                              value={
                                addInputTaskData?.end_date &&
                                dayjs(addInputTaskData?.end_date, "YYYY-MM-DD")
                              }
                              disabledDate={ (current) =>
                                current &&
                                current <
                                dayjs(addInputTaskData?.start_date, "YYYY-MM-DD")
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
                              // mode="multiple"
                              allowClear
                              value={ addInputTaskData?.labels }
                              showSearch
                              placeholder="Select"
                              onChange={ (value) => handleTaskInput("labels", value) }
                            >
                              { projectLabels.map((item) => (
                                <Option
                                  key={ item._id }
                                  value={ item._id }
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
                            <span className="schedule-label">
                              Assignees
                              <span style={ { color: "red" } }>*</span>
                            </span>
                          </div>
                        </div>
                        <div className="table-right">
                          <div className="flex-table">
                            <Form.Item
                              name="selectedItems"
                              rules={ [
                                {
                                  required: true,
                                  message: "Please select at least one assignee!",
                                  type: "array",
                                  min: 1,
                                },
                              ] }
                              initialValue={ selectedItems.map((item) => ({
                                value: item._id,
                                label: (
                                  <>
                                    <MyAvatar
                                      userName={ item?.full_name }
                                      alt={ item?.full_name }
                                      key={ item._id }
                                      src={ item.emp_img }
                                    />
                                    { item.full_name }
                                  </>
                                ),
                              })) }
                            >
                              <MultiSelect
                                onSearch={ handleSearch }
                                onChange={ handleSelectedItemsChange }
                                values={
                                  selectedItems &&
                                  selectedItems.map((item) => item._id)
                                }
                                listData={ subscribersList }
                                search={ searchKeyword }
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
                              <span style={ { color: "red" } }>*</span>
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
                                    handleEstTimeInput("est_mins", e.target.value);
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
                </Col>
              </Form.Item>

              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
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
                        <p className="fileNameTxtellipsis">{ file.name }</p>
                      </div>
                    </Badge>
                  )) }
                </div>
                { fileAttachment.length > 0 && (
                  <div className="folder-comment">
                    <Form.Item
                      label="Folder"
                      name="folder"
                      initialValue={
                        foldersList.length > 0 ? foldersList[0]._id : undefined
                      }
                      rules={ [{ required: true }] }
                    >
                      <Select placeholder="Please Select Folder" showSearch>
                        { foldersList.map((data) => (
                          <Option
                            key={ data._id }
                            value={ data._id }
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

              <Col xs={ 24 } sm={ 24 } >
                <Tooltip key="attach" placement="top" title="Attached file">
                  <Button
                    className="link-btn"
                    onClick={ () => attachmentfileRef.current.click() }
                    size="large"
                  >
                    <i className="fi fi-ss-link"></i>
                    Attach files
                  </Button>
                </Tooltip>
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
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item name="isrepeated" valuePropName="checked">
                  <Checkbox onChange={ onChange }>
                    <span style={ { fontWeight: "bold" } }>Repeated Bug</span>
                  </Checkbox>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>
    </>
  );
};

export default memo(BugsPMS);
