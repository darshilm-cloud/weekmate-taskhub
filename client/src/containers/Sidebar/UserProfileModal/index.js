import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, Upload, message, Avatar, Spin } from "antd";
import { EditOutlined, UserOutlined } from "@ant-design/icons";
import Service from "../../../service";
import { userSignInSuccess } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";

const UserProfileModal = ({
  isModalOpen,
  handleOk,
  handleClose,
}) => {
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
        options: {
          "content-type": "multipart/form-data",
        },
      });

      if (response.data.status === 1) {
        message.success(response.data.message);
        return response.data.data[0]?.file_path;
      } else {
        message.error(response.data.message || "Upload failed");
        return null;
      }
    } catch (error) {
      console.error("Upload error:", error);
      message.error("Failed to upload image");
      return null;
    }
  };

  const updateUserProfile = async (values) => {
    try {
      setSaving(true);
      
      let profileImageUrl = userData?.emp_img || "";
      
      // Upload image if a new one was selected
      if (imageFile) {
        setUploading(true);
        profileImageUrl = await uploadFile(imageFile, "profile");
        setUploading(false);
        
        if (!profileImageUrl) {
          setSaving(false);
          return; // Stop if upload failed
        }
      }

      // Prepare update payload - only include changed fields
      const updatePayload = {
        firstName: values.firstName,
        lastName: values.lastName,
      };

      // Only include profileImage if it was actually changed
      if (imageFile) {
        updatePayload.profileImage = profileImageUrl;
      }

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.editEmployee}/${user_data?._id}`,
        body: updatePayload,
      });

      if (response.data.status === 1) {
        message.success("Profile updated successfully!");
        
        // Update local state
        setUserData(prev => ({
          ...prev,
          first_name: values.firstName,
          last_name: values.lastName,
          emp_img: profileImageUrl,
        }));
        
        // Update localStorage if needed
        const updatedUserData = {
          ...user_data,
          first_name: values.firstName,
          last_name: values.lastName,
          emp_img: profileImageUrl,
        };
        localStorage.setItem("user_data", JSON.stringify(updatedUserData));
        dispatch(userSignInSuccess(updatedUserData));
        
        // Reset image file state
        setImageFile(null);
        
        // Call parent handler
        handleOk && handleOk(updatedUserData);
      } else {
        message.error(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update error:", error);
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
    if (!validTypes.includes(file.type)) {
      message.error("Please select a valid image file (JPG, PNG, or GIF)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      message.error("Image size must be less than 2MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);

    // Store file for later upload
    setImageFile(file);
  };

  const handleFinish = (values) => {
    updateUserProfile(values);
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
        
        // Set form values
        form.setFieldsValue({
          firstName: userDetails.first_name,
          lastName: userDetails.last_name,
        });
      } else {
        message.error("Failed to load user details");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      message.error("Failed to load user details");
    }
  };

  const handleModalCancel = () => {
    // Reset form and image states
    form.resetFields();
    setImageFile(null);
    setPreviewImage(userData?.emp_img);
    handleClose();
  };

  useEffect(() => {
    if (isModalOpen && user_data?._id) {
      getUserDetails();
    }
  }, [isModalOpen, user_data?._id]);

  return (
    <Modal
      open={isModalOpen}
      title="User Profile"
      className="user-profile"
      onCancel={handleModalCancel}
      footer={null}
      destroyOnClose
      width={500}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          {uploading && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
              }}
            >
              <Spin size="large" />
            </div>
          )}
          <Avatar
            size={100}
            src={previewImage}
            icon={!previewImage && <UserOutlined />}
            style={{ backgroundColor: "#f0f0f0" }}
          />
          <Upload
            showUploadList={ false }
            beforeUpload={ () => false }
            onChange={ handleImageChange }
            accept="image/*"
            disabled={uploading || saving}
          >
            <div
              style={ {
                position: "absolute",
                top: 0,
                right: 0,
                width: 32,
                height: 32,
                backgroundColor: uploading || saving ? "#d9d9d9" : "#1890ff",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: uploading || saving ? "not-allowed" : "pointer",
                border: "2px solid white",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                if (!uploading && !saving) {
                  e.target.style.backgroundColor = "#40a9ff";
                  e.target.style.transform = "scale(1.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!uploading && !saving) {
                  e.target.style.backgroundColor = "#1890ff";
                  e.target.style.transform = "scale(1)";
                }
              }}
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
        onFinish={handleFinish}
        disabled={saving}
      >
        <Form.Item
          label="First Name"
          name="firstName"
          rules={ [
            { required: true, message: "First name is required" },
            { min: 2, message: "First name must be at least 2 characters" },
            { max: 50, message: "First name cannot exceed 50 characters" },
          ]}
        >
          <Input placeholder="Enter first name" />
        </Form.Item>

        <Form.Item
          label="Last Name"
          name="lastName"
          rules={ [
            { required: true, message: "Last name is required" },
            { min: 2, message: "Last name must be at least 2 characters" },
            { max: 50, message: "Last name cannot exceed 50 characters" },
          ]}
        >
          <Input placeholder="Enter last name" />
        </Form.Item>

        <Form.Item label="Email">
          <Input value={ userData?.email } disabled />
        </Form.Item>

        <Form.Item style={{ textAlign: "right", marginTop: 24, marginBottom: 0 }}>
          <Button onClick={handleModalCancel} style={{ marginRight: 8 }} disabled={saving}>
            Cancel
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={saving || uploading}
            disabled={saving || uploading}
          >
            {uploading ? "Uploading..." : saving ? "Saving..." : "Save Changes"}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserProfileModal;