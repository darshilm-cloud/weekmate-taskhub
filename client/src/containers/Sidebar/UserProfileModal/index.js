import React, { useState } from "react";
import { Modal, Form, Input, Button, Upload, message, Avatar } from "antd";
import { EditOutlined, UploadOutlined, UserOutlined } from "@ant-design/icons";

const UserProfileModal = ({
  isModalOpen,
  handleOk,
  handleCancel,
  updateUserProfile,
  userData,
}) => {
  const [form] = Form.useForm();
  const [previewImage, setPreviewImage] = useState(userData?.profileImage || null);
  const [imageFile, setImageFile] = useState(null);

  const handleImageChange = (info) => {
    const file = info.file.originFileObj;

    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      message.error("Please select a valid image file (JPG, PNG, or GIF)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      message.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);

    setImageFile(file);
  };

  const handleFinish = (values) => {
    const formData = {
      ...values,
      email: userData?.email,
      profileImage: previewImage,
      imageFile,
    };
    updateUserProfile(formData);
  };

  return (
    <Modal
      className="user-profile"
      // open={ isModalOpen }
      title="User Profile"
      onCancel={ handleCancel }
      footer={ null }
      destroyOnClose
    >
      <div style={ { textAlign: "center", marginBottom: 24 } }>
        <div style={ { position: "relative", display: "inline-block" } }>
          <Avatar
            size={ 100 }
            src={ previewImage }
            icon={ !previewImage && <UserOutlined /> }
            style={ { backgroundColor: "#f0f0f0" } }
          />
          <Upload
            showUploadList={ false }
            beforeUpload={ () => false }
            onChange={ handleImageChange }
            accept="image/*"
          >
            <div
              style={ {
                position: "absolute",
                top: 0,
                right: 0,
                width: 32,
                height: 32,
                backgroundColor: "#f0f0f0",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "3px solid white",
                transition: "all 0.3s ease",
              } }
              onMouseEnter={ (e) => {
                e.target.style.backgroundColor = "#eee";
                e.target.style.transform = "scale(1.1)";
              } }
              onMouseLeave={ (e) => {
                e.target.style.backgroundColor = "#eee";
                e.target.style.transform = "scale(1)";
              } }
            >
              <EditOutlined style={ { color: "#888", fontSize: 14 } } />
            </div>
          </Upload>
        </div>
        <div style={ { marginTop: 8, color: "#888", fontSize: 12 } }>
          Image must be JPG, PNG, or GIF, under 2MB.
        </div>
      </div>

      <Form
        form={ form }
        layout="vertical"
        initialValues={ {
          firstName: userData?.firstName || "",
          lastName: userData?.lastName || "",
        } }
        onFinish={ handleFinish }
      >
        <Form.Item
          label="First Name"
          name="firstName"
          rules={ [
            { required: true, message: "First name is required" },
            { min: 2, message: "First name must be at least 2 characters" },
          ] }
        >
          <Input placeholder="Enter first name" />
        </Form.Item>

        <Form.Item
          label="Last Name"
          name="lastName"
          rules={ [
            { required: true, message: "Last name is required" },
            { min: 2, message: "Last name must be at least 2 characters" },
          ] }
        >
          <Input placeholder="Enter last name" />
        </Form.Item>

        <Form.Item label="Email">
          <Input value={ userData?.email } disabled />
        </Form.Item>

        <Form.Item style={ { textAlign: "right" } } >
          <Button className="delete-btn" onClick={ handleCancel } style={ { margin: "0 10px", display: "inline-block" } }>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" style={ { margin: "0 10px", display: "inline-block" } }>
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};


export default UserProfileModal;