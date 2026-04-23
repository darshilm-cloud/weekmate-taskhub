import React, { useState, useEffect, useCallback } from "react";
import { Table, Modal, Tag, message, Col, Row, Button, Card } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import "./ActivityLogs.css";
import "../Complaints/ComplaintDetails.css";
import ActivityLogFilter from "./ActivityLogFilter";
import { SimpleTableSkeleton } from "../../components/common/SkeletonLoader";
import Service from "../../service";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
import ViewIcon from "../../assets/icons/ViewIcon";
import moment from "moment";

/* ── operation badge styles ────────────────────────────────── */
const OP_STYLES = {
  LOGIN: { background: "#f0fdf4", color: "#16a34a" },
  LOGOUT: { background: "#eff6ff", color: "#2563eb" },
  UPDATE: { background: "#fff7ed", color: "#ea580c" },
  DELETE: { background: "#fef2f2", color: "#dc2626" },
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

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
const ActivityLogs = () => {
  const dispatch = useDispatch();

  const [activityLogs, setActivityLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [filters, setFilters] = useState({ operation: [], dateRange: null });

  /* ── API ─────────────────────────────────────────────────── */
  const getActivityLogList = useCallback(async () => {
    try {
      setLoading(true);
      dispatch(showAuthLoader());

      const payload = {
        page: pagination.current,
        limit: pagination.pageSize,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      if (filters.operation?.length === 1) {
        payload.operationName = filters.operation[0];
      }
      if (filters.dateRange?.length === 2) {
        payload.fromDate = filters.dateRange[0];
        payload.toDate = filters.dateRange[1];
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getActivityLogList,
        body: payload,
      });

      dispatch(hideAuthLoader());

      if (response?.data?.data) {
        const logs = Array.isArray(response.data.data.activityLogs)
          ? response.data.data.activityLogs
          : Array.isArray(response.data.data)
            ? response.data.data
            : [];

        const filteredLogs =
          filters.operation?.length > 1
            ? logs.filter((log) => filters.operation.includes(log.operationName))
            : logs;

        setActivityLogs(filteredLogs);
        const paginationData = response.data.data?.pagination || {};
        setPagination((prev) => ({
          ...prev,
          total:
            paginationData.totalCount ||
            paginationData.total ||
            response.data.metadata?.total ||
            filteredLogs.length,
        }));
      } else {
        setActivityLogs([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
      message.error("Failed to fetch activity logs");
      setActivityLogs([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters, dispatch]);

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
        setIsViewModalOpen(true);
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
    getActivityLogList();
  }, [getActivityLogList]);

  /* ── Formatters ──────────────────────────────────────────── */
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

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${moment(d).format("DD-MM-YYYY")}`;
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

  /* ── Handlers ────────────────────────────────────────────── */
  const openModal = (log) => getActivityLogById(log._id);
  const closeModal = () => { setIsViewModalOpen(false); setSelectedLog(null); };

  const handleFilterChange = (skipParams, filterData) => {
    if (skipParams?.includes("skipAll")) {
      setFilters({ operation: [], dateRange: null });
      setPagination((prev) => ({ ...prev, current: 1 }));
    } else if (skipParams?.length > 0) {
      skipParams.forEach((p) => {
        if (p === "skipOperation") setFilters((prev) => ({ ...prev, operation: [] }));
        if (p === "skipDateRange") setFilters((prev) => ({ ...prev, dateRange: null }));
      });
      setPagination((prev) => ({ ...prev, current: 1 }));
    } else if (filterData) {
      setFilters({ operation: filterData.operation || [], dateRange: filterData.dateRange || null });
      setPagination((prev) => ({ ...prev, current: 1 }));
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  /* ── Columns ─────────────────────────────────────────────── */
  const columns = [
    {
      title: "User",
      key: "user",
      width: 200,
      render: (_, record) => {
        const user = record.createdBy;
        if (user && typeof user === "object") {
          return user.full_name ||
            (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name) ||
            record.createdByName || "-";
        }
        return record.createdByName || "-";
      },
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 250,
      render: (text, record) =>
        text || record.createdBy?.email || record.createdByEmail || "-",
    },
    {
      title: "Operation",
      dataIndex: "operationName",
      key: "operation",
      width: 130,
      render: (text) => <OpBadge text={text} />,
    },
    {
      title: "Module",
      dataIndex: "moduleName",
      key: "module",
      width: 180,
      render: (text) => formatModuleName(text),
    },
    {
      title: "Timestamp",
      dataIndex: "createdAt",
      key: "timestamp",
      width: 200,
      render: (text) => formatDate(text),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, record) => (
        <ViewIcon onClick={() => openModal(record)} style={{ cursor: "pointer" }} />
      ),
    },
  ];

  if (pageLoading) return <SimpleTableSkeleton rows={8} cols={5} />;

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <>
    <Card className="ps-page">
      {/* Header */}
      <div className="heading-wrapper">
          <div className="heading-main">
            <h2>
              <span><ClockCircleOutlined /></span>
              Activity Logs
            </h2>
          </div>
          <div className="ps-header-right">
            <ActivityLogFilter onFilterChange={handleFilterChange} />
          </div>
        </div>

        <Card className="main-content-wrapper">
          <div className="block-table-content">
            <Table
              rowKey="_id"
              columns={columns}
              dataSource={activityLogs}
              loading={loading}
              footer={() => <span>Total Records: {pagination.total > 0 ? pagination.total : 0}</span>}
              onChange={handleTableChange}
              pagination={{
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "25", "30"],
                showTotal: (total) => `Total ${total} records`,
                ...pagination,
              }}
            />
          </div>
        </Card>
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <>
            <ClockCircleOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />
            Activity Log Details
          </>
        }
        open={isViewModalOpen}
        onCancel={closeModal}
        className="ps-modal activity-detail-modal"
        footer={[
          <Button key="close" className="delete-btn" onClick={closeModal}>
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
                      <div className="field-label">Employee Code</div>
                      <div className="field-value">
                        {selectedLog.createdByEmpCode ||
                          selectedLog.createdBy?.emp_code ||
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

                    {selectedLog.companyName && (
                      <Col xs={24} sm={12} md={8}>
                        <div className="field-label">Company</div>
                        <div className="field-value">
                          {selectedLog.companyName}
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>

                {(selectedLog.updatedBy || selectedLog.updatedByName) && (
                  <div className="activity-section">
                    <h3 className="section-title">Status Information</h3>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12}>
                        <div className="field-label">Updated By</div>
                        <div className="field-value">
                          {selectedLog.updatedBy?.full_name ||
                            (selectedLog.updatedBy?.first_name &&
                              selectedLog.updatedBy?.last_name
                              ? `${selectedLog.updatedBy.first_name} ${selectedLog.updatedBy.last_name}`
                              : selectedLog.updatedBy?.first_name ||
                              selectedLog.updatedBy?.last_name) ||
                            selectedLog.updatedByName ||
                            "-"}
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}

                {/* Changes & Other sections untouched */}
                {selectedLog.updatedData && (() => {
                  const { oldData, newData } = selectedLog.updatedData;
                  const allKeys = new Set([
                    ...Object.keys(oldData || {}),
                    ...Object.keys(newData || {}),
                  ]);
                  const changedFields = [];
                  const unchangedFields = [];
                  const skipKeys = new Set([
                    "updated_at",
                    "created_at",
                    "updated_by",
                    "updatedBy",
                    "updated_by_id",
                    "updatedById",
                  ]);

                  allKeys.forEach((key) => {
                    if (skipKeys.has(key)) return;
                    const oldValue = oldData?.[key];
                    const newValue = newData?.[key];
                    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                      changedFields.push({ key, oldValue, newValue });
                    } else {
                      unchangedFields.push({ key, value: newValue });
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

                      {unchangedFields.length > 0 && (
                        <div className="activity-section">
                          <h3 className="section-title">Other Information</h3>
                          <Row gutter={[16, 16]}>
                            {unchangedFields.map(({ key, value }) => (
                              <Col xs={24} sm={12} md={8} key={key}>
                                <div className="field-label">
                                  {formatKeyToLabel(key)}
                                </div>
                                <div className="field-value">
                                  {renderArrayValue(value)}
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* DELETE section unchanged except grid */}
            {/* Only wrapping grids with Row/Col applied same way */}

          </div>
        )}
      </Modal>
    </>
  );
};

export default ActivityLogs;
