import React, { useState, useMemo, memo } from "react";
import { Button, Popover, Checkbox, Input, Badge, Divider } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";
import { removeTitle } from "../../util/nameFilter";

const { Search } = Input;

// Constants
const FILTER_TYPES = {
  SUBSCRIBERS: "subscribers",
};

const FILTER_MENU_ITEMS = [
  { key: FILTER_TYPES.SUBSCRIBERS, label: "Subscribers" },
];

// Updated sorting utility function
const sortWithSelectedOnTop = (items, selectedItems) => {
  // Separate unassigned option from regular subscribers
  const unassignedItems = items.filter((item) => item.isSpecial);
  const regularItems = items.filter((item) => !item.isSpecial);

  if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
    return [...unassignedItems, ...regularItems];
  }

  const selectedRegular = [];
  const unselectedRegular = [];

  // Sort only regular subscribers
  regularItems.forEach((item) => {
    if (selectedItems.includes(item._id)) {
      selectedRegular.push(item);
    } else {
      unselectedRegular.push(item);
    }
  });

  // Always return: [Unassigned, Selected Regular Subscribers, Unselected Regular Subscribers]
  return [...unassignedItems, ...selectedRegular, ...unselectedRegular];
};

const SubscribersFilterComponent = ({
  // Subscribers props
  filterSubscribers,
  subscribers,
  filterSubscribersSearchInput,
  setfilterSubscribersSearchInput,
  handleSelectionAssignedFilter,
  handleAllFilter,
}) => {
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(
    FILTER_TYPES.SUBSCRIBERS
  );
  const [hasAppliedFilter, setHasAppliedFilter] = useState(false);

  // Create combined list with "Unassigned Tasks" always at the top
  const combinedSubscribersList = useMemo(() => {
    const unassignedOption = {
      _id: "unassigned",
      full_name: "Unassigned Tasks",
      emp_img: null,
      isSpecial: true,
    };

    const filteredRegularSubscribers =
      subscribers?.filter((data) =>
        data.full_name
          ?.toLowerCase()
          .includes(filterSubscribersSearchInput.toLowerCase())
      ) || [];

    let baseList = [];

    // If search is empty, show unassigned at top
    if (!filterSubscribersSearchInput.trim()) {
      baseList = [unassignedOption, ...filteredRegularSubscribers];
    } else {
      // If searching and "unassigned" matches search, include it
      if (
        "unassigned tasks"
          .toLowerCase()
          .includes(filterSubscribersSearchInput.toLowerCase())
      ) {
        baseList = [unassignedOption, ...filteredRegularSubscribers];
      } else {
        // Otherwise, just show filtered regular subscribers (no unassigned)
        baseList = filteredRegularSubscribers;
      }
    }

    // Apply sorting - this will keep unassigned at top and sort only regular subscribers
    if (hasAppliedFilter) {
      return sortWithSelectedOnTop(baseList, filterSubscribers);
    }

    return baseList;
  }, [
    subscribers,
    filterSubscribersSearchInput,
    filterSubscribers,
    hasAppliedFilter,
  ]);

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;

    // Count as active if not "all" and has selections
    if (!(filterSubscribers[0] === "all" || filterSubscribers.length === 0)) {
      count = 1;
    }

    return count;
  }, [filterSubscribers]);

  // Event Handlers
  const handleSubscriberSelection = (id, isSpecial = false) => {
    if (isSpecial) {
      handleSelectionAssignedFilter("unassigned", true);
    } else {
      handleSelectionAssignedFilter(id);
    }

    // Reset applied filter state when making new selections
    setHasAppliedFilter(false);
  };

  const handleSearchChange = (value) => {
    setfilterSubscribersSearchInput(value);

    // Reset applied filter state when searching
    setHasAppliedFilter(false);
  };

  const handleApplyFilter = () => {
    handleAllFilter();
    setfilterSubscribersSearchInput("");
    setHasAppliedFilter(true); // Set this to true when applying filter
    setIsPopoverOpen(false);
  };

  const resetAllFilters = () => {
    handleSelectionAssignedFilter("all", true);
    setfilterSubscribersSearchInput("");
    setHasAppliedFilter(false); // Reset applied filter state
    handleAllFilter(true);
  };

  // Check if subscriber is selected
  const isSubscriberSelected = (item) => {
    if (item.isSpecial) {
      return filterSubscribers[0] === "unassigned";
    }
    return filterSubscribers.includes(item._id);
  };

  // Main render method for subscribers filter
  const renderSubscribersFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Subscribers</h4>

      {/* Search */}
      <div className="filter-search">
        <Search
          placeholder="Search subscribers..."
          value={filterSubscribersSearchInput}
          onSearch={handleSearchChange}
          onChange={(e) => handleSearchChange(e.target.value)}
          size="small"
        />
      </div>

      {/* Combined list: Unassigned + Individual subscribers */}
      <div className="filter-options">
        {combinedSubscribersList.map((item, index) => {
          const isSelected = isSubscriberSelected(item);

          return (
            <div
              key={item._id || index}
              className={`assignee-item ${isSelected ? "selected" : ""}`}
            >
              <Checkbox
                checked={isSelected}
                onChange={() =>
                  handleSubscriberSelection(item._id, item.isSpecial)
                }
              />
              <span>
                {item.isSpecial ? item.full_name : removeTitle(item.full_name)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="filter-actions">
        <Button onClick={handleApplyFilter} size="small" className="filter-btn">
          Apply Filter
        </Button>
        <Button size="small" className="delete-btn" onClick={resetAllFilters}>
          Reset
        </Button>
      </div>
    </div>
  );

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
            onClick={() => setActiveFilterType(item.key)}
            className={`filter-menu-item ${
              activeFilterType === item.key ? "active" : ""
            }`}
          >
            <span>{item.label}</span>
            {/* Filter Tab Badge Indicator */}
            {activeFiltersCount > 0 && <Badge size="small" color="#1890ff" />}
          </div>
        ))}
      </div>
      <div className="filter-content">{renderSubscribersFilter()}</div>
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

export default memo(SubscribersFilterComponent);
