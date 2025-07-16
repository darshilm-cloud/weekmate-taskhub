import React, { useState, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Popover,
  Radio,
  Row,
  Table,
  Typography
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  QuestionCircleOutlined
} from "@ant-design/icons";

import ProjectExpencesController from "./ProjectExpencesController";
import MyAvatar from "../../components/Avatar/MyAvatar";
import { removeTitle } from "../../util/nameFilter";
import { getRoles } from "../../util/hasPermission";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import moment from "moment";
import "../Complaints/ComplaintsForm.css";
import { sideBarContentId2 } from "../../constants";

const { Text } = Typography;

// Constants
const USER_ROLES = {
  ADMIN_ROLES: ["Admin", "PC", "TL", "Admin", "AM", "User"],
  EXPENSE_ACCESS_ROLES: ["Admin", "PC", "Admin", "AM", "TL"],
  SUPER_ADMIN: ["Admin"],
  CLIENT_USER_ID: sideBarContentId2
};

const PAGINATION_OPTIONS = ["10", "20", "30"];

const Projectexpences = () => {
  // Custom hook for business logic
  const {
    popOver,
    setPopOver,
    handleVisibleChange,
    handleSearchTechnology,
    searchTechnology,
    projectexpencesList,
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
    need_to_bill_customer,
    handleReviewTypeFilter,
    getprojectexpencesList,
    isModalOpenTopic,
    setIsModalOpenTopic,
    feedBackDetails,
    setFeedBackDetails,
    deleteProjectExpences
  } = ProjectExpencesController();

  const companySlug = localStorage.getItem("companyDomain");

  // Local state
  const [formDetail] = Form.useForm();
  const [viewData, setViewData] = useState({});

  const dispatch = useDispatch();

  // Memoized user data and permissions
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

  // Memoized callbacks
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

  // Memoized filter components
  const ProjectFilter = useMemo(() => (
    !userPermissions.hasClientAccess && (
      <Popover
        trigger="click"
        visible={ popOver.project }
        onVisibleChange={ (visible) => handleVisibleChange("project", visible) }
        placement="bottomRight"
        content={
          <div className="right-popover-wrapper">
            <ul className="assigness-data" style={ { listStyle: "none" } }>
              <li>
                <Checkbox
                  checked={ selectedProject.length === 0 }
                  onChange={ () => handleFilters("", selectedProject, setSelectedProject) }
                >
                  All
                </Checkbox>
              </li>
            </ul>
            <div className="search-filter">
              <Input
                placeholder="Search"
                value={ searchProject }
                onChange={ handleSearchProjects }
              />
            </div>
            <div>
              <ul className="assigness-data" style={ { listStyle: "none" } }>
                { filteredProjectsList.map((item) => (
                  <li key={ item._id }>
                    <Checkbox
                      onChange={ () => handleFilters(item, selectedProject, setSelectedProject) }
                      checked={ selectedProject.includes(item._id) }
                    >
                      <span>{ item?.title }</span>
                    </Checkbox>
                  </li>
                )) }
              </ul>
            </div>
            <div className="popver-footer-btn">
              <Button
                type="primary"
                className="square-primary-btn ant-btn-primary"
                onClick={ () => {
                  getprojectexpencesList();
                  handleVisibleChange("project", false);
                } }
              >
                Apply
              </Button>
              <Button
                className="square-outline-btn ant-delete"
                onClick={ () => handleVisibleChange("project", false) }
              >
                Cancel
              </Button>
            </div>
          </div>
        }
      >
        <Button className="dropdown-button">
          <span className="filter-text">
            <span>Project:</span>
            <span>
              { selectedProject.length === 0 ? "All" : `Selected (${selectedProject.length})` }
            </span>
          </span>
        </Button>
      </Popover>
    )
  ), [userPermissions.hasClientAccess, popOver.project, selectedProject, searchProject, filteredProjectsList, handleVisibleChange, handleFilters, handleSearchProjects, setSelectedProject, getprojectexpencesList, setPopOver]);

  const TechnologyFilter = useMemo(() => (
    userPermissions.isSuperAdmin && (
      <Popover
        trigger="click"
        visible={ popOver.technology }
        onVisibleChange={ (visible) => handleVisibleChange("technology", visible) }
        placement="bottomRight"
        content={
          <div className="right-popover-wrapper">
            <ul className="assigness-data">
              <li>
                <Checkbox
                  checked={ technology.length === 0 }
                  onChange={ () => handleFilters("", technology, setTechnology) }
                >
                  All
                </Checkbox>
              </li>
            </ul>
            <div className="search-filter">
              <Input
                placeholder="Search"
                value={ searchTechnology }
                onChange={ handleSearchTechnology }
              />
            </div>
            <div>
              <ul className="assigness-data">
                { filteredTechnologyList.map((item) => (
                  <li key={ item._id }>
                    <Checkbox
                      onChange={ () => handleFilters(item, technology, setTechnology) }
                      checked={ technology.includes(item._id) }
                    >
                      { item.project_tech }
                    </Checkbox>
                  </li>
                )) }
              </ul>
            </div>
            <div className="popver-footer-btn">
              <Button
                type="primary"
                className="square-primary-btn ant-btn-primary"
                onClick={ () => {
                  getprojectexpencesList();
                  handleVisibleChange("technology", false);
                } }
              >
                Apply
              </Button>
              <Button
                className="square-outline-btn ant-delete"
                onClick={ () => handleVisibleChange("technology", false) }
              >
                Cancel
              </Button>
            </div>
          </div>
        }
      >
        <Button className="dropdown-button">
          <span className="filter-text">
            <span>Technology:</span>
            <span>
              { technology.length === 0 ? "All" : `Selected (${technology.length})` }
            </span>
          </span>
        </Button>
      </Popover>
    )
  ), [userPermissions.isSuperAdmin, popOver.technology, technology, searchTechnology, filteredTechnologyList, handleVisibleChange, handleFilters, handleSearchTechnology, setTechnology, getprojectexpencesList, setPopOver]);

  const ManagerFilter = useMemo(() => (
    userPermissions.isSuperAdmin && (
      <Popover
        trigger="click"
        visible={ popOver.manager }
        onVisibleChange={ (visible) => handleVisibleChange("manager", visible) }
        placement="bottomRight"
        content={
          <div className="right-popover-wrapper">
            <ul className="assigness-data">
              <li>
                <Checkbox
                  checked={ manager.length === 0 }
                  onChange={ () => handleFilters("", manager, setManager) }
                >
                  All
                </Checkbox>
              </li>
            </ul>
            <div className="search-filter">
              <Input
                placeholder="Search"
                value={ searchManager }
                onChange={ handleSearchManager }
              />
            </div>
            <div>
              <ul className="assigness-data">
                { filteredManagerList.map((item) => (
                  <li key={ item._id }>
                    <Checkbox
                      onChange={ () => handleFilters(item, manager, setManager) }
                      checked={ manager.includes(item._id) }
                    >
                      <MyAvatar
                        userName={ item?.manager_name || "-" }
                        src={ item?.emp_img }
                        key={ item?._id }
                        alt={ item?.manager_name }
                      />
                      <span>{ removeTitle(item?.manager_name) }</span>
                    </Checkbox>
                  </li>
                )) }
              </ul>
            </div>
            <div className="popver-footer-btn">
              <Button
                type="primary"
                className="square-primary-btn ant-btn-primary"
                onClick={ () => {
                  getprojectexpencesList();
                  handleVisibleChange("manager", false);
                } }
              >
                Apply
              </Button>
              <Button
                className="square-outline-btn ant-delete"
                onClick={ () => handleVisibleChange("manager", false) }
              >
                Cancel
              </Button>
            </div>
          </div>
        }
      >
        <Button className="dropdown-button">
          <span className="filter-text">
            <span>Manager:</span>
            <span>
              { manager.length === 0 ? "All" : `Selected (${manager.length})` }
            </span>
          </span>
        </Button>
      </Popover>
    )
  ), [userPermissions.isSuperAdmin, popOver.manager, manager, searchManager, filteredManagerList, handleVisibleChange, handleFilters, handleSearchManager, setManager, getprojectexpencesList, setPopOver]);

  const AccountManagerFilter = useMemo(() => (
    userPermissions.isSuperAdmin && (
      <Popover
        trigger="click"
        visible={ popOver.accontManager }
        onVisibleChange={ (visible) => handleVisibleChange("accontManager", visible) }
        placement="bottomRight"
        content={
          <div className="right-popover-wrapper">
            <ul className="assigness-data">
              <li>
                <Checkbox
                  checked={ accontManager?.length === 0 }
                  onChange={ () => handleFilters("", accontManager, setAccountManager) }
                >
                  All
                </Checkbox>
              </li>
            </ul>
            <div className="search-filter">
              <Input
                placeholder="Search"
                value={ searchAccountManager }
                onChange={ handleSearchAccountManager }
              />
            </div>
            <div>
              <ul className="assigness-data">
                { filteredAccManagerList.map((item) => (
                  <li key={ item._id }>
                    <Checkbox
                      onChange={ () => handleFilters(item, accontManager, setAccountManager) }
                      checked={ accontManager?.includes(item._id) }
                    >
                      <MyAvatar
                        userName={ item?.manager_name || "-" }
                        src={ item?.emp_img }
                        key={ item?._id }
                        alt={ item?.manager_name }
                      />
                      <span>{ removeTitle(item?.manager_name) }</span>
                    </Checkbox>
                  </li>
                )) }
              </ul>
            </div>
            <div className="popver-footer-btn">
              <Button
                type="primary"
                className="square-primary-btn ant-btn-primary"
                onClick={ () => {
                  getprojectexpencesList();
                  handleVisibleChange("accontManager", false);
                } }
              >
                Apply
              </Button>
              <Button
                className="square-outline-btn ant-delete"
                onClick={ () => handleVisibleChange("accontManager", false) }
              >
                Cancel
              </Button>
            </div>
          </div>
        }
      >
        <Button className="dropdown-button">
          <span className="filter-text">
            <span>Account Manager:</span>
            <span>
              { accontManager?.length === 0 ? "All" : `Selected (${accontManager?.length})` }
            </span>
          </span>
        </Button>
      </Popover>
    )
  ), [userPermissions.isSuperAdmin, popOver.accontManager, accontManager, searchAccountManager, filteredAccManagerList, handleVisibleChange, handleFilters, handleSearchAccountManager, setAccountManager, getprojectexpencesList, setPopOver]);

  // Memoized table columns
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: "Project",
        render: (text) => text?.project?.title || "-",
        width: 400,
        ellipsis: true,
      },
      {
        title: "Amount",
        render: (text) =>
          text?.cost_in_usd ? (
            <span style={ { display: 'flex', justifyContent: 'start', gap: '5px' } }>
              <span>$</span>
              <span>{ text.cost_in_usd }</span>
            </span>
          ) : "-",
      },
      {
        title: "Need to Bill Customer",
        render: (text) => text?.need_to_bill_customer ? "YES" : "NO",
        ellipsis: false
      },
      {
        title: "Created By",
        render: (text) => text?.createdBy?.full_name || "-",
      },
      {
        title: "Date",
        render: (text) => {
          const createdDate = moment(text.createdAt).format("DD MMM YYYY");
          return <span>{ createdDate || "-" }</span>;
        },
      },
      {
        title: "Status",
        render: (text) => <span>{ text.status }</span>,
      },
    ];

    // Add actions column based on user permissions
    if (userPermissions.hasAccess) {
      baseColumns.push({
        title: "Actions",
        render: (text) => (
          <div style={ {
            display: "flex",
            flexDirection: "row",
            justifyContent: "start",
            alignItems: "center",
            gap: "20px",
          } }>
            <EyeOutlined
              onClick={ () => handleViewExpense(text?._id) }
              style={ { cursor: "pointer" } }
            />
            <Link to={ `/${companySlug}/edit/projectexpenseform/${text._id}` }>
              <EditOutlined style={ { color: "green" } } />
            </Link>
            <Popconfirm
              icon={ <QuestionCircleOutlined style={ { color: "red" } } /> }
              title="Are you sure to delete this Expense?"
              onConfirm={ () => deleteProjectExpences(text._id) }
              okText="Yes"
              cancelText="No"
            >
              <DeleteOutlined style={ { color: "red" } } />
            </Popconfirm>
          </div>
        ),
      });
    } else if (userPermissions.hasClientAccess) {
      baseColumns.push({
        title: "Actions",
        render: (text) => (
          <div style={ {
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
          } }>
            <EyeOutlined
              onClick={ () => handleViewExpense(text?._id) }
              style={ { cursor: "pointer" } }
            />
            <Link to={ `/${companySlug}/edit/projectexpenseform/${text._id}` }>
              <EditOutlined style={ { color: "green" } } />
            </Link>
          </div>
        ),
      });
    }

    return baseColumns;
  }, [userPermissions, handleViewExpense, deleteProjectExpences]);

  return (
    <>
      <div className="ant-project-task all-project-main-wrapper positive-feedback-review">
        <Card>


          <div class="heading-wrapper"><h2>Project Expense</h2>
            { userPermissions.canAddExpense && (
              <Link to={ `/${companySlug}/add/projectexpenseform` }>
                <Button type="primary" className="square-primary-btn">
                  Add Project Expense
                </Button>
              </Link>
            ) }
          </div>


          <div className="global-search">


            <div className="filter-btn-wrapper">

              { ProjectFilter }
              { TechnologyFilter }
              { ManagerFilter }
              { AccountManagerFilter }
              <Popover
                trigger="click"
                visible={ popOver.need_to_bill_customer }
                onVisibleChange={ (visible) => handleVisibleChange("need_to_bill_customer", visible) }
                placement="bottomRight"
                content={
                  <div className="right-popover-wrapper">
                    <ul className="assigness-data">
                      <Radio.Group
                        onChange={ (e) => handleReviewTypeFilter(e.target.value) }
                        value={ need_to_bill_customer }
                      >
                        <li>
                          <Radio value="All">All</Radio>
                        </li>
                        <li>
                          <Radio value="Yes">Yes</Radio>
                        </li>
                        <li>
                          <Radio value="No">No</Radio>
                        </li>
                      </Radio.Group>
                    </ul>
                    <div className="popver-footer-btn">
                      <Button
                        type="primary"
                        className="square-primary-btn ant-btn-primary"
                        onClick={ () => {
                          getprojectexpencesList();
                          handleVisibleChange("need_to_bill_customer", false);
                        } }
                      >
                        Apply
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={ () => handleVisibleChange("need_to_bill_customer", false) }
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                }
              >
                <Button className="dropdown-button">
                  <span className="filter-text">
                    <span>Need to Bill Customer:</span>
                    <span>
                      { need_to_bill_customer === "All"
                        ? "All"
                        : need_to_bill_customer === "Yes"
                          ? "Yes"
                          : "No" }
                    </span>
                  </span>
                </Button>
              </Popover>

              <Button
                className="mr2"
                id="exportButton"
                disabled={ pagination.total === 0 }
                onClick={ exportCSV }
              >
                Export CSV
              </Button>
            </div>
          </div>


          <Table
          tableLayout="auto"
            pagination={ {
              showSizeChanger: true,
              pageSizeOptions: PAGINATION_OPTIONS,
              showTotal: showTotal,
              ...pagination,
            } }
            columns={ columns }
            onChange={ handleTableChange }
            dataSource={ projectexpencesList }
          />
        </Card>
      </div>

      <Modal
        width="600px"
        title="Project Expense Details"
        destroyOnClose
        onCancel={ handleModalClose }
        open={ isModalOpenTopic }
        footer={ null }
      >
        <Form form={ formDetail } layout="vertical" style={ { padding: '20px' } }>
          <Form.Item
            label={ <Text strong>Purchase Request Details</Text> }
            name="purchase_request_details"
          >
            <Input.TextArea
              placeholder="Enter purchase request details"
              rows={ 4 }
              disabled
              className="border-gray-300"
            />
          </Form.Item>

          { viewData?.details && (
            <Form.Item
              label={ <Text strong>Accounting Details</Text> }
              name="details"
            >
              <Input.TextArea
                placeholder="Accounting details"
                rows={ 4 }
                disabled
                className="border-gray-300"
              />
            </Form.Item>
          ) }

          { viewData?.nature_Of_expense && (
            <Form.Item
              label={ <Text strong>Nature Of Expense</Text> }
              name="nature_Of_expense"
            >
              <Input.TextArea
                placeholder="Nature Of Expense"
                rows={ 4 }
                disabled
                className="border-gray-300"
              />
            </Form.Item>
          ) }

          { viewData?.projectexpences?.length > 0 && (
            <Row align="middle" style={ { marginTop: 16 } }>
              <Col>
                <Text strong>Document: </Text>
                <a
                  href={ `${process.env.REACT_APP_API_URL}/public/projectexpense/${viewData?.projectexpences}` }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  <FileTextOutlined style={ { marginRight: 5 } } />
                  { viewData?.projectexpences }
                </a>
              </Col>
            </Row>
          ) }
        </Form>
      </Modal>
    </>
  );
};

export default Projectexpences;