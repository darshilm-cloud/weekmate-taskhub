import React, { useState, useEffect, useRef } from "react";
import { Dropdown, Checkbox, Button } from "antd";
import { DownOutlined } from "@ant-design/icons";
import "./columnSelector.css";

/**
 * "Columns" dropdown for listing tables (same behaviour as HRMS's
 * components/common/ColumnSelector). Ticking a box only edits a local draft -
 * nothing changes on screen or on the server until Save is pressed.
 *
 * `open`/`onOpenChange` may be passed to control it from the page (e.g. to
 * close it when another menu opens); otherwise it manages its own state.
 * `columns` should be the full column list; `alwaysVisibleKeys` are not offered.
 */
const ColumnSelector = ({
  columns = [],
  visibleKeys = [],
  onSave,
  alwaysVisibleKeys = [],
  buttonLabel = "Columns",
  open: controlledOpen,
  onOpenChange,
  saving = false,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [draftKeys, setDraftKeys] = useState(visibleKeys);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setDraftKeys(visibleKeys);
    // Start at the top on every open - antd keeps the overlay mounted, so the
    // browser would otherwise remember the last scroll position.
    const timer = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
    }, 0);
    return () => clearTimeout(timer);
  }, [open, visibleKeys]);

  const selectableColumns = columns.filter((col) => {
    const k = col.key || col.dataIndex;
    return k && !alwaysVisibleKeys.includes(k);
  });

  const handleToggle = (k, checked) =>
    setDraftKeys((prev) => (checked ? [...prev, k] : prev.filter((x) => x !== k)));

  const handleSave = () => {
    onSave(draftKeys);
    setOpen(false);
  };

  const menu = (
    <div className="column-selector-menu" onClick={(e) => e.stopPropagation()}>
      <div className="column-selector-title">Show columns</div>
      <div className="column-selector-list" ref={listRef}>
        {selectableColumns.map((col) => {
          const k = col.key || col.dataIndex;
          return (
            <div className="column-selector-item" key={k}>
              <Checkbox checked={draftKeys.includes(k)} onChange={(e) => handleToggle(k, e.target.checked)}>
                {col.columnSelectorLabel || col.title}
              </Checkbox>
            </div>
          );
        })}
      </div>
      <div className="column-selector-footer">
        <Button type="primary" className="add-btn" loading={saving} onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => menu}
      trigger={["click"]}
      open={open}
      onOpenChange={(visible) => {
        if (!visible) setDraftKeys(visibleKeys);
        setOpen(visible);
      }}
    >
      <Button className="btn-secondary column-selector-trigger">
        {buttonLabel} <DownOutlined />
      </Button>
    </Dropdown>
  );
};

export default ColumnSelector;
