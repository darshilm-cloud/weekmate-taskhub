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
  LinkOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import moment from "moment";
import Service from "../../service";
import { useHistory } from "react-router-dom";

// Constants
const INITIAL_PAGE_SIZE = 20;
const INITIAL_SORT_BY = "createdAt";
const INITIAL_SORT_ORDER = "desc";
const ALLOWED_FILE_TYPES = ["image/png", "image/jpeg", "image/webp"];
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
  const companySlug = localStorage.getItem("companyDomain");

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
    localStorage.getItem(`companyLogoUrl-${companySlug}`)
  );
  const [docFldFavicon, setDocFldFavicon] = useState(() =>
    localStorage.getItem(`companyFavIcoUrl-${companySlug}`)
  );
  const [faviconFileList, setFaviconFileList] = useState([]);
  const [logoFileList, setLogoFileList] = useState([]);

  // New states for pending file uploads
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const [pendingFaviconFile, setPendingFaviconFile] = useState(null);

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
  const localData = useMemo(() => getLocalStorageItem("user_data") || {}, []);

  // Error handling
  const handleApiError = useCallback((error) => {
    console.error("API Error:", error);
    message.error(error?.message || "Something went wrong. Please try again.");
  }, []);

  // Image removal handlers
  const handleLogoRemove = useCallback(() => {
    setDocFldLogo("");
    setLogoFileList([]);
    setPendingLogoFile(null);
    form.setFieldsValue({ logo: "" });
  }, [form]);

  const handleFaviconRemove = useCallback(() => {
    setDocFldFavicon("");
    setFaviconFileList([]);
    setPendingFaviconFile(null);
    form.setFieldsValue({ favicon: "" });
  }, [form]);

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
          ownerName: record.ownerName,
          companySlug: record.companyDomain,
          logo: `${process.env.REACT_APP_API_URL}${record.companyLogoUrl}`,
          favicon: `${process.env.REACT_APP_API_URL}${record.companyFavIcoUrl}`,
        });
        setDocFldLogo(record.companyLogoUrl);
        setDocFldFavicon(record.companyFavIcoUrl);
        setEditingCompany(record);
      } else {
        form.resetFields();
        setDocFldLogo(null);
        setDocFldFavicon(null);
        setEditingCompany(null);
      }

      // Reset pending files
      setPendingLogoFile(null);
      setPendingFaviconFile(null);
    },
    [form]
  );

  const handleModalClose = useCallback(() => {
    setIsModalVisible(false);
    const user_data = getLocalStorageItem("user_data") || {};
    setFaviconFileList([]);
    setLogoFileList([]);
    setPendingLogoFile(null);
    setPendingFaviconFile(null);
    setDocFldLogo(user_data.companyDetails.companyLogoUrl || null);
    setDocFldFavicon(user_data.companyDetails.companyFavIcoUrl || null);
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

  // File upload function
  const uploadFile = useCallback(async (file, fileType) => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileUpload}?file_for=${fileType}`,
        body: formData,
        options: {
          "content-type": "multipart/form-data",
        },
      });

      if (response.data.status === 1) {
        return response.data.data[0]?.file_path;
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }, []);

  // Save handler with file upload on submit
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const latestSlug =
        companySlug == values.companySlug ? companySlug : values.companySlug;

      let logoUrl = docFldLogo;
      let faviconUrl = docFldFavicon;

      // Upload logo if pending
      if (pendingLogoFile) {
        try {
          logoUrl = await uploadFile(pendingLogoFile, "company_logo");
          message.success("Logo uploaded successfully");
        } catch (error) {
          message.error("Failed to upload logo");
          setLoading(false);
          return;
        }
      }

      // Upload favicon if pending
      if (pendingFaviconFile) {
        try {
          faviconUrl = await uploadFile(pendingFaviconFile, "favicon");
          message.success("Favicon uploaded successfully");
        } catch (error) {
          message.error("Failed to upload favicon");
          setLoading(false);
          return;
        }
      }

      const payload = {
        companyName: values.companyName,
        companyDomain: values.companySlug,
        logo: logoUrl || "",
        favicon: faviconUrl || "",
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
          companyDetails: {
            ...localData.companyDetails,
            companyName: updatedCompany?.companyName,
            companyLogoUrl: updatedCompany?.companyLogoUrl,
            companyFavIcoUrl: updatedCompany?.companyFavIcoUrl,
            lastActiveChat: lastActiveChat,
            channelId: lastActiveChat?.id,
            companyId,
            fileUploadSize,
          },
        };

        setLocalStorageItem("user_data", updatedLocalData);
        setLocalStorageItem(
          `companyFavIcoUrl-${latestSlug}`,
          updatedCompany?.companyFavIcoUrl
        );
        setLocalStorageItem(
          `companyLogoUrl-${latestSlug}`,
          updatedCompany?.companyLogoUrl
        );

        // Handle new company creation
        if (!editingCompany && resetToken && saveCompany) {
          setLocalStorageItem("authToken", resetToken);
        }
        if (companySlug == values.companySlug) {
          window.location.reload();
        } else {
          localStorage.setItem("companyDomain", latestSlug);
          window.location.href = `/${latestSlug}/admin/company-management`;
        }
        await fetchCompanies();
        setIsModalVisible(false);
        setDocFldLogo(
          localStorage.getItem(`companyLogoUrl-${latestSlug}`) || null
        );
        setDocFldFavicon(
          localStorage.getItem(`companyFavIcoUrl-${latestSlug}`) || null
        );
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
    pendingLogoFile,
    pendingFaviconFile,
    uploadFile,
    form,
    localData,
    handleApiError,
  ]);

  // File validation
  const validateFile = useCallback((file) => {
    const isAllowedType = ALLOWED_FILE_TYPES.includes(file.type);
    if (!isAllowedType) {
      message.error("Only PNG, JPG and WEBP files are allowed!");
      return Upload.LIST_IGNORE;
    }
    // Valid file, but don't auto-upload
    return false;
  }, []);

  // Handle file selection (not upload)
  const handleLogoChange = useCallback(({ fileList }) => {
    setLogoFileList(fileList);
    if (fileList.length > 0) {
      setPendingLogoFile(fileList[0].originFileObj);
    } else {
      setPendingLogoFile(null);
    }
  }, []);

  const handleFaviconChange = useCallback(({ fileList }) => {
    setFaviconFileList(fileList);
    if (fileList.length > 0) {
      setPendingFaviconFile(fileList[0].originFileObj);
    } else {
      setPendingFaviconFile(null);
    }
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
                onClick={() =>
                  history.push(`/${companySlug}/admin/company-employee`)
                }
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
      companySlug: [
        { required: true, message: "Please input company slug!" },
        { min: 3, message: "Slug must be at least 3 characters!" },
        { max: 50, message: "Slug must be less than 50 characters!" },
        {
          validator: (_, value) => {
            if (!value) return Promise.resolve();

            // Check if slug contains only allowed characters (letters, numbers, hyphens)
            const slugRegex = /^[a-z0-9-]+$/;
            if (!slugRegex.test(value)) {
              return Promise.reject(
                new Error(
                  "Slug can only contain lowercase letters, numbers, and hyphens"
                )
              );
            }

            // Check if slug starts or ends with hyphen
            if (value.startsWith("-") || value.endsWith("-")) {
              return Promise.reject(
                new Error("Slug cannot start or end with a hyphen")
              );
            }

            // Check for consecutive hyphens
            if (value.includes("--")) {
              return Promise.reject(
                new Error("Slug cannot contain consecutive hyphens")
              );
            }

            return Promise.resolve();
          },
        },
      ],
    }),
    []
  );

  // Modal effects
  useEffect(() => {
    if (isModalVisible) {
      const user_data = getLocalStorageItem("user_data") || {};
      setDocFldLogo(user_data.companyDetails.companyLogoUrl || null);
      setDocFldFavicon(user_data.companyDetails.companyFavIcoUrl || null);
    }
  }, [isModalVisible]);

  return (
    <Card>
      <div className="heading-wrapper">
        <h2>Company Management</h2>
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

          <Row gutter={24}>
            <Col xs={24}>
              <Form.Item
                label="Company Slug"
                name="companySlug"
                rules={formRules.companySlug}
                extra="This will be used to create your company's unique domain. Only lowercase letters, numbers, and hyphens are allowed."
              >
                <Input
                  disabled={modalData.mode === "view"}
                  prefix={<LinkOutlined />}
                  placeholder="my-company"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item label="Logo">
                <Upload
                  name="logo"
                  listType="text"
                  maxCount={1}
                  disabled={modalData.mode === "view"}
                  fileList={logoFileList}
                  onChange={handleLogoChange}
                  showUploadList={{ showPreviewIcon: true }}
                  beforeUpload={validateFile}
                  action=""
                  accept=".png,.jpg,.jpeg,.webp"
                >
                  <Button
                    icon={<UploadOutlined />}
                    disabled={modalData.mode === "view"}
                  >
                    {`${docFldLogo ? "Update" : "Upload"} Logo`}
                  </Button>
                </Upload>
                {docFldLogo && logoFileList.length == 0 && (
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      marginTop: 8,
                    }}
                  >
                    <img
                      src={`${process.env.REACT_APP_API_URL}/public/${docFldLogo}`}
                      alt="Logo"
                      style={{
                        width: 100,
                        height: "auto",
                        maxWidth: "fit-content",
                      }}
                    />
                    {modalData.mode !== "view" && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={handleLogoRemove}
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          background: "#ff4d4f",
                          color: "white",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                        }}
                      />
                    )}
                  </div>
                )}
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Favicon">
                <Upload
                  action=""
                  accept=".png,.jpg,.jpeg,.webp"
                  name="favicon"
                  listType="text"
                  maxCount={1}
                  disabled={modalData.mode === "view"}
                  fileList={faviconFileList}
                  onChange={handleFaviconChange}
                  showUploadList={{ showPreviewIcon: true }}
                  beforeUpload={validateFile}
                >
                  <Button
                    icon={<UploadOutlined />}
                    disabled={modalData.mode === "view"}
                  >
                  {`${docFldFavicon ? "Update" : "Upload"} Favicon`}
                  </Button>
                </Upload>
                {docFldFavicon && faviconFileList.length == 0 && (
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      marginTop: 8,
                    }}
                  >
                    <img
                      src={`${process.env.REACT_APP_API_URL}/public/${docFldFavicon}`}
                      alt="Favicon"
                      style={{ width: 32, height: 32 }}
                    />
                    {modalData.mode !== "view" && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={handleFaviconRemove}
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          background: "#ff4d4f",
                          color: "white",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                        }}
                      />
                    )}
                  </div>
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
