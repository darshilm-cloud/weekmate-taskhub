import React, { useState, useMemo, memo } from "react";
import { Button, Popover, Radio, Badge, Divider } from "antd";
import { SortAscendingOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";

// Constants
const SORT_TYPES = {
  SORTBY: "sort_by",
};

const SORT_MENU_ITEMS = [{ key: SORT_TYPES.SORTBY, label: "Sort By" }];

// Sort options
const SORT_OPTIONS = [
  { value: "createdAt", label: "Latest Updated" },
  { value: "title", label: "Name" },
  // { value: "project_type", label: "Status" },
];

const SortByComponent = ({
  // Sort props
  sortOption,
  handleSortFilter,
  getProjectListing,
}) => {
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(SORT_TYPES.SORTBY);
  
  // Local state to track the temporarily selected sort option (before applying)
  const [tempSortOption, setTempSortOption] = useState(sortOption);

  // Active sort indicator (always 1 since there's always a sort option selected)
  const activeSortCount = useMemo(() => {
    // Show badge if not default (createdAt)
    return sortOption && sortOption !== "createdAt" ? 1 : 0;
  }, [sortOption]);

  const resetSort = () => {
    handleSortFilter("createdAt"); // Reset to default
    setTempSortOption("createdAt"); // Reset temp state as well
  };

  const applySort = () => {
    handleSortFilter(tempSortOption);
    getProjectListing();
    setIsPopoverOpen(false);
  };

  const handleTempSortChange = (value) => {
    setTempSortOption(value);
  };

  // Update tempSortOption when sortOption prop changes
  React.useEffect(() => {
    setTempSortOption(sortOption);
  }, [sortOption]);

  // Get display label for current sort option
  const getCurrentSortLabel = () => {
    const option = SORT_OPTIONS.find((opt) => opt.value === sortOption);
    return option ? option.label : "Latest Updated";
  };

  // Render sort options
  const renderSortByOptions = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Sort By</h4>

      <div className="filter-options">
        <Radio.Group
          onChange={(e) => handleTempSortChange(e.target.value)}
          value={tempSortOption}
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
          onClick={applySort}
          size="small"
          className="filter-btn"
        >
          Apply Sort
        </Button>
        <Button
          size="small"
          className="delete-btn"
          onClick={() => {
            resetSort();
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
      default:
        return renderSortByOptions();
    }
  };

  const popoverContent = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        {/* Sort Header */}
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Sort Options</h4>
          {activeSortCount > 0 && (
            <Button
              size="small"
              type="text"
              onClick={resetSort}
              className="delete-btn"
              title="Reset to default sort"
            >
              Reset
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
        <Button icon={<SortAscendingOutlined />} className="sort-btn filter-btn">
          Sort
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

export default memo(SortByComponent);