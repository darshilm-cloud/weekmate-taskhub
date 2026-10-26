import React, { useMemo, useState } from "react";
import { Calendar, Select } from "antd";
import dayjs from "dayjs";
import "./TaskMonthCalendar.css";

// Month calendar for tasks, laid out like the HRMS Team Leave Calendar
// (weekmate-hrms components/TeamLeaveCalander): Year + Month selects on a grey
// band, dark-blue weekday row, tasks as blue cards on their due date.
const YEARS_BACK = 5;
const YEARS_AHEAD = 5;
const MONTH_OPTIONS = dayjs.monthsShort().map((label, value) => ({ value, label }));

const getStatusTitle = (task) =>
  task?.task_status?.title || task?.task_status?.name || task?.status?.title || "";

function TaskMonthCalendar({ tasksByDate = {}, onOpenTask }) {
  const [value, setValue] = useState(() => dayjs());

  const yearOptions = useMemo(() => {
    const thisYear = dayjs().year();
    return Array.from({ length: YEARS_BACK + YEARS_AHEAD + 1 }, (_, i) => {
      const year = thisYear - YEARS_BACK + i;
      return { value: year, label: String(year) };
    });
  }, []);

  const headerRender = ({ value: current, onChange }) => (
    <div className="ant-picker-calendar-header">
      <Select
        className="tmc-year-select"
        value={current.year()}
        options={yearOptions}
        onChange={(year) => onChange(current.year(year))}
      />
      <Select
        className="tmc-month-select"
        value={current.month()}
        options={MONTH_OPTIONS}
        onChange={(month) => onChange(current.month(month))}
      />
    </div>
  );

  const cellRender = (current, info) => {
    if (info.type !== "date") return info.originNode;
    const tasks = tasksByDate[current.format("DD-MM-YYYY")] || [];
    if (tasks.length === 0) return null;
    return (
      <ul>
        {tasks.map((task) => {
          const status = getStatusTitle(task);
          return (
            <li
              key={task?._id}
              title={task?.title || "Untitled task"}
              className={onOpenTask ? "tmc-clickable" : ""}
              onClick={(e) => {
                e.stopPropagation();
                onOpenTask?.(task);
              }}
            >
              <p className="tmc-task-title">{task?.title || "Untitled task"}</p>
              {(status || task?.priority) && (
                <div className="tmc-task-meta">
                  <span>{status}</span>
                  <span>{task?.priority || ""}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="task-month-calendar">
      <Calendar
        mode="month"
        value={value}
        onChange={setValue}
        headerRender={headerRender}
        cellRender={cellRender}
      />
    </div>
  );
}

export default TaskMonthCalendar;
