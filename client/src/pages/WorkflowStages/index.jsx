import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  message,
  Card,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  NodeIndexOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import Service from "../../service";
import Search from "antd/lib/input/Search";
import "../../components/PMS/settings.css";

const { Option } = Select;

const DEFAULT_STAGE_COLOR = "#64748b";
const SKELETON_ROWS = 6;

function SkeletonTable() {
  return (
    <div className="ps-skeleton-wrap">
      <div className="ps-skeleton-row" style={{ background: "#f8fafb", borderBottom: "1px solid #edf0f4" }}>
        <div className="ps-shimmer" style={{ width: "50%", height: 12 }} />
        <div className="ps-shimmer" style={{ width: "12%", height: 12, marginLeft: "auto" }} />
      </div>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div className="ps-skeleton-row" key={i}>
          <div className="ps-shimmer" style={{ width: `${35 + Math.random() * 35}%` }} />
          <div className="ps-shimmer" style={{ width: "10%", marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}

function WorkflowStages() {
  const searchRef = useRef();
  const [workflows, setWorkflows] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 25 });
  const [form] = Form.useForm();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setPagination((prev) => ({ ...prev, current: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadWorkflows = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getworkflow,
        body: {
          isDropdown: true,
          pageNo: 1,
          limit: 200,
        },
      });
      const list = Array.isArray(response?.data?.data) ? response.data.data : [];
      setWorkflows(list);
    } catch (error) {
      setWorkflows([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        pageNo: String(pagination.current || 1),
        limit: String(pagination.pageSize || 25),
        search: debouncedSearchText || "",
      }).toString();

      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.listWorkflowStages}?${query}`,
      });

      const list = Array.isArray(response?.data?.data) ? response.data.data : [];
      const meta = response?.data?.metaData || response?.data?.metadata || {};
      setRows(
        list.map((stage) => ({
          key: stage?._id,
          stageId: stage?._id,
          stageTitle: stage?.title || "",
          color: stage?.color || DEFAULT_STAGE_COLOR,
          isDefault: Boolean(stage?.isDefault),
          sequence: stage?.sequence ?? 0,
          workflowId: stage?.workflow_id,
          workflowName: stage?.workflow_name || "-",
        }))
      );
      setPagination((prev) => ({
        ...prev,
        total: Number(meta?.total || 0),
        current: Number(meta?.pageNo || prev.current || 1),
        pageSize: Number(meta?.limit || prev.pageSize || 25),
      }));
    } catch (error) {
      message.error("Failed to load workflow stages");
      setRows([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, debouncedSearchText]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = () => {
    setEditingStage(null);
    form.setFieldsValue({
      workflow_id: workflows?.[0]?._id || undefined,
      title: "",
      color: DEFAULT_STAGE_COLOR,
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingStage(row);
    form.setFieldsValue({
      workflow_id: row.workflowId,
      title: row.stageTitle,
      color: row.color || DEFAULT_STAGE_COLOR,
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteworkflowStatus}/${row.stageId}`,
      });
      if (response?.data?.status) {
        message.success(response?.data?.message || "Stage deleted");
        loadData();
      } else {
        message.error(response?.data?.message || "Failed to delete stage");
      }
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to delete stage");
    }
  };

  const submitModal = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        workflow_id: values.workflow_id,
        title: String(values.title || "").trim(),
        color: values.color || DEFAULT_STAGE_COLOR,
      };
      setModalSubmitting(true);

      const response = await Service.makeAPICall({
        methodName: editingStage ? Service.putMethod : Service.postMethod,
        api_url: editingStage
          ? `${Service.updateworkflowStatus}/${editingStage.stageId}`
          : Service.addworkflowStatus,
        body: payload,
      });

      if (response?.data?.status) {
        message.success(response?.data?.message || (editingStage ? "Stage updated" : "Stage created"));
        setModalOpen(false);
        form.resetFields();
        setEditingStage(null);
        setPagination((prev) => ({ ...prev, current: 1 }));
        loadData();
      } else {
        message.error(response?.data?.message || "Failed to save stage");
      }
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || "Failed to save stage");
    } finally {
      setModalSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Workflow",
      dataIndex: "workflowName",
      key: "workflowName",
      width: 260,
    },
    {
      title: "Stage",
      dataIndex: "stageTitle",
      key: "stageTitle",
    },
    {
      title: "Color",
      dataIndex: "color",
      key: "color",
      width: 130,
      render: (color) => (
        <Space>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: color || DEFAULT_STAGE_COLOR,
              border: "1px solid #d1d5db",
            }}
          />
          <span>{color || DEFAULT_STAGE_COLOR}</span>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "isDefault",
      key: "isDefault",
      width: 110,
      render: (isDefault) => (isDefault ? <Tag color="blue">Default</Tag> : <Tag>Custom</Tag>),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, row) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(row)} disabled={row?.isDefault} />
          <Popconfirm
            title="Delete this stage?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDelete(row)}
            disabled={row.isDefault}
          >
            <Button type="text" danger icon={<DeleteOutlined />} disabled={row?.isDefault} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card className="ps-page">
      <div className="heading-wrapper">
        <div className="heading-main">
          <h2>
            <span>
              <NodeIndexOutlined />
            </span>
            Task Stages
          </h2>
        </div>
        <div className="ps-header-right">
          <Button className="add-btn" type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            Add Stage
          </Button>
        </div>
      </div>

      <Card className="main-content-wrapper">
        <div className="global-search">
          <Search
            ref={searchRef}
            placeholder="Search workflow or stage..."
            onSearch={(value) => {
              setSearchText(value);
            }}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
        </div>

        {loading ? (
          <SkeletonTable />
        ) : (
          <div className="block-table-content">
            <Table
              rowKey="key"
              columns={columns}
              dataSource={rows}
              onChange={(page) =>
                setPagination((prev) => ({
                  ...prev,
                  current: page.current,
                  pageSize: page.pageSize,
                }))
              }
              footer={() => <span>Total Records: {pagination.total > 0 ? pagination.total : 0}</span>}
              pagination={{
                current: pagination.current,
                total: pagination.total,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ["25", "50", "100"],
              }}
            />
          </div>
        )}
      </Card>
      <Modal
        open={modalOpen}
        title={
          <>
            <NodeIndexOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />
            {editingStage ? "Edit Stage" : "Add Stage"}
          </>
        }
        className="ps-modal"
        width="100%"
        style={{ maxWidth: 520 }}
        onCancel={() => {
          setModalOpen(false);
          setEditingStage(null);
          form.resetFields();
        }}
        footer={[
          <Button
            key="cancel"
            className="delete-btn"
            onClick={() => {
              setModalOpen(false);
              setEditingStage(null);
              form.resetFields();
            }}
          >
            Cancel
          </Button>,
          <Button
            type="primary"
            key="submit"
            className="add-btn"
            onClick={submitModal}
            loading={modalSubmitting}
          >
            Save
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ color: DEFAULT_STAGE_COLOR }}
        >
          <Row gutter={[24, 0]}>

            <Col xs={24}>
              <Form.Item
                name="workflow_id"
                label="Workflow"
                rules={[
                  { required: true, message: "Please select workflow" },
                ]}
              >
                <Select placeholder="Select workflow">
                  {workflows.map((workflow) => (
                    <Option
                      key={workflow?._id}
                      value={workflow?._id}
                    >
                      {workflow?.project_workflow || "-"}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="title"
                label="Stage Name"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Please enter stage name",
                  },
                ]}
              >
                <Input placeholder="e.g. In Review" maxLength={60} />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="color"
                label="Color"
                rules={[
                  { required: true, message: "Please choose color" },
                ]}
              >
                <Input type="color" />
              </Form.Item>
            </Col>

          </Row>
        </Form>
      </Modal>
    </Card>
  );
}

export default WorkflowStages;
