import React, { useState, useMemo, memo } from "react";
import {
  Button,
  Popover,
  Checkbox,
  Input,
  Badge,
  Divider,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";
import { removeTitle } from "../../util/nameFilter";
import MyAvatar from "../../components/Avatar/MyAvatar";

const { Search } = Input;

// Constants
const FILTER_TYPES = {
  SUBSCRIBERS: "subscribers"
};

const FILTER_MENU_ITEMS = [
  { key: FILTER_TYPES.SUBSCRIBERS, label: "Subscribers" },
];

const SubscribersFilterComponent = ({
  // Subscribers props
  filterSubscribers,
  subscribers,
  filterSubscribersSearchInput,
  setfilterSubscribersSearchInput,
  handleSelectionAssignedFilter,
  handleAllFilter,
  handleCancleFilter,
  getDetails,
}) => {
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(FILTER_TYPES.SUBSCRIBERS);

  // Create combined list with "Unassigned Tasks" at the top
  const combinedSubscribersList = useMemo(() => {
    const unassignedOption = {
      _id: "unassigned",
      full_name: "Unassigned Tasks",
      emp_img: null,
      isSpecial: true
    };

    const filteredRegularSubscribers = subscribers?.filter((data) =>
      data.full_name
        ?.toLowerCase()
        .includes(filterSubscribersSearchInput.toLowerCase())
    ) || [];

    // If search is empty, show unassigned at top
    if (!filterSubscribersSearchInput.trim()) {
      return [unassignedOption, ...filteredRegularSubscribers];
    }

    // If searching and "unassigned" matches search, include it
    if ("unassigned tasks".toLowerCase().includes(filterSubscribersSearchInput.toLowerCase())) {
      return [unassignedOption, ...filteredRegularSubscribers];
    }

    // Otherwise, just show filtered regular subscribers
    return filteredRegularSubscribers;
  }, [subscribers, filterSubscribersSearchInput]);

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    
    // Count as active if not "all" and has selections
    if (!(filterSubscribers[0] === "all" || filterSubscribers.length === 0)) {
      count = 1;
    }
    
    return count;
  }, [filterSubscribers]);

  const resetAllFilters = () => {
    handleSelectionAssignedFilter("all", true); // Map "ALL" functionality to reset
    setfilterSubscribersSearchInput("");
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
          onSearch={(val) => setfilterSubscribersSearchInput(val)}
          onChange={(e) => setfilterSubscribersSearchInput(e.target.value)}
          size="small"
        />
      </div>

      {/* Combined list: Unassigned + Individual subscribers */}
      <div className="filter-options">
        {combinedSubscribersList.map((item, index) => (
          <div
            key={item._id || index}
            className={`assignee-item ${
              item.isSpecial 
                ? (filterSubscribers[0] === "unassigned" ? "selected" : "")
                : (filterSubscribers.includes(item._id) ? "selected" : "")
            }`}
          >
            <Checkbox
              checked={
                item.isSpecial 
                  ? filterSubscribers[0] === "unassigned"
                  : filterSubscribers.includes(item._id)
              }
              onChange={() =>
                item.isSpecial
                  ? handleSelectionAssignedFilter("unassigned", true)
                  : handleSelectionAssignedFilter(item._id)
              }
            />
            
            {/* Show avatar only for regular subscribers */}
            {!item.isSpecial && (
              <MyAvatar
                userName={item?.full_name}
                alt={item?.full_name}
                src={item.emp_img}
              />
            )}
            
            <span>{item.isSpecial ? item.full_name : removeTitle(item.full_name)}</span>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            handleAllFilter();
            setfilterSubscribersSearchInput("");
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
            resetAllFilters(); // Use reset function instead of cancel
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  // Don't render if no data available
  if (!getDetails || getDetails.length === 0) {
    return null;
  }

  const popoverContent = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        {/* Filter Header */}
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Filters</h4>
          
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