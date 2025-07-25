import React, { useState } from "react";
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
} from "antd";
import {
  RightOutlined,
  FilterOutlined,
  UserOutlined,
  CalendarOutlined,
  ClearOutlined,
  QuestionCircleOutlined,
  TagOutlined,
} from "@ant-design/icons";
import "./FilterUI.css";

const { Search } = Input;

const MyAvatar = ({ userName, src, alt }) => (
  <Avatar
    src={src}
    icon={!src && <UserOutlined />}
    size="small"
    className="filter-avatar"
  >
    {!src && userName?.charAt(0)?.toUpperCase()}
  </Avatar>
);

const FilterUI = ({
  filterStatusSearchInput,
  setFilterStatusSearchInput,
  boardTasks,
  filterStatus,
  handleFilterStatus,
  handleAllFilter,
  filterAssigned,
  handleSelectionAssignedFilter,
  filterAssignedSearchInput,
  setFilterAssignedSearchInput,
  subscribersList,
  filterOnLabels,
  handleSelectionlabelFilter,
  filterLabelsSearchInput,
  setFilterLabelsSearchInput,
  projectLabels,
  // New date filter props
  DateOption,
  handleStartChange,
  handleDueChange,
  selectValStartdate,
  selectValDuedate,
  setSelectValDuedate,
  handleStartDateRange,
  handleDueDateRange,
  handleStartDueFilter,
  filterStartDate,
  filterDueDate,
  // Reset functions (you'll need to pass these from parent component)
  handleResetAllFilters,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilterType, setSelectedFilterType] = useState(null);

  // Calculate the number of active filters
  const getActiveFiltersCount = () => {
    let count = 0;
    
    // Status filter
    if (filterStatus && filterStatus !== null) {
      count++;
    }
    
    // Assignee filter
    if (filterAssigned && Array.isArray(filterAssigned) && filterAssigned.length > 0) {
      count++;
    } else if (filterAssigned === "unassigned") {
      count++;
    }
    
    // Labels filter
    if (filterOnLabels && Array.isArray(filterOnLabels) && filterOnLabels.length > 0) {
      count++;
    }
    
    // Date filters (start date)
    if (filterStartDate && filterStartDate !== null && filterStartDate !== "Any") {
      count++;
    }
    
    // Date filters (due date)
    if (filterDueDate && filterDueDate !== null && filterDueDate !== "Any") {
      count++;
    }
    
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const handleFilterTypeSelect = (type) => {
    setSelectedFilterType(type);
  };

  const handleResetFilters = () => {
    // Reset all filter states
    if (handleResetAllFilters) {
      handleResetAllFilters();
    }
    
    // Reset local states
    setFilterStatusSearchInput("");
    setFilterAssignedSearchInput("");
    setFilterLabelsSearchInput("");
    setSelectValDuedate(false);
    setSelectedFilterType(null);
    setIsFilterOpen(false);
  };

  const filterMenuItems = [
    { key: "status", label: "Status"},
    { key: "assignee", label: "Assignee" },
    { key: "labels", label: "Labels" },
    { key: "dates", label: "Dates" },
  ];

  const renderFilterContent = () => {
    switch (selectedFilterType) {
      case "status":
        return (
          <div className="filter-content-inner">
            <h4 className="filter-title">Filter by Status</h4>

            <div className="filter-search">
              <Search
                placeholder="Search status"
                value={filterStatusSearchInput}
                onSearch={(val) => setFilterStatusSearchInput(val)}
                onChange={(e) => setFilterStatusSearchInput(e.target.value)}
                size="small"
              />
            </div>

            <div className="filter-options">
              <Radio.Group 
                value={filterStatus} 
                onChange={handleFilterStatus}
                style={{ width: '100%' }}
              >
                
                {boardTasks
                  ?.filter((item) =>
                    item.workflowStatus?.title
                      .toLowerCase()
                      .includes(filterStatusSearchInput.toLowerCase())
                  )
                  .map((val, index) => (
                    <div
                      key={index}
                      className={`filter-option-item ${
                        filterStatus === val?.workflowStatus?._id
                          ? "selected"
                          : ""
                      }`}
                    >
                      <Radio value={val?.workflowStatus?._id}>
                        {val?.workflowStatus?.title}
                      </Radio>
                    </div>
                  ))}
              </Radio.Group>
            </div>

            <div className="filter-actions">
              <Button
                onClick={() =>
                  handleAllFilter("workflowStatusId", filterStatus)
                }
                type="primary"
                size="small"
                className="filter-apply-btn"
              >
                Apply Filter
              </Button>
              <Button
                size="small"
                className="filter-cancel-btn"
                onClick={() => {
                  setSelectedFilterType(null);
                  setFilterStatusSearchInput("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        );

      case "assignee":
        return (
          <div className="filter-content-inner">
            <h4 className="filter-title">Filter by Assignee</h4>

            <div className="filter-search">
              <Search
                placeholder="Search assignee"
                value={filterAssignedSearchInput}
                onSearch={(val) => setFilterAssignedSearchInput(val)}
                onChange={(e) => setFilterAssignedSearchInput(e.target.value)}
                size="small"
              />
            </div>

            <div className="filter-options">
              {/* Unassigned Tasks - styled like other assignee items */}
              {("unassigned tasks").includes(filterAssignedSearchInput.toLowerCase()) && (
                <div
                  className={`assignee-item ${
                    filterAssigned === "unassigned" ? "selected" : ""
                  }`}
                >
                  <Checkbox
                    checked={filterAssigned === "unassigned"}
                    onChange={() => handleSelectionAssignedFilter("unassigned")}
                  />
                  <Avatar
                    icon={<QuestionCircleOutlined />}
                    size="small"
                    style={{ backgroundColor: '#d9d9d9', color: '#666' }}
                    className="filter-avatar"
                  />
                  <span>Unassigned Tasks</span>
                </div>
              )}

              {/* Regular assignees */}
              {subscribersList
                .filter((item) =>
                  item?.full_name
                    .toLowerCase()
                    .includes(filterAssignedSearchInput.toLowerCase())
                )
                .map((item, index) => (
                  <div
                    key={index}
                    className={`assignee-item ${
                      filterAssigned.includes(item?._id) ? "selected" : ""
                    }`}
                  >
                    <Checkbox
                      checked={filterAssigned.includes(item?._id)}
                      onChange={() => handleSelectionAssignedFilter(item?._id)}
                    />
                    <MyAvatar
                      userName={item?.full_name}
                      alt={item?.full_name}
                      src={item.emp_img}
                    />
                    <span>{item.full_name}</span>
                  </div>
                ))}
            </div>

            <div className="filter-actions">
              <Button
                onClick={() => handleAllFilter("assigneeIds", filterAssigned)}
                type="primary"
                size="small"
                className="filter-apply-btn"
              >
                Apply Filter
              </Button>
              <Button
                size="small"
                className="filter-cancel-btn"
                onClick={() => {
                  setSelectedFilterType(null);
                  setFilterAssignedSearchInput("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        );

      case "labels":
        return (
          <div className="filter-content-inner">
            <h4 className="filter-title">Filter by Labels</h4>

            <div className="filter-search">
              <Search
                placeholder="Search labels"
                value={filterLabelsSearchInput}
                onSearch={(val) => setFilterLabelsSearchInput(val)}
                onChange={(e) => setFilterLabelsSearchInput(e.target.value)}
                size="small"
              />
            </div>

            <div className="filter-options">
              {/* Unlabelled Task - styled like other label items */}
              {("unlabelled task").includes(filterLabelsSearchInput.toLowerCase()) && (
                <div
                  className={`label-item ${
                    filterOnLabels.includes("unlabelled") ? "selected" : ""
                  }`}
                >
                  <Checkbox
                    checked={filterOnLabels.includes("unlabelled")}
                    onChange={() => handleSelectionlabelFilter("unlabelled")}
                  />
                  <Avatar
                    icon={<TagOutlined />}
                    size="small"
                    style={{ backgroundColor: '#f5f5f5', color: '#999' }}
                  />
                  <span>Unlabelled Task</span>
                </div>
              )}

              {/* Regular labels */}
              {projectLabels
                .filter((item) =>
                  item.title
                    .toLowerCase()
                    .includes(filterLabelsSearchInput.toLowerCase())
                )
                .map((item) => (
                  <div
                    key={item._id}
                    className={`label-item ${
                      filterOnLabels.includes(item._id) ? "selected" : ""
                    }`}
                  >
                    <Checkbox
                      checked={filterOnLabels.includes(item._id)}
                      onChange={() => handleSelectionlabelFilter(item._id)}
                    />
                    <Avatar
                      size="small"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.title}</span>
                  </div>
                ))}
            </div>

            <div className="filter-actions">
              <Button
                onClick={() => handleAllFilter("labelIds", filterOnLabels)}
                type="primary"
                size="small"
                className="filter-apply-btn"
              >
                Apply Filter
              </Button>
              <Button
                size="small"
                className="filter-cancel-btn"
                onClick={() => {
                  setSelectedFilterType(null);
                  setFilterLabelsSearchInput("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        );

      case "dates":
        return (
          <div className="filter-content-inner">
            <h4 className="filter-title">Filter by Dates</h4>

            <div className="date-filter-section">
              <Form.Item>
                <label className="date-filter-label">Start Date</label>
                <Select
                  className="date-select"
                  defaultValue="Any"
                  onChange={handleStartChange}
                  options={DateOption}
                />
                {selectValStartdate && (
                  <div className="calendar-event-block">
                    <Form.Item>
                      <DatePicker
                        placeholder="From date"
                        onChange={(_, dateString) =>
                          handleStartDateRange(0, dateString)
                        }
                        suffixIcon={<CalendarOutlined />}
                      />
                    </Form.Item>
                    <span className="calendar-separator">to</span>
                    <Form.Item>
                      <DatePicker
                        placeholder="To date"
                        onChange={(_, dateString) =>
                          handleStartDateRange(1, dateString)
                        }
                        suffixIcon={<CalendarOutlined />}
                      />
                    </Form.Item>
                  </div>
                )}
              </Form.Item>
            </div>

            <div className="date-filter-section">
              <Form.Item>
                <label className="date-filter-label">Due Date</label>
                <Select
                  className="date-select"
                  defaultValue="Any"
                  onChange={handleDueChange}
                  options={DateOption}
                />
                {selectValDuedate && (
                  <div className="calendar-event-block">
                    <Form.Item>
                      <DatePicker
                        placeholder="From date"
                        onChange={(_, dateString) =>
                          handleDueDateRange(0, dateString)
                        }
                        suffixIcon={<CalendarOutlined />}
                      />
                    </Form.Item>
                    <span className="calendar-separator">to</span>
                    <Form.Item>
                      <DatePicker
                        placeholder="To date"
                        onChange={(_, dateString) =>
                          handleDueDateRange(1, dateString)
                        }
                        suffixIcon={<CalendarOutlined />}
                      />
                    </Form.Item>
                  </div>
                )}
              </Form.Item>
            </div>

            <div className="view-filter-summary">
              <CalendarOutlined className="view-filter-icon" />
              <span>
                <span className="date-range-display">Start:</span>{" "}
                {!Array.isArray(filterStartDate)
                  ? DateOption?.find((val) => val.value === filterStartDate)
                      ?.label || "Any"
                  : "Custom"}
                , <span className="date-range-display">Due:</span>{" "}
                {!Array.isArray(filterDueDate)
                  ? DateOption?.find((val) => val.value === filterDueDate)
                      ?.label || "Any"
                  : "Custom"}
              </span>
            </div>

            <div className="filter-actions">
              <Button
                onClick={() => {
                  handleStartDueFilter(filterStartDate, filterDueDate);
                }}
                type="primary"
                size="small"
                className="filter-apply-btn"
              >
                Apply Filter
              </Button>
              <Button
                size="small"
                className="filter-cancel-btn"
                onClick={() => {
                  setSelectedFilterType(null);
                  setSelectValDuedate(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="filter-content-inner">
            <div className="filter-empty-state">
              Select a filter from the left to configure it
            </div>
          </div>
        );
    }
  };

  const filterContent = (
    <div className="filter-popover-content">
      <div className="filter-sidebar">
        {/* Filter Header with Reset Button */}
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Filters</h4>
          {activeFiltersCount > 0 && (
            <Button
              size="small"
              type="text"
              icon={<ClearOutlined />}
              onClick={handleResetFilters}
              className="reset-filters-btn"
              title="Reset all filters"
            >
              Reset ({activeFiltersCount})
            </Button>
          )}
        </div>
        
        <Divider style={{ margin: '8px 0' }} />
        
        {filterMenuItems.map((item) => (
          <div
            key={item.key}
            onClick={() => handleFilterTypeSelect(item.key)}
            className={`filter-menu-item ${
              selectedFilterType === item.key ? "active" : ""
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
        content={filterContent}
        trigger="click"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        placement="bottomLeft"
        overlayStyle={{ maxWidth: "none" }}
      >
        <Badge 
          count={activeFiltersCount} 
          size="small"
          offset={[10, 0]}
          color="#1890ff"
        >
          <Button icon={<FilterOutlined />} className="filter-button">
            Filter
          </Button>
        </Badge>
      </Popover>
    </div>
  );
};

export default FilterUI;
