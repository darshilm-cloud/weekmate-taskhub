import React from "react";
import { Button, Col, Form, Modal, Row } from "antd";
import {
  ExclamationCircleOutlined,
  FileTextOutlined,
  EditOutlined,
  PlusOutlined,
  MessageOutlined,
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
  if (key === "critical" || key === "high") return "high";
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
  const [form] = Form.useForm();

  const titleNode = () => {
    let icon, title, iconColor;
    if (mode === "view") {
      icon = <ExclamationCircleOutlined />;
      title = "Complaint Detail";
      iconColor = "#dc2626";
    } else if (mode === "add") {
      icon = <PlusOutlined />;
      title = "Add Complaint";
      iconColor = "#1890ff";
    } else if (mode === "edit") {
      icon = <EditOutlined />;
      title = "Edit Complaint";
      iconColor = "#1890ff";
    } else {
      icon = <FileTextOutlined />;
      title = "Complaint Actions";
      iconColor = "#1890ff";
    }

    return (
      <>
        {icon}
        <span style={{ marginLeft: 8 }}>{title}</span>
      </>
    );
  };

  const width = mode === "actions" ? 800 : 640;

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
                className="delete-btn"
                onClick={() => onNavigate?.("actions", resolvedId)}
              >
                <FileTextOutlined /> Actions
              </Button>,
              <Button
                key="edit"
                type="primary"
                className="add-btn"
                onClick={() => onNavigate?.("edit", resolvedId)}
              >
                <EditOutlined /> Edit
              </Button>,
            ]
          : (mode === "add" || mode === "edit")
          ? [
              <Button
                key="cancel"
                className="delete-btn"
                onClick={onClose}
              >
                Cancel
              </Button>,
              <Button
                key="submit"
                type="primary"
                className="add-btn"
                onClick={() => form.submit()}
              >
                {mode === "edit" ? "Update" : "Submit"}
              </Button>,
            ]
          : [
              <Button
                key="close"
                className="delete-btn"
                onClick={onClose}
              >
                Close
              </Button>,
            ]
      }
    >
      {mode === "view" && record && (
        <div className="cmp-unified-modal-body cmp-unified-modal-body--view">
          <div className="cmp-view-grid">
            <div className="cmp-view-field">
              <label>Project</label>
              <div className="value">{record.project?.title || "—"}</div>
            </div>
            <div className="cmp-view-field">
              <label>Client</label>
              <div className="value">{record.client_name || "—"}</div>
            </div>
            <div className="cmp-view-field">
              <label>Account Manager</label>
              <div className="value">{record.acc_manager?.full_name || "—"}</div>
            </div>
            <div className="cmp-view-field">
              <label>Project Manager</label>
              <div className="value">{record.manager?.full_name || "—"}</div>
            </div>
            <div className="cmp-view-field">
              <label>Status</label>
              <div className="value">
                {record.status ? (
                  <span className={`cmp-status-badge ${statusClass(record.status)}`}>
                    {formatStatus(record.status)}
                  </span>
                ) : "—"}
              </div>
            </div>
            <div className="cmp-view-field">
              <label>Priority</label>
              <div className="value">
                {record.priority ? (
                  <span className={`cmp-priority-badge ${priorityClass(record.priority)}`}>
                    {record.priority.toUpperCase()}
                  </span>
                ) : "—"}
              </div>
            </div>
            <div className="cmp-view-field">
              <label>Date Created</label>
              <div className="value">
                {record.createdAt ? moment(record.createdAt).format("DD-MM-YYYY") : "—"}
              </div>
            </div>
            <div className="cmp-view-field">
              <label>Created By</label>
              <div className="value">{record.createdBy?.full_name || "—"}</div>
            </div>

            {record.complaint && (
              <div className="cmp-view-section full-width">
                <label>Complaint Description</label>
                <div className="cmp-view-description">
                  <div dangerouslySetInnerHTML={{ __html: record.complaint }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}


  {(mode === "add" || mode === "edit") && (
    <div>
      <ComplaintsForm
        key={`complaint-form-${mode}-${resolvedId || "new"}`}
        embedded
        externalForm={form}
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
