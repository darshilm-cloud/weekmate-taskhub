import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button, Popover, Radio, Input, Badge, Divider, Spin } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import _ from "lodash";
import "../../assets/css/FilterUI.css";
import { removeTitle } from "../../util/nameFilter";
import Service from "../../service";

const { Search } = Input;

// Filter types
const FILTER_TYPES = {
  EMPLOYEE_CODE: "employee_code",
  EMPLOYEE: "employee",
  DESIGNATION: "designation",
  DEPARTMENT: "department",
};

// API and pagination config
const FILTER_CONFIG = {
  [FILTER_TYPES.EMPLOYEE_CODE]: {
    api: Service.getEmployeeList,
    method: Service.getMethod,
    limit: 20,
    label: "User Code",
    getName: (item) => item?.emp_code,
    getValue: (item) => item?.emp_code,
    searchKey: "search",
    dataSource: "employees",
  },
  [FILTER_TYPES.EMPLOYEE]: {
    api: Service.getEmployeeList,
    method: Service.getMethod,
    limit: 20,
    label: "User",
    getName: (item) => removeTitle(item?.full_name),
    getValue: (item) => item?._id,
    searchKey: "search",
    dataSource: "employees",
  },
  [FILTER_TYPES.DESIGNATION]: {
    api: Service.getDesignationList,
    method: Service.getMethod,
    limit: 20,
    label: "Designation",
    getName: (item) => item?.designation_name,
    getValue: (item) => item?._id,
    searchKey: "search",
    dataSource: "designations",
  },
  // Department filter hidden
  // [FILTER_TYPES.DEPARTMENT]: {
  //   api: Service.getDepartmentList,
  //   method: Service.getMethod,
  //   limit: 20,
  //   label: "Department",
  //   getName: (item) => item?.department_name,
  //   getValue: (item) => item?._id,
  //   searchKey: "search",
  //   dataSource: "departments",
  // },
};

// Filter menu items
const FILTER_MENU_ITEMS = [
  { key: FILTER_TYPES.EMPLOYEE_CODE, label: "User Code" },
  { key: FILTER_TYPES.EMPLOYEE, label: "User" },
  { key: FILTER_TYPES.DESIGNATION, label: "Designation" },
  // { key: FILTER_TYPES.DEPARTMENT, label: "Department" }, // Department hidden
];

// FilterSection component
const FilterSection = ({
  config,
  items,
  selectedValue,
  pagination,
  searchTerm,
  onSearch,
  onSelect,
  onLoadMore,
  onApply,
  onReset,
  isInitialLoadComplete,
}) => (
  <div className="filter-content-inner">
    <h4 className="filter-title">{config.label}</h4>
    <div className="filter-search">
      <Search
        placeholder={`Search ${config.label.toLowerCase()}...`}
        value={searchTerm}
        onChange={(e) => onSearch(e.target.value)}
        size="small"
        loading={pagination?.loading && pagination?.page === 1}
      />
    </div>
    <InfiniteScroll
      dataLength={items.length}
      next={onLoadMore}
      hasMore={isInitialLoadComplete && pagination?.hasMore}
      loader={
        pagination?.loading && pagination?.page > 1 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "16px 0",
              alignItems: "center",
            }}
          >
            <Spin size="small"  margin={{margin:0}} />
            <span
              style={{ marginLeft: "8px", fontSize: "12px", color: "#666" }}
            >
              Loading more...
            </span>
          </div>
        ) : null
      }
      height={180}
      style={{ paddingRight: "8px" }}
      scrollThreshold={0.9}
    >
      <Radio.Group onChange={onSelect} value={selectedValue || ""}>
          {items.map((item) => (
            <div
              key={
                item._id ||
                item.emp_code ||
                item.designation_name ||
                item.department_name
              }
              className="radio-option"
            >
              <Radio value={config.getValue(item)}>
                <span style={{ textTransform: "capitalize" }}>
                  {config.getName(item)}
                </span>
              </Radio>
            </div>
          ))}
      </Radio.Group>
      {items.length === 0 && !pagination?.loading && (
        <div
          style={{
            textAlign: "center",
            padding: "16px 0",
            fontSize: "12px",
            color: "#999",
          }}
        >
          {searchTerm ? "No items found" : "No items available"}
        </div>
      )}
    </InfiniteScroll>
    <div className="filter-actions">
      <Button onClick={onApply} size="small" className="filter-btn">
        Apply Filter
      </Button>
      <Button onClick={onReset} size="small" className="delete-btn">
        Reset
      </Button>
    </div>
  </div>
);

const EmployeeUsersFilterComponent = ({ onFilterChange }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.EMPLOYEE_CODE);

  // Shared data sources
  const [sharedDataSources, setSharedDataSources] = useState({
    employees: [],
    designations: [],
    departments: [],
  });

  // Selected filters - now single selection for radio buttons
  const [selectedFilters, setSelectedFilters] = useState({
    [FILTER_TYPES.EMPLOYEE_CODE]: "",
    [FILTER_TYPES.EMPLOYEE]: "",
    [FILTER_TYPES.DESIGNATION]: "",
    [FILTER_TYPES.DEPARTMENT]: "",
  });

  // Search terms - matching data source keys
  const [searchTerms, setSearchTerms] = useState({
    employees: "",
    designations: "",
    departments: "",
  });

  // Pagination state - matching data source keys
  const [pagination, setPagination] = useState({
    employees: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
    designations: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
    departments: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
  });

  // Initial load complete tracking - matching data source keys
  const [initialLoadComplete, setInitialLoadComplete] = useState({
    employees: false,
    designations: false,
    departments: false,
  });

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    const filters = { ...selectedFilters };

    // Count employee and employee_code as one filter since they're synced
    const hasEmployeeFilter =
      (filters[FILTER_TYPES.EMPLOYEE_CODE] &&
        filters[FILTER_TYPES.EMPLOYEE_CODE] !== "") ||
      (filters[FILTER_TYPES.EMPLOYEE] && filters[FILTER_TYPES.EMPLOYEE] !== "");

    const hasDesignationFilter =
      filters[FILTER_TYPES.DESIGNATION] &&
      filters[FILTER_TYPES.DESIGNATION] !== "";
    const hasDepartmentFilter =
      filters[FILTER_TYPES.DEPARTMENT] &&
      filters[FILTER_TYPES.DEPARTMENT] !== "";

    let count = 0;
    if (hasEmployeeFilter) count++;
    if (hasDesignationFilter) count++;
    if (hasDepartmentFilter) count++;

    return count;
  }, [selectedFilters]);

  // Get data source key for a filter type
  const getDataSourceKey = (filterType) => {
    return FILTER_CONFIG[filterType]?.dataSource || filterType;
  };

  // Get search term key for a filter type
  const getSearchTermKey = (filterType) => {
    const config = FILTER_CONFIG[filterType];
    return config?.dataSource || filterType;
  };

  // Fetch filter data function
  const fetchFilterData = useCallback(
    async (filterType, page = 1, search = "", reset = false) => {
      const config = FILTER_CONFIG[filterType];
      const dataSourceKey = getDataSourceKey(filterType);

      if (
        !config ||
        pagination[dataSourceKey]?.loading ||
        (!reset && !pagination[dataSourceKey]?.hasMore)
      )
        return;

      setPagination((prev) => ({
        ...prev,
        [dataSourceKey]: { ...prev[dataSourceKey], loading: true },
      }));

      try {
        const apiUrl = `${config.api}?page=${page}&limit=${config.limit}&search=${search}`;

        const response = await Service.makeAPICall({
          methodName: config.method,
          api_url: apiUrl,
        });

        const newData = Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data)
          ? response.data
          : [];

        const metadata = response?.data?.metadata || {
          total: newData.length,
          totalPages: 1,
        };

        setSharedDataSources((prev) => ({
          ...prev,
          [dataSourceKey]: reset
            ? newData
            : [...prev[dataSourceKey], ...newData],
        }));

        setPagination((prev) => ({
          ...prev,
          [dataSourceKey]: {
            ...prev[dataSourceKey],
            page,
            total: metadata.total || newData.length,
            hasMore:
              newData.length > 0 &&
              page < (metadata.totalPages || 1) &&
              newData.length >= config.limit,
            loading: false,
          },
        }));

        if (page === 1) {
          setInitialLoadComplete((prev) => ({
            ...prev,
            [dataSourceKey]: true,
          }));
        }
      } catch (error) {
        console.error(`Error fetching ${filterType}:`, error);
        setPagination((prev) => ({
          ...prev,
          [dataSourceKey]: {
            ...prev[dataSourceKey],
            loading: false,
            hasMore: false,
          },
        }));
        if (page === 1) {
          setSharedDataSources((prev) => ({ ...prev, [dataSourceKey]: [] }));
          setInitialLoadComplete((prev) => ({
            ...prev,
            [dataSourceKey]: true,
          }));
        }
      }
    },
    [pagination]
  );

  // Debounced search functions
  const debouncedSearch = useMemo(() => {
    const functions = {};

    // Create debounced function for each unique data source
    const uniqueDataSources = ["employees", "designations", "departments"];

    uniqueDataSources.forEach((dataSource) => {
      functions[dataSource] = _.debounce((value, filterType) => {
        const dataSourceKey = getDataSourceKey(filterType);
        setPagination((prev) => ({
          ...prev,
          [dataSourceKey]: {
            ...prev[dataSourceKey],
            page: 1,
            hasMore: true,
          },
        }));
        setSharedDataSources((prev) => ({ ...prev, [dataSourceKey]: [] }));
        setInitialLoadComplete((prev) => ({
          ...prev,
          [dataSourceKey]: false,
        }));
        fetchFilterData(filterType, 1, value, true);
      }, 300);
    });

    return functions;
  }, [fetchFilterData]);

  // Handle search
  const handleSearch = useCallback(
    (filterType, rawValue) => {
      const value = rawValue ?? "";
      const trimmed = value.trim();
      const searchTermKey = getSearchTermKey(filterType);
      const dataSourceKey = getDataSourceKey(filterType);

      setSearchTerms((prev) => ({ ...prev, [searchTermKey]: value }));

      const debouncedFn = debouncedSearch[dataSourceKey];
      debouncedFn?.cancel?.();

      if (!trimmed) {
        setPagination((prev) => ({
          ...prev,
          [dataSourceKey]: {
            ...prev[dataSourceKey],
            page: 1,
            hasMore: true,
            loading: false,
          },
        }));
        setSharedDataSources((prev) => ({ ...prev, [dataSourceKey]: [] }));
        setInitialLoadComplete((prev) => ({ ...prev, [dataSourceKey]: false }));
        fetchFilterData(filterType, 1, "", true);
      } else {
        debouncedFn?.(trimmed, filterType);
      }
    },
    [debouncedSearch, fetchFilterData]
  );

  // Handle load more
  const handleLoadMore = useCallback(
    (filterType) => {
      const dataSourceKey = getDataSourceKey(filterType);
      const searchTermKey = getSearchTermKey(filterType);

      if (
        pagination[dataSourceKey]?.hasMore &&
        !pagination[dataSourceKey]?.loading &&
        initialLoadComplete[dataSourceKey]
      ) {
        fetchFilterData(
          filterType,
          pagination[dataSourceKey].page + 1,
          searchTerms[searchTermKey] || "",
          false
        );
      }
    },
    [pagination, searchTerms, fetchFilterData, initialLoadComplete]
  );

  // Handle filter selection
  const handleFilterSelection = useCallback(
    (filterType, e) => {
      const value = e.target.value;
      const employeesData = sharedDataSources.employees;

      // Handle special logic for employee code and employee sync
      if (filterType === FILTER_TYPES.EMPLOYEE_CODE) {
        const employeeData = employeesData.find(
          (emp) => emp.emp_code === value
        );
        setSelectedFilters((prev) => ({
          ...prev,
          [FILTER_TYPES.EMPLOYEE_CODE]: value,
          [FILTER_TYPES.EMPLOYEE]: employeeData?._id || "",
        }));
      } else if (filterType === FILTER_TYPES.EMPLOYEE) {
        const employeeData = employeesData.find((emp) => emp._id === value);
        setSelectedFilters((prev) => ({
          ...prev,
          [FILTER_TYPES.EMPLOYEE]: value,
          [FILTER_TYPES.EMPLOYEE_CODE]: employeeData?.emp_code || "",
        }));
      } else {
        setSelectedFilters((prev) => ({
          ...prev,
          [filterType]: value,
        }));
      }
    },
    [sharedDataSources.employees]
  );

  // Reset single filter
  const resetFilter = useCallback((filterType) => {
    let updatedFilters;
    
    if (
      filterType === FILTER_TYPES.EMPLOYEE_CODE ||
      filterType === FILTER_TYPES.EMPLOYEE
    ) {
      updatedFilters = {
        ...selectedFilters,
        [FILTER_TYPES.EMPLOYEE_CODE]: "",
        [FILTER_TYPES.EMPLOYEE]: "",
      };
    } else {
      updatedFilters = {
        ...selectedFilters,
        [filterType]: "",
      };
    }
    
    setSelectedFilters(updatedFilters);
    
    // Pass the updated filters to the parent component
    onFilterChange(updatedFilters);
    
  }, [selectedFilters, onFilterChange]);

  // Reset all filters
  const resetAllFilters = useCallback(() => {
    const clearedFilters = {
      [FILTER_TYPES.EMPLOYEE_CODE]: "",
      [FILTER_TYPES.EMPLOYEE]: "",
      [FILTER_TYPES.DESIGNATION]: "",
      [FILTER_TYPES.DEPARTMENT]: "",
    };
    
    setSelectedFilters(clearedFilters);
    
    setSearchTerms({
      employees: "",
      designations: "",
      departments: "",
    });
    
    // Pass the cleared filters to the parent component
    onFilterChange(clearedFilters);
    
    setIsPopoverOpen(false);
  }, [onFilterChange]);

  // Apply filters
  const applyFilters = useCallback(() => {
    onFilterChange(selectedFilters);
    setIsPopoverOpen(false);
  }, [selectedFilters, onFilterChange]);

  // Load initial data when filter becomes active
  useEffect(() => {
    const dataSourceKey = getDataSourceKey(activeFilter);

    if (
      sharedDataSources[dataSourceKey]?.length === 0 &&
      !pagination[dataSourceKey]?.loading &&
      pagination[dataSourceKey]?.hasMore &&
      !initialLoadComplete[dataSourceKey]
    ) {
      fetchFilterData(activeFilter, 1, "", true);
    }
  }, [
    activeFilter,
    sharedDataSources,
    pagination,
    fetchFilterData,
    initialLoadComplete,
  ]);

  // Reorder selected item to top when switching filters
useEffect(() => {
  const dataSourceKey = getDataSourceKey(activeFilter);
  if (activeFilter && initialLoadComplete[dataSourceKey]) {
    const selectedValue = selectedFilters[activeFilter];
    if (selectedValue) {
      setSharedDataSources((prev) => {
        const items = [...prev[dataSourceKey]];
        const config = FILTER_CONFIG[activeFilter];
        const selectedIndex = items.findIndex(
          (item) => config.getValue(item) === selectedValue
        );
        if (selectedIndex !== -1) {
          const selectedItem = items[selectedIndex];
          items.splice(selectedIndex, 1);
          items.unshift(selectedItem);
          return { ...prev, [dataSourceKey]: items };
        }
        return prev;
      });
    }
  }
}, [activeFilter, initialLoadComplete, isPopoverOpen]); // Only these three dependencies

  // Cleanup debounced functions
  useEffect(() => {
    return () => Object.values(debouncedSearch).forEach((fn) => fn?.cancel?.());
  }, [debouncedSearch]);

  // Render filter content
  const renderFilterContent = () => {
    const config = FILTER_CONFIG[activeFilter];
    if (!config) return null;

    const dataSourceKey = getDataSourceKey(activeFilter);
    const searchTermKey = getSearchTermKey(activeFilter);

    return (
      <FilterSection
        config={config}
        items={sharedDataSources[dataSourceKey] || []}
        selectedValue={selectedFilters[activeFilter]}
        pagination={pagination[dataSourceKey]}
        searchTerm={searchTerms[searchTermKey] || ""}
        onSearch={(value) => handleSearch(activeFilter, value)}
        onSelect={(e) => handleFilterSelection(activeFilter, e)}
        onLoadMore={() => handleLoadMore(activeFilter)}
        onApply={applyFilters}
        onReset={() => resetFilter(activeFilter)}
        isInitialLoadComplete={initialLoadComplete[dataSourceKey]}
      />
    );
  };

  return (
    <div className="filter-container">
      <Popover
        arrow={false}
        content={
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
                  >
                    Reset All ({activeFiltersCount})
                  </Button>
                )}
              </div>
              <Divider style={{ margin: "8px 0" }} />
              {FILTER_MENU_ITEMS.map((item) => (
                <div
                  key={item.key}
                  onClick={() => setActiveFilter(item.key)}
                  className={`filter-menu-item ${
                    activeFilter === item.key ? "active" : ""
                  }`}
                >
                  <span>{item.label}</span>
                  {selectedFilters[item.key] && (
                    <Badge size="small" color="#1890ff" />
                  )}
                </div>
              ))}
            </div>
            <div className="filter-content">{renderFilterContent()}</div>
          </div>
        }
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

export default EmployeeUsersFilterComponent;
