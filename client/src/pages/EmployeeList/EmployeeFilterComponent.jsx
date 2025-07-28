import React, { useState, useMemo, memo } from "react";
import {
  Button,
  Popover,
  Select,
  Form,
  Row,
  Col,
  Badge,
  Divider,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";

const { Option } = Select;

// Constants
const FILTER_TYPES = {
  CLIENTS: "clients",
  STATUS: "status"
};

const FILTER_MENU_ITEMS = [
  { key: FILTER_TYPES.CLIENTS, label: "Clients" },
  { key: FILTER_TYPES.STATUS, label: "Status" },
];

// Status options
const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Not Active", label: "Not Active" },
];

const EmployeeFilterComponent = ({
  // Form props
  formData,
  filterEmp,
  onReset,
  handleCancel,
  
  // Data props
  client,
  
  // Layout props
  formItemLayout,
}) => {
  // UI state
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(FILTER_TYPES.CLIENTS);

  // Get current form values for counting active filters
  const formValues = Form.useWatch([], formData);

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    
    // Count client filter as active if selected
    if (formValues?.client) {
      count++;
    }
    
    // Count status filter as active if selected
    if (formValues?.status) {
      count++;
    }
    
    return count;
  }, [formValues]);

  const resetAllFilters = () => {
    onReset();
  };

  // Render clients filter
  const renderClientsFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Clients</h4>

      <div className="filter-options">
        <Form.Item 
          label="Select Client" 
          name="client"
          style={{ marginBottom: 0 }}
        >
          <Select
            size="large"
            showSearch
            placeholder="Select a client"
            allowClear
            filterOption={(input, option) =>
              option?.children
                .toLowerCase()
                .indexOf(input.toLowerCase()) >= 0
            }
            filterSort={(optionA, optionB) =>
              optionA?.children
                .toLowerCase()
                .localeCompare(optionB?.children?.toLowerCase())
            }
            onChange={(e) => {
              if (e) {
                let data = client.filter((val) => val._id === e);
                formData.setFieldsValue({
                  client: data[0]?._id,
                });
              }
            }}
            style={{ width: "100%" }}
          >
            {client.map((item, index) => (
              <Option
                key={index}
                value={item?._id}
                style={{ textTransform: "capitalize" }}
              >
                {item?.full_name}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            filterEmp(formData.getFieldsValue());
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
            formData.setFieldsValue({ client: undefined });
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  // Render status filter
  const renderStatusFilter = () => (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Status</h4>

      <div className="filter-options">
        <Form.Item 
          label="Select Status" 
          name="status"
          style={{ marginBottom: 0 }}
        >
          <Select
            size="large"
            placeholder="Select status"
            allowClear
            options={STATUS_OPTIONS}
            style={{ width: "100%" }}
          />
        </Form.Item>
      </div>

      <div className="filter-actions">
        <Button
          onClick={() => {
            filterEmp(formData.getFieldsValue());
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
            formData.setFieldsValue({ status: undefined });
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  const renderFilterContent = () => {
    switch (activeFilterType) {
      case FILTER_TYPES.CLIENTS:
        return renderClientsFilter();
      case FILTER_TYPES.STATUS:
        return renderStatusFilter();
      default:
        return renderClientsFilter();
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
        <Form form={formData} {...formItemLayout}>
          {renderFilterContent()}
        </Form>
      </div>
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

export default memo(EmployeeFilterComponent);
