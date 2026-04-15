import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, Col, Form, Input, Modal, Row, Select, Space, Switch, Tag, Tooltip, Typography, message } from "antd";
import { DeleteOutlined, DragOutlined, EditOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import Service from "../../../service";
import "./taskFormBuilder.css";

const { Title, Text } = Typography;

const BACKEND_ONLY_FIELD_KEYS = ["id", "created_by", "created_at", "updated_at"];

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date Time" },
  { value: "file", label: "File" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi Select" },
  { value: "checkbox", label: "Checkbox" },
];
const FIELD_OPTION_SOURCE_OPTIONS = [
  { value: "static", label: "Options" },
  { value: "linked", label: "Link Up" },
];
const LINKED_MODULE_OPTIONS = [
  { value: "employees", label: "Employees" },
  { value: "clients", label: "Clients" },
  { value: "project_labels", label: "Project Labels" },
  { value: "projects", label: "Projects" },
  { value: "project_lists", label: "Project Lists" },
];

const toLabel = (key = "") =>
  key
    .split("_")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");

const TaskFormBuilder = () => {
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingFieldKey, setEditingFieldKey] = useState(null);
  const [draggingFieldKey, setDraggingFieldKey] = useState(null);
  const [addFieldForm] = Form.useForm();

  const addFieldLabel = Form.useWatch("label", addFieldForm);
  const addFieldType = Form.useWatch("type", addFieldForm);
  const addFieldOptionSource = Form.useWatch("optionSource", addFieldForm);
  const addFieldKey = useMemo(
    () =>
      String(addFieldLabel || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, ""),
    [addFieldLabel]
  );

  const allKeys = useMemo(
    () => new Set(fields.map((field) => String(field.key || "").trim().toLowerCase())),
    [fields]
  );

  const visibleFormFields = useMemo(
    () => fields.filter((field) => !BACKEND_ONLY_FIELD_KEYS.includes(String(field.key || "").trim().toLowerCase())),
    [fields]
  );

  const hydrateFields = useCallback((fields = []) => {
    const sorted = [...fields].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    setFields(sorted);
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getTaskFormConfig,
      });
      if (response?.data?.status === 1) {
        hydrateFields(response?.data?.data?.fields || []);
      } else {
        message.error(response?.data?.message || "Failed to load task form settings.");
      }
    } catch (error) {
      message.error("Unable to load task form settings.");
    }
  }, [hydrateFields]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const closeFieldModal = () => {
    setFieldModalOpen(false);
    setEditingFieldKey(null);
    addFieldForm.resetFields();
  };

  const openAddFieldModal = () => {
    setEditingFieldKey(null);
    addFieldForm.setFieldsValue({
      type: "text",
      required: false,
      optionSource: "static",
      linkedModule: undefined,
      options: "",
    });
    setFieldModalOpen(true);
  };

  const openEditFieldModal = (field) => {
    if (!field || field.isDefault) {
      return;
    }
    setEditingFieldKey(field.key);
    addFieldForm.setFieldsValue({
      label: field.label || "",
      type: field.type || "text",
      required: Boolean(field.required),
      optionSource: field.optionSource || "static",
      linkedModule: field.linkedModule || undefined,
      options: Array.isArray(field.options) ? field.options.join(", ") : "",
    });
    setFieldModalOpen(true);
  };

  const handleAddOrEditField = async () => {
    const values = await addFieldForm.validateFields();
    const label = String(values.label || "").trim();
    const generatedKey = String(addFieldKey || "").trim();
    const key = editingFieldKey || generatedKey;

    if (!key || !label) {
      message.warning("Field key and label are required.");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      message.warning("Field key must start with a letter and can contain lowercase letters, numbers, and underscore.");
      return;
    }
    if (!editingFieldKey && allKeys.has(key)) {
      message.warning("Field key already exists.");
      return;
    }

    const isSelectType = values.type === "select" || values.type === "multiselect";
    const optionSource = isSelectType ? values.optionSource || "static" : "static";
    const linkedModule = isSelectType && optionSource === "linked" ? values.linkedModule : null;
    const options =
      isSelectType && optionSource === "static"
        ? String(values.options || "")
            .split(",")
            .map((option) => option.trim())
            .filter(Boolean)
        : [];

    if (isSelectType && optionSource === "static" && options.length === 0) {
      message.warning("Please add at least one option for select fields.");
      return;
    }
    if (isSelectType && optionSource === "linked" && !linkedModule) {
      message.warning("Please choose a linked module.");
      return;
    }

    setFields((prev) => {
      const sortedPrev = [...prev].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      if (editingFieldKey) {
        return sortedPrev.map((field, index) =>
          field.key === editingFieldKey
            ? {
                ...field,
                label,
                type: values.type,
                required: Boolean(values.required),
                optionSource,
                linkedModule,
                options,
                order: index,
              }
            : { ...field, order: index }
        );
      }
      const next = [
        ...sortedPrev,
        {
          key,
          label,
          type: values.type,
          required: Boolean(values.required),
          isDefault: false,
          optionSource,
          linkedModule,
          options,
        },
      ];
      return next.map((field, index) => ({ ...field, order: index }));
    });
    closeFieldModal();
    message.success(editingFieldKey ? "Field updated." : "Field added.");
  };

  const removeField = (key) => {
    setFields((prev) =>
      prev
        .filter((field) => field.key !== key)
        .map((field, index) => ({ ...field, order: index }))
    );
  };

  const handleRequiredToggle = (key, required) => {
    setFields((prev) =>
      prev.map((field, index) =>
        field.key === key ? { ...field, required: Boolean(required), order: index } : { ...field, order: index }
      )
    );
  };

  const moveFieldByDrag = (sourceKey, destinationKey) => {
    if (!sourceKey || !destinationKey || sourceKey === destinationKey) {
      return;
    }
    setFields((prev) => {
      const sourceIndex = prev.findIndex((field) => field.key === sourceKey);
      const destinationIndex = prev.findIndex((field) => field.key === destinationKey);
      if (sourceIndex < 0 || destinationIndex < 0) {
        return prev;
      }
      const next = [...prev];
      [next[sourceIndex], next[destinationIndex]] = [next[destinationIndex], next[sourceIndex]];
      return next.map((field, index) => ({ ...field, order: index }));
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadFields = [...fields]
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: Boolean(field.required),
        isDefault: Boolean(field.isDefault),
        optionSource: field.optionSource || "static",
        linkedModule: field.linkedModule || null,
        options: Array.isArray(field.options) ? field.options : [],
      }));

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addEditTaskFormConfig,
        body: { fields: payloadFields },
      });

      if (response?.data?.status === 1) {
        hydrateFields(response?.data?.data?.fields || []);
        message.success("Task form configuration saved.");
      } else {
        message.error(response?.data?.message || "Unable to save task form configuration.");
      }
    } catch (error) {
      message.error("Unable to save task form configuration.");
    } finally {
      setSaving(false);
    }
  };

  const renderFieldPreviewInput = (field) => {
    if (field.type === "textarea") {
      return <Input.TextArea placeholder={field.label || toLabel(field.key)} rows={3} disabled />;
    }
    if (field.type === "select" || field.type === "multiselect") {
      return (
        <Select
          mode={field.type === "multiselect" ? "multiple" : undefined}
          disabled
          placeholder={field.label || toLabel(field.key)}
          options={
            field.optionSource === "linked"
              ? [{ label: `Linked: ${field.linkedModule || "module"}`, value: "__linked" }]
              : (field.options || []).map((option) => ({ label: option, value: option }))
          }
        />
      );
    }
    if (field.type === "checkbox") {
      return <Checkbox disabled>{field.label || toLabel(field.key)}</Checkbox>;
    }
    if (field.type === "file") {
      return <Input disabled placeholder="Choose file" />;
    }
    return (
      <Input
        type={field.type === "number" ? "number" : "text"}
        disabled
        placeholder={field.label || toLabel(field.key)}
      />
    );
  };

  return (
    <div className="task-form-builder-page">
      <Card className="task-form-builder-card">
        <div className="task-form-builder-header">
          <div>
            <Title level={4}>Task Form Builder</Title>
            <Text type="secondary">
              Configure one task form per company. Default fields are locked and always included.
            </Text>
          </div>
          <div className="task-form-builder-header-actions">
            <Button icon={<PlusOutlined />} onClick={openAddFieldModal}>
              Add Field
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              Save Configuration
            </Button>
          </div>
        </div>

        <div className="task-form-builder-section">
          <Title level={5}>Fields Configuration</Title>
          <Form layout="vertical" className="task-form-preview">
            <Row gutter={16}>
              {visibleFormFields.map((field) => (
                <Col xs={24} md={12} key={field.key}>
                  <div
                    className="task-form-builder-field-card"
                    draggable
                    onDragStart={() => setDraggingFieldKey(field.key)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      moveFieldByDrag(draggingFieldKey, field.key);
                      setDraggingFieldKey(null);
                    }}
                    onDragEnd={() => setDraggingFieldKey(null)}
                  >
                    <div className="task-form-builder-field-header">
                      <Space size={8}>
                        <DragOutlined className="task-form-drag-icon" />
                        <Text strong>
                          {field.required ? "* " : ""}
                          {field.label || toLabel(field.key)}
                        </Text>
                      </Space>
                      <div className="task-form-builder-row-actions">
                        <Switch
                          size="small"
                          checked={Boolean(field.required)}
                          onChange={(checked) => handleRequiredToggle(field.key, checked)}
                        />
                        <Tooltip title={field.isDefault ? "Default fields cannot be edited." : "Edit field"}>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            disabled={Boolean(field.isDefault)}
                            onClick={() => openEditFieldModal(field)}
                          />
                        </Tooltip>
                        <Tooltip title={field.isDefault ? "Default fields cannot be deleted." : "Delete field"}>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={Boolean(field.isDefault)}
                            onClick={() => removeField(field.key)}
                          />
                        </Tooltip>
                      </div>
                    </div>
                    <Form.Item className="task-form-builder-field-input">
                      {renderFieldPreviewInput(field)}
                    </Form.Item>
                    <Space size={8}>
                      <Tag>{field.type}</Tag>
                      {(field.type === "select" || field.type === "multiselect") && field.optionSource === "linked" ? (
                        <Tag color="purple">Linked: {field.linkedModule || "module"}</Tag>
                      ) : null}
                      {field.isDefault ? <Tag color="blue">Default</Tag> : null}
                    </Space>
                  </div>
                </Col>
              ))}
            </Row>
          </Form>
        </div>
      </Card>

      <Modal
        title={editingFieldKey ? "Edit Field" : "Add Field"}
        open={fieldModalOpen}
        onCancel={closeFieldModal}
        onOk={handleAddOrEditField}
        okText={editingFieldKey ? "Update Field" : "Add Field"}
      >
        <Form form={addFieldForm} layout="vertical" initialValues={{ type: "text", required: false, optionSource: "static" }}>
          <Form.Item
            label="Name / Label"
            name="label"
            rules={[{ required: true, message: "Please enter field name." }]}
          >
            <Input placeholder="e.g. Client Approval" />
          </Form.Item>
          <Form.Item label="Key (Auto Generated)">
            <Input value={editingFieldKey || addFieldKey} disabled placeholder="auto_generated_key" />
          </Form.Item>
          <Form.Item
            label="Type"
            name="type"
            rules={[{ required: true, message: "Please select field type." }]}
          >
            <Select options={FIELD_TYPE_OPTIONS} />
          </Form.Item>
          {(addFieldType === "select" || addFieldType === "multiselect") && (
            <>
              <Form.Item
                label="Value Source"
                name="optionSource"
                rules={[{ required: true, message: "Please select value source." }]}
              >
                <Select options={FIELD_OPTION_SOURCE_OPTIONS} />
              </Form.Item>
              {addFieldOptionSource === "linked" ? (
                <Form.Item
                  label="Link Up Module"
                  name="linkedModule"
                  rules={[{ required: true, message: "Please select a module to link up." }]}
                >
                  <Select options={LINKED_MODULE_OPTIONS} placeholder="Select module" />
                </Form.Item>
              ) : (
                <Form.Item
                  label="Options"
                  name="options"
                  rules={[{ required: true, message: "Please add options for select field." }]}
                >
                  <Input placeholder="Option A, Option B, Option C" />
                </Form.Item>
              )}
            </>
          )}
          <Form.Item name="required" valuePropName="checked">
            <Checkbox>Required</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskFormBuilder;
