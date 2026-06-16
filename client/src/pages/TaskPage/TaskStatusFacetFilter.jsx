import { useState } from "react";
import { Button, Popover, Radio, Badge, Divider } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "incomplete", label: "Incomplete" },
  { value: "completed", label: "Completed" },
];

const TaskStatusFacetFilter = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value || "all");

  const handleOpen = (visible) => {
    if (visible) setTempValue(value || "all");
    setOpen(visible);
  };

  const handleApply = () => {
    onChange(tempValue);
    setOpen(false);
  };

  const handleReset = () => {
    setTempValue("all");
    onChange("all");
    setOpen(false);
  };

  const isActive = value && value !== "all";

  const content = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Filters</h4>
        </div>
        <Divider style={{ margin: "8px 0" }} />
        <div className="filter-menu-item active">
          <span>Status</span>
          {isActive && <Badge size="small" color="#1890ff" />}
        </div>
      </div>

      <div className="filter-content">
        <div className="filter-content-inner">
          <h4 className="filter-title">Status</h4>
          <Radio.Group
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {STATUS_OPTIONS.map((opt) => (
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
        icon={<FilterOutlined />}
        style={{ background: "#fff", borderRadius: 8, color: "#374151", borderColor: "#d1d5db" }}
      >
        {isActive
          ? STATUS_OPTIONS.find((o) => o.value === value)?.label
          : "Status"}
        {isActive && (
          <Badge count={1} size="small" offset={[6, 0]} color="#1890ff" />
        )}
      </Button>
    </Popover>
  );
};

export default TaskStatusFacetFilter;
