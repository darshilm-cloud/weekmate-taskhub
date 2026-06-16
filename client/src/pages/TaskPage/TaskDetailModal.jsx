import React from "react";
import dayjs from "dayjs";
import CommonTaskFormModal from "../Tasks/CommonTaskFormModal";

function getTaskProjectId(task) {
  if (!task) return null;
  if (typeof task.project === "object" && task.project?._id) return task.project._id;
  if (typeof task.project_id === "object" && task.project_id?._id) return task.project_id._id;
  if (task.project_id) return task.project_id;
  if (task.project) return task.project;
  return null;
}

function mapTaskToEditFormInitial(task) {
  if (!task) return {};
  const projectId = getTaskProjectId(task);
  const mainTaskId =
    (typeof task?.mainTask === "object" && task.mainTask?._id) ||
    (typeof task?.main_task_id === "object" && task.main_task_id?._id) ||
    task?.main_task_id ||
    undefined;
  const assigneeIds = (Array.isArray(task.assignees) ? task.assignees : [])
    .map((a) => (typeof a === "object" ? a._id || a.id : a))
    .filter(Boolean);
  const rawLabels = task.taskLabels || task.task_labels || [];
  const labelIds = (Array.isArray(rawLabels) ? rawLabels : [])
    .map((l) => (typeof l === "object" ? l._id || l.id : l))
    .filter(Boolean);
  const due = task.due_date || task.end_date;
  return {
    ...task,
    title: task.title || "",
    description: task.descriptions || "",
    project_id: projectId || undefined,
    main_task_id: mainTaskId,
    assignees: assigneeIds,
    task_labels: labelIds,
    start_date: task.start_date ? dayjs(task.start_date) : undefined,
    end_date: due ? dayjs(due) : undefined,
    priority: task.priority || "Low",
    custom_fields: task.custom_fields && typeof task.custom_fields === "object" ? { ...task.custom_fields } : {},
  };
}

const TaskDetailModal = ({
  open,
  onClose,
  task,
  onEdit,
  afterClose,
}) => {
  return (
    <CommonTaskFormModal
      key={task?._id || "view-task"}
      open={open}
      mode="view"
      title="View Task"
      initialValues={mapTaskToEditFormInitial(task)}
      lockedProjectId={task ? getTaskProjectId(task) || undefined : undefined}
      lockedMainTaskId={
        task
          ? (typeof task?.mainTask === "object" && task?.mainTask?._id) ||
            (typeof task?.main_task_id === "object" && task?.main_task_id?._id) ||
            task?.main_task_id ||
            undefined
          : undefined
      }
      showListSelector={false}
      viewOnly
      taskId={task?._id}
      onCancel={() => {
        if (onClose) onClose();
      }}
      onSubmit={() => {}}
      onEdit={onEdit}
      afterClose={afterClose}
    />
  );
};

export default TaskDetailModal;
