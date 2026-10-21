/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useMemo, useEffect } from "react";
import {
  Button,
  Popover,
  Checkbox,
  Radio,
  Input,
  Avatar,
  Select,
  DatePicker,
  Form,
  Badge,
  Divider,
  message,
} from "antd";
import {
  FilterOutlined,
  UserOutlined,
  CalendarOutlined,
  RightOutlined,
  TagOutlined,
} from "@ant-design/icons";
import moment from "moment";

const { Search } = Input;

// Constants
const FILTER_TYPES = {
  BUG_STATUS: "bugStatus",
  ASSIGNEE: "assignee",
  LABELS: "labels",
  DATES: "dates",
  TITLE: "title",
};



const FILTER_MENU_ITEMS = [
  { key: FILTER_TYPES.BUG_STATUS, label: "Bug Status" },
  { key: FILTER_TYPES.ASSIGNEE, label: "Assignee" },
  { key: FILTER_TYPES.LABELS, label: "Labels" },
  { key: FILTER_TYPES.DATES, label: "Date Range" },
];

// Helper Components
const UserAvatar = ({ userName, src, alt }) => (
  <Avatar
    src={src}
    icon={!src && <UserOutlined />}
    size="small"
    className="filter-avatar"
  >
    {!src && userName?.charAt(0)?.toUpperCase()}
  </Avatar>
);

// Utility Functions
// Sorting utility functions
const sortWithSelectedOnTop = (items, selectedItems, idKey = '_id') => {
  if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
    return items;
  }

  const selected = [];
  const unselected = [];

  items.forEach(item => {
    const itemId = item[idKey];
    if (selectedItems.includes(itemId)) {
      selected.push(item);
    } else {
      unselected.push(item);
    }
  });

  return [...selected, ...unselected];
};

const sortBugStatusWithSelectedOnTop = (bugs, selectedBugStatusId) => {
  if (!selectedBugStatusId) {
    return bugs;
  }

  const selected = [];
  const unselected = [];

  bugs.forEach(bug => {
    if (bug?._id === selectedBugStatusId) {
      selected.push(bug);
    } else {
      unselected.push(bug);
    }
  });

  return [...selected, ...unselected];
};

const BugFilter = ({ 
  boardTasksBugs = [], 
  projectLabels = [], 
  subscribersList = [], 
  onConfigUpdate 
}) => {
  // Main filter schema state - Initialize without undefined properties
  const [filterSchema, setFilterSchema] = useState({ 
    bugs: {}
  });
  
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(FILTER_TYPES.BUG_STATUS);
  const [hasNavigated, setHasNavigated] = useState(false);
  
  // Bug Status filter state
  const [bugStatusSearchQuery, setBugStatusSearchQuery] = useState("");
  const [selectedBugStatus, setSelectedBugStatus] = useState("");
  
  // Assignee filter state
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  
  // Labels filter state
  const [labelsSearchQuery, setLabelsSearchQuery] = useState("");
  const [selectedLabels, setSelectedLabels] = useState([]);
  
  // Date range filter state: [dayjs, dayjs] or null for each of Start Date / Due Date (sent to the API as from/to)
  // One From / To range that covers both the start and the due date: a bug matches when its
  // start–due period overlaps the range (a bug with a single date counts as that one day).
  const [dateRange, setDateRange] = useState(null);

  // Title search state
  const [titleSearch, setTitleSearch] = useState("");

  // Memoized filtered and sorted data
  const filteredBugStatuses = useMemo(() => {
    const filtered = boardTasksBugs?.filter((task) =>
      task?.title
        ?.toLowerCase()
        .includes(bugStatusSearchQuery.toLowerCase())
    ) || [];
    
    // Sort with selected bug status on top only after navigation
    return hasNavigated && activeFilterType === FILTER_TYPES.BUG_STATUS 
      ? sortBugStatusWithSelectedOnTop(filtered, selectedBugStatus)
      : filtered;
  }, [boardTasksBugs, bugStatusSearchQuery, selectedBugStatus, hasNavigated, activeFilterType]);

  const filteredAssignees = useMemo(() => {
    const filtered = subscribersList.filter((user) =>
      user?.full_name
        ?.toLowerCase()
        .includes(assigneeSearchQuery.toLowerCase())
    );
    
    // Sort with selected assignees on top only after navigation
    if (hasNavigated && activeFilterType === FILTER_TYPES.ASSIGNEE) {
      const selectedAssigneeIds = Array.isArray(selectedAssignees) ? selectedAssignees : [];
      return sortWithSelectedOnTop(filtered, selectedAssigneeIds, '_id');
    }
    return filtered;
  }, [subscribersList, assigneeSearchQuery, selectedAssignees, hasNavigated, activeFilterType]);

  const filteredLabels = useMemo(() => {
    const filtered = projectLabels.filter((label) =>
      label.title?.toLowerCase().includes(labelsSearchQuery.toLowerCase())
    );
    
    // Sort with selected labels on top only after navigation
    if (hasNavigated && activeFilterType === FILTER_TYPES.LABELS) {
      const selectedLabelIds = Array.isArray(selectedLabels) ? selectedLabels : [];
      return sortWithSelectedOnTop(filtered, selectedLabelIds, '_id');
    }
    return filtered;
  }, [projectLabels, labelsSearchQuery, selectedLabels, hasNavigated, activeFilterType]);

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    
    if (selectedBugStatus) count++;
    if (Array.isArray(selectedAssignees) && selectedAssignees.length > 0) count++;
    if (selectedAssignees === "unassigned") count++;
    if (Array.isArray(selectedLabels) && selectedLabels.length > 0) count++;
    if (selectedLabels === "unlabelled") count++;
    if (dateRange?.[0] || dateRange?.[1]) count++;
    if (titleSearch && titleSearch.trim() !== "") count++;
    
    return count;
  }, [selectedBugStatus, selectedAssignees, selectedLabels, dateRange, titleSearch]);

  // Event Handlers
  const handleBugStatusChange = (e) => {
    const status = e.target.value;
    setSelectedBugStatus(status);
    // Reset navigation state when making new selections in current filter
    if (activeFilterType === FILTER_TYPES.BUG_STATUS) {
      setHasNavigated(false);
    }
  };

  const handleAssigneeSelection = (userId, shouldRemoveAll = false) => {
    if (shouldRemoveAll) {
      setSelectedAssignees([]);
      return;
    }
    
    if (userId === "unassigned") {
      setSelectedAssignees("unassigned");
    } else {
      setSelectedAssignees(prev => 
        Array.isArray(prev) 
          ? prev.includes(userId)
            ? prev.filter(id => id !== userId)
            : [...prev, userId]
          : [userId]
      );
    }
    
    // Reset navigation state when making new selections in current filter
    if (activeFilterType === FILTER_TYPES.ASSIGNEE) {
      setHasNavigated(false);
    }
  };

  const handleLabelSelection = (labelId, shouldRemoveAll = false) => {
    if (shouldRemoveAll) {
      setSelectedLabels([]);
      return;
    }
    
    if (labelId === "unlabelled") {
      setSelectedLabels("unlabelled");
    } else {
      setSelectedLabels(prev => 
        Array.isArray(prev)
          ? prev.includes(labelId)
            ? prev.filter(id => id !== labelId)
            : [...prev, labelId]
          : [labelId]
      );
    }
    
    // Reset navigation state when making new selections in current filter
    if (activeFilterType === FILTER_TYPES.LABELS) {
      setHasNavigated(false);
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range && (range[0] || range[1]) ? range : null);
    if (activeFilterType === FILTER_TYPES.DATES) setHasNavigated(false);
  };

  const handleTitleSearchChange = (e) => {
    setTitleSearch(e.target.value);
  };

  // UNIFIED APPLY FUNCTION - This fixes the cross-filter issue
  const applyAllFilters = () => {
    // Build the complete filter schema with all active filters
    const newFilterSchema = { bugs: {} };

    // Add Bug Status filter
    if (selectedBugStatus) {
      newFilterSchema.Status = selectedBugStatus;
    }

    // Add Assignee filter
    if (selectedAssignees.length > 0) {
      newFilterSchema.bugs.assigneeIds = selectedAssignees;
    }

    // Add Labels filter
    if (selectedLabels.length > 0) {
      newFilterSchema.bugs.labelIds = selectedLabels;
    }

    // Date range filters - applied by the API (YYYY-MM-DD, inclusive; either end may be empty)
    const toRangeValue = (range) =>
      range && (range[0] || range[1])
        ? [range[0] ? range[0].format("YYYY-MM-DD") : "", range[1] ? range[1].format("YYYY-MM-DD") : ""]
        : undefined;
    if (toRangeValue(dateRange)) newFilterSchema.bugs.dateRange = toRangeValue(dateRange);

    // Add Title filter
    if (titleSearch.trim()) {
      newFilterSchema.bugs.title = titleSearch.trim();
    }

    setFilterSchema(newFilterSchema);
    // Reset navigation state after applying
    setHasNavigated(false);
    setIsPopoverOpen(false)
  };

  const resetAllFilters = () => {
    setFilterSchema({ bugs: {} });
    setSelectedBugStatus("");
    setSelectedAssignees([]);
    setSelectedLabels([]);
    setDateRange(null);
    setBugStatusSearchQuery("");
    setAssigneeSearchQuery("");
    setLabelsSearchQuery("");
    setTitleSearch("");
    // Reset navigation state
    setHasNavigated(false);
    setIsPopoverOpen(false);
  };

  const resetBugStatusFilter = () => {
    setSelectedBugStatus("");
    setBugStatusSearchQuery("");
    setFilterSchema(prev => {
      const { Status, ...rest } = prev;
      return rest;
    });
  };

  const resetAssigneeFilter = () => {
    setSelectedAssignees([]);
    setAssigneeSearchQuery("");
    setFilterSchema(prev => ({
      ...prev,
      bugs: {
        ...prev.bugs,
        assigneeIds: undefined
      }
    }));
  };

  const resetLabelsFilter = () => {
    setSelectedLabels([]);
    setLabelsSearchQuery("");
    setFilterSchema(prev => ({
      ...prev,
      bugs: {
        ...prev.bugs,
        labelIds: undefined
      }
    }));
  };

  const resetDateFilters = () => {
    setDateRange(null);
    setFilterSchema(prev => ({
      ...prev,
      bugs: {
        ...prev.bugs,
        dateRange: undefined
      }
    }));
  };

  // Render Methods
  const renderBugStatusFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Bug Status</h4>
      
      <div className="filter-search">
        <Search
          placeholder="Search bug status"
          value={bugStatusSearchQuery}
          onSearch={setBugStatusSearchQuery}
          onChange={(e) => setBugStatusSearchQuery(e.target.value)}
          size="small"
        />
      </div>
      
      <div className="filter-options">
        <Radio.Group
          value={selectedBugStatus}
          onChange={handleBugStatusChange}
          className="bug-status-radio-group"
        >
          {/* Add "None" option to allow deselection */}
          <div className={`filter-option-item ${selectedBugStatus === "" ? "selected" : ""}`}>
            <Radio value="">
              All
            </Radio>
          </div>
          
          {filteredBugStatuses.map((task, index) => (
            <div
              key={index}
              className={`filter-option-item ${selectedBugStatus === task?._id ? "selected" : ""}`}
            >
              <Radio value={task?._id}>
                {task?.title}
                {hasNavigated && 
                 activeFilterType === FILTER_TYPES.BUG_STATUS && 
                 selectedBugStatus === task?._id && (
                  <Badge 
                    size="small" 
                    color="#038fde" 
                    style={{ marginLeft: '8px' }} 
                  />
                )}
              </Radio>
            </div>
          ))}
        </Radio.Group>
      </div>
      
      <div className="filter-actions">
        <Button
        type="primary"
          onClick={applyAllFilters}
          size="small"
          className="filter-btn"
        >
          Apply Filter
        </Button>
        <Button
          size="small"
          className="delete-btn"
          onClick={resetBugStatusFilter}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderAssigneeFilter = () => {
    const shouldShowUnassigned = "unassigned bugs".includes(assigneeSearchQuery.toLowerCase());
    
    return (
      <div className="filter-content-inner">
        <h4 className="filter-title">Filter by Assignee</h4>
        
        <div className="filter-search">
          <Search
            placeholder="Search assignee"
            value={assigneeSearchQuery}
            onSearch={setAssigneeSearchQuery}
            onChange={(e) => setAssigneeSearchQuery(e.target.value)}
            size="small"
          />
        </div>
        
        <div className="filter-options">
          {/* Unassigned Bugs Option */}
          {(selectedAssignees === "unassigned" || shouldShowUnassigned) && (
            <div 
              className={`assignee-item ${selectedAssignees === "unassigned" ? "selected" : ""}`}
              style={{ 
                order: (hasNavigated && 
                       activeFilterType === FILTER_TYPES.ASSIGNEE && 
                       selectedAssignees === "unassigned") ? -1 : 0 
              }}
            >
              <Checkbox
                checked={selectedAssignees === "unassigned"}
                onChange={() => handleAssigneeSelection("unassigned")}
              >
                Unassigned Bugs
              </Checkbox>
              {hasNavigated && 
               activeFilterType === FILTER_TYPES.ASSIGNEE && 
               selectedAssignees === "unassigned" && (
                <Badge 
                  size="small" 
                  color="#038fde" 
                  style={{ marginLeft: '8px' }} 
                />
              )}
            </div>
          )}
          
          {/* Regular Assignees */}
          {filteredAssignees.map((user, index) => (
            <div
              key={index}
              className={`assignee-item ${
                Array.isArray(selectedAssignees) && selectedAssignees.includes(user?._id) 
                  ? "selected" 
                  : ""
              }`}
            >
              <Checkbox
                checked={Array.isArray(selectedAssignees) && selectedAssignees.includes(user?._id)}
                onChange={() => handleAssigneeSelection(user?._id)}
              />
             
              <span>{user.full_name}</span>
              {hasNavigated && 
               activeFilterType === FILTER_TYPES.ASSIGNEE &&
               Array.isArray(selectedAssignees) && 
               selectedAssignees.includes(user?._id) && (
                <Badge 
                  size="small" 
                  color="#038fde" 
                  style={{ marginLeft: '8px' }} 
                />
              )}
            </div>
          ))}
        </div>
        
        <div className="filter-actions">
          <Button
            onClick={applyAllFilters}
            size="small"
            className="filter-btn"
          >
            Apply Filter
          </Button>
          <Button
            size="small"
            className="delete-btn"
            onClick={resetAssigneeFilter}
          >
            Reset
          </Button>
        </div>
      </div>
    );
  };

  const renderLabelsFilter = () => {
    const shouldShowUnlabelled = "unlabelled bug".includes(labelsSearchQuery.toLowerCase());
    
    return (
      <div className="filter-content-inner">
        <h4 className="filter-title">Filter by Labels</h4>
        
        <div className="filter-search">
          <Search
            placeholder="Search labels"
            value={labelsSearchQuery}
            onSearch={setLabelsSearchQuery}
            onChange={(e) => setLabelsSearchQuery(e.target.value)}
            size="small"
          />
        </div>
        
        <div className="filter-options">
          {/* Unlabelled Bug Option */}
          {(selectedLabels === "unlabelled" || shouldShowUnlabelled) && (
            <div 
              className={`label-item ${selectedLabels === "unlabelled" ? "selected" : ""}`}
              style={{ 
                order: (hasNavigated && 
                       activeFilterType === FILTER_TYPES.LABELS && 
                       selectedLabels === "unlabelled") ? -1 : 0 
              }}
            >
              <Checkbox
                checked={selectedLabels === "unlabelled"}
                onChange={() => handleLabelSelection("unlabelled")}
              >
                Unlabelled Bug
              </Checkbox>
              <Avatar
                icon={<TagOutlined />}
                size="small"
                style={{ backgroundColor: "#f5f5f5", color: "#999" }}
              />
              {hasNavigated && 
               activeFilterType === FILTER_TYPES.LABELS && 
               selectedLabels === "unlabelled" && (
                <Badge 
                  size="small" 
                  color="#038fde" 
                  style={{ marginLeft: '8px' }} 
                />
              )}
            </div>
          )}
         
          {/* Regular Labels */}
          {filteredLabels.map((label) => (
            <div
              key={label._id}
              className={`label-item ${
                Array.isArray(selectedLabels) && selectedLabels.includes(label._id) 
                  ? "selected" 
                  : ""
              }`}
            >
              <Checkbox
                checked={Array.isArray(selectedLabels) && selectedLabels.includes(label._id)}
                onChange={() => handleLabelSelection(label._id)}
              />
              <Avatar
                size="small"
                style={{ backgroundColor: label.color }}
              />
              <span>{label.title}</span>
              {hasNavigated && 
               activeFilterType === FILTER_TYPES.LABELS &&
               Array.isArray(selectedLabels) && 
               selectedLabels.includes(label._id) && (
                <Badge 
                  size="small" 
                  color="#038fde" 
                  style={{ marginLeft: '8px' }} 
                />
              )}
            </div>
          ))}
        </div>
        
        <div className="filter-actions">
          <Button
            onClick={applyAllFilters}
            size="small"
            className="filter-btn"
          >
            Apply Filter
          </Button>
          <Button
            size="small"
            className="delete-btn"
            onClick={resetLabelsFilter}
          >
            Reset
          </Button>
        </div>
      </div>
    );
  };

  const renderDatesFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Date Range</h4>

      <div className="filter-options" style={{ overflow: "visible" }}>
        <div className="date-filter-section">
          <label className="date-filter-label">Start / Due Date</label>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="DD-MM-YYYY"
            placeholder={["From", "To"]}
            allowClear
            style={{ width: "100%" }}
            getPopupContainer={(node) => node.parentNode}
          />
          <div style={{ marginTop: 6, fontSize: 12, color: "#8c8c8c" }}>
            Shows bugs whose start or due date falls in this range, or whose start–due period spans it.
          </div>
        </div>
      </div>

      <div className="filter-actions">
        <Button onClick={applyAllFilters} size="small" className="filter-btn">
          Apply Filter
        </Button>
        <Button size="small" className="delete-btn" onClick={resetDateFilters}>
          Reset
        </Button>
      </div>
    </div>
  );

  const renderFilterContent = () => {
    switch (activeFilterType) {
      case FILTER_TYPES.BUG_STATUS:
        return renderBugStatusFilter();
      case FILTER_TYPES.ASSIGNEE:
        return renderAssigneeFilter();
      case FILTER_TYPES.LABELS:
        return renderLabelsFilter();
      case FILTER_TYPES.DATES:
        return renderDatesFilter();
      default:
        return renderBugStatusFilter();
    }
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
              Reset All
            </Button>
          )}
        </div>
        
        <Divider style={{ margin: "8px 0" }} />
        
        {/* Filter Menu Items */}
        {FILTER_MENU_ITEMS.map((item) => (
          <div
            key={item.key}
            onClick={() => {
              setHasNavigated(true);
              setActiveFilterType(item.key);
            }}
            className={`filter-menu-item ${activeFilterType === item.key ? "active" : ""}`}
          >
            <span>{item.label}</span>
            {((item.key === FILTER_TYPES.BUG_STATUS && selectedBugStatus) ||
              (item.key === FILTER_TYPES.ASSIGNEE &&
                (Array.isArray(selectedAssignees)
                  ? selectedAssignees.length > 0
                  : selectedAssignees === "unassigned")) ||
              (item.key === FILTER_TYPES.LABELS &&
                (Array.isArray(selectedLabels)
                  ? selectedLabels.length > 0
                  : selectedLabels === "unlabelled")) ||
              (item.key === FILTER_TYPES.DATES &&
                dateRange)) && (
              <Badge size="small" color="#038fde" />
            )}
          </div>
        ))}
      </div>
      
      <div className="filter-content">
        {renderFilterContent()}
      </div>
    </div>
  );

  useEffect(() => {
    onConfigUpdate(filterSchema);
  }, [filterSchema]);

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
        <Button  className="filter-btn">
          Filter
          </Button>
      </Popover>
    </div>
  );
};

export default BugFilter;