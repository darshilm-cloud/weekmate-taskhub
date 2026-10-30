import React, { useState, useMemo, memo } from "react";
import { Button, Popover, Checkbox, Input, Badge, Divider, DatePicker } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";
import { removeTitle } from "../../util/nameFilter";

const { Search } = Input;

// Constants
const FILTER_TYPES = {
  SUBSCRIBERS: "subscribers",
  RANGE: "range",
};

const FILTER_MENU_ITEMS = [
  { key: FILTER_TYPES.SUBSCRIBERS, label: "Subscribers" },
  { key: FILTER_TYPES.RANGE, label: "Created Date" },
];

const hasRange = (range) => Boolean(range?.[0] || range?.[1]);

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
  // Applied "Created Date" range ([dayjs, dayjs] | null); the draft lives here until Apply
  createdDateRange = null,
}) => {
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(
    FILTER_TYPES.SUBSCRIBERS
  );
  const [hasAppliedFilter, setHasAppliedFilter] = useState(false);
  const [draftRange, setDraftRange] = useState(createdDateRange);

  const handleOpenChange = (visible) => {
    if (visible) setDraftRange(createdDateRange);
    setIsPopoverOpen(visible);
  };

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
  const isSubscribersActive = !(
    filterSubscribers[0] === "all" || filterSubscribers.length === 0
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;

    // Count as active if not "all" and has selections
    if (isSubscribersActive) {
      count += 1;
    }
    if (hasRange(createdDateRange)) {
      count += 1;
    }

    return count;
  }, [isSubscribersActive, createdDateRange]);

  const isFacetActive = (key) =>
    key === FILTER_TYPES.RANGE ? hasRange(draftRange) : isSubscribersActive;

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
    handleAllFilter(false, hasRange(draftRange) ? draftRange : null);
    setfilterSubscribersSearchInput("");
    setHasAppliedFilter(true); // Set this to true when applying filter
    setIsPopoverOpen(false);
  };

  const resetAllFilters = () => {
    handleSelectionAssignedFilter("all", true);
    setfilterSubscribersSearchInput("");
    setHasAppliedFilter(false); // Reset applied filter state
    setDraftRange(null);
    handleAllFilter(true, null);
  };

  // Check if subscriber is selected
  const isSubscriberSelected = (item) => {
    if (item.isSpecial) {
      return filterSubscribers[0] === "unassigned";
    }
    return filterSubscribers.includes(item._id);
  };

  const renderFilterActions = () => (
    <div className="filter-actions">
      <Button onClick={handleApplyFilter} size="small" className="filter-btn">
        Apply Filter
      </Button>
      <Button size="small" className="delete-btn" onClick={resetAllFilters}>
        Reset
      </Button>
    </div>
  );

  const renderCreatedDateFilter = () => (
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
      {renderFilterActions()}
    </div>
  );

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

      {renderFilterActions()}
    </div>
  );

  const popoverContent = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        {/* Filter Header */}
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Filters</h4>
          {(activeFiltersCount > 0 || hasRange(draftRange)) && (
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
            {isFacetActive(item.key) && <Badge size="small" color="#038fde" />}
          </div>
        ))}
      </div>
      <div className="filter-content">
        {activeFilterType === FILTER_TYPES.RANGE
          ? renderCreatedDateFilter()
          : renderSubscribersFilter()}
      </div>
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
        <Button  type="primary" className="filter-btn">
          Filter
          </Button>
      </Popover>
    </div>
  );
};

export default memo(SubscribersFilterComponent);
