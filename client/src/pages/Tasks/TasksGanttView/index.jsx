/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useRef, useEffect, useState } from "react";
import moment from "moment";
import { Tooltip } from "antd";
import "./gantt.css";

const BASE_DAY_PX = 18;
// Allow wider day columns on large screens so the chart reaches the right edge.
const MAX_DAY_PX = 70;
const LEFT_W = 240;
const RIGHT_W = 170;

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
function parseDate(d) { if (!d) return null; const m = moment(d); return m.isValid() ? m.startOf("day") : null; }
function buildRange(s, e) { const r = [], c = s.clone(); while (c.isSameOrBefore(e, "day")) { r.push(c.clone()); c.add(1, "day"); } return r; }
function getLabelTitle(label) {
  if (!label) return "";
  if (typeof label === "string") return label;
  return (
    label.title ||
    label.name ||
    label.label ||
    label.label_name ||
    label.task_label?.title ||
    label.label_id?.title ||
    ""
  );
}

const BAR_COLORS = ["#a78bfa", "#f472b6", "#fb7185", "#fdba74", "#fbbf24", "#34d399", "#2dd4bf", "#60a5fa"];
function barColor(seed) {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return BAR_COLORS[Math.abs(h) % BAR_COLORS.length];
}

export default function TasksGanttView({ tasks = [], onTaskClick, rangeStart = null, rangeEnd = null }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [dayPx, setDayPx] = useState(BASE_DAY_PX);

  const sections = useMemo(() => (
    (tasks || [])
      .map(({ workflowStatus: ws, tasks: list = [] }) => ({
        key: ws?._id || ws?.title || "section",
        title: ws?.title || "Tasks",
        color: ws?.color || "#64748b",
        tasks: (list || [])
          .map((t) => ({ ...t, _stId: ws?._id, _stTitle: ws?.title, _stColor: ws?.color || "#64748b" }))
          .sort((a, b) => {
            const as = parseDate(a.start_date) || parseDate(a.created_at);
            const bs = parseDate(b.start_date) || parseDate(b.created_at);
            if (as && bs) return as.valueOf() - bs.valueOf();
            if (as) return -1;
            if (bs) return 1;
            return String(a.title || "").localeCompare(String(b.title || ""));
          }),
      }))
      .filter((s) => s.tasks.length > 0)
  ), [tasks]);

  const { start, days } = useMemo(() => {
    let lo = rangeStart ? parseDate(rangeStart) : null;
    let hi = rangeEnd ? parseDate(rangeEnd) : null;

    sections.forEach((sec) => {
      sec.tasks.forEach((t) => {
        const s = parseDate(t.start_date) || parseDate(t.created_at);
        const e = parseDate(t.due_date);
        if (s && (!lo || s.isBefore(lo))) lo = s.clone();
        if (e && (!hi || e.isAfter(hi))) hi = e.clone();
      });
    });

    if (!lo) lo = moment().startOf("day").subtract(7, "days");
    if (!hi) hi = moment().startOf("day").add(30, "days");

    const s = rangeStart ? lo.clone().startOf("day") : lo.clone().startOf("month");
    const e = rangeEnd ? hi.clone().endOf("day") : s.clone().endOf("month");

    return { start: s, days: buildRange(s, e) };
  }, [sections, rangeStart, rangeEnd]);

  const total = days.length;
  const totalW = total * dayPx;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const w = el.clientWidth || 0;
      const avail = Math.max(0, w - LEFT_W - RIGHT_W);
      // Use `ceil` so the chart reaches the right edge (avoids leftover blank space).
      const perDay = total > 0 ? Math.ceil(avail / total) : BASE_DAY_PX;
      const next = clamp(perDay || BASE_DAY_PX, BASE_DAY_PX, MAX_DAY_PX);
      setDayPx((prev) => (prev === next ? prev : next));
    };

    compute();
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(compute);
      ro.observe(el);
    }
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("resize", compute);
      if (ro) ro.disconnect();
    };
  }, [total]);

  const todayOff = useMemo(() => clamp(moment().startOf("day").diff(start, "days"), 0, total - 1) * dayPx, [start, total, dayPx]);

  useEffect(() => { if (ref.current) ref.current.scrollLeft = Math.max(0, todayOff - 300); }, [todayOff]);

  const weekGroups = useMemo(() => {
    const groups = [];
    let cur = null;
    days.forEach((d, i) => {
      const idx = Math.floor(i / 7);
      if (!cur || cur.idx !== idx) {
        cur = { idx, count: 1, label: `Week-${idx + 1}`, s: d.clone(), e: d.clone() };
        groups.push(cur);
      } else {
        cur.count += 1;
        cur.e = d.clone();
      }
    });
    return groups;
  }, [days]);

  function pos(task) {
    let s = parseDate(task.start_date) || parseDate(task.created_at);
    let e = parseDate(task.due_date);
    if (!s && !e) return null;
    if (!s) s = e.clone().subtract(7, "days");
    if (!e) e = s.clone().add(7, "days");
    const left = clamp(s.diff(start, "days"), 0, total) * dayPx;
    const maxW = (total - clamp(s.diff(start, "days"), 0, total)) * dayPx;
    return { left, width: Math.min(Math.max(e.diff(s, "days"), 1) * dayPx, maxW), s, e };
  }

  if (sections.length === 0) return (
    <div className="gt-empty">
      <span className="gt-empty-ico"><i className="fa-regular fa-calendar-xmark" /></span>
      <strong>No tasks to display</strong>
      <p>Add start or due dates to your tasks to see them here.</p>
    </div>
  );

  return (
    <div
      className="gt-wrap gt-sim"
      style={{
        "--left-w": `${LEFT_W}px`,
        "--right-w": `${RIGHT_W}px`,
        "--day-px": `${dayPx}px`,
      }}
    >
      <div className="gt-scroll" ref={ref}>

        {/* ── HEADER ── */}
        <div className="gt-header" style={{ minWidth: LEFT_W + totalW + RIGHT_W }}>
          <div className="gt-wrow">
            <div className="gt-lhd gt-lhd-w">
              <span className="gt-date-pill">{start.format("MMM D YYYY")}</span>
            </div>
              <div className="gt-wtrack" style={{ width: totalW }}>
                {weekGroups.map((g) => (
                  <div key={g.idx} className="gt-wcell" style={{ width: g.count * dayPx }}>
                    <span className="gt-wlbl">{g.label}</span>
                    <span className="gt-wdates">
                      {g.s && g.e ? `${g.s.format("MMM D")}–${g.e.format("D")}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            <div className="gt-rhd gt-rhd-w">
              <span>ASSIGNEE</span>
              <span className="gt-rhd-sub">LABELS</span>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="gt-body" style={{ minWidth: LEFT_W + totalW + RIGHT_W }}>
          {sections.map((sec) => (
            <React.Fragment key={sec.key}>
              <div className="gt-sec">
                <div className="gt-lcell gt-sec-lc">
                  <span
                    className="gt-sec-title"
                    data-gt-status={String(sec.title || "")
                      .trim()
                      .toLowerCase()
                      .replace(/\s+/g, "_")}
                    style={{ "--gt-sec-color": sec.color }}
                  >
                    {sec.title}
                  </span>
                </div>
                <div className="gt-track gt-sec-track" style={{ width: totalW }} />
                <div className="gt-rcell gt-sec-rc" />
              </div>

              {sec.tasks.map((task, idx) => {
                const p = pos(task);
                const overdue =
                  task.due_date &&
                  moment(task.due_date).isBefore(moment(), "day") &&
                  String(task._stTitle || "").toLowerCase() !== "done";
                const c = task._stColor || barColor(task._id || task.title || idx);
                const assigneeName =
                  Array.isArray(task.assignees) && task.assignees.length > 0
                    ? (task.assignees[0]?.full_name || task.assignees[0]?.name || task.assignees[0]?.email || "")
                    : "";
                const labelTitles = (task?.taskLabels || task?.task_labels || task?.labels || [])
                  .map(getLabelTitle)
                  .filter(Boolean);

                return (
                  <div
                    key={task._id || `${sec.key}-${idx}`}
                    className={`gt-trow${hovered === task._id ? " gt-hvr" : ""}`}
                    onMouseEnter={() => setHovered(task._id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <div className="gt-lcell gt-task-lc">
                      <div className="gt-task-txt">
                        <div className="gt-tname" title={task.title}>{task.title}</div>
                      </div>
                    </div>

                    <div className="gt-track" style={{ width: totalW }}>
                      {p && (
                        <Tooltip
                          overlayClassName="gt-tip"
                          placement="top"
                          title={
                              <div className="gt-tip-box">
                                <div className="gt-tip-name">{task.title}</div>
                                <div className="gt-tip-row"><i className="fa-regular fa-calendar" /> {p.s.format("MMM D")} – {p.e.format("MMM D, YYYY")}</div>
                                {overdue && <div className="gt-tip-late">⚠ Overdue</div>}
                              </div>
                            }
                          >
                          <div
                            className={`gt-bar${overdue ? " gt-bar-late" : ""}`}
                            style={{ left: p.left, width: p.width, "--c": c }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskClick?.(task);
                            }}
                          >
                          </div>
                        </Tooltip>
                      )}
                    </div>

                    <div className="gt-rcell gt-assignee-rc">
                      <span className={`gt-assign-pill${assigneeName ? "" : " gt-assign-empty"}`} title={assigneeName || "Unassigned"}>
                        {assigneeName || "—"}
                      </span>
                      <div className="gt-label-pills" title={labelTitles.join(", ")}>
                        {labelTitles.length > 0 ? (
                          labelTitles.slice(0, 2).map((t) => (
                            <span key={t} className="gt-label-pill">{t}</span>
                          ))
                        ) : (
                          <span className="gt-label-empty">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
