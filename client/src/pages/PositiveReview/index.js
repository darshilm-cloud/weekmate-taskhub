import { Button, Card, Checkbox, Input, Modal, Popconfirm, Popover, Radio, Table } from "antd";
import React, { memo, useCallback, useMemo } from "react";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import PositiveReviewController from "./PositiveReviewController";
import MyAvatar from "../../components/Avatar/MyAvatar";
import { removeTitle } from "../../util/nameFilter";
import { getRoles } from "../../util/hasPermission";
import moment from "moment";
import "../Complaints/ComplaintsForm.css"
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";

// Constants moved outside component to prevent recreation
const FEEDBACK_TYPES = [
  { value: "", label: "All" },
  { value: "Clutch Review", label: "Clutch Review" },
  { value: "Video Testimonial", label: "Video Testimonial" },
  { value: "Text Testimonial", label: "Text Testimonial" },
  { value: "Feedback", label: "Feedback" },
  { value: "Zoho Partner Profile", label: "Zoho Partner Profile" }
];

const PAGINATION_OPTIONS = ["10", "20", "30"];
const ADMIN_ROLES = ["Admin", "PC", "Super Admin", "AM"];
const ACCESS_ROLES = ["Super Admin", "PC", "TL", "AM"];
const SUPER_ADMIN_ROLES = ["Super Admin"];

// Memoized components for better performance
const FilterPopover = memo(({ 
  title, 
  visible, 
  onVisibleChange, 
  searchValue, 
  onSearchChange, 
  selectedItems, 
  allItems, 
  onFilterChange, 
  onApply, 
  onCancel, 
  renderItem,
  icon 
}) => (
  <div style={{ cursor: "pointer" }}>
    <h6>{title}:</h6>
    <Popover
      trigger="click"
      placement="bottomRight"
      visible={visible}
      onVisibleChange={onVisibleChange}
      content={
        <div className="assignees-popover assign-global-height">
          <ul>
            <li>
              <Checkbox
                checked={selectedItems.length === 0}
                onChange={() => onFilterChange("")}
              >
                All
              </Checkbox>
            </li>
          </ul>
          <div className="search-filter">
            <Input
              placeholder="Search"
              value={searchValue}
              onChange={onSearchChange}
            />
          </div>
          <div>
            <ul className="assigness-data">
              {allItems.map(renderItem)}
            </ul>
          </div>
          <div className="popover-footer-btn">
            <Button
              type="primary"
              className="square-primary-btn ant-btn-primary"
              onClick={onApply}
            >
              Apply
            </Button>
            <Button
              className="square-outline-btn ant-delete"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      {icon}
      {selectedItems.length === 0 ? " All" : " Selected"}
    </Popover>
  </div>
));

const FeedbackTypeFilter = memo(({ 
  visible, 
  onVisibleChange, 
  feedBackTypeFilter, 
  onFilterChange, 
  onApply, 
  onCancel 
}) => (
  <div style={{ cursor: "pointer" }}>
    <h6>Feedback Type:</h6>
    <Popover
      trigger="click"
      placement="bottomRight"
      visible={visible}
      onVisibleChange={onVisibleChange}
      content={
        <div className="assignees-popover assign-global-height">
          <ul>
            <Radio.Group
              onChange={onFilterChange}
              value={feedBackTypeFilter}
            >
              {FEEDBACK_TYPES.map(({ value, label }) => (
                <li key={value}>
                  <Radio value={value}>{label}</Radio>
                </li>
              ))}
            </Radio.Group>
          </ul>
          <div className="popover-footer-btn">
            <Button
              type="primary"
              className="square-primary-btn ant-btn-primary"
              onClick={onApply}
            >
              Apply
            </Button>
            <Button
              className="square-outline-btn ant-delete"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      <i className="fa-solid fa-list-check"></i>{" "}
      {feedBackTypeFilter === "" ? "All" : "Selected"}
    </Popover>
  </div>
));

const ActionButtons = memo(({ 
  record, 
  onView, 
  onDelete 
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: "20px",
    }}
  >
    <EyeOutlined
      onClick={() => onView(record._id)}
      style={{ cursor: "pointer" }}
    />
    <Link to={`/edit/positiveReviewForm/${record._id}`}>
      <EditOutlined style={{ color: "green" }} />
    </Link>
    <Popconfirm
      icon={<QuestionCircleOutlined style={{ color: "red" }} />}
      title="Are you sure to delete this Feedback?"
      onConfirm={() => onDelete(record._id)}
      okText="Yes"
      cancelText="No"
    >
      <DeleteOutlined style={{ color: "red" }} />
    </Popconfirm>
  </div>
));

const PositiveReview = () => {
  const {
    popOver,
    setPopOver,
    handleVisibleChange,
    handleSearchTechnology,
    searchTechnology,
    reviewList,
    filteredTechnologyList,
    technology,
    setTechnology,
    handleFilters,
    filteredManagerList,
    handleSearchManager,
    searchManager,
    manager,
    setManager,
    accontManager,
    setAccountManager,
    searchProject,
    handleSearchProjects,
    filteredProjectsList,
    selectedProject,
    setSelectedProject,
    handleSearchAccountManager,
    searchAccountManager,
    filteredAccManagerList,
    handleTableChange,
    pagination,
    feedBackTypeFilter,
    handleFeedBackTypeFilter,
    getReviewList,
    isModalOpenTopic,
    setIsModalOpenTopic,
    getReviewById,
    feedBackDetails,
    setFeedBackDetails,
    deleteReview
  } = PositiveReviewController();

  // Memoized permission checks
  const userHasAccess = useMemo(() => getRoles(ACCESS_ROLES), []);
  const canAddReview = useMemo(() => getRoles(ADMIN_ROLES), []);
  const isSuperAdmin = useMemo(() => getRoles(SUPER_ADMIN_ROLES), []);

  // Memoized callbacks
  const handleViewReview = useCallback((id) => {
    getReviewById(id);
    if (feedBackDetails) {
      setIsModalOpenTopic(true);
    }
  }, [getReviewById, feedBackDetails, setIsModalOpenTopic]);

  const handleDeleteReview = useCallback((id) => {
    deleteReview(id);
  }, [deleteReview]);

  const handleModalClose = useCallback(() => {
    setIsModalOpenTopic(false);
    setFeedBackDetails([]);
  }, [setIsModalOpenTopic, setFeedBackDetails]);

  const showTotal = useCallback((total) => `Total Records Count is ${total}`, []);

  // Memoized filter handlers
  const handleProjectFilter = useCallback((item) => {
    handleFilters(item, selectedProject, setSelectedProject);
  }, [handleFilters, selectedProject, setSelectedProject]);

  const handleTechnologyFilter = useCallback((item) => {
    handleFilters(item, technology, setTechnology);
  }, [handleFilters, technology, setTechnology]);

  const handleManagerFilter = useCallback((item) => {
    handleFilters(item, manager, setManager);
  }, [handleFilters, manager, setManager]);

  const handleAccountManagerFilter = useCallback((item) => {
    handleFilters(item, accontManager, setAccountManager);
  }, [handleFilters, accontManager, setAccountManager]);

  // Memoized apply handlers
  const handleApplyProject = useCallback(() => {
    getReviewList();
    setPopOver(prev => ({ ...prev, project: false }));
  }, [getReviewList, setPopOver]);

  const handleApplyTechnology = useCallback(() => {
    getReviewList();
    setPopOver(prev => ({ ...prev, technology: false }));
  }, [getReviewList, setPopOver]);

  const handleApplyManager = useCallback(() => {
    getReviewList();
    setPopOver(prev => ({ ...prev, manager: false }));
  }, [getReviewList, setPopOver]);

  const handleApplyAccountManager = useCallback(() => {
    getReviewList();
    setPopOver(prev => ({ ...prev, accontManager: false }));
  }, [getReviewList, setPopOver]);

  const handleApplyFeedbackType = useCallback(() => {
    getReviewList();
    setPopOver(prev => ({ ...prev, feedBackType: false }));
  }, [getReviewList, setPopOver]);

  // Memoized render functions
  const renderProjectItem = useCallback((item) => (
    <li key={item._id}>
      <Checkbox
        onChange={() => handleProjectFilter(item)}
        checked={selectedProject.includes(item._id)}
      >
        <span>{item?.title}</span>
      </Checkbox>
    </li>
  ), [handleProjectFilter, selectedProject]);

  const renderTechnologyItem = useCallback((item) => (
    <li key={item._id}>
      <Checkbox
        onChange={() => handleTechnologyFilter(item)}
        checked={technology.includes(item._id)}
      >
        {item.project_tech}
      </Checkbox>
    </li>
  ), [handleTechnologyFilter, technology]);

  const renderManagerItem = useCallback((item) => (
    <li key={item._id}>
      <Checkbox
        onChange={() => handleManagerFilter(item)}
        checked={manager.includes(item._id)}
      >
        <MyAvatar
          userName={item?.manager_name || "-"}
          src={item?.emp_img}
          alt={item?.manager_name}
        />
        <span>{removeTitle(item?.manager_name)}</span>
      </Checkbox>
    </li>
  ), [handleManagerFilter, manager]);

  const renderAccountManagerItem = useCallback((item) => (
    <li key={item._id}>
      <Checkbox
        onChange={() => handleAccountManagerFilter(item)}
        checked={accontManager?.includes(item._id)}
      >
        <MyAvatar
          userName={item?.manager_name || "-"}
          src={item?.emp_img}
          alt={item?.manager_name}
        />
        <span>{removeTitle(item?.manager_name)}</span>
      </Checkbox>
    </li>
  ), [handleAccountManagerFilter, accontManager]);

  // Memoized table columns
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: "Project",
        render: (text) => text?.project?.title || "-",
      },
      {
        title: "Created By",
        render: (text) => text?.createdBy?.full_name || "-",
      },
      {
        title: "Account Manager",
        render: (text) => text?.acc_manager?.full_name || "-",
      },
      {
        title: "Project Manager",
        render: (text) => text?.manager?.full_name || "-",
      },
      {
        title: "Client",
        render: (text) => text?.client_name || "-",
      },
      {
        title: "Date",
        render: (text) => {
          const createdDate = moment(text.createdAt).format("DD MMM YYYY");
          return <span>{createdDate || "-"}</span>;
        },
      },
      {
        title: "Feedback Type",
        render: (text) => text?.feedback_type || "-",
      },
      {
        title: "NDA signed by client",
        render: (text) => text?.client_nda_sign === true ? "YES" : "NO",
      },
    ];

    if (userHasAccess) {
      baseColumns.push({
        title: "Actions",
        render: (text, record) => (
          <ActionButtons
            record={record}
            onView={handleViewReview}
            onDelete={handleDeleteReview}
          />
        ),
      });
    }

    return baseColumns;
  }, [userHasAccess, handleViewReview, handleDeleteReview]);

  // Memoized pagination config
  const paginationConfig = useMemo(() => ({
    showSizeChanger: true,
    pageSizeOptions: PAGINATION_OPTIONS,
    showTotal: showTotal,
    ...pagination,
  }), [pagination, showTotal]);

  return (
    <div className="ant-project-task all-project-main-wrapper positive-feedback-review">
      <Card>
        <div className="profile-sub-head">
          <div className="head-box-inner">
            <div className="heading-main">
              <h2>Positive Reviews</h2>
            </div>
            {canAddReview && (
              <Link to="/add/positiveReviewForm">
                <Button 
                  icon={<PlusOutlined />} 
                  type="primary" 
                  className="square-primary-btn"
                >
                  Add Review
                </Button>
              </Link>
            )}
          </div>

          <div className="status-content">
            <FilterPopover
              title="Project"
              visible={popOver.project}
              onVisibleChange={() => handleVisibleChange("project", true)}
              searchValue={searchProject}
              onSearchChange={handleSearchProjects}
              selectedItems={selectedProject}
              allItems={filteredProjectsList}
              onFilterChange={handleProjectFilter}
              onApply={handleApplyProject}
              onCancel={() => setPopOver(prev => ({ ...prev, project: false }))}
              renderItem={renderProjectItem}
              icon={<i className="fa-solid fa-list-check"></i>}
            />

            {isSuperAdmin && (
              <>
                <FilterPopover
                  title="Technology"
                  visible={popOver.technology}
                  onVisibleChange={() => handleVisibleChange("technology", true)}
                  searchValue={searchTechnology}
                  onSearchChange={handleSearchTechnology}
                  selectedItems={technology}
                  allItems={filteredTechnologyList}
                  onFilterChange={handleTechnologyFilter}
                  onApply={handleApplyTechnology}
                  onCancel={() => handleVisibleChange("technology", false)}
                  renderItem={renderTechnologyItem}
                  icon={<i className="fas fa-briefcase"></i>}
                />

                <FilterPopover
                  title="Manager"
                  visible={popOver.manager}
                  onVisibleChange={() => handleVisibleChange("manager", true)}
                  searchValue={searchManager}
                  onSearchChange={handleSearchManager}
                  selectedItems={manager}
                  allItems={filteredManagerList}
                  onFilterChange={handleManagerFilter}
                  onApply={handleApplyManager}
                  onCancel={() => setPopOver(prev => ({ ...prev, manager: false }))}
                  renderItem={renderManagerItem}
                  icon={<i className="fi fi-rr-users"></i>}
                />

                <FilterPopover
                  title="Account Manager"
                  visible={popOver.accontManager}
                  onVisibleChange={() => handleVisibleChange("accontManager", true)}
                  searchValue={searchAccountManager}
                  onSearchChange={handleSearchAccountManager}
                  selectedItems={accontManager}
                  allItems={filteredAccManagerList}
                  onFilterChange={handleAccountManagerFilter}
                  onApply={handleApplyAccountManager}
                  onCancel={() => setPopOver(prev => ({ ...prev, accontManager: false }))}
                  renderItem={renderAccountManagerItem}
                  icon={<i className="fi fi-rr-users"></i>}
                />
              </>
            )}

            <FeedbackTypeFilter
              visible={popOver.feedBackType}
              onVisibleChange={() => handleVisibleChange("feedBackType", true)}
              feedBackTypeFilter={feedBackTypeFilter}
              onFilterChange={handleFeedBackTypeFilter}
              onApply={handleApplyFeedbackType}
              onCancel={() => setPopOver(prev => ({ ...prev, feedBackType: false }))}
            />
          </div>
        </div>

        <Table
          pagination={paginationConfig}
          columns={columns}
          onChange={handleTableChange}
          dataSource={reviewList}
        />
      </Card>

      <Modal
        width="600px"
        destroyOnClose
        onCancel={handleModalClose}
        open={isModalOpenTopic}
        footer={null}
        className="add-task-modal add-list-modal show-feedback-detail-modal disscusion-pop-wrapper"
      >
        <div className="modal-header">
          <h1>Feedback Details</h1>
        </div>
        <div 
          className="overview-modal-wrapper" 
          dangerouslySetInnerHTML={{ __html: feedBackDetails?.feedback }}
        />
      </Modal>
    </div>
  );
};

export default memo(PositiveReview);

