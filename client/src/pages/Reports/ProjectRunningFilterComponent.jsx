/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button, Popover, Checkbox, Input, Badge, Divider, Spin } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import _ from "lodash";
import "../../assets/css/FilterUI.css";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";
import { isEmpty } from "lodash";

const { Search } = Input;

// Filter types
const FILTER_TYPES = {
  DEPARTMENT: "department",
  PROJECT_MANAGER: "projectManager",
  PROJECT_TYPE: "projectType",
};

// Filter configuration
const FILTER_CONFIG = {
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
    requestBody: { isDropdown: false },
  },
  [FILTER_TYPES.PROJECT_MANAGER]: {
    api: Service.getProjectManager,
    method: Service.getMethod,
    limit: 20,
    label: "Project Manager",
    getName: (item) => removeTitle(item.manager_name),
    skipParam: "skipProjectManager",
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
  },
  [FILTER_TYPES.PROJECT_TYPE]: {
    api: Service.getProjectListing,
    method: Service.postMethod,
    limit: 20,
    label: "Project Type",
    getName: (item) => item.project_type,
    skipParam: "skipProjectType",
    searchKey: "project_type",
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
        <span>{item.project_type}</span>
      </div>
    ),
  },
};

// Create filter menu items
const createFilterMenuItems = () => {
  return Object.entries(FILTER_CONFIG).map(([key, config]) => ({
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
            <Spin size="small" margin={{ margin: 0 }} />
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

const ProjectRunningFilterComponent = ({ onFilterChange }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.DEPARTMENT);
  const [filterData, setFilterData] = useState({
    [FILTER_TYPES.DEPARTMENT]: [],
    [FILTER_TYPES.PROJECT_MANAGER]: [],
    [FILTER_TYPES.PROJECT_TYPE]: [],
  });
  const [selectedFilters, setSelectedFilters] = useState({
    [FILTER_TYPES.DEPARTMENT]: [],
    [FILTER_TYPES.PROJECT_MANAGER]: [],
    [FILTER_TYPES.PROJECT_TYPE]: [],
  });
  const [searchTerms, setSearchTerms] = useState({
    [FILTER_TYPES.DEPARTMENT]: "",
    [FILTER_TYPES.PROJECT_MANAGER]: "",
    [FILTER_TYPES.PROJECT_TYPE]: "",
  });
  const [pagination, setPagination] = useState({
    [FILTER_TYPES.DEPARTMENT]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
    [FILTER_TYPES.PROJECT_MANAGER]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
    [FILTER_TYPES.PROJECT_TYPE]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
  });
  const [initialLoadComplete, setInitialLoadComplete] = useState({
    [FILTER_TYPES.DEPARTMENT]: false,
    [FILTER_TYPES.PROJECT_MANAGER]: false,
    [FILTER_TYPES.PROJECT_TYPE]: false,
  });

  const activeFiltersCount = useMemo(() => {
    return Object.values(selectedFilters).reduce((count, value) => {
      return count + (Array.isArray(value) && value.length > 0 ? 1 : 0);
    }, 0);
  }, [selectedFilters]);

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
            ...(config.requestBody || {}),
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
            body: config.requestBody || undefined,
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
      FILTER_TYPES.DEPARTMENT,
      FILTER_TYPES.PROJECT_MANAGER,
      FILTER_TYPES.PROJECT_TYPE,
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
    setSelectedFilters((prev) => {
      const current = prev[filterType];
      const updated = current.includes(item._id)
        ? current.filter((id) => id !== item._id)
        : [...current, item._id];
      return { ...prev, [filterType]: updated };
    });
  }, []);

  const resetFilter = useCallback(
    (filterType) => {
      setSelectedFilters((prev) => ({
        ...prev,
        [filterType]: [],
      }));
      setSearchTerms((prev) => ({ ...prev, [filterType]: "" }));
      onFilterChange([FILTER_CONFIG[filterType].skipParam]);
    },
    [onFilterChange]
  );

  const resetAllFilters = useCallback(() => {
    setSelectedFilters({
      [FILTER_TYPES.DEPARTMENT]: [],
      [FILTER_TYPES.PROJECT_MANAGER]: [],
      [FILTER_TYPES.PROJECT_TYPE]: [],
    });
    setSearchTerms({
      [FILTER_TYPES.DEPARTMENT]: "",
      [FILTER_TYPES.PROJECT_MANAGER]: "",
      [FILTER_TYPES.PROJECT_TYPE]: "",
    });
    onFilterChange(["skipAll"]);
    setIsPopoverOpen(false);
  }, [onFilterChange]);

  useEffect(() => {
    if (
      [
        FILTER_TYPES.DEPARTMENT,
        FILTER_TYPES.PROJECT_MANAGER,
        FILTER_TYPES.PROJECT_TYPE,
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
      const selectedIds = selectedFilters[activeFilter];
      if (selectedIds && selectedIds.length > 0) {
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
  }, [activeFilter, initialLoadComplete, isPopoverOpen]);

  useEffect(() => {
    return () => Object.values(debouncedSearch).forEach((fn) => fn.cancel());
  }, [debouncedSearch]);

  const renderFilterContent = () => {
    const config = FILTER_CONFIG[activeFilter];
    if (!config) return null;

    return (
      <FilterSection
        config={config}
        items={filterData[activeFilter]}
        selectedItems={selectedFilters[activeFilter]}
        pagination={pagination[activeFilter]}
        searchTerm={searchTerms[activeFilter]}
        onSearch={(value) => handleSearch(activeFilter, value)}
        onSelect={(item) => handleFilterSelection(item, activeFilter)}
        onLoadMore={() => handleLoadMore(activeFilter)}
        onApply={() => {
          onFilterChange([], selectedFilters);
          setIsPopoverOpen(false);
        }}
        onReset={() => resetFilter(activeFilter)}
        isInitialLoadComplete={initialLoadComplete[activeFilter]}
      />
    );
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
        {createFilterMenuItems().map((item) => (
          <div
            key={item.key}
            onClick={() => setActiveFilter(item.key)}
            className={`filter-menu-item ${
              activeFilter === item.key ? "active" : ""
            }`}
          >
            <span>{item.label}</span>
            {!isEmpty(selectedFilters[item.key]) && (
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

export default React.memo(ProjectRunningFilterComponent);
