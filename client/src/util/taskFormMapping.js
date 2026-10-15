import dayjs from "dayjs";

// Shared by the Task page and the Projects page (task view / edit modals).

export function getTaskProjectId(task) {
  return (
    task?.project?._id ||
    task?.project?.id ||
    task?.project_id?._id ||
    task?.project_id?.id ||
    task?.project_id ||
    ""
  );
}

/** A task record → CommonTaskFormModal initial values. */
export function mapTaskToEditFormInitial(task) {
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
  // A task's assignee can fall out of the project's current "assignable
  // users" list (e.g. removed as a subscriber after being assigned) — the
  // modal's options alone then have no label for their id. Carry the
  // task's own assignee records along so it can still show their name
  // instead of a raw id.
  const assigneeDetails = (Array.isArray(task.assignees) ? task.assignees : [])
    .filter((a) => typeof a === "object" && (a?._id || a?.id))
    .map((a) => ({
      _id: a._id || a.id,
      full_name: a.full_name || a.name || a.email || "Unknown user",
    }));
  const rawLabels = task.taskLabels || task.task_labels || [];
  const labelIds = (Array.isArray(rawLabels) ? rawLabels : [])
    .map((l) => (typeof l === "object" ? l._id || l.id : l))
    .filter(Boolean);
  const due = task.due_date || task.end_date;
  const estH = parseInt(task.estimated_hours, 10);
  const estM = parseInt(task.estimated_minutes, 10);
  const hasEstimate =
    (!Number.isNaN(estH) && estH > 0) || (!Number.isNaN(estM) && estM > 0);
  const estimatedHoursValue = hasEstimate
    ? (Number.isNaN(estH) ? 0 : estH) + (Number.isNaN(estM) ? 0 : estM) / 60
    : undefined;
  return {
    title: task.title || "",
    description: task.descriptions || "",
    project_id: projectId || undefined,
    main_task_id: mainTaskId,
    assignees: assigneeIds,
    assigneeDetails,
    task_labels: labelIds,
    start_date: task.start_date ? dayjs(task.start_date) : undefined,
    end_date: due ? dayjs(due) : undefined,
    estimated_hours: estimatedHoursValue,
    priority: task.priority || "Low",
    custom_fields: task.custom_fields && typeof task.custom_fields === "object" ? { ...task.custom_fields } : {},
  };
}
