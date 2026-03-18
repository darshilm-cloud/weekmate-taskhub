/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from "react";
import { Form, Input, DatePicker, Select, Button, message } from "antd";
import {
  CloseOutlined,
  CalendarOutlined,
  FlagOutlined,
  ProjectOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Service from "../../service";
import "./QuickAddTaskModal.css";

const { TextArea } = Input;
const { Option } = Select;

export default function QuickAddTaskModal({ open, onCancel, onSuccess }) {
  const [form] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [mainTasks, setMainTasks] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch projects + all users on open
  useEffect(() => {
    if (!open) return;

    // Projects
    const cachedProj = sessionStorage.getItem("qat_projects");
    if (cachedProj) { try { setProjects(JSON.parse(cachedProj)); } catch {} }
    setLoadingProjects(true);
    Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.myProjects, body: {} })
      .then((res) => {
        const list = res?.data?.data?.data || res?.data?.data || [];
        setProjects(list);
        if (list.length) sessionStorage.setItem("qat_projects", JSON.stringify(list));
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));

    // All users (for Assignee/Follower before project is selected)
    const cachedUsers = sessionStorage.getItem("qat_users");
    if (cachedUsers) { try { setAssigneeOptions(JSON.parse(cachedUsers)); } catch {} }
    else {
      Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.getUsermaster, body: { pageNo: 1, limit: 500, search: "" } })
        .then((res) => {
          const users = res?.data?.data || [];
          if (users.length) {
            setAssigneeOptions(users);
            sessionStorage.setItem("qat_users", JSON.stringify(users));
          }
        }).catch(() => {});
    }
  }, [open]);

  const onProjectChange = useCallback((id) => {
    form.setFieldValue("main_task_id", undefined);
    form.setFieldValue("assignees", undefined);
    form.setFieldValue("followers", undefined);
    setMainTasks([]);
    if (!id) return;

    // Lists for project
    setLoadingLists(true);
    Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.getProjectMianTask, body: { project_id: id, search: "", sort: "_id", sortBy: "des" } })
      .then((res) => {
        if (Array.isArray(res?.data?.data)) setMainTasks(res.data.data);
      }).catch(() => {}).finally(() => setLoadingLists(false));

    // Project subscribers
    setLoadingAssignees(true);
    Service.makeAPICall({ methodName: Service.getMethod, api_url: `${Service.getMasterSubscribers}/${id}` })
      .then((res) => { if (res?.data?.data?.length) setAssigneeOptions(res.data.data); })
      .catch(() => {}).finally(() => setLoadingAssignees(false));
  }, [form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const pid = values.project_id;
      const mainId = values.main_task_id;

      setSubmitting(true);

      // Fetch first workflow status for this list (required by API)
      let taskStatusId = null;
      try {
        const boardRes = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectBoardTasks,
          body: { project_id: pid, main_task_id: mainId },
        });
        if (boardRes?.data?.data?.length > 0) {
          taskStatusId = boardRes.data.data[0]?.workflowStatus?._id || null;
        }
      } catch {}

      if (!taskStatusId) {
        message.error("Workflow not found for this list. Please set up a workflow.");
        setSubmitting(false);
        return;
      }

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
        task_status: taskStatusId,
        task_labels: "",
        estimated_hours: "00",
        estimated_minutes: "00",
        task_progress: "0",
        recurringType: "",
      };

      const res = await Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.taskaddition, body: reqBody });
      if (res?.data?.status) {
        message.success(res.data.message || "Task created successfully");
        form.resetFields();
        onSuccess?.();
      } else {
        message.error(res?.data?.message || "Failed to create task");
      }
    } catch {
      // validation error
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onCancel?.();
  };

  if (!open) return null;

  return (
    <div className="qat-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="qat-modal">
        {/* Header */}
        <div className="qat-header">
          <div className="qat-header-left">
            <div className="qat-header-icon"><ProjectOutlined /></div>
            <span className="qat-header-title">Add New Task</span>
          </div>
          <button className="qat-close-btn" onClick={handleClose}><CloseOutlined /></button>
        </div>

        {/* Body */}
        <div className="qat-body">
          <Form form={form} layout="vertical">

            {/* Task Title */}
            <Form.Item name="title" rules={[{ required: true, message: "Task title is required" }]}>
              <Input className="qat-title-input" placeholder="Write your task title..." size="large" />
            </Form.Item>

            {/* Due Date + Priority */}
            <div className="qat-row">
              <Form.Item name="due_date" label={<span><CalendarOutlined /> Due Date</span>} className="qat-field-half">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder="Select date" />
              </Form.Item>
              <Form.Item name="priority" label={<span><FlagOutlined /> Priority</span>} className="qat-field-half" initialValue="Low">
                <Select>
                  <Option value="Low"><span className="qat-priority low">Low</span></Option>
                  <Option value="Medium"><span className="qat-priority medium">Medium</span></Option>
                  <Option value="High"><span className="qat-priority high">High</span></Option>
                </Select>
              </Form.Item>
            </div>

            {/* Description */}
            <Form.Item name="descriptions" label="Description">
              <TextArea rows={3} placeholder="Add task description..." />
            </Form.Item>

            {/* Project + List */}
            <div className="qat-row">
              <Form.Item name="project_id" label={<span><ProjectOutlined /> Project</span>} className="qat-field-half" rules={[{ required: true, message: "Select a project" }]}>
                <Select placeholder="Select project" loading={loadingProjects} onChange={onProjectChange} showSearch optionFilterProp="children">
                  {projects.map((p) => <Option key={p._id} value={p._id}>{p.title}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="main_task_id" label={<span><UnorderedListOutlined /> List</span>} className="qat-field-half" rules={[{ required: true, message: "Select a list" }]}>
                <Select placeholder="Select list" loading={loadingLists} showSearch optionFilterProp="children">
                  {mainTasks.map((t) => <Option key={t._id} value={t._id}>{t.title}</Option>)}
                </Select>
              </Form.Item>
            </div>

            {/* Assignee + Follower */}
            <div className="qat-row">
              <Form.Item name="assignees" label={<span><TeamOutlined /> Assignee Team</span>} className="qat-field-half">
                <Select mode="multiple" placeholder="Select assignees" loading={loadingAssignees} showSearch optionFilterProp="label"
                  options={assigneeOptions.map((u) => ({ value: u._id, label: u.full_name || u.name || u.email }))} />
              </Form.Item>
              <Form.Item name="followers" label={<span><UserOutlined /> Follower</span>} className="qat-field-half">
                <Select mode="multiple" placeholder="Select followers" loading={loadingAssignees} showSearch optionFilterProp="label"
                  options={assigneeOptions.map((u) => ({ value: u._id, label: u.full_name || u.name || u.email }))} />
              </Form.Item>
            </div>

          </Form>
        </div>

        {/* Footer */}
        <div className="qat-footer">
          <Button className="qat-btn-cancel" onClick={handleClose}>Cancel</Button>
          <Button className="qat-btn-submit" loading={submitting} onClick={handleSubmit}>
            {submitting ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </div>
    </div>
  );
}
