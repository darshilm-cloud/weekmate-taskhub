import React, {
  useState,
  useMemo,
  memo,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button, Popover, Radio, Input, Badge, Divider, Form } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import "../../assets/css/FilterUI.css";

const { Search } = Input;

// Constants
const FILTER_TYPES = {
  CLIENTS: "clients",
  STATUS: "status",
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

const EmployeeFilterComponent = forwardRef(
  (
    {
      // Form props from parent
      formData,
      filterEmp,
      onReset,
      // Data props from parent
      client,
    },
    ref
  ) => {
    // UI state
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [activeFilterType, setActiveFilterType] = useState(
      FILTER_TYPES.CLIENTS
    );
    const [clientSearchValue, setClientSearchValue] = useState("");

    // Local state for radio selections - this ensures UI updates immediately
    const [selectedClient, setSelectedClient] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    // Watch form values and sync with local state
    const formValues = Form.useWatch([], formData);

    // Expose reset method to parent component
    useImperativeHandle(ref, () => ({
      resetFilters: () => {
        console.log("External reset called from parent");
        resetAllFiltersInternal();
      },
    }));

    // Internal reset function
    const resetAllFiltersInternal = () => {
      console.log("Resetting all filters internally");
      console.log(
        "Before reset - selectedClient:",
        selectedClient,
        "selectedStatus:",
        selectedStatus
      );

      // Reset local state
      setSelectedClient("");
      setSelectedStatus("");
      setClientSearchValue("");

      // Reset form fields
      if (formData && formData.resetFields) {
        formData.resetFields();
        console.log("Form fields reset");
      }

      // Close popover
      setIsPopoverOpen(false);

      console.log("After reset - all states should be empty");
    };

    // Sync local state with form values when form changes externally
    useEffect(() => {
      if (formValues?.client !== selectedClient) {
        setSelectedClient(formValues?.client || "");
      }
      if (formValues?.status !== selectedStatus) {
        setSelectedStatus(formValues?.status || "");
      }
    }, [formValues?.client, formValues?.status]);

    // Filter clients based on search
    const filteredClients = useMemo(() => {
      if (!clientSearchValue) return client || [];
      return (client || []).filter((item) =>
        item.full_name?.toLowerCase().includes(clientSearchValue.toLowerCase())
      );
    }, [client, clientSearchValue]);

    // Active filters count calculation
    const activeFiltersCount = useMemo(() => {
      let count = 0;

      if (selectedClient && selectedClient !== "") {
        count++;
      }

      if (selectedStatus && selectedStatus !== "") {
        count++;
      }

      return count;
    }, [selectedClient, selectedStatus]);

    // Reset all filters (used by Reset All button in popover)
    const resetAllFilters = () => {
      resetAllFiltersInternal();

      // Call parent reset function
      if (onReset) {
        onReset();
      }
    };

    const handleClientSearch = (value) => {
      setClientSearchValue(value);
    };

    // Client change handler with local state
    const handleClientChange = (e) => {
      const value = e.target.value;
      console.log("Client selected:", value);

      setSelectedClient(value);

      // Also update form
      if (formData && formData.setFieldsValue) {
        formData.setFieldsValue({ client: value });
      }
    };

    // Status change handler with local state
    const handleStatusChange = (e) => {
      const value = e.target.value;
      console.log("Status selected:", value);

      setSelectedStatus(value);

      // Also update form
      if (formData && formData.setFieldsValue) {
        formData.setFieldsValue({ status: value });
      }
    };

    // Apply filters - sync local state to form before applying
    const applyFilters = () => {
      const filterValues = {
        client: selectedClient,
        status: selectedStatus,
      };

      console.log("Applying filters:", filterValues);

      // Update form with current local state
      if (formData && formData.setFieldsValue) {
        formData.setFieldsValue(filterValues);
      }

      // Apply the filter
      filterEmp(filterValues);
      setIsPopoverOpen(false);
    };

    // Individual reset functions for each filter type
    const resetClientFilter = () => {
      console.log("Resetting client filter");
      setSelectedClient("");
      setClientSearchValue("");

      if (formData && formData.setFieldsValue) {
        formData.setFieldsValue({ client: "" });
      }

      // Apply the reset immediately
      const currentFormValues = formData.getFieldsValue();
      const updatedValues = { ...currentFormValues, client: "" };
      filterEmp(updatedValues);
    };

    const resetStatusFilter = () => {
      console.log("Resetting status filter");
      setSelectedStatus("");

      if (formData && formData.setFieldsValue) {
        formData.setFieldsValue({ status: "" });
      }

      // Apply the reset immediately
      const currentFormValues = formData.getFieldsValue();
      const updatedValues = { ...currentFormValues, status: "" };
      filterEmp(updatedValues);
    };

    // Render clients filter
    const renderClientsFilter = () => (
      <div className="filter-content-inner">
        <h4 className="filter-title">Filter by Clients</h4>

        <div className="filter-search">
          <Search
            placeholder="Search clients..."
            value={clientSearchValue}
            onSearch={handleClientSearch}
            onChange={(e) => handleClientSearch(e.target.value)}
            size="small"
          />
        </div>

        <div className="filter-options">
          <Radio.Group onChange={handleClientChange} value={selectedClient}>
            {filteredClients.map((item, index) => (
              <div key={item._id || index} className="radio-option">
                <Radio value={item._id}>
                  <span style={{ textTransform: "capitalize" }}>
                    {item?.full_name}
                  </span>
                </Radio>
              </div>
            ))}
          </Radio.Group>
        </div>

        <div className="filter-actions">
          <Button onClick={applyFilters} size="small" className="filter-btn">
            Apply Filter
          </Button>
          <Button
            size="small"
            className="delete-btn"
            onClick={resetClientFilter}
            disabled={!selectedClient}
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
          <Radio.Group onChange={handleStatusChange} value={selectedStatus}>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <div key={value} className="radio-option">
                <Radio value={value}>{label}</Radio>
              </div>
            ))}
          </Radio.Group>
        </div>

        <div className="filter-actions">
          <Button onClick={applyFilters} size="small" className="filter-btn">
            Apply Filter
          </Button>
          <Button
            size="small"
            className="delete-btn"
            onClick={resetStatusFilter}
            disabled={!selectedStatus}
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
                title={`Reset all filters (${activeFiltersCount} active)`}
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
              {/* Show indicator if this filter type has active filters */}
              {((item.key === FILTER_TYPES.CLIENTS && selectedClient) ||
                (item.key === FILTER_TYPES.STATUS && selectedStatus)) && (
                <Badge size="small" color="#1890ff" />
              )}
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
          overlayClassName="employee-filter-popover"
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
  }
);

export default memo(EmployeeFilterComponent);
