/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Button,
  Radio,
  Input,
  Badge,
  Divider,
  Spin,
  DatePicker,
  Popover,
} from "antd";
import { FilterOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import _ from "lodash";
import moment from "moment";
import "../../assets/css/FilterUI.css";
import Service from "../../service";

const { Search } = Input;
const { RangePicker } = DatePicker;

const FILTER_TYPES = {
  STATUS: "status",
  PROJECT: "project",
  DATE: "date",
};

const FILTER_CONFIG = {
  [FILTER_TYPES.STATUS]: {
    api: null,
    label: "Status",
    skipParam: "skipStatus",
    renderItem: (item, handleSelect, selectedItem) => (
      <div
        key={item.value}
        className={`assignee-item ${
          selectedItem === item.value ? "selected" : ""
        }`}
      >
        <Radio
          checked={selectedItem === item.value}
          onChange={() => handleSelect(item)}
        />
        <span>{item.label}</span>
      </div>
    ),
    items: [
      { value: "all", label: "All" },
      { value: "completed", label: "Completed" },
      { value: "incompleted", label: "Incompleted" },
    ],
  },
  [FILTER_TYPES.PROJECT]: {
    api: Service.getProjectList,
    method: Service.getMethod,
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
        <Radio
          checked={selectedItems.includes(item._id)}
          onChange={() => handleSelect(item)}
        />
        <span>{item.title}</span>
      </div>
    ),
  },
  [FILTER_TYPES.DATE]: {
    label: "Date Range",
    skipParam: "skipDate",
    renderItem: (item, handleSelect, selectedItem) => (
      <div className="filter-date-range">
        <RangePicker
          value={[selectedItem.startDate, selectedItem.endDate]}
          onChange={(dates) =>
            handleSelect({ startDate: dates?.[0], endDate: dates?.[1] })
          }
        />
      </div>
    ),
  },
};

const createFilterMenuItems = () => {
  return Object.entries(FILTER_CONFIG).map(([key, config]) => ({
    key,
    label: config.label,
  }));
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
          loading={pagination?.loading && pagination?.page === 1}
        />
      </div>
    )}
    {config.api ? (
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
    ) : (
      <div style={{ padding: "8px 0" }}>
        {config.items
          ? config.items.map((item) =>
              config.renderItem(item, onSelect, selectedItems)
            )
          : config.renderItem(null, onSelect, selectedItems)}
      </div>
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

const TaskFilterComponent = ({ onFilterChange }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.STATUS);
  const [filterData, setFilterData] = useState({
    [FILTER_TYPES.PROJECT]: [],
  });
  const [selectedFilters, setSelectedFilters] = useState({
    [FILTER_TYPES.STATUS]: "all",
    [FILTER_TYPES.PROJECT]: [],
    [FILTER_TYPES.DATE]: { startDate: null, endDate: null },
  });
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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedFilters.status !== "all") count++;
    if (selectedFilters.project.length > 0) count++;
    if (selectedFilters.date.startDate || selectedFilters.date.endDate) count++;
    return count;
  }, [selectedFilters]);

  const fetchFilterData = useCallback(
    async (filterType, page = 1, search = "", reset = false) => {
      const config = FILTER_CONFIG[filterType];
      if (
        !config?.api ||
        pagination[filterType].loading ||
        (!reset && !pagination[filterType].hasMore)
      )
        return;

      setPagination((prev) => ({
        ...prev,
        [filterType]: { ...prev[filterType], loading: true },
      }));

      try {
        const apiUrl = `${config.api}?page=${page}&limit=${config.limit}&search=${search}`;
        const response = await Service.makeAPICall({
          methodName: config.method,
          api_url: apiUrl,
        });

        const newData = Array.isArray(response?.data?.data)
          ? response.data.data
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
    functions[FILTER_TYPES.PROJECT] = _.debounce((value) => {
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
    }, 300);
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
        pagination[filterType]?.hasMore &&
        !pagination[filterType]?.loading &&
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
    if (filterType === FILTER_TYPES.STATUS) {
      setSelectedFilters((prev) => ({ ...prev, [filterType]: item.value }));
    } else if (filterType === FILTER_TYPES.PROJECT) {
      setSelectedFilters((prev) => {
        const current = prev[filterType];
        const updated = current.includes(item._id)
          ? current.filter((id) => id !== item._id)
          : [...current, item._id];
        return { ...prev, [filterType]: updated };
      });
    } else if (filterType === FILTER_TYPES.DATE) {
      setSelectedFilters((prev) => ({ ...prev, [filterType]: item }));
    }
  }, []);

  const resetFilter = useCallback(
    (filterType) => {
      if (filterType === FILTER_TYPES.STATUS) {
        setSelectedFilters((prev) => ({ ...prev, [filterType]: "all" }));
      } else if (filterType === FILTER_TYPES.PROJECT) {
        setSelectedFilters((prev) => ({ ...prev, [filterType]: [] }));
        setSearchTerms((prev) => ({ ...prev, [filterType]: "" }));
      } else if (filterType === FILTER_TYPES.DATE) {
        setSelectedFilters((prev) => ({
          ...prev,
          [filterType]: { startDate: null, endDate: null },
        }));
      }
      onFilterChange([FILTER_CONFIG[filterType].skipParam]);
    },
    [onFilterChange]
  );

  const resetAllFilters = useCallback(() => {
    setSelectedFilters({
      [FILTER_TYPES.STATUS]: "all",
      [FILTER_TYPES.PROJECT]: [],
      [FILTER_TYPES.DATE]: { startDate: null, endDate: null },
    });
    setSearchTerms({ [FILTER_TYPES.PROJECT]: "" });
    onFilterChange(["skipAll"]);
    setIsPopoverOpen(false);
  }, [onFilterChange]);

  useEffect(() => {
    if (
      activeFilter === FILTER_TYPES.PROJECT &&
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
    const config = FILTER_CONFIG[activeFilter];
    if (!config) return null;

    return (
      <FilterSection
        config={config}
        items={config.api ? filterData[activeFilter] : config.items || []}
        selectedItems={selectedFilters[activeFilter]}
        pagination={config.api ? pagination[activeFilter] : null}
        searchTerm={config.searchKey ? searchTerms[activeFilter] : null}
        onSearch={(value) => handleSearch(activeFilter, value)}
        onSelect={(item) => handleFilterSelection(item, activeFilter)}
        onLoadMore={() => handleLoadMore(activeFilter)}
        onApply={() => {
          onFilterChange([], {
            status: selectedFilters.status,
            project: selectedFilters.project,
            dates: selectedFilters.date,
          });
          setIsPopoverOpen(false);
        }}
        onReset={() => resetFilter(activeFilter)}
        isInitialLoadComplete={
          config.api ? initialLoadComplete[activeFilter] : true
        }
      />
    );
  };

  const shouldShowBadge = (key, value) => {
    // Skip if STATUS is "all"
    if (key === FILTER_TYPES.STATUS && value === "all") {
      return false;
    }

    // Array check
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    // Object check (like DATE)
    if (_.isPlainObject(value)) {
      return Object.values(value).some((v) => v !== null && v !== "");
    }

    // Fallback for strings/numbers/booleans
    return !_.isEmpty(value);
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
            {shouldShowBadge(item.key, selectedFilters[item.key]) && (
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
        placement="bottomRight"
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

export default React.memo(TaskFilterComponent);
