import React, { useState } from "react";
import { Button, Popover, Radio, Divider } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";

const DATE_OPTIONS = [
  { value: "any", label: "Date Type" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "next_7_days", label: "Next 7 Days" },
  { value: "overdue", label: "Overdue" },
];

const TaskDateFacetFilter = ({ value, onApply }) => {
  const [open, setOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value || "any");

  const handleOpen = (visible) => {
    if (visible) setTempValue(value || "any");
    setOpen(visible);
  };

  const handleApply = () => {
    onApply(tempValue);
    setOpen(false);
  };

  const handleReset = () => {
    setTempValue("any");
    onApply("any");
    setOpen(false);
  };

  const isActive = value && value !== "any";
  const activeLabel = DATE_OPTIONS.find((o) => o.value === value)?.label || "Date Type";

  const content = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Date</h4>
        </div>
        <Divider style={{ margin: "8px 0" }} />
        <div className="filter-menu-item active">
          <span>Date Type</span>
        </div>
      </div>

      <div className="filter-content">
        <div className="filter-content-inner">
          <h4 className="filter-title">Date Type</h4>
          <Radio.Group
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {DATE_OPTIONS.filter((o) => o.value !== "any").map((opt) => (
              <div
                key={opt.value}
                className={`assignee-item${tempValue === opt.value ? " selected" : ""}`}
                onClick={() => setTempValue(opt.value)}
                style={{ cursor: "pointer" }}
              >
                <Radio value={opt.value}>
                  <span style={{ color: "#374151", fontWeight: 500 }}>{opt.label}</span>
                </Radio>
              </div>
            ))}
          </Radio.Group>
          <div className="filter-actions">
            <Button size="small" className="filter-btn" onClick={handleApply}>
              Apply Filter
            </Button>
            <Button size="small" className="delete-btn" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpen}
      placement="bottomLeft"
    >
      <Button
        icon={<CalendarOutlined />}
        style={{ background: "#fff", borderRadius: 8, color: "#374151", borderColor: "#d1d5db" }}
      >
        {isActive ? activeLabel : "Date Type"}
      </Button>
    </Popover>
  );
};

export default TaskDateFacetFilter;
