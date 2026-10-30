import React, { useState, useMemo, memo, useEffect } from "react";
import {
  Button,
  Popover,
  Checkbox,
  Input,
  DatePicker,
  Badge,
  Divider,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "../../assets/css/FilterUI.css";
import { removeTitle } from "../../util/nameFilter";

const { Search } = Input;

// Constants
const FILTER_TYPES = {
  USERS: "users",
  DATE_RANGE: "date_range",
};

// Create dynamic filter menu items based on roles
const createFilterMenuItems = (getRoles) => {
  const baseItems = [{ key: FILTER_TYPES.DATE_RANGE, label: "Date Range" }];

  // Add Users filter only if not a User role
  if (getRoles && !getRoles(["User"])) {
    return [{ key: FILTER_TYPES.USERS, label: "Users" }, ...baseItems];
  }

  return baseItems;
};

// Sorting utility function for users
const sortWithSelectedOnTop = (items, selectedItems) => {
  if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
    return items;
  }

  const selected = [];
  const unselected = [];

  items.forEach((item) => {
    if (selectedItems.includes(item._id)) {
      selected.push(item);
    } else {
      unselected.push(item);
    }
  });

  return [...selected, ...unselected];
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
  const FILTER_MENU_ITEMS = useMemo(
    () => createFilterMenuItems(getRoles),
    [getRoles]
  );

  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(() => {
    return getRoles && !getRoles(["User"])
      ? FILTER_TYPES.USERS
      : FILTER_TYPES.DATE_RANGE;
  });
  const [hasAppliedFilter, setHasAppliedFilter] = useState(false);

  // Set default date range to "This Month" on component mount
  useEffect(() => {
    if (!radioValue || radioValue === "") {
      onChange({ target: { value: "this_month" } });
    }
  }, []);

  // Sorted users list with selected on top after filter application (Users only)
  const sortedUsers = useMemo(() => {
    if (hasAppliedFilter && activeFilterType === FILTER_TYPES.USERS) {
      return sortWithSelectedOnTop(filteredSubscribers, users);
    }
    return filteredSubscribers;
  }, [filteredSubscribers, users, hasAppliedFilter, activeFilterType]);

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;

    // Count users filter as active if has selections AND user is not User role
    if (getRoles && !getRoles(["User"]) && users.length > 0) {
      count++;
    }

    // Count date range filter as active if not default "this_month"
    if (radioValue && radioValue !== "this_month" && radioValue !== "") {
      count++;
    }

    return count;
  }, [users, radioValue, getRoles]);

  // Event handlers
  const handleUserSelection = (userId, checked) => {
    handleCheckboxChange(userId, checked);

    // Reset applied filter state when making new selections in current filter
    if (activeFilterType === FILTER_TYPES.USERS) {
      setHasAppliedFilter(false);
    }
  };

  const handleDateRangeSelection = (value) => {
    if (value === "Custom") {
      setDataCustom(true);
    } else {
      setDataCustom(false);
    }
    onChange({ target: { value } });

    // No need to reset hasAppliedFilter for date range since we don't use sorting
  };

  const handleApplyFilter = () => {
    getTimesheetById();
    setHasAppliedFilter(true); // Set this to true when applying filter
    setIsPopoverOpen(false);
  };

  const resetAllFilters = () => {
    // Reset users filter if user has access
    if (getRoles && !getRoles(["User"])) {
      handleCheckboxChange("", false);
    }

    // Reset date range to default "this_month"
    setDataCustom(false);
    onChange({ target: { value: "this_month" } });
    setHasAppliedFilter(false); // Reset applied filter state
    getTimesheetById("", ["SkipUser", "SkipDateRange"]);
  };

  const resetUsersFilter = () => {
    handleCheckboxChange("", false);
    setHasAppliedFilter(false);
    getTimesheetById("", ["SkipUser"]);
  };

  const resetDateRangeFilter = () => {
    setDataCustom(false);
    onChange({ target: { value: "this_month" } });
    setHasAppliedFilter(false);
    getTimesheetById("", ["SkipDateRange"]);
  };

  // Render users filter (only for non-User roles)
  const renderUsersFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Users</h4>

      <div className="filter-search">
        <Search
          placeholder="Search users..."
          onChange={(e) => {
            handleSearch(e);
            // Reset applied filter state when searching
            if (activeFilterType === FILTER_TYPES.USERS) {
              setHasAppliedFilter(false);
            }
          }}
          size="small"
        />
      </div>

      <div className="filter-options">
        {sortedUsers.map((item, index) => {
          const isSelected = users.includes(item._id);

          return (
            <div
              key={item._id || index}
              className={`assignee-item ${isSelected ? "selected" : ""}`}
            >
              <Checkbox
                checked={isSelected}
                onChange={(e) =>
                  handleUserSelection(item._id, e.target.checked)
                }
              >
                <span>{removeTitle(item.full_name)}</span>
              </Checkbox>
            </div>
          );
        })}
      </div>

      <div className="filter-actions">
        <Button  type="primary" onClick={handleApplyFilter} size="small" className="filter-btn">
          Apply Filter
        </Button>
        <Button size="small" className="delete-btn" onClick={resetUsersFilter}>
          Reset
        </Button>
      </div>
    </div>
  );

  // Date range shown in the picker: the custom range when one is applied, otherwise the
  // default "This Month" window the list is loaded with.
  const parseFilterDate = (value) => {
    const parsed = value && dayjs(value, ["YYYY-MM-DD", "DD-MM-YYYY"], true);
    return parsed && parsed.isValid() ? parsed : null;
  };
  const pickerRange = useMemo(() => {
    if (radioValue === "Custom") {
      const start = parseFilterDate(addInputStartDate?.start_date);
      const end = parseFilterDate(addInputEndDate?.end_date);
      return start || end ? [start, end] : null;
    }
    if (!radioValue || radioValue === "this_month") {
      return [dayjs().startOf("month"), dayjs()];
    }
    return null;
  }, [radioValue, addInputStartDate, addInputEndDate]);

  const handleRangeChange = (range) => {
    if (range && (range[0] || range[1])) {
      handleTaskStartDate("start_date", range[0] ? range[0].format("YYYY-MM-DD") : "");
      handleTaskEndDate("end_date", range[1] ? range[1].format("YYYY-MM-DD") : "");
      handleDateRangeSelection("Custom");
    } else {
      // Cleared: no date restriction
      handleDateRangeSelection("all");
    }
  };

  // Render date range filter
  const renderDateRangeFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Date Range</h4>

      <div className="filter-options" style={{ overflow: "visible" }}>
        <DatePicker.RangePicker
          value={pickerRange}
          onChange={handleRangeChange}
          format="DD-MM-YYYY"
          placeholder={["Start date", "End date"]}
          allowClear
          style={{ width: "100%" }}
          getPopupContainer={(node) => node.parentNode}
        />
      </div>

      <div className="filter-actions">
        <Button type="primary" onClick={handleApplyFilter} size="small" className="filter-btn">
          Apply Filter
        </Button>
        <Button
          size="small"
          className="delete-btn"
          onClick={resetDateRangeFilter}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderFilterContent = () => {
    switch (activeFilterType) {
      case FILTER_TYPES.USERS:
        return getRoles && !getRoles(["User"])
          ? renderUsersFilter()
          : renderDateRangeFilter();
      case FILTER_TYPES.DATE_RANGE:
        return renderDateRangeFilter();
      default:
        return getRoles && !getRoles(["User"])
          ? renderUsersFilter()
          : renderDateRangeFilter();
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
              Reset All
            </Button>
          )}
        </div>
        <Divider style={{ margin: "8px 0" }} />
        {/* Filter Menu Items */}
        {FILTER_MENU_ITEMS.map((item) => {
          // Calculate if this filter has active selections
          const hasActiveFilter =
            (item.key === FILTER_TYPES.USERS && users.length > 0) ||
            (item.key === FILTER_TYPES.DATE_RANGE &&
              radioValue &&
              radioValue !== "this_month");

          return (
            <div
              key={item.key}
              onClick={() => {
                // Safety check for Users filter
                if (
                  item.key === FILTER_TYPES.USERS &&
                  getRoles &&
                  getRoles(["User"])
                ) {
                  return;
                }
                setHasAppliedFilter(true);
                setActiveFilterType(item.key);
              }}
              className={`filter-menu-item ${
                activeFilterType === item.key ? "active" : ""
              }`}
            >
              <span>{item.label}</span>
              {/* Filter Tab Badge Indicator */}
              {hasActiveFilter && <Badge size="small" color="#038fde" />}
            </div>
          );
        })}
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
        <Button type="primary"  className="filter-btn">
          Filter
          </Button>
      </Popover>
    </div>
  );
};

export default memo(UsersAndDateRangeFilterComponent);
