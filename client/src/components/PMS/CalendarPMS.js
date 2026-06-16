import React, { useState } from "react";
import {
  LeftOutlined,
  RightOutlined,
  DownOutlined,
  CalendarOutlined,
  TeamOutlined,
  EyeOutlined,
  FlagOutlined,
  ReconciliationOutlined,
  BarsOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  UploadOutlined,
  VerticalLeftOutlined,
} from "@ant-design/icons";
import {
  Calendar,
  Dropdown,
  Menu,
  Button,
  Space,
  Modal,
  Checkbox,
  Avatar,
  Input,
  Form,
  DatePicker,
  Row,
  Col,
  Select,
  Popover,
  ConfigProvider,
} from "antd";
const { Search } = Input;
const { TextArea } = Input;

function CalendarPMS() {
  const [isPopoverVisibleView, setIsPopoverVisibleView] = useState(false);
  const [isPopoverVisibleShow, setIsPopoverVisibleShow] = useState(false);
  const [isPopoverVisibleAssigned, setIsPopoverVisibleAssigned] =
    useState(false);
  const [isModalOpenEventModal, setIsModalOpenEventModal] = useState(false);
  const [isModalOpenMilestone, setIsModalOpenMilestone] = useState(false);
  const [isModalOpenTask, setIsModalOpenTask] = useState(false);
  const [dropdownVisibleDate, setDropdownVisibleDate] = useState({});

  const onPanelChange = (value, mode) => {
    console.log(value.format("DD-MM-YYYY"), mode);
  };

  const handleMenuClick = (e) => {
    console.log(e);
  };

  const handleCancelView = () => {
    setIsPopoverVisibleView(false);
  };

  const handleCancelShow = () => {
    setIsPopoverVisibleShow(false);
  };

  const handleCancelAssigned = () => {
    setIsPopoverVisibleAssigned(false);
  };

  const showModalMilestone = () => {
    setIsModalOpenMilestone(true);
  };
  const handleCancelMilestone = () => {
    setIsModalOpenMilestone(false);
    setShowSelectMilestone(false);
  };

  const showModalTaks = () => {
    setIsModalOpenTask(true);
  };
  const handleCancelTask = () => {
    setIsModalOpenTask(false);
    setShowSelectTask(false);
  };

  const showModalEventModal = () => {
    setIsModalOpenEventModal(true);
  };

  const handleCancelEventModal = () => {
    setIsModalOpenEventModal(false);
    setShowSelectEvent(false);
  };

  const onChange = (date, dateString) => {
    console.log(date, dateString);
  };

  const yourMenu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item onClick={showModalEventModal} key="1">
        <ReconciliationOutlined />
        <span>Event</span>
      </Menu.Item>
      <Menu.Item onClick={showModalMilestone} key="2">
        <FlagOutlined />
        <span>Milestones</span>
      </Menu.Item>
      <Menu.Item key="3" onClick={showModalTaks}>
        <BarsOutlined />
        <span>Task</span>
      </Menu.Item>
    </Menu>
  );

  const items = [
    {
      key: "1",
      label: (
        <>
          <VerticalLeftOutlined /> Subscibe{" "}
        </>
      ),
      children: [
        {
          key: "1-1",
          label: <p>Open with default calendar</p>,
        },
        {
          key: "1-2",
          label: <p>Copy subscribe link for this project</p>,
        },
      ],
    },
    {
      key: "2",
      label: (
        <>
          <UploadOutlined /> Download CSV{" "}
        </>
      ),
      children: [
        {
          key: "2-1",
          label: <p>ical for this project</p>,
        },
        {
          key: "2-2",
          label: <p>Csv for this project</p>,
        },
        {
          key: "2-3",
          label: <p>PDF format</p>,
        },
      ],
    },
  ];

  const content1 = (
    <div className="right-popover-wrapper">
      <h4>View</h4>
      <ul>
        <li>
          <Checkbox>Day</Checkbox>
        </li>
        <li>
          <Checkbox>Week</Checkbox>
        </li>
        <li>
          <Checkbox>2 Weeks</Checkbox>
        </li>
        <li>
          <Checkbox>Month</Checkbox>
        </li>
      </ul>
      <div className="popver-footer-btn">
        <Button type="primary" className="square-primary-btn ant-btn-primary">
          Apply
        </Button>
        <Button
          type="outlined"
          onClick={handleCancelView}
          className="square-outline-btn ant-delete"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const content2 = (
    <div className="right-popover-wrapper">
      <h4>Show</h4>
      <ul>
        <li>
          <Checkbox>Event</Checkbox>
        </li>
        <li>
          <Checkbox>Milestones</Checkbox>
        </li>
        <li>
          <Checkbox>Tasks</Checkbox>
        </li>
      </ul>
      <div className="popver-footer-btn">
        <Button type="primary" className="square-primary-btn ant-btn-primary">
          Apply
        </Button>
        <Button
          type="outlined"
          onClick={handleCancelShow}
          className="square-outline-btn ant-delete"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const content3 = (
    <div className="right-popover-wrapper">
      <ul>
        <li>
          <Checkbox> All</Checkbox>
        </li>
        <li>
          <Checkbox> Unassigned Tasks</Checkbox>
        </li>
        <li>
          <Search />
        </li>
        <li>
          <Avatar /> Tarun KUmar Bansal
        </li>
        <li>
          <Avatar />
          Khyati Jethwa
        </li>
        <li>
          <Avatar /> Mandip Dedandiya
        </li>
        <li>
          <Avatar /> Mihir Roat
        </li>
        <li>
          <Avatar />
          Pankaj Sakariya
        </li>
        <li>
          <Avatar />
          Prachi Patel
        </li>
        <li>
          <Avatar />
          Priyabrata Sahoo
        </li>
        <li>
          <Avatar />
          Priya Puri
        </li>
        <li>
          <Avatar />
          Sapna Rathod
        </li>
        <li>
          <Avatar />
          Vanita KUlkarni
        </li>
      </ul>
      <div className="popver-footer-btn">
        <Button type="primary" className="square-primary-btn ant-btn-primary">
          Apply
        </Button>
        <Button
          type="outlined"
          onClick={handleCancelAssigned}
          className="square-outline-btn ant-delete"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const handleVisibleChange = (date, visible) => {
    setDropdownVisibleDate({ ...dropdownVisibleDate, [date]: visible });
  };

  const handlemenuClick = (date) => {
    setDropdownVisibleDate({
      ...dropdownVisibleDate,
      [date.format("DD-MM-YYYY")]: false,
    });
  };

  const menu = (value) => (
    <div className="calender-dropdown">
      <div>
        <h4>
          Add
          <span>( {value ? moment(value).format("DD-MM-YYYY") : ""} )</span>
        </h4>
      </div>
      <Menu onClick={() => handlemenuClick(value)}>
        <Menu.Item onClick={showModalEventModal}>
          <CalendarOutlined />
          Event
        </Menu.Item>
        <Menu.Item onClick={showModalMilestone}>
          <FlagOutlined />
          Milestone
        </Menu.Item>
        <Menu.Item onClick={showModalTaks}>
          <BarsOutlined />
          Task
        </Menu.Item>
      </Menu>
    </div>
  );

  const dateCellRender = (value) => {
    const date = value.format("MM-DD");

    return (
      <Dropdown
        overlay={menu(value)}
        trigger={["click"]}
        visible={setDropdownVisibleDate(false)}
        onVisibleChange={(visible) => handleVisibleChange(date, visible)}
      >
        <div style={{ height: "100%", cursor: "pointer" }}>
          {/* {value.date()} */}
        </div>
      </Dropdown>
    );
  };

  const [showSelectEvent, setShowSelectEvent] = useState(false);

  const handleButtonEvent = () => {
    setShowSelectEvent(true);
  };

  const handleSelectChangeEvent = (value) => {
    console.log("Selected:", value);
    setShowSelectEvent(false);
  };

  const selectOptionsEvent = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  const [showSelectMilestone, setShowSelectMilestone] = useState(false);

  const handleButtonMilestone = () => {
    setShowSelectMilestone(true);
  };

  const handleSelectChangeMilestone = (value) => {
    console.log("Selected:", value);
    setShowSelectMilestone(false);
  };

  const selectOptionsMilestone = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  const [showSelectTask, setShowSelectTask] = useState(false);

  const handleButtonTask = () => {
    setShowSelectTask(true);
  };

  const handleSelectChangeTask = (value) => {
    console.log("Selected:", value);
    setShowSelectTask(false);
  };

  const selectOptionsTask = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  return (
    <>
      <Modal
        open={isModalOpenEventModal}
        width={500}
        onCancel={handleCancelEventModal}
        title={null}
        footer={null}
        className="add-task-modal add-list-modal modal-calender"
      >
        <div className="modal-header">
          <h1>Add Event</h1>
          <span className="info-btn">
            {/* <i className="fi fi-rr-info"></i> */}
          </span>
        </div>
        <div className="overview-modal-wrapper">
          <Form>
            <div className="topic-cancel-wrapper">
              <Form.Item label="Title">
                <Input></Input>
              </Form.Item>
              <Form.Item label="Description">
                <TextArea></TextArea>
              </Form.Item>
              <Form.Item label="Attendees" className="subscriber-btn">
                {!showSelectEvent && (
                  <Button
                    className="add-btn"
                    icon={<PlusOutlined />}
                    onClick={handleButtonEvent}
                  ></Button>
                )}
                {showSelectEvent && (
                  <Select
                    defaultValue="Select"
                    style={{ width: 120 }}
                    onChange={handleSelectChangeEvent}
                  >
                    {selectOptionsEvent.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                )}
                <Button className="list-clear-btn ant-delete">Clear</Button>
              </Form.Item>
              <Checkbox>All day event</Checkbox>
              <div className="calender-event-block">
                <Row gutter={16}>
                  <Col span={11}>
                    <Form.Item label="When">
                      <DatePicker onChange={onChange}>
                        <CalendarOutlined />
                      </DatePicker>
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    <span className="to">to</span>
                  </Col>
                  <Col span={11}>
                    <Form.Item label="Associate Workflow">
                      <DatePicker onChange={onChange}>
                        <CalendarOutlined />
                      </DatePicker>
                    </Form.Item>
                  </Col>
                </Row>
              </div>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item label="Repeat">
                    <Select
                      defaultValue="Never"
                      options={[
                        {
                          key: "1",
                          value: "Never",
                          label: "Never",
                        },
                        {
                          key: "2",
                          value: "Daily",
                          label: "Daily",
                        },
                        {
                          key: "3",
                          value: "Weekly",
                          label: "Weekly",
                        },
                        {
                          key: "4",
                          value: "Monthly",
                          label: "Monthly",
                        },
                        {
                          key: "5",
                          value: "Yearly",
                          label: "Yearly",
                        },
                      ]}
                    ></Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Timezone">
                    <Select defaultValue="[GMT +8:30] asia/kolkata"></Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Reminder">
                    <Select
                      defaultValue="None"
                      options={[
                        {
                          key: "1",
                          value: "None",
                          label: "None",
                        },
                        {
                          key: "2",
                          value: "at start time",
                          label: "at start time",
                        },
                        {
                          key: "3",
                          value: "6 minutes before start",
                          label: "6 minutes before start",
                        },
                        {
                          key: "4",
                          value: "15 minutes before start",
                          label: "15 minutes before start",
                        },
                        {
                          key: "5",
                          value: "30 minutes before start",
                          label: "30 minutes before start",
                        },
                        {
                          key: "6",
                          value: "1 minutes before start",
                          label: "1 minutes before start",
                        },
                      ]}
                    ></Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </Form>

          <div className="modal-footer-flex">
            <div className="flex-btn">
              <Button type="primary" className="square-primary-btn">
                Add
              </Button>
              <Button
                type="outlined"
                onClick={handleCancelEventModal}
                className="square-outline-btn ant-delete"
              >
                Cancel
              </Button>
            </div>
            {/* <Checkbox>Mark as Private</Checkbox> */}
          </div>
        </div>
      </Modal>

      <Modal
        open={isModalOpenMilestone}
        width={500}
        onCancel={handleCancelMilestone}
        title={null}
        footer={null}
        className="add-task-modal add-list-modal modal-calender"
      >
        <div className="modal-header">
          <h1>Add Milestones</h1>
          <InfoCircleOutlined />
        </div>
        <div className="overview-modal-wrapper">
          <Form>
            <div className="topic-cancel-wrapper">
              <Form.Item label="Title">
                <Input></Input>
              </Form.Item>
              <Form.Item label="Description">
                <TextArea></TextArea>
              </Form.Item>
              <Form.Item label="Attendees" className="subscriber-btn">
                {!showSelectMilestone && (
                  <Button
                    className="add-btn"
                    icon={<PlusOutlined />}
                    onClick={handleButtonMilestone}
                  ></Button>
                )}
                {showSelectMilestone && (
                  <Select
                    defaultValue="Select"
                    style={{ width: 120 }}
                    onChange={handleSelectChangeMilestone}
                  >
                    {selectOptionsMilestone.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                )}
                <Button className="list-clear-btn ant-delete">Clear</Button>
              </Form.Item>
              <Checkbox>All day event</Checkbox>
              <div className="calender-event-block">
                <Row gutter={16}>
                  <Col span={11}>
                    <Form.Item label="When">
                      <DatePicker onChange={onChange}>
                        <CalendarOutlined />
                      </DatePicker>
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    <span className="to">to</span>
                  </Col>
                  <Col span={11}>
                    <Form.Item label="Associate Workflow">
                      <DatePicker onChange={onChange}>
                        <CalendarOutlined />
                      </DatePicker>
                    </Form.Item>
                  </Col>
                </Row>
              </div>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item label="Repeat">
                    <Select
                      defaultValue="Never"
                      options={[
                        {
                          key: "1",
                          value: "Never",
                          label: "Never",
                        },
                        {
                          key: "2",
                          value: "Daily",
                          label: "Daily",
                        },
                        {
                          key: "3",
                          value: "Weekly",
                          label: "Weekly",
                        },
                        {
                          key: "4",
                          value: "Monthly",
                          label: "Monthly",
                        },
                        {
                          key: "5",
                          value: "Yearly",
                          label: "Yearly",
                        },
                      ]}
                    ></Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Timezone">
                    <Select defaultValue="[GMT +8:30] asia/kolkata"></Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Reminder">
                    <Select
                      defaultValue="None"
                      options={[
                        {
                          key: "1",
                          value: "None",
                          label: "None",
                        },
                        {
                          key: "2",
                          value: "at start time",
                          label: "at start time",
                        },
                        {
                          key: "3",
                          value: "6 minutes before start",
                          label: "6 minutes before start",
                        },
                        {
                          key: "4",
                          value: "15 minutes before start",
                          label: "15 minutes before start",
                        },
                        {
                          key: "5",
                          value: "30 minutes before start",
                          label: "30 minutes before start",
                        },
                        {
                          key: "6",
                          value: "1 minutes before start",
                          label: "1 minutes before start",
                        },
                      ]}
                    ></Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </Form>
          <div className="modal-footer-flex">
            <div className="flex-btn">
              <Button type="primary" className="square-primary-btn">
                Add
              </Button>
              <Button
                type="outlined"
                onClick={handleCancelMilestone}
                className="square-outline-btn ant-delete"
              >
                Cancel
              </Button>
            </div>
            {/* <Checkbox>Mark as Private</Checkbox> */}
          </div>
        </div>
      </Modal>

      <Modal
        open={isModalOpenTask}
        width={550}
        onCancel={handleCancelTask}
        title={null}
        footer={null}
        className="add-task-modal modal-calender"
      >
        <div className="modal-header">
          <h1>Add Task</h1>
          <InfoCircleOutlined />
        </div>
        <div className="overview-modal-wrapper modal-calender-content">
          <Form>
            <div className="topic-cancel-wrapper">
              <Form.Item label="Project">
                <Select
                  defaultValue="S04255/FC/Social Import Service Portal"
                  options={[
                    {
                      key: "1",
                      value: "S04255/FC/Social Import Service Portal",
                      label: "S04255/FC/Social Import Service Portal",
                    },
                  ]}
                ></Select>
              </Form.Item>
              <Form.Item label="TaskList">
                <Select placeholder="Select"></Select>
              </Form.Item>
              <Form.Item label="Title">
                <Input></Input>
              </Form.Item>
              <Form.Item label="Description">
                <TextArea></TextArea>
              </Form.Item>
              <Form.Item label="Fields">
                <div className="table-schedule-wrapper">
                  <ul>
                    <li>
                      <div className="table-left">
                        <div className="flex-table">
                          <i className="fi fi-rr-calendar-day"></i>
                          <DatePicker onChange={onChange} />
                        </div>
                      </div>
                      <div className="table-right">
                        <div className="flex-table">
                          <i className="fi fi-rr-calendar-day"></i>
                          <DatePicker onChange={onChange} />
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
                          <Select showSearch placeholder="Select" />
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
                          {!showSelectTask && (
                            <Button
                              className="add-btn"
                              icon={<PlusOutlined />}
                              onClick={handleButtonTask}
                            ></Button>
                          )}
                          {showSelectTask && (
                            <Select
                              defaultValue="Select"
                              style={{ width: 120 }}
                              onChange={handleSelectChangeTask}
                            >
                              {selectOptionsTask.map((option) => (
                                <Select.Option
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </Select.Option>
                              ))}
                            </Select>
                          )}
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
                      <div className="table-right">
                        <div className="flex-table">
                          <Select showSearch placeholder="Add Estimated time" />
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </Form.Item>
            </div>
          </Form>
          <div className="modal-footer-flex">
            <div className="flex-btn">
              <Button type="primary" className="square-primary-btn">
                Add
              </Button>
              <Button
                type="outlined"
                onClick={handleCancelTask}
                className="square-outline-btn ant-delete"
              >
                Cancel
              </Button>
              <Button className="link-btn">
                <i className="fi fi-ss-link"></i>
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <div className="calender-wrapper">
        <Calendar
          dateCellRender={dateCellRender}
          onPanelChange={onPanelChange}
          headerRender={({ value, onChange }) => (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="profile-sub-head">
                <div className="head-box-inner">
                  <Dropdown trigger={["click"]} overlay={yourMenu}>
                    <Button>
                      <Space>
                        <PlusOutlined />
                        Add
                        <DownOutlined />
                      </Space>
                    </Button>
                  </Dropdown>

                  <LeftOutlined
                    onClick={() => onChange(value.clone().subtract(1, "month"))}
                  />
                  <div>{value ? moment(value).format("DD-MM-YYYY") : ""}</div>
                  <RightOutlined
                    onClick={() => onChange(value.clone().add(1, "month"))}
                  />
                  <div className="sub-head-elements">
                    <CalendarOutlined /> Today
                  </div>
                </div>
                <div className="block-status-content">
                  <div className="status-content">
                    <ConfigProvider>
                      <h6
                        onClick={() =>
                          setIsPopoverVisibleView(!isPopoverVisibleView)
                        }
                      >
                        View:
                      </h6>
                      <Popover
                        placement="bottom"
                        trigger="click"
                        content={content1}
                        visible={isPopoverVisibleView}
                        onVisibleChange={setIsPopoverVisibleView}
                      >
                        <CalendarOutlined /> <span>Month</span>
                      </Popover>
                    </ConfigProvider>
                  </div>

                  <div className="status-content">
                    <ConfigProvider>
                      <h6
                        onClick={() =>
                          setIsPopoverVisibleShow(!setIsPopoverVisibleShow)
                        }
                      >
                        Show:
                      </h6>
                      <Popover
                        placement="bottom"
                        trigger="click"
                        content={content2}
                        visible={isPopoverVisibleShow}
                        onVisibleChange={setIsPopoverVisibleShow}
                      >
                        <EyeOutlined />
                        <span>Events,Milestones,T....</span>
                      </Popover>
                    </ConfigProvider>
                  </div>

                  <div className="status-content">
                    <ConfigProvider>
                      <h6
                        onClick={() =>
                          setIsPopoverVisibleAssigned(
                            !setIsPopoverVisibleAssigned
                          )
                        }
                      >
                        Assigned:
                      </h6>
                      <Popover
                        placement="bottom"
                        trigger="click"
                        content={content3}
                        visible={isPopoverVisibleAssigned}
                        onVisibleChange={setIsPopoverVisibleAssigned}
                      >
                        <TeamOutlined />
                        <span style={{ cursor: "pointer" }}>All</span>
                      </Popover>
                    </ConfigProvider>
                  </div>

                  <div className="more-data-dots ">
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items,
                      }}
                    >
                      <span style={{ cursor: "pointer" }}>
                        <i className="fi fi-br-menu-dots-vertical"></i>
                      </span>
                    </Dropdown>
                  </div>
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </>
  );
}

export default CalendarPMS;
