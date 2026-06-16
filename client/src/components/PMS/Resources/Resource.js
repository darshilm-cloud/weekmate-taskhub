import React, { useEffect, useState, useRef } from "react";
import {
  Button,
  Form,
  message,
  Table,
  Modal,
  Input,
  Card,
  Popconfirm,
  Space,
  Tooltip,
} from "antd";
import Search from "antd/lib/input/Search";
import {
  PlusOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import Service from "../../../service";
import "../settings.css";

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

function Resource() {
  const searchRef = useRef();
  const [form] = Form.useForm();

  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [editingRecord, setEditingRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [ResourceList, setResourcelist] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 10 });

  const onSearch = (value) => {
    setSearchText(value);
    setPagination((p) => ({ ...p, current: 1 }));
  };

  useEffect(() => {
    getResourceList();
  }, [searchText, pagination.current, pagination.pageSize]);

  const getResourceList = async () => {
    try {
      setIsLoading(true);
      const reqBody = { limit: pagination.pageSize, pageNo: pagination.current, search: searchText };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getResource,
        body: reqBody,
      });
      if (response?.data?.data?.length > 0) {
        setPagination((p) => ({ ...p, total: response.data.metadata.total }));
        setResourcelist(response.data.data);
      } else {
        setResourcelist([]);
        setPagination((p) => ({ ...p, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setModalMode("add");
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setModalMode("edit");
    setEditingRecord(record);
    form.setFieldsValue({ resource_name: record.resource_name });
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    form.resetFields();
    setEditingRecord(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      if (modalMode === "add") {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.addResource,
          body: { resource_name: values.resource_name.trim() },
        });
        if (response?.data?.status) {
          message.success(response.data.message || "Resource added");
          handleCancel();
          getResourceList();
        } else {
          message.error(response?.data?.message || "Failed to add resource");
        }
      } else {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.editResource,
          body: { resourceId: editingRecord._id, resource_name: values.resource_name.trim() },
        });
        if (response?.data?.status) {
          message.success(response.data.message || "Resource updated");
          handleCancel();
          getResourceList();
        } else {
          message.error(response?.data?.message || "Failed to update resource");
        }
      }
    } catch (error) {
      message.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.deleteResource,
        body: { resourceId: record._id },
      });
      if (response?.data?.status) {
        message.success(response.data.message || "Resource deleted");
        getResourceList();
      } else {
        message.error(response?.data?.message || "Failed to delete resource");
      }
    } catch (error) {
      message.error("Something went wrong");
    }
  };

  const columns = [
    {
      title: "Resource Name",
      dataIndex: "resource_name",
      key: "resource_name",
      render: (text, record) => (
        <span style={{ textTransform: "capitalize" }}>
          {record?.resource_name?.trim().replaceAll("_", " ")}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => {
        const isDefault = record.isDefault;
        return (
          <Space size={6}>
            <Tooltip title={isDefault ? "Default resources cannot be edited" : "Edit"}>
              <button
                className="ps-action-btn edit"
                onClick={() => !isDefault && openEditModal(record)}
                aria-label="Edit resource"
                disabled={isDefault}
                style={{ opacity: isDefault ? 0.35 : 1, cursor: isDefault ? "not-allowed" : "pointer" }}
              >
                <EditOutlined style={{ fontSize: 14, color: "#2e7d32" }} />
              </button>
            </Tooltip>
            <Popconfirm
              title="Delete this resource?"
              description="This action cannot be undone."
              onConfirm={() => handleDelete(record)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              disabled={isDefault}
            >
              <Tooltip title={isDefault ? "Default resources cannot be deleted" : "Delete"}>
                <button
                  className="ps-action-btn delete"
                  aria-label="Delete resource"
                  disabled={isDefault}
                  style={{ opacity: isDefault ? 0.35 : 1, cursor: isDefault ? "not-allowed" : "pointer" }}
                >
                  <DeleteOutlined style={{ fontSize: 14, color: "#c62828" }} />
                </button>
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Card className="ps-page">
      <div className="heading-wrapper">
        <div className="heading-main">
          <h2>
            <span><TeamOutlined /></span>
            Resources
          </h2>
        </div>
        <div className="ps-header-right">
          <Button className="add-btn" type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            Add Resource
          </Button>
        </div>
      </div>

      <Card className="main-content-wrapper">
        <div className="global-search">
          <Search
            ref={searchRef}
            placeholder="Search resources..."
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
              dataSource={ResourceList}
              rowKey="_id"
              footer={() => <span>Total Records: {pagination.total > 0 ? pagination.total : 0}</span>}
              onChange={(page) => setPagination({ ...pagination, ...page })}
              pagination={{ showSizeChanger: true, pageSizeOptions: ["10", "20", "25", "30"], ...pagination }}
            />
          </div>
        )}
      </Card>

      <Modal
        open={isModalOpen}
        onCancel={handleCancel}
        title={
          <>
            <TeamOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />
            {modalMode === "add" ? "Add Resource" : "Edit Resource"}
          </>
        }
        className="ps-modal"
        width={480}
        footer={[
          <Button key="cancel" className="delete-btn" onClick={handleCancel} disabled={submitting}>Cancel</Button>,
          <Button key="submit" type="primary" className="add-btn" loading={submitting} onClick={() => form.submit()}>
            {modalMode === "add" ? "Save" : "Update"}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="resource_name"
            label="Resource Name"
            rules={[{ required: true, whitespace: true, message: "Please enter a valid resource name" }]}
          >
            <Input autoComplete="off" size="large" placeholder="e.g. Design, Backend, QA" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default Resource;
