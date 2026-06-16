/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button, Popover, Radio, Input, Badge, Divider, Spin } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import _ from "lodash";
import "../../assets/css/FilterUI.css";
import Service from "../../service";

const { Search } = Input;

// Filter types
const FILTER_TYPES = {
  CLIENTS: "clients",
  STATUS: "status",
};

// Status options (static data)
const STATUS_OPTIONS = [
  { _id: "Active", value: "Active", label: "Active" },
  { _id: "Not Active", value: "Not Active", label: "Not Active" },
];

// API and pagination config
const FILTER_CONFIG = {
  [FILTER_TYPES.CLIENTS]: {
    api: Service.getclient,
    method: Service.postMethod,
    limit: 20,
    body: { isDropdown: false },
    label: "Clients",
    getName: (item) => item?.full_name,
    getValue: (item) => item?._id,
    searchKey: "search",
  },
  [FILTER_TYPES.STATUS]: {
    api: null, // Static data
    method: null,
    limit: 20,
    label: "Status",
    getName: (item) => item?.label,
    getValue: (item) => item?.value,
    searchKey: "search",
    staticData: STATUS_OPTIONS,
  },
};

// Filter menu items
const FILTER_MENU_ITEMS = [
  { key: FILTER_TYPES.CLIENTS, label: "Clients" },
  { key: FILTER_TYPES.STATUS, label: "Status" },
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
  isStaticData = false,
}) => (
  <div className="filter-content-inner">
    <h4 className="filter-title">{config.label}</h4>

    {/* Only show search for non-static data or if static data has many items */}
    {(!isStaticData || items.length > 5) && (
      <div className="filter-search">
        <Search
          placeholder={`Search ${config.label.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          size="small"
          loading={!isStaticData && pagination.loading && pagination.page === 1}
        />
      </div>
    )}

    {isStaticData ? (
      // Static data rendering (no infinite scroll needed)
      <div className="filter-options">
        <Radio.Group onChange={onSelect} value={selectedValue || ""}>
          {items.map((item) => (
            <div key={item._id || item.value} className="radio-option">
              <Radio value={config.getValue(item)}>
                <span style={{ textTransform: "capitalize" }}>
                  {config.getName(item)}
                </span>
              </Radio>
            </div>
          ))}
        </Radio.Group>
      </div>
    ) : (
      // Dynamic data with infinite scroll
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
        {/* <div className="filter-options"> */}
          <Radio.Group onChange={onSelect} value={selectedValue || ""}>
            {items.map((item) => (
              <div key={item._id || item.full_name} className="radio-option">
                <Radio value={config.getValue(item)}>
                  <span style={{ textTransform: "capitalize" }}>
                    {config.getName(item)}
                  </span>
                </Radio>
              </div>
            ))}
          </Radio.Group>
        {/* </div> */}
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
    )}

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

const ClientFilterComponent = ({ onFilterChange }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.CLIENTS);

  // Filter data for each type
  const [filterData, setFilterData] = useState({
    [FILTER_TYPES.CLIENTS]: [],
    [FILTER_TYPES.STATUS]: STATUS_OPTIONS, // Pre-populate static data
  });

  // Selected filters - single selection for radio buttons
  const [selectedFilters, setSelectedFilters] = useState({
    [FILTER_TYPES.CLIENTS]: "",
    [FILTER_TYPES.STATUS]: "",
  });

  // Search terms
  const [searchTerms, setSearchTerms] = useState({
    [FILTER_TYPES.CLIENTS]: "",
    [FILTER_TYPES.STATUS]: "",
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    [FILTER_TYPES.CLIENTS]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
    [FILTER_TYPES.STATUS]: {
      page: 1,
      limit: 20,
      hasMore: false, // Static data doesn't need pagination
      loading: false,
      total: STATUS_OPTIONS.length,
    },
  });

  // Initial load complete tracking
  const [initialLoadComplete, setInitialLoadComplete] = useState({
    [FILTER_TYPES.CLIENTS]: false,
    [FILTER_TYPES.STATUS]: true, // Static data is always "loaded"
  });

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.values(selectedFilters).filter(
      (value) => value && value !== ""
    ).length;
  }, [selectedFilters]);

  // Fetch filter data function
  const fetchFilterData = useCallback(
    async (filterType, page = 1, search = "", reset = false) => {
      const config = FILTER_CONFIG[filterType];

      // Handle static data (STATUS)
      if (config.staticData) {
        const filteredStaticData = search
          ? config.staticData.filter((item) =>
              config.getName(item).toLowerCase().includes(search.toLowerCase())
            )
          : config.staticData;

        setFilterData((prev) => ({
          ...prev,
          [filterType]: filteredStaticData,
        }));
        return;
      }

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
        const body = {
          ...config.body,
          pageNo: page,
          limit: config.limit,
          search,
        };

        const response = await Service.makeAPICall({
          methodName: config.method,
          api_url: config.api,
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

  // Debounced search functions
  const debouncedSearch = useMemo(() => {
    const functions = {};
    Object.keys(FILTER_TYPES).forEach((key) => {
      functions[FILTER_TYPES[key]] = _.debounce((value) => {
        if (FILTER_CONFIG[FILTER_TYPES[key]].staticData) {
          // Handle static data search immediately
          fetchFilterData(FILTER_TYPES[key], 1, value, true);
        } else {
          // Handle API data search
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
        }
      }, 300);
    });
    return functions;
  }, [fetchFilterData]);

  // Handle search
  const handleSearch = useCallback(
    (filterType, rawValue) => {
      const value = rawValue ?? "";
      const trimmed = value.trim();

      setSearchTerms((prev) => ({ ...prev, [filterType]: value }));

      const debouncedFn = debouncedSearch[filterType];
      debouncedFn.cancel?.();

      if (FILTER_CONFIG[filterType].staticData) {
        // For static data, search immediately
        debouncedFn(trimmed);
      } else {
        // For API data
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
      }
    },
    [debouncedSearch, fetchFilterData]
  );

  // Handle load more
  const handleLoadMore = useCallback(
    (filterType) => {
      if (
        pagination[filterType].hasMore &&
        !pagination[filterType].loading &&
        initialLoadComplete[filterType] &&
        !FILTER_CONFIG[filterType].staticData
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

  // Handle filter selection
  const handleFilterSelection = useCallback((filterType, e) => {
    const value = e.target.value;
    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  }, []);

  // Reset single filter
  const resetFilter = useCallback((filterType) => {
    const updatedFilters = {
      ...selectedFilters,
      [filterType]: "",
    };
    
    setSelectedFilters(updatedFilters);
    
    // Convert to the format expected by parent component and pass to onFilterChange
    const filterValues = {
      client: updatedFilters[FILTER_TYPES.CLIENTS],
      status: updatedFilters[FILTER_TYPES.STATUS],
    };
    onFilterChange(filterValues);
  }, [selectedFilters, onFilterChange]);

  // Reset all filters
  const resetAllFilters = useCallback(() => {
    const clearedFilters = {
      [FILTER_TYPES.CLIENTS]: "",
      [FILTER_TYPES.STATUS]: "",
    };
    
    setSelectedFilters(clearedFilters);
    
    setSearchTerms({
      [FILTER_TYPES.CLIENTS]: "",
      [FILTER_TYPES.STATUS]: "",
    });
    
    // Convert to the format expected by parent component and pass to onFilterChange
    const filterValues = {
      client: clearedFilters[FILTER_TYPES.CLIENTS],
      status: clearedFilters[FILTER_TYPES.STATUS],
    };
    onFilterChange(filterValues);
    
    setIsPopoverOpen(false);
  }, [onFilterChange]);

  // Apply filters
  const applyFilters = useCallback(() => {
    const filterValues = {
      client: selectedFilters[FILTER_TYPES.CLIENTS],
      status: selectedFilters[FILTER_TYPES.STATUS],
    };
    onFilterChange(filterValues);
    setIsPopoverOpen(false);
  }, [selectedFilters, onFilterChange]);

  // Load initial data when filter becomes active
  useEffect(() => {
    if (
      filterData[activeFilter].length === 0 &&
      !pagination[activeFilter].loading &&
      pagination[activeFilter].hasMore &&
      !initialLoadComplete[activeFilter] &&
      !FILTER_CONFIG[activeFilter].staticData
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

  // Reorder selected item to top when switching filters
  useEffect(() => {
    if (activeFilter && initialLoadComplete[activeFilter]) {
      const selectedValue = selectedFilters[activeFilter];
      if (selectedValue) {
        setFilterData((prev) => {
          const items = [...prev[activeFilter]];
          const config = FILTER_CONFIG[activeFilter];
          const selectedIndex = items.findIndex(
            (item) => config.getValue(item) === selectedValue
          );
          if (selectedIndex !== -1) {
            const selectedItem = items[selectedIndex];
            items.splice(selectedIndex, 1);
            items.unshift(selectedItem);
            return { ...prev, [activeFilter]: items };
          }
          return prev;
        });
      }
    }
  }, [activeFilter, initialLoadComplete,isPopoverOpen]);

  // Cleanup debounced functions
  useEffect(() => {
    return () => Object.values(debouncedSearch).forEach((fn) => fn.cancel());
  }, [debouncedSearch]);

  // Filter items based on search term
  const getFilteredItems = useCallback(
    (filterType) => {
      const items = filterData[filterType];
      const searchTerm = searchTerms[filterType];

      if (!searchTerm || FILTER_CONFIG[filterType].staticData) {
        return items;
      }

      return items.filter((item) =>
        FILTER_CONFIG[filterType]
          .getName(item)
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    },
    [filterData, searchTerms]
  );

  // Render filter content
  const renderFilterContent = () => {
    const config = FILTER_CONFIG[activeFilter];
    if (!config) return null;

    const isStaticData = !!config.staticData;
    const filteredItems = getFilteredItems(activeFilter);

    return (
      <FilterSection
        config={config}
        items={filteredItems}
        selectedValue={selectedFilters[activeFilter]}
        pagination={pagination[activeFilter]}
        searchTerm={searchTerms[activeFilter]}
        onSearch={(value) => handleSearch(activeFilter, value)}
        onSelect={(e) => handleFilterSelection(activeFilter, e)}
        onLoadMore={() => handleLoadMore(activeFilter)}
        onApply={applyFilters}
        onReset={() => resetFilter(activeFilter)}
        isInitialLoadComplete={initialLoadComplete[activeFilter]}
        isStaticData={isStaticData}
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

export default ClientFilterComponent;