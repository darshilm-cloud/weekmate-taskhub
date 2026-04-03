import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button, Popover, Checkbox, Input, Badge, Divider, Spin } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import _ from "lodash";
import "../../assets/css/FilterUI.css";
import { removeTitle } from "../../util/nameFilter";
import Service from "../../service";
import { isEmpty } from "lodash";

const { Search } = Input;

// Filter types
const FILTER_TYPES = {
  ACCOUNT_MANAGER: "account_manager",
  MANAGER: "manager",
  TECHNOLOGY: "technology",
  PROJECT_TYPE: "project_type",
  ASSIGNEES: "assignees",
  STATUS: "status",
};

const createDefaultSelectedFilters = () => ({
  [FILTER_TYPES.ACCOUNT_MANAGER]: [],
  [FILTER_TYPES.MANAGER]: [],
  [FILTER_TYPES.TECHNOLOGY]: [],
  [FILTER_TYPES.PROJECT_TYPE]: [],
  [FILTER_TYPES.ASSIGNEES]: [],
  [FILTER_TYPES.STATUS]: [],
});

const normalizeSelectedFilters = (filters = {}) => ({
  [FILTER_TYPES.ACCOUNT_MANAGER]: Array.isArray(filters[FILTER_TYPES.ACCOUNT_MANAGER]) ? [...filters[FILTER_TYPES.ACCOUNT_MANAGER]] : [],
  [FILTER_TYPES.MANAGER]: Array.isArray(filters[FILTER_TYPES.MANAGER]) ? [...filters[FILTER_TYPES.MANAGER]] : [],
  [FILTER_TYPES.TECHNOLOGY]: Array.isArray(filters[FILTER_TYPES.TECHNOLOGY]) ? [...filters[FILTER_TYPES.TECHNOLOGY]] : [],
  [FILTER_TYPES.PROJECT_TYPE]: Array.isArray(filters[FILTER_TYPES.PROJECT_TYPE]) ? [...filters[FILTER_TYPES.PROJECT_TYPE]] : [],
  [FILTER_TYPES.ASSIGNEES]: Array.isArray(filters[FILTER_TYPES.ASSIGNEES]) ? [...filters[FILTER_TYPES.ASSIGNEES]] : [],
  [FILTER_TYPES.STATUS]: Array.isArray(filters[FILTER_TYPES.STATUS]) ? [...filters[FILTER_TYPES.STATUS]] : [],
});

const getSelectedItemsByIds = (items = [], ids = []) =>
  items.filter((item) => ids.includes(item?._id));

const buildAppliedFiltersPayload = (filters = {}, data = {}) => {
  const normalized = normalizeSelectedFilters(filters);
  const selectedTechnologyItems = getSelectedItemsByIds(
    data[FILTER_TYPES.TECHNOLOGY],
    normalized[FILTER_TYPES.TECHNOLOGY]
  );

  return {
    ...normalized,
    technology_labels: selectedTechnologyItems
      .map((item) => item?.project_tech)
      .filter(Boolean),
  };
};

// API and pagination config
const FILTER_CONFIG = {
  [FILTER_TYPES.ACCOUNT_MANAGER]: {
    api: Service.getAccountManager,
    method: Service.getMethod,
    limit: 20,
    label: "Account Manager",
    getName: (item) => removeTitle(item?.full_name),
    skipParam: "skipAccountManager",
    searchKey: "acc_manager",
  },
  [FILTER_TYPES.MANAGER]: {
    api: Service.getProjectManager,
    method: Service.getMethod,
    limit: 20,
    label: "Project Manager",
    getName: (item) => removeTitle(item?.manager_name),
    skipParam: "skipManager",
    searchKey: "manager",
  },
  [FILTER_TYPES.TECHNOLOGY]: {
    api: Service.getprojectTech,
    method: Service.postMethod,
    limit: 20,
    body: { sortBy: "desc", isDropdown: false },
    label: "Department",
    getName: (item) => item.project_tech,
    skipParam: "skipTechnology",
    searchKey: "technology",
  },
  [FILTER_TYPES.PROJECT_TYPE]: {
    api: Service.getProjectListing,
    method: Service.postMethod,
    limit: 20,
    label: "Project Type",
    getName: (item) => item?.project_type,
    skipParam: "skipProjectType",
    searchKey: "projectType",
  },
  [FILTER_TYPES.ASSIGNEES]: {
    api: Service.getEmployees,
    method: Service.getMethod,
    limit: 20,
    label: "Assignees",
    getName: (item) => removeTitle(item?.full_name),
    skipParam: "skipAssignees",
    searchKey: "assignees",
  },
  [FILTER_TYPES.STATUS]: {
    api: Service.getProjectStatus,
    method: Service.postMethod,
    limit: 20,
    body: { isDropdown: true },
    label: "Status",
    getName: (item) => item?.title,
    skipParam: "skipStatus",
    searchKey: "status",
  },
};

// Filter menu items based on roles
const getMenuItems = (getRoles) => {
  const items = [
    {
      key: FILTER_TYPES.STATUS,
      label: FILTER_CONFIG[FILTER_TYPES.STATUS].label,
    },
    {
      key: FILTER_TYPES.TECHNOLOGY,
      label: FILTER_CONFIG[FILTER_TYPES.TECHNOLOGY].label,
    },
    {
      key: FILTER_TYPES.PROJECT_TYPE,
      label: FILTER_CONFIG[FILTER_TYPES.PROJECT_TYPE].label,
    },
    {
      key: FILTER_TYPES.ASSIGNEES,
      label: FILTER_CONFIG[FILTER_TYPES.ASSIGNEES].label,
    },
  ];
  if (getRoles(["Admin"])) {
    items.unshift(
      {
        key: FILTER_TYPES.ACCOUNT_MANAGER,
        label: FILTER_CONFIG[FILTER_TYPES.ACCOUNT_MANAGER].label,
      },
      {
        key: FILTER_TYPES.MANAGER,
        label: FILTER_CONFIG[FILTER_TYPES.MANAGER].label,
      }
    );
  }
  return items;
};

// FilterSection component
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
      scrollThreshold={0.9} // Increased to prevent premature fetches
    >
      {items.map((item) => (
        <div
          key={item._id || item.project_tech || item.project_type}
          className={`assignee-item ${
            selectedItems.includes(item._id) ? "selected" : ""
          }`}
        >
          <Checkbox
            checked={selectedItems.includes(item._id)}
            onChange={() => onSelect(item)}
          />
          <span>{config.getName(item)}</span>
        </div>
      ))}
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

const AssignProjectFilter = ({ getRoles, onFilterChange, selectedFilters: appliedFilters }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.STATUS);
  const [filterData, setFilterData] = useState({
    [FILTER_TYPES.ACCOUNT_MANAGER]: [],
    [FILTER_TYPES.MANAGER]: [],
    [FILTER_TYPES.TECHNOLOGY]: [],
    [FILTER_TYPES.PROJECT_TYPE]: [],
    [FILTER_TYPES.ASSIGNEES]: [],
    [FILTER_TYPES.STATUS]: [],
  });
  const [draftFilters, setDraftFilters] = useState(() =>
    normalizeSelectedFilters(appliedFilters || createDefaultSelectedFilters())
  );
  const [searchTerms, setSearchTerms] = useState({
    [FILTER_TYPES.ACCOUNT_MANAGER]: "",
    [FILTER_TYPES.MANAGER]: "",
    [FILTER_TYPES.TECHNOLOGY]: "",
    [FILTER_TYPES.PROJECT_TYPE]: "",
    [FILTER_TYPES.ASSIGNEES]: "",
    [FILTER_TYPES.STATUS]: "",
  });
  const [pagination, setPagination] = useState({
    [FILTER_TYPES.ACCOUNT_MANAGER]: {
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
    [FILTER_TYPES.TECHNOLOGY]: {
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
    [FILTER_TYPES.ASSIGNEES]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
    [FILTER_TYPES.STATUS]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
  });
  const [initialLoadComplete, setInitialLoadComplete] = useState({
    [FILTER_TYPES.ACCOUNT_MANAGER]: false,
    [FILTER_TYPES.MANAGER]: false,
    [FILTER_TYPES.TECHNOLOGY]: false,
    [FILTER_TYPES.PROJECT_TYPE]: false,
    [FILTER_TYPES.ASSIGNEES]: false,
    [FILTER_TYPES.STATUS]: false,
  });

  const canManageAdminOnlyFilters = useMemo(
    () => (typeof getRoles === "function" ? Boolean(getRoles(["Admin"])) : false),
    [getRoles]
  );

  const activeFiltersCount = useMemo(() => {
    return Object.values(draftFilters).reduce(
      (count, filters) => count + (filters.length > 0 ? 1 : 0),
      0
    );
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
        const apiUrl =
          config.method === Service.getMethod
            ? `${config.api}?page=${page}&limit=${config.limit}&search=${search}`
            : config.api;
        const body =
          config.method === Service.postMethod
            ? { ...config.body, pageNo: page, limit: config.limit, search }
            : {};

        const response = await Service.makeAPICall({
          methodName: config.method,
          api_url: apiUrl,
          body,
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
    Object.keys(FILTER_TYPES).forEach((key) => {
      functions[FILTER_TYPES[key]] = _.debounce((value) => {
        setPagination((prev) => ({
          ...prev,
          [FILTER_TYPES[key]]: {
            ...prev[FILTER_TYPES[key]],
            page: 1,
            hasMore: true,
          },
        }));
        setFilterData((prev) => ({ ...prev, [FILTER_TYPES[key]]: [] }));
        setInitialLoadComplete((prev) => ({
          ...prev,
          [FILTER_TYPES[key]]: false,
        }));
        fetchFilterData(FILTER_TYPES[key], 1, value, true);
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

  const resetFilter = useCallback((filterType) => {
    setDraftFilters((prev) => ({ ...prev, [filterType]: [] }));
    onFilterChange([FILTER_CONFIG[filterType].skipParam]);
  }, [onFilterChange]);

  const resetAllFilters = useCallback(() => {
    setDraftFilters(createDefaultSelectedFilters());
    onFilterChange(["skipAll"]);
    setIsPopoverOpen(false);
  }, [onFilterChange]);

  useEffect(() => {
    setDraftFilters(normalizeSelectedFilters(appliedFilters || createDefaultSelectedFilters()));
  }, [appliedFilters]);

  useEffect(() => {
    if (
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

  // Add this useEffect after your existing useEffects, around line 380
  useEffect(() => {
    if (activeFilter && initialLoadComplete[activeFilter]) {
      const selectedIds = draftFilters[activeFilter];
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
  }, [activeFilter, draftFilters, initialLoadComplete, isPopoverOpen]);

  useEffect(() => {
    return () => Object.values(debouncedSearch).forEach((fn) => fn.cancel());
  }, [debouncedSearch]);

  const renderFilterContent = () => {
    const config = FILTER_CONFIG[activeFilter];
    if (
      !config ||
      ((activeFilter === FILTER_TYPES.ACCOUNT_MANAGER ||
        activeFilter === FILTER_TYPES.MANAGER) &&
        !canManageAdminOnlyFilters)
    ) {
      return (
        <FilterSection
          config={FILTER_CONFIG[FILTER_TYPES.TECHNOLOGY]}
          items={filterData[FILTER_TYPES.TECHNOLOGY]}
          selectedItems={draftFilters[FILTER_TYPES.TECHNOLOGY]}
          pagination={pagination[FILTER_TYPES.TECHNOLOGY]}
          searchTerm={searchTerms[FILTER_TYPES.TECHNOLOGY]}
          onSearch={(value) => handleSearch(FILTER_TYPES.TECHNOLOGY, value)}
          onSelect={(item) =>
            handleFilterSelection(item, FILTER_TYPES.TECHNOLOGY)
          }
          onLoadMore={() => handleLoadMore(FILTER_TYPES.TECHNOLOGY)}
          onApply={() => {
            onFilterChange([], buildAppliedFiltersPayload(draftFilters, filterData));
            setIsPopoverOpen(false);
          }}
          onReset={() => resetFilter(FILTER_TYPES.TECHNOLOGY)}
          isInitialLoadComplete={initialLoadComplete[FILTER_TYPES.TECHNOLOGY]}
        />
      );
    }
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
          onFilterChange([], buildAppliedFiltersPayload(draftFilters, filterData));
          setIsPopoverOpen(false);
        }}
        onReset={() => resetFilter(activeFilter)}
        isInitialLoadComplete={initialLoadComplete[activeFilter]}
      />
    );
  };

  return (
    <div className="filter-container">
      <Popover
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
              {getMenuItems(getRoles).map((item) => (
                <div
                  key={item.key}
                  onClick={() =>
                    canManageAdminOnlyFilters ||
                    ![
                      FILTER_TYPES.ACCOUNT_MANAGER,
                      FILTER_TYPES.MANAGER,
                    ].includes(item.key)
                      ? setActiveFilter(item.key)
                      : null
                  }
                  className={`filter-menu-item ${
                    activeFilter === item.key ? "active" : ""
                  }`}
                >
                  <span>{item.label}</span>
                  {!isEmpty(draftFilters[item.key]) && (
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
        onOpenChange={(open) => {
          if (open) {
            setDraftFilters(normalizeSelectedFilters(appliedFilters || createDefaultSelectedFilters()));
          }
          setIsPopoverOpen(open);
        }}
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
