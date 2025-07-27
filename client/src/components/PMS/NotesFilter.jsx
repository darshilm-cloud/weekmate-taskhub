import React from "react";
import { Button, Popover, Checkbox, Input, Avatar, Badge } from "antd";
import { FilterOutlined, UserOutlined } from "@ant-design/icons";
import "./FilterUI.css";

const { Search } = Input;

// Helper Component
const UserAvatar = ({ userName, src, alt }) => (
  <Avatar
    src={src}
    icon={!src && <UserOutlined />}
    size="small"
    className="filter-avatar"
  >
    {!src && userName?.charAt(0)?.toUpperCase()}
  </Avatar>
);

const AssigneeFilter = ({
  subscribers = [], // Renamed from subscribersList to match original
  filterSubscribers,
  setFilterSubscribers,
  filterSubscribersSearchInput,
  setfilterSubscribersSearchInput, // Note: Original uses camelCase with lowercase 'f'
  openSubscribers,
  setOpenSubscribers,
  handleSelectionAssignedFilter,
  handleAllFilter,
  handleOpenChangeAssignees,
  handleCancleFilter, // Note: Original uses "Cancle" (typo)
  removeTitle,
  getDetails = [], // Added to match original condition
}) => {
  // Active filters count (for badge, matching BugFilter)
  const activeFiltersCount =
    filterSubscribers.length > 0 || filterSubscribers === "unassigned" ? 1 : 0;

  // Render Popover Content
  const popoverContent = (
    <div className="filter-content-inner">
      <h4 className="filter-title">Filter by Assignee</h4>

      <div className="filter-search">
        <Search
          placeholder="Search assignee"
          value={filterSubscribersSearchInput}
          onSearch={(val) => setfilterSubscribersSearchInput(val)}
          onChange={(e) => setfilterSubscribersSearchInput(e.target.value)}
          size="small"
        />
      </div>

      <div className="filter-options">
        <div
          className={`assignee-item ${
            filterSubscribers[0] === "all" || filterSubscribers.length === 0
              ? "selected"
              : ""
          }`}
        >
          <Checkbox
            checked={filterSubscribers[0] === "all" || filterSubscribers.length === 0}
            onChange={() => handleSelectionAssignedFilter("all", true)}
          >
            All
          </Checkbox>
        </div>
        <div
          className={`assignee-item ${
            filterSubscribers[0] === "unassigned" ? "selected" : ""
          }`}
        >
          <Checkbox
            checked={filterSubscribers[0] === "unassigned"}
            onChange={() => handleSelectionAssignedFilter("unassigned", true)}
          >
            Unassigned Tasks
          </Checkbox>
        </div>
        {subscribers
          ?.filter((data) =>
            data.full_name
              ?.toLowerCase()
              .includes(filterSubscribersSearchInput.toLowerCase())
          )
          .map((item, index) => (
            <div
              key={index}
              className={`assignee-item ${
                filterSubscribers.includes(item._id) ? "selected" : ""
              }`}
            >
              <Checkbox
                checked={filterSubscribers.includes(item._id)}
                onChange={() => handleSelectionAssignedFilter(item._id)}
              />
              <UserAvatar
                userName={item?.full_name}
                alt={item?.full_name}
                src={item.emp_img}
              />
              <span>{removeTitle(item.full_name)}</span>
            </div>
          ))}
      </div>

      <div className="filter-actions">
        <Button
          type="primary"
          size="small"
          className="filter-btn"
          onClick={() => {
            handleAllFilter();
            setfilterSubscribersSearchInput("");
          }}
        >
          Apply Filter
        </Button>
        <Button
          size="small"
          className="delete-btn"
          onClick={() => handleCancleFilter()}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="filter-container">
      <Popover
        content={popoverContent}
        trigger="click"
        open={openSubscribers && getDetails.length > 0}
        onOpenChange={handleOpenChangeAssignees}
        placement="bottomRight"
        overlayStyle={{ maxWidth: "none" }}
      >
        <Button className="filter-btn" icon={<FilterOutlined />}>
          <span className="filter-text">
            <span>Subscribers: </span>
            {filterSubscribers.length === 0
              ? "All"
              : filterSubscribers === "unassigned"
              ? "Unassigned"
              : "Selected"}
          </span>
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

export default AssigneeFilter;