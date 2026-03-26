/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useRef, useEffect, useState } from "react";
import moment from "moment";
import { Tooltip } from "antd";
import BugsKanbanController from "../BugsKanbanBoard/BugsKanbanController";
import BugDetailModal from "../BugDetailModal";
import AddTimeModal from "../../../components/Modal/AddTimeModal";
import EditCommentModal from "../../../components/Modal/EditCommentModal";
import { hasPermission } from "../../../util/hasPermission";
import "../../Tasks/TasksGanttView/gantt.css";

const BASE_DAY_PX = 18;
const MAX_DAY_PX = 70;
const LEFT_W = 260;
const RIGHT_W = 220;

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}
function parseDate(d) {
  if (!d) return null;
  const m = moment(d);
  return m.isValid() ? m.startOf("day") : null;
}
function buildRange(s, e) {
  const r = [];
  const c = s.clone();
  while (c.isSameOrBefore(e, "day")) {
    r.push(c.clone());
    c.add(1, "day");
  }
  return r;
}

const BAR_COLORS = ["#a78bfa", "#f472b6", "#fb7185", "#fdba74", "#fbbf24", "#34d399", "#2dd4bf", "#60a5fa"];
function barColor(seed) {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return BAR_COLORS[Math.abs(h) % BAR_COLORS.length];
}

export default function BugsGanttView({
  tasks = [],
  showModalTaskModal,
  showEditTaskModal,
  getBoardTasks,
  boardTasksBugs,
  selectedTask,
  deleteTasks,
  projectId,
}) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [dayPx, setDayPx] = useState(BASE_DAY_PX);

  const {
    getTaskByIdDetails,
    getComment,
    modalIsOpen,
    handleCancel,
    taskDetails,
    handleTaskDelete,
    estError,
    visible,
    popOver,
    openPopOver,
    isLoggedHoursMoreThanEstimated,
    activeTab,
    comments,
    openCommentModel,
    setCommentVal,
    handleSelect,
    commentVal,
    fileAttachment,
    populatedFiles,
    removeAttachmentFile,
    foldersList,
    attachmentfileRef,
    onFileChange,
    isModalOpenTaskModal,
    onDragStart,
    handleTabChange,
    getBughistory,
    handleCancelTaskModal,
    handleTaskOps,
    formComment,
    handleComments,
    setTempBoard,
    bugWorkFlowStatusList,
    isPopoverVisible,
    setIsPopoverVisible,
    handleBugStatusClick,
    bugId,
    estHrsError,
    estMinsError,
    estHrs,
    estMins,
    selectedBugStatusTitle,
    selectedBugStatusColor,
    setSelectedBugId,
    handleCancelCommentModel,
    handleChangedescription,
    editorData,
    handlePaste,
    isEditable,
    setIsEditable,
    viewBug,
    handleViewBug,
    handleFieldClick,
    handleEstTimeViewInput,
    subscribersList,
    employeeList,
    projectLabels,
    handleSearch,
    handleSelectedItemsChange,
    handleSelectedLabelsChange,
    searchKeyword,
    taskHistory,
    taggedUserList,
    addComments,
    setTextAreaValue,
    isTextAreaFocused,
    setIsTextAreaFocused,
    textAreaValue,
    addform,
    taskdropdown,
    addInputTaskData,
    handleTaskInput,
    handleEstTimeInput,
    fileViewAttachment,
    populatedViewFiles,
    removeAttachmentViewFile,
    onFileViewChange,
    attachmentViewfileRef,
    updateviewBug,
  } = BugsKanbanController({
    tasks,
    showModalTaskModal,
    showEditTaskModal,
    getBoardTasks,
    boardTasksBugs,
    selectedTask,
    deleteTasks,
    projectId,
  });

  const sections = useMemo(() => {
    const grouped = new Map();
    (tasks || []).forEach((list) => {
      const listBugs = Array.isArray(list?.bugs) ? list.bugs : [];
      listBugs.forEach((b) => {
        const st = Array.isArray(b?.bug_status_details) ? b.bug_status_details[0] : null;
        const title = st?.title || (typeof b?.bug_status === "string" ? b.bug_status : "Bugs");
        const color = st?.color || "#64748b";
        const key = st?._id || b?.bug_status || title || "bugs";
        const sec = grouped.get(key) || { key, title, color, bugs: [] };
        sec.bugs.push({
          ...b,
          _stTitle: title,
          _stColor: color,
          _boardBugsRef: listBugs,
          _listTitle: list?.title || "",
        });
        grouped.set(key, sec);
      });
    });

    return Array.from(grouped.values())
      .map((s) => ({
        ...s,
        bugs: (s.bugs || []).sort((a, b) => {
          const as = parseDate(a.start_date) || parseDate(a.created_at) || parseDate(a.createdAt);
          const bs = parseDate(b.start_date) || parseDate(b.created_at) || parseDate(b.createdAt);
          if (as && bs) return as.valueOf() - bs.valueOf();
          if (as) return -1;
          if (bs) return 1;
          return String(a.title || "").localeCompare(String(b.title || ""));
        }),
      }))
      .filter((s) => s.bugs.length > 0);
  }, [tasks]);

  const { start, days } = useMemo(() => {
    let lo = null;
    let hi = null;
    sections.forEach((sec) => {
      sec.bugs.forEach((b) => {
        const s = parseDate(b.start_date) || parseDate(b.created_at) || parseDate(b.createdAt);
        const e = parseDate(b.due_date);
        if (s && (!lo || s.isBefore(lo))) lo = s.clone();
        if (e && (!hi || e.isAfter(hi))) hi = e.clone();
      });
    });
    if (!lo) lo = moment().startOf("day").subtract(7, "days");
    if (!hi) hi = moment().startOf("day").add(30, "days");
    const s = lo.clone().startOf("month");
    const e = s.clone().endOf("month");
    return { start: s, days: buildRange(s, e) };
  }, [sections]);

  const total = days.length;
  const totalW = total * dayPx;

  const todayOff = useMemo(
    () => clamp(moment().startOf("day").diff(start, "days"), 0, total - 1) * dayPx,
    [start, total, dayPx]
  );

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

  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = Math.max(0, todayOff - 300);
  }, [todayOff]);

  const weekGroups = useMemo(() => {
    const groups = [];
    let cur = null;
    days.forEach((d, i) => {
      const idx = Math.floor(i / 7);
      if (!cur || cur.idx !== idx) {
        cur = { idx, count: 1, label: `W${idx + 1}` };
        groups.push(cur);
      } else {
        cur.count += 1;
      }
    });
    return groups;
  }, [days]);

  function pos(bug) {
    let s = parseDate(bug.start_date) || parseDate(bug.created_at) || parseDate(bug.createdAt);
    let e = parseDate(bug.due_date);
    if (!s && !e) return null;
    if (!s) s = e.clone().subtract(7, "days");
    if (!e) e = s.clone().add(7, "days");
    const left = clamp(s.diff(start, "days"), 0, total) * dayPx;
    const maxW = (total - clamp(s.diff(start, "days"), 0, total)) * dayPx;
    return { left, width: Math.min(Math.max(e.diff(s, "days"), 1) * dayPx, maxW), s, e };
  }

  if (sections.length === 0) {
    return (
      <div className="gt-empty">
        <strong>No bugs to display</strong>
        <p>Add start or due dates to your bugs to see them here.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="gt-wrap gt-sim"
        style={{
          "--left-w": `${LEFT_W}px`,
          "--right-w": `${RIGHT_W}px`,
          "--day-px": `${dayPx}px`,
        }}
      >
        <div className="gt-scroll" ref={ref}>
          <div className="gt-header" style={{ minWidth: LEFT_W + totalW + RIGHT_W }}>
            <div className="gt-wrow">
              <div className="gt-lhd gt-lhd-w">
                <span className="gt-date-pill">{start.format("MMM D YYYY")}</span>
              </div>
              <div className="gt-wtrack" style={{ width: totalW }}>
                {weekGroups.map((g) => (
                  <div key={g.idx} className="gt-wcell" style={{ width: g.count * dayPx }}>
                    <span>{g.label}</span>
                  </div>
                ))}
              </div>
            <div className="gt-rhd gt-rhd-w">
              <span>ASSIGNEE</span>
              <span className="gt-rhd-sub">LABELS</span>
            </div>
          </div>
        </div>

          <div className="gt-body" style={{ minWidth: LEFT_W + totalW + RIGHT_W }}>
            {sections.map((sec) => (
              <React.Fragment key={sec.key}>
                <div className="gt-sec">
                  <div className="gt-lcell gt-sec-lc">
                    <span className="gt-sec-title" style={{ color: sec.color }}>
                      {sec.title}
                    </span>
                  </div>
                  <div className="gt-track gt-sec-track" style={{ width: totalW }} />
                  <div className="gt-rcell gt-sec-rc" />
                </div>

                {sec.bugs.map((bug, idx) => {
                  const p = pos(bug);
                  const statusLower = String(bug._stTitle || "").toLowerCase();
                  const overdue =
                    bug.due_date && moment(bug.due_date).isBefore(moment(), "day") && !statusLower.includes("closed");
                  const c = bug._stColor || barColor(bug._id || bug.title || idx);
                  const assigneeName =
                    Array.isArray(bug.assignees) && bug.assignees.length > 0
                      ? bug.assignees[0]?.full_name || bug.assignees[0]?.name || bug.assignees[0]?.email || ""
                      : "";
                  const labelTitles = (
                    bug?.bug_labels ||
                    bug?.bugLabels ||
                    bug?.labels ||
                    bug?.label_details ||
                    bug?.labels_details ||
                    []
                  )
                    .map((l) => (typeof l === "string" ? l : l?.title))
                    .filter(Boolean);

                  return (
                    <div
                      key={bug._id || `${sec.key}-${idx}`}
                      className={`gt-trow${hovered === bug._id ? " gt-hvr" : ""}`}
                      onMouseEnter={() => setHovered(bug._id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => {
                        getTaskByIdDetails(bug._id);
                        getComment(bug._id);
                        setTempBoard(bug._boardBugsRef || []);
                        setSelectedBugId(bug._id);
                      }}
                    >
                      <div className="gt-lcell gt-task-lc">
                        <div className="gt-task-txt">
                          <div className="gt-tname" title={bug.title}>
                            {bug.title}
                          </div>
                        </div>
                      </div>

                      <div className="gt-track" style={{ width: totalW }}>
                        {p && (
                          <Tooltip
                            overlayClassName="gt-tip"
                            placement="top"
                            title={
                              <div className="gt-tip-box">
                                <div className="gt-tip-name">{bug.title}</div>
                                <div className="gt-tip-row">
                                  <i className="fa-regular fa-calendar" /> {p.s.format("MMM D")} – {p.e.format("MMM D, YYYY")}
                                </div>
                                {overdue && <div className="gt-tip-late">⚠ Overdue</div>}
                              </div>
                            }
                          >
                            <div className={`gt-bar${overdue ? " gt-bar-late" : ""}`} style={{ left: p.left, width: p.width, "--c": c }} />
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

      <BugDetailModal
        open={modalIsOpen}
        onCancel={() => {
          handleCancel();
          setSelectedBugId(null);
        }}
        taskDetails={taskDetails}
        comments={comments}
        taskHistory={taskHistory}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        getComment={getComment}
        getBughistory={getBughistory}
        handleBugStatusClick={handleBugStatusClick}
        bugWorkFlowStatusList={bugWorkFlowStatusList}
        isPopoverVisible={isPopoverVisible}
        setIsPopoverVisible={setIsPopoverVisible}
        selectedBugStatusTitle={selectedBugStatusTitle}
        selectedBugStatusColor={selectedBugStatusColor}
        handleTaskDelete={handleTaskDelete}
        hasPermission={hasPermission}
        isEditable={isEditable}
        setIsEditable={setIsEditable}
        viewBug={viewBug}
        handleViewBug={handleViewBug}
        handleFieldClick={handleFieldClick}
        handleEstTimeViewInput={handleEstTimeViewInput}
        estHrsError={estHrsError}
        estMinsError={estMinsError}
        subscribersList={subscribersList}
        employeeList={employeeList}
        projectLabels={projectLabels}
        handleSearch={handleSearch}
        handleSelectedItemsChange={handleSelectedItemsChange}
        handleSelectedLabelsChange={handleSelectedLabelsChange}
        searchKeyword={searchKeyword}
        isLoggedHoursMoreThanEstimated={isLoggedHoursMoreThanEstimated}
        visible={visible}
        popOver={popOver}
        openPopOver={openPopOver}
        estError={estError}
        fileViewAttachment={fileViewAttachment}
        populatedViewFiles={populatedViewFiles}
        removeAttachmentViewFile={removeAttachmentViewFile}
        onFileViewChange={onFileViewChange}
        attachmentViewfileRef={attachmentViewfileRef}
        projectId={projectId}
        getBoardTasks={getBoardTasks}
        addComments={addComments}
        setTextAreaValue={setTextAreaValue}
        isTextAreaFocused={isTextAreaFocused}
        setIsTextAreaFocused={setIsTextAreaFocused}
        textAreaValue={textAreaValue}
        taggedUserList={taggedUserList}
        handleTaskOps={handleTaskOps}
        addform={addform}
        formComment={formComment}
        bugId={bugId}
        updateviewBug={updateviewBug}
      />

      <AddTimeModal
        openModal={isModalOpenTaskModal}
        cancelModal={handleCancelTaskModal}
        formName={addform}
        onFinish={handleTaskOps}
        taskdropdown={taskdropdown}
        addInputTaskData={addInputTaskData}
        handleTaskInput={handleTaskInput}
        estHrs={estHrs}
        handleEstTimeInput={handleEstTimeInput}
        estHrsError={estHrsError}
        estMins={estMins}
        estMinsError={estMinsError}
        handleChangedescription={handleChangedescription}
        editorData={editorData}
        handlePaste={handlePaste}
        type="bug"
      />

      <EditCommentModal
        open={openCommentModel}
        cancel={handleCancelCommentModel}
        formName={formComment}
        onFinish={handleComments}
        Mentionvalue={commentVal}
        onChange={setCommentVal}
        onSelect={handleSelect}
        fileAttachment={fileAttachment}
        populatedFiles={populatedFiles}
        removeAttachmentFile={removeAttachmentFile}
        attachmentfileRef={attachmentfileRef}
        foldersList={foldersList}
        onFileChange={onFileChange}
        setIsTextAreaFocused={setIsTextAreaFocused}
        userList={taggedUserList}
      />
    </>
  );
}
