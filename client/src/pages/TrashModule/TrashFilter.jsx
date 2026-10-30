import React, { useState } from "react";
import { Button, Popover, Badge, Divider, DatePicker } from "antd";
import "../../assets/css/FilterUI.css";

// Filter popover for the Trash page. Only facet: "Created Date" (the item's createdAt, not the deletion date).
const FACETS = [{ key: "range", label: "Created Date" }];

export const countTrashFilters = (range) => (range?.[0] || range?.[1] ? 1 : 0);

function TrashFilter({ value, onApply }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [facet, setFacet] = useState("range");

  const handleOpenChange = (visible) => {
    if (visible) setDraft(value);
    setOpen(visible);
  };

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  const reset = () => {
    setDraft(null);
    onApply(null);
    setOpen(false);
  };

  const content = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Filters</h4>
          {countTrashFilters(draft) > 0 && (
            <Button size="small" type="text" className="delete-btn" onClick={reset}>
              Reset All
            </Button>
          )}
        </div>
        <Divider style={{ margin: "8px 0" }} />
        {FACETS.map((f) => (
          <div
            key={f.key}
            onClick={() => setFacet(f.key)}
            className={`filter-menu-item ${facet === f.key ? "active" : ""}`}
          >
            <span>{f.label}</span>
            {countTrashFilters(draft) > 0 && <Badge size="small" color="#038fde" />}
          </div>
        ))}
      </div>
      <div className="filter-content">
        <div className="filter-content-inner">
          <h4 className="filter-title">Created Date</h4>
          <div className="filter-options" style={{ overflow: "visible" }}>
            <DatePicker.RangePicker
              value={draft}
              onChange={(range) => setDraft(range && (range[0] || range[1]) ? range : null)}
              format="DD-MM-YYYY"
              placeholder={["Created from", "Created to"]}
              allowClear
              style={{ width: "100%" }}
              getPopupContainer={(node) => node.parentNode}
            />
          </div>
          <div className="filter-actions">
            <Button size="small" className="filter-btn" onClick={apply}>
              Apply Filter
            </Button>
            <Button size="small" className="delete-btn" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="filter-container">
      <Popover
        content={content}
        trigger="click"
        open={open}
        onOpenChange={handleOpenChange}
        placement="bottomLeft"
        overlayStyle={{ maxWidth: "none" }}
      >
        <Badge count={countTrashFilters(value)} size="small">
          <Button type="primary" className="filter-btn">
            Filter
          </Button>
        </Badge>
      </Popover>
    </div>
  );
}

export default TrashFilter;
