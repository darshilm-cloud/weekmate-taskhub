/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useRef, useEffect, useState } from "react";
import moment from "moment";
import { Tooltip } from "antd";
import "./gantt.css";

const DAY_PX = 40;
const LEFT_W = 272;

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
function parseDate(d) { if (!d) return null; const m = moment(d); return m.isValid() ? m.startOf("day") : null; }
function buildRange(s, e) { const r = [], c = s.clone(); while (c.isSameOrBefore(e, "day")) { r.push(c.clone()); c.add(1, "day"); } return r; }

function initials(name) {
  if (!name || name === "Unassigned") return "?";
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

const AV_COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#f97316"];
function avColor(name) {
  if (!name) return "#9ca3af";
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

export default function TasksGanttView({ tasks = [], onTaskClick }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(null);

  const flat = useMemo(() => {
    const r = [];
    tasks.forEach(({ workflowStatus: ws, tasks: list = [] }) =>
      list.forEach(t => r.push({ ...t, _stTitle: ws?.title, _stColor: ws?.color || "#64748b" }))
    );
    return r;
  }, [tasks]);

  const { start, days } = useMemo(() => {
    let lo = null, hi = null;
    flat.forEach(t => {
      const s = parseDate(t.start_date) || parseDate(t.created_at);
      const e = parseDate(t.due_date);
      if (s && (!lo || s.isBefore(lo))) lo = s.clone();
      if (e && (!hi || e.isAfter(hi))) hi = e.clone();
    });
    if (!lo) lo = moment().startOf("day").subtract(7, "days");
    if (!hi) hi = moment().startOf("day").add(30, "days");
    const s = lo.clone().subtract(3, "days");
    const e = hi.clone().add(5, "days");
    return { start: s, days: buildRange(s, e) };
  }, [flat]);

  const total = days.length;
  const totalW = total * DAY_PX;

  const todayOff = useMemo(() => clamp(moment().startOf("day").diff(start, "days"), 0, total - 1) * DAY_PX, [start, total]);

  useEffect(() => { if (ref.current) ref.current.scrollLeft = Math.max(0, todayOff - 300); }, [todayOff]);

  const sections = useMemo(() => {
    const m = new Map();
    tasks.forEach(b => {
      const id = b.workflowStatus?._id || "x";
      m.set(id, { id, title: b.workflowStatus?.title || "Unknown", color: b.workflowStatus?.color || "#64748b", tasks: b.tasks || [] });
    });
    return [...m.values()];
  }, [tasks]);

  const monthGroups = useMemo(() => {
    const g = []; let cur = null;
    days.forEach((d, i) => {
      const k = d.format("MMM YYYY");
      if (!cur || cur.k !== k) { cur = { k, label: d.format("MMMM YYYY"), count: 1 }; g.push(cur); } else cur.count++;
    });
    return g;
  }, [days]);

  function pos(task) {
    let s = parseDate(task.start_date) || parseDate(task.created_at);
    let e = parseDate(task.due_date);
    if (!s && !e) return null;
    if (!s) s = e.clone().subtract(7, "days");
    if (!e) e = s.clone().add(7, "days");
    const left = clamp(s.diff(start, "days"), 0, total) * DAY_PX;
    const maxW = (total - clamp(s.diff(start, "days"), 0, total)) * DAY_PX;
    return { left, width: Math.min(Math.max(e.diff(s, "days"), 1) * DAY_PX, maxW), s, e };
  }

  if (flat.length === 0) return (
    <div className="gt-empty">
      <span className="gt-empty-ico"><i className="fa-regular fa-calendar-xmark" /></span>
      <strong>No tasks to display</strong>
      <p>Add start or due dates to your tasks to see them here.</p>
    </div>
  );

  return (
    <div className="gt-wrap">
      <div className="gt-scroll" ref={ref}>

        {/* ── HEADER ── */}
        <div className="gt-header" style={{ minWidth: LEFT_W + totalW }}>

          {/* month row */}
          <div className="gt-mrow">
            <div className="gt-lhd gt-lhd-m"><span>TASKS</span></div>
            <div className="gt-mtrack" style={{ width: totalW }}>
              {monthGroups.map(g => (
                <div key={g.k} className="gt-mcell" style={{ width: g.count * DAY_PX }}>
                  <span>{g.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* day row */}
          <div className="gt-drow">
            <div className="gt-lhd gt-lhd-d" />
            <div className="gt-dtrack" style={{ width: totalW }}>
              {days.map((d, i) => {
                const isToday = d.isSame(moment(), "day");
                const isWknd = d.day() === 0 || d.day() === 6;
                return (
                  <div key={i} className={`gt-dcell${isWknd ? " wknd" : ""}${isToday ? " tday" : ""}`} style={{ width: DAY_PX }}>
                    {isToday
                      ? <span className="gt-today-circle">{d.format("D")}</span>
                      : <span className="gt-dnum">{d.format("D")}</span>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="gt-body" style={{ minWidth: LEFT_W + totalW }}>

          {/* today line */}
          <div className="gt-tline" style={{ left: LEFT_W + todayOff + DAY_PX / 2 }} />

          {sections.map(sec => (
            <React.Fragment key={sec.id}>

              {/* section header */}
              <div className="gt-sec">
                <div className="gt-lcell gt-sec-lc" style={{ borderLeft: `3px solid ${sec.color}` }}>
                  <span className="gt-sec-dot" style={{ background: sec.color }} />
                  <span className="gt-sec-name">{sec.title}</span>
                  <span className="gt-sec-ct" style={{ background: sec.color + "18", color: sec.color }}>{sec.tasks.length}</span>
                </div>
                <div className="gt-sec-track" style={{ width: totalW }} />
              </div>

              {/* task rows */}
              {sec.tasks.map(task => {
                const p = pos(task);
                const pct = parseInt(task.task_progress) || 0;
                const overdue = task.due_date && moment(task.due_date).isBefore(moment(), "day") && task._stTitle?.toLowerCase() !== "done";
                const avs = task.assignees?.filter(a => a.full_name) || [];

                return (
                  <div
                    key={task._id}
                    className={`gt-trow${hovered === task._id ? " gt-hvr" : ""}`}
                    onMouseEnter={() => setHovered(task._id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => onTaskClick?.(task)}
                  >
                    {/* left panel */}
                    <div className="gt-lcell gt-task-lc">
                      <div className="gt-task-txt">
                        <div className="gt-tname" title={task.title}>{task.title}</div>
                        <div className="gt-tmeta">
                          {avs.length > 0 ? (
                            <div className="gt-avs">
                              {avs.slice(0, 3).map((a, i) => (
                                <span key={i} className="gt-av" style={{ background: avColor(a.full_name) }} title={a.full_name}>
                                  {initials(a.full_name)}
                                </span>
                              ))}
                              {avs.length > 3 && <span className="gt-av gt-av-x">+{avs.length - 3}</span>}
                            </div>
                          ) : <span className="gt-noav">Unassigned</span>}
                          {overdue && <span className="gt-late">Late</span>}
                          {pct > 0 && <span className="gt-pct">{pct}%</span>}
                        </div>
                      </div>
                    </div>

                    {/* track */}
                    <div className="gt-track" style={{ width: totalW }}>
                      {p && (
                        <Tooltip
                          overlayClassName="gt-tip"
                          placement="top"
                          title={
                            <div className="gt-tip-box">
                              <div className="gt-tip-name">{task.title}</div>
                              <div className="gt-tip-row"><i className="fa-regular fa-calendar" /> {p.s.format("MMM D")} – {p.e.format("MMM D, YYYY")}</div>
                              {avs.length > 0 && <div className="gt-tip-row"><i className="fa-regular fa-user" /> {avs.map(a => a.full_name).join(", ")}</div>}
                              <div className="gt-tip-bar-row">
                                <span>{pct}% done</span>
                                <div className="gt-tip-bar"><div style={{ width: `${pct}%`, background: sec.color }} /></div>
                              </div>
                              {overdue && <div className="gt-tip-late">⚠ Overdue</div>}
                            </div>
                          }
                        >
                          <div
                            className={`gt-bar${overdue ? " gt-bar-late" : ""}`}
                            style={{ left: p.left, width: p.width, "--c": sec.color }}
                          >
                            <div className="gt-bar-fill" style={{ width: `${pct}%` }} />
                            {p.width > 60 && <span className="gt-bar-lbl">{task.title}</span>}
                          </div>
                        </Tooltip>
                      )}
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
