/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Col, Modal, Popconfirm, Row, Table, Tooltip, message } from "antd";
import { Link, useHistory } from "react-router-dom/cjs/react-router-dom.min";
import RowActions from "../../components/common/RowActions";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  LinkOutlined,
  LikeOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  StarOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import moment from "moment";
import { useDispatch } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import { getRoles, can } from "../../util/hasPermission";
import GenericFilterComponent from "./PositiveReviewFilter";
import { TablePageSkeleton } from "../../components/common/SkeletonLoader";
import "./PositiveReview.css";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import NoGraphFound from "../../components/common/NoGraphFound";
import ReviewFormModal from "./ReviewFormModal";
import ColumnSelector from "../../components/common/ColumnSelector";
import useColumnVisibility from "../../hooks/useColumnVisibility";
import { EditActionIcon, DeleteActionIcon } from "../../components/common/ActionIcons";
import { HRMS_CHART_PALETTE, HRMS_CHART_PRIMARY } from "../../util/chartTheme";

/* ── constants ─────────────────────────────────────────────── */
const companySlug = localStorage.getItem("companyDomain");
const ACCESS_ROLES = ["Admin", "PC", "TL", "AM"];

const FEEDBACK_TYPES = [
  { value: "", label: "All Types" },
  { value: "Clutch Review", label: "Clutch Review" },
  { value: "Video Testimonial", label: "Video Testimonial" },
  { value: "Text Testimonial", label: "Text Testimonial" },
  { value: "Feedback", label: "Feedback" },
  { value: "Zoho Partner Profile", label: "Zoho Partner Profile" },
];

/* ── helpers ────────────────────────────────────────────────── */
const typeBadgeClass = (type = "") => {
  if (!type) return "default";
  const t = type.toLowerCase();
  if (t.includes("clutch")) return "clutch";
  if (t.includes("video")) return "video";
  if (t.includes("text")) return "text";
  if (t.includes("feedback")) return "feedback";
  if (t.includes("zoho")) return "zoho";
  return "default";
};

/* ── stat card ──────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, color }) => (
  <div className={`pr-stat-card ${color}`}>
    <div className={`pr-stat-icon ${color}`}>{icon}</div>
    <div>
      <div className="pr-stat-label">{label}</div>
      <div className="pr-stat-value">{value}</div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const PositiveReview = () => {
  const history = useHistory();
  const dispatch = useDispatch();

  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });
  const [summary, setSummary] = useState(null); // stat cards + charts, from the listing API
  const summaryKeyRef = useRef(null);

  const [selectedProject, setSelectedProject] = useState([]);
  const [technology, setTechnology] = useState([]);
  const [manager, setManager] = useState([]);
  const [accontManager, setAccountManager] = useState([]);
  const [feedBackTypeFilter, setFeedBackTypeFilter] = useState("");
  const [reviewList, setReviewList] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("add"); // add, edit, view
  const [selectedReviewId, setSelectedReviewId] = useState(null);


  const userHasAccess = useMemo(() => getRoles(ACCESS_ROLES), []);
  const canAddReview = useMemo(() => can("feedback_add"), []);
  const canEditReview = useMemo(() => can("feedback_edit"), []);
  const canDeleteReview = useMemo(() => can("feedback_delete"), []);

  /* ── fetch paginated table ── */
  const getReviewList = useCallback(async ({ forceSummary = false } = {}) => {
    try {
      setTableLoading(true);
      dispatch(showAuthLoader());
      const filters = {
        project_id: selectedProject,
        technology,
        manager_id: manager,
        // acc_manager_id: accontManager, // AM hidden
        feedback_type: feedBackTypeFilter,
      };
      // Stat cards / charts come back with the listing (same filters, whole result set) and
      // only change with the filters or the data, so page changes don't ask for them again.
      const summaryKey = JSON.stringify(filters);
      const wantSummary = forceSummary || summaryKeyRef.current !== summaryKey;
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getReviewList,
        body: {
          pageNo: pagination.current,
          limit: pagination.pageSize,
          ...filters,
          ...(wantSummary
            ? { include_summary: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
            : {}),
        },
      });
      if (response?.data?.metadata?.summary) {
        summaryKeyRef.current = summaryKey;
        setSummary(response.data.metadata.summary);
      }
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        setReviewList(response.data.data);
        setPagination((p) => ({ ...p, total: response.data.metadata?.total || 0 }));
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    } finally {
      setSummary((prev) => prev || {}); // never leave the cards empty-loading if the request failed
      setTableLoading(false);
      setPageLoading(false);
    }
  }, [pagination.current, pagination.pageSize, selectedProject, technology, manager, accontManager, feedBackTypeFilter, dispatch]);

  const deleteReview = useCallback(async (id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteReview + `/${id}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        message.success(response.data.message || "Review deleted");
        getReviewList({ forceSummary: true });
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch, getReviewList]);

  useEffect(() => { getReviewList(); }, [getReviewList]);

  /* ── analytics ── */
  const analytics = useMemo(() => {
    const t = summary?.totals || {};
    const typeMap = {};
    (summary?.types || []).forEach((x) => {
      typeMap[x._id] = (typeMap[x._id] || 0) + x.count;
    });

    /* last 6 months — one bar per calendar month */
    const monthCounts = Object.fromEntries((summary?.monthly || []).map((m) => [m._id, m.count]));
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const m = moment().subtract(i, "months");
      monthlyMap[m.format("MMM YY")] = monthCounts[m.format("YYYY-MM")] || 0;
    }

    return { total: t.total || 0, ndaSigned: t.ndaSigned || 0, thisMonth: t.thisMonth || 0, typeMap, monthlyMap };
  }, [summary]);

  const isDark = document.body.classList.contains("dark-theme") ||
    document.body.getAttribute("data-theme") === "dark";
  const chartTextColor = isDark ? "#ffffff" : "#787878";
  const chartGridColor = isDark ? "#1e3352" : "#f5f5f5";

  const { donutSeries, donutLabels } = useMemo(() => {
    const series = Object.values(analytics.typeMap);
    const labels = Object.keys(analytics.typeMap);
    return {
      donutSeries: series.length ? series : [],
      donutLabels: labels.length ? labels : []
    };
  }, [analytics.typeMap]);

  const donutOptions = useMemo(() => ({
    chart: { type: "donut", fontFamily: "inherit" },
    labels: donutLabels.length ? donutLabels : ["No Data"],
    colors: HRMS_CHART_PALETTE,
    legend: { position: "bottom", fontSize: "12px", labels: { colors: chartTextColor } },
    plotOptions: { pie: { donut: { size: "65%" } } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => `${v} reviews` } },
  }), [donutLabels, chartTextColor]);

  const barSeries = useMemo(() => [{ name: "Reviews", data: Object.values(analytics.monthlyMap) }], [analytics.monthlyMap]);
  const barOptions = useMemo(() => ({
    chart: { type: "bar", fontFamily: "inherit", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
    colors: [HRMS_CHART_PRIMARY],
    xaxis: { categories: Object.keys(analytics.monthlyMap), labels: { style: { colors: chartTextColor, fontSize: "11px" } } },
    yaxis: { labels: { style: { colors: chartTextColor, fontSize: "11px" } }, tickAmount: 3 },
    dataLabels: { enabled: false },
    grid: { borderColor: chartGridColor },
    tooltip: { y: { formatter: (v) => `${v} reviews` } },
  }), [analytics.monthlyMap, chartTextColor, chartGridColor]);

  /* ── filter handler ── */
  const onFilterChange = useCallback((skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setSelectedProject([]); setTechnology([]);
      setManager([]); setAccountManager([]); setFeedBackTypeFilter("");
      setPagination((p) => ({ ...p, current: 1 }));
      return;
    }
    if (skipParams.includes("skipProject")) setSelectedProject([]);
    if (skipParams.includes("skipDepartment")) setTechnology([]);
    if (skipParams.includes("skipManager")) setManager([]);
    if (skipParams.includes("skipAccountManager")) setAccountManager([]);
    if (skipParams.includes("skipFeedbackType")) setFeedBackTypeFilter("");
    if (selectedFilters) {
      setSelectedProject(selectedFilters.project || []);
      setTechnology(selectedFilters.technology || []);
      setManager(selectedFilters.manager || []);
      setAccountManager(selectedFilters.accountManager || []);
      setFeedBackTypeFilter(selectedFilters.feedbackType || "");
      setPagination((p) => ({ ...p, current: 1 }));
    }
  }, []);

  /* ── table columns ── */
  const columns = useMemo(() => {
    const base = [
      {
        key: "project",
        title: "Project",
        width: 180,
        render: (_, r) => (
          <span className="pr-project-chip">{r.project?.title || "—"}</span>
        ),
      },
      {
        key: "client",
        title: "Client",
        width: 130,
        render: (_, r) => <span style={{ fontWeight: 500 }}>{r.client_name || "—"}</span>,
      },
      // {
      //   title: "Account Manager",
      //   width: 150,
      //   render: (_, r) => r.acc_manager?.full_name || "—",
      // },
      {
        key: "projectManager",
        title: "Project Manager",
        width: 150,
        render: (_, r) => r.manager?.full_name || "—",
      },
      {
        key: "feedbackType",
        title: "Feedback Type",
        width: 160,
        render: (_, r) => (
          <span className={`pr-type-badge ${typeBadgeClass(r.feedback_type)}`}>
            {r.feedback_type || "—"}
          </span>
        ),
      },
      {
        key: "ndaSigned",
        title: "NDA Signed",
        width: 100,
        render: (_, r) =>
          r.client_nda_sign
            ? <span className="pr-nda-yes">YES</span>
            : <span className="pr-nda-no">NO</span>,
      },
      {
        key: "date",
        title: "Date",
        width: 110,
        render: (_, r) => moment(r.createdAt).format("DD-MM-YYYY"),
      },
    ];

    if (userHasAccess || canEditReview || canDeleteReview) {
      base.push({
        key: "actions",
        title: "Actions",
        width: 170,
        render: (_, record) => (
          <RowActions
            actions={[
              {
                key: "view",
                label: "View Feedback",
                icon: <EyeOutlined />,
                onClick: () => {
                  setSelectedReviewId(record._id);
                  setFormModalMode("view");
                  setFormModalOpen(true);
                },
              },
              {
                key: "details",
                label: "Action Details",
                icon: <FileTextOutlined />,
                onClick: () => history.push(`/${companySlug}/add/reviewForm-action-details/${record._id}`),
              },
              {
                key: "url",
                label: record.feedback_type === "Clutch Review" ? "View on Clutch" : "Open Review URL",
                icon: <LinkOutlined />,
                hidden: !record.review_url,
                onClick: () => window.open(record.review_url, "_blank", "noopener,noreferrer"),
              },
              {
                key: "edit",
                label: "Edit",
                icon: <EditActionIcon />,
                hidden: !canEditReview,
                onClick: () => {
                  setSelectedReviewId(record._id);
                  setFormModalMode("edit");
                  setFormModalOpen(true);
                },
              },
              {
                key: "delete",
                label: "Delete",
                icon: <DeleteActionIcon />,
                danger: true,
                hidden: !canDeleteReview,
                confirm: "Delete this review?",
                onClick: () => deleteReview(record._id),
              },
            ]}
          />
        ),
      });
    }

    return base;
  }, [userHasAccess, canEditReview, canDeleteReview, deleteReview]);

  const COLUMN_LOCKED = useMemo(() => ["project", "actions"], []);
  const { visibleKeys, saveVisibleKeys, filteredColumns, saving: savingColumns } =
    useColumnVisibility("positiveReviews", columns, [], COLUMN_LOCKED);

  if (pageLoading) return <TablePageSkeleton />;

  /* ── render ── */
  return (
    <div className="pr-page">

      {/* Header */}
      <div className="inout-header text-left">
        <h2>Positive Reviews</h2>
        {canAddReview && (
          <div className="header-btns pr-header-actions">
            <Button
              type="primary"
              className="add-btn"
              onClick={() => {
                setSelectedReviewId(null);
                setFormModalMode("add");
                setFormModalOpen(true);
              }}
            >
              <PlusOutlined /> Review
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="pr-stats-grid">
        <StatCard icon={<StarOutlined />} label="Total Reviews" value={analytics.total} color="blue" />
        <StatCard icon={<LikeOutlined />} label="Clutch Reviews" value={analytics.typeMap["Clutch Review"] || 0} color="green" />
        <StatCard icon={<CheckCircleOutlined />} label="NDA Signed" value={analytics.ndaSigned} color="orange" />
        <StatCard icon={<CalendarOutlined />} label="This Month" value={analytics.thisMonth} color="purple" />
      </div>

      {/* Charts */}
      <div className="pr-charts-grid">
        <div className="pr-chart-card">
          <div className="pr-chart-title">Feedback Type Distribution</div>
          <div className="pr-chart-sub">Breakdown by review category</div>
          {analytics.total === 0 ? (
            <NoGraphFound />
          ) : (
            <ReactApexChart
              type="donut"
              series={donutSeries.length ? donutSeries : [1]}
              options={donutOptions}
              height={260}
            />
          )}
        </div>
        <div className="pr-chart-card">
          <div className="pr-chart-title">Monthly Trend</div>
          <div className="pr-chart-sub">Reviews submitted over the last 6 months</div>
          {analytics.total === 0 ? (
            <NoGraphFound />
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
      <div className="pr-table-card">
        <div className="pr-table-header">
          <div className="pr-table-title">
            All Reviews
            <span style={{ marginLeft: 8, fontSize: 13, color: "#8c8c8c", fontWeight: 400 }}>
              ({pagination.total || 0})
            </span>
          </div>
          <div className="pr-table-toolbar">
            <GenericFilterComponent
              onFilterChange={onFilterChange}
              containerClassName="pr-filter-container"
              triggerButtonClassName="pr-filter-trigger"
              className="filter-btn"
            />
            <ColumnSelector columns={columns} visibleKeys={visibleKeys} alwaysVisibleKeys={COLUMN_LOCKED} onSave={saveVisibleKeys} saving={savingColumns} />
          </div>
        </div>
        <div className="main-table-wrapper">
          <Table
            loading={tableLoading}
            columns={filteredColumns}
            dataSource={reviewList}
            rowKey="_id"
            locale={{
              emptyText: <NoDataFoundIcon />,
            }}
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "25", "50", "100"],
              showTotal: (total) => `Total ${total} reviews`,
              ...pagination,
            }}
            onChange={(page) => setPagination((p) => ({ ...p, ...page }))}
            scroll={{ x: 900 }}
          />
        </div>
      </div>

      <ReviewFormModal
        open={formModalOpen}
        mode={formModalMode}
        reviewId={selectedReviewId}
        onCancel={() => {
          setFormModalOpen(false);
          setSelectedReviewId(null);
        }}
        onSuccess={(msg) => {
          message.success(msg);
          setFormModalOpen(false);
          setSelectedReviewId(null);
          getReviewList({ forceSummary: true });
        }}
      />

    </div>
  );
};

export default React.memo(PositiveReview);
