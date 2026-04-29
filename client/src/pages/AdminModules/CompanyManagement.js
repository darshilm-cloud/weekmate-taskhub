import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  message,
} from "antd";
import {
  EditOutlined,
  UploadOutlined,
  CloseOutlined,
  LinkOutlined,
  BankOutlined,
  TeamOutlined,
  CalendarOutlined,
  GlobalOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import moment from "moment";
import Service from "../../service";
import { useHistory } from "react-router-dom";
import WeekmateLogo from "../../assets/images/WeeKmateTaskHub.svg";
import {
  dispatchBrandingUpdate,
  getPublicAssetUrl,
  persistBranding,
} from "../../util/branding";
import "./CompanyProfile.css";

// Constants
const ALLOWED_FILE_TYPES = ["image/png", "image/jpeg", "image/webp"];

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

const InfoCard = ({ label, value }) => (
  <div className="info-card">
    <div className="info-label">{label}</div>
    <div className="info-value">{value || "-"}</div>
  </div>
);

const AssetCard = ({
  title,
  imageUrl,
  placeholder,
  onUpload,
  onRemove,
  disabled,
  pendingFile,
}) => {
  // Create preview URL for pending file
  const previewUrl = useMemo(() => {
    if (pendingFile) {
      return URL.createObjectURL(pendingFile);
    }
    return null;
  }, [pendingFile]);

  // Cleanup URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Determine which image to show: pending file preview, existing image, or placeholder
  const displayImageUrl = previewUrl || imageUrl;

  return (
    <div className="asset-card">
      <div className="asset-preview">
        {displayImageUrl ? (
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src={
                previewUrl ||
                (imageUrl &&
                  `${process.env.REACT_APP_API_URL}/public/${imageUrl}`)
              }
              alt={title}
              className="asset-image"
            />
            {!disabled && (
              <Button
                type="text"
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={onRemove}
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
        ) : (
          <div className="asset-placeholder">{placeholder}</div>
        )}
      </div>

      {!disabled && (
        <Upload
          className="asset-upload"
          showUploadList={false}
          maxCount={1}
          beforeUpload={(file) => {
            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
              message.error("Only PNG, JPG and WEBP files are allowed!");
              return Upload.LIST_IGNORE;
            }
            onUpload(file);
            return Upload.LIST_IGNORE;
          }}
          accept=".png,.jpg,.jpeg,.webp"
        >
          <Button className="asset-upload-btn" icon={<UploadOutlined />}>
            {displayImageUrl ? "Replace" : "Upload"} {title}
          </Button>
        </Upload>
      )}
    </div>
  );
};

export default function CompanyManagement() {
  const companySlug = localStorage.getItem("companyDomain");
  const history = useHistory();
  const [form] = Form.useForm();

  // State management
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

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
  }, [companySlug, handleApiError]);

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
            lastActiveChat: lastActiveChat,
            channelId: lastActiveChat?.id,
            companyId,
            fileUploadSize,
          },
        };

        setLocalStorageItem("user_data", updatedLocalData);
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
          setCompany(updatedCompany);
          setLogoError(false);
          setFaviconError(false);
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

  const initials = company?.companyName
    ? company.companyName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "C";

  const hasCustomLogo = Boolean(company?.companyLogoUrl);
  const hasCustomFavicon = Boolean(company?.companyFavIcoUrl);

  const logoSrc = hasCustomLogo && !logoError
    ? getPublicAssetUrl(company.companyLogoUrl)
    : WeekmateLogo;

  const faviconSrc = hasCustomFavicon && !faviconError
    ? getPublicAssetUrl(company.companyFavIcoUrl)
    : WeekmateLogo;

  const STATS = [
    { label: "Company Name", value: company?.companyName || "—", icon: <BankOutlined />, color: "#e8f0f8", iconColor: "#0b3a5b" },
    { label: "Company Slug", value: company?.companyDomain || "—", icon: <GlobalOutlined />, color: "#e8f5e9", iconColor: "#2e7d32" },
    { label: "Total Users", value: company?.employeeCount ?? 0, icon: <TeamOutlined />, color: "#fff3e0", iconColor: "#e65100" },
    { label: "Created At", value: company ? moment(company.createdAt).format("DD-MM-YYYY") : "—", icon: <CalendarOutlined />, color: "#f3e5f5", iconColor: "#6a1b9a" },
  ];

  if (loading && !company) {
    return (
      <div className="cm-page">
        <div className="cm-shimmer cm-skeleton-hero" />
        <div className="cm-skeleton-stats">
          {[1, 2, 3, 4].map(i => <div key={i} className="cm-shimmer cm-skeleton-stat" />)}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="cm-shimmer" style={{ width: 140, height: 14, marginBottom: 8 }} />
          <div className="cm-shimmer" style={{ width: 260, height: 12 }} />
        </div>
        <div className="cm-skeleton-assets">
          {[1, 2].map(i => <div key={i} className="cm-shimmer cm-skeleton-asset" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="cm-page">
      {/* Hero */}
      <div className="cm-hero">
        <div className="cm-hero-left">
          <div className="cm-hero-avatar">
            {logoSrc && !logoError
              ? <img src={logoSrc} alt="logo" onError={() => setLogoError(true)} />
              : <BankOutlined style={{ fontSize: 32 }} />}
          </div>
          <div>
            <h1 className="cm-hero-name">{company?.companyName || "Company"}</h1>
            <p className="cm-hero-sub">Manage your workspace identity &amp; branding</p>
            <div className="cm-hero-badge">
              <GlobalOutlined style={{ fontSize: 11 }} />
              {company?.companyDomain || companySlug}
            </div>
          </div>
        </div>
        <div className="cm-hero-right">
          <Button
            className="cm-edit-btn"
            icon={<EditOutlined />}
            disabled={!company}
            onClick={showEditModal}
            loading={loading}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="cm-stats">
        {STATS.map(s => (
          <div className="cm-stat-card" key={s.label}>
            <div className="cm-stat-icon" style={{ background: s.color, color: s.iconColor }}>
              {s.icon}
            </div>
            <div className="cm-stat-body">
              <div className="cm-stat-label">{s.label}</div>
              <div className="cm-stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Assets */}
      <p className="cm-section-title">Company Assets</p>
      <p className="cm-section-sub">Logo and favicon used across the workspace.</p>
      <div className="cm-assets-grid">
        {[
          { label: "COMPANY LOGO", src: logoSrc, fallback: "No logo uploaded", hasError: logoError, onErr: () => setLogoError(true) },
          { label: "COMPANY FAVICON", src: faviconSrc, fallback: "No favicon uploaded", hasError: faviconError, onErr: () => setFaviconError(true) },
        ].map(({ label, src, fallback, onErr }) => (
          <div className="cm-asset-card" key={label}>
            <div className="cm-asset-header">
              <span className="cm-asset-label">{label}</span>
            </div>
            <div className="cm-asset-body">
              {src ? (
                <img src={src} alt={label} className="cm-asset-img" onError={onErr} />
              ) : (
                <div className="cm-asset-empty">
                  <PictureOutlined className="cm-asset-empty-icon" />
                  <span className="cm-asset-empty-text">{fallback}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <Modal
        title={
          <>
            <EditOutlined style={{ marginRight: 8, color: "#0b3a5b" }} />
            Edit Company
          </>
        }
        className="cm-modal"
        open={isModalVisible}
        onCancel={handleModalClose}
        width="100%"
        style={{ maxWidth: 640 }}
        footer={[
          <Button
            key="cancel"
            className="delete-btn"
            onClick={handleModalClose}
            disabled={modalLoading}
          >
            Cancel
          </Button>,
          <Button
            key="save"
            className="add-btn"
            type="primary"
            loading={modalLoading}
            onClick={handleSave}
          >
            Save
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Row gutter={[16, 16]}>

            <Col xs={24}>
              <Form.Item
                name="companyName"
                label="Company Name"
                rules={formRules.companyName}
              >
                <Input placeholder="Enter company name" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                label="Company Slug"
                name="companySlug"
                rules={formRules.companySlug}
                extra="Only lowercase letters, numbers, and hyphens are allowed."
              >
                <Input prefix={<LinkOutlined />} placeholder="my-company" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="Logo">
                <AssetCard
                  title="Logo"
                  imageUrl={tempLogoUrl}
                  placeholder="No logo"
                  disabled={false}
                  onUpload={handleLogoUpload}
                  onRemove={handleLogoRemove}
                  pendingFile={pendingLogo}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="Favicon">
                <AssetCard
                  title="Favicon"
                  imageUrl={tempFaviconUrl}
                  placeholder="No favicon"
                  disabled={false}
                  onUpload={handleFaviconUpload}
                  onRemove={handleFaviconRemove}
                  pendingFile={pendingFavicon}
                />
              </Form.Item>
            </Col>

          </Row>
        </Form>
      </Modal>
    </div>
  );
}
