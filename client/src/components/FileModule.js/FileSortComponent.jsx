import React, { useState, useMemo, memo } from "react";
import {
  Button,
  Popover,
  Radio,
  Divider,
  Badge,
  DatePicker,
} from "antd";
import { SortAscendingOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";
import { render } from "react-dom";
import moment from "moment";

// Constants
const SORT_TYPES = {
  SORTBY: "sort_by",
  ORDERBY: "order_by",
  RANGE: "range",
};

const SORT_MENU_ITEMS = [
  { key: SORT_TYPES.SORTBY, label: "Sort By" },
  { key: SORT_TYPES.ORDERBY, label: "Order By" },
  { key: SORT_TYPES.RANGE, label: "Created Date" },
];

const hasRange = (range) => Boolean(range?.[0] || range?.[1]);

// Sort options
const SORT_OPTIONS = [
  { value: "createdAt", label: "Date", render: (date) => date ? moment(date).format("DD-MM-YYYY") : "-" },
  { value: "name", label: "Name" },
  { value: "file_type", label: "Type" },
];

// Order options
const ORDER_OPTIONS = [
  { value: "asc", label: "Asc" },
  { value: "desc", label: "Desc" },
];

const FileSortComponent = ({
  // Sort props
  radioStatusValue,
  onChange1,
  
  // Order props
  radioStatusValueOrder,
  onChange2,
  
  // Common props
  allFiles,
  getAllFileList,
  getEditFolderOneId,
  selectedFolder,
  isPopoverVisibleStatus,
  setIsPopoverVisibleStatus,
  isPopoverVisibleOrder,
  setIsPopoverVisibleOrder,

  // Created Date filter (applied range: [dayjs, dayjs] | null)
  createdDateRange = null,
  setCreatedDateRange,
}) => {
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(SORT_TYPES.SORTBY);
  const [draftRange, setDraftRange] = useState(createdDateRange);

  const handleOpenChange = (visible) => {
    if (visible) setDraftRange(createdDateRange);
    setIsPopoverOpen(visible);
  };

  const fetchFiles = () =>
    allFiles === "active"
      ? getAllFileList()
      : getEditFolderOneId(selectedFolder?._id);

  // Every Apply button also applies the drafted Created Date range
  const applyAndFetch = () => {
    setCreatedDateRange?.(hasRange(draftRange) ? draftRange : null);
    fetchFiles();
    setIsPopoverOpen(false);
  };

  const resetCreatedDate = () => {
    setDraftRange(null);
    if (hasRange(createdDateRange)) {
      setCreatedDateRange?.(null);
      fetchFiles();
    }
  };

  // Active sort/order indicator
  const activeSortCount = useMemo(() => {
    let count = 0;
    
    // Count sort if not default (createdAt)
    if (radioStatusValue && radioStatusValue !== "createdAt") {
      count++;
    }
    
    // Count order if not default (desc)
    if (radioStatusValueOrder && radioStatusValueOrder !== "desc") {
      count++;
    }

    // Count applied Created Date range
    if (hasRange(createdDateRange)) {
      count++;
    }
    
    return count;
  }, [radioStatusValue, radioStatusValueOrder, createdDateRange]);

  const resetAllSorts = () => {
    onChange1({ target: { value: "createdAt" } }); // Reset sort to default
    onChange2({ target: { value: "desc" } }); // Reset order to default
    resetCreatedDate();
  };

  // Render Created Date range picker
  const renderCreatedDateOptions = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Created Date</h4>

      <div className="filter-options" style={{ overflow: "visible" }}>
        <DatePicker.RangePicker
          value={draftRange}
          onChange={(range) => setDraftRange(hasRange(range) ? range : null)}
          format="DD-MM-YYYY"
          placeholder={["Created from", "Created to"]}
          allowClear
          style={{ width: "100%" }}
          getPopupContainer={(node) => node.parentNode}
        />
      </div>

      <div className="filter-actions">
        <Button onClick={applyAndFetch} size="small" className="filter-btn">
          Apply Filter
        </Button>
        <Button
          size="small"
          className="delete-btn"
          onClick={() => {
            resetCreatedDate();
            setIsPopoverOpen(false);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  // Render sort options
  const renderSortByOptions = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Sort By</h4>

      <div className="filter-options">
        <Radio.Group 
          onChange={onChange1} 
          value={radioStatusValue}
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <div key={value} className="radio-option">
              <Radio value={value}>{label}</Radio>
            </div>
          ))}
        </Radio.Group>
      </div>

      <div className="filter-actions">
        <Button
          onClick={applyAndFetch}
          size="small"
          className="filter-btn"
        >
          Apply Filter
        </Button>
        <Button
          size="small"
          className="delete-btn"
          onClick={() => {
            onChange1({ target: { value: "createdAt" } });
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  // Render order options - NEW CASE
  const renderOrderByOptions = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Order By</h4>

      <div className="filter-options">
        <Radio.Group 
          onChange={onChange2} 
          value={radioStatusValueOrder}
        >
          {ORDER_OPTIONS.map(({ value, label }) => (
            <div key={value} className="radio-option">
              <Radio value={value}>{label}</Radio>
            </div>
          ))}
        </Radio.Group>
      </div>

      <div className="filter-actions">
        <Button
          onClick={applyAndFetch}
          size="small"
          className="filter-btn"
        >
          Apply Order
        </Button>
        <Button
          size="small"
          className="delete-btn"
          onClick={() => {
            onChange2({ target: { value: "desc" } });
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderFilterContent = () => {
    switch (activeFilterType) {
      case SORT_TYPES.SORTBY:
        return renderSortByOptions();
      case SORT_TYPES.ORDERBY: // NEW CASE
        return renderOrderByOptions();
      case SORT_TYPES.RANGE:
        return renderCreatedDateOptions();
      default:
        return renderSortByOptions();
    }
  };

  const popoverContent = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        {/* Sort Header */}
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Filters</h4>
          {(activeSortCount > 0 || hasRange(draftRange)) && (
            <Button
              size="small"
              type="text"
              onClick={resetAllSorts}
              className="delete-btn"
              title="Reset all sort options"
            >
              Reset All
            </Button>
          )}
        </div>
        <Divider style={{ margin: "8px 0" }} />
        {/* Sort Menu Items */}
        {SORT_MENU_ITEMS.map((item) => (
          <div
            key={item.key}
            onClick={() => setActiveFilterType(item.key)}
            className={`filter-menu-item ${
              activeFilterType === item.key ? "active" : ""
            }`}
          >
            <span>{item.label}</span>
            {item.key === SORT_TYPES.RANGE && hasRange(draftRange) && (
              <Badge size="small" color="#038fde" />
            )}
          </div>
        ))}
      </div>
      <div className="filter-content">{renderFilterContent()}</div>
    </div>
  );

  return (
    <div className="filter-container">
      <Popover
        content={popoverContent}
        trigger="click"
        open={isPopoverOpen}
        onOpenChange={handleOpenChange}
        placement="bottomLeft"
        overlayStyle={{ maxWidth: "none" }}
      >
        <Button className="filter-btn">
          Filter
        </Button>
      </Popover>
    </div>
  );
};

export default memo(FileSortComponent);