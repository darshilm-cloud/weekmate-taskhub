import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Table, Modal, Button, Tag, Card, message } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import "./ActivityLogs.css";
import ActivityLogFilter from "./ActivityLogFilter";
import moment from "moment";
import Service from "../../service";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";

const ActivityLogs = () => {
  const dispatch = useDispatch();
  const [activityLogs, setActivityLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    operation: [],
    dateRange: null,
  });

  // Get activity logs list
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

      // Add operation filter (API expects single operation)
      // If multiple operations selected, we'll filter client-side
      if (filters.operation && filters.operation.length === 1) {
        payload.operationName = filters.operation[0];
      }
      // If multiple operations selected, don't send operationName to API - filter client-side

      // Add date range filter
      if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange.length === 2) {
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
        
        // Filter by operation client-side if multiple operations are selected
        let filteredLogs = logs;
        if (filters.operation && filters.operation.length > 1) {
          filteredLogs = logs.filter((log) =>
            filters.operation.includes(log.operationName)
          );
        }
        
        setActivityLogs(filteredLogs);

        // Update pagination with total count
        const paginationData = response.data.data?.pagination || {};
        setPagination((prev) => ({
          ...prev,
          total: paginationData.totalCount || 
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
      console.error("Error fetching activity logs:", error);
      message.error("Failed to fetch activity logs");
      setActivityLogs([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters, dispatch]);

  // Get activity log details by ID
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
      console.error("Error fetching activity log details:", error);
      message.error("Failed to fetch activity log details");
    }
  }, [dispatch]);

  // Fetch activity logs when pagination or filters change
  useEffect(() => {
    getActivityLogList();
  }, [getActivityLogList]);

  const formatModuleName = (text) => {
    if (!text) return "-";
    let formatted = text.replace(/_/g, " ");
    formatted = formatted.replace(/([a-z])([A-Z])/g, "$1 $2");
    return formatted
      .split(" ")
      .map((word) => {
        if (!word) return "";
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .filter((word) => word.length > 0)
      .join(" ");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatKeyToLabel = (key) => {
    if (!key) return "";
    let formatted = String(key);
    formatted = formatted.replace(/_/g, " ");
    formatted = formatted.replace(/([a-z])([A-Z])/g, "$1 $2");
    return formatted
      .split(" ")
      .map((word) => {
        if (!word) return "";
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .filter((word) => word.length > 0)
      .join(" ");
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return formatDate(value);
    }
    return String(value);
  };

  const openModal = (log) => {
    getActivityLogById(log._id);
  };

  const closeModal = () => {
    setIsViewModalOpen(false);
    setSelectedLog(null);
  };

  const handleFilterChange = (skipParams, filterData) => {
    if (skipParams && skipParams.includes("skipAll")) {
      setFilters({
        operation: [],
        dateRange: null,
      });
      setPagination((prev) => ({ ...prev, current: 1 }));
    } else if (skipParams && skipParams.length > 0) {
      // Handle individual filter reset
      skipParams.forEach((skipParam) => {
        if (skipParam === "skipOperation") {
          setFilters((prev) => ({ ...prev, operation: [] }));
        } else if (skipParam === "skipDateRange") {
          setFilters((prev) => ({ ...prev, dateRange: null }));
        }
      });
      setPagination((prev) => ({ ...prev, current: 1 }));
    } else if (filterData) {
      setFilters({
        operation: filterData.operation || [],
        dateRange: filterData.dateRange || null,
      });
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

  // Table columns configuration
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
                 record.createdByName || 
                 "-";
        }
        return record.createdByName || "-";
      },
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 250,
      render: (text, record) => {
        if (text) return text;
        if (record.createdBy?.email) return record.createdBy.email;
        if (record.createdByEmail) return record.createdByEmail;
        return "-";
      },
    },
    {
      title: "Operation",
      dataIndex: "operationName",
      key: "operation",
      width: 120,
      render: (text) => {
        const colorMap = {
          LOGIN: "green",
          LOGOUT: "blue",
          DELETE: "red",
          UPDATE: "orange",
        };
        return (
          <Tag color={colorMap[text] || "default"}>
            {text || "-"}
          </Tag>
        );
      },
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
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <EyeOutlined 
          onClick={() => openModal(record)} 
          style={{ cursor: "pointer", fontSize: "16px" }} 
        />
      ),
    },
  ];

  return (
    <div className="ant-project-task all-project-main-wrapper">
        <Card>
        <div className="heading-wrapper">

        <div className="heading-main">
          <h2>Activity Logs</h2>
        </div>
        </div>
        <div className="global-search">
        <div className="filter-btn-wrapper">
                   <ActivityLogFilter onFilterChange={handleFilterChange}/>
                   </div>
        </div>
                 
        

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={activityLogs}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} records`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={handleTableChange}
         
        />
        
      
      </Card>

      {/*View Modal Code */}
      <Modal
        title="Activity Log Details"
        open={isViewModalOpen}
        onCancel={closeModal}
        footer={[
          <Button key="close" className="ant-delete" onClick={closeModal}>
            Cancel
          </Button>,
        ]}
        width={800}
        bodyStyle={{
          maxHeight: "70vh",
          overflowY: "auto",
          padding: "24px",
        }}
      >
        {selectedLog && (
          <div className="activity-modal">
            {selectedLog.operationName === "LOGIN" || selectedLog.operationName === "LOGOUT" ? (
              <div className="activity-section">
                <h3 className="section-title">Basic Information</h3>
                <div className="grid-3">
                  <div>
                    <div className="field-label">User</div>
                    <div className="field-value">
                      {selectedLog.createdBy?.full_name || 
                       selectedLog.createdBy?.emp_name || 
                       selectedLog.createdByName || "-"}
                    </div>
                  </div>
                  
                  <div>
                    <div className="field-label">Email</div>
                    <div className="field-value">
                      {selectedLog.email || 
                       selectedLog.createdBy?.email || 
                       selectedLog.createdByEmail || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="field-label">Operation</div>
                    <div>
                      <Tag
                        color={selectedLog.operationName === "LOGIN" ? "green" : "blue"}
                        className="tag-inline"
                      >
                        {selectedLog.operationName}
                      </Tag>
                    </div>
                  </div>
                  <div>
                    <div className="field-label">Module</div>
                    <div className="field-value">{formatModuleName(selectedLog.moduleName)}</div>
                  </div>
                  <div>
                    <div className="field-label">Timestamp</div>
                    <div className="field-value">{formatDate(selectedLog.createdAt)}</div>
                  </div>
                </div>
              </div>
            ) : selectedLog.operationName === "UPDATE" ? (
              <>
                <div className="activity-section">
                  <h3 className="section-title">Basic Information</h3>
                  <div className="grid-3">
                    <div>
                      <div className="field-label">User</div>
                      <div className="field-value">
                        {selectedLog.createdByName || 
                         selectedLog.createdBy?.full_name || 
                         selectedLog.createdBy?.emp_name || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="field-label">Employee Code</div>
                      <div className="field-value">
                        {selectedLog.createdByEmpCode || 
                         selectedLog.createdBy?.emp_code || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="field-label">Email</div>
                      <div className="field-value">
                        {selectedLog.createdByEmail || 
                         selectedLog.email || 
                         selectedLog.createdBy?.email || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="field-label">Operation</div>
                      <div>
                        <Tag color="orange" className="tag-inline">
                          UPDATE
                        </Tag>
                      </div>
                    </div>
                    <div>
                      <div className="field-label">Module</div>
                      <div className="field-value">{formatModuleName(selectedLog.moduleName)}</div>
                    </div>
                    <div>
                      <div className="field-label">Timestamp</div>
                      <div className="field-value">{formatDate(selectedLog.createdAt)}</div>
                    </div>
                    {selectedLog.companyName && (
                      <div>
                        <div className="field-label">Company</div>
                        <div className="field-value">{selectedLog.companyName}</div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedLog.updatedByName && (
                  <div className="activity-section">
                    <h3 className="section-title">Status Information</h3>
                    <div className="status-grid">
                      <div>
                        <div className="field-label">Updated By</div>
                        <div className="field-value">{selectedLog.updatedByName}</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedLog.updatedData &&
                  (() => {
                    const { oldData, newData } = selectedLog.updatedData;
                    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
                    const changedFields = [];
                    const unchangedFields = [];

                    allKeys.forEach((key) => {
                      if (key === "updated_at" || key === "created_at") return;
                      const oldValue = oldData?.[key];
                      const newValue = newData?.[key];
                      const isChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

                      if (isChanged) {
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
                                <div className="spacer-50"></div>
                                <div className="col">Current Values</div>
                              </div>
                              {changedFields.map(({ key, oldValue, newValue }) => (
                                <div key={key} className="change-row">
                                  <div className="change-col">
                                    <div className="change-subtitle">{formatKeyToLabel(key)}</div>
                                    <div className="prev-value">{formatValue(oldValue)}</div>
                                  </div>
                                  <div className="change-arrow">→</div>
                                  <div className="change-col">
                                    <div className="change-subtitle">{formatKeyToLabel(key)}</div>
                                    <div className="curr-value">{formatValue(newValue)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {unchangedFields.length > 0 && (
                          <div className="activity-section">
                            <h3 className="section-title">Other Information</h3>
                            <div className="other-info">
                              {unchangedFields.map(({ key, value }) => (
                                <div key={key}>
                                  <div className="field-label">{formatKeyToLabel(key)}</div>
                                  <div className="field-value">{formatValue(value)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
              </>
            ) : (
              <>
                <div className="activity-section">
                  <h3 className="section-title">Basic Information</h3>
                  <div className="grid-3">
                    <div>
                      <div className="field-label">User</div>
                      <div className="field-value">
                        {selectedLog.createdByName || 
                         selectedLog.createdBy?.full_name || 
                         selectedLog.createdBy?.emp_name || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="field-label">Employee Code</div>
                      <div className="field-value">
                        {selectedLog.createdByEmpCode || 
                         selectedLog.createdBy?.emp_code || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="field-label">Email</div>
                      <div className="field-value">
                        {selectedLog.createdByEmail || 
                         selectedLog.email || 
                         selectedLog.createdBy?.email || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="field-label">Operation</div>
                      <div>
                        <Tag color="red" className="tag-inline">
                          DELETE
                        </Tag>
                      </div>
                    </div>
                    <div>
                      <div className="field-label">Module</div>
                      <div className="field-value">{formatModuleName(selectedLog.moduleName)}</div>
                    </div>
                    <div>
                      <div className="field-label">Timestamp</div>
                      <div className="field-value">{formatDate(selectedLog.createdAt)}</div>
                    </div>
                    {selectedLog.companyName && (
                      <div>
                        <div className="field-label">Company</div>
                        <div className="field-value">{selectedLog.companyName}</div>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedLog.deletedBy || selectedLog.deletedByName) && (
                  <div className="activity-section">
                    <h3 className="section-title">Status Information</h3>
                    <div className="status-grid">
                      <div>
                        <div className="field-label">Deleted By</div>
                        <div className="field-value">
                          {selectedLog.deletedBy?.full_name || 
                           (selectedLog.deletedBy?.first_name && selectedLog.deletedBy?.last_name 
                             ? `${selectedLog.deletedBy.first_name} ${selectedLog.deletedBy.last_name}`
                             : selectedLog.deletedBy?.first_name || selectedLog.deletedBy?.last_name) ||
                           selectedLog.deletedByName || "-"}
                        </div>
                      </div>
                     
                    </div>
                  </div>
                )}

                {(selectedLog.deletedData || selectedLog.additionalData?.deletedData) && (
                  <div className="activity-section">
                    <h3 className="section-title">Deleted Data</h3>
                    <div className="deleted-data-grid">
                      {(selectedLog.deletedData || selectedLog.additionalData?.deletedData || []).map((item, index) =>
                        Object.keys(item)
                          .filter((key) => 
                            key !== "_id" && 
                            key !== "companyId" &&
                            key !== "createdBy" &&
                            key !== "updatedBy" &&
                            key !== "deletedBy" &&
                            key !== "createdByModel" &&
                            key !== "updatedByModel" &&
                            key !== "deletedByModel" &&
                            key !== "isDeleted" &&
                            key !== "deletedAt"
                          )
                          .map((key) => {
                            let displayValue = item[key];
                            
                            // Strip HTML tags from string values
                            const stripHtml = (html) => {
                              if (typeof html !== "string") return html;
                              const tmp = document.createElement("DIV");
                              tmp.innerHTML = html;
                              return tmp.textContent || tmp.innerText || "";
                            };
                            
                            // Handle array values - render as list
                            if (Array.isArray(displayValue)) {
                              if (displayValue.length === 0) {
                                displayValue = "-";
                              } else {
                                return (
                                  <div key={`${index}-${key}`} style={{ gridColumn: "1 / -1" }}>
                                    <div className="field-label">{formatKeyToLabel(key)}</div>
                                    <div className="field-value">
                                      <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                                        {displayValue.map((val, idx) => {
                                          // Handle objects in array
                                          if (val && typeof val === "object" && !Array.isArray(val)) {
                                            return (
                                              <li key={idx}>
                                                
                                                  {Object.keys(val)
                                                    .filter(k => k !== "_id")
                                                    .map((objKey) => {
                                                      let objValue = val[objKey];
                                                      // Strip HTML from string values
                                                      if (typeof objValue === "string") {
                                                        objValue = stripHtml(objValue);
                                                      } else if (objValue === null || objValue === undefined) {
                                                        objValue = "-";
                                                      } else if (typeof objValue === "boolean") {
                                                        objValue = objValue ? "Yes" : "No";
                                                      } else {
                                                        objValue = String(objValue);
                                                      }
                                                      return (
                                                        <li key={objKey}>
                                                          <strong>{formatKeyToLabel(objKey)}:</strong> {objValue}
                                                        </li>
                                                      );
                                                    })}
                                                
                                              </li>
                                            );
                                          }
                                          // Handle primitive values
                                          return (
                                            <li key={idx}>
                                              {typeof val === "string" 
                                                ? stripHtml(val) 
                                                : val === null || val === undefined 
                                                  ? "-" 
                                                  : String(val)}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  </div>
                                );
                              }
                            }
                            // Handle boolean values
                            else if (typeof displayValue === "boolean") {
                              displayValue = displayValue ? "Yes" : "No";
                            }
                            // Handle date values
                            else if (typeof displayValue === "string" && displayValue.match(/^\d{4}-\d{2}-\d{2}/)) {
                              displayValue = formatDate(displayValue);
                            }
                            // Handle null/undefined
                            else if (displayValue === null || displayValue === undefined) {
                              displayValue = "-";
                            }
                            // Handle string values - strip HTML
                            else if (typeof displayValue === "string") {
                              displayValue = stripHtml(displayValue);
                            }
                            else {
                              displayValue = String(displayValue);
                            }
                            
                            return (
                              <div key={`${index}-${key}`}>
                                <div className="field-label">{formatKeyToLabel(key)}</div>
                                <div className="field-value">{displayValue}</div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ActivityLogs;
