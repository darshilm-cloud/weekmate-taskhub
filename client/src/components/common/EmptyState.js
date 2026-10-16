import React, { memo } from "react";
import NoDataFoundIcon from "./NoDataFoundIcon";

const EmptyState = memo(function EmptyState({ children, className = "" }) {
  return (
    <div className={`empty-state-container ${className}`} style={{ padding: "40px 0", textAlign: "center" }}>
      <NoDataFoundIcon />
      {children}
    </div>
  );
});

export default EmptyState;
