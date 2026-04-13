import React from "react";

const SKELETON_ROWS = 6;

function SkeletonTable({ cols = 2 }) {
  return (
    <div className="ps-skeleton-wrap">
      <div className="ps-skeleton-row ps-skeleton-header-row">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="ps-shimmer" style={{ width: i === 0 ? "55%" : "20%", height: 12 }} />
        ))}
      </div>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div className="ps-skeleton-row" key={i}>
          <div className="ps-shimmer" style={{ width: `${45 + Math.random() * 30}%` }} />
          <div className="ps-shimmer" style={{ width: "15%", marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}

export default SkeletonTable;
