import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  message,
  Spin,
  Popconfirm,
} from 'antd';
import {
  EditOutlined,
  UploadOutlined,
  CloseOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import Service from '../../service';
import { useHistory } from "react-router-dom";
import './CompanyProfile.css';

// Constants
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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
    <div className="info-value">{value || '-'}</div>
  </div>
);

const AssetCard = ({ title, imageUrl, placeholder, onUpload, onRemove, disabled, pendingFile }) => (
  <div className="asset-card">
    <div className="asset-preview">
      {imageUrl ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={`${process.env.REACT_APP_API_URL}/public/${imageUrl}`}
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
                position: 'absolute',
                top: -8,
                right: -8,
                background: '#ff4d4f',
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
              }}
            />
          )}
        </div>
      ) : (
        <div className="asset-placeholder">{placeholder}</div>
      )}
      {pendingFile && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#1890ff' }}>
          File selected: {pendingFile.name}
        </div>
      )}
    </div>
    {!disabled && (
      <Upload
        showUploadList={false}
        maxCount={1}
        beforeUpload={(file) => {
          if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            message.error('Only PNG, JPG and WEBP files are allowed!');
            return Upload.LIST_IGNORE;
          }
          onUpload(file);
          return Upload.LIST_IGNORE;
        }}
        accept=".png,.jpg,.jpeg,.webp"
      >
        <Button icon={<UploadOutlined />}>
          {imageUrl ? 'Replace' : 'Upload'} {title}
        </Button>
      </Upload>
    )}
  </div>
);

export default function CompanyManagement() {
  const companySlug = localStorage.getItem("companyDomain");
  const history = useHistory();
  const [form] = Form.useForm();

  // State management
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // File states
  const [pendingLogo, setPendingLogo] = useState(null);
  const [pendingFavicon, setPendingFavicon] = useState(null);
  const [tempLogoUrl, setTempLogoUrl] = useState('');
  const [tempFaviconUrl, setTempFaviconUrl] = useState('');

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
          setLocalStorageItem(`companyLogoUrl-${companySlug}`, first.companyLogoUrl);
          setLocalStorageItem(`companyFavIcoUrl-${companySlug}`, first.companyFavIcoUrl);
        }
      } else {
        message.error('Failed to fetch company');
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
    setTempLogoUrl('');
    setPendingLogo(null);
    if (isModalVisible) {
      form.setFieldsValue({ logo: '' });
    }
  }, [form, isModalVisible]);

  const handleFaviconRemove = useCallback(() => {
    setTempFaviconUrl('');
    setPendingFavicon(null);
    if (isModalVisible) {
      form.setFieldsValue({ favicon: '' });
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
    setTempLogoUrl(company.companyLogoUrl || '');
    setTempFaviconUrl(company.companyFavIcoUrl || '');
    
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
    setTempLogoUrl('');
    setTempFaviconUrl('');
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
        const {
          lastActiveChat,
          companyId,
          fileUploadSize,
        } = response.data.data;

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
        setLocalStorageItem(
          `companyFavIcoUrl-${values.companySlug}`,
          updatedCompany?.companyFavIcoUrl
        );
        setLocalStorageItem(
          `companyLogoUrl-${values.companySlug}`,
          updatedCompany?.companyLogoUrl
        );

        // Handle domain change
        if (companySlug !== values.companySlug) {
          localStorage.setItem("companyDomain", values.companySlug);
          window.location.href = `/${values.companySlug}/admin/company-management`;
        } else {
          // Refresh company data
          await fetchCompany();
          setIsModalVisible(false);
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
    fetchCompany,
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

  if (loading && !company) {
    return (
      <div className="company-loading" style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card className="company-profile-card">
      <div className="company-header">
        <h1>Company Management</h1>
        <Button
          type="primary"
          icon={<EditOutlined />}
          disabled={!company}
          onClick={showEditModal}
          loading={loading}
        >
          Edit
        </Button>
      </div>

      <Row gutter={[24, 24]} className="info-cards">
        <Col xs={24} sm={12}>
          <InfoCard label="COMPANY NAME" value={company?.companyName} />
        </Col>
        <Col xs={24} sm={12}>
          <InfoCard label="COMPANY SLUG" value={company?.companyDomain} />
        </Col>
        <Col xs={24} sm={12}>
          <InfoCard
            label="TOTAL EMPLOYEES"
            value={company?.employeeCount ?? 0}
          />
        </Col>
        <Col xs={24} sm={12}>
          <InfoCard
            label="CREATED AT"
            value={company ? moment(company.createdAt).format('MMM DD, YYYY') : ''}
          />
        </Col>
      </Row>

      <div className="company-assets">
        <h3>Company Assets</h3>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12}>
            <AssetCard
              title="Logo"
              imageUrl={company?.companyLogoUrl}
              placeholder="No logo"
              disabled={true} // Assets are read-only in main view
              onUpload={handleLogoUpload}
              onRemove={handleLogoRemove}
            />
          </Col>
          <Col xs={24} sm={12}>
            <AssetCard
              title="Favicon"
              imageUrl={company?.companyFavIcoUrl}
              placeholder="No favicon"
              disabled={true} // Assets are read-only in main view
              onUpload={handleFaviconUpload}
              onRemove={handleFaviconRemove}
            />
          </Col>
        </Row>
      </div>

      {/* Edit Modal */}
      <Modal
        title="Edit Company"
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button
            key="cancel"
            onClick={handleModalClose}
            disabled={modalLoading}
          >
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={modalLoading}
            onClick={handleSave}
          >
            Save Changes
          </Button>,
        ]}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="companyName"
            label="Company Name"
            rules={formRules.companyName}
          >
            <Input placeholder="Enter company name" />
          </Form.Item>

          <Form.Item
            label="Company Slug"
            name="companySlug"
            rules={formRules.companySlug}
            extra="This will be used to create your company's unique domain. Only lowercase letters, numbers, and hyphens are allowed."
          >
            <Input
              prefix={<LinkOutlined />}
              placeholder="my-company"
            />
          </Form.Item>

          <Form.Item
            name="ownerName"
            label="Owner Name"
          >
            <Input placeholder="Enter owner name" />
          </Form.Item>

          <Row gutter={24}>
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
    </Card>
  );
}
