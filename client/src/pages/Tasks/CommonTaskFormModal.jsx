/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, Col, DatePicker, Form, Input, Modal, Row, Select, Tabs, Upload, message } from "antd";
import { CloseOutlined, CommentOutlined, HistoryOutlined, PaperClipOutlined } from "@ant-design/icons";
import Service from "../../service";
import "../TaskPage/TaskDetailModal.css";

const BACKEND_ONLY_KEYS = new Set(["id", "created_by", "created_at", "updated_at"]);
const BUILTIN_KEYS = new Set([
  "title",
  "description",
  "priority",
  "assignee_id",
  "labels",
  "start_date",
  "end_date",
  "project_id",
]);
const HIDDEN_RUNTIME_KEYS = new Set(["due_date", "main_task_id"]);
const PROJECT_DEPENDENT_LINKED_MODULES = new Set(["project_lists"]);
const modalDataCache = {
  taskFormFields: null,
  projects: null,
  mainTasksByProject: {},
  assigneesByProject: {},
  labelsByProject: {},
  linkedOptions: {},
};

const toLabel = (key = "") =>
  String(key)
    .split("_")
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() || ""}${word.slice(1)}`)
    .join(" ");

const canonicalFieldKey = (key = "") => {
  const normalized = String(key || "").trim().toLowerCase();
  if (normalized === "descriptions") return "description";
  return normalized;
};

const normalizeUploadFileEvent = (event) => {
  if (Array.isArray(event)) return event;
  return event?.fileList || [];
};
const asArray = (response) => {
  const value =
    response?.data?.data?.data ||
    response?.data?.data?.rows ||
    response?.data?.data?.docs ||
    response?.data?.data;
  return Array.isArray(value) ? value : [];
};
const normalizePeople = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      value: item?._id || item?.id,
      label: item?.full_name || item?.name || item?.email,
    }))
    .filter((item) => item.value && item.label);
const getSubscribersArray = (response) => {
  const payload = response?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const merged = []
      .concat(Array.isArray(payload.staff) ? payload.staff : [])
      .concat(Array.isArray(payload.manager) ? payload.manager : [])
      .concat(Array.isArray(payload.client) ? payload.client : [])
      .concat(Array.isArray(payload.users) ? payload.users : []);
    if (merged.length) return merged;
  }
  return [];
};

export default function CommonTaskFormModal({
  open,
  mode = "create",
  title,
  submitText,
  initialValues = {},
  lockedProjectId,
  lockedMainTaskId,
  showListSelector = true,
  onCancel,
  onSubmit,
  submitting = false,
}) {
  const [form] = Form.useForm();
  const [taskFormFields, setTaskFormFields] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [projects, setProjects] = useState([]);
  const [mainTasks, setMainTasks] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [labelOptions, setLabelOptions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingMainTasks, setLoadingMainTasks] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [linkedOptionsByField, setLinkedOptionsByField] = useState({});
  const [linkedLoadingByField, setLinkedLoadingByField] = useState({});
  const [activeRightTab, setActiveRightTab] = useState("comments");
  const hasHydratedForOpenRef = useRef(false);
  const inFlightRef = useRef(new Set());

  const visibleFields = useMemo(
    () =>
      (taskFormFields || [])
        .filter((field) => field?.key && !BACKEND_ONLY_KEYS.has(canonicalFieldKey(field.key)))
        .filter((field) => {
          const key = canonicalFieldKey(field?.key);
          if (key === "status") return false;
          if (HIDDEN_RUNTIME_KEYS.has(key)) return false;
          if (showListSelector && (key === "project_id" || key === "main_task_id")) return false;
          return true;
        })
        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0)),
    [taskFormFields, showListSelector]
  );

  const selectedProjectId = Form.useWatch("project_id", form);
  const effectiveProjectId = lockedProjectId || selectedProjectId;
  const watchedTitle = Form.useWatch("title", form);
  const watchedStartDate = Form.useWatch("start_date", form);
  const watchedEndDate = Form.useWatch("end_date", form);
  const watchedAssignees = Form.useWatch("assignees", form);
  const watchedMainTaskId = Form.useWatch("main_task_id", form);

  const fetchTaskFormConfig = useCallback(async () => {
    if (Array.isArray(modalDataCache.taskFormFields) && modalDataCache.taskFormFields.length > 0) {
      setTaskFormFields(modalDataCache.taskFormFields);
      return;
    }
    if (inFlightRef.current.has("taskFormConfig")) return;
    inFlightRef.current.add("taskFormConfig");
    try {
      setLoadingConfig(true);
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getTaskFormConfig,
      });
      if (response?.data?.status === 1 && Array.isArray(response?.data?.data?.fields)) {
        modalDataCache.taskFormFields = response.data.data.fields;
        setTaskFormFields(response.data.data.fields);
      } else {
        setTaskFormFields([]);
      }
    } catch (error) {
      setTaskFormFields([]);
    } finally {
      setLoadingConfig(false);
      inFlightRef.current.delete("taskFormConfig");
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    if (Array.isArray(modalDataCache.projects) && modalDataCache.projects.length > 0) {
      setProjects(modalDataCache.projects);
      return;
    }
    if (inFlightRef.current.has("projects")) return;
    inFlightRef.current.add("projects");
    setLoadingProjects(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: { pageNo: 1, limit: 200, search: "" },
      });
      const list = res?.data?.data?.data || res?.data?.data || [];
      const safe = Array.isArray(list) ? list : [];
      modalDataCache.projects = safe;
      setProjects(safe);
    } catch (e) {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
      inFlightRef.current.delete("projects");
    }
  }, []);

  const fetchMainTasks = useCallback(async (projectId) => {
    if (!projectId) {
      setMainTasks([]);
      return;
    }
    if (Array.isArray(modalDataCache.mainTasksByProject[projectId])) {
      setMainTasks(modalDataCache.mainTasksByProject[projectId]);
      return;
    }
    const key = `mainTasks:${projectId}`;
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);
    setLoadingMainTasks(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectMianTask,
        body: { project_id: projectId, search: "", sort: "_id", sortBy: "des" },
      });
      const safe = Array.isArray(res?.data?.data) ? res.data.data : [];
      modalDataCache.mainTasksByProject[projectId] = safe;
      setMainTasks(safe);
    } catch (e) {
      setMainTasks([]);
    } finally {
      setLoadingMainTasks(false);
      inFlightRef.current.delete(key);
    }
  }, []);

  const fetchAssignees = useCallback(async (projectId) => {
    const cacheKey = projectId || "__none__";
    if (Array.isArray(modalDataCache.assigneesByProject[cacheKey])) {
      setAssigneeOptions(modalDataCache.assigneesByProject[cacheKey]);
      return;
    }
    const key = `assignees:${cacheKey}`;
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);

    setLoadingAssignees(true);
    try {
      let safe = [];
      if (projectId) {
        const res = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: `${Service.getMasterSubscribers}/${projectId}`,
        });
        safe = getSubscribersArray(res);
      } else {
        safe = [];
      }

      const normalized = normalizePeople(safe);
      modalDataCache.assigneesByProject[cacheKey] = normalized;
      setAssigneeOptions(normalized);
    } catch (e) {
      setAssigneeOptions([]);
    } finally {
      setLoadingAssignees(false);
      inFlightRef.current.delete(key);
    }
  }, []);

  const fetchLabels = useCallback(async (projectId) => {
    const cacheKey = projectId || "__global__";
    if (Array.isArray(modalDataCache.labelsByProject[cacheKey])) {
      setLabelOptions(modalDataCache.labelsByProject[cacheKey]);
      return;
    }
    const inFlightKey = `labels:${cacheKey}`;
    if (inFlightRef.current.has(inFlightKey)) return;
    inFlightRef.current.add(inFlightKey);
    try {
      const body = projectId ? { isDropdown: true, project_id: projectId } : { isDropdown: true };
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectLabels,
        body,
      });
      const safe = Array.isArray(res?.data?.data) ? res.data.data : [];
      modalDataCache.labelsByProject[cacheKey] = safe;
      setLabelOptions(safe);
    } catch (e) {
      setLabelOptions([]);
    } finally {
      inFlightRef.current.delete(inFlightKey);
    }
  }, []);

  const fetchLinkedModuleOptions = useCallback(async (moduleKey, projectId) => {
    try {
      if (moduleKey === "employees") {
        if (Array.isArray(assigneeOptions) && assigneeOptions.length > 0) {
          return assigneeOptions;
        }
        if (projectId) {
          const response = await Service.makeAPICall({
            methodName: Service.getMethod,
            api_url: `${Service.getMasterSubscribers}/${projectId}`,
          });
          const items = getSubscribersArray(response);
          if (items.length > 0) {
            return normalizePeople(items);
          }
        }
        const dropdownResponse = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: Service.getEmployees,
        });
        const dropdownItems = asArray(dropdownResponse);
        if (dropdownItems.length > 0) {
          return normalizePeople(dropdownItems);
        }
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getUsermaster,
          body: { pageNo: 1, limit: 500, search: "" },
        });
        const items = asArray(response);
        return normalizePeople(items);
      }

      if (moduleKey === "clients") {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getClients,
          body: { isDropdown: true },
        });
        let items = asArray(response);
        if (!items.length) {
          const fallback = await Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: Service.clientlist,
            body: { pageNo: 1, limit: 200, search: "" },
          });
          items = asArray(fallback);
        }
        return items.map((item) => ({
          value: item?._id,
          label: item?.full_name || item?.name || item?.company_name || item?.email,
        }));
      }

      if (moduleKey === "project_labels") {
        if (Array.isArray(labelOptions) && labelOptions.length > 0) {
          return labelOptions.map((item) => ({ value: item?._id, label: item?.title }));
        }
        const body = projectId ? { isDropdown: true, project_id: projectId } : { isDropdown: true };
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectLabels,
          body,
        });
        const items = asArray(response);
        return items.map((item) => ({ value: item?._id, label: item?.title }));
      }

      if (moduleKey === "projects") {
        if (Array.isArray(projects) && projects.length > 0) {
          return projects.map((item) => ({ value: item?._id, label: item?.title }));
        }
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.myProjects,
          body: { pageNo: 1, limit: 200, search: "" },
        });
        const safeItems = asArray(response);
        return safeItems.map((item) => ({ value: item?._id, label: item?.title }));
      }

      if (moduleKey === "project_lists") {
        if (Array.isArray(mainTasks) && mainTasks.length > 0) {
          return mainTasks.map((item) => ({ value: item?._id, label: item?.title }));
        }
        if (!projectId) return [];
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectMianTask,
          body: { project_id: projectId, search: "", sort: "_id", sortBy: "des" },
        });
        const items = asArray(response);
        return items.map((item) => ({ value: item?._id, label: item?.title }));
      }
    } catch (error) {
      return [];
    }
    return [];
  }, [assigneeOptions, labelOptions, mainTasks, projects]);

  useEffect(() => {
    if (!open) return;
    fetchTaskFormConfig();
    fetchProjects();
  }, [open]);

  useEffect(() => {
    if (!open) {
      hasHydratedForOpenRef.current = false;
      return;
    }
    if (hasHydratedForOpenRef.current) return;

    const presetProject = lockedProjectId || initialValues?.project_id;
    const presetList = lockedMainTaskId || initialValues?.main_task_id;
    form.setFieldsValue({
      ...initialValues,
      priority: initialValues?.priority || "Low",
      project_id: presetProject || initialValues?.project_id,
      main_task_id: presetList || initialValues?.main_task_id,
    });
    if (presetProject) {
      fetchMainTasks(presetProject);
      fetchAssignees(presetProject);
      fetchLabels(presetProject);
    }
    hasHydratedForOpenRef.current = true;
  }, [open, lockedProjectId, lockedMainTaskId, form, fetchMainTasks, fetchAssignees, fetchLabels]); 

  useEffect(() => {
    if (!open) return;
    const pid = lockedProjectId || selectedProjectId;
    if (pid) {
      fetchMainTasks(pid);
      fetchAssignees(pid);
      fetchLabels(pid);
      return;
    }
    // Strict mode: assignees only from selected project's subscribers.
    setAssigneeOptions([]);
    fetchLabels(null);
  }, [selectedProjectId, open, lockedProjectId]);

  useEffect(() => {
    if (!open) return;
    const linkedFields = (visibleFields || []).filter(
      (field) =>
        (field?.type === "select" || field?.type === "multiselect") &&
        field?.optionSource === "linked" &&
        field?.linkedModule
    );
    if (!linkedFields.length) {
      setLinkedOptionsByField({});
      return;
    }

    Promise.all(
      linkedFields.map(async (field) => {
        const options = await fetchLinkedModuleOptions(field.linkedModule, effectiveProjectId);
        return { key: field.key, options };
      })
    ).then((results) => {
      const next = {};
      results.forEach((result) => {
        if (result?.key) next[result.key] = result.options || [];
      });
      setLinkedOptionsByField(next);
    });
  }, [open, visibleFields, effectiveProjectId, fetchLinkedModuleOptions]);

  const loadLinkedOptionsForField = useCallback(
    async (field, force = false) => {
      const key = String(field?.key || "");
      const moduleKey = String(field?.linkedModule || "");
      const linkedCacheKey = `${moduleKey}::${effectiveProjectId || "global"}`;
      if (!key || !moduleKey) return;
      if (
        PROJECT_DEPENDENT_LINKED_MODULES.has(moduleKey) &&
        !effectiveProjectId
      ) {
        setLinkedOptionsByField((prev) => ({ ...prev, [key]: [] }));
        return;
      }
      if (!force && Array.isArray(linkedOptionsByField[key]) && linkedOptionsByField[key].length > 0) {
        return;
      }
      if (!force && Array.isArray(modalDataCache.linkedOptions[linkedCacheKey])) {
        setLinkedOptionsByField((prev) => ({
          ...prev,
          [key]: modalDataCache.linkedOptions[linkedCacheKey],
        }));
        return;
      }
      setLinkedLoadingByField((prev) => ({ ...prev, [key]: true }));
      try {
        const options = await fetchLinkedModuleOptions(moduleKey, effectiveProjectId);
        modalDataCache.linkedOptions[linkedCacheKey] = options || [];
        setLinkedOptionsByField((prev) => ({ ...prev, [key]: options || [] }));
      } finally {
        setLinkedLoadingByField((prev) => ({ ...prev, [key]: false }));
      }
    },
    [effectiveProjectId, fetchLinkedModuleOptions, linkedOptionsByField]
  );

  const renderFieldControl = (field) => {
    const key = canonicalFieldKey(field?.key);
    const placeholder = field.label || toLabel(key);
    if (key === "title") {
      return <Input placeholder={placeholder} />;
    }
    if (key === "description") {
      return <Input.TextArea rows={3} placeholder={placeholder} />;
    }
    if (key === "priority") {
      return (
        <Select
          options={[
            { value: "Low", label: "Low" },
            { value: "Medium", label: "Medium" },
            { value: "High", label: "High" },
          ]}
        />
      );
    }
    if (key === "assignee_id") {
      return (
        <Select
          mode="multiple"
          placeholder="Select assignees"
          disabled={!effectiveProjectId}
          loading={loadingAssignees}
          showSearch
          optionFilterProp="label"
          options={(assigneeOptions || [])
            .map((u) => ({
              value: u?.value || u?._id || u?.id,
              label: u?.label || u?.full_name || u?.name || u?.email,
            }))
            .filter((opt) => opt.value && opt.label)}
          allowClear
          notFoundContent={!effectiveProjectId ? "Select project first" : undefined}
        />
      );
    }
    if (key === "labels") {
      return (
        <Select
          mode="multiple"
          placeholder="Select labels"
          showSearch
          optionFilterProp="label"
          options={labelOptions.map((lbl) => ({ value: lbl?._id, label: lbl?.title }))}
          allowClear
        />
      );
    }
    if (key === "start_date" || key === "end_date") {
      return <DatePicker style={{ width: "100%" }} />;
    }
    if (key === "project_id") {
      return (
        <Select
          disabled={Boolean(lockedProjectId)}
          loading={loadingProjects}
          placeholder="Select project"
          showSearch
          optionFilterProp="label"
          options={projects.map((p) => ({ value: p?._id, label: p?.title }))}
        />
      );
    }
    if (field?.type === "textarea") {
      return <Input.TextArea rows={3} placeholder={placeholder} />;
    }
    if (field?.type === "number") {
      return <Input type="number" placeholder={placeholder} />;
    }
    if (field?.type === "date" || field?.type === "datetime") {
      return <DatePicker style={{ width: "100%" }} showTime={field?.type === "datetime"} />;
    }
    if (field?.type === "select" || field?.type === "multiselect") {
      const isLinked = field?.optionSource === "linked" && field?.linkedModule;
      const linkedOptions = linkedOptionsByField[key] || [];
      const requiresProject = PROJECT_DEPENDENT_LINKED_MODULES.has(String(field?.linkedModule || ""));
      const linkedDisabled = Boolean(requiresProject && !effectiveProjectId);
      return (
        <Select
          mode={field?.type === "multiselect" ? "multiple" : undefined}
          disabled={linkedDisabled}
          loading={Boolean(linkedLoadingByField[key])}
          options={
            isLinked
              ? (linkedOptions.length > 0
                  ? linkedOptions
                  : (field?.options || []).map((opt) => ({ value: opt, label: opt })))
              : (field?.options || []).map((opt) => ({ value: opt, label: opt }))
          }
          onDropdownVisibleChange={(visible) => {
            if (visible && isLinked) {
              loadLinkedOptionsForField(field, false);
            }
          }}
          notFoundContent={
            linkedDisabled
              ? "Select a project first"
              : undefined
          }
          allowClear
          placeholder={
            isLinked
              ? `Select ${placeholder.toLowerCase()} from linked ${String(field?.linkedModule || "").replace(/_/g, " ")}`
              : placeholder
          }
        />
      );
    }
    if (field?.type === "checkbox") {
      return <Checkbox>{placeholder}</Checkbox>;
    }
    if (field?.type === "file") {
      return (
        <Upload.Dragger beforeUpload={() => false} maxCount={1} multiple={false}>
          <p style={{ margin: 0 }}>Click or drag file to upload</p>
        </Upload.Dragger>
      );
    }
    return <Input placeholder={placeholder} />;
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const projectId = lockedProjectId || values.project_id;
      const mainTaskId = lockedMainTaskId || values.main_task_id;
      if (!projectId) {
        message.error("Project is required.");
        return;
      }
      if (showListSelector && !mainTaskId) {
        message.error("List is required.");
        return;
      }
      onSubmit?.({
        ...values,
        project_id: projectId,
        main_task_id: mainTaskId,
        taskFormFields: visibleFields,
      });
    } catch (e) {
      // form validation errors handled by antd
    }
  };

  const getFieldFormName = useCallback((field) => {
    const key = canonicalFieldKey(field?.key);
    if (key === "title") return "title";
    if (key === "description") return "description";
    if (key === "priority") return "priority";
    if (key === "assignee_id") return "assignees";
    if (key === "labels") return "task_labels";
    if (key === "start_date" || key === "end_date") return key;
    if (key === "project_id" || key === "main_task_id") return key;
    return ["custom_fields", key];
  }, []);
  const selectedProjectName = useMemo(
    () => projects.find((project) => project?._id === effectiveProjectId)?.title || "",
    [projects, effectiveProjectId]
  );
  const selectedListName = useMemo(
    () => mainTasks.find((item) => item?._id === watchedMainTaskId)?.title || "",
    [mainTasks, watchedMainTaskId]
  );
  const selectedAssigneeCount = Array.isArray(watchedAssignees) ? watchedAssignees.length : 0;
  const formatMetricDate = (value) => {
    if (!value) return "Not set";
    if (value?.format) return value.format("MMM D, YYYY");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Modal
      className="task-page-detail-modal"
      open={open}
      onCancel={onCancel}
      width={1100}
      title={null}
      footer={null}
      closeIcon={<CloseOutlined />}
      destroyOnClose
    >
      <div className="task-detail-modal-body">
        <div className="task-detail-modal-left">
          <Form form={form} layout="vertical" initialValues={{ priority: "Low" }}>
            <div className="task-detail-hero">
              <div className="task-detail-topbar">
                <div className="task-detail-topbar-left">
                  <div className="task-detail-status-text">{mode === "edit" ? "EDIT TASK" : "NEW TASK"}</div>
                </div>
                <div className="task-detail-topbar-actions">
                  <Button
                    className="task-detail-icon-btn"
                    type="text"
                    icon={<CommentOutlined />}
                    disabled
                    title="Comments available in view mode"
                  />
                  <Button
                    className="task-detail-icon-btn"
                    type="text"
                    icon={<PaperClipOutlined />}
                    disabled
                    title="Files available in view mode"
                  />
                  <Button
                    className="task-detail-icon-btn"
                    type="text"
                    icon={<HistoryOutlined />}
                    disabled
                    title="Activity available in view mode"
                  />
                </div>
              </div>
              <h2 className="task-detail-title" style={{ marginBottom: 10 }}>
                {String(watchedTitle || "").trim() || "Untitled Task"}
              </h2>
              <div className="task-detail-breadcrumb">
                <div className="task-detail-breadcrumb-trail">
                  <span>{selectedProjectName || "Select project"}</span>
                  <span className="task-detail-breadcrumb-sep">/</span>
                  <span>{selectedListName || "Select list"}</span>
                </div>
              </div>
              <div className="task-detail-meta">
                <div className="task-detail-metric-card">
                  <span className="task-detail-metric-label">Start date</span>
                  <span className="task-detail-metric-value">{formatMetricDate(watchedStartDate)}</span>
                </div>
                <div className="task-detail-metric-card">
                  <span className="task-detail-metric-label">Due date</span>
                  <span className="task-detail-metric-value">{formatMetricDate(watchedEndDate)}</span>
                </div>
                <div className="task-detail-metric-card">
                  <span className="task-detail-metric-label">Assignees</span>
                  <span className="task-detail-metric-value">
                    {selectedAssigneeCount} member{selectedAssigneeCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>

            <div className="task-detail-content-grid" style={{ marginTop: 8 }}>
          {showListSelector && (
            <div className="task-detail-section-grid">
              {!lockedProjectId && (
                <div className="task-detail-section">
                  <div className="task-detail-label">Project</div>
                  <div className="task-detail-value">
                    <Form.Item name="project_id" noStyle rules={[{ required: true, message: "Project is required" }]}>
                      <Select
                        loading={loadingProjects}
                        showSearch
                        optionFilterProp="label"
                        options={projects.map((p) => ({ value: p?._id, label: p?.title }))}
                        placeholder="Select project"
                      />
                    </Form.Item>
                  </div>
                </div>
              )}
              {!lockedMainTaskId && (
                <div className="task-detail-section">
                  <div className="task-detail-label">List</div>
                  <div className="task-detail-value">
                    <Form.Item name="main_task_id" noStyle rules={[{ required: true, message: "List is required" }]}>
                      <Select
                        loading={loadingMainTasks}
                        showSearch
                        optionFilterProp="label"
                        options={mainTasks.map((m) => ({ value: m?._id, label: m?.title }))}
                        placeholder="Select list"
                      />
                    </Form.Item>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="task-detail-section-grid">
            {visibleFields.map((field) => {
              const key = canonicalFieldKey(field?.key);
              const formName = getFieldFormName(field);
              return (
                <div className="task-detail-section" key={key}>
                  <div className="task-detail-label">{field?.label || toLabel(key)}</div>
                  <div className="task-detail-value">
                    <Form.Item
                      name={formName}
                      noStyle
                      initialValue={key === "priority" ? "Low" : undefined}
                      valuePropName={field?.type === "checkbox" ? "checked" : field?.type === "file" ? "fileList" : "value"}
                      getValueFromEvent={field?.type === "file" ? normalizeUploadFileEvent : undefined}
                      rules={
                        field?.required
                          ? [{ required: true, message: `${field?.label || toLabel(key)} is required` }]
                          : []
                      }
                    >
                      {renderFieldControl(field)}
                    </Form.Item>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="task-detail-modal-footer-actions">
            <Button
              className="add-btn"
              type="primary"
              onClick={handleOk}
              loading={submitting}
            >
              {submitText || (mode === "edit" ? "Save Changes" : "Save")}
            </Button>
            <Button className="task-detail-secondary-btn" onClick={onCancel}>
              Close
            </Button>
          </div>
            </div>
            {loadingConfig && <div style={{ color: "#8c8c8c", padding: "0 20px 18px" }}>Loading form configuration...</div>}
          </Form>
        </div>
        <div className="task-detail-modal-right">
          <div className="task-detail-sidebar-head">
            <div className="task-detail-sidebar-kicker">Workspace</div>
            <div className="task-detail-sidebar-title">Discussion and activity</div>
          </div>
          <Tabs
            activeKey={activeRightTab}
            onChange={setActiveRightTab}
            className="task-detail-tabs"
            destroyInactiveTabPane
            items={[
              {
                key: "comments",
                label: (
                  <span className="task-detail-tab-label">
                    <CommentOutlined /> Comments
                    <span className="comment-badge">0</span>
                  </span>
                ),
                children: (
                  <div className="task-detail-tab-content task-detail-comments">
                    <div className="comment-list-box">
                      <div className="comment-list-wrapper">
                        <div className="task-no-comments">No comments</div>
                      </div>
                    </div>
                    <div className="task-detail-add-comment">
                      <div className="task-detail-composer-title">Comments are available in view mode.</div>
                    </div>
                  </div>
                ),
              },
              {
                key: "attachment",
                label: (
                  <span className="task-detail-tab-label">
                    <PaperClipOutlined /> Files
                  </span>
                ),
                children: (
                  <div className="task-detail-tab-content">
                    <p className="task-detail-tab-hint">No attachments yet.</p>
                  </div>
                ),
              },
              {
                key: "activity",
                label: (
                  <span className="task-detail-tab-label">
                    <HistoryOutlined /> Activity
                  </span>
                ),
                children: (
                  <div className="task-detail-tab-content">
                    <p className="task-detail-tab-hint">No activity yet.</p>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}
