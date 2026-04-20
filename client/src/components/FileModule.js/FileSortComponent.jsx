import React, { useState, useMemo, memo } from "react";
import {
  Button,
  Popover,
  Radio,
  Badge,
  Divider,
} from "antd";
import { SortAscendingOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";
import { render } from "react-dom";

// Constants
const SORT_TYPES = {
  SORTBY: "sort_by",
  ORDERBY: "order_by"
};

const SORT_MENU_ITEMS = [
  { key: SORT_TYPES.SORTBY, label: "Sort By" },
  { key: SORT_TYPES.ORDERBY, label: "Order By" },
];

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
}) => {
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(SORT_TYPES.SORTBY);

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
    
    return count;
  }, [radioStatusValue, radioStatusValueOrder]);

  const resetAllSorts = () => {
    onChange1({ target: { value: "createdAt" } }); // Reset sort to default
    onChange2({ target: { value: "desc" } }); // Reset order to default
  };

  // Get display labels
  const getCurrentSortLabel = () => {
    const option = SORT_OPTIONS.find((opt) => opt.value === radioStatusValue);
    return option ? option.label : "Date";
  };

  const getCurrentOrderLabel = () => {
    const option = ORDER_OPTIONS.find((opt) => opt.value === radioStatusValueOrder);
    return option ? option.label : "Desc";
  };

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
          onClick={() => {
            allFiles === "active"
              ? getAllFileList()
              : getEditFolderOneId(selectedFolder?._id);
            setIsPopoverOpen(false);
          }}
          size="small"
          className="filter-btn"
        >
          Apply Sort
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
          onClick={() => {
            allFiles === "active"
              ? getAllFileList()
              : getEditFolderOneId(selectedFolder?._id);
            setIsPopoverOpen(false);
          }}
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
      default:
        return renderSortByOptions();
    }
  };

  const popoverContent = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        {/* Sort Header */}
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Sort & Order</h4>
          {activeSortCount > 0 && (
            <Button
              size="small"
              type="text"
              onClick={resetAllSorts}
              className="delete-btn"
              title="Reset all sort options"
            >
              Reset All ({activeSortCount})
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
        onOpenChange={setIsPopoverOpen}
        placement="bottomLeft"
        overlayStyle={{ maxWidth: "none" }}
      >
        <Button icon={<SortAscendingOutlined />} className="sort-btn">
          Sort: {getCurrentSortLabel()} | Order: {getCurrentOrderLabel()}
          <Badge
            count={activeSortCount}
            hidden={!activeSortCount}
            size="small"
            offset={[10, 0]}
            color="#52c41a"
          />
        </Button>
      </Popover>
    </div>
  );
};

export default memo(FileSortComponent);