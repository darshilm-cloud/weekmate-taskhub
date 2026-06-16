import { useState } from "react";
import { Button, Popover, Radio, Divider } from "antd";
import { SortAscendingOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "due_asc", label: "Due Date ↑" },
  { value: "due_desc", label: "Due Date ↓" },
  { value: "title_asc", label: "A to Z" },
  { value: "title_desc", label: "Z to A" },
];

const TaskSortFacetFilter = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value || "default");

  const handleOpen = (visible) => {
    if (visible) setTempValue(value || "default");
    setOpen(visible);
  };

  const handleApply = () => {
    onChange(tempValue);
    setOpen(false);
  };

  const handleReset = () => {
    setTempValue("default");
    onChange("default");
    setOpen(false);
  };

  const isActive = value && value !== "default";

  const content = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Sort</h4>
        </div>
        <Divider style={{ margin: "8px 0" }} />
        <div className="filter-menu-item active">
          <span>Sort By</span>
        </div>
      </div>

      <div className="filter-content">
        <div className="filter-content-inner">
          <h4 className="filter-title">Sort By</h4>
          <Radio.Group
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {SORT_OPTIONS.map((opt) => (
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
              Apply
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
        icon={<SortAscendingOutlined />}
        style={{ background: "#fff", borderRadius: 8, color: "#374151", borderColor: "#d1d5db" }}
      >
        {isActive
          ? SORT_OPTIONS.find((o) => o.value === value)?.label
          : "Default"}
      </Button>
    </Popover>
  );
};

export default TaskSortFacetFilter;
