import {
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Popconfirm,
  Popover,
  Radio,
  Table,
} from "antd";
import React, { memo, useCallback, useMemo } from "react";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import PositiveReviewController from "./PositiveReviewController";
import MyAvatar from "../../components/Avatar/MyAvatar";
import { removeTitle } from "../../util/nameFilter";
import { getRoles } from "../../util/hasPermission";
import moment from "moment";
import "../Complaints/ComplaintsForm.css";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import PositiveReviewFilter from "./PositiveReviewFilter";

// Constants moved outside component to prevent recreation
const FEEDBACK_TYPES = [
  { value: "", label: "All" },
  { value: "Clutch Review", label: "Clutch Review" },
  { value: "Video Testimonial", label: "Video Testimonial" },
  { value: "Text Testimonial", label: "Text Testimonial" },
  { value: "Feedback", label: "Feedback" },
  { value: "Zoho Partner Profile", label: "Zoho Partner Profile" },
];

const PAGINATION_OPTIONS = ["10", "20", "30"];
const ADMIN_ROLES = ["Admin", "PC", "Admin", "AM"];
const ACCESS_ROLES = ["Admin", "PC", "TL", "AM"];
const SUPER_ADMIN_ROLES = ["Admin"];

const companySlug = localStorage.getItem("companyDomain");

// Memoized components for better performance
const FilterPopover = memo(
  ({
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
    icon,
  }) => (
    <Popover
      trigger="click"
      visible={visible}
      onVisibleChange={onVisibleChange}
      placement="bottomRight"
      content={
        <div className="right-popover-wrapper">
          <ul className="assigness-data">
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
            <ul className="assigness-data">{allItems.map(renderItem)}</ul>
          </div>
          <div className="popver-footer-btn">
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
      <Button className="dropdown-button">
        <span className="filter-text">
          <span>{title}:</span>
          <span>
            {selectedItems.length === 0
              ? "All"
              : `Selected (${selectedItems.length})`}
          </span>
        </span>
      </Button>
    </Popover>
  )
);

const FeedbackTypeFilter = memo(
  ({
    visible,
    onVisibleChange,
    feedBackTypeFilter,
    onFilterChange,
    onApply,
    onCancel,
  }) => (
    <Popover
      trigger="click"
      visible={visible}
      onVisibleChange={onVisibleChange}
      placement="bottomRight"
      content={
        <div className="right-popover-wrapper">
          <ul className="assigness-data">
            <Radio.Group onChange={onFilterChange} value={feedBackTypeFilter}>
              {FEEDBACK_TYPES.map(({ value, label }) => (
                <li key={value}>
                  <Radio value={value}>{label}</Radio>
                </li>
              ))}
            </Radio.Group>
          </ul>
          <div className="popver-footer-btn">
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
      <Button className="dropdown-button">
        <span className="filter-text">
          <span>Feedback Type:</span>
          <span>
            {feedBackTypeFilter === ""
              ? "All"
              : FEEDBACK_TYPES.find((type) => type.value === feedBackTypeFilter)
                  ?.label || "Selected"}
          </span>
        </span>
      </Button>
    </Popover>
  )
);

const ActionButtons = memo(({ record, onView, onDelete }) => (
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
    <Link to={`/${companySlug}/edit/positiveReviewForm/${record._id}`}>
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
    deleteReview,
  } = PositiveReviewController();

  // Memoized permission checks
  const userHasAccess = useMemo(() => getRoles(ACCESS_ROLES), []);
  const canAddReview = useMemo(() => getRoles(ADMIN_ROLES), []);
  const isSuperAdmin = useMemo(() => getRoles(SUPER_ADMIN_ROLES), []);

  // Memoized callbacks
  const handleViewReview = useCallback(
    (id) => {
      getReviewById(id);
      if (feedBackDetails) {
        setIsModalOpenTopic(true);
      }
    },
    [getReviewById, feedBackDetails, setIsModalOpenTopic]
  );

  const handleDeleteReview = useCallback(
    (id) => {
      deleteReview(id);
    },
    [deleteReview]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpenTopic(false);
    setFeedBackDetails([]);
  }, [setIsModalOpenTopic, setFeedBackDetails]);

  const showTotal = useCallback(
    (total) => `Total Records Count is ${total}`,
    []
  );

  // Memoized filter handlers
  const handleProjectFilter = useCallback(
    (item) => {
      handleFilters(item, selectedProject, setSelectedProject);
    },
    [handleFilters, selectedProject, setSelectedProject]
  );

  const handleTechnologyFilter = useCallback(
    (item) => {
      handleFilters(item, technology, setTechnology);
    },
    [handleFilters, technology, setTechnology]
  );

  const handleManagerFilter = useCallback(
    (item) => {
      handleFilters(item, manager, setManager);
    },
    [handleFilters, manager, setManager]
  );

  const handleAccountManagerFilter = useCallback(
    (item) => {
      handleFilters(item, accontManager, setAccountManager);
    },
    [handleFilters, accontManager, setAccountManager]
  );

  // Memoized apply handlers
  const handleApplyProject = useCallback(() => {
    getReviewList();
    setPopOver((prev) => ({ ...prev, project: false }));
  }, [getReviewList, setPopOver]);

  const handleApplyTechnology = useCallback(() => {
    getReviewList();
    setPopOver((prev) => ({ ...prev, technology: false }));
  }, [getReviewList, setPopOver]);

  const handleApplyManager = useCallback(() => {
    getReviewList();
    setPopOver((prev) => ({ ...prev, manager: false }));
  }, [getReviewList, setPopOver]);

  const handleApplyAccountManager = useCallback(() => {
    getReviewList();
    setPopOver((prev) => ({ ...prev, accontManager: false }));
  }, [getReviewList, setPopOver]);

  const handleApplyFeedbackType = useCallback(() => {
    getReviewList();
    setPopOver((prev) => ({ ...prev, feedBackType: false }));
  }, [getReviewList, setPopOver]);

  // Memoized render functions
  const renderProjectItem = useCallback(
    (item) => (
      <li key={item._id}>
        <Checkbox
          onChange={() => handleProjectFilter(item)}
          checked={selectedProject.includes(item._id)}
        >
          <span>{item?.title}</span>
        </Checkbox>
      </li>
    ),
    [handleProjectFilter, selectedProject]
  );

  const renderTechnologyItem = useCallback(
    (item) => (
      <li key={item._id}>
        <Checkbox
          onChange={() => handleTechnologyFilter(item)}
          checked={technology.includes(item._id)}
        >
          {item.project_tech}
        </Checkbox>
      </li>
    ),
    [handleTechnologyFilter, technology]
  );

  const renderManagerItem = useCallback(
    (item) => (
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
    ),
    [handleManagerFilter, manager]
  );

  const renderAccountManagerItem = useCallback(
    (item) => (
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
    ),
    [handleAccountManagerFilter, accontManager]
  );

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
        render: (text) => (text?.client_nda_sign === true ? "YES" : "NO"),
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
  const paginationConfig = useMemo(
    () => ({
      showSizeChanger: true,
      pageSizeOptions: PAGINATION_OPTIONS,
      showTotal: showTotal,
      ...pagination,
    }),
    [pagination, showTotal]
  );


  const filterConfigs = [
    {
      key: "project",
      label: "Project",
      filterType: "checkbox",
      searchValue: searchProject,
      onSearchChange: handleSearchProjects,
      selectedItems: selectedProject,
      allItems: filteredProjectsList,
      onFilterChange: handleProjectFilter,
      onApply: handleApplyProject,
      onReset: () => handleProjectFilter(""),
      renderItem: renderProjectItem,
      hasSearch: true,
    },
    ...(isSuperAdmin ? [
      {
        key: "technology",
        label: "Department",
        filterType: "checkbox",
        searchValue: searchTechnology,
        onSearchChange: handleSearchTechnology,
        selectedItems: technology,
        allItems: filteredTechnologyList,
        onFilterChange: handleTechnologyFilter,
        onApply: handleApplyTechnology,
        onReset: () => handleTechnologyFilter(""),
        renderItem: renderTechnologyItem,
        hasSearch: true,
      },
      {
        key: "manager",
        label: "Manager",
        filterType: "checkbox",
        searchValue: searchManager,
        onSearchChange: handleSearchManager,
        selectedItems: manager,
        allItems: filteredManagerList,
        onFilterChange: handleManagerFilter,
        onApply: handleApplyManager,
        onReset: () => handleManagerFilter(""),
        renderItem: renderManagerItem,
        hasSearch: true,
      },
      {
        key: "accountManager",
        label: "Account Manager",
        filterType: "checkbox",
        searchValue: searchAccountManager,
        onSearchChange: handleSearchAccountManager,
        selectedItems: accontManager,
        allItems: filteredAccManagerList,
        onFilterChange: handleAccountManagerFilter,
        onApply: handleApplyAccountManager,
        onReset: () => handleAccountManagerFilter(""),
        renderItem: renderAccountManagerItem,
        hasSearch: true,
      },
    ] : []),
    {
      key: "feedbackType",
      label: "Feedback Type",
      filterType: "radio",
      selectedValue: feedBackTypeFilter,
      options: FEEDBACK_TYPES,
      onFilterChange: handleFeedBackTypeFilter,
      onApply: handleApplyFeedbackType,
      onReset: () => handleFeedBackTypeFilter({ target: { value: "" } }),
      hasSearch: false,
    },
  ];
  

  return (
    <div className="ant-project-task all-project-main-wrapper positive-feedback-review">
      <Card>
        <div class="heading-wrapper">
          <h2>Positive Reviews</h2>
          {canAddReview && (
            <Link to={`/${companySlug}/add/positiveReviewForm`}>
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

        <div className="global-search">
          <div className="filter-btn-wrapper">
            <PositiveReviewFilter filterConfigs={filterConfigs} />
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
