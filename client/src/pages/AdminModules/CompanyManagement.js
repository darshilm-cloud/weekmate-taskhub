import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tooltip,
  Upload,
  message,
} from "antd";
import { UploadOutlined, CloseOutlined } from "@ant-design/icons";
import EditIcon from "../../assets/images/EditIcon";
import moment from "moment";
import { useDispatch } from "react-redux";
import Service from "../../service";
import {
  dispatchBrandingUpdate,
  persistBranding,
} from "../../util/branding";
import PageHeader from "../../components/common/PageHeader";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import currenciesData from "../../constants/currencies";
import { setCurrency } from "../../appRedux/actions/Common";
import { DEFAULT_CURRENCY } from "../../appRedux/reducers/Common";
import { getCurrencySymbol } from "../../util/currencyUtils";
import "./CompanyProfile.css";

// Constants
const ALLOWED_FILE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const CURRENCY_OPTIONS = currenciesData.map((currency) => ({
  value: currency.code,
  label: `${currency.symbol} ${currency.name} (${currency.code})`,
}));

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

// Upload button with the current / picked image previewed underneath - same
// layout as HRMS's Edit Company modal (Company Registration).
const AssetUploadField = ({ title, imageUrl, pendingFile, onUpload, onRemove }) => {
  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const src = previewUrl || (imageUrl ? `${process.env.REACT_APP_API_URL}/public/${imageUrl}` : "");

  return (
    <>
      <Upload
        showUploadList={false}
        maxCount={1}
        accept=".png,.jpg,.jpeg,.webp"
        beforeUpload={(file) => {
          if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            message.error("Only PNG, JPG and WEBP files are allowed!");
            return Upload.LIST_IGNORE;
          }
          onUpload(file);
          return Upload.LIST_IGNORE;
        }}
      >
        <Button icon={<UploadOutlined />}>Upload {title}</Button>
      </Upload>
      {src && (
        <div className="cm-upload-preview">
          <img src={src} alt={title} />
          <Button
            type="text"
            size="small"
            className="cm-upload-remove"
            icon={<CloseOutlined />}
            onClick={onRemove}
            aria-label={`Remove ${title}`}
          />
        </div>
      )}
    </>
  );
};

export default function CompanyManagement() {
  const companySlug = localStorage.getItem("companyDomain");
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  // State management
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // File states
  const [pendingLogo, setPendingLogo] = useState(null);
  const [pendingFavicon, setPendingFavicon] = useState(null);
  const [tempLogoUrl, setTempLogoUrl] = useState("");
  const [tempFaviconUrl, setTempFaviconUrl] = useState("");

  // Memoized values
  const localData = useMemo(() => getLocalStorageItem("user_data") || {}, []);

  // Error handling
  const handleApiError = useCallback((error) => {
    console.error("API Error:", error);
    message.error(error?.message || "Something went wrong. Please try again.");
  }, []);

  // Fetch company data
  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getCompanyList,
        body: { page: 1, limit: 1 },
      });

      if (res?.data.status === 1) {
        const first = res.data.data?.[0];
        setCompany(first || null);

        // Update localStorage with latest company data
        if (first) {
          dispatch(setCurrency(first.currency || DEFAULT_CURRENCY));
          persistBranding({
            companySlug,
            logoPath: first.companyLogoUrl,
            faviconPath: first.companyFavIcoUrl,
            title: first.companyName,
          });
          dispatchBrandingUpdate({
            companySlug,
            logoPath: first.companyLogoUrl || "",
            faviconPath: first.companyFavIcoUrl || "",
            title: first.companyName || "",
            updatedAt: Date.now(),
          });
        }
      } else {
        message.error("Failed to fetch company");
      }
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }, [companySlug, dispatch, handleApiError]);

  // Initial fetch
  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

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

  // Handle file uploads
  const handleLogoUpload = useCallback((file) => {
    setPendingLogo(file);
  }, []);

  const handleFaviconUpload = useCallback((file) => {
    setPendingFavicon(file);
  }, []);

  // Handle file removal
  const handleLogoRemove = useCallback(() => {
    setTempLogoUrl("");
    setPendingLogo(null);
    if (isModalVisible) {
      form.setFieldsValue({ logo: "" });
    }
  }, [form, isModalVisible]);

  const handleFaviconRemove = useCallback(() => {
    setTempFaviconUrl("");
    setPendingFavicon(null);
    if (isModalVisible) {
      form.setFieldsValue({ favicon: "" });
    }
  }, [form, isModalVisible]);

  // Modal handlers
  const showEditModal = useCallback(() => {
    if (!company) return;

    setIsModalVisible(true);
    form.setFieldsValue({
      companyName: company.companyName,
      companySlug: company.companyDomain,
      ownerName: company.ownerName,
      currency: company.currency || DEFAULT_CURRENCY,
    });

    // Set current images
    setTempLogoUrl(company.companyLogoUrl || "");
    setTempFaviconUrl(company.companyFavIcoUrl || "");

    // Reset pending files
    setPendingLogo(null);
    setPendingFavicon(null);
  }, [company, form]);

  const handleModalClose = useCallback(() => {
    setIsModalVisible(false);
    form.resetFields();

    // Reset all file states
    setPendingLogo(null);
    setPendingFavicon(null);
    setTempLogoUrl("");
    setTempFaviconUrl("");
  }, [form]);

  // Save handler
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);

      let logoUrl = tempLogoUrl;
      let faviconUrl = tempFaviconUrl;

      // Upload logo if pending
      if (pendingLogo) {
        try {
          logoUrl = await uploadFile(pendingLogo, "company_logo");
          message.success("Logo uploaded successfully");
        } catch (error) {
          message.error("Failed to upload logo");
          setModalLoading(false);
          return;
        }
      }

      // Upload favicon if pending
      if (pendingFavicon) {
        try {
          faviconUrl = await uploadFile(pendingFavicon, "favicon");
          message.success("Favicon uploaded successfully");
        } catch (error) {
          message.error("Failed to upload favicon");
          setModalLoading(false);
          return;
        }
      }

      const payload = {
        companyName: values.companyName,
        companyDomain: values.companySlug,
        logo: logoUrl || "",
        favicon: faviconUrl || "",
        ownerName: values.ownerName || "",
        currency: values.currency || DEFAULT_CURRENCY,
      };

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.editCompany}/${company._id}`,
        body: payload,
      });

      if (response?.data.statusCode === 200) {
        message.success("Company updated successfully");

        const updatedCompany = response.data.data.updatedCompany;
        const { lastActiveChat, companyId, fileUploadSize } =
          response.data.data;

        // Update localStorage
        const updatedLocalData = {
          ...localData,
          companyDetails: {
            ...localData.companyDetails,
            companyName: updatedCompany?.companyName,
            companyLogoUrl: updatedCompany?.companyLogoUrl,
            companyFavIcoUrl: updatedCompany?.companyFavIcoUrl,
            currency: updatedCompany?.currency || DEFAULT_CURRENCY,
            lastActiveChat: lastActiveChat,
            channelId: lastActiveChat?.id,
            companyId,
            fileUploadSize,
          },
        };

        setLocalStorageItem("user_data", updatedLocalData);
        dispatch(setCurrency(updatedCompany?.currency || DEFAULT_CURRENCY));
        persistBranding({
          companySlug: values.companySlug,
          logoPath: updatedCompany?.companyLogoUrl,
          faviconPath: updatedCompany?.companyFavIcoUrl,
          title: updatedCompany?.companyName,
        });
        dispatchBrandingUpdate({
          companySlug: values.companySlug,
          logoPath: updatedCompany?.companyLogoUrl || "",
          faviconPath: updatedCompany?.companyFavIcoUrl || "",
          title: updatedCompany?.companyName || "",
          updatedAt: Date.now(),
        });

        // Handle domain change
        if (companySlug !== values.companySlug) {
          localStorage.setItem("companyDomain", values.companySlug);
          window.location.href = `/${values.companySlug}/admin/company-management`;
        } else {
          setCompany({ ...company, ...updatedCompany });
          setIsModalVisible(false);
          setPendingLogo(null);
          setPendingFavicon(null);
          setTempLogoUrl("");
          setTempFaviconUrl("");
        }
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
      setModalLoading(false);
    }
  }, [
    form,
    company,
    tempLogoUrl,
    tempFaviconUrl,
    pendingLogo,
    pendingFavicon,
    uploadFile,
    localData,
    companySlug,
    dispatch,
    handleApiError,
  ]);

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

            const slugRegex = /^[a-z0-9-]+$/;
            if (!slugRegex.test(value)) {
              return Promise.reject(
                new Error(
                  "Slug can only contain lowercase letters, numbers, and hyphens"
                )
              );
            }

            if (value.startsWith("-") || value.endsWith("-")) {
              return Promise.reject(
                new Error("Slug cannot start or end with a hyphen")
              );
            }

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

  const columns = [
    { title: "Company Name", dataIndex: "companyName", key: "companyName" },
    { title: "Company Slug", dataIndex: "companyDomain", key: "companyDomain" },
    { title: "Total Users", dataIndex: "employeeCount", key: "employeeCount", render: (count) => count ?? 0 },
    {
      title: "Currency",
      dataIndex: "currency",
      key: "currency",
      render: (code) => {
        const currencyCode = code || DEFAULT_CURRENCY;
        return `${getCurrencySymbol(currencyCode)} ${currencyCode}`;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => (date ? moment(date).format("DD-MM-YYYY") : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      render: () => (
        <Space>
          <Tooltip title="Edit Company" placement="bottom">
            <Button className="edit-btn" icon={<EditIcon />} onClick={showEditModal} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="cm-page">
      <PageHeader title="Company Profile" />

      <div className="cm-table-card">
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={company ? [company] : []}
          loading={loading}
          pagination={false}
          locale={{ emptyText: <NoDataFoundIcon /> }}
        />
      </div>

      <Modal
        width={600}
        title="Edit Company"
        className="cm-modal"
        open={isModalVisible}
        onCancel={handleModalClose}
        destroyOnClose
        footer={
          <>
            <Button className="cancel-btn" onClick={handleModalClose} disabled={modalLoading}>
              Cancel
            </Button>
            <Button type="primary" className="add-btn" loading={modalLoading} onClick={handleSave}>
              Update
            </Button>
          </>
        }
      >
        <Form form={form} layout="vertical" className="modal-form-col">
          <Row gutter={[16, 0]}>
            <Col xs={24}>
              <Form.Item name="companyName" label="Company Name" rules={formRules.companyName}>
                <Input placeholder="Enter company name" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label="Company Slug"
                name="companySlug"
                rules={formRules.companySlug}
                extra="This is your company's unique URL. Only lowercase letters, numbers, and hyphens are allowed."
              >
                <Input placeholder="Company slug (e.g., my-company)" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label="Currency"
                name="currency"
                rules={[{ required: true, message: "Please select a currency" }]}
                extra="Used for every amount shown across the application."
              >
                <Select
                  showSearch
                  placeholder="Select currency"
                  optionFilterProp="label"
                  options={CURRENCY_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Logo">
                <AssetUploadField
                  title="Logo"
                  imageUrl={tempLogoUrl}
                  pendingFile={pendingLogo}
                  onUpload={handleLogoUpload}
                  onRemove={handleLogoRemove}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Favicon">
                <AssetUploadField
                  title="Favicon"
                  imageUrl={tempFaviconUrl}
                  pendingFile={pendingFavicon}
                  onUpload={handleFaviconUpload}
                  onRemove={handleFaviconRemove}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
