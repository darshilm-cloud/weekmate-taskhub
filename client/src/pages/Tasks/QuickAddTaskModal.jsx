/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from "react";
import { message } from "antd";
import Service from "../../service";
import CommonTaskFormModal from "./CommonTaskFormModal";

export default function QuickAddTaskModal({ open, onCancel, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    try {
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
        descriptions: values.description || "",
        due_date: values.end_date ? values.end_date.format("YYYY-MM-DD") : null,
        start_date: values.start_date ? values.start_date.format("YYYY-MM-DD") : null,
        assignees: Array.isArray(values.assignees) ? values.assignees : [],
        pms_clients: Array.isArray(values?.custom_fields?.followers) ? values.custom_fields.followers : [],
        task_status: taskStatusId,
        task_labels: Array.isArray(values.task_labels) ? values.task_labels : [],
        priority: values.priority || "Low",
        estimated_hours: "00",
        estimated_minutes: "00",
        task_progress: "0",
        recurringType: "",
        custom_fields: values.custom_fields || {},
      };

      const res = await Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.taskaddition, body: reqBody });
      if (res?.data?.status) {
        message.success(res.data.message || "Task created successfully");
        form.resetFields();
        onSuccess?.();
      } else {
        message.error(res?.data?.message || "Failed to create task");
      }
    } catch (error) {
      message.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CommonTaskFormModal
      open={open}
      mode="create"
      title="Add New Task"
      submitText="Create Task"
      onCancel={onCancel}
      onSubmit={handleSubmit}
      submitting={submitting}
      showListSelector
    />
  );
}
