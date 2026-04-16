import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button, Popover, Checkbox, Radio, Input, Badge, Divider, Spin } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import _ from "lodash";
import "../../../assets/css/FilterUI.css";
import Service from "../../../service";
import { removeTitle } from "../../../util/nameFilter";

const { Search } = Input;

const FILTER_TYPES = {
  STATUS: "status",
  MANAGER: "manager",
  TECHNOLOGY: "technology",
  PROJECT_TYPE: "project_type",
  ASSIGNEES: "assignees",
  SORT_BY: "sort_by",
};

const FILTER_CONFIG = {
  [FILTER_TYPES.STATUS]: {
    api: Service.getProjectStatus,
    method: Service.postMethod,
    limit: 20,
    label: "Status",
    getName: (item) => item.title,
    skipParam: "skipStatus",
    searchKey: "status",
    body: { isDropdown: false },
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
    label: "Technology",
    getName: (item) => item.project_tech,
    skipParam: "skipTechnology",
    searchKey: "technology",
    body: { sortBy: "desc", isDropdown: true },
  },
  [FILTER_TYPES.PROJECT_TYPE]: {
    api: Service.getProjectListing,
    method: Service.postMethod,
    limit: 20,
    label: "Category",
    getName: (item) => item.project_type,
    skipParam: "skipProjectType",
    searchKey: "project_type",
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
  [FILTER_TYPES.SORT_BY]: {
    label: "Sort By",
    options: [
      { value: "createdAt", label: "Latest Updated" },
      { value: "title", label: "Name" },
      { value: "project_type", label: "Category" },
    ],
  },
};

const getMenuItems = (getRoles) => {
  const items = [
    { key: FILTER_TYPES.STATUS, label: FILTER_CONFIG[FILTER_TYPES.STATUS].label },
    { key: FILTER_TYPES.TECHNOLOGY, label: FILTER_CONFIG[FILTER_TYPES.TECHNOLOGY].label },
    { key: FILTER_TYPES.PROJECT_TYPE, label: FILTER_CONFIG[FILTER_TYPES.PROJECT_TYPE].label },
    { key: FILTER_TYPES.ASSIGNEES, label: FILTER_CONFIG[FILTER_TYPES.ASSIGNEES].label },
    { key: FILTER_TYPES.SORT_BY, label: FILTER_CONFIG[FILTER_TYPES.SORT_BY].label },
  ];
  if (getRoles(["Admin"])) {
    items.splice(1, 0, {
      key: FILTER_TYPES.MANAGER,
      label: FILTER_CONFIG[FILTER_TYPES.MANAGER].label,
    });
  }
  return items;
};

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
    {config.searchKey && (
      <div className="filter-search">
        <Search
          placeholder={`Search ${config.label.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          size="small"
          loading={pagination.loading && pagination.page === 1}
        />
      </div>
    )}
    <InfiniteScroll
      dataLength={items.length}
      next={onLoadMore}
      hasMore={isInitialLoadComplete && pagination.hasMore}
      loader={
        pagination.loading && pagination.page > 1 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "16px 0", alignItems: "center" }}>
            <Spin size="small"  margin={{margin:0}} />
            <span style={{ marginLeft: "8px", fontSize: "12px", color: "#666" }}>Loading more...</span>
          </div>
        ) : null
      }
      height={180}
      style={{ paddingRight: "8px" }}
      scrollThreshold={0.9}
    >
      {items.map((item) => (
        <div
          key={item._id || item.project_tech || item.project_type}
          className={`assignee-item ${selectedItems.includes(item._id) ? "selected" : ""}`}
        >
          <Checkbox
            checked={selectedItems.includes(item._id)}
            onChange={() => onSelect(item)}
          />
          <span>{config.getName(item)}</span>
        </div>
      ))}
      {items.length === 0 && !pagination.loading && (
        <div style={{ textAlign: "center", padding: "16px 0", fontSize: "12px", color: "#999" }}>
          {searchTerm ? "No items found" : "No items available"}
        </div>
      )}
    </InfiniteScroll>
    <div className="filter-actions">
      <Button type="primary" onClick={onApply} size="small" className="filter-btn">
        Apply Filter
      </Button>
      <Button onClick={onReset} size="small" className="delete-btn">
        Reset
      </Button>
    </div>
  </div>
);

const SortBySection = ({ sortOption, onSelect, onApply, onReset }) => (
  <div className="filter-content-inner">
    <h4 className="filter-title">Sort By</h4>
    <div className="filter-options">
      <Radio.Group
        onChange={(e) => onSelect(e.target.value)}
        value={sortOption}
      >
        {FILTER_CONFIG[FILTER_TYPES.SORT_BY].options.map(({ value, label }) => (
          <div key={value} className="radio-option">
            <Radio value={value}>{label}</Radio>
          </div>
        ))}
      </Radio.Group>
    </div>
    <div className="filter-actions">
      <Button onClick={onApply} size="small" className="filter-btn">
        Apply Sort
      </Button>
      <Button onClick={onReset} size="small" className="delete-btn">
        Reset
      </Button>
    </div>
  </div>
);

const ProjectArchivedFilterComponent = ({ getRoles, onFilterChange }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.STATUS);
  const [filterData, setFilterData] = useState({
    [FILTER_TYPES.STATUS]: [],
    [FILTER_TYPES.MANAGER]: [],
    [FILTER_TYPES.TECHNOLOGY]: [],
    [FILTER_TYPES.PROJECT_TYPE]: [],
    [FILTER_TYPES.ASSIGNEES]: [],
    [FILTER_TYPES.SORT_BY]: [],
  });
  const [selectedFilters, setSelectedFilters] = useState({
    [FILTER_TYPES.STATUS]: [],
    [FILTER_TYPES.MANAGER]: [],
    [FILTER_TYPES.TECHNOLOGY]: [],
    [FILTER_TYPES.PROJECT_TYPE]: [],
    [FILTER_TYPES.ASSIGNEES]: [],
    [FILTER_TYPES.SORT_BY]: "createdAt",
  });
  const [searchTerms, setSearchTerms] = useState({
    [FILTER_TYPES.STATUS]: "",
    [FILTER_TYPES.MANAGER]: "",
    [FILTER_TYPES.TECHNOLOGY]: "",
    [FILTER_TYPES.PROJECT_TYPE]: "",
    [FILTER_TYPES.ASSIGNEES]: "",
  });
  const [pagination, setPagination] = useState({
    [FILTER_TYPES.STATUS]: { page: 1, limit: 20, hasMore: true, loading: false, total: 0 },
    [FILTER_TYPES.MANAGER]: { page: 1, limit: 20, hasMore: true, loading: false, total: 0 },
    [FILTER_TYPES.TECHNOLOGY]: { page: 1, limit: 20, hasMore: true, loading: false, total: 0 },
    [FILTER_TYPES.PROJECT_TYPE]: { page: 1, limit: 20, hasMore: true, loading: false, total: 0 },
    [FILTER_TYPES.ASSIGNEES]: { page: 1, limit: 20, hasMore: true, loading: false, total: 0 },
  });
  const [initialLoadComplete, setInitialLoadComplete] = useState({
    [FILTER_TYPES.STATUS]: false,
    [FILTER_TYPES.MANAGER]: false,
    [FILTER_TYPES.TECHNOLOGY]: false,
    [FILTER_TYPES.PROJECT_TYPE]: false,
    [FILTER_TYPES.ASSIGNEES]: false,
  });

  const activeFiltersCount = useMemo(() => {
    return Object.entries(selectedFilters).reduce((count, [key, value]) => {
      if (key === FILTER_TYPES.SORT_BY) {
        return count + (value !== "createdAt" ? 1 : 0);
      }
      return count + (value.length > 0 ? 1 : 0);
    }, 0);
  }, [selectedFilters]);

  const fetchFilterData = useCallback(
    async (filterType, page = 1, search = "", reset = false) => {
      const config = FILTER_CONFIG[filterType];
      if (!config || pagination[filterType].loading || (!reset && !pagination[filterType].hasMore)) {
        return;
      }

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
        const metadata = response?.data?.metadata || { total: newData.length, totalPages: 1 };

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
            hasMore: newData.length > 0 && page < (metadata.totalPages || 1) && newData.length >= config.limit,
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
      if (key !== FILTER_TYPES.SORT_BY) {
        functions[FILTER_TYPES[key]] = _.debounce((value) => {
          setPagination((prev) => ({
            ...prev,
            [FILTER_TYPES[key]]: { ...prev[FILTER_TYPES[key]], page: 1, hasMore: true },
          }));
          setFilterData((prev) => ({ ...prev, [FILTER_TYPES[key]]: [] }));
          setInitialLoadComplete((prev) => ({ ...prev, [FILTER_TYPES[key]]: false }));
          fetchFilterData(FILTER_TYPES[key], 1, value, true);
        }, 300);
      }
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
          [filterType]: { ...prev[filterType], page: 1, hasMore: true, loading: false },
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
      if (pagination[filterType].hasMore && !pagination[filterType].loading && initialLoadComplete[filterType]) {
        fetchFilterData(filterType, pagination[filterType].page + 1, searchTerms[filterType], false);
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

  const handleSortSelection = useCallback((value) => {
    setSelectedFilters((prev) => ({ ...prev, [FILTER_TYPES.SORT_BY]: value }));
  }, []);

  const resetFilter = useCallback((filterType) => {
    setSelectedFilters((prev) => ({ ...prev, [filterType]: filterType === FILTER_TYPES.SORT_BY ? "createdAt" : [] }));
    if (filterType !== FILTER_TYPES.SORT_BY) {
      onFilterChange([FILTER_CONFIG[filterType].skipParam]);
    } else {
      onFilterChange([], { ...selectedFilters, [FILTER_TYPES.SORT_BY]: "createdAt" });
    }
  }, [onFilterChange, selectedFilters]);

  const resetAllFilters = useCallback(() => {
    setSelectedFilters({
      [FILTER_TYPES.STATUS]: [],
      [FILTER_TYPES.MANAGER]: [],
      [FILTER_TYPES.TECHNOLOGY]: [],
      [FILTER_TYPES.PROJECT_TYPE]: [],
      [FILTER_TYPES.ASSIGNEES]: [],
      [FILTER_TYPES.SORT_BY]: "createdAt",
    });
    onFilterChange(["skipAll"]);
  }, [onFilterChange]);

  useEffect(() => {
    if (
      filterData[activeFilter].length === 0 &&
      !pagination[activeFilter]?.loading &&
      pagination[activeFilter]?.hasMore &&
      !initialLoadComplete[activeFilter] &&
      activeFilter !== FILTER_TYPES.SORT_BY
    ) {
      fetchFilterData(activeFilter, 1, "", true);
    }
  }, [activeFilter, filterData, pagination, fetchFilterData, initialLoadComplete]);

  // Add this useEffect to move selected items to top when switching filters
  useEffect(() => {
    if (
      activeFilter &&
      initialLoadComplete[activeFilter] &&
      activeFilter !== FILTER_TYPES.SORT_BY
    ) {
      const selectedIds = selectedFilters[activeFilter];
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
  }, [activeFilter, initialLoadComplete, isPopoverOpen]);

  useEffect(() => {
    return () => Object.values(debouncedSearch).forEach((fn) => fn.cancel());
  }, [debouncedSearch]);

  const renderFilterContent = () => {
    if (activeFilter === FILTER_TYPES.SORT_BY) {
      return (
        <SortBySection
          sortOption={selectedFilters[FILTER_TYPES.SORT_BY]}
          onSelect={handleSortSelection}
          onApply={() => {
            onFilterChange([], selectedFilters);
            setIsPopoverOpen(false);
          }}
          onReset={() => resetFilter(FILTER_TYPES.SORT_BY)}
        />
      );
    }

    const config = FILTER_CONFIG[activeFilter];
    if (
      !config ||
      (activeFilter === FILTER_TYPES.MANAGER && !getRoles(["Admin"]))
    ) {
      return (
        <FilterSection
          config={FILTER_CONFIG[FILTER_TYPES.STATUS]}
          items={filterData[FILTER_TYPES.STATUS] || []}
          selectedItems={selectedFilters[FILTER_TYPES.STATUS]}
          pagination={pagination[FILTER_TYPES.STATUS]}
          searchTerm={searchTerms[FILTER_TYPES.STATUS]}
          onSearch={(value) => handleSearch(FILTER_TYPES.STATUS, value)}
          onSelect={(item) => handleFilterSelection(item, FILTER_TYPES.STATUS)}
          onLoadMore={() => handleLoadMore(FILTER_TYPES.STATUS)}
          onApply={() => {
            onFilterChange([], selectedFilters);
            setIsPopoverOpen(false);
          }}
          onReset={() => resetFilter(FILTER_TYPES.STATUS)}
          isInitialLoadComplete={initialLoadComplete[FILTER_TYPES.STATUS]}
        />
      );
    }

    return (
      <FilterSection
        config={config}
        items={filterData[activeFilter] || []}
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

  return (
    <div className="filter-container">
      <Popover
        content={
          <div className="filter-popover-content">
            <div className="filter-sidebar">
              <div className="filter-header">
                <h4 className="filter-sidebar-title">Filters & Sort</h4>
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
                    getRoles(["Admin"]) ||
                    item.key !== FILTER_TYPES.MANAGER
                      ? setActiveFilter(item.key)
                      : null
                  }
                  className={`filter-menu-item ${activeFilter === item.key ? "active" : ""}`}
                >
                  <span>{item.label}</span>
                  {(item.key === FILTER_TYPES.SORT_BY
                    ? selectedFilters[item.key] !== "createdAt"
                    : !_.isEmpty(selectedFilters[item.key])) && (
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
        <Button type="primary" icon={<FilterOutlined />} className="filter-btn">
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

export default ProjectArchivedFilterComponent;