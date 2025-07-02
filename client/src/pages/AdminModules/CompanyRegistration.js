import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  Space,
  message,
  Card,
  Col,
  Row,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import moment from "moment";
import Service from "../../service";
import { useHistory } from "react-router-dom";

// Constants
const INITIAL_PAGE_SIZE = 20;
const INITIAL_SORT_BY = "createdAt";
const INITIAL_SORT_ORDER = "desc";
const ALLOWED_FILE_TYPES = ["image/png", "image/svg+xml", "image/jpeg"];
const PAGE_SIZE_OPTIONS = ["20", "30", "50"];

// Utility functions
const getLocalStorageItem = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

const setLocalStorageItem = (key, value) => {
  try {
    localStorage.setItem(
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    );
  } catch (error) {
    console.error("Error setting localStorage:", error);
  }
};

const CompanyRegistration = () => {
  const history = useHistory();
  const [form] = Form.useForm();

  // State management
  const [companies, setCompanies] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalData, setTotalData] = useState(0);
  const [modalData, setModalData] = useState({ mode: "add", record: null });

  // File upload states
  const [docFldLogo, setDocFldLogo] = useState(() =>
    localStorage.getItem("companyLogoUrl")
  );
  const [docFldFavicon, setDocFldFavicon] = useState(() =>
    localStorage.getItem("companyFavIcoUrl")
  );
  const [faviconFileList, setFaviconFileList] = useState([]);
  const [logoFileList, setLogoFileList] = useState([]);

  // Pagination and filtering states
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: INITIAL_PAGE_SIZE,
    total: 0,
  });
  const [sorting, setSorting] = useState({
    sortBy: INITIAL_SORT_BY,
    sortOrder: INITIAL_SORT_ORDER,
  });
  const [searchText, setSearchText] = useState("");

  // Memoized values
  const localData = useMemo(() => getLocalStorageItem("userData") || {}, []);

  // Error handling
  const handleApiError = useCallback((error) => {
    console.error("API Error:", error);
    message.error(error?.message || "Something went wrong. Please try again.");
  }, []);

  // Fetch companies with optimized dependencies
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const payload = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        sort: sorting.sortOrder,
        sortBy: sorting.sortBy,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getCompanyList,
        body: payload,
      });

      if (response?.data.status === 1) {
        const companiesData = response.data.data || [];
        const total = response.data.metadata?.total || 0;

        setCompanies(companiesData);
        setTotalData(total);
        setPagination((prev) => ({ ...prev, total }));

        // Update favicon and logo from first company if available
        if (companiesData[0]) {
          setDocFldFavicon(companiesData[0].companyFavIcoUrl);
          setDocFldLogo(companiesData[0].companyLogoUrl);
        }
      } else {
        message.error("Failed to fetch company list");
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.current,
    pagination.pageSize,
    sorting.sortBy,
    sorting.sortOrder,
    searchText,
    handleApiError,
  ]);

  // Initial fetch
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Modal handlers
  const showAddEditModal = useCallback(
    (mode = "add", record = null) => {
      setModalData({ mode, record });
      setIsModalVisible(true);

      if (record) {
        form.setFieldsValue({
          companyName: record.companyName,
          companyEmail: record.companyEmail || record.email,
          ownerName: record.ownerName,
          logo: `${process.env.REACT_APP_API_URL}${record.companyLogoUrl}`,
          favicon: `${process.env.REACT_APP_API_URL}${record.companyLogoUrl}`,
        });
        setDocFldLogo(record.companyLogoUrl);
        setDocFldFavicon(record.companyLogoUrl);
        setEditingCompany(record);
      } else {
        form.resetFields();
        setDocFldLogo(null);
        setDocFldFavicon(null);
        setEditingCompany(null);
      }
    },
    [form]
  );

  const handleModalClose = useCallback(() => {
    setIsModalVisible(false);
    const userData = getLocalStorageItem("userData") || {};
    setFaviconFileList([]);
    setLogoFileList([]);
    setDocFldLogo(userData.companyLogoUrl || null);
    setDocFldFavicon(userData.companyFavIcoUrl || null);
  }, []);

  // Delete handler
  const handleDelete = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const response = await Service.makeAPICall({
          methodName: Service.deleteMethod,
          api_url: `${Service.deleteCompany}/${id}`,
        });

        if (response?.data.statusCode === 200) {
          message.success("Company deleted successfully");
          fetchCompanies();
        } else {
          message.error("Failed to delete company");
        }
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoading(false);
      }
    },
    [fetchCompanies, handleApiError]
  );

  // Save handler with optimized localStorage updates
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        companyName: values.companyName,
        companyEmail: values.companyEmail,
        logo: docFldLogo,
        favicon: docFldFavicon,
        ownerName: values.ownerName,
      };

      const apiConfig = editingCompany
        ? {
            methodName: Service.putMethod,
            api_url: `${Service.editCompany}/${editingCompany._id}`,
            body: payload,
          }
        : {
            methodName: Service.postMethod,
            api_url: Service.addCompany,
            body: payload,
          };

      const response = await Service.makeAPICall(apiConfig);

      if (response?.data.statusCode === 200) {
        message.success(
          `Company ${editingCompany ? "updated" : "added"} successfully`
        );

        const updatedCompany = response.data.data.updatedCompany;
        const {
          resetToken,
          saveCompany,
          lastActiveChat,
          companyId,
          fileUploadSize,
        } = response.data.data;

        // Update localStorage efficiently
        const updatedLocalData = {
          ...localData,
          companyName: updatedCompany?.companyName,
          companyEmail: updatedCompany?.companyEmail,
          companyLogoUrl: updatedCompany?.companyLogoUrl,
          companyFavIcoUrl: updatedCompany?.companyFavIcoUrl,
          lastActiveChat: lastActiveChat,
          channelId: lastActiveChat?.id,
          companyId,
          fileUploadSize,
        };

        setLocalStorageItem("userData", updatedLocalData);
        setLocalStorageItem(
          "companyFavIcoUrl",
          updatedCompany?.companyFavIcoUrl
        );
        setLocalStorageItem("companyLogoUrl", updatedCompany?.companyLogoUrl);

        // Handle new company creation
        if (!editingCompany && resetToken && saveCompany) {
          setLocalStorageItem("authToken", resetToken);
        }

        await fetchCompanies();
        setIsModalVisible(false);
        setDocFldLogo(localStorage.getItem("companyLogoUrl") || null);
        setDocFldFavicon(localStorage.getItem("companyFavIcoUrl") || null);
      } else {
        message.error("Failed to save company");
      }
    } catch (error) {
      console.error("Save error:", error);
      if (error?.response?.data?.data?.statusCode === 400) {
        message.error(error.response.data.data.message);
      } else {
        handleApiError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [
    editingCompany,
    fetchCompanies,
    docFldLogo,
    docFldFavicon,
    form,
    localData,
    handleApiError,
  ]);

  // File upload handlers
  const createUploadHandler = useCallback(
    (fileType, setDocFunction) => {
      return async ({ file, onSuccess, onError }) => {
        try {
          const formData = new FormData();
          formData.append("image", file);

          const response = await Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: `upload/uploadFile?file_for=${fileType}`,
            body: formData,
            options: {
              "content-type": "multipart/form-data",
            },
          });

          if (response?.data.statusCode === 200) {
            const { originalUrl } = response.data;
            message.success(response.data.message);
            setDocFunction(response.data.data[0]?.originalUrl);
            form.setFieldsValue({
              [fileType === "company_logo" ? "logo" : "favicon"]: originalUrl,
            });
            onSuccess(response.data.data, file);
          } else {
            message.error(`${fileType} upload failed`);
            onError(new Error("Upload failed"));
          }
        } catch (error) {
          console.error("Upload error:", error);
          message.error(
            error?.response?.data?.message || `Error uploading ${fileType}`
          );
          onError(error);
        }
      };
    },
    [form]
  );

  const handleLogoUpload = useMemo(
    () => createUploadHandler("company_logo", setDocFldLogo),
    [createUploadHandler]
  );

  const handleFaviconUpload = useMemo(
    () => createUploadHandler("favicon", setDocFldFavicon),
    [createUploadHandler]
  );

  // File validation
  const validateFile = useCallback((file) => {
    const isAllowedType = ALLOWED_FILE_TYPES.includes(file.type);
    if (!isAllowedType) {
      message.error("Only PNG, JPG and SVG files are allowed!");
    }
    return isAllowedType || Upload.LIST_IGNORE;
  }, []);

  // Table handlers
  const handleTableChange = useCallback((pagination, filters, sorter) => {
    setPagination((prev) => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }));

    if (sorter.order) {
      setSorting({
        sortBy: sorter.field,
        sortOrder: sorter.order === "ascend" ? "asc" : "desc",
      });
    } else {
      setSorting({
        sortBy: INITIAL_SORT_BY,
        sortOrder: INITIAL_SORT_ORDER,
      });
    }
  }, []);

  const handleSearch = useCallback((value) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  // Memoized table columns
  const columns = useMemo(
    () => [
      {
        title: "Company Name",
        dataIndex: "companyName",
        sorter: true,
      },
      {
        title: "Email",
        dataIndex: "companyEmail",
        sorter: true,
        render: (text, record) => text || record.email,
      },
      {
        title: "Total Employees",
        render: (_, record) => record.employeeCount || 0,
      },
      {
        title: "Created At",
        dataIndex: "createdAt",
        render: (text) => moment(text).format("MMM DD, YYYY"),
        sorter: true,
      },
      {
        title: "Actions",
        render: (_, record) => (
          <Space>
            <Tooltip title="View Employees">
              <Button
                className="view-btn"
                icon={<UserOutlined />}
                onClick={() => history.push("/admin/company-employee")}
              />
            </Tooltip>
            <Tooltip title="Edit">
              <Button
                className="edit-btn"
                icon={<EditOutlined />}
                onClick={() => showAddEditModal("edit", record)}
              />
            </Tooltip>
            {/* <Popconfirm
              title={`Are you sure you want to delete ${record?.companyName}?`}
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete">
                <Button
                  className="delete-btn"
                  icon={<DeleteOutlined />}
                  danger
                  loading={loading}
                />
              </Tooltip>
            </Popconfirm> */}
          </Space>
        ),
      },
    ],
    [history, showAddEditModal, handleDelete, loading]
  );

  // Form validation rules
  const formRules = useMemo(
    () => ({
      companyName: [{ required: true, message: "Please enter company name" }],
      companyEmail: [
        { required: true, message: "Please enter company email" },
        { type: "email", message: "Invalid email format" },
      ]
    }),
    []
  );

  // Modal effects
  useEffect(() => {
    if (isModalVisible) {
      const userData = getLocalStorageItem("userData") || {};
      setDocFldLogo(userData.companyLogoUrl || null);
      setDocFldFavicon(userData.companyFavIcoUrl || null);
    }
  }, [isModalVisible]);

  return (
    <Card>
      <div className="heading-wrapper">
        <h2>Company Registration</h2>
        {totalData === 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 10,
            }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showAddEditModal("add")}
              loading={loading}
            >
              Add Company
            </Button>
          </div>
        )}
      </div>

      <div className="global-search">
        <Input.Search
          placeholder="Search companies"
          allowClear
          size="middle"
          onSearch={handleSearch}
          style={{ width: 300 }}
        />
      </div>

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={companies}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        onChange={handleTableChange}
      />

      <Modal
        title={
          modalData.mode === "view"
            ? "View Company"
            : modalData.mode === "edit"
            ? "Edit Company"
            : "Add New Company"
        }
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={
          modalData.mode === "view" ? (
            <Button
              type="primary"
              className="delete-btn"
              onClick={handleModalClose}
              disabled={loading}
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                type="primary"
                className="delete-btn"
                onClick={handleModalClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="btn-save"
                type="primary"
                loading={loading}
                onClick={handleSave}
              >
                Save
              </Button>
            </>
          )
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="companyName"
            label="Company Name"
            rules={formRules.companyName}
          >
            <Input
              placeholder="Enter company name"
              disabled={modalData.mode === "view"}
            />
          </Form.Item>

          <Form.Item
            name="companyEmail"
            label="Company Email"
            rules={formRules.companyEmail}
          >
            <Input
              placeholder="Enter company email"
              disabled={modalData.mode === "view"}
            />
          </Form.Item>

          {/* <Form.Item
            name="domain"
            label="Company Slug"
            rules={formRules.domain}
          >
            <Input
              placeholder="Enter company slug"
              disabled={modalData.mode === "view"}
            />
          </Form.Item> */}

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item label="Logo">
                <Upload
                  name="logo"
                  listType="picture"
                  maxCount={1}
                  customRequest={handleLogoUpload}
                  disabled={modalData.mode === "view"}
                  fileList={logoFileList}
                  onChange={({ fileList }) => setLogoFileList(fileList)}
                  showUploadList={{ showPreviewIcon: true }}
                  beforeUpload={validateFile}
                >
                  <Button
                    icon={<UploadOutlined />}
                    disabled={modalData.mode === "view"}
                  >
                    Upload Logo
                  </Button>
                </Upload>
                {docFldLogo && (
                  <img
                    src={docFldLogo}
                    alt="Logo"
                    style={{ marginTop: 8, width: 100, height: "auto" }}
                  />
                )}
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Favicon">
                <Upload
                  name="favicon"
                  listType="picture"
                  maxCount={1}
                  customRequest={handleFaviconUpload}
                  disabled={modalData.mode === "view"}
                  fileList={faviconFileList}
                  onChange={({ fileList }) => setFaviconFileList(fileList)}
                  showUploadList={{ showPreviewIcon: true }}
                  beforeUpload={validateFile}
                >
                  <Button
                    icon={<UploadOutlined />}
                    disabled={modalData.mode === "view"}
                  >
                    Upload Favicon
                  </Button>
                </Upload>
                {docFldFavicon && (
                  <img
                    src={docFldFavicon}
                    alt="Favicon"
                    style={{ marginTop: 8, width: 32, height: 32 }}
                  />
                )}
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};

export default CompanyRegistration;
