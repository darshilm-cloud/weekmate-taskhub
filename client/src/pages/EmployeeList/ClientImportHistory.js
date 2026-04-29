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
  queued:     { color: "default",   icon: <ClockCircleOutlined />,      label: "Queued" },
  parsing:    { color: "processing", icon: <LoadingOutlined />,           label: "Parsing" },
  processing: { color: "processing", icon: <LoadingOutlined />,           label: "Processing" },
  completed:  { color: "success",   icon: <CheckCircleOutlined />,       label: "Completed" },
  failed:     { color: "error",     icon: <ExclamationCircleOutlined />, label: "Failed" },
  cancelled:  { color: "default",   icon: <StopOutlined />,              label: "Cancelled" },
  undone:     { color: "warning",   icon: <UndoOutlined />,              label: "Undone" },
};

const ClientImportHistory = ({ visible, onClose, onImportComplete }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [actionLoading, setActionLoading] = useState({});
  const pollRef = useRef(null);

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

  const prevActiveJobIds = useRef(new Set());
  const prevCompletedJobIds = useRef(new Set());

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
      const completedBeforeFetch = new Set(
        records.filter((r) => r.status === "completed").map((r) => r.jobId)
      );

      prevCompletedJobIds.current = completedBeforeFetch;

      await fetchHistory(pagination.current, true);

      setRecords((latest) => {
        const nowActive = new Set(
          latest.filter((r) => IN_PROGRESS_STATUSES.has(r.status)).map((r) => r.jobId)
        );
        const justCompleted = [...activeBeforeFetch].some(
          (id) => !nowActive.has(id) && latest.find((r) => r.jobId === id)?.status === "completed"
        );
        
        const nowCompleted = new Set(
          latest.filter((r) => r.status === "completed").map((r) => r.jobId)
        );
        const hasNewCompleted = [...nowCompleted].some(
          (id) => !prevCompletedJobIds.current.has(id)
        );

        if (justCompleted || hasNewCompleted) {
          prevCompletedJobIds.current = nowCompleted;
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
      link.setAttribute("download", `errors_${jobId}.csv`);
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
        return (
          <div style={{ fontSize: 12, color: "#444" }}>
            <div>
              {record.successCount} added
            </div>
            {record.errorCount > 0 && (
              <div style={{ color: "#ff4d4f" }}>
                {record.errorCount} errors
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Duration",
      dataIndex: "processingTime",
      key: "processingTime",
      width: 90,
      render: (ms) => formatDuration(ms),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (dt) => dt ? new Date(dt).toLocaleString() : "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          {IN_PROGRESS_STATUSES.has(record.status) && (
            <Tooltip title="Cancel">
              <Popconfirm
                title="Cancel this import?"
                onConfirm={() => handleCancel(record.jobId)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  loading={actionLoading[record.jobId] === "cancel"}
                  icon={<CloseCircleOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}
          {record.status === "completed" && canUndo(record) && (
            <Tooltip title="Undo import (removes added clients)">
              <Popconfirm
                title="Undo this import? This will remove the imported clients."
                onConfirm={() => handleUndo(record.jobId)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  size="small"
                  loading={actionLoading[record.jobId] === "undo"}
                  icon={<UndoOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}
          {record.errorCount > 0 && (
            <Tooltip title="Download error details">
              <Button
                type="text"
                size="small"
                loading={actionLoading[record.jobId] === "download"}
                onClick={() => handleDownloadErrorCsv(record.jobId)}
                icon={<DownloadOutlined />}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="Client Import History"
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => fetchHistory(1)}>
          Refresh
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
          options={[
            { value: "all", label: "All Status" },
            { value: "queued", label: "Queued" },
            { value: "processing", label: "Processing" },
            { value: "completed", label: "Completed" },
            { value: "failed", label: "Failed" },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={records}
        rowKey="jobId"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page) => fetchHistory(page),
          showSizeChanger: false,
        }}
        scroll={{ x: 800 }}
        locale={{ emptyText: <Empty description="No import history" /> }}
      />
    </Modal>
  );
};

export default ClientImportHistory;