import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Tag,
  message,
  Card,
  Tooltip,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DragOutlined,
  EditOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useHistory, useParams } from "react-router-dom/cjs/react-router-dom.min";
import Service from "../../service";
import "../../components/PMS/settings.css";
import "./WorkflowStagesEdit.css";

const DEFAULT_COLOR = "#64748b";

function WorkflowStagesEdit() {
  const { companySlug, workflowId } = useParams();
  const history = useHistory();

  const [workflowName, setWorkflowName] = useState("");
  const [editingWorkflowName, setEditingWorkflowName] = useState(false);
  const [workflowNameDraft, setWorkflowNameDraft] = useState("");
  const [savingWorkflowName, setSavingWorkflowName] = useState(false);

  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  /* inline edit state */
  const [editingStageId, setEditingStageId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: "", color: DEFAULT_COLOR });
  const [savingStageId, setSavingStageId] = useState(null);

  /* add-stage modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [form] = Form.useForm();

  /* drag-to-reorder */
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [reordering, setReordering] = useState(false);

  /* ── load workflow name ── */
  const loadWorkflowName = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getworkflow,
        body: { isDropdown: true, pageNo: 1, limit: 200 },
      });
      const list = Array.isArray(response?.data?.data) ? response.data.data : [];
      const wf = list.find((w) => String(w?._id) === String(workflowId));
      if (wf) {
        setWorkflowName(wf.project_workflow || "");
      }
    } catch {
      /* silent */
    }
  }, [workflowId]);

  /* ── load stages ── */
  const loadStages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getworkflowStatus}/${workflowId}`,
      });
      const list = Array.isArray(response?.data?.data) ? response.data.data : [];
      setStages(
        [...list].sort((a, b) => Number(a?.sequence ?? 0) - Number(b?.sequence ?? 0))
      );
    } catch {
      message.error("Failed to load stages");
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    loadWorkflowName();
    loadStages();
  }, [loadWorkflowName, loadStages]);

  /* ── save workflow name ── */
  const saveWorkflowName = async () => {
    const trimmed = workflowNameDraft.trim();
    if (!trimmed) return;
    setSavingWorkflowName(true);
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.updateWorkflow,
        body: {
          projectWorkFlowId: workflowId,
          project_workflow: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
        },
      });
      if (response?.data?.status) {
        setWorkflowName(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
        setEditingWorkflowName(false);
        message.success("Workflow name updated");
      } else {
        message.error(response?.data?.message || "Failed to update name");
      }
    } catch {
      message.error("Failed to update workflow name");
    } finally {
      setSavingWorkflowName(false);
    }
  };

  /* ── add stage ── */
  const addStage = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addworkflowStatus,
        body: {
          workflow_id: workflowId,
          title: String(values.title || "").trim(),
          color: values.color || DEFAULT_COLOR,
        },
      });
      if (response?.data?.status) {
        message.success(response?.data?.message || "Stage added");
        setModalOpen(false);
        form.resetFields();
        loadStages();
      } else {
        message.error(response?.data?.message || "Failed to add stage");
      }
    } catch (err) {
      if (err?.errorFields) return;
      message.error("Failed to add stage");
    } finally {
      setModalSubmitting(false);
    }
  };

  /* ── save inline stage edit ── */
  const saveStageEdit = async (stage) => {
    const trimmed = editDraft.title.trim();
    if (!trimmed) { message.error("Stage name is required"); return; }
    setSavingStageId(stage._id);
    try {
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateworkflowStatus}/${stage._id}`,
        body: {
          workflow_id: workflowId,
          title: trimmed,
          color: editDraft.color || DEFAULT_COLOR,
        },
      });
      if (response?.data?.status) {
        message.success("Stage updated");
        setEditingStageId(null);
        loadStages();
      } else {
        message.error(response?.data?.message || "Failed to update stage");
      }
    } catch {
      message.error("Failed to update stage");
    } finally {
      setSavingStageId(null);
    }
  };

  /* ── delete stage ── */
  const deleteStage = async (stage) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteworkflowStatus}/${stage._id}`,
      });
      if (response?.data?.status) {
        message.success(response?.data?.message || "Stage deleted");
        loadStages();
      } else {
        message.error(response?.data?.message || "Failed to delete stage");
      }
    } catch {
      message.error("Failed to delete stage");
    }
  };

  /* ── drag-to-reorder handlers ── */
  const handleDragStart = (index) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    setDragOverIndex(null);
    if (dragIndex === null || dragIndex === dropIndex) return;

    const next = [...stages];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    setStages(next);

    setReordering(true);
    try {
      await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.reorderWorkflowStatus,
        body: {
          workflow_id: workflowId,
          ordered_stage_ids: next.map((s) => s._id),
        },
      });
    } catch {
      message.error("Failed to save stage order");
      loadStages();
    } finally {
      setReordering(false);
    }
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  /* ── skeleton ── */
  const SkeletonList = () => (
    <div className="wse-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="wse-skeleton-row" key={i}>
          <div className="ps-shimmer" style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0 }} />
          <div className="ps-shimmer" style={{ flex: 1, height: 13, borderRadius: 4 }} />
          <div className="ps-shimmer" style={{ width: 60, height: 28, borderRadius: 6 }} />
          <div className="ps-shimmer" style={{ width: 60, height: 28, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );

  return (
    <Card className="ps-page">
      {/* ── header ── */}
      <div className="heading-wrapper">
        <div className="heading-main" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push(`/${companySlug}/workflows`)}
            className="wse-back-btn"
          />
          <NodeIndexOutlined style={{ fontSize: 20, color: "#0b3a5b" }} />
          {editingWorkflowName ? (
            <Space>
              <Input
                value={workflowNameDraft}
                onChange={(e) => setWorkflowNameDraft(e.target.value)}
                onPressEnter={saveWorkflowName}
                autoFocus
                style={{ width: 220 }}
                maxLength={80}
              />
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                loading={savingWorkflowName}
                onClick={saveWorkflowName}
                className="add-btn"
              >
                Save
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setEditingWorkflowName(false)}
                className="delete-btn"
              />
            </Space>
          ) : (
            <Space align="center">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#0b3a5b" }}>
                {workflowName || "Workflow"}
              </h2>
              <Tooltip title="Rename workflow">
                <EditOutlined
                  style={{ cursor: "pointer", color: "#6b7280", fontSize: 14 }}
                  onClick={() => {
                    setWorkflowNameDraft(workflowName);
                    setEditingWorkflowName(true);
                  }}
                />
              </Tooltip>
            </Space>
          )}
        </div>
        <div className="ps-header-right">
          <Button
            type="primary"
            className="add-btn"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setModalOpen(true);
            }}
          >
            Add Stage
          </Button>
        </div>
      </div>

      {/* ── stages list ── */}
      <Card className="main-content-wrapper">
        {loading ? (
          <SkeletonList />
        ) : stages.length === 0 ? (
          <div className="wse-empty">
            <NodeIndexOutlined style={{ fontSize: 32, color: "#d1d5db", marginBottom: 8 }} />
            <p style={{ color: "#9ca3af", margin: 0 }}>No stages yet. Add the first one.</p>
          </div>
        ) : (
          <div className={`wse-stage-list${reordering ? " wse-reordering" : ""}`}>
            <div className="wse-stage-list-header">
              <span />
              <span>Stage Name</span>
              <span>Color</span>
              <span>Type</span>
              <span>Actions</span>
            </div>

            {stages.map((stage, index) => {
              const isEditing = editingStageId === stage._id;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={stage._id}
                  className={`wse-stage-row${isDragOver ? " wse-drag-over" : ""}`}
                  draggable={!isEditing}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  {/* drag handle */}
                  <span className="wse-drag-handle">
                    <DragOutlined style={{ color: "#9ca3af", cursor: "grab" }} />
                  </span>

                  {/* name / edit input */}
                  {isEditing ? (
                    <Input
                      value={editDraft.title}
                      onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                      onPressEnter={() => saveStageEdit(stage)}
                      autoFocus
                      style={{ flex: 1 }}
                      maxLength={60}
                    />
                  ) : (
                    <span className="wse-stage-name">{stage.title || "—"}</span>
                  )}

                  {/* color */}
                  {isEditing ? (
                    <input
                      type="color"
                      value={editDraft.color || DEFAULT_COLOR}
                      onChange={(e) => setEditDraft((d) => ({ ...d, color: e.target.value }))}
                      className="wse-color-input"
                    />
                  ) : (
                    <span className="wse-color-dot-wrap">
                      <span
                        className="wse-color-dot"
                        style={{ backgroundColor: stage.color || DEFAULT_COLOR }}
                      />
                      <span className="wse-color-hex">{stage.color || DEFAULT_COLOR}</span>
                    </span>
                  )}

                  {/* type badge */}
                  <span>
                    {stage.isDefault ? (
                      <Tag color="blue">Default</Tag>
                    ) : (
                      <Tag>Custom</Tag>
                    )}
                  </span>

                  {/* actions */}
                  <Space>
                    {isEditing ? (
                      <>
                        <Button
                          type="primary"
                          size="small"
                          icon={<SaveOutlined />}
                          loading={savingStageId === stage._id}
                          onClick={() => saveStageEdit(stage)}
                          className="add-btn"
                        >
                          Save
                        </Button>
                        <Button
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => setEditingStageId(null)}
                          className="delete-btn"
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditDraft({ title: stage.title || "", color: stage.color || DEFAULT_COLOR });
                            setEditingStageId(stage._id);
                          }}
                        />
                        <Popconfirm
                          title="Delete this stage?"
                          okText="Yes"
                          cancelText="No"
                          disabled={stage.isDefault}
                          onConfirm={() => deleteStage(stage)}
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={stage.isDefault}
                          />
                        </Popconfirm>
                      </>
                    )}
                  </Space>
                </div>
              );
            })}
          </div>
        )}
        <div className="wse-hint">
          <DragOutlined style={{ marginRight: 6, color: "#9ca3af" }} />
          Drag rows to reorder stages. Default stages cannot be deleted.
        </div>
      </Card>

      {/* ── add stage modal ── */}
      <Modal
        open={modalOpen}
        title={
          <>
            <NodeIndexOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />
            Add Stage
          </>
        }
        className="ps-modal"
        width="100%"
        style={{ maxWidth: 480 }}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={[
          <Button key="cancel" className="delete-btn" onClick={() => { setModalOpen(false); form.resetFields(); }}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            className="add-btn"
            loading={modalSubmitting}
            onClick={addStage}
          >
            Save
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" initialValues={{ color: DEFAULT_COLOR }}>
          <Row gutter={[24, 0]}>
            <Col xs={24}>
              <Form.Item
                name="title"
                label="Stage Name"
                rules={[{ required: true, whitespace: true, message: "Please enter stage name" }]}
              >
                <Input placeholder="e.g. In Review" maxLength={60} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                name="color"
                label="Color"
                rules={[{ required: true, message: "Please choose a color" }]}
              >
                <Input type="color" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}

export default WorkflowStagesEdit;
