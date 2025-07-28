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
import MyAvatar from "../../components/Avatar/MyAvatar";

const { Search } = Input;

const ProjectExpenseFilterComponent = ({
  filterConfigs, // Array of filter configurations with permission checks
  userPermissions,
}) => {
  // Filter configs based on permissions
  const availableFilters = useMemo(() => {
    return filterConfigs.filter(config => {
      if (config.permissionCheck) {
        return config.permissionCheck(userPermissions);
      }
      return true; // No permission check means always available
    });
  }, [filterConfigs, userPermissions]);

  // Create menu items from available configs
  const FILTER_MENU_ITEMS = useMemo(() => 
    availableFilters.map(config => ({
      key: config.key,
      label: config.label
    })), [availableFilters]);

  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(availableFilters[0]?.key || "");

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    return availableFilters.reduce((count, config) => {
      if (config.filterType === 'radio') {
        // For radio filters, count if not empty/default
        if (config.selectedValue && config.selectedValue !== "" && config.selectedValue !== "All") {
          return count + 1;
        }
      } else {
        // For checkbox filters, count if has selections
        if (Array.isArray(config.selectedItems) && config.selectedItems.length > 0) {
          return count + 1;
        }
      }
      return count;
    }, 0);
  }, [availableFilters]);

  const resetAllFilters = () => {
    availableFilters.forEach(config => {
      if (config.onReset) {
        config.onReset();
      }
    });
  };

  // Find active filter config
  const activeConfig = availableFilters.find(config => config.key === activeFilterType);

  // Render checkbox filter
  const renderCheckboxFilter = (config) => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by {config.label}</h4>

      {config.hasSearch && (
        <div className="filter-search">
          <Search
            placeholder="Search.."
            value={config.searchValue}
            onSearch={config.onSearchChange}
            onChange={config.onSearchChange}
            size="small"
          />
        </div>
      )}

      <div className="filter-options">
        {config.allItems.map((item, index) => (
          <div
            key={item._id || index}
            className={`assignee-item ${
              config.selectedItems.includes(item._id) ? "selected" : ""
            }`}
          >
            <Checkbox
              checked={config.selectedItems.includes(item._id)}
              onChange={() => {
                config.onFilterChange(item, config.selectedItems, config.setSelectedItems);
              }}
            />
            
            {/* Render avatar if config specifies it */}
            {config.showAvatar && (
              <MyAvatar
                userName={config.getAvatarName(item) || "-"}
                src={item?.emp_img}
                key={item?._id}
                alt={config.getAvatarName(item)}
              />
            )}
            
            <span>{config.renderText(item)}</span>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            config.onApply();
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
            config.onReset();
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  // Render radio filter
  const renderRadioFilter = (config) => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by {config.label}</h4>

      <div className="filter-options">
        <Radio.Group 
          onChange={config.onFilterChange} 
          value={config.selectedValue}
        >
          {config.options.map(({ value, label }) => (
            <div key={value} className="radio-option">
              <Radio value={value}>{label}</Radio>
            </div>
          ))}
        </Radio.Group>
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            config.onApply();
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
            config.onReset();
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderFilterContent = () => {
    if (!activeConfig) return null;
    
    if (activeConfig.filterType === 'radio') {
      return renderRadioFilter(activeConfig);
    } else {
      return renderCheckboxFilter(activeConfig);
    }
  };

  // Don't render if no filters are available
  if (availableFilters.length === 0) {
    return null;
  }

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
              Reset All ({activeFiltersCount})
            </Button>
          )}
        </div>
        <Divider style={{ margin: "8px 0" }} />
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
      <div className="filter-content">{renderFilterContent()}</div>
    </div>
  );

  return (
    <div className="filter-container">
      <Popover
        content={popoverContent}
        arrow={false}
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

export default memo(ProjectExpenseFilterComponent);
