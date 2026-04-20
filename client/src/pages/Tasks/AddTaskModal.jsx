/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from "react";
import { message } from "antd";
import Service from "../../service";
import CommonTaskFormModal from "./CommonTaskFormModal";

const normalizeDate = (value, withTime = false) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value?.format) return value.format(withTime ? "DD-MM-YYYY HH:mm:ss" : "DD-MM-YYYY");
  return null;
};

const normalizeStageKey = (value = "") =>
  String(value || "")
      .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const uploadFiles = async (files = [], type = "task") => {
    try {
      const validFiles = Array.isArray(files)
        ? files.filter((file) => file instanceof File || file?.originFileObj instanceof File)
        : [];
      if (!validFiles.length) return [];

      const formData = new FormData();
    validFiles.forEach((file) => formData.append("document", file?.originFileObj || file));

      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileUpload}?file_for=${type}`,
        body: formData,
        options: { "content-type": "multipart/form-data" },
      });
      return Array.isArray(res?.data?.data) ? res.data.data : [];
    } catch (error) {
      return [];
    }
};

export default function AddTaskModal({
  open,
  onCancel,
  onSuccess,
  standalone = false,
  projectId: propProjectId,
  mainTaskId: propMainTaskId,
  initialStatusId = null,
  initialStatusMeta = null,
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      const pid = standalone ? values.project_id : propProjectId;
      const mainId = standalone ? values.main_task_id : propMainTaskId;

      if (!pid || !mainId) {
        message.error("Please select project and list.");
      return;
    }

      let workflowId = null;
      try {
        const boardRes = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectBoardTasks,
        body: { project_id: pid, main_task_id: mainId },
      });
        const boardColumns = Array.isArray(boardRes?.data?.data) ? boardRes.data.data : [];
        const stageById = new Map(
          boardColumns
            .map((column) => column?.workflowStatus)
            .filter((stage) => stage?._id)
            .map((stage) => [String(stage._id), stage])
        );
        const requestedStageTitle =
          initialStatusMeta?.title ||
          initialStatusMeta?.name ||
          "";
        const matchedByTitle = boardColumns.find((column) => {
          const stage = column?.workflowStatus || {};
          return (
            requestedStageTitle &&
            normalizeStageKey(stage?.title || stage?.name) ===
              normalizeStageKey(requestedStageTitle)
          );
        });

        workflowId =
          (initialStatusId && stageById.has(String(initialStatusId)) && initialStatusId) ||
          matchedByTitle?.workflowStatus?._id ||
          boardColumns?.[0]?.workflowStatus?._id ||
          null;
      } catch (error) {
        workflowId = initialStatusId || null;
      }

      if (!workflowId) {
        message.error("Workflow not found for this list. Please set up a workflow.");
      return;
    }

      const dynamicCustomFields = { ...(values.custom_fields || {}) };
      for (const field of values.taskFormFields || []) {
        const key = String(field?.key || "");
        if (!key) continue;
        if (["title", "description", "status", "priority", "assignee_id", "labels", "start_date", "end_date", "project_id"].includes(key)) {
          continue;
        }
        if (field?.type === "date" || field?.type === "datetime") {
          dynamicCustomFields[key] = normalizeDate(dynamicCustomFields[key], field?.type === "datetime");
        }
        if (field?.type === "file") {
          const current = dynamicCustomFields[key];
          const maybeFile = Array.isArray(current) ? current[0]?.originFileObj || current[0] : current;
          if (maybeFile instanceof File) {
            const uploaded = await uploadFiles([maybeFile], "task");
            dynamicCustomFields[key] = uploaded[0] || null;
      } else {
            dynamicCustomFields[key] = null;
          }
        }
      }

      const reqBody = {
        project_id: pid,
        main_task_id: mainId,
        title: String(values.title || "").trim(),
        status: "active",
        descriptions: values.description || "",
        due_date: normalizeDate(values.end_date),
        start_date: normalizeDate(values.start_date),
        end_date: normalizeDate(values.end_date),
        priority: values.priority || "Low",
        assignees: Array.isArray(values.assignees) ? values.assignees : [],
        pms_clients: Array.isArray(dynamicCustomFields.followers) ? dynamicCustomFields.followers : [],
        task_status: workflowId,
        task_labels: Array.isArray(values.task_labels) ? values.task_labels : [],
        estimated_hours: "00",
        estimated_minutes: "00",
        task_progress: "0",
        recurringType: "",
        custom_fields: dynamicCustomFields,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskaddition,
        body: reqBody,
      });

      if (response?.data?.status || response?.data?.success) {
        message.success(response?.data?.message || "Task added");
        const createdTask = response?.data?.data || {};
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("weekmate:task-created", {
              detail: { task: createdTask },
            })
          );
        }
        onSuccess?.(createdTask);
      } else {
        message.error(response?.data?.message || "Failed to add task");
      }
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to add task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CommonTaskFormModal
        open={open}
        mode="create"
      title="Add Task"
      submitText="Save"
      onCancel={onCancel}
      onSubmit={handleSubmit}
      submitting={submitting}
      lockedProjectId={standalone ? undefined : propProjectId}
      lockedMainTaskId={standalone ? undefined : propMainTaskId}
      showListSelector
    />
  );
}
