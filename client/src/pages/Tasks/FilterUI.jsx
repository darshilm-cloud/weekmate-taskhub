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
  TagOutlined,
} from "@ant-design/icons";
import "./FilterUI.css";
import moment from "moment";

const { Search } = Input;

// Constants
const FILTER_TYPES = {
  STATUS: "status",
  ASSIGNEE: "assignee",
  LABELS: "labels",
  DATES: "dates",
};

const DATE_OPTIONS = [
  { key: "1", value: "", label: "Any" },
  { key: "2", value: moment().format("YYYY-MM-DD"), label: "Today" },
  {
    key: "3",
    value: `["${moment().startOf("week").format("YYYY-MM-DD")}","${moment().endOf("week").format("YYYY-MM-DD")}"]`,
    label: "This week",
  },
  {
    key: "4",
    value: `["${moment().startOf("month").format("YYYY-MM-DD")}","${moment().endOf("month").format("YYYY-MM-DD")}"]`,
    label: "This month",
  },
  { key: "5", value: moment().subtract(1, "day").format("YYYY-MM-DD"), label: "Yesterday" },
  {
    key: "6",
    value: `["${moment().subtract(1, "week").startOf("week").format("YYYY-MM-DD")}","${moment().subtract(1, "week").endOf("week").format("YYYY-MM-DD")}"]`,
    label: "Last week",
  },
  {
    key: "7",
    value: `["${moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD")}","${moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD")}"]`,
    label: "Last month",
  },
  { key: "8", value: "next7days", label: "Next 7 days" },
  { key: "9", value: "next30days", label: "Next 30 days" },
  { key: "10", value: null, label: "No date" },
  { key: "11", value: "Custom", label: "Custom" },
];

const FILTER_MENU_ITEMS = [
  { key: FILTER_TYPES.STATUS, label: "Status" },
  { key: FILTER_TYPES.ASSIGNEE, label: "Assignee" },
  { key: FILTER_TYPES.LABELS, label: "Labels" },
  { key: FILTER_TYPES.DATES, label: "Dates" },
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
const validateArray = (arr) => arr.some(item => item !== "");

const parseDateValue = (value) => {
  if (typeof value === 'string' && value.includes("[")) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const FilterUI = ({ boardTasks = [], projectLabels = [], subscribersList = [], onConfigUpdate }) => {
  // Main filter schema state
  const [filterSchema, setFilterSchema] = useState({ tasks: {} });
  
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(FILTER_TYPES.STATUS);
  
  // Status filter state
  const [statusSearchQuery, setStatusSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  
  // Assignee filter state
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  
  // Labels filter state
  const [labelsSearchQuery, setLabelsSearchQuery] = useState("");
  const [selectedLabels, setSelectedLabels] = useState([]);
  
  // Date filter state
  const [isCustomStartDate, setIsCustomStartDate] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [startDateSelectValue, setStartDateSelectValue] = useState("");
  const [customStartDateRange, setCustomStartDateRange] = useState(["", ""]);
  const [isCustomDueDate, setIsCustomDueDate] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState("");
  const [dueDateSelectValue, setDueDateSelectValue] = useState("");
  const [customDueDateRange, setCustomDueDateRange] = useState(["", ""]);

  // Memoized filtered data
  const filteredStatuses = useMemo(() => {
    return boardTasks?.filter((task) =>
      task.workflowStatus?.title
        .toLowerCase()
        .includes(statusSearchQuery.toLowerCase())
    ) || [];
  }, [boardTasks, statusSearchQuery]);

  const filteredAssignees = useMemo(() => {
    return subscribersList.filter((user) =>
      user?.full_name
        .toLowerCase()
        .includes(assigneeSearchQuery.toLowerCase())
    );
  }, [subscribersList, assigneeSearchQuery]);

  const filteredLabels = useMemo(() => {
    return projectLabels.filter((label) =>
      label.title?.toLowerCase().includes(labelsSearchQuery.toLowerCase())
    );
  }, [projectLabels, labelsSearchQuery]);

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    
    if (selectedStatus) count++;
    if (Array.isArray(selectedAssignees) && selectedAssignees.length > 0) count++;
    if (selectedAssignees === "unassigned") count++;
    if (Array.isArray(selectedLabels) && selectedLabels.length > 0) count++;
    if (selectedLabels === "unlabelled") count++;
    if (selectedStartDate && selectedStartDate !== "") count++;
    if (selectedDueDate && selectedDueDate !== "") count++;
    
    return count;
  }, [selectedStatus, selectedAssignees, selectedLabels, selectedStartDate, selectedDueDate]);

  // Event Handlers
  const handleStatusChange = (e) => {
    const status = e.target.value;
    const isChecked = e.target.checked;
    setSelectedStatus(isChecked ? status : "");
  };

  const handleAssigneeSelection = (userId, shouldRemoveAll = false) => {
    if (shouldRemoveAll) {
      setSelectedAssignees([]);
      return;
    }
    
    if (userId === "unassigned") {
      setSelectedAssignees("unassigned");
      return;
    }
    
    setSelectedAssignees(prev => 
      Array.isArray(prev) 
        ? prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
        : [userId]
    );
  };

  const handleLabelSelection = (labelId, shouldRemoveAll = false) => {
    if (shouldRemoveAll) {
      setSelectedLabels([]);
      return;
    }
    
    if (labelId === "unlabelled") {
      setSelectedLabels("unlabelled");
      return;
    }
    
    setSelectedLabels(prev => 
      Array.isArray(prev)
        ? prev.includes(labelId)
          ? prev.filter(id => id !== labelId)
          : [...prev, labelId]
        : [labelId]
    );
  };

  const handleStartDateChange = (value) => {
    setStartDateSelectValue(value);
    
    if (value === "Custom") {
      setIsCustomStartDate(true);
      return;
    }
    
    setIsCustomStartDate(false);
    const parsedValue = parseDateValue(value);
    setSelectedStartDate(parsedValue);
  };

  const handleCustomStartDateChange = (position, dateString) => {
    const newRange = [...customStartDateRange];
    newRange[position] = dateString;
    setCustomStartDateRange(newRange);
    setSelectedStartDate(newRange);
  };

  const handleDueDateChange = (value) => {
    setDueDateSelectValue(value);
    
    if (value === "Custom") {
      setIsCustomDueDate(true);
      return;
    }
    
    setIsCustomDueDate(false);
    const parsedValue = parseDateValue(value);
    setSelectedDueDate(parsedValue);
  };

  const handleCustomDueDateChange = (position, dateString) => {
    const newRange = [...customDueDateRange];
    newRange[position] = dateString;
    setCustomDueDateRange(newRange);
    setSelectedDueDate(newRange);
  };

  const applyFilter = (property, value) => {
    if (property === "workflowStatusId") {
      setFilterSchema(prev => ({ 
        ...prev, 
        [property]: value || undefined,
      }));
    } else {
      setFilterSchema(prev => ({
        ...prev,
        tasks: { 
          ...prev.tasks, 
          [property]: value || undefined 
        },
      }));
    }
  };

  const applyDateFilters = (startDate, dueDate) => {
    // Validation for custom date ranges
    if (Array.isArray(startDate) && validateArray(startDate) && startDate.length < 2) {
      message.error("Please select both start dates");
      return;
    }
    
    if (Array.isArray(dueDate) && validateArray(dueDate) && dueDate.length < 2) {
      message.error("Please select both due dates");
      return;
    }
    
    setFilterSchema(prev => ({
      ...prev,
      tasks: { 
        ...prev.tasks, 
        startDate: startDate || undefined, 
        dueDate: dueDate || undefined 
      },
    }));
  };

  const resetAllFilters = () => {
    // Reset filter schema
    setFilterSchema({ tasks: {} });
    
    // Reset all filter states
    setSelectedStatus("");
    setSelectedAssignees([]);
    setSelectedLabels([]);
    setSelectedStartDate("");
    setSelectedDueDate("");
    setStartDateSelectValue("");
    setDueDateSelectValue("");
    
    // Reset search queries
    setStatusSearchQuery("");
    setAssigneeSearchQuery("");
    setLabelsSearchQuery("");
    
    // Reset custom date states
    setIsCustomStartDate(false);
    setIsCustomDueDate(false);
    setCustomStartDateRange(["", ""]);
    setCustomDueDateRange(["", ""]);
    
    // Close popover
    setIsPopoverOpen(false);
  };

  const resetStatusFilter = () => {
    setSelectedStatus("");
    setStatusSearchQuery("");
    applyFilter("workflowStatusId", "");
  };

  const resetAssigneeFilter = () => {
    setSelectedAssignees([]);
    setAssigneeSearchQuery("");
    applyFilter("assigneeIds", []);
  };

  const resetLabelsFilter = () => {
    setSelectedLabels([]);
    setLabelsSearchQuery("");
    applyFilter("labelIds", "");
  };

  const resetDateFilters = () => {
    setStartDateSelectValue("");
    setDueDateSelectValue("");
    setSelectedStartDate("");
    setSelectedDueDate("");
    setIsCustomDueDate(false);
    setIsCustomStartDate(false);
    setCustomStartDateRange(["", ""]);
    setCustomDueDateRange(["", ""]);
  };

  // Render Methods
  const renderStatusFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Status</h4>
      
      <div className="filter-search">
        <Search
          placeholder="Search status"
          value={statusSearchQuery}
          onSearch={setStatusSearchQuery}
          onChange={(e) => setStatusSearchQuery(e.target.value)}
          size="small"
        />
      </div>
      
      <div className="filter-options">
        <Radio.Group
          value={selectedStatus}
          onChange={handleStatusChange}
          style={{ width: "100%" }}
        >
          {filteredStatuses.map((task, index) => (
            <div
              key={index}
              className={`filter-option-item ${
                selectedStatus === task?.workflowStatus?._id ? "selected" : ""
              }`}
            >
              <Radio value={task?.workflowStatus?._id}>
                {task?.workflowStatus?.title}
              </Radio>
            </div>
          ))}
        </Radio.Group>
      </div>
      
      <div className="filter-actions">
        <Button
          onClick={() => applyFilter("workflowStatusId", selectedStatus)}
          size="small"
          className="filter-btn"
        >
          Apply Filter
        </Button>
        <Button
          size="small"
          className="delete-btn"
          onClick={resetStatusFilter}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderAssigneeFilter = () => (
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
        {/* Unassigned Tasks Option */}
        {"unassigned tasks".includes(assigneeSearchQuery.toLowerCase()) && (
          <div
            className={`assignee-item ${
              selectedAssignees === "unassigned" ? "selected" : ""
            }`}
          >
            <Checkbox
              checked={selectedAssignees === "unassigned"}
              onChange={() => handleAssigneeSelection("unassigned")}
            />
            <span>Unassigned Tasks</span>
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
            <UserAvatar
              userName={user?.full_name}
              alt={user?.full_name}
              src={user.emp_img}
            />
            <span>{user.full_name}</span>
          </div>
        ))}
      </div>
      
      <div className="filter-actions">
        <Button
          onClick={() => applyFilter("assigneeIds", selectedAssignees)}
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

  const renderLabelsFilter = () => (
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
        {/* Unlabelled Tasks Option */}
        {"unlabelled task".includes(labelsSearchQuery.toLowerCase()) && (
          <div
            className={`label-item ${
              Array.isArray(selectedLabels) && selectedLabels.includes("unlabelled") 
                ? "selected" 
                : ""
            }`}
          >
            <Checkbox
              checked={Array.isArray(selectedLabels) && selectedLabels.includes("unlabelled")}
              onChange={() => handleLabelSelection("unlabelled")}
            />
            <Avatar
              icon={<TagOutlined />}
              size="small"
              style={{ backgroundColor: "#f5f5f5", color: "#999" }}
            />
            <span>Unlabelled Task</span>
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
          </div>
        ))}
      </div>
      
      <div className="filter-actions">
        <Button
          onClick={() => applyFilter("labelIds", selectedLabels)}
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

  const renderDatesFilter = () => {
    const getDateLabel = (dateValue) => {
      if (!dateValue) return "Any";
      if (Array.isArray(dateValue)) return "Custom";
      return DATE_OPTIONS.find(option => option.value === dateValue)?.label || "Any";
    };

    return (
      <div className="filter-content-inner">
        <h4 className="filter-title">Filter by Dates</h4>
        
        <div className="filter-options">
          {/* Start Date Section */}
          <div className="date-filter-section">
            <Form.Item>
              <label className="date-filter-label">Start Date</label>
              <Select
                className="date-select"
                value={startDateSelectValue || "Any"}
                onChange={handleStartDateChange}
                options={DATE_OPTIONS}
              />
              {isCustomStartDate && (
                <div className="calendar-event-block">
                  <Form.Item>
                    <DatePicker
                      placeholder="From date"
                      onChange={(_, dateString) => handleCustomStartDateChange(0, dateString)}
                      suffixIcon={<CalendarOutlined />}
                    />
                  </Form.Item>
                  <span className="calendar-separator">to</span>
                  <Form.Item>
                    <DatePicker
                      placeholder="To date"
                      onChange={(_, dateString) => handleCustomStartDateChange(1, dateString)}
                      suffixIcon={<CalendarOutlined />}
                    />
                  </Form.Item>
                </div>
              )}
            </Form.Item>
          </div>
          
          {/* Due Date Section */}
          <div className="date-filter-section">
            <Form.Item>
              <label className="date-filter-label">Due Date</label>
              <Select
                className="date-select"
                value={dueDateSelectValue || "Any"}
                onChange={handleDueDateChange}
                options={DATE_OPTIONS}
              />
              {isCustomDueDate && (
                <div className="calendar-event-block">
                  <Form.Item>
                    <DatePicker
                      placeholder="From date"
                      onChange={(_, dateString) => handleCustomDueDateChange(0, dateString)}
                      suffixIcon={<CalendarOutlined />}
                    />
                  </Form.Item>
                  <span className="calendar-separator">to</span>
                  <Form.Item>
                    <DatePicker
                      placeholder="To date"
                      onChange={(_, dateString) => handleCustomDueDateChange(1, dateString)}
                      suffixIcon={<CalendarOutlined />}
                    />
                  </Form.Item>
                </div>
              )}
            </Form.Item>
          </div>
          
          {/* Date Summary */}
          <div className="view-filter-summary">
            <CalendarOutlined className="view-filter-icon" />
            <span>
              <span className="date-range-display">Start:</span> {getDateLabel(selectedStartDate)}
              , <span className="date-range-display">Due:</span> {getDateLabel(selectedDueDate)}
            </span>
          </div>
        </div>
        
        <div className="filter-actions">
          <Button
            onClick={() => applyDateFilters(selectedStartDate, selectedDueDate)}
            size="small"
            className="filter-btn"
          >
            Apply Filter
          </Button>
          <Button
            size="small"
            className="delete-btn"
            onClick={resetDateFilters}
          >
            Reset
          </Button>
        </div>
      </div>
    );
  };

  const renderFilterContent = () => {
    switch (activeFilterType) {
      case FILTER_TYPES.STATUS:
        return renderStatusFilter();
      case FILTER_TYPES.ASSIGNEE:
        return renderAssigneeFilter();
      case FILTER_TYPES.LABELS:
        return renderLabelsFilter();
      case FILTER_TYPES.DATES:
        return renderDatesFilter();
      default:
        return renderStatusFilter();
    }
  };

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

export default FilterUI;