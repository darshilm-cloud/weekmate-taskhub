import React, { useEffect, useRef, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Card,
  message,
  Radio,
  Row,
  Col,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import exampleCSV from "../../../src/sampleCSV.csv";
import Service from "../../service";
import { useHistory } from "react-router-dom";

const CompanyEmployee = () => {
  const history = useHistory();
  const [form] = Form.useForm();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [modalMode, setModalMode] = useState("add");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Extract company ID from localStorage safely
  const userData = JSON.parse(localStorage.getItem("user_data"));
  const companyId = userData?.companyId;
  const inputRef = useRef(null);

  const fetchEmployees = async (page = 1, limit = 20, search = "") => {
    setLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsersList,
        body: {
          page,
          limit,
          search,
        },
      });

      setEmployees(res.data.data || []);
      setPagination({
        current: res.data.metadata?.currentPage || page,
        pageSize: res.data.metadata?.limit || limit,
        total: res.data.metadata?.total || 0,
      });

      if (res.data?.data?.length === 0) {
        return message.success(res.data?.data?.message || "No data found");
      }
    } catch (err) {
      message.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append("attachment", file);
  
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.importUsers,
        body: formData,
        options: {
          "content-type": "multipart/form-data",
        },
      });
  
      if (response.status == 200) {
        fetchEmployees();
      } else {
        // Handle non-200 responses - create CSV from response data
        if (response.data) {
          let csvContent = "";
          let filename = "invalid_users.csv";
  
          // Check if response.data is text (assuming it's CSV-like data)
          if (typeof response.data === 'string') {
            csvContent = response.data;
          } else if (typeof response.data === 'object') {
            // Convert object to CSV format
            const headers = Object.keys(response.data);
            csvContent = headers.join(',') + '\n';
            
            if (Array.isArray(response.data)) {
              // If it's an array of objects
              response.data.forEach(row => {
                const values = headers.map(header => {
                  const value = row[header] || '';
                  // Escape commas and quotes in CSV
                  return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                    ? `"${value.replace(/"/g, '""')}"` 
                    : value;
                });
                csvContent += values.join(',') + '\n';
              });
            } else {
              // If it's a single object
              const values = headers.map(header => {
                const value = response.data[header] || '';
                return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                  ? `"${value.replace(/"/g, '""')}"` 
                  : value;
              });
              csvContent += values.join(',') + '\n';
            }
          }
  
          // Create and download CSV file
          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
  
          message.warning("Upload completed with errors. CSV downloaded.");
          fetchEmployees();
        } else {
          message.error("Upload failed - no data received.");
        }
      }
    } catch (err) {
      // Simplified catch block - just handle general errors
      message.error("Upload failed. Please try again.");
    }
  
    e.target.value = "";
  };

  const exportSampleCSVfile = () => {
    const link = document.createElement("a");
    link.setAttribute("href", exampleCSV);
    link.setAttribute("download", "sampleCSV.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const showAddEditModal = (record = null, mode = "add") => {
    setModalMode(mode);
    setEditData(record);
    setModalVisible(true);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        firstName: values.first_name,
        lastName: values.last_name,
        companyId,
        isActivate: values.isActivate,
        email: values.email,
        password: values.password
      };

      if (editData) {
        await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: `${Service.editUser}/${editData._id}`,
          body: payload
        });
        message.success("Employee updated successfully");
      } else {
        await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.addUser,
          body: payload
        });
        message.success("Employee added successfully");
      }

      setModalVisible(false);
      fetchEmployees(pagination.current, pagination.pageSize, searchText);
    } catch (err) {
      message.error(err?.response?.data?.message || "Something went wrong");
    }
  };

  const handleDelete = async (id) => {
    try {
      await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteUser}/${id}`,
      });
      message.success("Employee deleted successfully");
      fetchEmployees(pagination.current, pagination.pageSize, searchText);
    } catch (err) {
      console.error("Failed to delete employee:", err);
      message.error("Failed to delete employee");
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchEmployees(1, pagination.pageSize, value);
  };

  const handleTableChange = (paginationInfo, filters, sorter) => {
    fetchEmployees(paginationInfo.current, paginationInfo.pageSize, searchText);
  };

  const columns = [
    {
      title: "First Name",
      dataIndex: "first_name"
    },
    {
      title: "Last Name",
      dataIndex: "last_name"
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Active",
      dataIndex: "isActivate",
      render: (isActivate) =>
      isActivate ? (
          <button
            style={{
              backgroundColor: "#28a745", // Bootstrap green
              border: "none",
              borderRadius: "4px",
              padding: "4px 10px",
              color: "#fff",
              cursor: "default",
              fontWeight: "500",
            }}
          >
            Deactive
          </button>
        ) : (
          <button
            style={{
              // backgroundColor: '#28a745', // Bootstrap green
              border: "none",
              borderRadius: "4px",
              padding: "4px 10px",
              // color: '#fff',
              cursor: "default",
              fontWeight: "500",
            }}
          >
            Active
          </button>
        ),
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View">
            {" "}
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
            title={`Are you sure you want to delete ${record?.first_name} ${record?.last_name}?`}
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button className="delete-btn" danger icon={<DeleteOutlined />} />
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
          <Button
            type="primary"
            onClick={() => history.push("/admin/company-registartion")}
          >
            Back
          </Button>
          <h2>Company Employees</h2>
          <input
            type="file"
            accept=".csv"
            ref={inputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <div
            className="button-group-import-csv"
            style={{ display: "flex", gap: "8px" }}
          >
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={exportSampleCSVfile}
            >
              Sample CSV
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => inputRef.current?.click()}
            >
              Import CSV
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showAddEditModal()}
            >
              Add Employee
            </Button>
          </div>
        </div>

        <div className="global-search">
          <Input.Search
            placeholder="Search employees"
            allowClear
            onSearch={(value) => {
              setSearchText(value);
              fetchEmployees(1, pagination.pageSize, value);
            }}
            style={{ width: 300 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={employees}
          rowKey="_id"
          loading={loading}
          // footer={() => `Total Employee ${employees.length}`}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            pageSizeOptions: ["20", "50", "100"],
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} records`,
            onChange: (page, pageSize) =>
              fetchEmployees(page, pageSize, searchText),
          }}
        />
      </Card>

      <Modal
        title={
          modalMode === "view"
            ? "View Employee"
            : editData
            ? "Edit Employee"
            : "Add Employee"
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={
          modalMode === "view"
            ? null
            : [
                <Button
                  key="cancel"
            
                  className="delete-btn"
                  onClick={() => setModalVisible(false)}
                >
                  Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleSubmit}>
                  {editData ? "Update" : "Add"}
                </Button>,
              ]
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="first_name"
            label="First Name"
            rules={[{ required: true }]}
          >
            <Input
              placeholder="Enter first name"
              disabled={modalMode === "view"}
            />
          </Form.Item>

          <Form.Item
            name="last_name"
            label="Last Name"
            rules={[{ required: true }]}
          >
            <Input
              placeholder="Enter last name"
              disabled={modalMode === "view"}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input placeholder="Enter email" disabled={modalMode === "view"} />
          </Form.Item>

          {!editData && modalMode !== "view" && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Password is required" },
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
              <Input.Password
                placeholder="Enter password"
                autoComplete="new-password"
              />
            </Form.Item>
          )}

          {editData && (
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="isActivate"
                  label="Is Active"
                  rules={[{ required: true }]}
                >
                  <Radio.Group disabled={modalMode === "view"}>
                    <Radio value={true}>Yes</Radio>
                    <Radio value={false}>No</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>

              
            </Row>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyEmployee;
