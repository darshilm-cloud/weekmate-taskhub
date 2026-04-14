import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Card,
  message,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
} from "@ant-design/icons";
import Password from "antd/es/input/Password";
import Service from "../../service";

const Administrator = () => {
  const [admin, setAdmin] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit' | 'view'
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");

  // 🔍 Fetch Admin List
  const getAdminList = async ({ page = 1, limit = 20, search = "" } = {}) => {
    try {
      setLoading(true);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getAdminList,
        body: {
          page,
          limit,
          search,
        },
      });

      // Fix: Use the correct data structure from API response
      const adminData = response?.data.data || [];
      const metaData = response?.data.metadata || {};

      setAdmin(adminData);
      setPagination({
        current: metaData?.currentPage || page,
        pageSize: metaData?.limit || limit,
        total: metaData?.total || 0,
      });
    } catch (error) {
      console.error("Failed to fetch admins:", error);
      message.error("Failed to fetch admin list");
    } finally {
      setLoading(false);
    }
  };

  // ➕ Add New Admin
  const addAdmin = async (values) => {
    try {
      const { email, first_name, last_name, password } = values;

      await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addAdmin,
        body: {
          email,
          firstName: first_name,
          lastName: last_name,
          password,
        },
      });

      message.success("Admin added successfully");
      handleModalClose();
      // Reset to first page after adding new admin
      getAdminList({ page: 1, limit: pagination.pageSize, search: searchText });
    } catch (error) {
      console.error("Add admin failed:", error.response.data?.message);

      message.error(error.response.data?.message || "Failed to add admin");
    }
  };

  // ✏️ Update Existing Admin
  const updateAdmin = async (values) => {
    try {
      const { email, first_name, last_name, password } = values;
      await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.editAdminList}/${selectedAdmin._id}`,
        body: {
          email,
          firstName: first_name,
          lastName: last_name,
          password,
        },
      });

      message.success("Admin updated successfully");
      handleModalClose();
      // Stay on current page after update
      getAdminList({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
      });
    } catch (error) {
      console.error("Update failed:", error);
      message.error("Failed to update admin");
    }
  };

  // ❌ Delete Admin
  const handleDelete = async (id) => {
    try {
      await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteAdmin}/${id}`,
      });

      message.success("Admin deleted");

      // Handle pagination after delete
      const newTotal = pagination.total - 1;
      const maxPage = Math.ceil(newTotal / pagination.pageSize);
      const targetPage =
        pagination.current > maxPage
          ? Math.max(1, maxPage)
          : pagination.current;

      getAdminList({
        page: targetPage,
        limit: pagination.pageSize,
        search: searchText,
      });
    } catch (error) {
      console.error("Delete failed:", error);
      message.error("Failed to delete admin");
    }
  };

  // 🎯 Show Modal for Add/Edit/View
  const showAddEditModal = (record = null, mode = "add") => {
    setSelectedAdmin(record);
    setModalMode(mode);
    setIsModalVisible(true);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
  };

  // ✋ Close Modal
  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedAdmin(null);
    form.resetFields();
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
    // Reset to first page when searching
    getAdminList({ page: 1, limit: pagination.pageSize, search: value });
  };

  // Handle table change (pagination, sorting, filtering)
  const handleTableChange = (paginationInfo, filters, sorter) => {
    getAdminList({
      page: paginationInfo.current,
      limit: paginationInfo.pageSize,
      search: searchText,
    });
  };

  useEffect(() => {
    getAdminList();
  }, []);

  // 🧱 Table Columns
  const columns = [
    {
      title: "First Name",
      dataIndex: "first_name",
    },
    {
      title: "Last Name",
      dataIndex: "last_name",
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Company Email",
      dataIndex: "companyEmail",
      render: (text, record) => {
        return text || record.companyEmail || "No Company Registered";
      },
    },
    {
      title: "Company Name",
      dataIndex: "companyName",
      render: (text, record) => {
        return text || record.companyName || "No Company Registered";
      },
    },
    {
      title: "Total Employee",
      dataIndex: "totalEmp",
      render: (text, record) => {
        // Show employee count only if company exists, otherwise show '-'
        return record.companyName || text ? text || 0 : "-";
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      render: (text, record) => {
        if (!text) return "-";
        const date = new Date(text);
        const formattedDate = `${String(date.getDate()).padStart(
          2,
          "0"
        )}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}-${date.getFullYear()}`;
        return formattedDate;
      },
    },
    {
      title: "Last Login Date",
      dataIndex: "lastActiveTime",
      render: (text, record) => {
        // const dateStr = Array.isArray(text) && text.length > 0 ? text[0] : null;
        // if (!dateStr) return '-';

        const date = new Date(record?.lastActiveTime);
        const formattedDate = `${String(date.getDate()).padStart(
          2,
          "0"
        )}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}-${date.getFullYear()}`;
        return formattedDate;
      },
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View">
            <Button
              className="view-btn"
              icon={<EyeOutlined />}
              onClick={() => showAddEditModal(record, "view")}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              className="edit-btn"
              icon={<EditOutlined />}
              onClick={() => showAddEditModal(record, "edit")}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button className="delete-btn" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div className="heading-wrapper">
          <h2>Admin Management</h2>
          <div className="add-button">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showAddEditModal(null, "add")}
            >
              Add Admin
            </Button>
          </div>
        </div>

        <div className="global-search">
          <Input.Search
            placeholder="Search admin"
            allowClear
            onSearch={handleSearch}
            onChange={(e) => {
              // Handle clear button
              if (!e.target.value) {
                handleSearch("");
              }
            }}
            style={{ width: 300 }}
          />
        </div>

        {/* 📋 Admin Table */}
        <Table
          columns={columns}
          dataSource={admin}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            // showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} records`,
            pageSizeOptions: ["10", "20", "30"],
          }}
          onChange={handleTableChange}
        />

        {/* 🧾 Add/Edit/View Modal */}
        <Modal
          title={
            modalMode === "view"
              ? "View Admin"
              : modalMode === "edit"
              ? "Edit Admin"
              : "Add New Admin"
          }
          open={isModalVisible}
          onCancel={handleModalClose}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              modalMode === "edit" ? updateAdmin(values) : addAdmin(values);
            }}
          >
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true }]}
            >
              <Input disabled={modalMode === "view"} />
            </Form.Item>

            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true }]}
            >
              <Input disabled={modalMode === "view"} />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: "email" }]}
            >
              <Input disabled={modalMode === "view"} />
            </Form.Item>

            {modalMode !== "view" && (
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: modalMode === "add" },
                  {
                    validator: (_, value) => {
                      if (value && /\s/.test(value)) {
                        return Promise.reject(
                          new Error("Password should not contain spaces")
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Password autoComplete="new-password" />
              </Form.Item>
            )}

            {modalMode !== "view" && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="primary" htmlType="submit">
                  {modalMode === "edit" ? "Update" : "Add"}
                </Button>
              </div>
            )}
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default Administrator;
