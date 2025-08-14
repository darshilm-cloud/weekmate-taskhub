import { Button, Card, Modal, Popconfirm, Table } from "antd";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import MyAvatar from "../../components/Avatar/MyAvatar";
import { removeTitle } from "../../util/nameFilter";
import { getRoles } from "../../util/hasPermission";
import moment from "moment";
import "../Complaints/ComplaintsForm.css";
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import GenericFilterComponent from "./PositiveReviewFilter";
import { useDispatch } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import { message } from "antd";

// Constants
const PAGINATION_OPTIONS = ["10", "20", "30"];
const ADMIN_ROLES = ["Admin", "PC", "Super Admin", "AM"];
const ACCESS_ROLES = ["Super Admin", "PC", "TL", "AM"];
const SUPER_ADMIN_ROLES = ["Super Admin"];
const companySlug = localStorage.getItem("companyDomain");

const ActionButtons = React.memo(({ 
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
  const dispatch = useDispatch();
  const [reviewList, setReviewList] = useState([]);
  const [feedBackDetails, setFeedBackDetails] = useState([]);
  const [isModalOpenTopic, setIsModalOpenTopic] = useState(false);
  const [selectedProject, setSelectedProject] = useState([]);
  const [technology, setTechnology] = useState([]);
  const [manager, setManager] = useState([]);
  const [accontManager, setAccountManager] = useState([]);
  const [feedBackTypeFilter, setFeedBackTypeFilter] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });

  useEffect(() => {
    getReviewList();
  }, [pagination.current, pagination.pageSize, selectedProject, technology, manager, accontManager, feedBackTypeFilter]);

  const onFilterChange = (skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setSelectedProject([]);
      setTechnology([]);
      setManager([]);
      setAccountManager([]);
      setFeedBackTypeFilter("");
      setPagination({ ...pagination, current: 1 });
    } else {
      if (skipParams.includes("skipProject")) {
        setSelectedProject([]);
      }
      if (skipParams.includes("skipDepartment")) {
        setTechnology([]);
      }
      if (skipParams.includes("skipManager")) {
        setManager([]);
      }
      if (skipParams.includes("skipAccountManager")) {
        setAccountManager([]);
      }
      if (skipParams.includes("skipFeedbackType")) {
        setFeedBackTypeFilter("");
      }
    }
    if (selectedFilters) {
      setSelectedProject(selectedFilters.project || []);
      setTechnology(selectedFilters.technology || []);
      setManager(selectedFilters.manager || []);
      setAccountManager(selectedFilters.accountManager || []);
      setFeedBackTypeFilter(selectedFilters.feedbackType || "");
      setPagination({ ...pagination, current: 1 });
    }
  };

  const getReviewList = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        project_id: selectedProject,
        technology: technology,
        manager_id: manager,
        acc_manager_id: accontManager,
        feedback_type: feedBackTypeFilter,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getReviewList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setReviewList(response.data.data);
        setPagination({
          ...pagination,
          total: response.data.metadata.total,
        });
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const getReviewById = async (reviewId) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        _id: reviewId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getReviewList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setFeedBackDetails(response.data.data);
        setIsModalOpenTopic(true);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const deleteReview = async (deleteId) => {
    try {
      dispatch(showAuthLoader());
      const params = `/${deleteId}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteReview + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        message.success(response.data.message);
        getReviewList();
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  // Memoized permission checks
  const userHasAccess = useMemo(() => getRoles(ACCESS_ROLES), []);
  const canAddReview = useMemo(() => getRoles(ADMIN_ROLES), []);

  // Memoized callbacks
  const handleViewReview = useCallback((id) => {
    getReviewById(id);
  }, []);

  const handleDeleteReview = useCallback((id) => {
    deleteReview(id);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpenTopic(false);
    setFeedBackDetails([]);
  }, []);

  const showTotal = useCallback((total) => `Total Records Count is ${total}`, []);

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

  const handleTableChange = (page) => {
    setPagination({ ...pagination, ...page });
  };

  return (
    <div className="ant-project-task all-project-main-wrapper positive-feedback-review">
      <Card>
        <div className="heading-wrapper">
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
            <GenericFilterComponent onFilterChange={onFilterChange} />
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

export default React.memo(PositiveReview);

