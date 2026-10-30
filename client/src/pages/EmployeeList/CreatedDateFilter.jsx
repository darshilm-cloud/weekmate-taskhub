import React, { useState } from "react";
import { Button, Popover, Badge, Divider, DatePicker } from "antd";
import "../../assets/css/FilterUI.css";

// Filter popover for the Users / Clients sidebar lists. Only facet: Created Date.
const FACETS = [{ key: "range", label: "Created Date" }];

const hasRange = (range) => Boolean(range?.[0] || range?.[1]);

// [dayjs, dayjs] | null -> { start_date, end_date } ("YYYY-MM-DD"); unset sides are omitted
export const createdRangeParams = (range) => ({
  ...(range?.[0] ? { start_date: range[0].format("YYYY-MM-DD") } : {}),
  ...(range?.[1] ? { end_date: range[1].format("YYYY-MM-DD") } : {}),
});

function CreatedDateFilter({ value, onApply }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [facet, setFacet] = useState("range");

  const activeCount = hasRange(value) ? 1 : 0;

  const handleOpenChange = (visible) => {
    if (visible) setDraft(value);
    setOpen(visible);
  };

  const apply = () => {
    onApply(hasRange(draft) ? draft : null);
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
          {hasRange(draft) && (
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
            {hasRange(draft) && <Badge size="small" color="#1890ff" />}
          </div>
        ))}
      </div>
      <div className="filter-content">
        <div className="filter-content-inner">
          <h4 className="filter-title">Filter by {FACETS.find((f) => f.key === facet).label}</h4>
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
        <Badge count={activeCount} size="small" color="#1890ff">
          <Button className="filter-btn">Filter</Button>
        </Badge>
      </Popover>
    </div>
  );
}

export default CreatedDateFilter;
