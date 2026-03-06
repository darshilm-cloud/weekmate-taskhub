import React, { memo } from "react";
import { Empty } from "antd";

const EmptyState = memo(function EmptyState({
  description = "No data found",
  image,
  children,
  className = "",
}) {
  return (
    <div className={`empty-state-container ${className}`} style={{ padding: "40px 0", textAlign: "center" }}>
      <Empty
        image={image || Empty.PRESENTED_IMAGE_SIMPLE}
        description={description}
      >
        {children}
      </Empty>
    </div>
  );
});

export default EmptyState;
