import React, { useState, useMemo, useEffect } from "react";
import {
  Button,
  Popover,
  Checkbox,
  Radio,
  Input,
  Avatar,
  Form,
  Badge,
  Divider,
  message,
} from "antd";
import { FilterOutlined, UserOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";
import { removeTitle } from "../../util/nameFilter";

const { Search } = Input;

// Constants
const FILTER_TYPES = {
  ACCOUNTMANAGER: "account_manager",
  MANAGER: "manager",
  TECHNOLOGY: "technology",
  PROJECTTYPE: "project_type",
  ASSIGNEES: "assignees"
};

// Create dynamic filter menu items based on role
const createFilterMenuItems = (getRoles) => {
  const baseItems = [
    { key: FILTER_TYPES.TECHNOLOGY, label: "Department" },
    { key: FILTER_TYPES.PROJECTTYPE, label: "Project Type" },
    { key: FILTER_TYPES.ASSIGNEES, label: "Assignees" },
  ];

  // Add admin-only filters at the beginning
  if (getRoles(["Admin"])) {
    return [
      { key: FILTER_TYPES.ACCOUNTMANAGER, label: "Account Manager" },
      { key: FILTER_TYPES.MANAGER, label: "Project Manager" },
      ...baseItems
    ];
  }

  return baseItems;
};

const AssignProjectFilter = ({
  // Account Manager props
  filteredAccManagerList,
  searchAccManager,
  handleSearchAccManager,
  acc_manager,
  setAccManager,
  
  // Manager props
  filteredManagerList,
  searchManager,
  handleSearchManager,
  manager,
  setManager,
  
  // Technology props
  filteredTechnologyList,
  searchTechnology,
  handleSearchTechnology,
  technology,
  setTechnology,
  
  // Project Type props
  projectTypeList,
  projectType,
  setProjectType,
  
  // Assignees props
  filteredAssigneesList,
  searchAssignees,
  handleSearchTermAssignees,
  assignees,
  setAssignees,
  
  // Role check function
  getRoles,
  
  // Common props
  handleFilters,
  getProjectListing,
}) => {
  // Create dynamic menu items based on role
  const FILTER_MENU_ITEMS = useMemo(() => createFilterMenuItems(getRoles), [getRoles]);
  
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(() => {
    return getRoles(["Admin"]) ? FILTER_TYPES.ACCOUNTMANAGER : FILTER_TYPES.TECHNOLOGY;
  });

  // Active filters count calculation with conditional checks
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    
    // Only count admin filters if user has admin role
    if (getRoles(["Admin"])) {
      if (Array.isArray(acc_manager) && acc_manager.length > 0) count++;
      if (Array.isArray(manager) && manager.length > 0) count++;
    }
    
    // Always count these filters
    if (Array.isArray(technology) && technology.length > 0) count++;
    if (Array.isArray(projectType) && projectType.length > 0) count++;
    if (Array.isArray(assignees) && assignees.length > 0) count++;
    
    return count;
  }, [acc_manager, manager, technology, projectType, assignees, getRoles]);

  const resetAllFilters = () => {
    setAccManager([])
    setManager([])
    setTechnology([])
    setProjectType([])
    setAssignees([])
    getProjectListing("skipAll");
  };

  // Render Methods
  const renderAccountManagerFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Account Manager</h4>

      <div className="filter-search">
        <Search
          placeholder="Search.."
          value={searchAccManager}
          onSearch={handleSearchAccManager}
          onChange={handleSearchAccManager}
          size="small"
        />
      </div>

      <div className="filter-options">
        {filteredAccManagerList.map((item, index) => (
          <div
            key={item._id || index}
            className={`assignee-item ${
              acc_manager.includes(item._id) ? "selected" : ""
            }`}
          >
            <Checkbox
              checked={acc_manager.includes(item._id)}
              onChange={() => {
                handleFilters(item, acc_manager, setAccManager);
              }}
            />

            <span>{removeTitle(item?.full_name)}</span>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getProjectListing();
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
            getProjectListing("skipAccountManager");
            handleFilters("", acc_manager, setAccManager);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderManagerFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Project Manager</h4>

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

            <span>{removeTitle(item?.manager_name)}</span>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getProjectListing();
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
            getProjectListing("skipManager");
            handleFilters("", manager, setManager);
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
            getProjectListing();
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
            getProjectListing("skipTechnology");
            handleFilters("", technology, setTechnology);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderProjectTypeFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Project Type</h4>

      <div className="filter-options">
        {projectTypeList.map((item, index) => (
          <div
            key={item._id || index}
            className={`assignee-item ${
              projectType.includes(item._id) ? "selected" : ""
            }`}
          >
            <Checkbox
              checked={projectType.includes(item._id)}
              onChange={() => {
                handleFilters(item, projectType, setProjectType);
              }}
            />

            <span>{item?.project_type}</span>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getProjectListing();
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
            getProjectListing("skipProjectType");
            handleFilters("", projectType, setProjectType);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderAssigneesFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Assignees</h4>

      <div className="filter-search">
        <Search
          placeholder="Search.."
          value={searchAssignees}
          onSearch={handleSearchTermAssignees}
          onChange={handleSearchTermAssignees}
          size="small"
        />
      </div>

      <div className="filter-options">
        {filteredAssigneesList.map((item, index) => (
          <div
            key={item._id || index}
            className={`assignee-item ${
              assignees.includes(item._id) ? "selected" : ""
            }`}
          >
            <Checkbox
              checked={assignees.includes(item._id)}
              onChange={() => {
                handleFilters(item, assignees, setAssignees);
              }}
            />

            <span>{removeTitle(item?.full_name)}</span>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            getProjectListing();
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
            getProjectListing("skipAssignees");
            handleFilters("", assignees, setAssignees);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderFilterContent = () => {
    switch (activeFilterType) {
      case FILTER_TYPES.ACCOUNTMANAGER:
        return getRoles(["Admin"]) ? renderAccountManagerFilter() : renderTechnologyFilter();
      case FILTER_TYPES.MANAGER:
        return getRoles(["Admin"]) ? renderManagerFilter() : renderTechnologyFilter();
      case FILTER_TYPES.TECHNOLOGY:
        return renderTechnologyFilter();
      case FILTER_TYPES.PROJECTTYPE:
        return renderProjectTypeFilter();
      case FILTER_TYPES.ASSIGNEES:
        return renderAssigneesFilter();
      default:
        return getRoles(["Admin"]) ? renderAccountManagerFilter() : renderTechnologyFilter();
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
              // Additional safety check before setting active filter
              if (
                (item.key === FILTER_TYPES.ACCOUNTMANAGER || item.key === FILTER_TYPES.MANAGER) && 
                !getRoles(["Admin"])
              ) {
                return; // Don't allow switching to admin-only filters
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

export default AssignProjectFilter;
