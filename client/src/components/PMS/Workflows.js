import React, { useState, useRef, useEffect } from "react";
import {
  Table,
  Button,
  Popconfirm,
  Form,
  message,
  Modal,
  Row,
  Col,
  Card,
  Input,
} from "antd";
import { AiOutlineDelete } from "react-icons/ai";
import Search from "antd/lib/input/Search";
import Service from "../../service";
import { useDispatch } from "react-redux";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
import {
  EditOutlined,
  PlusOutlined,
  NodeIndexOutlined,
} from "@ant-design/icons";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import "./settings.css";

function Workflows() {
  const companySlug = localStorage.getItem("companyDomain");
  const history = useHistory();

  const dispatch = useDispatch();
  const searchRef = useRef();
  const [addform] = Form.useForm();

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [searchText, setSearchText] = useState("");
  const [workflowList, setWorkflowList] = useState([]);
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortColumn, setSortColumn] = useState("project_workflow");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const columns = [
    {
      title: "Work flows",
      dataIndex: "project_workflow",
      key: "project_workflow",
      width: 700,
      render: (text, record) => {
        const position = record?.project_workflow?.trim();
        return (
          <span style={{ textTransform: "capitalize", fontWeight: 500 }}>
            {position}
          </span>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "action",
      width: 200,
      render: (text, record) => (
        <div className="edit-delete">
          <Button
            type="link"
            className="pe-action-btn"
            icon={<EditOutlined />}
            onClick={() =>
              history.push(`/${companySlug}/workflow-stages/${record._id}`)
            }
            title="Edit stages"
          />
          {(!Object.keys(record).includes("isDefault") ||
            record?.isDefault === false) && (
            <Popconfirm
              title="Do you really want to delete this Workflow?"
              okText="Yes"
              cancelText="No"
              onConfirm={() => handleDeleteWorkflow(record._id)}
            >
              <Button type="link" className="pe-action-btn" danger>
                <AiOutlineDelete />
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const getListWorkflow = async () => {
    try {
      setIsLoading(true);
      const reqBody = {
        isDropdown: false,
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getworkflow,
        body: reqBody,
      });
      if (response?.data?.data?.length > 0) {
        setPagination({ ...pagination, total: response.data.metadata.total });
        setWorkflowList(response.data.data);
      } else {
        setWorkflowList([]);
        setPagination((p) => ({ ...p, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const addWorkflowDetails = async (values) => {
    try {
      setIsSubmitting(true);
      let token = localStorage.getItem("accessToken");
      const reqBody = {
        project_workflow: values.project_workflow?.trim(),
        status: "active",
      };
      const headers = { token };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addworkflow,
        body: reqBody,
        headers: headers,
      });
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        addform.resetFields();
        getListWorkflow();
        setIsModalOpen(false);
      } else {
        message.error(response.data.message);
      }
      setIsSubmitting(false);
    } catch (error) {
      console.log(error);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    addform.resetFields();
  };

  const handleTableChange = (page, filters, sorter) => {
    setPagination({ ...pagination, ...page });
    const { field, order } = sorter;
    if (order) setSortOrder(order === "ascend" ? "asc" : "desc");
    if (field) setSortColumn(field ?? "project_workflow");
  };

  const handleDeleteWorkflow = async (val) => {
    try {
      const reqBody = { projectWorkFlowId: val };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.deleteWorkflow,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        const isLastItemOnPage =
          workflowList.length === 1 && pagination.current > 1;
        if (isLastItemOnPage) {
          setPagination((prev) => ({ ...prev, current: prev.current - 1 }));
        }
        getListWorkflow();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getListWorkflow();
  }, [searchText, pagination.current, pagination.pageSize, sortOrder, sortColumn]); // eslint-disable-line react-hooks/exhaustive-deps

  const SkeletonTable = () => (
    <div className="ps-skeleton-wrap">
      <div
        className="ps-skeleton-row"
        style={{ background: "#f8fafb", borderBottom: "1px solid #edf0f4" }}
      >
        <div className="ps-shimmer" style={{ width: "50%", height: 12 }} />
        <div
          className="ps-shimmer"
          style={{ width: "12%", height: 12, marginLeft: "auto" }}
        />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="ps-skeleton-row" key={i}>
          <div
            className="ps-shimmer"
            style={{ width: `${35 + Math.random() * 30}%` }}
          />
          <div
            className="ps-shimmer"
            style={{ width: "10%", marginLeft: "auto" }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <Card className="ps-page">
      <div className="heading-wrapper">
        <div className="heading-main">
          <h2>
            <span>
              <NodeIndexOutlined />
            </span>
            WorkFlows
          </h2>
        </div>
        <div className="ps-header-right">
          <Button
            className="add-btn"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Workflow
          </Button>
        </div>
      </div>

      <Card className="main-content-wrapper">
        <div className="global-search">
          <Search
            ref={searchRef}
            placeholder="Search workflows..."
            onSearch={onSearch}
            onChange={(e) => onSearch(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
        </div>

        {isLoading ? (
          <SkeletonTable />
        ) : (
          <div className="block-table-content">
            <Table
              columns={columns}
              dataSource={workflowList}
              rowKey="_id"
              footer={() => (
                <span>
                  Total Records:{" "}
                  {pagination.total > 0 ? pagination.total : 0}
                </span>
              )}
              pagination={{
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "25", "30"],
                ...pagination,
              }}
              onChange={handleTableChange}
            />
          </div>
        )}
      </Card>

      <Modal
        open={isModalOpen}
        onCancel={handleCancel}
        title={
          <>
            <NodeIndexOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />
            Add WorkFlow
          </>
        }
        className="ps-modal"
        width="100%"
        style={{ maxWidth: 480 }}
        footer={[
          <Button key="cancel" className="delete-btn" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button
            type="primary"
            key="submit"
            className="add-btn"
            onClick={() => addform.submit()}
            loading={isSubmitting}
          >
            Save
          </Button>,
        ]}
      >
        <Form form={addform} layout="vertical" onFinish={addWorkflowDetails}>
          <Row gutter={[24, 0]}>
            <Col xs={24}>
              <Form.Item
                name="project_workflow"
                label="Workflow Name"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Please enter a valid workflow name",
                  },
                ]}
              >
                <Input
                  autoComplete="off"
                  size="large"
                  placeholder="e.g. Development, Testing"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}

export default Workflows;
