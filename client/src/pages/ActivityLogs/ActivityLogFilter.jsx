import React, { useState, useMemo, useCallback } from "react";
import {
  Button,
  Popover,
  Checkbox,
  Badge,
  Divider,
  DatePicker,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
import _ from "lodash";
import "../../assets/css/FilterUI.css";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

// Filter types
const FILTER_TYPES = {
  OPERATION: "operation",
  DATE_RANGE: "dateRange",
};

// Filter configuration
const FILTER_CONFIG = {
  [FILTER_TYPES.OPERATION]: {
    label: "Operation",
    skipParam: "skipOperation",
    options: [
      { value: "LOGIN", label: "Login" },
      { value: "LOGOUT", label: "Logout" },
      { value: "UPDATE", label: "Update" },
      { value: "DELETE", label: "Delete" },
    ],
    renderItem: (item, handleSelect, selectedItems) => (
      <div
        key={item.value}
        className={`assignee-item ${
          selectedItems.includes(item.value) ? "selected" : ""
        }`}
      >
        <Checkbox
          checked={selectedItems.includes(item.value)}
          onChange={() => handleSelect(item, FILTER_TYPES.OPERATION)}
        />
        <span>{item.label}</span>
      </div>
    ),
  },
  [FILTER_TYPES.DATE_RANGE]: {
    label: "Date Range",
    skipParam: "skipDateRange",
  },
};

// Create filter menu items
const createFilterMenuItems = () => {
  return Object.entries(FILTER_CONFIG).map(([key, config]) => ({
    key,
    label: config.label,
  }));
};

// FilterSection component for Operation
const OperationFilterSection = ({
  config,
  items,
  selectedItems,
  onSelect,
  onApply,
  onReset,
}) => (
  <div className="filter-content-inner">
    <h4 className="filter-title">{config.label}</h4>
    <div style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "8px" }}>
      {items.map((item) => config.renderItem(item, onSelect, selectedItems))}
    </div>
    <div className="filter-actions">
      <Button onClick={onApply} size="small" className="filter-btn">
        Apply Filter
      </Button>
      <Button onClick={onReset} size="small" className="delete-btn">
        Reset
      </Button>
    </div>
  </div>
);

// DateRangeFilterSection component
const DateRangeFilterSection = ({
  dateRange,
  onDateRangeChange,
  onApply,
  onReset,
}) => (
  <div className="filter-content-inner">
    <h4 className="filter-title">Date Range</h4>
    <div style={{ marginBottom: "20px" }}>
      <RangePicker
        style={{ width: "100%" }}
        value={
          dateRange && dateRange.length === 2
            ? [dayjs(dateRange[0]), dayjs(dateRange[1])]
            : null
        }
        onChange={(dates, dateStrings) => {
          if (dates && dates.length === 2) {
            onDateRangeChange([dateStrings[0], dateStrings[1]]);
          } else {
            onDateRangeChange(null);
          }
        }}
        format="YYYY-MM-DD"
        placeholder={["Start Date", "End Date"]}
      />
    </div>
    <div className="filter-actions">
      <Button onClick={onApply} size="small" className="filter-btn">
        Apply Filter
      </Button>
      <Button onClick={onReset} size="small" className="delete-btn">
        Reset
      </Button>
    </div>
  </div>
);

const ActivityLogFilter = ({ onFilterChange }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.OPERATION);
  const [filterData, setFilterData] = useState({
    [FILTER_TYPES.OPERATION]: FILTER_CONFIG[FILTER_TYPES.OPERATION].options,
  });
  const [selectedFilters, setSelectedFilters] = useState({
    [FILTER_TYPES.OPERATION]: [],
    [FILTER_TYPES.DATE_RANGE]: null,
  });

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedFilters[FILTER_TYPES.OPERATION]?.length > 0) count++;
    if (selectedFilters[FILTER_TYPES.DATE_RANGE]) count++;
    return count;
  }, [selectedFilters]);

  const handleFilterSelection = useCallback((item, filterType) => {
    setSelectedFilters((prev) => {
      const current = prev[filterType] || [];
      const updated = current.includes(item.value)
        ? current.filter((val) => val !== item.value)
        : [...current, item.value];
      return { ...prev, [filterType]: updated };
    });
  }, []);

  const resetFilter = useCallback(
    (filterType) => {
      setSelectedFilters((prev) => {
        const updated = { ...prev };
        if (filterType === FILTER_TYPES.DATE_RANGE) {
          updated[filterType] = null;
        } else {
          updated[filterType] = [];
        }
        
        // Pass the updated filter state to parent so other filters remain applied
        if (onFilterChange) {
          onFilterChange([], {
            operation: updated[FILTER_TYPES.OPERATION],
            dateRange: updated[FILTER_TYPES.DATE_RANGE],
          });
        }
        
        return updated;
      });
    },
    [onFilterChange]
  );

  const resetAllFilters = useCallback(() => {
    setSelectedFilters({
      [FILTER_TYPES.OPERATION]: [],
      [FILTER_TYPES.DATE_RANGE]: null,
    });
    if (onFilterChange) {
      onFilterChange(["skipAll"]);
    }
    setIsPopoverOpen(false);
  }, [onFilterChange]);

  const handleDateRangeChange = useCallback((dateRange) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [FILTER_TYPES.DATE_RANGE]: dateRange,
    }));
  }, []);

  const renderFilterContent = () => {
    const config = FILTER_CONFIG[activeFilter];
    if (!config) return null;

    if (activeFilter === FILTER_TYPES.DATE_RANGE) {
      return (
        <DateRangeFilterSection
          dateRange={selectedFilters[FILTER_TYPES.DATE_RANGE]}
          onDateRangeChange={handleDateRangeChange}
          onApply={() => {
            if (onFilterChange) {
              onFilterChange([], {
                operation: selectedFilters[FILTER_TYPES.OPERATION],
                dateRange: selectedFilters[FILTER_TYPES.DATE_RANGE],
              });
            }
            setIsPopoverOpen(false);
          }}
          onReset={() => resetFilter(FILTER_TYPES.DATE_RANGE)}
        />
      );
    }

    return (
      <OperationFilterSection
        config={config}
        items={filterData[activeFilter]}
        selectedItems={selectedFilters[activeFilter]}
        onSelect={(item) => handleFilterSelection(item, activeFilter)}
        onApply={() => {
          if (onFilterChange) {
            onFilterChange([], {
              operation: selectedFilters[FILTER_TYPES.OPERATION],
              dateRange: selectedFilters[FILTER_TYPES.DATE_RANGE],
            });
          }
          setIsPopoverOpen(false);
        }}
        onReset={() => resetFilter(activeFilter)}
      />
    );
  };

  const popoverContent = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Filters</h4>
          {activeFiltersCount > 0 && (
            <Button
              size="small"
              type="text"
              onClick={resetAllFilters}
              className="delete-btn"
              title="Reset all filters"
            >
              Reset All ({activeFiltersCount})
            </Button>
          )}
        </div>
        <Divider style={{ margin: "8px 0" }} />
        {createFilterMenuItems().map((item) => (
          <div
            key={item.key}
            onClick={() => setActiveFilter(item.key)}
            className={`filter-menu-item ${
              activeFilter === item.key ? "active" : ""
            }`}
            style={{ padding: "8px 12px", cursor: "pointer" }}
          >
            <span>{item.label}</span>
            {activeFilter === FILTER_TYPES.DATE_RANGE
              ? selectedFilters[FILTER_TYPES.DATE_RANGE] && (
                  <Badge size="small" color="#1890ff" />
                )
              : !_.isEmpty(selectedFilters[item.key]) && (
                  <Badge size="small" color="#1890ff" />
                )}
          </div>
        ))}
      </div>
      <div className="filter-content" style={{ padding: "16px", flex: 1 }}>
        {renderFilterContent()}
      </div>
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
        <Button icon={<FilterOutlined />} className="filter-btn">
          Filter
          <Badge
            count={activeFiltersCount}
            hidden={!activeFiltersCount}
            size="small"
            offset={[10, 0]}
            color="#1890ff"
          />
        </Button>
      </Popover>
    </div>
  );
};

export default React.memo(ActivityLogFilter);
