import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Tabs,
  Switch,
  Checkbox,
  message,
} from "antd";
import {
  CloseOutlined,
  SendOutlined,
  PaperClipOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  MoreOutlined,
  MergeCellsOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import Service from "../../service";
import { useDispatch, useSelector } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { getSubscribersList } from "../../appRedux/reducers/ApiData";
import "./AddTaskModal.css";

const { TextArea } = Input;
const { Option } = Select;

export default function AddTaskModal({
  open,
  onCancel,
  onSuccess,
  standalone = false,
  projectId: propProjectId,
  mainTaskId: propMainTaskId,
  mainTaskList = [],
  boardTasks = [],
  subscribersList = [],
  addform: externalForm,
  editorData,
  setEditorData,
  handleChangeData,
  addInputTaskData,
  handleTaskInput,
  selectedItems,
  handleSelectedItemsChange,
  selectedClients,
  handleClientChange,
  estHrs,
  estMins,
  handleEstTimeInput,
  estHrsError,
  estMinsError,
  fileAttachment,
  onFileChange,
  removeAttachmentFile,
  attachmentfileRef,
  foldersList,
  projectLabels,
  handleTaskOps,
}) {
  const dispatch = useDispatch();
  const subscribersFromRedux = useSelector((state) => state.ApiData?.subscribersList || []);
  const [form] = Form.useForm(externalForm);
  const [activeRightTab, setActiveRightTab] = useState("comment");
  const [commentText, setCommentText] = useState("");
  const [statusLabel, setStatusLabel] = useState("Pending");
  const [priorityLabel, setPriorityLabel] = useState("Low");
  const [projects, setProjects] = useState([]);
  const [mainTasks, setMainTasks] = useState([]);
  const [firstWorkflowStatusId, setFirstWorkflowStatusId] = useState(null);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const isStandalone = standalone;
  const projectId = propProjectId;
  const mainTaskId = propMainTaskId;

  const fetchProjects = useCallback(async () => {
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: {},
      });
      if (res?.status === 200 && Array.isArray(res?.data?.data)) {
        setProjects(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchMainTasks = useCallback(async (pid) => {
    if (!pid) return;
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectMianTask,
        body: { project_id: pid },
      });
      if (res?.status === 200 && Array.isArray(res?.data?.data)) {
        setMainTasks(res.data.data);
        return res.data.data;
      }
      setMainTasks([]);
      return [];
    } catch (e) {
      setMainTasks([]);
      return [];
    }
  }, []);

  const fetchBoardTasksForWorkflow = useCallback(async (pid, mainId) => {
    if (!pid || !mainId) return null;
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectBoardTasks,
        body: { project_id: pid, main_task_id: mainId },
      });
      if (res?.status === 200 && res?.data?.data?.length > 0) {
        const firstCol = res.data.data[0];
        return firstCol?.workflowStatus?._id || null;
      }
      return null;
    } catch (e) {
      return null;
    }
  }, []);

  useEffect(() => {
    if (open && isStandalone) {
      fetchProjects();
    }
  }, [open, isStandalone, fetchProjects]);

  useEffect(() => {
    if (open && projectId && isStandalone) {
      fetchMainTasks(projectId);
    }
    if (open && !isStandalone && projectId) {
      setMainTasks(mainTaskList);
    }
  }, [open, projectId, isStandalone, mainTaskList, fetchMainTasks]);

  useEffect(() => {
    if (open && projectId && mainTaskId && isStandalone) {
      fetchBoardTasksForWorkflow(projectId, mainTaskId).then(setFirstWorkflowStatusId);
    }
    if (open && !isStandalone && boardTasks?.length > 0) {
      setFirstWorkflowStatusId(boardTasks[0]?.workflowStatus?._id || null);
    }
  }, [open, projectId, mainTaskId, isStandalone, boardTasks, fetchBoardTasksForWorkflow]);

  useEffect(() => {
    if (open && projectId && !isStandalone) {
      dispatch(getSubscribersList(projectId));
    }
  }, [open, projectId, isStandalone, dispatch]);

  const assigneeList = isStandalone ? subscribersFromRedux : (subscribersList || []);
  useEffect(() => {
    if (open && (projectId || form.getFieldValue("project_id")) && assigneeList.length) {
      setAssigneeOptions(assigneeList);
    }
  }, [open, projectId, assigneeList]);


  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const pid = isStandalone ? values.project_id : projectId;
      const mainId = isStandalone ? values.main_task_id : mainTaskId;
      if (!pid || !mainId) {
        message.error("Please select Project and List");
        return;
      }
      if (!firstWorkflowStatusId && !isStandalone) {
        message.error("Workflow not loaded");
        return;
      }
      setLoading(true);
      dispatch(showAuthLoader());
      const reqBody = {
        project_id: pid,
        main_task_id: mainId,
        title: (values.title || "").trim(),
        status: "active",
        descriptions: values.descriptions || "",
        due_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
        start_date: values.due_date ? values.due_date.format("YYYY-MM-DD") : null,
        assignees: Array.isArray(values.assignees) ? values.assignees : [],
        pms_clients: Array.isArray(values.followers) ? values.followers : [],
        task_status: firstWorkflowStatusId || undefined,
        estimated_hours: "00",
        estimated_minutes: "00",
        task_progress: "0",
        recurringType: "",
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskaddition,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      setLoading(false);
      if (response?.status === 200 && response?.data?.status) {
        message.success(response.data.message || "Task added");
        form.resetFields();
        onSuccess?.();
      } else {
        message.error(response?.data?.message || "Failed to add task");
      }
    } catch (err) {
      setLoading(false);
      dispatch(hideAuthLoader());
      if (err.errorFields) return;
      message.error("Please fill required fields");
    }
  };

  const footer = (
    <div className="add-task-modal-footer">
      <Button type="button" size="large" className="add-task-btn-close" onClick={onCancel}>
        Close
      </Button>
      <Button type="primary" size="large" className="add-task-btn-submit" onClick={handleSubmit} loading={loading}>
        Submit
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={900}
      className="add-task-modal-v2"
      closable={false}
      destroyOnClose
    >
      <div className="add-task-modal-v2-inner">
        <div className="add-task-modal-header">
          <div className="add-task-modal-header-icons">
            <span className="header-icon" title="Timer"><ClockCircleOutlined /></span>
            <span className="header-icon" title="Merge"><MergeCellsOutlined /></span>
            <span className="header-icon" title="Link"><LinkOutlined /></span>
            <span className="header-icon" title="More"><MoreOutlined /></span>
          </div>
          <button type="button" className="add-task-modal-close-btn" onClick={onCancel} aria-label="Close">
            <CloseOutlined />
          </button>
        </div>

        <div className="add-task-modal-body">
          <div className="add-task-modal-left">
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                name="title"
                label="Write your task"
                rules={[{ required: true, message: "Enter task title" }]}
              >
                <Input placeholder="Task title" size="large" prefix={<span className="input-prefix-check">✓</span>} />
              </Form.Item>
              <div className="add-task-due-row">
                <CalendarOutlined className="due-row-icon" />
                <span className="due-row-label">Due Date</span>
                <Form.Item name="due_date" noStyle rules={[{ required: true, message: "Select due date" }]}>
                  <DatePicker style={{ flex: 1, minWidth: 0 }} format="YYYY-MM-DD" />
                </Form.Item>
                <Select
                  value={statusLabel}
                  onChange={setStatusLabel}
                  className="due-row-status-select"
                  options={[
                    { value: "Pending", label: "Pending" },
                    { value: "In Progress", label: "In Progress" },
                    { value: "Done", label: "Done" },
                  ]}
                />
                <Select
                  value={priorityLabel}
                  onChange={setPriorityLabel}
                  className="due-row-priority-select"
                  options={[
                    { value: "Low", label: "Low" },
                    { value: "Medium", label: "Medium" },
                    { value: "High", label: "High" },
                  ]}
                />
              </div>
              <Form.Item name="descriptions" label="Task description">
                <TextArea rows={4} placeholder="Description" />
              </Form.Item>
              {isStandalone && (
                <>
                  <Form.Item name="project_id" label="Projects" rules={[{ required: true, message: "Select project" }]}>
                    <Select
                      placeholder="Project"
                      allowClear
                      onChange={(id) => {
                        form.setFieldValue("main_task_id", undefined);
                        setMainTasks([]);
                        setFirstWorkflowStatusId(null);
                        if (id) {
                          fetchMainTasks(id);
                          dispatch(getSubscribersList(id));
                        }
                      }}
                    >
                      {projects.map((p) => (
                        <Option key={p._id} value={p._id}>{p.title}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="main_task_id" label="List" rules={[{ required: true, message: "Select list" }]}>
                    <Select
                      placeholder="Select list"
                      allowClear
                      disabled={!form.getFieldValue("project_id")}
                      onChange={(mid) => {
                        const pid = form.getFieldValue("project_id");
                        if (pid && mid) fetchBoardTasksForWorkflow(pid, mid).then(setFirstWorkflowStatusId);
                      }}
                    >
                      {mainTasks.map((m) => (
                        <Option key={m._id} value={m._id}>{m.title}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </>
              )}
              <Form.Item name="assignees" label="Assignee Team" >
                <Select
                  mode="multiple"
                  placeholder="Assignee/Team group *"
                  options={assigneeOptions.map((e) => ({ value: e._id, label: e.full_name || e.name }))}
                  showSearch
                  filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
              <Form.Item name="followers" label="Follower">
                <Select
                  mode="multiple"
                  placeholder="Follower"
                  options={assigneeOptions.map((e) => ({ value: e._id, label: e.full_name || e.name }))}
                  allowClear
                />
              </Form.Item>
              <div className="add-task-modal-row">
                <UserOutlined className="add-task-modal-row-icon" />
                <span className="add-task-modal-row-label">Select Multiple sub task assignee</span>
                <Switch size="small" />
              </div>
              <div className="add-task-modal-links">
                <Button
                  type="link"
                  className="link-upload"
                  disabled={isStandalone}
                  onClick={() => !isStandalone && attachmentfileRef?.current?.click?.()}
                >
                  + Upload Document
                </Button>
                <Button type="link" className="link-subtask">+ Add Sub Task</Button>
              </div>
              <Form.Item name="mark_mandatory" valuePropName="checked" initialValue={false}>
                <Checkbox>Mark as mandatory</Checkbox>
              </Form.Item>
            </Form>
          </div>

          <div className="add-task-modal-right">
            <Tabs
              activeKey={activeRightTab}
              onChange={setActiveRightTab}
              className="add-task-right-tabs"
              items={[
                { key: "comment", label: "Comment" },
                { key: "attachment", label: "Attachment" },
                { key: "activity", label: "Log Activity" },
              ]}
            />
            <div className="add-task-right-content">
              {activeRightTab === "comment" && (
                <div className="add-task-comment-placeholder">
                  <div className="comment-date">Today</div>
                  <div className="comment-empty">No comments yet.</div>
                </div>
              )}
              {activeRightTab === "attachment" && <div className="add-task-comment-placeholder">No attachments.</div>}
              {activeRightTab === "activity" && <div className="add-task-comment-placeholder">No activity.</div>}
            </div>
            <div className="add-task-right-input">
              <Input
                placeholder="Type a message"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="add-task-message-input"
              />
              <PaperClipOutlined className="input-icon" />
              <Button type="primary" icon={<SendOutlined />} className="input-send" />
            </div>
          </div>
        </div>

        {footer}
      </div>
    </Modal>
  );
}
