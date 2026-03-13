/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Button,
  Popover,
  Checkbox,
  Input,
  Badge,
  Divider,
  Spin,
  DatePicker,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import _ from "lodash";
import Service from "../../service";
import moment from "moment";
import dayjs from "dayjs";

const { Search } = Input;

// Filter types
const FILTER_TYPES = {
  DATE_RANGE: "dateRange",
  GROUP_BY: "groupBy",
  PROJECT: "project",
  ORDER_BY: "orderBy",
};

// Filter configuration
const FILTER_CONFIG = {
  [FILTER_TYPES.DATE_RANGE]: {
    label: "Date Range",
    skipParam: "skipDateRange",
    options: [
      { value: "all", label: "All" },
      { value: "this_month", label: "This Month" },
      { value: "last_week", label: "Last Week" },
      { value: "last_2_week", label: "Last 2 Weeks" },
      { value: "last_month", label: "Last Month" },
      { value: "Custom", label: "Custom" },
    ],
    renderItem: (
      item,
      handleSelect,
      selectedItems,
      customDates,
      setCustomDates
    ) => (
      <div key={item.value} className="assignee-item">
        <Checkbox
          checked={selectedItems.includes(item.value)}
          onChange={() => handleSelect(item, FILTER_TYPES.DATE_RANGE)}
        />
        <span>{item.label}</span>
        {item.value === "Custom" && selectedItems.includes("Custom") && (
          <div
            className="logtime-date-wrapper"
            style={{
              marginTop: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div className="logtime-date">
              <label>Start</label>
              <DatePicker
                value={
                  customDates.start_date
                    ? dayjs(customDates.start_date, "YYYY-MM-DD")
                    : null
                }
                onChange={(date, dateString) =>
                  setCustomDates({ ...customDates, start_date: dateString })
                }
              />
            </div>
            <div className="logtime-date">
              <label>End</label>
              <DatePicker
                value={
                  customDates.end_date
                    ? dayjs(customDates.end_date, "YYYY-MM-DD")
                    : null
                }
                onChange={(date, dateString) =>
                  setCustomDates({ ...customDates, end_date: dateString })
                }
              />
            </div>
          </div>
        )}
      </div>
    ),
  },
  [FILTER_TYPES.GROUP_BY]: {
    label: "Group By",
    skipParam: "skipGroupBy",
    options: [
      { value: "date", label: "Date" },
      { value: "project", label: "Project" },
    ],
    renderItem: (item, handleSelect, selectedItems) => (
      <div key={item.value} className="assignee-item">
        <Checkbox
          checked={selectedItems.includes(item.value)}
          onChange={() => handleSelect(item, FILTER_TYPES.GROUP_BY)}
        />
        <span>{item.label}</span>
      </div>
    ),
  },
  [FILTER_TYPES.PROJECT]: {
    api: Service.getProjectListing,
    method: Service.postMethod,
    limit: 20,
    label: "Project",
    getName: (item) => item.project_type,
    skipParam: "skipProject",
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
          onChange={() => handleSelect(item, FILTER_TYPES.PROJECT)}
        />
        <span>{item.project_type}</span>
      </div>
    ),
    requestBody: { isDropdown: false },
  },
  [FILTER_TYPES.ORDER_BY]: {
    label: "Order By",
    skipParam: "skipOrderBy",
    options: [
      { value: "asc", label: "Ascending" },
      { value: "desc", label: "Descending" },
    ],
    renderItem: (item, handleSelect, selectedItems) => (
      <div key={item.value} className="assignee-item">
        <Checkbox
          checked={selectedItems.includes(item.value)}
          onChange={() => handleSelect(item, FILTER_TYPES.ORDER_BY)}
        />
        <span>{item.label}</span>
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
  customDates,
  setCustomDates,
}) => (
  <div className="filter-content-inner">
    <h4 className="filter-title">{config.label}</h4>
    {config.api && (
      <div className="filter-search">
        <Search
          placeholder={`Search ${config.label.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          size="small"
          loading={pagination?.loading && pagination?.page === 1}
        />
      </div>
    )}
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
      {items.map((item) =>
        config.renderItem(
          item,
          onSelect,
          selectedItems,
          customDates,
          setCustomDates
        )
      )}
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

const defaultFilters = {
  [FILTER_TYPES.DATE_RANGE]: ["this_month"],
  [FILTER_TYPES.GROUP_BY]: ["date"],
  [FILTER_TYPES.PROJECT]: ["all"],
  [FILTER_TYPES.ORDER_BY]: ["desc"],
};

const MyLoggedTimeFilterComponent = ({ onFilterChange }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.DATE_RANGE);
  const [filterData, setFilterData] = useState({
    [FILTER_TYPES.DATE_RANGE]: FILTER_CONFIG[FILTER_TYPES.DATE_RANGE].options,
    [FILTER_TYPES.GROUP_BY]: FILTER_CONFIG[FILTER_TYPES.GROUP_BY].options,
    [FILTER_TYPES.PROJECT]: [],
    [FILTER_TYPES.ORDER_BY]: FILTER_CONFIG[FILTER_TYPES.ORDER_BY].options,
  });
  const [selectedFilters, setSelectedFilters] = useState(defaultFilters);
  const [searchTerms, setSearchTerms] = useState({
    [FILTER_TYPES.PROJECT]: "",
  });
  const [pagination, setPagination] = useState({
    [FILTER_TYPES.PROJECT]: {
      page: 1,
      limit: 20,
      hasMore: true,
      loading: false,
      total: 0,
    },
  });
  const [initialLoadComplete, setInitialLoadComplete] = useState({
    [FILTER_TYPES.PROJECT]: false,
  });
  const [customDates, setCustomDates] = useState({
    start_date: moment().startOf("month").format("YYYY-MM-DD"),
    end_date: moment().endOf("month").format("YYYY-MM-DD"),
  });

  const activeFiltersCount = useMemo(() => {
    return Object.entries(selectedFilters).reduce(
      (count, [filterType, value]) => {
        const isDefault = _.isEqual(value, defaultFilters[filterType]);
        return (
          count +
          (Array.isArray(value) && value.length > 0 && !isDefault ? 1 : 0)
        );
      },
      0
    );
  }, [selectedFilters]);

  const fetchFilterData = useCallback(
    async (filterType, page = 1, search = "", reset = false) => {
      const config = FILTER_CONFIG[filterType];
      if (
        !config.api ||
        pagination[filterType].loading ||
        (!reset && !pagination[filterType].hasMore)
      )
        return;

      setPagination((prev) => ({
        ...prev,
        [filterType]: { ...prev[filterType], loading: true },
      }));

      try {
        const reqBody = {
          pageNo: page,
          limit: config.limit,
          search,
          ...config.requestBody,
        };
        const response = await Service.makeAPICall({
          methodName: config.method,
          api_url: config.api,
          body: reqBody,
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
    return {
      [FILTER_TYPES.PROJECT]: _.debounce((value) => {
        setPagination((prev) => ({
          ...prev,
          [FILTER_TYPES.PROJECT]: {
            ...prev[FILTER_TYPES.PROJECT],
            page: 1,
            hasMore: true,
          },
        }));
        setFilterData((prev) => ({ ...prev, [FILTER_TYPES.PROJECT]: [] }));
        setInitialLoadComplete((prev) => ({
          ...prev,
          [FILTER_TYPES.PROJECT]: false,
        }));
        fetchFilterData(FILTER_TYPES.PROJECT, 1, value, true);
      }, 300),
    };
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
      if (filterType === FILTER_TYPES.PROJECT) {
        return { ...prev, [filterType]: [item._id] };
      }
      return { ...prev, [filterType]: [item.value] };
    });
  }, []);

  const resetFilter = useCallback(
    (filterType) => {
      const defaultValues = {
        [FILTER_TYPES.DATE_RANGE]: ["this_month"],
        [FILTER_TYPES.GROUP_BY]: ["date"],
        [FILTER_TYPES.PROJECT]: ["all"],
        [FILTER_TYPES.ORDER_BY]: ["desc"],
      };
      setSelectedFilters((prev) => ({
        ...prev,
        [filterType]: defaultValues[filterType],
      }));
      setSearchTerms((prev) => ({ ...prev, [filterType]: "" }));
      if (filterType === FILTER_TYPES.DATE_RANGE) {
        setCustomDates({
          start_date: moment().startOf("month").format("YYYY-MM-DD"),
          end_date: moment().endOf("month").format("YYYY-MM-DD"),
        });
      }
      onFilterChange([FILTER_CONFIG[filterType].skipParam]);
    },
    [onFilterChange]
  );

  const resetAllFilters = useCallback(() => {
    setSelectedFilters({
      [FILTER_TYPES.DATE_RANGE]: ["this_month"],
      [FILTER_TYPES.GROUP_BY]: ["date"],
      [FILTER_TYPES.PROJECT]: ["all"],
      [FILTER_TYPES.ORDER_BY]: ["desc"],
    });
    setSearchTerms({ [FILTER_TYPES.PROJECT]: "" });
    setCustomDates({
      start_date: moment().startOf("month").format("YYYY-MM-DD"),
      end_date: moment().endOf("month").format("YYYY-MM-DD"),
    });
    onFilterChange(["skipAll"]);
    setIsPopoverOpen(false);
  }, [onFilterChange]);

  useEffect(() => {
    if (
      activeFilter === FILTER_TYPES.PROJECT &&
      filterData[FILTER_TYPES.PROJECT].length === 0 &&
      !pagination[FILTER_TYPES.PROJECT].loading &&
      pagination[FILTER_TYPES.PROJECT].hasMore &&
      !initialLoadComplete[FILTER_TYPES.PROJECT]
    ) {
      fetchFilterData(FILTER_TYPES.PROJECT, 1, "", true);
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
      if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
        setFilterData((prev) => {
          const items = [...prev[activeFilter]];
          const selectedItems = [];
          const unselectedItems = [];

          // Separate selected and unselected items
          items.forEach((item) => {
            const itemId = item._id || item.value; // Handle both API items and static options
            if (selectedIds.includes(itemId)) {
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
          onFilterChange([], { ...selectedFilters, customDates });
          setIsPopoverOpen(false);
        }}
        onReset={() => resetFilter(activeFilter)}
        isInitialLoadComplete={initialLoadComplete[activeFilter]}
        customDates={customDates}
        setCustomDates={setCustomDates}
      />
    );
  };

  const shouldShowBadge = (key, value) => {
    return JSON.stringify(value) !== JSON.stringify(defaultFilters[key]);
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
            style={{ padding: "8px 12px", cursor: "pointer" }}
          >
            <span>{item.label}</span>
            {shouldShowBadge(item.key, selectedFilters[item.key]) && (
              <Badge size="small" color="#1890ff" />
            )}
          </div>
        ))}
      </div>
      <div className="filter-content" style={{ padding: "16px", flex: 1 }}>
        {renderFilterContent()}
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

export default React.memo(MyLoggedTimeFilterComponent);
