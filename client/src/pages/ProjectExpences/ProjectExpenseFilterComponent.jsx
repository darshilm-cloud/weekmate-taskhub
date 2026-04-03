/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Button,
  Popover,
  Checkbox,
  Radio,
  Input,
  Badge,
  Divider,
  Spin,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import _ from "lodash";
import "../../assets/css/FilterUI.css";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";

const { Search } = Input;

// Filter types
const FILTER_TYPES = {
  PROJECT: "project",
  DEPARTMENT: "technology",
  MANAGER: "manager",
  ACCOUNT_MANAGER: "accountManager",
  NEED_TO_BILL_CUSTOMER: "needToBillCustomer",
  CREATED_BY: "createdBy"
};

// Need to Bill Customer options
const NEED_TO_BILL_CUSTOMER_OPTIONS = [
  { value: "All", label: "All" },
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const createDefaultSelectedFilters = () => ({
  [FILTER_TYPES.PROJECT]: [],
  [FILTER_TYPES.DEPARTMENT]: [],
  [FILTER_TYPES.MANAGER]: [],
  [FILTER_TYPES.ACCOUNT_MANAGER]: [],
  [FILTER_TYPES.NEED_TO_BILL_CUSTOMER]: "All",
  [FILTER_TYPES.CREATED_BY]: [],
});

const normalizeSelectedFilters = (filters = {}) => ({
  [FILTER_TYPES.PROJECT]: Array.isArray(filters[FILTER_TYPES.PROJECT]) ? [...filters[FILTER_TYPES.PROJECT]] : [],
  [FILTER_TYPES.DEPARTMENT]: Array.isArray(filters[FILTER_TYPES.DEPARTMENT]) ? [...filters[FILTER_TYPES.DEPARTMENT]] : [],
  [FILTER_TYPES.MANAGER]: Array.isArray(filters[FILTER_TYPES.MANAGER]) ? [...filters[FILTER_TYPES.MANAGER]] : [],
  [FILTER_TYPES.ACCOUNT_MANAGER]: Array.isArray(filters[FILTER_TYPES.ACCOUNT_MANAGER]) ? [...filters[FILTER_TYPES.ACCOUNT_MANAGER]] : [],
  [FILTER_TYPES.NEED_TO_BILL_CUSTOMER]:
    filters[FILTER_TYPES.NEED_TO_BILL_CUSTOMER] || "All",
  [FILTER_TYPES.CREATED_BY]: Array.isArray(filters[FILTER_TYPES.CREATED_BY]) ? [...filters[FILTER_TYPES.CREATED_BY]] : [],
});

// Filter configuration
const FILTER_CONFIG = {
  [FILTER_TYPES.PROJECT]: {
    api: Service.myProjects,
    method: Service.postMethod,
    limit: 20,
    label: "Project",
    getName: (item) => item.title,
    skipParam: "skipProject",
    searchKey: "title",
    renderItem: (item, handleSelect, selectedItems) => (
      <div
        key={item._id}
        className={`assignee-item ${
          selectedItems.includes(item._id) ? "selected" : ""
        }`}
      >
        <Checkbox
          checked={selectedItems.includes(item._id)}
          onChange={() => handleSelect(item)}
        />
        <span>{item.title}</span>
      </div>
    ),
    permissionCheck: (permissions) => !permissions.hasClientAccess,
  },
  [FILTER_TYPES.DEPARTMENT]: {
    api: Service.getprojectTech,
    method: Service.postMethod,
    limit: 20,
    label: "Department",
    getName: (item) => item.project_tech,
    skipParam: "skipDepartment",
    searchKey: "project_tech",
    renderItem: (item, handleSelect, selectedItems) => (
      <div
        key={item._id}
        className={`assignee-item ${
          selectedItems.includes(item._id) ? "selected" : ""
        }`}
      >
        <Checkbox
          checked={selectedItems.includes(item._id)}
          onChange={() => handleSelect(item)}
        />
        <span>{item.project_tech}</span>
      </div>
    ),
    permissionCheck: (permissions) => permissions.isSuperAdmin,
  },
  [FILTER_TYPES.MANAGER]: {
    api: Service.getProjectManager,
    method: Service.getMethod,
    limit: 20,
    label: "Manager",
    getName: (item) => removeTitle(item.manager_name),
    skipParam: "skipManager",
    searchKey: "manager_name",
    renderItem: (item, handleSelect, selectedItems) => (
      <div
        key={item._id}
        className={`assignee-item ${
          selectedItems.includes(item._id) ? "selected" : ""
        }`}
      >
        <Checkbox
          checked={selectedItems.includes(item._id)}
          onChange={() => handleSelect(item)}
        />
        <span>{removeTitle(item.manager_name)}</span>
      </div>
    ),
    permissionCheck: (permissions) => permissions.isSuperAdmin,
  },
  [FILTER_TYPES.ACCOUNT_MANAGER]: {
    api: Service.getAccountManager,
    method: Service.getMethod,
    limit: 20,
    label: "Account Manager",
    getName: (item) => removeTitle(item.full_name),
    skipParam: "skipAccountManager",
    searchKey: "full_name",
    renderItem: (item, handleSelect, selectedItems) => (
      <div
        key={item._id}
        className={`assignee-item ${
          selectedItems.includes(item._id) ? "selected" : ""
        }`}
      >
        <Checkbox
          checked={selectedItems.includes(item._id)}
          onChange={() => handleSelect(item)}
        />
        <span>{removeTitle(item.full_name)}</span>
      </div>
    ),
    permissionCheck: (permissions) => permissions.isSuperAdmin,
  },
  [FILTER_TYPES.NEED_TO_BILL_CUSTOMER]: {
    label: "Need to Bill Customer",
    skipParam: "skipNeedToBillCustomer",
  },
  [FILTER_TYPES.CREATED_BY]: {
    api: Service.getEmployees,
    method: Service.getMethod,
    limit: 20,
    label: "Created by",
    getName: (item) => removeTitle(item.full_name),
    skipParam: "skipCreatedBy",
    searchKey: "full_name", // Changed from "createdBy" to "full_name" to match the API field
    renderItem: (item, handleSelect, selectedItems) => (
      <div
        key={item._id}
        className={`assignee-item ${
          selectedItems.includes(item._id) ? "selected" : ""
        }`}
      >
        <Checkbox
          checked={selectedItems.includes(item._id)}
          onChange={() => handleSelect(item)}
        />
        <span>{removeTitle(item.full_name)}</span>
      </div>
    ),
    permissionCheck: () => true, // No permission restrictions
  },
};

// Create filter menu items based on permissions
const createFilterMenuItems = (userPermissions) => {
  return Object.entries(FILTER_CONFIG)
    .filter(
      ([_, config]) =>
        !config.permissionCheck || config.permissionCheck(userPermissions)
    )
    .map(([key, config]) => ({
      key,
      label: config.label,
    }));
};

// FilterSection component for API-driven filters
const FilterSection = ({
  config,
  items,
  selectedItems,
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
        loading={pagination.loading && pagination.page === 1}
      />
    </div>
    <InfiniteScroll
      dataLength={items.length}
      next={onLoadMore}
      hasMore={isInitialLoadComplete && pagination.hasMore}
      loader={
        pagination.loading && pagination.page > 1 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "16px 0",
              alignItems: "center",
            }}
          >
            <Spin size="small" style={{ margin: 0 }} />
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
      {items.map((item) => config.renderItem(item, onSelect, selectedItems))}
      {items.length === 0 && !pagination.loading && (
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

// RadioFilter component for Need to Bill Customer
const RadioFilter = ({
  options,
  selectedValue,
  onSelect,
  onApply,
  onReset,
  label,
}) => (
  <div className="filter-content-inner">
    <h4 className="filter-title">Filter by {label}</h4>
    <div className="filter-options">
      <Radio.Group
        onChange={(e) => onSelect(e.target.value)}
        value={selectedValue}
      >
        {options.map(({ value, label }) => (
          <div key={value} className="radio-option">
            <Radio value={value}>{label}</Radio>
          </div>
        ))}
      </Radio.Group>
    </div>
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

const ProjectExpenseFilterComponent = ({
  onFilterChange,
  userPermissions,
  selectedFilters: appliedFilters,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.PROJECT);
  const [filterData, setFilterData] = useState({
    [FILTER_TYPES.PROJECT]: [],
    [FILTER_TYPES.DEPARTMENT]: [],
    [FILTER_TYPES.MANAGER]: [],
    [FILTER_TYPES.ACCOUNT_MANAGER]: [],
    [FILTER_TYPES.CREATED_BY]: [], // Added CREATED_BY to state
  });
  const [draftFilters, setDraftFilters] = useState(() =>
    normalizeSelectedFilters(appliedFilters || createDefaultSelectedFilters())
  );
  const [searchTerms, setSearchTerms] = useState({
    [FILTER_TYPES.PROJECT]: "",
    [FILTER_TYPES.DEPARTMENT]: "",
    [FILTER_TYPES.MANAGER]: "",
    [FILTER_TYPES.ACCOUNT_MANAGER]: "",
    [FILTER_TYPES.CREATED_BY]: "", // Added CREATED_BY to search terms
  });
  const [pagination, setPagination] = useState({
    [FILTER_TYPES.PROJECT]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
    [FILTER_TYPES.DEPARTMENT]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
    [FILTER_TYPES.MANAGER]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
    [FILTER_TYPES.ACCOUNT_MANAGER]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
    [FILTER_TYPES.CREATED_BY]: { // Added CREATED_BY to pagination
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
  });
  const [initialLoadComplete, setInitialLoadComplete] = useState({
    [FILTER_TYPES.PROJECT]: false,
    [FILTER_TYPES.DEPARTMENT]: false,
    [FILTER_TYPES.MANAGER]: false,
    [FILTER_TYPES.ACCOUNT_MANAGER]: false,
    [FILTER_TYPES.CREATED_BY]: false, // Added CREATED_BY to initial load tracking
  });

  const activeFiltersCount = useMemo(() => {
    return Object.entries(draftFilters).reduce((count, [key, value]) => {
      if (key === FILTER_TYPES.NEED_TO_BILL_CUSTOMER) {
        return count + (value !== "All" ? 1 : 0);
      }
      return count + (Array.isArray(value) && value.length > 0 ? 1 : 0);
    }, 0);
  }, [draftFilters]);

  const fetchFilterData = useCallback(
    async (filterType, page = 1, search = "", reset = false) => {
      const config = FILTER_CONFIG[filterType];
      if (
        !config ||
        pagination[filterType].loading ||
        (!reset && !pagination[filterType].hasMore)
      )
        return;

      setPagination((prev) => ({
        ...prev,
        [filterType]: { ...prev[filterType], loading: true },
      }));

      try {
        let response;

        if (config.method === Service.postMethod) {
          // For POST methods, send pagination and search in the request body
          const reqBody = {
            pageNo: page,
            limit: config.limit,
            search,
            ...(filterType === FILTER_TYPES.DEPARTMENT && {
              isDropdown: false,
            }),
          };

          response = await Service.makeAPICall({
            methodName: config.method,
            api_url: config.api,
            body: reqBody,
          });
        } else {
          // For GET methods, use query parameters
          const apiUrl = `${config.api}?page=${page}&limit=${config.limit}&search=${search}`;
          response = await Service.makeAPICall({
            methodName: config.method,
            api_url: apiUrl,
          });
        }

        const newData = Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data)
          ? response.data
          : [];
        const metadata = response?.data?.metadata || {
          total: newData.length,
          totalPages: 1,
        };

        setFilterData((prev) => ({
          ...prev,
          [filterType]: reset ? newData : [...prev[filterType], ...newData],
        }));

        setPagination((prev) => ({
          ...prev,
          [filterType]: {
            ...prev[filterType],
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
          setInitialLoadComplete((prev) => ({ ...prev, [filterType]: true }));
        }
      } catch (error) {
        console.error(`Error fetching ${filterType}:`, error);
        setPagination((prev) => ({
          ...prev,
          [filterType]: { ...prev[filterType], loading: false, hasMore: false },
        }));
        if (page === 1) {
          setFilterData((prev) => ({ ...prev, [filterType]: [] }));
          setInitialLoadComplete((prev) => ({ ...prev, [filterType]: true }));
        }
      }
    },
    [pagination]
  );

  const debouncedSearch = useMemo(() => {
    const functions = {};
    [
      FILTER_TYPES.PROJECT,
      FILTER_TYPES.DEPARTMENT,
      FILTER_TYPES.MANAGER,
      FILTER_TYPES.ACCOUNT_MANAGER,
      FILTER_TYPES.CREATED_BY, // Added CREATED_BY to debounced search
    ].forEach((key) => {
      functions[key] = _.debounce((value) => {
        setPagination((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            page: 1,
            hasMore: true,
          },
        }));
        setFilterData((prev) => ({ ...prev, [key]: [] }));
        setInitialLoadComplete((prev) => ({
          ...prev,
          [key]: false,
        }));
        fetchFilterData(key, 1, value, true);
      }, 300);
    });
    return functions;
  }, [fetchFilterData]);

  const handleSearch = useCallback(
    (filterType, rawValue) => {
      const value = rawValue ?? "";
      const trimmed = value.trim();

      setSearchTerms((prev) => ({ ...prev, [filterType]: value }));

      const debouncedFn = debouncedSearch[filterType];
      debouncedFn.cancel?.();

      if (!trimmed) {
        setPagination((prev) => ({
          ...prev,
          [filterType]: {
            ...prev[filterType],
            page: 1,
            hasMore: true,
            loading: false,
          },
        }));
        setFilterData((prev) => ({ ...prev, [filterType]: [] }));
        setInitialLoadComplete((prev) => ({ ...prev, [filterType]: false }));
        fetchFilterData(filterType, 1, "", true);
      } else {
        debouncedFn(trimmed);
      }
    },
    [debouncedSearch, fetchFilterData]
  );

  const handleLoadMore = useCallback(
    (filterType) => {
      if (
        pagination[filterType].hasMore &&
        !pagination[filterType].loading &&
        initialLoadComplete[filterType]
      ) {
        fetchFilterData(
          filterType,
          pagination[filterType].page + 1,
          searchTerms[filterType],
          false
        );
      }
    },
    [pagination, searchTerms, fetchFilterData, initialLoadComplete]
  );

  const handleFilterSelection = useCallback((item, filterType) => {
    setDraftFilters((prev) => {
      const current = prev[filterType];
      const updated = current.includes(item._id)
        ? current.filter((id) => id !== item._id)
        : [...current, item._id];
      return { ...prev, [filterType]: updated };
    });
  }, []);

  const handleSingleSelection = useCallback((value, filterType) => {
    setDraftFilters((prev) => ({ ...prev, [filterType]: value }));
  }, []);

  const resetFilter = useCallback(
    (filterType) => {
      setDraftFilters((prev) => ({
        ...prev,
        [filterType]:
          filterType === FILTER_TYPES.NEED_TO_BILL_CUSTOMER ? "All" : [],
      }));
      setSearchTerms((prev) => ({ ...prev, [filterType]: "" }));
      onFilterChange([FILTER_CONFIG[filterType].skipParam]);
    },
    [onFilterChange]
  );

  const resetAllFilters = useCallback(() => {
    setDraftFilters(createDefaultSelectedFilters());
    setSearchTerms({
      [FILTER_TYPES.PROJECT]: "",
      [FILTER_TYPES.DEPARTMENT]: "",
      [FILTER_TYPES.MANAGER]: "",
      [FILTER_TYPES.ACCOUNT_MANAGER]: "",
      [FILTER_TYPES.CREATED_BY]: "", // Added CREATED_BY to reset
    });
    onFilterChange(["skipAll"]);
    setIsPopoverOpen(false);
  }, [onFilterChange]);

  useEffect(() => {
    setDraftFilters(normalizeSelectedFilters(appliedFilters || createDefaultSelectedFilters()));
  }, [appliedFilters]);

  useEffect(() => {
    if (
      [
        FILTER_TYPES.PROJECT,
        FILTER_TYPES.DEPARTMENT,
        FILTER_TYPES.MANAGER,
        FILTER_TYPES.ACCOUNT_MANAGER,
        FILTER_TYPES.CREATED_BY, // Added CREATED_BY to initial load check
      ].includes(activeFilter) &&
      filterData[activeFilter].length === 0 &&
      !pagination[activeFilter].loading &&
      pagination[activeFilter].hasMore &&
      !initialLoadComplete[activeFilter]
    ) {
      fetchFilterData(activeFilter, 1, "", true);
    }
  }, [
    activeFilter,
    filterData,
    pagination,
    fetchFilterData,
    initialLoadComplete,
  ]);

  // Add this useEffect to move selected items to top when switching filters
  useEffect(() => {
    if (activeFilter && initialLoadComplete[activeFilter]) {
      const selectedIds = draftFilters[activeFilter];
      if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
        setFilterData((prev) => {
          const items = [...prev[activeFilter]];
          const selectedItems = [];
          const unselectedItems = [];

          // Separate selected and unselected items
          items.forEach((item) => {
            if (selectedIds.includes(item._id)) {
              selectedItems.push(item);
            } else {
              unselectedItems.push(item);
            }
          });

          // Put selected items at the top, followed by unselected items
          const reorderedItems = [...selectedItems, ...unselectedItems];

          return { ...prev, [activeFilter]: reorderedItems };
        });
      }
    }
  }, [activeFilter, draftFilters, initialLoadComplete, isPopoverOpen]);

  useEffect(() => {
    return () => Object.values(debouncedSearch).forEach((fn) => fn.cancel());
  }, [debouncedSearch]);

  const renderFilterContent = () => {
    const config = FILTER_CONFIG[activeFilter];
    if (
      !config ||
      (config.permissionCheck && !config.permissionCheck(userPermissions))
    ) {
      return (
        <RadioFilter
          options={NEED_TO_BILL_CUSTOMER_OPTIONS}
          selectedValue={draftFilters[FILTER_TYPES.NEED_TO_BILL_CUSTOMER]}
          onSelect={(value) =>
            handleSingleSelection(value, FILTER_TYPES.NEED_TO_BILL_CUSTOMER)
          }
          onApply={() => {
            onFilterChange([], normalizeSelectedFilters(draftFilters));
            setIsPopoverOpen(false);
          }}
          onReset={() => resetFilter(FILTER_TYPES.NEED_TO_BILL_CUSTOMER)}
          label={FILTER_CONFIG[FILTER_TYPES.NEED_TO_BILL_CUSTOMER].label}
        />
      );
    }

    switch (activeFilter) {
      case FILTER_TYPES.PROJECT:
      case FILTER_TYPES.DEPARTMENT:
      case FILTER_TYPES.MANAGER:
      case FILTER_TYPES.ACCOUNT_MANAGER:
      case FILTER_TYPES.CREATED_BY: // Added CREATED_BY to filter content rendering
        return (
          <FilterSection
            config={config}
            items={filterData[activeFilter]}
            selectedItems={draftFilters[activeFilter]}
            pagination={pagination[activeFilter]}
            searchTerm={searchTerms[activeFilter]}
            onSearch={(value) => handleSearch(activeFilter, value)}
            onSelect={(item) => handleFilterSelection(item, activeFilter)}
            onLoadMore={() => handleLoadMore(activeFilter)}
            onApply={() => {
              onFilterChange([], normalizeSelectedFilters(draftFilters));
              setIsPopoverOpen(false);
            }}
            onReset={() => resetFilter(activeFilter)}
            isInitialLoadComplete={initialLoadComplete[activeFilter]}
          />
        );
      case FILTER_TYPES.NEED_TO_BILL_CUSTOMER:
        return (
          <RadioFilter
            options={NEED_TO_BILL_CUSTOMER_OPTIONS}
            selectedValue={draftFilters[FILTER_TYPES.NEED_TO_BILL_CUSTOMER]}
            onSelect={(value) =>
              handleSingleSelection(value, FILTER_TYPES.NEED_TO_BILL_CUSTOMER)
            }
            onApply={() => {
              onFilterChange([], normalizeSelectedFilters(draftFilters));
              setIsPopoverOpen(false);
            }}
            onReset={() => resetFilter(FILTER_TYPES.NEED_TO_BILL_CUSTOMER)}
            label={FILTER_CONFIG[FILTER_TYPES.NEED_TO_BILL_CUSTOMER].label}
          />
        );
      default:
        return null;
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
              Reset All ({activeFiltersCount})
            </Button>
          )}
        </div>
        <Divider style={{ margin: "8px 0" }} />
        {createFilterMenuItems(userPermissions).map((item) => (
          <div
            key={item.key}
            onClick={() => setActiveFilter(item.key)}
            className={`filter-menu-item ${
              activeFilter === item.key ? "active" : ""
            }`}
          >
            <span>{item.label}</span>
            {(item.key === FILTER_TYPES.NEED_TO_BILL_CUSTOMER
              ? draftFilters[item.key] !== "All"
              : !_.isEmpty(draftFilters[item.key])) && (
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
        onOpenChange={(open) => {
          if (open) {
            setDraftFilters(normalizeSelectedFilters(appliedFilters || createDefaultSelectedFilters()));
          }
          setIsPopoverOpen(open);
        }}
        placement="bottomLeft"
        overlayStyle={{ maxWidth: "none" }}
      >
        <Button
          icon={<FilterOutlined />}
          className="filter-btn"
          style={{ background: "#fff", borderRadius: 8, borderColor: "#d1d5db", color: "#374151" }}
        >
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

export default React.memo(ProjectExpenseFilterComponent);
