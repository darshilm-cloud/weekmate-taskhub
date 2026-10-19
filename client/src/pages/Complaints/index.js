/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Table, message } from "antd";
import RowActions from "../../components/common/RowActions";
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import moment from "moment";
import { useDispatch } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import { getRoles, can } from "../../util/hasPermission";
import ComplaintFilterComponent from "./ComplaintFilterComponent";
import ColumnSelector from "../../components/common/ColumnSelector";
import useColumnVisibility from "../../hooks/useColumnVisibility";
import { TablePageSkeleton } from "../../components/common/SkeletonLoader";
import "./Complaints.css";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import ComplaintsUnifiedModal from "./ComplaintsUnifiedModal";
import { EditActionIcon, DeleteActionIcon } from "../../components/common/ActionIcons";
import { HRMS_CHART_BLUE_PALETTE, HRMS_CHART_PRIMARY } from "../../util/chartTheme";

/* ── constants ─────────────────────────────────────────────── */
const ACCESS_ROLES = ["Admin", "PC", "TL", "AM"];

/* ── helpers ────────────────────────────────────────────────── */
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

/* ── stat card ──────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, color }) => (
  <div className={`cmp-stat-card ${color}`}>
    <div className={`cmp-stat-icon ${color}`}>{icon}</div>
    <div>
      <div className="cmp-stat-label">{label}</div>
      <div className="cmp-stat-value">{value}</div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const Complaints = () => {
  const dispatch = useDispatch();

  /* ── list (paginated) ── */
  const [complaintList, setComplaintList] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });

  /* ── all complaints (analytics) ── */
  const [summary, setSummary] = useState(null); // stat cards + charts, from the listing API
  const summaryKeyRef = useRef(null);

  /* ── filters ── */
  const [selectedProject, setSelectedProject] = useState([]);
  const [technology, setTechnology] = useState([]);
  const [manager, setManager] = useState([]);
  const [accontManager, setAccountManager] = useState([]);
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");

  /* ── unified modal: view | add | edit | actions ── */
  const [complaintModal, setComplaintModal] = useState({
    open: false,
    mode: "view",
    record: null,
    complaintId: null,
  });

  const closeComplaintModal = useCallback(() => {
    setComplaintModal({
      open: false,
      mode: "view",
      record: null,
      complaintId: null,
    });
  }, []);

  const openComplaintModal = useCallback((payload) => {
    setComplaintModal({
      open: true,
      mode: payload.mode || "view",
      record: payload.record ?? null,
      complaintId: payload.complaintId ?? payload.record?._id ?? null,
    });
  }, []);

  const handleComplaintModalNavigate = useCallback((nextMode, id) => {
    setComplaintModal((prev) => ({
      open: true,
      mode: nextMode,
      complaintId: id,
      record: prev.record && String(prev.record._id) === String(id) ? prev.record : null,
    }));
  }, []);

  const [tableLoading, setTableLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const userHasAccess = useMemo(() => getRoles(ACCESS_ROLES), []);
  const canAdd = useMemo(() => can("feedback_add"), []);
  const canEdit = useMemo(() => can("feedback_edit"), []);
  const canDelete = useMemo(() => can("feedback_delete"), []);

  /* ───────────────────────────────────────────────────────────
     API CALLS
  ─────────────────────────────────────────────────────────── */

  const getComplaintList = useCallback(async ({ forceSummary = false } = {}) => {
    try {
      setTableLoading(true);
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        project_id: selectedProject,
        technology,
        manager_id: manager,
        acc_manager_id: accontManager,
      };
      if (priority) reqBody.priority = priority;
      if (status) reqBody.status = status;

      // Stat cards / charts come back with the listing (same filters, whole result set) and
      // only change with the filters or the data, so page changes don't ask for them again.
      const { pageNo, limit, ...filterPart } = reqBody;
      const summaryKey = JSON.stringify(filterPart);
      if (forceSummary || summaryKeyRef.current !== summaryKey) {
        reqBody.include_summary = true;
        reqBody.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getComplaintList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.status === 1) {
        if (response.data.metadata?.summary) {
          summaryKeyRef.current = summaryKey;
          setSummary(response.data.metadata.summary);
        }
        setComplaintList(response.data.data || []);
        setPagination((p) => ({ ...p, total: response.data.metadata?.total || 0 }));
      } else {
        console.error("Complaint list error:", response?.data?.message);
        message.error(response?.data?.message || "Failed to load complaints");
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
      message.error("Failed to load complaints");
    } finally {
      setSummary((prev) => prev || {}); // never leave the cards empty-loading if the request failed
      setTableLoading(false);
      setPageLoading(false);
    }
  }, [pagination.current, pagination.pageSize, selectedProject, technology, manager, accontManager, priority, status, dispatch]);

  const deleteComplaints = useCallback(async (id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteComplaint + `/${id}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.status === 1) {
        message.success(response.data.message);
        getComplaintList({ forceSummary: true });
      } else {
        message.error(response?.data?.message || "Failed to delete complaint");
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch, getComplaintList]);

  const handleComplaintModalSuccess = useCallback(() => {
    getComplaintList({ forceSummary: true });
  }, [getComplaintList]);

  useEffect(() => { getComplaintList(); }, [getComplaintList]);

  /* ───────────────────────────────────────────────────────────
     ANALYTICS
  ─────────────────────────────────────────────────────────── */
  const analytics = useMemo(() => {
    const t = summary?.totals || {};

    /* status breakdown (raw statuses that format to the same label are merged) */
    const statusMap = {};
    (summary?.statuses || []).forEach((x) => {
      const label = formatStatus(x._id || "Unknown");
      statusMap[label] = (statusMap[label] || 0) + x.count;
    });

    /* last 6 months — one bar per calendar month */
    const monthCounts = Object.fromEntries((summary?.monthly || []).map((m) => [m._id, m.count]));
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const m = moment().subtract(i, "months");
      monthlyMap[m.format("MMM YY")] = monthCounts[m.format("YYYY-MM")] || 0;
    }

    return {
      total: t.total || 0,
      resolved: t.resolved || 0,
      inProgress: t.inProgress || 0,
      thisMonth: t.thisMonth || 0,
      statusMap,
      monthlyMap,
    };
  }, [summary]);

  /* chart options */
  const { donutSeries, donutLabels } = useMemo(() => ({
    donutSeries: Object.values(analytics.statusMap),
    donutLabels: Object.keys(analytics.statusMap),
  }), [analytics.statusMap]);
  const donutOptions = useMemo(() => ({
    chart: { type: "donut", fontFamily: "inherit" },
    labels: donutLabels.length ? donutLabels : ["No Data"],
    colors: HRMS_CHART_BLUE_PALETTE,
    legend: { position: "bottom", fontSize: "12px" },
    plotOptions: { pie: { donut: { size: "65%" } } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => `${v} complaints` } },
  }), [donutLabels]);

  const barSeries = useMemo(() => [{ name: "Complaints", data: Object.values(analytics.monthlyMap) }], [analytics.monthlyMap]);
  const barOptions = useMemo(() => ({
    chart: { type: "bar", fontFamily: "inherit", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
    colors: [HRMS_CHART_PRIMARY],
    xaxis: { categories: Object.keys(analytics.monthlyMap) },
    yaxis: { labels: { style: { fontSize: "11px" } }, tickAmount: 3 },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f5f5f5" },
    tooltip: { y: { formatter: (v) => `${v} complaints` } },
  }), [analytics.monthlyMap]);

  /* ───────────────────────────────────────────────────────────
     FILTER HANDLER
  ─────────────────────────────────────────────────────────── */
  const onFilterChange = useCallback((skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setSelectedProject([]); setTechnology([]);
      setManager([]); setAccountManager([]);
      setPriority(""); setStatus("");
      setPagination((p) => ({ ...p, current: 1 }));
      return;
    }
    if (skipParams.includes("skipProject")) setSelectedProject([]);
    if (skipParams.includes("skipDepartment")) setTechnology([]);
    if (skipParams.includes("skipManager")) setManager([]);
    if (skipParams.includes("skipAccountManager")) setAccountManager([]);
    if (skipParams.includes("skipPriority")) setPriority("");
    if (skipParams.includes("skipStatus")) setStatus("");
    if (selectedFilters) {
      setSelectedProject(selectedFilters.project || []);
      setTechnology(selectedFilters.technology || []);
      setManager(selectedFilters.manager || []);
      setAccountManager(selectedFilters.accountManager || []);
      setPriority(selectedFilters.priority || "");
      setStatus(selectedFilters.status || "");
      setPagination((p) => ({ ...p, current: 1 }));
    }
  }, []);

  /* ───────────────────────────────────────────────────────────
     TABLE COLUMNS
  ─────────────────────────────────────────────────────────── */
  const columns = useMemo(() => {
    const base = [
      {
        key: "project",
        title: "Project",
        width: 180,
        render: (_, r) => (
          <span className="cmp-project-chip">{r.project?.title || "—"}</span>
        ),
      },
      {
        key: "createdBy",
        title: "Created By",
        width: 140,
        render: (_, r) => r.createdBy?.full_name || "—",
      },
      // {
      //   title: "Account Manager",
      //   width: 150,
      //   render: (_, r) => r.acc_manager?.full_name || "—",
      // },
      {
        key: "manager",
        title: "Project Manager",
        width: 150,
        render: (_, r) => r.manager?.full_name || "—",
      },
      {
        key: "client",
        title: "Client",
        width: 130,
        render: (_, r) => <span style={{ fontWeight: 500 }}>{r.client_name || "—"}</span>,
      },
      {
        key: "status",
        title: "Status",
        width: 130,
        render: (_, r) => r.status ? (
          <span className={`cmp-status-badge ${statusClass(r.status)}`}>
            {formatStatus(r.status)}
          </span>
        ) : "—",
      },
      {
        key: "priority",
        title: "Priority",
        width: 100,
        render: (_, r) => r.priority ? (
          <span className={`cmp-priority-badge ${priorityClass(r.priority)}`}>
            {r.priority.charAt(0).toUpperCase() + r.priority.slice(1)}
          </span>
        ) : "—",
      },
      {
        key: "date",
        title: "Date",
        width: 110,
        render: (_, r) => moment(r.createdAt).format("DD-MM-YYYY"),
      },
    ];

    if (userHasAccess || canEdit || canDelete) {
      base.push({
        key: "actions",
        title: "Actions",
        width: 110,
        render: (_, record) => (
          <RowActions
            actions={[
              {
                key: "view",
                label: "View Details",
                icon: <EyeOutlined />,
                onClick: () => openComplaintModal({ mode: "view", record, complaintId: record._id }),
              },
              {
                key: "details",
                label: "Action Details",
                icon: <FileTextOutlined />,
                onClick: () => openComplaintModal({ mode: "actions", complaintId: record._id }),
              },
              {
                key: "edit",
                label: "Edit",
                icon: <EditActionIcon />,
                hidden: !canEdit,
                onClick: () => openComplaintModal({ mode: "edit", complaintId: record._id }),
              },
              {
                key: "delete",
                label: "Delete",
                icon: <DeleteActionIcon />,
                hidden: !canDelete,
                confirm: "Delete this complaint?",
                onClick: () => deleteComplaints(record._id),
              },
            ]}
          />
        ),
      });
    }

    return base;
  }, [userHasAccess, canEdit, canDelete, deleteComplaints, openComplaintModal]);

  const COLUMN_LOCKED = useMemo(() => ["project", "actions"], []);
  const { visibleKeys, saveVisibleKeys, filteredColumns, saving: savingColumns } =
    useColumnVisibility("complaints", columns, [], COLUMN_LOCKED);

  /* ───────────────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────────────── */
  if (pageLoading) return <TablePageSkeleton />;

  return (
    <div className="cmp-page">

      {/* Header */}
      <div className="inout-header text-left">
        <h2>Complaints</h2>
        {canAdd && (
          <div className="header-btns">
            <Button
              type="primary"
              className="add-btn"
              onClick={() => openComplaintModal({ mode: "add" })}
            >
              <PlusOutlined /> Complaint
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="cmp-stats-grid">
        <StatCard icon={<AlertOutlined />} label="Total Complaints" value={analytics.total} color="blue" />
        <StatCard icon={<ClockCircleOutlined />} label="In Progress" value={analytics.inProgress} color="blue" />
        <StatCard icon={<CheckCircleOutlined />} label="Resolved" value={analytics.resolved} color="blue" />
        <StatCard icon={<CalendarOutlined />} label="This Month" value={analytics.thisMonth} color="blue" />
      </div>

      {/* Charts */}
      <div className="cmp-charts-grid">
        <div className="cmp-chart-card">
          <div className="cmp-chart-title">Status Distribution</div>
          <div className="cmp-chart-sub">Breakdown of complaints by current status</div>
          {analytics.total === 0 ? (
            <NoDataFoundIcon />
          ) : (
            <ReactApexChart
              type="donut"
              series={donutSeries.length ? donutSeries : [1]}
              options={donutOptions}
              height={260}
            />
          )}
        </div>
        <div className="cmp-chart-card">
          <div className="cmp-chart-title">Monthly Trend</div>
          <div className="cmp-chart-sub">Complaints raised over the last 6 months</div>
          {analytics.total === 0 ? (
            <NoDataFoundIcon />
          ) : (
            <ReactApexChart
              type="bar"
              series={barSeries}
              options={barOptions}
              height={260}
            />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="cmp-table-card">
        <div className="cmp-table-header">
          <div className="cmp-table-title">
            All Complaints
            <span style={{ marginLeft: 8, fontSize: 13, color: "#8c8c8c", fontWeight: 400 }}>
              ({pagination.total || 0})
            </span>
          </div>
          <div className="cmp-table-toolbar">
            <ComplaintFilterComponent
              onFilterChange={onFilterChange}
              containerClassName="cmp-filter-container"
              triggerButtonClassName="cmp-filter-trigger"
            />
            <ColumnSelector
              columns={columns}
              visibleKeys={visibleKeys}
              alwaysVisibleKeys={COLUMN_LOCKED}
              onSave={saveVisibleKeys}
              saving={savingColumns}
            />
          </div>
        </div>

        <Table
          loading={tableLoading}
          columns={filteredColumns}
          dataSource={complaintList}
          rowKey="_id"
          locale={{
            emptyText: <NoDataFoundIcon />,
          }}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "25", "50", "100"],
            showTotal: (total) => `Total ${total} complaints`,
            ...pagination,
          }}
          onChange={(page) => setPagination((p) => ({ ...p, ...page }))}
          scroll={{ x: 1000 }}
        />
      </div>

      <ComplaintsUnifiedModal
        open={complaintModal.open}
        mode={complaintModal.mode}
        record={complaintModal.record}
        complaintId={complaintModal.complaintId}
        userHasAccess={userHasAccess}
        onClose={closeComplaintModal}
        onSuccess={handleComplaintModalSuccess}
        onNavigate={handleComplaintModalNavigate}
      />

    </div>
  );
};

export default React.memo(Complaints);
