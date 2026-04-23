import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, Upload, message, Avatar, Spin } from "antd";
import { EditOutlined, UserOutlined } from "@ant-design/icons";
import Service from "../../../service";
import { userSignInSuccess } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";
import "./UserProfileModal.css";

const UserProfileModal = ({ isModalOpen, handleOk, handleClose }) => {
  const dispatch = useDispatch();
  const user_data = JSON.parse(localStorage.getItem("user_data"));
  const [form] = Form.useForm();

  const [userData, setUserData] = useState({});
  const [previewImage, setPreviewImage] = useState();
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadFile = async (file, fileType = "profile") => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileUpload}?file_for=${fileType}`,
        body: formData,
        options: { "content-type": "multipart/form-data" },
      });
      if (response.data.status === 1) {
        message.success(response.data.message);
        return response.data.data[0]?.file_path;
      } else {
        message.error(response.data.message || "Upload failed");
        return null;
      }
    } catch (error) {
      message.error("Failed to upload image");
      return null;
    }
  };

  const updateUserProfile = async (values) => {
    try {
      setSaving(true);
      let profileImageUrl = userData?.emp_img || "";

      if (imageFile) {
        setUploading(true);
        profileImageUrl = await uploadFile(imageFile, "profile");
        setUploading(false);
        if (!profileImageUrl) { setSaving(false); return; }
      }

      const updatePayload = { firstName: values.firstName, lastName: values.lastName };
      if (imageFile) updatePayload.profileImage = profileImageUrl;

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.editEmployee}/${user_data?._id}`,
        body: updatePayload,
      });

      if (response.data.status === 1) {
        message.success("Profile updated successfully!");
        setUserData(prev => ({ ...prev, first_name: values.firstName, last_name: values.lastName, emp_img: profileImageUrl }));
        const updatedUserData = { ...user_data, first_name: values.firstName, last_name: values.lastName, emp_img: profileImageUrl };
        localStorage.setItem("user_data", JSON.stringify(updatedUserData));
        dispatch(userSignInSuccess(updatedUserData));
        setImageFile(null);
        handleOk && handleOk(updatedUserData);
      } else {
        message.error(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      message.error("Failed to update profile");
    } finally {
      setSaving(false);
      setUploading(false);
      handleClose();
    }
  };

  const handleImageChange = (info) => {
    const file = info.file.originFileObj || info.file;
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) { message.error("Please select JPG, PNG, or GIF"); return; }
    if (file.size > 2 * 1024 * 1024) { message.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => setPreviewImage(e.target.result);
    reader.readAsDataURL(file);
    setImageFile(file);
  };

  const handleModalCancel = () => {
    form.resetFields();
    setImageFile(null);
    setPreviewImage(userData?.emp_img);
    handleClose();
  };

  const getUserDetails = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `/employees/${user_data?._id}`,
      });
      if (response.data.status === 1) {
        const userDetails = response.data.data[0];
        setUserData(userDetails);
        setPreviewImage(`${process.env.REACT_APP_API_URL}/public/${userDetails.emp_img}`);
        form.setFieldsValue({ firstName: userDetails.first_name, lastName: userDetails.last_name });
      }
    } catch (error) {
      message.error("Failed to load user details");
    }
  };

  useEffect(() => {
    if (isModalOpen && user_data?._id) getUserDetails();
  }, [isModalOpen, user_data?._id]);

  const fullName = `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim() || "Your Profile";

  return (
    <Modal
      open={isModalOpen}
      className="upm-modal"
      onCancel={handleModalCancel}
      title={null}
      footer={[
        <Button key="cancel" className="delete-btn" onClick={handleModalCancel} disabled={saving}>
          Cancel
        </Button>,
        <Button
          key="save"
          className="add-btn"
          type="primary"
          loading={saving || uploading}
          onClick={() => form.submit()}
        >
          {uploading ? "Uploading…" : saving ? "Saving…" : "Save"}
        </Button>,
      ]}
      destroyOnClose
      width={460}
    >
      {/* Gradient header banner */}
      <div className="upm-header">
        <p className="upm-header-title">User Profile</p>
        <p className="upm-header-sub">Update your personal information</p>
      </div>

      <div className="upm-body">
        {/* Avatar */}
        <div className="upm-avatar-wrap">
          {uploading && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
              <Spin />
            </div>
          )}
          <Avatar
            className="upm-avatar"
            src={previewImage}
            icon={!previewImage && <UserOutlined />}
          />
          <Upload
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleImageChange}
            accept="image/*"
            disabled={uploading || saving}
          >
            <div className="upm-avatar-edit">
              <EditOutlined />
            </div>
          </Upload>
        </div>

        <p className="upm-avatar-hint">JPG, PNG or GIF · max 2 MB</p>

        <Form
          form={form}
          layout="vertical"
          onFinish={updateUserProfile}
          disabled={saving}
          className="upm-form"
        >
          <Form.Item
            label="First Name"
            name="firstName"
            rules={[
              { required: true, message: "First name is required" },
              { min: 2, message: "At least 2 characters" },
              { max: 50, message: "Max 50 characters" },
            ]}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>

          <Form.Item
            label="Last Name"
            name="lastName"
            rules={[
              { required: true, message: "Last name is required" },
              { min: 2, message: "At least 2 characters" },
              { max: 50, message: "Max 50 characters" },
            ]}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>

          <Form.Item label="Email">
            <Input value={userData?.email} disabled />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default UserProfileModal;
