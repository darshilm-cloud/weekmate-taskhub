import React from "react";
import "../../assets/css/skeleton.css";

/* ── Primitive blocks ── */
const Sk = ({ w, h = 14, r = 6, style, className = "" }) => (
  <span
    className={`sk-block ${className}`}
    style={{ width: w, height: h, borderRadius: r, ...style }}
  />
);

export const SkeletonBlock = Sk;

/* ── Reusable row of lines ── */
const SkLines = ({ lines = 2, widths }) => (
  <>
    {Array.from({ length: lines }, (_, i) => (
      <Sk key={i} w={widths ? widths[i] : "100%"} h={13} />
    ))}
  </>
);

/* ──────────────────────────────────────────────
   STAT CARD ROW  (shared by Dashboard, Complaints, PositiveReview)
────────────────────────────────────────────── */
const StatCardRow = ({ count = 4 }) => (
  <div className="sk-stat-row">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="sk-stat-card">
        <Sk className="sk-stat-icon" w={44} h={44} r={10} />
        <div className="sk-stat-body">
          <Sk w="60%" h={12} />
          <Sk w="40%" h={22} />
        </div>
      </div>
    ))}
  </div>
);

/* ──────────────────────────────────────────────
   CHARTS ROW  (2 charts side by side)
────────────────────────────────────────────── */
const ChartsRow = () => (
  <div className="sk-charts-row">
    {[0, 1].map((i) => (
      <div key={i} className="sk-chart-card">
        <Sk w="45%" h={14} />
        <Sk className="sk-chart-area" w="100%" h={200} r={8} />
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((j) => (
            <Sk key={j} w={60} h={10} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

/* ──────────────────────────────────────────────
   TABLE SKELETON
   cols: array of flex widths e.g. ["2fr","1fr","1fr","1fr","1fr","0.7fr"]
   rows: number of data rows
────────────────────────────────────────────── */
export const TableSk = ({ cols = 6, rows = 7, colStyle }) => {
  const colCount = typeof cols === "number" ? cols : cols.length;
  const gridCols =
    typeof cols === "number"
      ? `repeat(${colCount}, 1fr)`
      : cols.join(" ");

  return (
    <div className="sk-table-card">
      {/* toolbar */}
      <div className="sk-table-toolbar">
        <Sk w={180} h={30} r={8} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Sk w={90} h={30} r={8} />
          <Sk w={90} h={30} r={8} />
        </div>
      </div>
      {/* header */}
      <div
        className="sk-table-header"
        style={{ gridTemplateColumns: gridCols, columnGap: 16 }}
      >
        {Array.from({ length: colCount }, (_, i) => (
          <Sk key={i} w="70%" h={12} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="sk-table-row"
          style={{ gridTemplateColumns: gridCols, columnGap: 16 }}
        >
          {Array.from({ length: colCount }, (_, c) => {
            const w = c === 0 ? "85%" : c === colCount - 1 ? 60 : "70%";
            return <Sk key={c} w={w} h={12} />;
          })}
        </div>
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────
   DASHBOARD SKELETON
────────────────────────────────────────────── */
export const DashboardSkeleton = () => (
  <div className="sk-page">
    <StatCardRow count={4} />
    <div className="sk-dashboard-columns">
      {/* left */}
      <div className="sk-dashboard-col">
        <div className="sk-card">
          <Sk w="40%" h={14} style={{ marginBottom: 12 }} />
          <Sk w="100%" h={220} r={8} />
        </div>
        <div className="sk-card">
          <Sk w="35%" h={14} style={{ marginBottom: 12 }} />
          <Sk w="100%" h={180} r={8} />
        </div>
      </div>
      {/* right */}
      <div className="sk-dashboard-col">
        <div className="sk-card">
          <Sk w="50%" h={14} style={{ marginBottom: 14 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <Sk w={32} h={32} r={6} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Sk w="70%" h={11} />
                <Sk w="45%" h={10} />
              </div>
              <Sk w={50} h={20} r={10} />
            </div>
          ))}
        </div>
        <div className="sk-card">
          <Sk w="40%" h={14} style={{ marginBottom: 14 }} />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}
            >
              <Sk w={28} h={28} r="50%" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Sk w="65%" h={11} />
                <Sk w="40%" h={10} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    {/* bottom section */}
    <div className="sk-charts-row">
      <div className="sk-card">
        <Sk w="40%" h={14} style={{ marginBottom: 14 }} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}>
            <Sk w={36} h={36} r={8} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <Sk w="75%" h={11} />
              <Sk w={120} h={10} />
            </div>
            <Sk w={40} h={20} r={4} />
          </div>
        ))}
      </div>
      <div className="sk-card">
        <Sk w="35%" h={14} style={{ marginBottom: 14 }} />
        <Sk w="100%" h={160} r={8} />
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   TABLE-PAGE SKELETON  (stats + charts + table)
   Used by: Complaints, PositiveReview
────────────────────────────────────────────── */
export const TablePageSkeleton = () => (
  <div className="sk-page">
    <StatCardRow count={4} />
    <ChartsRow />
    <TableSk
      cols={["2fr", "1.5fr", "1.5fr", "1fr", "1fr", "0.8fr"]}
      rows={7}
    />
  </div>
);

/* ──────────────────────────────────────────────
   SIMPLE TABLE SKELETON
   Used by: ActivityLogs, Bugs, TrashModule
────────────────────────────────────────────── */
export const SimpleTableSkeleton = ({ rows = 8, cols = 5 }) => (
  <div className="sk-page">
    <TableSk cols={cols} rows={rows} />
  </div>
);

/* ──────────────────────────────────────────────
   TASK PAGE SKELETON  (list / kanban / calendar)
────────────────────────────────────────────── */
const TaskListSkeleton = () => (
  <>
    <div className="sk-task-list-header">
      {["45%", "60%", "55%", "50%"].map((w, i) => (
        <Sk key={i} w={w} h={11} />
      ))}
    </div>
    {["Today", "Overdue", "Upcoming"].map((section) => (
      <div key={section} className="sk-task-list-section">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Sk w={70} h={13} r={4} />
          <Sk w={24} h={18} r={10} />
        </div>
        {Array.from({ length: section === "Today" ? 2 : section === "Overdue" ? 1 : 3 }, (_, i) => (
          <div key={i} className="sk-task-list-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Sk w={16} h={16} r={4} />
              <Sk w={28} h={28} r="50%" />
              <Sk w="65%" h={12} />
            </div>
            <Sk w="70%" h={11} />
            <Sk w="60%" h={11} />
            <Sk w={80} h={22} r={20} />
          </div>
        ))}
      </div>
    ))}
  </>
);

const TaskKanbanSkeleton = () => (
  <div className="sk-kanban-cols">
    {[3, 2, 4, 2].map((cardCount, col) => (
      <div key={col} className="sk-kanban-col">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Sk w={80} h={13} />
          <Sk w={24} h={18} r={10} />
        </div>
        {Array.from({ length: cardCount }, (_, i) => (
          <div key={i} className="sk-kanban-card">
            <Sk w="80%" h={12} />
            <Sk w="55%" h={10} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <Sk w={60} h={10} />
              <Sk w={28} h={28} r="50%" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const TaskCalendarSkeleton = () => {
  const days = Array.from({ length: 35 });
  return (
    <>
      <div className="sk-cal-toolbar">
        <Sk w={28} h={28} r={6} />
        <Sk w={120} h={16} />
        <Sk w={28} h={28} r={6} />
        <Sk w={70} h={28} r={6} />
        <div className="sk-cal-mode-btns">
          {[60, 55, 45].map((w, i) => (
            <Sk key={i} w={w} h={28} r={6} />
          ))}
        </div>
      </div>
      <div className="sk-cal-weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            style={{
              padding: "6px 8px",
              background: "var(--app-surface-2, var(--app-bg))",
              border: "1px solid var(--app-border)",
            }}
          >
            <Sk w={28} h={11} />
          </div>
        ))}
      </div>
      <div className="sk-cal-grid">
        {days.map((_, i) => (
          <div key={i} className="sk-cal-cell">
            <Sk w={20} h={11} />
            {i % 4 === 0 && <Sk w="80%" h={20} r={4} />}
            {i % 7 === 2 && <Sk w="70%" h={20} r={4} />}
            {i % 9 === 0 && <Sk w="75%" h={20} r={4} />}
          </div>
        ))}
      </div>
    </>
  );
};

export const TaskPageSkeleton = ({ view = "calendar" }) => (
  <div className="sk-page">
    {/* topbar */}
    <div className="sk-task-topbar">
      <Sk w={60} h={22} />
      <div className="sk-task-topbar-right">
        <Sk w={200} h={32} r={8} />
        <Sk w={100} h={32} r={8} />
        <Sk w={90} h={32} r={8} />
        <Sk w={110} h={32} r={8} />
        <Sk w={100} h={32} r={8} />
      </div>
    </div>
    {/* tabs bar */}
    <div className="sk-task-tabsbar">
      {[55, 65, 78].map((w, i) => (
        <Sk key={i} w={w} h={30} r={6} />
      ))}
      <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
        <Sk w={120} h={30} r={8} />
        <Sk w={80} h={20} r={4} />
      </div>
    </div>
    {/* content area */}
    {view === "list"     && <TaskListSkeleton />}
    {view === "kanban"   && <TaskKanbanSkeleton />}
    {view === "calendar" && <TaskCalendarSkeleton />}
  </div>
);

/* ──────────────────────────────────────────────
   USER DASHBOARD SKELETON
────────────────────────────────────────────── */
export const UserDashboardSkeleton = () => (
  <div className="sk-page">
    {/* header */}
    <div className="sk-ud-header">
      <Sk w={64} h={64} r="50%" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <Sk w={160} h={16} />
        <Sk w={110} h={12} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[80, 90, 75].map((w, i) => <Sk key={i} w={w} h={30} r={8} />)}
      </div>
    </div>
    {/* tabs */}
    <div className="sk-ud-tabs">
      {[60, 55, 65, 70].map((w, i) => <Sk key={i} w={w} h={30} r={6} />)}
    </div>
    {/* stat cards */}
    <div className="sk-ud-stats-row">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="sk-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Sk w="55%" h={12} />
          <Sk w="40%" h={24} />
          <Sk w="75%" h={10} />
        </div>
      ))}
    </div>
    {/* charts */}
    <div className="sk-ud-charts-row">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="sk-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Sk w="50%" h={13} />
          <Sk w="100%" h={160} r={8} />
        </div>
      ))}
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   REPORTS SKELETON
────────────────────────────────────────────── */
export const ReportsSkeleton = () => (
  <div className="sk-page">
    <div className="sk-card">
      <div className="sk-reports-header">
        <Sk w={180} h={18} />
        <div style={{ display: "flex", gap: 8 }}>
          {[90, 90, 90].map((w, i) => <Sk key={i} w={w} h={30} r={8} />)}
        </div>
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="sk-reports-chart-row">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Sk w="40%" h={14} />
            <Sk w="100%" h={240} r={8} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Sk w="40%" h={14} />
            <Sk w="100%" h={240} r={8} />
          </div>
        </div>
        <TableSk cols={["2fr", "1.5fr", "1fr", "1fr", "1fr", "1fr", "0.8fr"]} rows={6} />
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   REPORTS DETAIL SKELETON (ReportsHub /reports/:reportKey)
────────────────────────────────────────────── */
export const ReportsDetailSkeleton = () => (
  <div className="sk-page">
    {/* filters */}
    <div className="sk-card" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {[150, 170, 160, 150, 150].map((w, i) => (
        <Sk key={i} w={w} h={34} r={10} />
      ))}
      <Sk w={110} h={34} r={10} style={{ marginLeft: "auto" }} />
    </div>

    {/* result summary */}
    <div className="sk-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--app-border, #e8ecf0)",
            borderRadius: 12,
            background: "var(--app-surface, #fff)",
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Sk w={44} h={44} r={12} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Sk w="55%" h={12} />
            <Sk w="35%" h={22} />
          </div>
          <Sk w={60} h={28} r={999} />
        </div>
      ))}
    </div>

    {/* table */}
    <TableSk cols={["2fr", "1.5fr", "1fr", "1fr", "1fr", "1fr"]} rows={8} />
  </div>
);

/* ──────────────────────────────────────────────
   REPORTS HUB SKELETON  (cards grid)
────────────────────────────────────────────── */
export const ReportsHubSkeleton = () => (
  <div className="sk-page">
    <div className="sk-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Sk w={140} h={22} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <Sk w={160} h={34} r={10} />
        <Sk w={120} h={34} r={10} />
      </div>
    </div>

    <div
      className="sk-card"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 14,
        padding: 16,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--app-border, #e8ecf0)",
            borderRadius: 14,
            padding: 16,
            background: "var(--app-surface, #fff)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Sk w={44} h={44} r={12} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Sk w="70%" h={14} />
            <Sk w="45%" h={12} />
          </div>
          <Sk w={70} h={28} r={999} style={{ opacity: 0.6 }} />
          <Sk
            w={120}
            h={120}
            r="50%"
            style={{
              position: "absolute",
              right: -50,
              bottom: -55,
              opacity: 0.25,
            }}
          />
        </div>
      ))}
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   PROJECT LIST SKELETON  (grid cards)
────────────────────────────────────────────── */
export const ProjectListSkeleton = () => (
  <div className="sk-page">
    <div className="sk-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Sk w={130} h={22} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <Sk w={220} h={34} r={10} />
        <Sk w={110} h={34} r={10} />
        <Sk w={110} h={34} r={10} />
        <Sk w={120} h={34} r={10} />
      </div>
    </div>

    <div
      className="sk-card"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 14,
        padding: 16,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--app-border, #e8ecf0)",
            borderRadius: 14,
            padding: 16,
            background: "var(--app-surface, #fff)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sk w={18} h={18} r="50%" />
            <Sk w={70} h={22} r={999} />
            <Sk w={120} h={10} style={{ marginLeft: "auto" }} />
          </div>
          <Sk w="55%" h={16} />
          <Sk w="35%" h={12} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, paddingTop: 8 }}>
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Sk w={3} h={22} r={3} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <Sk w="45%" h={10} />
                  <Sk w="30%" h={14} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
            <Sk w={150} h={22} r={999} />
            <Sk w={64} h={64} r="50%" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   BUGS SKELETON  (table view with toolbar)
────────────────────────────────────────────── */
export const BugsSkeleton = () => (
  <div className="sk-page">
    <div className="sk-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Sk w={220} h={32} r={8} />
        <Sk w={100} h={32} r={8} />
        <Sk w={100} h={32} r={8} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Sk w={90} h={32} r={8} />
          <Sk w={80} h={32} r={8} />
        </div>
      </div>
    </div>
    <TableSk cols={["2fr", "1fr", "1fr", "1fr", "1fr", "0.8fr"]} rows={8} />
  </div>
);

/* ──────────────────────────────────────────────
   BUGS KANBAN SKELETON
   5 columns matching: Open, In Progress, To be Tested, On Hold, Closed
────────────────────────────────────────────── */
const BUG_COLS = [
  { color: "#3b82f6", cards: [1, 2] },
  { color: "#f59e0b", cards: [2, 1] },
  { color: "#22c55e", cards: [] },
  { color: "#8b5cf6", cards: [1] },
  { color: "#ef4444", cards: [] },
];

const BugKanbanCard = ({ color }) => (
  <div style={{
    background: "var(--app-surface-2, #fff)",
    border: "1px solid var(--app-border, #e8ecf0)",
    borderLeft: `3px solid ${color}`,
    borderRadius: 8,
    padding: "12px 14px",
    marginBottom: 8,
    display: "flex",
    flexDirection: "column",
    gap: 7,
  }}>
    <Sk w="75%" h={12} />
    <Sk w="40%" h={10} />
    <Sk w="55%" h={10} />
    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--app-border, #f0f0f0)" }}>
      <Sk w="45%" h={10} />
      <Sk w={30} h={10} />
    </div>
  </div>
);

export const BugsKanbanSkeleton = () => (
  <div className="sk-page">
    {/* toolbar */}
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
      <Sk w={220} h={32} r={8} />
      <Sk w={100} h={32} r={8} />
      <Sk w={100} h={32} r={8} />
      <Sk w={90} h={32} r={8} />
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <Sk w={90} h={32} r={8} />
        <Sk w={80} h={32} r={8} />
      </div>
    </div>
    {/* kanban columns */}
    <div style={{ display: "flex", gap: 14, overflowX: "auto" }}>
      {BUG_COLS.map(({ color, cards }, i) => (
        <div key={i} style={{
          minWidth: 272,
          maxWidth: 272,
          flex: "0 0 272px",
          background: "var(--app-surface-2, #fff)",
          border: "1px solid var(--app-border, #e5e7eb)",
          borderTop: `4px solid ${color}`,
          borderRadius: 10,
          overflow: "hidden",
        }}>
          {/* column header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px 11px",
            borderBottom: "1px solid var(--app-border, #e5e7eb)",
          }}>
            <Sk w={80} h={13} style={{ background: `${color}33` }} />
            <Sk w={26} h={20} r={10} style={{ background: `${color}33` }} />
          </div>
          {/* cards */}
          <div style={{ padding: "10px 8px 4px" }}>
            {cards.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", opacity: 0.3 }}>
                <Sk w={32} h={32} r="50%" />
                <Sk w={80} h={10} style={{ marginTop: 8 }} />
              </div>
            ) : (
              cards.map((_, j) => <BugKanbanCard key={j} color={color} />)
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   TRASH SKELETON
────────────────────────────────────────────── */
export const TrashSkeleton = () => (
  <div className="sk-page">
    <div className="sk-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Sk w={120} h={20} />
      <div style={{ display: "flex", gap: 8 }}>
        {[70, 80, 60, 50, 55, 60].map((w, i) => <Sk key={i} w={w} h={30} r={6} />)}
      </div>
    </div>
    <TableSk cols={["2fr", "1.5fr", "1fr", "1fr", "1fr", "0.8fr"]} rows={8} />
  </div>
);

/* ──────────────────────────────────────────────
   TRASH TABLE SKELETON  (tab-switch loading — keeps header/tabs visible)
────────────────────────────────────────────── */
export const TrashTableSkeleton = () => (
  <div style={{ padding: "4px 0" }}>
    {/* checkbox + column headers row */}
    <div style={{ display: "grid", gridTemplateColumns: "32px 2fr 1.5fr 1.2fr 1fr", gap: 16, padding: "10px 16px", borderBottom: "1px solid var(--sk-border, rgba(100,116,139,0.18))" }}>
      <Sk w={16} h={16} r={3} />
      {["70%", "60%", "55%", "50%"].map((w, i) => <Sk key={i} w={w} h={12} />)}
    </div>
    {/* data rows */}
    {Array.from({ length: 7 }, (_, r) => (
      <div key={r} style={{ display: "grid", gridTemplateColumns: "32px 2fr 1.5fr 1.2fr 1fr", gap: 16, padding: "14px 16px", borderBottom: "1px solid var(--sk-border, rgba(100,116,139,0.12))" }}>
        <Sk w={16} h={16} r={3} />
        <Sk w={`${55 + (r % 3) * 15}%`} h={13} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sk w={28} h={28} r="50%" />
          <Sk w="55%" h={12} />
        </div>
        <Sk w="65%" h={12} />
        <Sk w="60%" h={12} />
      </div>
    ))}
  </div>
);

/* ──────────────────────────────────────────────
   USERS PAGE SKELETON  (EmployeeMasterList)
   Layout: left sidebar (employee list) + right main (stat cards + charts)
────────────────────────────────────────────── */
export const UsersPageSkeleton = () => (
  <div className="sk-users-workspace">

    {/* ── Left Sidebar ── */}
    <aside className="sk-users-sidebar">
      {/* header: title + toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Sk w={110} h={14} />
        <Sk w={60} h={26} r={20} />
      </div>
      {/* search bar */}
      <Sk w="100%" h={32} r={8} />
      {/* "All Employees" row */}
      <div className="sk-users-sidebar-item">
        <Sk w={32} h={32} r="50%" />
        <Sk w="65%" h={13} />
      </div>
      {/* employee list */}
      <div className="sk-users-sidebar-list">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="sk-users-sidebar-item">
            <Sk w={34} h={34} r="50%" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <Sk w="65%" h={12} />
              <Sk w="40%" h={10} />
            </div>
          </div>
        ))}
      </div>
    </aside>

    {/* ── Main Content ── */}
    <div className="sk-users-main">
      {/* topbar */}
      <div className="sk-users-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sk w={34} h={34} r="50%" />
          <Sk w={140} h={18} />
        </div>
        <div className="sk-users-topbar-actions">
          {[110, 120, 110, 130].map((w, i) => (
            <Sk key={i} w={w} h={32} r={8} />
          ))}
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="sk-users-stat-row">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="sk-users-stat-card">
            <Sk w={44} h={44} r={10} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
              <Sk w="55%" h={22} />
              <Sk w="70%" h={11} />
            </div>
          </div>
        ))}
      </div>

      {/* 2 charts */}
      <div className="sk-users-charts-row">
        {/* Donut chart */}
        <div className="sk-users-chart-card">
          <Sk w="40%" h={14} />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Sk w={200} h={200} r="50%" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sk w={12} h={12} r="50%" />
                  <Sk w="60%" h={10} />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Bar chart */}
        <div className="sk-users-chart-card">
          <Sk w="40%" h={14} />
          <Sk w="100%" h={220} r={6} />
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {[50, 55, 52, 48].map((w, i) => (
              <Sk key={i} w={w} h={10} />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   PERMISSION PAGE SKELETON  (PermissionModule)
   Layout: 4 stat cards + sidebar (roles) + matrix panel
────────────────────────────────────────────── */
const ACTION_COLS = 5; // View, Add, Edit, Delete, Manage

export const PermissionPageSkeleton = () => (
  <div className="sk-rpm-page">

    {/* Header */}
    <Sk w={200} h={22} />

    {/* 4 stat cards */}
    <div className="sk-rpm-stats">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="sk-rpm-stat-card">
          <Sk w={40} h={40} r={8} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <Sk w="55%" h={11} />
            <Sk w="35%" h={20} />
          </div>
        </div>
      ))}
    </div>

    {/* Workspace */}
    <div className="sk-rpm-workspace">

      {/* Roles sidebar */}
      <aside className="sk-rpm-sidebar">
        <Sk w={60} h={13} />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sk w={34} h={34} r="50%" />
            <Sk w="65%" h={12} />
          </div>
        ))}
      </aside>

      {/* Permission matrix panel */}
      <div className="sk-rpm-panel">
        {/* panel header */}
        <div className="sk-rpm-panel-header">
          <Sk w="45%" h={15} />
          <Sk w="65%" h={11} />
        </div>

        {/* matrix column headers */}
        <div className="sk-rpm-matrix-header">
          <Sk w={70} h={11} />
          {Array.from({ length: ACTION_COLS }, (_, i) => (
            <div key={i} className="sk-rpm-toggle"><Sk w={44} h={11} /></div>
          ))}
        </div>

        {/* matrix rows */}
        {Array.from({ length: 7 }, (_, r) => (
          <div key={r} className="sk-rpm-matrix-row">
            {/* module cell */}
            <div className="sk-rpm-module-cell">
              <Sk w={34} h={34} r={8} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Sk w={80} h={12} />
                <Sk w={110} h={10} />
              </div>
            </div>
            {/* toggle cells */}
            {Array.from({ length: ACTION_COLS }, (_, c) => (
              <div key={c} className="sk-rpm-toggle">
                <Sk w={34} h={20} r={10} />
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  </div>
);

/* ──────────────────────────────────────────────
   TIMESHEET SKELETON COMPONENTS
────────────────────────────────────────────── */
export const TimesheetStatsSkeleton = () => (
  <div className="sk-ts-stat-inline">
    <Sk w={32} h={32} r={6} />
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <Sk w={75} h={10} />
      <Sk w={50} h={18} />
    </div>
  </div>
);

export const TimesheetChartsSkeleton = () => (
  <div className="sk-ts-charts-row" style={{ marginTop: 0 }}>
    {[180, 200, 180].map((h, i) => (
      <div key={i} className="sk-ts-chart-card">
        <Sk w="45%" h={13} />
        <Sk w="100%" h={h} r={8} />
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((j) => <Sk key={j} w={55} h={10} />)}
        </div>
      </div>
    ))}
  </div>
);

/* ──────────────────────────────────────────────
   TIMESHEET SKELETON
────────────────────────────────────────────── */
export const TimesheetSkeleton = () => (
  <div className="sk-ts-page">
    {/* header */}
    <div className="sk-ts-header">
      <Sk w={200} h={22} />
      <div className="sk-ts-header-right">
        <TimesheetStatsSkeleton />
        <Sk w={220} h={32} r={8} />
      </div>
    </div>

    {/* filters */}
    <div className="sk-ts-filters">
      {[120, 110, 120, 110, 120, 110].map((w, i) => (
        <Sk key={i} w={w} h={32} r={8} />
      ))}
    </div>

    {/* 3 charts */}
    <TimesheetChartsSkeleton />

    {/* table */}
    <TableSk cols={["2fr", "1.5fr", "1fr", "1fr", "1fr", "1fr", "0.8fr"]} rows={7} />
  </div>
);

/* ──────────────────────────────────────────────
   PROJECT EXPENSE SKELETON
────────────────────────────────────────────── */
export const ProjectExpenseSkeleton = () => (
  <div className="sk-pe-page">
    {/* header */}
    <div className="sk-pe-header">
      <Sk w={180} h={22} />
      <div className="sk-pe-header-actions">
        {[110, 120, 110].map((w, i) => <Sk key={i} w={w} h={32} r={8} />)}
      </div>
    </div>

    {/* 4 stat cards */}
    <div className="sk-pe-stats">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="sk-pe-stat-card">
          <Sk w={40} h={40} r={8} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <Sk w="55%" h={11} />
            <Sk w="70%" h={18} />
            <Sk w="45%" h={10} />
          </div>
        </div>
      ))}
    </div>

    {/* 2 charts */}
    <div className="sk-pe-charts">
      {[0, 1].map((i) => (
        <div key={i} className="sk-pe-chart-card">
          <Sk w="40%" h={13} />
          <Sk w="100%" h={200} r={8} />
          <div style={{ display: "flex", gap: 8 }}>
            {[0, 1, 2].map((j) => <Sk key={j} w={60} h={10} />)}
          </div>
        </div>
      ))}
    </div>

    {/* table */}
    <TableSk cols={["2fr", "1.5fr", "1fr", "1fr", "1fr", "0.8fr"]} rows={7} />
  </div>
);

/* ──────────────────────────────────────────────
   SETTINGS SKELETON
────────────────────────────────────────────── */
/* ──────────────────────────────────────────────
   REVIEW FORM SKELETON  (Add / Edit Review)
────────────────────────────────────────────── */
export const ReviewFormSkeleton = () => (
  <div className="sk-rf-page">
    {/* Header */}
    <div className="sk-rf-header">
      <Sk w={38} h={38} r={10} />
      <Sk w={44} h={44} r={12} />
      <div className="sk-rf-header-text">
        <Sk w={160} h={20} r={6} />
        <Sk w={240} h={13} r={5} />
      </div>
    </div>

    {/* Card */}
    <div className="sk-rf-card">
      {/* Section: Project Information */}
      <div className="sk-rf-section-title">
        <Sk w={16} h={16} r={4} />
        <Sk w={180} h={13} r={5} />
      </div>
      <div className="sk-rf-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="sk-rf-field">
            <Sk w="45%" h={11} r={4} />
            <Sk w="100%" h={40} r={8} />
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="sk-rf-divider" />

      {/* Section: Feedback Details */}
      <div className="sk-rf-section-title">
        <Sk w={16} h={16} r={4} />
        <Sk w={160} h={13} r={5} />
      </div>
      <div className="sk-rf-grid">
        <div className="sk-rf-field">
          <Sk w="45%" h={11} r={4} />
          <Sk w="100%" h={40} r={8} />
        </div>
        <div className="sk-rf-field">
          <Sk w="60%" h={11} r={4} />
          <Sk w={180} h={24} r={6} />
        </div>
      </div>
      <div className="sk-rf-field" style={{ marginTop: 12 }}>
        <Sk w="25%" h={11} r={4} />
        <Sk w="100%" h={120} r={8} />
      </div>

      {/* Actions */}
      <div className="sk-rf-actions">
        <Sk w={120} h={40} r={8} />
        <Sk w={90} h={40} r={8} />
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   NOTES PAGE SKELETON
────────────────────────────────────────────── */
const NoteSkCard = () => (
  <div className="sk-note-card">
    <Sk w="70%" h={15} r={6} />
    <Sk w="100%" h={11} r={4} />
    <Sk w="85%" h={11} r={4} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <Sk w={28} h={28} r={14} />
        <Sk w={28} h={28} r={14} />
        <Sk w={28} h={28} r={14} />
      </div>
      <Sk w={80} h={11} r={4} />
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   FILES PAGE SKELETON
────────────────────────────────────────────── */
export const FilesSkeleton = () => (
  <div style={{ display: "flex", height: "calc(100vh - 160px)" }}>
    {/* left sidebar */}
    <div className="sk-card" style={{ width: 240, borderRadius: 0, borderTop: "none", borderBottom: "none", borderLeft: "none", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
      <Sk w={110} h={32} r={6} />
      <Sk w="90%" h={32} r={6} style={{ marginTop: 4 }} />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7 }}>
          <Sk w={16} h={16} r={4} />
          <Sk w="65%" h={12} r={4} />
        </div>
      ))}
    </div>
    {/* right content */}
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--app-border, #e2e8f0)" }}>
        <Sk w={160} h={16} r={5} />
        <Sk w={160} h={30} r={6} />
      </div>
      {/* file card grid — 5 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, padding: 16 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="sk-card" style={{ padding: "16px 12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, borderRadius: 12 }}>
            <Sk w={48} h={56} r={6} />
            <div style={{ width: "100%", borderTop: "1px solid var(--app-border, #f1f5f9)", paddingTop: 8 }}>
              <Sk w="85%" h={11} r={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   TIME PAGE SKELETON
────────────────────────────────────────────── */
export const TimeSkeleton = () => (
  <div style={{ display: "flex", height: "calc(100vh - 160px)" }}>
    {/* left sidebar */}
    <div className="sk-card" style={{ width: 240, borderRadius: 0, borderTop: "none", borderBottom: "none", borderLeft: "none", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
      <Sk w={90} h={32} r={6} />
      {[1, 2].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--app-border, #e2e8f0)", marginTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
            <Sk w="75%" h={13} r={4} />
          </div>
          <Sk w={52} h={22} r={20} />
        </div>
      ))}
    </div>
    {/* right content */}
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--app-border, #e2e8f0)" }}>
        <Sk w={160} h={16} r={5} />
        <Sk w={80} h={30} r={6} />
      </div>
      {/* card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: 16 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="sk-card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
            {/* card header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid var(--app-border, #f1f5f9)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sk w={30} h={30} r="50%" />
                <Sk w={90} h={12} r={4} />
              </div>
              <Sk w={60} h={22} r={20} />
            </div>
            {/* card rows */}
            {[1, 2, 3, 4].map((j) => (
              <div key={j} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Sk w={55} h={10} r={4} />
                <Sk w="55%" h={10} r={4} />
              </div>
            ))}
            {/* card footer */}
            <div style={{ display: "flex", gap: 12, paddingTop: 10, borderTop: "1px solid var(--app-border, #f1f5f9)" }}>
              <Sk w={18} h={18} r={4} />
              <Sk w={18} h={18} r={4} />
              <Sk w={18} h={18} r={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const NotesSkeleton = () => (
  <div style={{ padding: "0 16px 16px" }}>
    {/* toolbar */}
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <Sk w={200} h={32} r={6} />
      <Sk w={110} h={32} r={6} />
    </div>
    {/* grid */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
      {Array.from({ length: 6 }, (_, i) => <NoteSkCard key={i} />)}
    </div>
  </div>
);

export const SettingsSkeleton = () => (
  <div className="sk-settings-page">
    {/* page header */}
    <div className="sk-settings-header">
      <Sk w={200} h={24} />
      <Sk w={300} h={13} />
    </div>

    {/* main card */}
    <div className="sk-settings-card">
      {/* tabs */}
      <div className="sk-settings-tabs">
        {[140, 130].map((w, i) => (
          <div key={i} className="sk-settings-tab">
            <Sk w={16} h={16} r={4} />
            <Sk w={w} h={13} />
          </div>
        ))}
      </div>

      <div className="sk-settings-body">
        {/* Quick Setup providers */}
        <div className="sk-settings-section">
          <Sk w={110} h={16} />
          <Sk w={220} h={12} />
          <div className="sk-settings-providers">
            {[80, 90, 70, 80, 75].map((w, i) => <Sk key={i} w={w} h={34} r={8} />)}
          </div>
        </div>

        {/* SMTP form fields */}
        <div className="sk-settings-section">
          <Sk w={150} h={16} />
          <div className="sk-settings-form-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="sk-settings-field">
                <Sk w="40%" h={11} />
                <Sk w="100%" h={36} r={8} />
              </div>
            ))}
          </div>
          {/* submit button */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <Sk w={120} h={36} r={8} />
            <Sk w={90} h={36} r={8} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   OVERVIEW SKELETON
────────────────────────────────────────────── */
export const OverviewSkeleton = () => (
  <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
    {/* top row — 3 cards */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="sk-block" style={{ borderRadius: 14, height: 160, width: "100%", background: "var(--app-surface)", border: "1px solid var(--app-border)" }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Sk w={32} h={32} r={8} />
              <Sk w="50%" h={14} />
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
              <Sk w={100} h={100} r={50} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <Sk w="90%" h={28} r={6} />
                <Sk w="90%" h={28} r={6} />
                <Sk w="90%" h={28} r={6} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
    {/* user analysis bar */}
    <div className="sk-block" style={{ borderRadius: 14, padding: 20, background: "var(--app-surface)", border: "1px solid var(--app-border)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
        <Sk w={32} h={32} r={8} />
        <Sk w={160} h={14} />
      </div>
      {[80, 60, 90, 45].map((w, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <Sk w={90} h={12} />
          <Sk w={`${w}%`} h={22} r={4} style={{ flex: 1 }} />
        </div>
      ))}
    </div>
    {/* bottom row — members + details */}
    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
      <div className="sk-block" style={{ borderRadius: 14, padding: 20, background: "var(--app-surface)", border: "1px solid var(--app-border)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <Sk w={32} h={32} r={8} />
          <Sk w={160} h={14} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[70, 80, 76, 55].map((w, i) => <Sk key={i} w={w} h={28} r={20} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 10, border: "1px solid var(--app-border)" }}>
              <Sk w={36} h={36} r={50} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Sk w={70} h={11} />
                <Sk w={55} h={18} r={10} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sk-block" style={{ borderRadius: 14, padding: 20, background: "var(--app-surface)", border: "1px solid var(--app-border)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
          <Sk w={32} h={32} r={8} />
          <Sk w={100} h={14} />
          <Sk w={60} h={28} r={8} style={{ marginLeft: "auto" }} />
        </div>
        {[100, 90, 100, 75, 85, 60].map((w, i) => (
          <Sk key={i} w={`${w}%`} h={12} style={{ marginBottom: 10 }} />
        ))}
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   DISCUSSION SKELETON
────────────────────────────────────────────── */
export const DiscussionSkeleton = () => (
  <div style={{ display: "flex", height: "100%", minHeight: 500 }}>
    {/* left sidebar */}
    <div style={{ width: 270, flexShrink: 0, borderRight: "1px solid var(--app-border)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <Sk w={80} h={32} r={6} />
        <Sk w={140} h={32} r={6} style={{ flex: 1 }} />
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--app-border)", display: "flex", flexDirection: "column", gap: 6 }}>
          <Sk w="70%" h={12} />
          <Sk w="40%" h={10} />
        </div>
      ))}
    </div>
    {/* right content */}
    <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      <Sk w={200} h={20} />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Sk w={36} h={36} r={50} style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Sk w={110} h={12} />
              <Sk w={70} h={20} r={10} />
            </div>
            <Sk w={i % 2 === 0 ? "60%" : "40%"} h={12} />
          </div>
        </div>
      ))}
      {/* editor placeholder */}
      <div style={{ marginTop: "auto", borderRadius: 8, border: "1px solid var(--app-border)", padding: 12 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[0, 1, 2, 3, 4].map((i) => <Sk key={i} w={24} h={24} r={4} />)}
        </div>
        <Sk w="100%" h={80} r={6} />
      </div>
    </div>
  </div>
);
