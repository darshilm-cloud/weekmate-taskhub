import React, { memo, useMemo, useCallback } from 'react';
import { Modal, Form, Select, DatePicker, Input, Button, Row, Col } from 'antd';
import dayjs from 'dayjs';
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from 'ckeditor5-custom-build/build/ckeditor';
import './AddTimeModal.css';

const { Option } = Select;

// CKEditor configuration - moved outside component to prevent recreation
const CKEDITOR_CONFIG = {
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
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
    ],
  },
  print: {},
  styles: {
    height: "10px",
  },
};

// Common filter functions - moved outside to prevent recreation
const filterOption = (input, option) =>
  option.children?.toLowerCase().indexOf(input?.toLowerCase()) >= 0;

const filterSort = (optionA, optionB) =>
  optionA.children?.toLowerCase().localeCompare(optionB.children?.toLowerCase());

const AddTimeModal = memo(({
  openModal,
  cancelModal,
  formName,
  onFinish,
  taskdropdown = [],
  addInputTaskData,
  handleTaskInput,
  estHrs,
  handleEstTimeInput,
  estHrsError,
  estMins,
  estMinsError,
  handleChangedescription,
  editorData,
  handlePaste,
  type,
  handleBuglist,
  buglistdropdown = [],
  loading = false
}) => {
  // Memoized values
  const initialWorkflowId = useMemo(() => 
    taskdropdown.length > 0 ? taskdropdown[0]._id : undefined,
    [taskdropdown]
  );

  const dateValue = useMemo(() => 
    addInputTaskData?.start_date ? dayjs(addInputTaskData.start_date, 'DD-MM-YYYY') : null,
    [addInputTaskData?.start_date]
  );

  // Memoized handlers
  const handleHoursChange = useCallback((e) => {
    const inputValue = e.target.value;
    if (inputValue === '' || /^(2[0-4]|1[0-9]|[1-9]|0)$/.test(inputValue)) {
      handleEstTimeInput('est_hrs', inputValue);
    } else {
      e.preventDefault();
    }
  }, [handleEstTimeInput]);

  const handleMinutesChange = useCallback((e) => {
    const inputValue = e.target.value;
    if (inputValue === '' || /^[0-5]?[0-9]$/.test(inputValue)) {
      handleEstTimeInput('est_mins', inputValue);
    } else {
      e.preventDefault();
    }
  }, [handleEstTimeInput]);

  const handleDateChange = useCallback((date, dateString) => {
    handleTaskInput('start_date', dateString);
  }, [handleTaskInput]);

  const disabledDate = useCallback((current) => {
    return current && current > dayjs().endOf('day');
  }, []);

  // Memoized task options
  const taskOptions = useMemo(() => 
    taskdropdown.map((item, index) => (
      <Option
        key={item._id || index}
        value={item._id}
        style={{ textTransform: 'capitalize' }}
      >
        {item.title}
      </Option>
    )),
    [taskdropdown]
  );

  // Memoized bug options
  const bugOptions = useMemo(() => 
    buglistdropdown.map((item, index) => (
      <Option
        key={item._id || index}
        value={item._id}
        style={{ textTransform: 'capitalize' }}
      >
        {item.title}
      </Option>
    )),
    [buglistdropdown]
  );

  const renderTimesheetSelect = () => (
    <Form.Item
      label="Timesheet"
      name="workflow_id"
      initialValue={initialWorkflowId}
      rules={[{ required: true }]}
    >
      <Select
        size="large"
        showSearch
        filterOption={filterOption}
        filterSort={filterSort}
      >
        {taskOptions}
      </Select>
    </Form.Item>
  );

  const renderTaskAndBugSelects = () => (
    <>
      <Form.Item
        label="Task"
        colon={false}
        className="time-log-wrapper"
        name="task_name"
        rules={[{ required: true, message: "Please select tasks" }]}
      >
        <Select
          className="time-log-block"
          showSearch
          onChange={handleBuglist}
          defaultValue="None"
          filterOption={filterOption}
          filterSort={filterSort}
          size="large"
        >
          {taskOptions}
        </Select>
      </Form.Item>
      <Form.Item
        label="Bugs"
        colon={false}
        className="time-log-wrapper"
        name="bug_list"
      >
        <Select
          className="time-log-block"
          showSearch
          defaultValue="None"
          filterOption={filterOption}
          filterSort={filterSort}
          size="large"
        >
          {bugOptions}
        </Select>
      </Form.Item>
    </>
  );

  return (
     <Modal
      open={ openModal }
      onCancel={ cancelModal }
      title={type === "bug" ? "Add Bug" : type === "task" ? "Add Task" : "Add Time"}
      className="add-task-modal task-aad-time-pop"
      width={ 800 }
      destroyOnClose
      footer={ [
        <Button key="cancel" onClick={ cancelModal } size="large" className="square-outline-btn ant-delete">
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          size="large"
          className="square-primary-btn"
          onClick={ () => formName.submit() }
          loading={ loading }
        >
          Save
        </Button>,
      ] }
    >
      <div className="overview-modal-wrapper">
        <Form
          form={ formName }
          layout="vertical"
          onFinish={ onFinish }
        >
          <Row gutter={ [0, 0] }>
            {/* Conditional Selects - Full width */ }
            <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
              { (type === "task" || type === "bug") && renderTimesheetSelect() }
              { type === "timesheet" && renderTaskAndBugSelects() }
            </Col>

            {/* Date and Time Inputs - Full width */ }
            <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
              <div style={ { display: 'flex', gap: '20px' } }>
                <Form.Item
                  label="Date"
                  name="date"
                  rules={ [{ required: true, message: 'Please select date' }] }
                >
                  <DatePicker
                    placeholder="When"
                    value={ dateValue }
                    onChange={ handleDateChange }
                    disabledDate={ disabledDate }
                  >
                    <i className="fi fi-rr-calendar-day"></i>
                  </DatePicker>
                </Form.Item>

                <Form.Item
                  label="Hours"
                  name="hours"
                  rules={ [{ required: false }] }
                >
                  <div className="hours_min_container">
                    <Input
                      type="text"
                      value={ estHrs }
                      onChange={ handleHoursChange }
                      className={ `hours_input ${estHrsError ? 'error-border' : ''}` }
                      placeholder="Hours"
                      size="large"
                    />
                    { estHrsError && <div style={ { color: 'red' } }>{ estHrsError }</div> }
                  </div>
                </Form.Item>

                <Form.Item
                 label="Minute"
                  name="minutes"
                  rules={ [{ required: false }] }
                >
                  <div className="hours_min_container">
                    <Input
                      type="text"
                      value={ estMins }
                      onChange={ handleMinutesChange }
                      className={ `hours_input ${estMinsError ? 'error-border' : ''}` }
                      placeholder="Minutes"
                      size="large"
                    />
                    { estMinsError && <div style={ { color: 'red' } }>{ estMinsError }</div> }
                  </div>
                </Form.Item>
              </div>
            </Col>

            {/* Description - Full width */ }
            <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>
              <Form.Item
                label="Description"
                name="Description"
                colon={ false }
              >
                <CKEditor
                  className="custom-ckeditor"
                  editor={ Custombuild }
                  data={ editorData }
                  onChange={ handleChangedescription }
                  onPaste={ handlePaste }
                  config={ CKEDITOR_CONFIG }
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>
    </Modal>
  );
});

AddTimeModal.displayName = 'AddTimeModal';

export default AddTimeModal;