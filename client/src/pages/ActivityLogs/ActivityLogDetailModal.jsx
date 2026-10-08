import React, { useState, useEffect, useCallback } from "react";
import { Modal, Row, Col, Button, message } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import moment from "moment";
import Service from "../../service";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
import "./ActivityLogs.css";

/* ── operation badge styles ────────────────────────────────── */
const OP_STYLES = {
  LOGIN:     { background: "#f0fdf4", color: "#16a34a" },
  LOGOUT:    { background: "#eff6ff", color: "#2563eb" },
  UPDATE:    { background: "#fff7ed", color: "#ea580c" },
  DELETE:    { background: "#fef2f2", color: "#dc2626" },
  CREATE:    { background: "#f0fdf4", color: "#15803d" },
  ARCHIVE:   { background: "#faf5ff", color: "#7c3aed" },
  UNARCHIVE: { background: "#ecfeff", color: "#0891b2" },
};

const OpBadge = ({ text }) => (
  <span
    style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
      ...(OP_STYLES[text] || { background: "#f1f5f9", color: "#64748b" }),
    }}
  >
    {text || "-"}
  </span>
);

const formatModuleName = (text) => {
  if (!text) return "-";
  return text
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const formatKeyToLabel = (key) => {
  if (!key) return "";
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const stripHtml = (html) => {
  if (typeof html !== "string") return html;
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return moment(dateString).format("DD-MM-YYYY");
};

const formatValue = (value) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) return formatDate(value);
  if (typeof value === "string") return stripHtml(value);
  return String(value);
};

const renderArrayValue = (value) => {
  if (!Array.isArray(value)) return formatValue(value);
  if (value.length === 0) return "-";
  return (
    <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
      {value.map((val, idx) => {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          return (
            <li key={idx}>
              {Object.keys(val).filter((k) => k !== "_id").map((objKey) => {
                let objValue = val[objKey];
                if (typeof objValue === "string") objValue = stripHtml(objValue);
                else if (objValue === null || objValue === undefined) objValue = "-";
                else if (typeof objValue === "boolean") objValue = objValue ? "Yes" : "No";
                else objValue = String(objValue);
                return (
                  <div key={objKey} style={{ marginLeft: 10 }}>
                    <strong>{formatKeyToLabel(objKey)}:</strong> {objValue}
                  </div>
                );
              })}
            </li>
          );
        }
        return (
          <li key={idx}>
            {typeof val === "string"
              ? stripHtml(val)
              : val === null || val === undefined
                ? "-"
                : typeof val === "boolean"
                  ? val ? "Yes" : "No"
                  : String(val)}
          </li>
        );
      })}
    </ul>
  );
};

/**
 * The same "Activity Log Details" modal used on the ActivityLogs admin page,
 * extracted so it can also be opened from the dashboard's Activity widget
 * without duplicating ~450 lines of per-operation-type rendering.
 */
const ActivityLogDetailModal = ({ logId, open, onClose }) => {
  const dispatch = useDispatch();
  const [selectedLog, setSelectedLog] = useState(null);

  const getActivityLogById = useCallback(async (id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getActivityLogById}/${id}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        setSelectedLog(response.data.data);
      } else {
        message.error("Failed to fetch activity log details");
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
      message.error("Failed to fetch activity log details");
    }
  }, [dispatch]);

  useEffect(() => {
    if (open && logId) {
      getActivityLogById(logId);
    }
    if (!open) {
      setSelectedLog(null);
    }
  }, [open, logId, getActivityLogById]);

  return (
    <Modal
      title={
        <>
          <ClockCircleOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />
          Activity Log Details
        </>
      }
      open={open}
      onCancel={onClose}
      className="ps-modal activity-detail-modal"
      footer={[
        <Button key="close" className="delete-btn" onClick={onClose}>
          Close
        </Button>
      ]}
      width="100%"
      style={{ maxWidth: 800 }}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto", padding: "24px" } }}
    >
      {selectedLog && (
        <div className="activity-modal">

          {/* LOGIN / LOGOUT */}
          {(selectedLog.operationName === "LOGIN" ||
            selectedLog.operationName === "LOGOUT") && (
              <div className="activity-section">
                <h3 className="section-title">Basic Information</h3>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">User</div>
                    <div className="field-value">
                      {selectedLog.createdBy?.full_name ||
                        selectedLog.createdBy?.emp_name ||
                        selectedLog.createdByName ||
                        "-"}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Email</div>
                    <div className="field-value">
                      {selectedLog.email ||
                        selectedLog.createdBy?.email ||
                        selectedLog.createdByEmail ||
                        "-"}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Operation</div>
                    <OpBadge text={selectedLog.operationName} />
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Module</div>
                    <div className="field-value">
                      {formatModuleName(selectedLog.moduleName)}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Timestamp</div>
                    <div className="field-value">
                      {moment(selectedLog.createdAt).format("DD-MM-YYYY")}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">IP Address</div>
                    <div className="field-value">
                      {selectedLog.ipAddress || "-"}
                    </div>
                  </Col>
                </Row>
              </div>
            )}

          {/* CREATE */}
          {selectedLog.operationName === "CREATE" && (
            <div className="activity-section">
              <h3 className="section-title">Basic Information</h3>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">User</div>
                  <div className="field-value">
                    {selectedLog.createdBy?.full_name ||
                      selectedLog.createdBy?.emp_name ||
                      selectedLog.createdByName ||
                      "-"}
                  </div>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">Email</div>
                  <div className="field-value">
                    {selectedLog.email ||
                      selectedLog.createdBy?.email ||
                      "-"}
                  </div>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">Operation</div>
                  <OpBadge text="CREATE" />
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">Module</div>
                  <div className="field-value">
                    {formatModuleName(selectedLog.moduleName)}
                  </div>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">Timestamp</div>
                  <div className="field-value">
                    {moment(selectedLog.createdAt).format("DD-MM-YYYY")}
                  </div>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">IP Address</div>
                  <div className="field-value">
                    {selectedLog.ipAddress || "-"}
                  </div>
                </Col>

                {selectedLog.additionalData?.projectTitle && (
                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Project</div>
                    <div className="field-value">
                      {selectedLog.additionalData.projectTitle}
                    </div>
                  </Col>
                )}

                {selectedLog.additionalData?.workflowName && (
                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Workflow</div>
                    <div className="field-value">
                      {selectedLog.additionalData.workflowName}
                    </div>
                  </Col>
                )}

                {selectedLog.additionalData?.recordName && (
                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Record</div>
                    <div className="field-value">
                      {selectedLog.additionalData.recordName}
                    </div>
                  </Col>
                )}
              </Row>
            </div>
          )}

          {/* UPDATE */}
          {selectedLog.operationName === "UPDATE" && (
            <>
              <div className="activity-section">
                <h3 className="section-title">Basic Information</h3>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">User</div>
                    <div className="field-value">
                      {selectedLog.createdByName ||
                        selectedLog.createdBy?.full_name ||
                        selectedLog.createdBy?.emp_name ||
                        "-"}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Email</div>
                    <div className="field-value">
                      {selectedLog.createdByEmail ||
                        selectedLog.email ||
                        selectedLog.createdBy?.email ||
                        "-"}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Operation</div>
                    <OpBadge text="UPDATE" />
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Module</div>
                    <div className="field-value">
                      {formatModuleName(selectedLog.moduleName)}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Timestamp</div>
                    <div className="field-value">
                      {moment(selectedLog.createdAt).format("DD-MM-YYYY")}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">IP Address</div>
                    <div className="field-value">
                      {selectedLog.ipAddress || "-"}
                    </div>
                  </Col>

                  {selectedLog.additionalData?.recordName && (
                    <Col xs={24} sm={12} md={8}>
                      <div className="field-label">Updated Record</div>
                      <div className="field-value">
                        {selectedLog.additionalData.recordName}
                      </div>
                    </Col>
                  )}
                </Row>
              </div>

              {/* Changes & Other sections */}
              {selectedLog.updatedData && (() => {
                const { oldData, newData } = selectedLog.updatedData;
                const allKeys = new Set([
                  ...Object.keys(oldData || {}),
                  ...Object.keys(newData || {}),
                ]);
                const changedFields = [];

                const skipKeys = new Set([
                  // mongoose internals
                  "_id", "__v",
                  // company / tenant
                  "companyId", "company_id",
                  // soft-delete internals
                  "isDeleted", "is_deleted", "deletedAt", "deleted_at", "deletedBy", "deleted_by",
                  // timestamps
                  "createdAt", "created_at", "updatedAt", "updated_at",
                  // author fields (shown separately above)
                  "createdBy", "created_by", "updatedBy", "updated_by",
                  "updated_by_id", "updatedById", "created_by_id", "createdById",
                  // verbose history arrays
                  "task_status_history", "loginActivity",
                ]);

                const isObjectId = (v) =>
                  typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

                const isSkippableValue = (v) => {
                  if (isObjectId(v)) return true;
                  if (Array.isArray(v) && v.length > 0 && v.every((i) => isObjectId(i))) return true;
                  return false;
                };

                allKeys.forEach((key) => {
                  if (skipKeys.has(key)) return;
                  const oldValue = oldData?.[key];
                  const newValue = newData?.[key];
                  // skip fields whose both values are raw ObjectIds (unresolved references)
                  if (isSkippableValue(oldValue) && isSkippableValue(newValue)) return;
                  if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                    changedFields.push({ key, oldValue, newValue });
                  }
                });

                return (
                  <>
                    {changedFields.length > 0 && (
                      <div className="activity-section">
                        <h3 className="section-title">Changes</h3>
                        <div className="changes-box">
                          <div className="changes-header">
                            <div className="col">Previous Values</div>
                            <div className="spacer-50" />
                            <div className="col">Current Values</div>
                          </div>

                          {changedFields.map(({ key, oldValue, newValue }) => (
                            <div key={key} className="change-row">
                              <div className="change-col">
                                <div className="change-subtitle">
                                  {formatKeyToLabel(key)}
                                </div>
                                <div className="prev-value">
                                  {renderArrayValue(oldValue)}
                                </div>
                              </div>

                              <div className="change-arrow">→</div>

                              <div className="change-col">
                                <div className="change-subtitle">
                                  {formatKeyToLabel(key)}
                                </div>
                                <div className="curr-value">
                                  {renderArrayValue(newValue)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {/* ARCHIVE / UNARCHIVE */}
          {(selectedLog.operationName === "ARCHIVE" ||
            selectedLog.operationName === "UNARCHIVE") && (
            <div className="activity-section">
              <h3 className="section-title">Basic Information</h3>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">User</div>
                  <div className="field-value">
                    {selectedLog.createdBy?.full_name ||
                      selectedLog.createdBy?.emp_name ||
                      selectedLog.createdByName ||
                      "-"}
                  </div>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">Email</div>
                  <div className="field-value">
                    {selectedLog.email ||
                      selectedLog.createdBy?.email ||
                      "-"}
                  </div>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">Operation</div>
                  <OpBadge text={selectedLog.operationName} />
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">Module</div>
                  <div className="field-value">
                    {formatModuleName(selectedLog.moduleName)}
                  </div>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">Timestamp</div>
                  <div className="field-value">
                    {moment(selectedLog.createdAt).format("DD-MM-YYYY")}
                  </div>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <div className="field-label">IP Address</div>
                  <div className="field-value">
                    {selectedLog.ipAddress || "-"}
                  </div>
                </Col>

                {selectedLog.additionalData?.projectTitle && (
                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Project</div>
                    <div className="field-value">
                      {selectedLog.additionalData.projectTitle}
                    </div>
                  </Col>
                )}
              </Row>
            </div>
          )}

          {/* DELETE / default */}
          {selectedLog.operationName !== "LOGIN" &&
            selectedLog.operationName !== "LOGOUT" &&
            selectedLog.operationName !== "UPDATE" &&
            selectedLog.operationName !== "CREATE" &&
            selectedLog.operationName !== "ARCHIVE" &&
            selectedLog.operationName !== "UNARCHIVE" && (
              <div className="activity-section">
                <h3 className="section-title">Basic Information</h3>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">User</div>
                    <div className="field-value">
                      {selectedLog.createdBy?.full_name ||
                        selectedLog.createdBy?.emp_name ||
                        selectedLog.createdByName ||
                        "-"}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Email</div>
                    <div className="field-value">
                      {selectedLog.email ||
                        selectedLog.createdBy?.email ||
                        "-"}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Operation</div>
                    <OpBadge text={selectedLog.operationName} />
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Module</div>
                    <div className="field-value">
                      {formatModuleName(selectedLog.moduleName)}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">Timestamp</div>
                    <div className="field-value">
                      {moment(selectedLog.createdAt).format("DD-MM-YYYY")}
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div className="field-label">IP Address</div>
                    <div className="field-value">
                      {selectedLog.ipAddress || "-"}
                    </div>
                  </Col>
                </Row>
              </div>
            )}

        </div>
      )}
    </Modal>
  );
};

export default ActivityLogDetailModal;
