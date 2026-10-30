import React, { useEffect, useState } from "react";
import { Button, Popover, Modal, Badge, Divider, DatePicker } from "antd";
import "../../assets/css/FilterUI.css";
import "./DiscussionTopicFilter.css";

// Filter for the discussion topic list (global Discussion page + project Discussion tab).
// `value` is the applied "Created Date" range: [dayjs|null, dayjs|null] | null.

export const countDiscussionFilters = (range) => (range?.[0] || range?.[1] ? 1 : 0);

// API params for the topic list: start_date / end_date as "YYYY-MM-DD", omitted when unset.
export const discussionDateParams = (range) => ({
  ...(range?.[0] ? { start_date: range[0].format("YYYY-MM-DD") } : {}),
  ...(range?.[1] ? { end_date: range[1].format("YYYY-MM-DD") } : {}),
});

const FACETS = [{ key: "range", label: "Created Date" }];

function DiscussionTopicFilter({ value, onApply }) {
  const [open, setOpen] = useState(false);
  // On phones the filter is a bottom sheet: a popover closes as soon as a finger touches the page
  // outside it, so scrolling the page would dismiss it.
  const [isPhone, setIsPhone] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 575 : false
  );
  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth <= 575);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [draft, setDraft] = useState(value);
  const [facet, setFacet] = useState("range");

  const activeCount = countDiscussionFilters(value);

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
          {countDiscussionFilters(draft) > 0 && (
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
            {countDiscussionFilters(draft) > 0 && <Badge size="small" color="#1890ff" />}
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

  if (isPhone) {
    return (
      <>
        <Button
          className={`disc-topic-filter-btn${activeCount ? " is-active" : ""}`}
          onClick={() => handleOpenChange(true)}
        >
          Filter
        </Button>
        <Modal
          title="Filters"
          open={open}
          onCancel={() => setOpen(false)}
          footer={null}
          destroyOnClose
          className="disc-topic-filter-sheet"
          styles={{ body: { padding: 0 } }}
        >
          {content}
        </Modal>
      </>
    );
  }

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomLeft"
      overlayClassName="disc-topic-filter-popover"
    >
      <Button className={`disc-topic-filter-btn${activeCount ? " is-active" : ""}`}>
        Filter
      </Button>
    </Popover>
  );
}

export default DiscussionTopicFilter;
