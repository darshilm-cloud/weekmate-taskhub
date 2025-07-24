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
  Select,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  UploadOutlined,
  DownloadOutlined,
  ApiOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import exampleCSV from "../../../src/sampleCSV.csv";
import Service from "../../service";
import { useHistory } from "react-router-dom";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
import { removeTitle } from "../../util/nameFilter";

const CombinedEmployeeList = () => {
  const user_data = JSON.parse(localStorage.getItem("user_data") || "{}");
  const companySlug = localStorage.getItem("companyDomain");
  const companyId = user_data?.companyId;

  const history = useHistory();
  const dispatch = useDispatch();
  const { Option } = Select;
  const Search = Input.Search;

  const [form] = Form.useForm();
  const searchRef = useRef();
  const inputRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [modalMode, setModalMode] = useState("add");
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [sortBy, setSortBy] = useState("desc");
  const [roles, setRoles] = useState([]); // Add state for roles
  const [rolesLoading, setRolesLoading] = useState(false); // Add loading state for roles
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Add function to fetch roles
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      dispatch(showAuthLoader());

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getAllRole,
      });

      dispatch(hideAuthLoader());

      if (response?.data?.data?.length > 0) {
        setRoles(response.data.data);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.log(error, "error");
      message.error("Something went wrong!");
      setRoles([]);
      dispatch(hideAuthLoader());
    } finally {
      setRolesLoading(false);
    }
  };

  // Fetch employees function combining both approaches
  const fetchEmployees = async () => {
    setLoading(true);
    dispatch(showAuthLoader());

    try {
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        includeDeactivated: true
      };

      if (sortBy?.sort) {
        reqBody.sort = sortBy.sort;
      }
      if (sortBy?.sortBy) {
        reqBody.sortBy = sortBy.sortBy;
      }
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }

      // Try first API endpoint
      let response;
      try {
        response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getUsermaster,
          body: reqBody,
        });
      } catch (err) {
        // Fallback to second API endpoint
        response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getUsersList,
          body: {
            page: pagination.current,
            limit: pagination.pageSize,
            search: searchText,
          },
        });
      }

      dispatch(hideAuthLoader());

      if (response?.data?.data?.length > 0) {
        setEmployees(response.data.data || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data.metadata?.total || 0,
        }));
      } else {
        setEmployees([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
        if (response.data?.message) {
          message.success(response.data.message);
        }
      }
    } catch (err) {
      message.error("Failed to fetch employees");
      dispatch(hideAuthLoader());
    } finally {
      setLoading(false);
    }
  };

  // File upload handling
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
        // Handle CSV download for errors
        if (response.data) {
          let csvContent = "";
          let filename = "invalid_users.csv";

          if (typeof response.data === "string") {
            csvContent = response.data;
          } else if (typeof response.data === "object") {
            const headers = Object.keys(response.data);
            csvContent = headers.join(",") + "\n";

            if (Array.isArray(response.data)) {
              response.data.forEach((row) => {
                const values = headers.map((header) => {
                  const value = row[header] || "";
                  return typeof value === "string" &&
                    (value.includes(",") || value.includes('"'))
                    ? `"${value.replace(/"/g, '""')}"`
                    : value;
                });
                csvContent += values.join(",") + "\n";
              });
            } else {
              const values = headers.map((header) => {
                const value = response.data[header] || "";
                return typeof value === "string" &&
                  (value.includes(",") || value.includes('"'))
                  ? `"${value.replace(/"/g, '""')}"`
                  : value;
              });
              csvContent += values.join(",") + "\n";
            }
          }

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
      message.error("Upload failed. Please try again.");
    }

    e.target.value = "";
  };

  // Export CSV function
  const exportCSV = async () => {
    try {
      const reqBody = {
        exportFileType: "csv",
        isExport: true,
      };
      if (sortBy?.sort) {
        reqBody.sort = sortBy.sort;
      }
      if (sortBy?.sortBy) {
        reqBody.sortBy = sortBy.sortBy;
      }
      if (searchText) {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsermaster,
        body: reqBody,
      });

      if (response?.data?.data) {
        let base64 = response.data.data;
        const linkSource = "data:text/csv;base64," + base64;
        const downloadLink = document.createElement("a");
        const fileName = "Users Employees.csv";
        downloadLink.href = linkSource;
        downloadLink.download = fileName;
        downloadLink.style.display = "none";
        downloadLink.click();
        downloadLink.remove();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
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
  }, [
    searchText,
    sortBy.sort,
    sortBy.sortBy,
    pagination.current,
    pagination.pageSize,
  ]);

  // Modified showAddEditModal function to fetch roles
  const showAddEditModal = (record = null, mode = "add") => {
    setModalMode(mode);
    setEditData(record);
    setModalVisible(true);

    // Fetch all available roles (no need for employee ID)
    fetchRoles();

    if (record) {
      form.setFieldsValue({
        ...record,
        pmsRoleId: record.pms_role?._id || null, // Set the current role ID
      });
    } else {
      form.resetFields();
    }
  };

  // Modified handleSubmit function to include pmsRoleId
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        firstName: values.first_name,
        lastName: values.last_name,
        companyId,
        isActivate: values.isActivate,
        email: values.email,
        password: values.password,
        pmsRoleId: values.pmsRoleId, // Add role ID to payload
      };

      if (editData) {
        await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: `${Service.editUser}/${editData._id}`,
          body: payload,
        });
        message.success("Employee updated successfully");
      } else {
        await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.addUser,
          body: payload,
        });
        message.success("Employee added successfully");
      }

      setModalVisible(false);
      fetchEmployees();
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
      fetchEmployees();
    } catch (err) {
      console.error("Failed to delete employee:", err);
      message.error("Failed to delete employee");
    }
  };

  const handleTableChange = (page, filters, sorter) => {
    setPagination({ ...pagination, ...page });
    const { field, order } = sorter;
    setSortBy({
      sortBy: order === "ascend" ? "asc" : "desc",
      sort: field,
    });
  };

  const resetSearchFilter = (e) => {
    const keyCode = e && e.keyCode ? e.keyCode : e;
    switch (keyCode) {
      case 8:
        if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
          searchRef.current.state.value = "";
          setSearchText("");
          setSearchEnabled(false);
        }
        break;
      case 46:
        if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
          searchRef.current.state.value = "";
          setSearchText("");
          setSearchEnabled(false);
        }
        break;
      default:
        break;
    }
  };

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const getFooterDetails = () => {
    return (
      <label>
        Total Records Count is {pagination.total > 0 ? pagination.total : 0}
      </label>
    );
  };

  // Combined columns with both functionalities
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "full_name",
      render: (text, record) => {
        // Handle both data structures
        const full_name =
          record.full_name ||
          `${record.first_name || ""} ${record.last_name || ""}`.trim();
        return (
          <span style={{ textTransform: "capitalize" }}>
            {removeTitle ? removeTitle(full_name) : full_name}
          </span>
        );
      },
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (text, record) => {
        return <span>{record?.email}</span>;
      },
    },
    {
      title: "Role",
      dataIndex: "role_name",
      key: "role_name",
      render: (text, record) => {
        return <span>{record?.pms_role?.role_name || "N/A"}</span>;
      },
    },
    {
      title: "Status",
      dataIndex: "isActivate",
      render: (isActivate) => {
        if (isActivate === undefined) return null;
        return isActivate ? (
          <button
            style={{
              backgroundColor: "#28a745",
              border: "none",
              borderRadius: "4px",
              padding: "4px 10px",
              color: "#fff",
              cursor: "default",
              fontWeight: "500",
            }}
          >
            Active
          </button>
        ) : (
          <button
            style={{
              backgroundColor: "#dc3545",
              border: "none",
              borderRadius: "4px",
              padding: "4px 10px",
              color: "#fff",
              cursor: "default",
              fontWeight: "500",
            }}
          >
            Deactivated
          </button>
        );
      },
    },
    {
      title: "Actions",
      render: (_, record) => {
        return (
          <Space>
            <Tooltip title="Edit">
              <Button
                className="edit-btn"
                icon={<EditOutlined />}
                onClick={() => showAddEditModal(record, "edit")}
              />
            </Tooltip>

            <Popconfirm
              title={`Are you sure you want to delete ${
                record?.first_name || record?.full_name
              } ${record?.last_name || ""}?`}
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete">
                <Button
                  className="delete-btn"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div className="profile-sub-head global-search employee-module">
        <Search
          ref={searchRef}
          placeholder="Search employees"
          onSearch={onSearch}
          onKeyUp={resetSearchFilter}
          style={{ width: 200 }}
          onChange={(e) => {
            setPagination({ ...pagination, current: 1 });
          }}
        />

        <input
          type="file"
          accept=".csv"
          ref={inputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <div
          className="filter-btn-wrapper"
          style={{ display: "flex", gap: "8px" }}
        >
          <Button
            className="mr2 export-btn"
            id="exportButton"
            disabled={pagination.total != 0 ? false : true}
            onClick={exportCSV}
          >
            Export CSV
          </Button>
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

      <div className="block-table-content">
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="_id"
          loading={loading}
          footer={getFooterDetails}
          pagination={{
            showSizeChanger: true,
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            pageSizeOptions: ["20", "50", "100"],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} records`,
          }}
          onChange={handleTableChange}
        />
      </div>

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

          {/* Add Role dropdown field */}
          <Form.Item
            name="pmsRoleId"
            label="Role"
            rules={[{ required: true, message: "Please select a role" }]}
          >
            <Select
              placeholder="Select a role"
              loading={rolesLoading}
              disabled={modalMode === "view" || user_data?._id == editData?._id}
              allowClear
            >
              {roles.map((role) => (
                <Option key={role._id} value={role._id}>
                  {role.role_name}
                </Option>
              ))}
            </Select>
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

export default CombinedEmployeeList;
