import React, { useState, useMemo, memo } from "react";
import {
  Button,
  Popover,
  Checkbox,
  Radio,
  Input,
  Badge,
  Divider,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";
import { removeTitle } from "../../util/nameFilter";
import MyAvatar from "../../components/Avatar/MyAvatar";

const { Search } = Input;

// Priority options
const PRIORITY_OPTIONS = [
  { value: "", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" }
];

// Status options
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "client_review", label: "Client Review" },
  { value: "resolved", label: "Resolved" },
  { value: "reopened", label: "Reopen" },
  { value: "customer_lost", label: "Customer Lost" }
];

// Create dynamic filter menu items based on role
const createFilterMenuItems = (getRoles) => {
  const baseItems = [
    { key: "project", label: "Project" },
    { key: "priority", label: "Priority Level" },
    { key: "status", label: "Status" },
  ];

  // Add admin-only filters
  if (getRoles(["Admin"])) {
    return [
      ...baseItems,
      { key: "technology", label: "Department" },
      { key: "manager", label: "Manager" },
      { key: "accountManager", label: "Account Manager" },
    ];
  }

  return baseItems;
};

const ComplaintFilterComponent = ({
  // Project props
  selectedProject,
  setSelectedProject,
  searchProject,
  handleSearchProjects,
  filteredProjectsList,
  
  // Technology props (Admin only)
  technology,
  setTechnology,
  searchTechnology,
  handleSearchTechnology,
  filteredTechnologyList,
  
  // Manager props (Admin only)
  manager,
  setManager,
  searchManager,
  handleSearchManager,
  filteredManagerList,
  
  // Account Manager props (Admin only)
  accontManager,
  setAccountManager,
  searchAccountManager,
  handleSearchAccountManager,
  filteredAccManagerList,
  
  // Priority props
  priority,
  handlePriorityFilter,
  
  // Status props
  status,
  handleStatusFilter,
  
  // Role check function
  getRoles,
  
  // Common props
  handleFilters,
  getComplaintList,
}) => {
  // Create dynamic menu items based on role
  const FILTER_MENU_ITEMS = useMemo(() => createFilterMenuItems(getRoles), [getRoles]);
  
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState("project");

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    
    // Project filter
    if (Array.isArray(selectedProject) && selectedProject.length > 0) count++;
    
    // Priority filter (count if not empty)
    if (priority && priority !== "") count++;
    
    // Status filter (count if not empty)
    if (status && status !== "") count++;
    
    // Admin-only filters
    if (getRoles(["Admin"])) {
      if (Array.isArray(technology) && technology.length > 0) count++;
      if (Array.isArray(manager) && manager.length > 0) count++;
      if (Array.isArray(accontManager) && accontManager.length > 0) count++;
    }
    
    return count;
  }, [selectedProject, priority, status, technology, manager, accontManager, getRoles]);

  const resetAllFilters = () => {
    // Reset project filter
    handleFilters("", selectedProject, setSelectedProject);
    
    // Reset priority and status
    handlePriorityFilter({ target: { value: "" } });
    handleStatusFilter({ target: { value: "" } });
    
    // Reset admin-only filters
    if (getRoles(["Admin"])) {
      handleFilters("", technology, setTechnology);
      handleFilters("", manager, setManager);
      handleFilters("", accontManager, setAccountManager);
    }
  };

  // Render Methods for Checkbox Filters
  const renderProjectFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Project</h4>

      <div className="filter-search">
        <Search
          placeholder="Search.."
          value={searchProject}
          onSearch={handleSearchProjects}
          onChange={handleSearchProjects}
          size="small"
        />
      </div>

      <div className="filter-options">
        {filteredProjectsList.map((item, index) => (
          <div
            key={item._id || index}
            className={`assignee-item ${
              selectedProject.includes(item._id) ? "selected" : ""
            }`}
          >
            <Checkbox
              checked={selectedProject.includes(item._id)}
              onChange={() => {
                handleFilters(item, selectedProject, setSelectedProject);
              }}
            />
            <span>{item?.title}</span>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getComplaintList();
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
            handleFilters("", selectedProject, setSelectedProject);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderTechnologyFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Department</h4>

      <div className="filter-search">
        <Search
          placeholder="Search.."
          value={searchTechnology}
          onSearch={handleSearchTechnology}
          onChange={handleSearchTechnology}
          size="small"
        />
      </div>

      <div className="filter-options">
        {filteredTechnologyList.map((item, index) => (
          <div
            key={item._id || index}
            className={`assignee-item ${
              technology.includes(item._id) ? "selected" : ""
            }`}
          >
            <Checkbox
              checked={technology.includes(item._id)}
              onChange={() => {
                handleFilters(item, technology, setTechnology);
              }}
            />
            <span>{item.project_tech}</span>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getComplaintList();
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
            handleFilters("", technology, setTechnology);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderManagerFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Manager</h4>

      <div className="filter-search">
        <Search
          placeholder="Search.."
          value={searchManager}
          onSearch={handleSearchManager}
          onChange={handleSearchManager}
          size="small"
        />
      </div>

      <div className="filter-options">
        {filteredManagerList.map((item, index) => (
          <div
            key={item._id || index}
            className={`assignee-item ${
              manager.includes(item._id) ? "selected" : ""
            }`}
          >
            <Checkbox
              checked={manager.includes(item._id)}
              onChange={() => {
                handleFilters(item, manager, setManager);
              }}
            />
            <MyAvatar
              userName={item?.manager_name || "-"}
              src={item?.emp_img}
              key={item?._id}
              alt={item?.manager_name}
            />
            <span>{removeTitle(item?.manager_name)}</span>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getComplaintList();
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
            handleFilters("", manager, setManager);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderAccountManagerFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Account Manager</h4>

      <div className="filter-search">
        <Search
          placeholder="Search.."
          value={searchAccountManager}
          onSearch={handleSearchAccountManager}
          onChange={handleSearchAccountManager}
          size="small"
        />
      </div>

      <div className="filter-options">
        {filteredAccManagerList.map((item, index) => (
          <div
            key={item._id || index}
            className={`assignee-item ${
              accontManager?.includes(item._id) ? "selected" : ""
            }`}
          >
            <Checkbox
              checked={accontManager?.includes(item._id)}
              onChange={() => {
                handleFilters(item, accontManager, setAccountManager);
              }}
            />
            <MyAvatar
              userName={item?.full_name || "-"}
              src={item?.emp_img}
              key={item?._id}
              alt={item?.full_name}
            />
            <span>{removeTitle(item?.full_name)}</span>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getComplaintList();
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
            handleFilters("", accontManager, setAccountManager);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  // Render Methods for Radio Filters
  const renderPriorityFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Priority Level</h4>

      <div className="filter-options">
        <Radio.Group 
          onChange={handlePriorityFilter} 
          value={priority}
        >
          {PRIORITY_OPTIONS.map(({ value, label }) => (
            <div key={value} className="radio-option">
              <Radio value={value}>{label}</Radio>
            </div>
          ))}
        </Radio.Group>
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getComplaintList();
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
            handlePriorityFilter({ target: { value: "" } });
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderStatusFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Status</h4>

      <div className="filter-options">
        <Radio.Group 
          onChange={handleStatusFilter} 
          value={status}
        >
          {STATUS_OPTIONS.map(({ value, label }) => (
            <div key={value} className="radio-option">
              <Radio value={value}>{label}</Radio>
            </div>
          ))}
        </Radio.Group>
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getComplaintList();
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
            handleStatusFilter({ target: { value: "" } });
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderFilterContent = () => {
    switch (activeFilterType) {
      case "project":
        return renderProjectFilter();
      case "technology":
        return getRoles(["Admin"]) ? renderTechnologyFilter() : renderProjectFilter();
      case "manager":
        return getRoles(["Admin"]) ? renderManagerFilter() : renderProjectFilter();
      case "accountManager":
        return getRoles(["Admin"]) ? renderAccountManagerFilter() : renderProjectFilter();
      case "priority":
        return renderPriorityFilter();
      case "status":
        return renderStatusFilter();
      default:
        return renderProjectFilter();
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
            onClick={() => {
              // Additional safety check for admin-only filters
              if (
                (item.key === "technology" || item.key === "manager" || item.key === "accountManager") && 
                !getRoles(["Admin"])
              ) {
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
        arrow={false}
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

export default memo(ComplaintFilterComponent);
