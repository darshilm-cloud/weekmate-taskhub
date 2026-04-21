import React from "react";
import { Modal } from "antd";
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
      footer={null}
      destroyOnClose
      width={width}
      className="cmp-unified-modal"
      bodyStyle={{ padding: 0, maxHeight: "calc(100vh - 120px)", overflow: "hidden" }}
    >
      {mode === "view" && record && (
        <div className="cmp-unified-modal-body cmp-unified-modal-body--view">
          {userHasAccess && (
            <div className="cmp-unified-modal-toolbar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onNavigate?.("actions", resolvedId)}
              >
                <FileTextOutlined /> Actions
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onNavigate?.("edit", resolvedId)}
              >
                <EditOutlined /> Edit
              </button>
            </div>
          )}
          <div className="cmp-drawer-section">
            <div className="cmp-drawer-fields">
              <div className="cmp-drawer-field">
                <div className="cmp-drawer-label">Project</div>
                <div className="cmp-drawer-value">{record.project?.title || "—"}</div>
              </div>
              <div className="cmp-drawer-field">
                <div className="cmp-drawer-label">Client</div>
                <div className="cmp-drawer-value">{record.client_name || "—"}</div>
              </div>
              <div className="cmp-drawer-field">
                <div className="cmp-drawer-label">Account Manager</div>
                <div className="cmp-drawer-value">{record.acc_manager?.full_name || "—"}</div>
              </div>
              <div className="cmp-drawer-field">
                <div className="cmp-drawer-label">Project Manager</div>
                <div className="cmp-drawer-value">{record.manager?.full_name || "—"}</div>
              </div>
              <div className="cmp-drawer-field">
                <div className="cmp-drawer-label">Status</div>
                <div className="cmp-drawer-value">
                  {record.status ? (
                    <span className={`cmp-status-badge ${statusClass(record.status)}`}>
                      {formatStatus(record.status)}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="cmp-drawer-field">
                <div className="cmp-drawer-label">Priority</div>
                <div className="cmp-drawer-value">
                  {record.priority ? (
                    <span className={`cmp-priority-badge ${priorityClass(record.priority)}`}>
                      {record.priority.charAt(0).toUpperCase() + record.priority.slice(1)}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="cmp-drawer-field">
                <div className="cmp-drawer-label">Date</div>
                <div className="cmp-drawer-value">
                  {record.createdAt ? moment(record.createdAt).format("DD-MM-YYYY") : "—"}
                </div>
              </div>
              <div className="cmp-drawer-field">
                <div className="cmp-drawer-label">Created By</div>
                <div className="cmp-drawer-value">{record.createdBy?.full_name || "—"}</div>
              </div>
            </div>
          </div>
          {record.complaint && (
            <div className="cmp-drawer-section">
              <div className="cmp-drawer-label" style={{ marginBottom: 10 }}>
                Complaint
              </div>
              <div
                className="cmp-complaint-content"
                dangerouslySetInnerHTML={{ __html: record.complaint }}
              />
            </div>
          )}
        </div>
      )}

      {(mode === "add" || mode === "edit") && (
        <div className="cmp-unified-modal-body cmp-unified-modal-body--form">
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
        <div className="cmp-unified-modal-body cmp-unified-modal-body--actions">
          <ComplaintDetailsForm key={`complaint-actions-${resolvedId}`} embedded complaintId={resolvedId} />
        </div>
      )}
    </Modal>
  );
};

export default ComplaintsUnifiedModal;
