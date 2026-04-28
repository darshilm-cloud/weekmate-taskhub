/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Col, Modal, Popconfirm, Row, Table, Tooltip, message } from "antd";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
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
import { getRoles } from "../../util/hasPermission";
import GenericFilterComponent from "./PositiveReviewFilter";
import { TablePageSkeleton } from "../../components/common/SkeletonLoader";
import "./PositiveReview.css";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import ReviewFormModal from "./ReviewFormModal";

/* ── constants ─────────────────────────────────────────────── */
const companySlug = localStorage.getItem("companyDomain");
const ACCESS_ROLES = ["Admin", "PC", "TL", "AM"];
const ADMIN_ROLES = ["Admin", "PC", "Admin", "AM"];

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
  const dispatch = useDispatch();

  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });
  const [allReviews, setAllReviews] = useState([]);

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
  const canAddReview = useMemo(() => getRoles(ADMIN_ROLES), []);

  /* ── fetch all for analytics ── */
  const fetchAllForAnalytics = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getReviewList,
        body: { pageNo: 1, limit: 1000 },
      });
      if (Array.isArray(response?.data?.data)) {
        setAllReviews(response.data.data);
      }
    } catch (error) {
      console.error("Analytics fetch error:", error);
    }
  }, []);

  /* ── fetch paginated table ── */
  const getReviewList = useCallback(async () => {
    try {
      setTableLoading(true);
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getReviewList,
        body: {
          pageNo: pagination.current,
          limit: pagination.pageSize,
          project_id: selectedProject,
          technology,
          manager_id: manager,
          // acc_manager_id: accontManager, // AM hidden
          feedback_type: feedBackTypeFilter,
        },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        setReviewList(response.data.data);
        setPagination((p) => ({ ...p, total: response.data.metadata?.total || 0 }));
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    } finally {
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
        getReviewList();
        fetchAllForAnalytics();
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch, getReviewList, fetchAllForAnalytics]);

  useEffect(() => { fetchAllForAnalytics(); }, [fetchAllForAnalytics]);
  useEffect(() => { getReviewList(); }, [getReviewList]);

  /* ── analytics ── */
  const analytics = useMemo(() => {
    if (!Array.isArray(allReviews)) return { total: 0, ndaSigned: 0, thisMonth: 0, typeMap: {}, monthlyMap: {} };
    const total = allReviews.length;
    const ndaSigned = allReviews.filter((r) => r.client_nda_sign).length;
    const thisMonth = allReviews.filter((r) =>
      moment(r.createdAt).isSame(moment(), "month")
    ).length;

    const typeMap = {};
    allReviews.forEach((r) => {
      const t = r.feedback_type || "Other";
      typeMap[t] = (typeMap[t] || 0) + 1;
    });

    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      monthlyMap[moment().subtract(i, "months").format("DD-MM-YYYY")] = 0;
    }
    allReviews.forEach((r) => {
      const key = moment(r.createdAt).format("DD-MM-YYYY");
      if (key in monthlyMap) monthlyMap[key]++;
    });

    return { total, ndaSigned, thisMonth, typeMap, monthlyMap };
  }, [allReviews]);

  const isDark = document.body.classList.contains("dark-theme") ||
    document.body.getAttribute("data-theme") === "dark";
  const chartTextColor = isDark ? "#ffffff" : "#64748b";
  const chartGridColor = isDark ? "#1e3352" : "#f1f5f9";

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
    colors: ["#2563eb", "#7c3aed", "#16a34a", "#ea580c", "#dc2626", "#0891b2"],
    legend: { position: "bottom", fontSize: "12px", labels: { colors: chartTextColor } },
    plotOptions: { pie: { donut: { size: "65%" } } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => `${v} reviews` } },
  }), [donutLabels, chartTextColor]);

  const barSeries = [{ name: "Reviews", data: Object.values(analytics.monthlyMap) }];
  const barOptions = useMemo(() => ({
    chart: { type: "bar", fontFamily: "inherit", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
    colors: ["#2563eb"],
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
        title: "Project",
        width: 180,
        render: (_, r) => (
          <span className="pr-project-chip">{r.project?.title || "—"}</span>
        ),
      },
      {
        title: "Client",
        width: 130,
        render: (_, r) => <span style={{ fontWeight: 500 }}>{r.client_name || "—"}</span>,
      },
      {
        title: "Account Manager",
        width: 150,
        render: (_, r) => r.acc_manager?.full_name || "—",
      },
      {
        title: "Project Manager",
        width: 150,
        render: (_, r) => r.manager?.full_name || "—",
      },
      {
        title: "Feedback Type",
        width: 160,
        render: (_, r) => (
          <span className={`pr-type-badge ${typeBadgeClass(r.feedback_type)}`}>
            {r.feedback_type || "—"}
          </span>
        ),
      },
      {
        title: "NDA Signed",
        width: 100,
        render: (_, r) =>
          r.client_nda_sign
            ? <span className="pr-nda-yes">YES</span>
            : <span className="pr-nda-no">NO</span>,
      },
      {
        title: "Date",
        width: 110,
        render: (_, r) => moment(r.createdAt).format("DD-MM-YYYY"),
      },
    ];

    if (userHasAccess) {
      base.push({
        title: "Actions",
        width: 170,
        render: (_, record) => (
          <div className="pr-action-row">
            <Tooltip title="View feedback">
              <button
                className="pr-action-btn view"
                onClick={() => {
                  setSelectedReviewId(record._id);
                  setFormModalMode("view");
                  setFormModalOpen(true);
                }}
              >
                <EyeOutlined />
              </button>
            </Tooltip>
            <Tooltip title="Action details">
              <Link to={`/${companySlug}/add/reviewForm-action-details/${record._id}`}>
                <button className="pr-action-btn view"><FileTextOutlined /></button>
              </Link>
            </Tooltip>
            {record.review_url && (
              <Tooltip title={record.feedback_type === "Clutch Review" ? "View on Clutch" : "Open Review URL"}>
                <a href={record.review_url} target="_blank" rel="noopener noreferrer">
                  <button className="pr-action-btn clutch"><LinkOutlined /></button>
                </a>
              </Tooltip>
            )}
            <Tooltip title="Edit">
              <button
                className="pr-action-btn edit"
                onClick={() => {
                  setSelectedReviewId(record._id);
                  setFormModalMode("edit");
                  setFormModalOpen(true);
                }}
              >
                <EditOutlined />
              </button>
            </Tooltip>
            <Popconfirm
              icon={<QuestionCircleOutlined style={{ color: "red" }} />}
              title="Delete this review?"
              onConfirm={() => deleteReview(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete">
                <button className="pr-action-btn delete"><DeleteOutlined /></button>
              </Tooltip>
            </Popconfirm>
          </div>
        ),
      });
    }

    return base;
  }, [userHasAccess, deleteReview]);

  if (pageLoading) return <TablePageSkeleton />;

  /* ── render ── */
  return (
    <div className="pr-page">

      {/* Header */}
      <div className="pr-header">
        <h1 className="pr-title">Positive Reviews</h1>
        {canAddReview && (
          <div className="pr-header-actions">
            <Button
              type="primary"
              onClick={() => {
                setSelectedReviewId(null);
                setFormModalMode("add");
                setFormModalOpen(true);
              }}
            >
              <PlusOutlined /> Add Review
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
      {analytics.total > 0 && (
        <div className="pr-charts-grid">
          <div className="pr-chart-card">
            <div className="pr-chart-title">Feedback Type Distribution</div>
            <div className="pr-chart-sub">Breakdown by review category</div>
            <ReactApexChart
              type="donut"
              series={donutSeries.length ? donutSeries : [1]}
              options={donutOptions}
              height={260}
            />
          </div>
          <div className="pr-chart-card">
            <div className="pr-chart-title">Monthly Trend</div>
            <div className="pr-chart-sub">Reviews submitted over the last 6 months</div>
            <ReactApexChart
              type="bar"
              series={barSeries}
              options={barOptions}
              height={260}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="pr-table-card">
        <div className="pr-table-header">
          <div className="pr-table-title">
            All Reviews
            <span style={{ marginLeft: 8, fontSize: 13, color: "#94a3b8", fontWeight: 400 }}>
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
          </div>
        </div>
        <div className="main-table-wrapper">
          <Table
            loading={tableLoading}
            columns={columns}
            dataSource={reviewList}
            rowKey="_id"
            locale={{
              emptyText: <NoDataFoundIcon />,
            }}
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "25", "30"],
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
          getReviewList();
          fetchAllForAnalytics();
        }}
      />

    </div>
  );
};

export default React.memo(PositiveReview);
