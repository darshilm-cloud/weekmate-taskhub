import React from "react";
import { Button, Col, Form, Modal, Row } from "antd";
import {
  ExclamationCircleOutlined,
  FileTextOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import moment from "moment";
import ComplaintsForm from "./ComplaintsForm";
import ComplaintDetailsForm from "./ComplaintDetailsForm";

const formatStatus = (s = "") =>
  s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const statusClass = (s = "") => {
  const key = s.toLowerCase().replace(/\s+/g, "-");
  if (key.includes("progress")) return "in-progress";
  if (key.includes("resolv")) return "resolved";
  if (key.includes("pending")) return "pending";
  if (key.includes("closed")) return "closed";
  if (key.includes("open")) return "open";
  return "default";
};

const priorityClass = (p = "") => {
  const key = p.toLowerCase();
  if (key === "high") return "high";
  if (key === "medium") return "medium";
  if (key === "low") return "low";
  return "default";
};

/**
 * Single modal for Complaints: view summary, add, edit, and action-details (status/comments).
 * Parent controls open + mode; no route navigation required from the list page.
 */
const ComplaintsUnifiedModal = ({
  open,
  mode,
  record,
  complaintId,
  userHasAccess,
  onClose,
  onSuccess,
  onNavigate,
}) => {
  const resolvedId = complaintId || record?._id || null;

  const titleNode = () => {
    if (mode === "view") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ExclamationCircleOutlined style={{ color: "#dc2626" }} />
          <span>Complaint Detail</span>
        </div>
      );
    }
    if (mode === "add") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PlusOutlined style={{ color: "#1890ff" }} />
          <span>Add Complaint</span>
        </div>
      );
    }
    if (mode === "edit") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <EditOutlined style={{ color: "#1890ff" }} />
          <span>Edit Complaint</span>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <FileTextOutlined style={{ color: "#1890ff" }} />
        <span>Complaint Actions</span>
      </div>
    );
  };

  const width =
    mode === "actions" ? 960 : mode === "view" ? 760 : 820;

  return (
<Modal
  title={titleNode()}
  open={open}
  onCancel={onClose}
  destroyOnClose
  width={width}
  className="cmp-unified-modal"
  footer={
    mode === "view" && userHasAccess
      ? [
          <Button
            key="actions"
            className="btn-secondary"
            onClick={() => onNavigate?.("actions", resolvedId)}
          >
            <FileTextOutlined /> Actions
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => onNavigate?.("edit", resolvedId)}
          >
            <EditOutlined /> Edit
          </Button>,
        ]
      : null
  }
>
  {mode === "view" && record && (
    <Form layout="vertical">
      <Row gutter={[16, 16]}>

        <Col xs={24} sm={12}>
          <Form.Item label="Project">
            {record.project?.title || "—"}
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label="Client">
            {record.client_name || "—"}
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label="Account Manager">
            {record.acc_manager?.full_name || "—"}
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label="Project Manager">
            {record.manager?.full_name || "—"}
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label="Status">
            {record.status ? (
              <span className={`cmp-status-badge ${statusClass(record.status)}`}>
                {formatStatus(record.status)}
              </span>
            ) : "—"}
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label="Priority">
            {record.priority
              ? record.priority.charAt(0).toUpperCase() + record.priority.slice(1)
              : "—"}
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label="Date">
            {record.createdAt
              ? moment(record.createdAt).format("DD-MM-YYYY")
              : "—"}
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item label="Created By">
            {record.createdBy?.full_name || "—"}
          </Form.Item>
        </Col>

      </Row>

      {record.complaint && (
        <Row>
          <Col span={24}>
            <Form.Item label="Complaint">
              <div
                dangerouslySetInnerHTML={{ __html: record.complaint }}
              />
            </Form.Item>
          </Col>
        </Row>
      )}
    </Form>
  )}

  {(mode === "add" || mode === "edit") && (
    <div>
      <ComplaintsForm
        key={`complaint-form-${mode}-${resolvedId || "new"}`}
        embedded
        complaintId={mode === "edit" ? resolvedId : undefined}
        onSuccess={() => {
          onSuccess?.();
          onClose();
        }}
        onCancel={onClose}
      />
    </div>
  )}

  {mode === "actions" && resolvedId && (
    <ComplaintDetailsForm
      key={`complaint-actions-${resolvedId}`}
      embedded
      complaintId={resolvedId}
    />
  )}
</Modal>
  );
};

export default ComplaintsUnifiedModal;
