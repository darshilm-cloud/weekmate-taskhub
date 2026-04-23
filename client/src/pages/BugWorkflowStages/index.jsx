import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from "antd";
import { DeleteOutlined, EditOutlined, NodeIndexOutlined, PlusOutlined } from "@ant-design/icons";
import Service from "../../service";
import GlobalSearchInput from "../../components/common/GlobalSearchInput";
import "../../components/PMS/settings.css";

const DEFAULT_STAGE_COLOR = "#64748b";
const SKELETON_ROWS = 6;
const PROTECTED_DEFAULT_BUG_STAGE_TITLES = [
  "open",
  "in progress",
  "to be tested",
  "on hold",
  "closed",
];

const isProtectedDefaultStage = (stage) => {
  if (stage?.isDefault) return true;
  const title = String(stage?.title || "").trim().toLowerCase();
  return PROTECTED_DEFAULT_BUG_STAGE_TITLES.includes(title);
};

function SkeletonTable() {
  return (
    <div className="ps-skeleton-wrap">
      <div className="ps-skeleton-row ps-skeleton-header-row">
        <div className="ps-shimmer" style={{ width: "50%", height: 12 }} />
      </div>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div className="ps-skeleton-row" key={i}>
          <div className="ps-shimmer" style={{ width: `${35 + Math.random() * 35}%` }} />
        </div>
      ))}
    </div>
  );
}

function BugWorkflowStages() {
  const searchRef = useRef();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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

  const loadBugStages = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        pageNo: String(pagination.current || 1),
        limit: String(pagination.pageSize || 25),
        search: debouncedSearchText || "",
      }).toString();
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.listBugWorkflowStatus}?${query}`,
      });
      const list = Array.isArray(response?.data?.data) ? response.data.data : [];
      const meta = response?.data?.metaData || response?.data?.metadata || {};
      setRows(
        list.map((stage) => ({
          key: stage?._id,
          _id: stage?._id,
          title: stage?.title || "",
          color: stage?.color || DEFAULT_STAGE_COLOR,
          sequence: Number(stage?.sequence || 0),
          isDefault: Boolean(stage?.isDefault),
        }))
      );
      setPagination((prev) => ({
        ...prev,
        total: Number(meta?.total || 0),
        current: Number(meta?.pageNo || prev.current || 1),
        pageSize: Number(meta?.limit || prev.pageSize || 25),
      }));
    } catch (error) {
      message.error("Failed to load bug stages");
      setRows([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, debouncedSearchText]);

  useEffect(() => {
    loadBugStages();
  }, [loadBugStages]);

  const openCreate = () => {
    setEditingStage(null);
    form.setFieldsValue({ title: "", color: DEFAULT_STAGE_COLOR });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    if (isProtectedDefaultStage(row)) {
      message.info("Default bug stages cannot be edited");
      return;
    }
    setEditingStage(row);
    form.setFieldsValue({
      title: row.title,
      color: row.color || DEFAULT_STAGE_COLOR,
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (isProtectedDefaultStage(row)) {
      message.info("Default bug stages cannot be deleted");
      return;
    }
    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteBugWorkflowStatus}/${row._id}`,
      });
      if (response?.data?.status) {
        message.success(response?.data?.message || "Bug stage deleted");
        loadBugStages();
      } else {
        message.error(response?.data?.message || "Failed to delete bug stage");
      }
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to delete bug stage");
    }
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        title: String(values?.title || "").trim(),
        color: values?.color || DEFAULT_STAGE_COLOR,
      };
      const response = await Service.makeAPICall({
        methodName: editingStage ? Service.putMethod : Service.postMethod,
        api_url: editingStage
          ? `${Service.updateBugWorkflowStatus}/${editingStage._id}`
          : Service.addBugWorkflowStatus,
        body: payload,
      });

      if (response?.data?.status) {
        message.success(
          response?.data?.message || (editingStage ? "Bug stage updated" : "Bug stage created")
        );
        setModalOpen(false);
        setEditingStage(null);
        form.resetFields();
        setPagination((prev) => ({ ...prev, current: 1 }));
        loadBugStages();
      } else {
        message.error(response?.data?.message || "Failed to save bug stage");
      }
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || "Failed to save bug stage");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Stage",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Color",
      dataIndex: "color",
      key: "color",
      width: 140,
      render: (color) => (
        <Space>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: color || DEFAULT_STAGE_COLOR,
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
      width: 120,
      render: (_, row) =>
        isProtectedDefaultStage(row) ? <Tag color="blue">Default</Tag> : <Tag>Custom</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, row) => {
        const isProtected = isProtectedDefaultStage(row);
        return (
          <Space>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(row)}
              disabled={isProtected}
            />
          <Popconfirm
            title="Delete this bug stage?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDelete(row)}
            disabled={isProtected}
          >
              <Button type="text" danger icon={<DeleteOutlined />} disabled={isProtected} />
          </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="ps-page">
      <div className="ps-card">
        <div className="ps-header">
          <h2 className="ps-title">
            <span className="ps-title-icon">
              <NodeIndexOutlined />
            </span>
            Bug Stages
          </h2>
          <div className="ps-header-right">
            <Button className="add-btn" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add Bug Stage
            </Button>
          </div>
        </div>

        <div className="ps-search">
          <GlobalSearchInput
            ref={searchRef}
            placeholder="Search bug stages..."
            value={searchText}
            onChange={setSearchText}
            onSearch={(value) => {
              setSearchText(value);
            }}
            className="ps-search-input"
            style={{ width: 260 }}
          />
        </div>

        {loading ? (
          <SkeletonTable />
        ) : (
          <div className="ps-table-wrap">
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
      </div>

      <Modal
        open={modalOpen}
        title={
          <>
            <NodeIndexOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />
            {editingStage ? "Edit Bug Stage" : "Add Bug Stage"}
          </>
        }
        className="ps-modal"
        width={500}
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
          <Button key="submit" className="add-btn" onClick={submit} loading={submitting}>
            Save
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" initialValues={{ color: DEFAULT_STAGE_COLOR }}>
          <Form.Item
            name="title"
            label="Stage Name"
            rules={[{ required: true, whitespace: true, message: "Please enter stage name" }]}
          >
            <Input placeholder="e.g. In Testing" maxLength={60} />
          </Form.Item>
          <Form.Item
            name="color"
            label="Color"
            rules={[{ required: true, message: "Please choose color" }]}
          >
            <Input type="color" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default BugWorkflowStages;
