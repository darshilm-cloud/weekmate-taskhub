import React, { memo } from "react";
import { Tag } from "antd";
import textColorPicker from "../../util/textColorPicker";

const StatusBadge = memo(function StatusBadge({
  title,
  color,
  bgColor,
  style = {},
  className = "",
  onClick,
}) {
  if (!title) return null;

  const badgeStyle = bgColor
    ? {
        backgroundColor: bgColor,
        color: textColorPicker(bgColor),
        border: "none",
        borderRadius: "4px",
        fontSize: "12px",
        ...style,
      }
    : style;

  return (
    <Tag
      color={!bgColor ? color : undefined}
      style={badgeStyle}
      className={`status-badge ${className}`}
      onClick={onClick}
    >
      {title}
    </Tag>
  );
});

export default StatusBadge;
