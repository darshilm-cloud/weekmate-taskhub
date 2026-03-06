import React, { memo } from "react";
import { Tag } from "antd";

const PRIORITY_CONFIG = {
  high: { color: "#f5222d", label: "High" },
  medium: { color: "#fa8c16", label: "Medium" },
  low: { color: "#52c41a", label: "Low" },
  urgent: { color: "#cf1322", label: "Urgent" },
  critical: { color: "#820014", label: "Critical" },
};

const PriorityBadge = memo(function PriorityBadge({
  priority,
  style = {},
  className = "",
}) {
  if (!priority) return null;

  const config = PRIORITY_CONFIG[priority.toLowerCase()] || {
    color: "default",
    label: priority,
  };

  return (
    <Tag
      color={config.color}
      style={{ borderRadius: "4px", fontSize: "12px", ...style }}
      className={`priority-badge ${className}`}
    >
      {config.label}
    </Tag>
  );
});

export { PRIORITY_CONFIG };
export default PriorityBadge;
