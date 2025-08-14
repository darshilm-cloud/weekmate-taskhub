import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Table,
  Typography
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  QuestionCircleOutlined
} from "@ant-design/icons";
import { getRoles } from "../../util/hasPermission";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import moment from "moment";
import "../Complaints/ComplaintsForm.css";
import { sideBarContentId2 } from "../../constants";
import ProjectExpenseFilterComponent from "./ProjectExpenseFilterComponent";

const { Text } = Typography;

// Constants
const USER_ROLES = {
  ADMIN_ROLES: ["Super Admin", "PC", "TL", "Admin", "AM", "User"],
  EXPENSE_ACCESS_ROLES: ["Admin", "PC", "Super Admin", "AM", "TL"],
  SUPER_ADMIN: ["Super Admin"],
  CLIENT_USER_ID: sideBarContentId2
};

const PAGINATION_OPTIONS = ["10", "20", "30"];

const Projectexpences = () => {
  const dispatch = useDispatch();
  const companySlug = localStorage.getItem("companyDomain");

  const [projectexpencesList, setprojectexpencesList] = useState([]);
  const [selectedProject, setSelectedProject] = useState([]);
  const [createdBy, setCreatedBy] = useState([]);
  const [technology, setTechnology] = useState([]);
  const [manager, setManager] = useState([]);
  const [accontManager, setAccountManager] = useState([]);
  const [need_to_bill_customer, setFeedBackTypeFilter] = useState("All");
  const [isModalOpenTopic, setIsModalOpenTopic] = useState(false);
  const [feedBackDetails, setFeedBackDetails] = useState([]);
  const [viewData, setViewData] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });

  useEffect(() => {
    getprojectexpencesList();
  }, [pagination.current, pagination.pageSize, selectedProject, technology, manager, accontManager, need_to_bill_customer,createdBy]);

  const onFilterChange = (skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setSelectedProject([]);
      setTechnology([]);
      setCreatedBy([])
      setManager([]);
      setAccountManager([]);
      setFeedBackTypeFilter("All");
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
      if (skipParams.includes("skipNeedToBillCustomer")) {
        setFeedBackTypeFilter("All");
      }
      if (skipParams.includes("skipCreatedBy")) {
        setCreatedBy([]);
      }
    }

    if (selectedFilters) {
      setSelectedProject(selectedFilters.project || []);
      setTechnology(selectedFilters.technology || []);
      setManager(selectedFilters.manager || []);
      setAccountManager(selectedFilters.accountManager || []);
      setFeedBackTypeFilter(selectedFilters.needToBillCustomer || "All");
      setPagination({ ...pagination, current: 1 });
      setCreatedBy(selectedFilters.createdBy || [])
    }
  };

  const getprojectexpencesList = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        project_id: selectedProject,
        technology: technology,
        manager_id: manager,
        acc_manager_id: accontManager,
        createdBy:createdBy,
        need_to_bill_customer: need_to_bill_customer === "All" ? undefined : need_to_bill_customer,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectexpanses,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setprojectexpencesList(response.data.data);
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
        api_url: Service.getprojectexpencesList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setFeedBackDetails(response.data.data);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const deleteProjectExpences = async (deleteId) => {
    try {
      dispatch(showAuthLoader());
      const params = `/${deleteId}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteprojectexpanses + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        getprojectexpencesList();
        message.success(response.data.message);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const [formDetail] = Form.useForm();
  const userData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user_data")) || {};
    } catch {
      return {};
    }
  }, []);

  const userPermissions = useMemo(() => ({
    hasAccess: getRoles(USER_ROLES.ADMIN_ROLES),
    hasClientAccess: userData._id === USER_ROLES.CLIENT_USER_ID,
    canAddExpense: getRoles(USER_ROLES.EXPENSE_ACCESS_ROLES),
    isSuperAdmin: getRoles(USER_ROLES.SUPER_ADMIN)
  }), [userData._id]);

  const showTotal = useCallback((total) => `Total Records Count is ${total}`, []);

  const getReviewForEdit = useCallback(async (review_id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectexpanses,
        body: { _id: review_id },
      });

      if (response?.data?.data) {
        const data = response.data.data;
        setViewData(data);
        formDetail.setFieldsValue({
          purchase_request_details: data?.purchase_request_details?.replace(/<br\s*\/?>/g, "\n"),
          details: data?.details,
          nature_Of_expense: data?.nature_Of_expense
        });
      }
    } catch (error) {
      console.error("Error fetching review details:", error);
      message.error("Failed to fetch expense details");
    } finally {
      dispatch(hideAuthLoader());
    }
  }, [dispatch, formDetail]);

  const handleViewExpense = useCallback((expenseId) => {
    getReviewForEdit(expenseId);
    if (feedBackDetails) {
      setIsModalOpenTopic(true);
    }
  }, [getReviewForEdit, feedBackDetails, setIsModalOpenTopic]);

  const exportCSV = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.exportProjectExpenses,
        body: {
          exportFileType: "csv",
          isExport: true,
        },
      });

      if (response?.data?.data) {
        const base64 = response.data.data;
        const linkSource = "data:text/csv;base64," + base64;
        const downloadLink = document.createElement("a");
        downloadLink.href = linkSource;
        downloadLink.download = "Project Expense.csv";
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        message.error(response?.data?.message || "Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export CSV");
    }
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpenTopic(false);
    setFeedBackDetails([]);
  }, [setIsModalOpenTopic, setFeedBackDetails]);

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: "Project",
        render: (text) => text?.project?.title || "-",
        width: 250,
        ellipsis: true,
      },
      {
        title: "Amount",
        render: (text) =>
          text?.cost_in_usd ? (
            <span style={{ display: 'flex', justifyContent: 'start', gap: '5px' }}>
              <span>$</span>
              <span>{text.cost_in_usd}</span>
            </span>
          ) : "-",
      },
      {
        title: "Need to Bill Customer",
        render: (text) => text?.need_to_bill_customer ? "YES" : "NO",
      },
      {
        title: "Created By",
        render: (text) => text?.createdBy?.full_name || "-",
      },
      {
        title: "Date",
        render: (text) => {
          const createdDate = moment(text.createdAt).format("DD MMM YYYY");
          return <span>{createdDate || "-"}</span>;
        },
      },
      {
        title: "Status",
        render: (text) => <span>{text.status}</span>,
      },
    ];

    if (userPermissions.hasAccess) {
      baseColumns.push({
        title: "Actions",
        render: (text) => (
          <div style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "start",
            alignItems: "center",
            gap: "20px",
          }}>
            <EyeOutlined
              onClick={() => handleViewExpense(text?._id)}
              style={{ cursor: "pointer" }}
            />
             <Link to={`/${companySlug}/edit/projectexpenseform/${text._id}`}>
              <EditOutlined style={{ color: "green" }} />
            </Link>
            <Popconfirm
              icon={<QuestionCircleOutlined style={{ color: "red" }} />}
              title="Are you sure to delete this Expense?"
              onConfirm={() => deleteProjectExpences(text._id)}
              okText="Yes"
              cancelText="No"
            >
              <DeleteOutlined style={{ color: "red" }} />
            </Popconfirm>
          </div>
        ),
      });
    } else if (userPermissions.hasClientAccess) {
      baseColumns.push({
        title: "Actions",
        render: (text) => (
          <div style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
          }}>
            <EyeOutlined
              onClick={() => handleViewExpense(text?._id)}
              style={{ cursor: "pointer" }}
            />
            <Link to={`/${companySlug}/edit/projectexpenseform/${text._id}`}>
              <EditOutlined style={{ color: "green" }} />
            </Link>
          </div>
        ),
      });
    }

    return baseColumns;
  }, [userPermissions, handleViewExpense, deleteProjectExpences]);

  const handleTableChange = (page) => {
    setPagination({ ...pagination, ...page });
  };


  return (
    <div className="ant-project-task all-project-main-wrapper positive-feedback-review">
      <Card>
        <div className="heading-wrapper">
          <h2>Project Expense</h2>
          {userPermissions.canAddExpense && (
            <Link to={`/${companySlug}/add/projectexpenseform`}>
              <Button type="primary" icon={<PlusOutlined/>} className="square-primary-btn">
                Add Project Expense
              </Button>
            </Link>
          )}
        </div>
        <div className="global-search">
          <div className="filter-btn-wrapper">
            <ProjectExpenseFilterComponent
              onFilterChange={onFilterChange}
              userPermissions={userPermissions}
            />
            <Button
              className="export-btn"
              id="exportButton"
              disabled={pagination.total === 0}
              onClick={exportCSV}
            >
              Export CSV
            </Button>
          </div>
        </div>

        <Table
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: PAGINATION_OPTIONS,
            showTotal: showTotal,
            ...pagination,
          }}
          columns={columns}
          onChange={handleTableChange}
          dataSource={projectexpencesList}
        />
      </Card>

      <Modal
        width="600px"
        title="Project Expense Details"
        destroyOnClose
        onCancel={handleModalClose}
        open={isModalOpenTopic}
        footer={null}
      >
        <Form form={formDetail} layout="vertical" style={{ padding: '20px' }}>
          <Form.Item 
            label={<Text strong>Purchase Request Details</Text>} 
            name="purchase_request_details"
          >
            <Input.TextArea
              placeholder="Enter purchase request details"
              rows={4}
              disabled
              className="border-gray-300"
            />
          </Form.Item>

          {viewData?.details && (
            <Form.Item 
              label={<Text strong>Accounting Details</Text>} 
              name="details"
            >
              <Input.TextArea
                placeholder="Accounting details"
                rows={4}
                disabled
                className="border-gray-300"
              />
            </Form.Item>
          )}

          {viewData?.nature_Of_expense && (
            <Form.Item 
              label={<Text strong>Nature Of Expense</Text>} 
              name="nature_Of_expense"
            >
              <Input.TextArea
                placeholder="Nature Of Expense"
                rows={4}
                disabled
                className="border-gray-300"
              />
            </Form.Item>
          )}

          {viewData?.projectexpences?.length > 0 && (
            <Row align="middle" style={{ marginTop: 16 }}>
              <Col>
                <Text strong>Document: </Text>
                <a
                  href={`${process.env.REACT_APP_API_URL}/public/projectexpense/${viewData?.projectexpences}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  <FileTextOutlined style={{ marginRight: 5 }} />
                  {viewData?.projectexpences}
                </a>
              </Col>
            </Row>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default React.memo(Projectexpences);