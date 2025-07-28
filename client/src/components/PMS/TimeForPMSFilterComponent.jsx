import React, { useState, useMemo, memo } from "react";
import {
  Button,
  Popover,
  Checkbox,
  Input,
  DatePicker,
  Badge,
  Divider,
} from "antd";
import { FilterOutlined, CalendarTwoTone } from "@ant-design/icons";
import dayjs from "dayjs";
import "../../assets/css/FilterUI.css";
import { removeTitle } from "../../util/nameFilter";

const { Search } = Input;

// Constants
const FILTER_TYPES = {
  USERS: "users",
  DATE_RANGE: "date_range"
};

// Create dynamic filter menu items based on roles
const createFilterMenuItems = (getRoles) => {
  const baseItems = [
    { key: FILTER_TYPES.DATE_RANGE, label: "Date Range" },
  ];

  // Add Users filter only if not a User role
  if (getRoles && !getRoles(["User"])) {
    return [
      { key: FILTER_TYPES.USERS, label: "Users" },
      ...baseItems
    ];
  }

  return baseItems;
};

const UsersAndDateRangeFilterComponent = ({
  // Users props
  users,
  filteredSubscribers,
  handleCheckboxChange,
  handleSearch,
  
  // Date Range props
  radioValue,
  onChange,
  setDataCustom,
  dataCustom,
  addInputStartDate,
  addInputEndDate,
  handleTaskStartDate,
  handleTaskEndDate,
  
  // Common props
  getTimesheetById,
  timesheetList,
  isPopoverVisibleData,
  setIsPopoverVisibleData,
  
  // Role check function
  getRoles,
}) => {
  // Create dynamic menu items based on role
  const FILTER_MENU_ITEMS = useMemo(() => createFilterMenuItems(getRoles), [getRoles]);
  
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(() => {
    return (getRoles && !getRoles(["User"])) ? FILTER_TYPES.USERS : FILTER_TYPES.DATE_RANGE;
  });

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    
    // Count users filter as active if has selections AND user is not User role
    if (getRoles && !getRoles(["User"]) && users.length > 0) {
      count++;
    }
    
    // Count date range filter as active if not "all"
    if (radioValue && radioValue !== "all" && radioValue !== "") {
      count++;
    }
    
    return count;
  }, [users, radioValue, getRoles]);

  const resetAllFilters = () => {
    // Reset users filter if user has access
    if (getRoles && !getRoles(["User"])) {
      handleCheckboxChange("", false);
    }
    
    // Reset date range
    setDataCustom(false);
    onChange({ target: { value: "all" } });
  };

  // Render users filter (only for non-User roles)
  const renderUsersFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Users</h4>

      <div className="filter-search">
        <Search
          placeholder="Search users..."
          onChange={handleSearch}
          size="small"
        />
      </div>

      <div className="filter-options">
        {filteredSubscribers.map((item, index) => (
          <div
            key={item._id || index}
            className={`assignee-item ${
              users.includes(item._id) ? "selected" : ""
            }`}
          >
            <Checkbox
              checked={users.includes(item._id)}
              onChange={(e) => handleCheckboxChange(item._id, e.target.checked)}
            >
              <span>{removeTitle(item.full_name)}</span>
            </Checkbox>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getTimesheetById();
            setIsPopoverOpen(false);
          }}
          size="small"
          className="filter-btn"
        >
          Apply Filter
        </Button>
        <Button
          size="small"
          className="delete-btn"
          onClick={() => {
            handleCheckboxChange("", false);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  // Render date range filter
  const renderDateRangeFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Date Range</h4>

      <div className="filter-options">
        <div className="assignee-item">
          <Checkbox
            onClick={() => setDataCustom(false)}
            onChange={onChange}
            checked={radioValue === "all"}
            value="all"
          >
            All
          </Checkbox>
        </div>

        <div className="assignee-item">
          <Checkbox
            onClick={() => setDataCustom(false)}
            onChange={onChange}
            checked={radioValue === "last_week"}
            value="last_week"
          >
            Last Week
          </Checkbox>
        </div>

        <div className="assignee-item">
          <Checkbox
            onClick={() => setDataCustom(false)}
            onChange={onChange}
            checked={radioValue === "last_2_week"}
            value="last_2_week"
          >
            Last 2 Week
          </Checkbox>
        </div>

        <div className="assignee-item">
          <Checkbox
            onClick={() => setDataCustom(false)}
            onChange={onChange}
            checked={radioValue === "last_month"}
            value="last_month"
          >
            Last Month
          </Checkbox>
        </div>

        <div className="assignee-item">
          <Checkbox
            onClick={() => setDataCustom(true)}
            onChange={onChange}
            checked={radioValue === "Custom"}
            value="Custom"
          >
            Custom
          </Checkbox>
        </div>

        {/* Custom Date Range Pickers */}
        {dataCustom && (
          <div className="custom-date-range" style={{ marginTop: "15px", padding: "10px", border: "1px solid #f0f0f0", borderRadius: "4px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label style={{ minWidth: "40px", fontSize: "12px" }}>Start:</label>
                <DatePicker
                  value={
                    addInputStartDate?.start_date &&
                    dayjs(addInputStartDate?.start_date, "YYYY-MM-DD")
                  }
                  onChange={(date, dateString) =>
                    handleTaskStartDate("start_date", dateString)
                  }
                  size="small"
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label style={{ minWidth: "40px", fontSize: "12px" }}>End:</label>
                <DatePicker
                  value={
                    addInputEndDate?.end_date &&
                    dayjs(addInputEndDate?.end_date, "YYYY-MM-DD")
                  }
                  onChange={(date, dateString) =>
                    handleTaskEndDate("end_date", dateString)
                  }
                  size="small"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getTimesheetById();
            setIsPopoverOpen(false);
          }}
          size="small"
          className="filter-btn"
        >
          Apply Filter
        </Button>
        <Button
          size="small"
          className="delete-btn"
          onClick={() => {
            setDataCustom(false);
            onChange({ target: { value: "all" } });
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderFilterContent = () => {
    switch (activeFilterType) {
      case FILTER_TYPES.USERS:
        return (getRoles && !getRoles(["User"])) ? renderUsersFilter() : renderDateRangeFilter();
      case FILTER_TYPES.DATE_RANGE:
        return renderDateRangeFilter();
      default:
        return (getRoles && !getRoles(["User"])) ? renderUsersFilter() : renderDateRangeFilter();
    }
  };

  // Don't render if no timesheet data available
  if (!timesheetList || timesheetList.length === 0) {
    return null;
  }

  const popoverContent = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        {/* Filter Header */}
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
        {/* Filter Menu Items */}
        {FILTER_MENU_ITEMS.map((item) => (
          <div
            key={item.key}
            onClick={() => {
              // Safety check for Users filter
              if (item.key === FILTER_TYPES.USERS && getRoles && getRoles(["User"])) {
                return;
              }
              setActiveFilterType(item.key);
            }}
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

export default memo(UsersAndDateRangeFilterComponent);
