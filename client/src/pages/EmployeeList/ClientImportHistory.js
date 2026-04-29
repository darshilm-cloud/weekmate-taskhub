/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Modal,
  Table,
  Button,
  Tag,
  Tooltip,
  Popconfirm,
  Progress,
  message,
  Space,
  Select,
  Empty,
} from "antd";
import {
  CloseCircleOutlined,
  UndoOutlined,
  DownloadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import axios from "axios";
import Service from "../../service";

const POLL_INTERVAL_MS = 3000;
const IN_PROGRESS_STATUSES = new Set(["queued", "parsing", "processing"]);

const statusConfig = {
  queued:     { color: "default",    icon: <ClockCircleOutlined />,      label: "Queued" },
  parsing:    { color: "processing", icon: <LoadingOutlined />,           label: "Parsing" },
  processing: { color: "processing", icon: <LoadingOutlined />,           label: "Processing" },
  completed:  { color: "success",    icon: <CheckCircleOutlined />,       label: "Completed" },
  failed:     { color: "error",      icon: <ExclamationCircleOutlined />, label: "Failed" },
  cancelled:  { color: "default",    icon: <StopOutlined />,              label: "Cancelled" },
  undone:     { color: "warning",    icon: <UndoOutlined />,              label: "Undone" },
};

const ClientImportHistory = ({ visible, onClose, onImportComplete }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [actionLoading, setActionLoading] = useState({});
  const pollRef = useRef(null);

  // ── Fetch history list ────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (page = pagination.current, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: pagination.pageSize });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.clientImportHistory}?${params.toString()}`,
      });

      if (response?.data?.data) {
        setRecords(response.data.data);
        setPagination((prev) => ({
          ...prev,
          current: page,
          total: response.data.metadata?.total || 0,
        }));
      }
    } catch (err) {
      if (!silent) message.error("Failed to load import history");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, pagination.pageSize]);

  // ── Polling: refresh while any job is active, fire onImportComplete when one finishes ──
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const hasActive = records.some((r) => IN_PROGRESS_STATUSES.has(r.status));
      if (!hasActive) {
        stopPolling();
        return;
      }

      const activeBeforeFetch = new Set(
        records.filter((r) => IN_PROGRESS_STATUSES.has(r.status)).map((r) => r.jobId)
      );

      await fetchHistory(pagination.current, true);

      setRecords((latest) => {
        const nowActive = new Set(
          latest.filter((r) => IN_PROGRESS_STATUSES.has(r.status)).map((r) => r.jobId)
        );
        const justCompleted = [...activeBeforeFetch].some(
          (id) => !nowActive.has(id) && latest.find((r) => r.jobId === id)?.status === "completed"
        );
        if (justCompleted) {
          onImportComplete?.();
        }
        return latest;
      });
    }, POLL_INTERVAL_MS);
  }, [records, pagination.current, fetchHistory, onImportComplete]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    if (visible) {
      fetchHistory(1);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [visible, statusFilter]);

  useEffect(() => {
    if (!visible) return;
    const hasActive = records.some((r) => IN_PROGRESS_STATUSES.has(r.status));
    if (hasActive) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [records, visible]);

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = async (jobId) => {
    setActionLoading((prev) => ({ ...prev, [jobId]: "cancel" }));
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.clientImportCancel}/${jobId}`,
      });
      if (response?.data?.status === "cancelled" || response?.status === 200) {
        message.success(response?.data?.message || "Import cancelled");
        await fetchHistory(pagination.current, true);
      } else {
        message.error(response?.data?.message || "Failed to cancel import");
      }
    } catch (err) {
      message.error("Failed to cancel import");
    } finally {
      setActionLoading((prev) => ({ ...prev, [jobId]: null }));
    }
  };

  // ── Undo ──────────────────────────────────────────────────────────────────
  const handleUndo = async (jobId) => {
    setActionLoading((prev) => ({ ...prev, [jobId]: "undo" }));
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.clientImportUndo}/${jobId}`,
      });
      if (response?.status === 200) {
        message.success(response?.data?.message || "Import undone successfully");
        await fetchHistory(pagination.current, true);
        onImportComplete?.();
      } else {
        message.error(response?.data?.message || "Failed to undo import");
      }
    } catch (err) {
      message.error("Failed to undo import");
    } finally {
      setActionLoading((prev) => ({ ...prev, [jobId]: null }));
    }
  };

  // ── Download error CSV ────────────────────────────────────────────────────
  const handleDownloadErrorCsv = async (jobId) => {
    setActionLoading((prev) => ({ ...prev, [jobId]: "download" }));
    try {
      const accessToken = localStorage.getItem("accessToken");
      const apiUrl = `${Service.API_URL}${Service.clientImportErrorCsv}/${jobId}`;
      const response = await axios.get(apiUrl, {
        responseType: "blob",
        headers: {
          authorization: `Bearer ${accessToken}`,
          platform: "web-admin",
        },
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `client_errors_${jobId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      message.error("Failed to download error CSV");
    } finally {
      setActionLoading((prev) => ({ ...prev, [jobId]: null }));
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const canUndo = (record) => {
    if (record.status !== "completed" || record.isUndone) return false;
    const hoursDiff = (Date.now() - new Date(record.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  const getProgressPercent = (record) => {
    if (!record.totalRows || record.totalRows === 0) return 0;
    return Math.round(((record.successCount + record.errorCount) / record.totalRows) * 100);
  };

  const formatDuration = (ms) => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: "File",
      dataIndex: "fileName",
      key: "fileName",
      ellipsis: true,
      width: 180,
      render: (name) => <span style={{ fontWeight: 500 }}>{name || "—"}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status) => {
        const cfg = statusConfig[status] || { color: "default", icon: null, label: status };
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: "Progress",
      key: "progress",
      width: 180,
      render: (_, record) => {
        if (IN_PROGRESS_STATUSES.has(record.status)) {
          const pct = getProgressPercent(record);
          return (
            <div>
              <Progress
                percent={pct}
                size="small"
                status="active"
                style={{ marginBottom: 2 }}
              />
              <div style={{ fontSize: 11, color: "#888" }}>
                {record.successCount} ok / {record.errorCount} err
                {record.totalRows ? ` / ${record.totalRows} total` : ""}
              </div>
            </div>
          );
        }
        if (record.status === "completed" || record.status === "undone") {
          const total = record.totalRows || (record.successCount + record.errorCount);
          return (
            <div style={{ fontSize: 12 }}>
              <span style={{ color: "#52c41a", fontWeight: 600 }}>{record.successCount} success</span>
              {record.errorCount > 0 && (
                <span style={{ color: "#ff4d4f", marginLeft: 6 }}>/ {record.errorCount} failed</span>
              )}
              {total > 0 && <span style={{ color: "#999", marginLeft: 6 }}>/ {total} total</span>}
            </div>
          );
        }
        return <span style={{ color: "#999", fontSize: 12 }}>—</span>;
      },
    },
    {
      title: "Duration",
      dataIndex: "processingTimeMs",
      key: "duration",
      width: 90,
      render: (ms) => <span style={{ fontSize: 12, color: "#666" }}>{formatDuration(ms)}</span>,
    },
    {
      title: "Started by",
      dataIndex: "userId",
      key: "user",
      width: 140,
      ellipsis: true,
      render: (user) =>
        user ? (
          <span style={{ fontSize: 12 }}>
            {user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email}
          </span>
        ) : "—",
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      render: (date) =>
        date ? (
          <span style={{ fontSize: 12, color: "#666" }}>
            {new Date(date).toLocaleDateString()}{" "}
            {new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, record) => {
        const loading = actionLoading[record.jobId];
        return (
          <Space size={4}>
            {/* Cancel */}
            {IN_PROGRESS_STATUSES.has(record.status) && (
              <Popconfirm
                title="Cancel this import? Partially imported clients will be removed."
                onConfirm={() => handleCancel(record.jobId)}
                okText="Yes, cancel"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Cancel import">
                  <Button
                    size="small"
                    danger
                    icon={<CloseCircleOutlined />}
                    loading={loading === "cancel"}
                  />
                </Tooltip>
              </Popconfirm>
            )}

            {/* Undo */}
            {canUndo(record) && (
              <Popconfirm
                title="Undo this import? All imported clients will be permanently deleted."
                onConfirm={() => handleUndo(record.jobId)}
                okText="Yes, undo"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Undo import (available within 24h)">
                  <Button
                    size="small"
                    icon={<UndoOutlined />}
                    loading={loading === "undo"}
                  />
                </Tooltip>
              </Popconfirm>
            )}

            {/* Download error CSV */}
            {(record.status === "completed" || record.status === "undone") &&
              record.errorCount > 0 && (
                <Tooltip title={`Download ${record.errorCount} failed row(s) as CSV`}>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    loading={loading === "download"}
                    onClick={() => handleDownloadErrorCsv(record.jobId)}
                  />
                </Tooltip>
              )}
          </Space>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Client Import History</span>
          <Tooltip title="Refresh">
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => fetchHistory(pagination.current)}
              loading={loading}
            />
          </Tooltip>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      className="global-app-modal"
      destroyOnClose
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <Select
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPagination((p) => ({ ...p, current: 1 })); }}
          style={{ width: 150 }}
          options={[
            { label: "All Status", value: "all" },
            { label: "Queued", value: "queued" },
            { label: "Processing", value: "processing" },
            { label: "Completed", value: "completed" },
            { label: "Failed", value: "failed" },
            { label: "Cancelled", value: "cancelled" },
            { label: "Undone", value: "undone" },
          ]}
        />
        <span style={{ fontSize: 12, color: "#999" }}>
          {records.some((r) => IN_PROGRESS_STATUSES.has(r.status)) && (
            <>
              <LoadingOutlined style={{ marginRight: 4 }} />
              Auto-refreshing…
            </>
          )}
        </span>
      </div>

      <Table
        columns={columns}
        dataSource={records}
        rowKey="jobId"
        loading={loading}
        size="small"
        locale={{ emptyText: <Empty description="No import history yet" /> }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: false,
          showTotal: (t) => `${t} import(s)`,
          onChange: (page) => fetchHistory(page),
        }}
      />
    </Modal>
  );
};

export default ClientImportHistory;
