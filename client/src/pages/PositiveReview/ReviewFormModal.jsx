import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button, Checkbox, Col, Form, Input, Modal, Row, Select, Spin, message } from "antd";
import {
  ProjectOutlined,
  UserOutlined,
  TeamOutlined,
  MessageOutlined,
  StarOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import TextArea from "antd/es/input/TextArea";
import Service from "../../service";

const FEEDBACK_TYPE_OPTIONS = [
  { value: "Clutch Review", label: "Clutch Review" },
  { value: "Video Testimonial", label: "Video Testimonial" },
  { value: "Text Testimonial", label: "Text Testimonial" },
  { value: "Feedback", label: "Feedback" },
  { value: "Zoho Partner Profile", label: "Zoho Partner Profile" },
];

const ReviewFormModal = ({ open, onCancel, onSuccess, reviewId, mode = "add" }) => {
  const [form] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [selectedFeedbackType, setSelectedFeedbackType] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  const isViewOnly = mode === "view";
  const isEditMode = mode === "edit";

  const getProjectDetails = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      setDetailLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getOverview}/${projectId}`,
      });
      if (response?.data?.data) {
        const { manager/*, acc_manager*/ } = response.data.data; // AM hidden
        form.setFieldsValue({
          project_manager: manager?.full_name || "",
          // account_manager: acc_manager?.full_name || "", // AM hidden
        });
      }
    } catch (error) {
      console.error("Failed to fetch project details", error);
    } finally {
      setDetailLoading(false);
    }
  }, [form]);

  const fetchReview = useCallback(async (id) => {
    try {
      setFetchingDetails(true);
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getReviewList,
        body: { _id: id },
      });
      if (res?.data?.data) {
        const d = res.data.data;
        setSelectedFeedbackType(d.feedback_type || "");
        form.setFieldsValue({
          project: d.project_id,
          client_name: d.client_name,
          feedback: d.feedback ? d.feedback.replace(/<br>/g, "\n") : "",
          feedback_type: d.feedback_type,
          project_manager: d.manager?.full_name || "",
          // account_manager: d.acc_manager?.full_name || "", // AM hidden
          review_url: d.review_url || "",
          client_nda_sign: d.client_nda_sign || false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch review", error);
    } finally {
      setFetchingDetails(false);
    }
  }, [form]);

  const fetchProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      const res = await Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.myProjects });
      if (res?.data?.data) {
        setProjects(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setSelectedFeedbackType("");
      fetchProjects();
      if (reviewId) {
        fetchReview(reviewId);
      }
    }
  }, [open, reviewId, fetchReview, fetchProjects, form]);

  const handleSubmit = async (values) => {
    if (isViewOnly) {
      onCancel();
      return;
    }
    const reqBody = {
      project_id: values.project,
      client_name: values.client_name,
      feedback_type: selectedFeedbackType,
      feedback: values.feedback,
      review_url: values.review_url || "",
      client_nda_sign: values.client_nda_sign || false,
    };
    try {
      setSubmitting(true);
      let response;
      if (isEditMode && reviewId) {
        response = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: `${Service.updateReview}/${reviewId}`,
          body: reqBody,
        });
      } else {
        response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.addReview,
          body: reqBody,
        });
      }
      if (response?.data?.data && (response.data.statusCode === 201 || response.data.statusCode === 200)) {
        onSuccess(response.data.message || "Review saved successfully");
      } else {
        message.error(response?.data?.message || "Failed to save review");
      }
    } catch (error) {
      console.error("Submit error:", error);
      message.error("An error occurred while saving the review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StarOutlined style={{ color: "#2563eb" }} />
          <span>{isViewOnly ? "View Review" : isEditMode ? "Edit Review" : "Add Review"}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" className="delete-btn" onClick={onCancel}>
          {isViewOnly ? "Close" : "Cancel"}
        </Button>,
        !isViewOnly && (
          <Button key="submit" type="primary" loading={submitting} onClick={() => form.submit()}>
            {isEditMode ? "Update" : "Submit"}
          </Button>
        ),
      ]}
      destroyOnClose
    >
      <Spin spinning={fetchingDetails}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="prf-form"
          style={{ padding: "20px 0" }}
          disabled={isViewOnly}
        >
          <div className="prf-section" style={{ border: "none", padding: 0 }}>
            <div className="prf-section-title" style={{ marginBottom: 20, fontSize: 16, fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
              <ProjectOutlined /> Project Information
            </div>
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="project"
                  label="Project"
                  rules={[{ required: true, message: "Please select a project!" }]}
                >
                  <Select
                    placeholder="Select a project"
                    showSearch
                    loading={projectsLoading}
                    filterOption={(input, option) =>
                      option.children?.toLowerCase().indexOf(input?.toLowerCase()) >= 0
                    }
                    onChange={(val) => getProjectDetails(val)}
                  >
                    {projects.map((p) => (
                      <Select.Option key={p._id} value={p._id}>{p.title}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="project_manager" label="Project Manager">
                  <Input prefix={<UserOutlined />} placeholder="Auto-filled" disabled />
                </Form.Item>
              </Col>
              {/* Account Manager hidden */}
              {/* <Col xs={24} md={12}>
                <Form.Item name="account_manager" label="Account Manager">
                  <Input prefix={<TeamOutlined />} placeholder="Auto-filled" disabled />
                </Form.Item>
              </Col> */}
              <Col xs={24} md={12}>
                <Form.Item
                  label="Client"
                  name="client_name"
                  rules={[{ required: true, message: "Please enter client name!" }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Enter client name" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div style={{ height: 1, background: "#e2e8f0", margin: "24px 0" }} />

          <div className="prf-section" style={{ border: "none", padding: 0 }}>
            <div className="prf-section-title" style={{ marginBottom: 20, fontSize: 16, fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
              <MessageOutlined /> Feedback Details
            </div>
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="feedback_type" label="Feedback Type" rules={[{ required: true }]}>
                  <Select
                    onChange={(val) => setSelectedFeedbackType(val)}
                    placeholder="Select feedback type"
                    options={FEEDBACK_TYPE_OPTIONS}
                  />
                </Form.Item>
              </Col>
              {(selectedFeedbackType === "Clutch Review" || selectedFeedbackType === "Video Testimonial") && (
                <Col xs={24} md={12}>
                  <Form.Item
                    name="review_url"
                    label={selectedFeedbackType === "Clutch Review" ? "Clutch Review URL" : "Video URL"}
                    rules={[{ type: "url", message: "Please enter a valid URL" }]}
                  >
                    <Input placeholder="https://..." prefix={<LinkOutlined style={{ color: "#cbd5e1" }} />} />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} md={12}>
                <Form.Item
                  label="NDA Signed"
                  name="client_nda_sign"
                  valuePropName="checked"
                >
                  <Checkbox>Yes, client signed NDA</Checkbox>
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  label="Feedback"
                  name="feedback"
                  rules={[{ required: true, message: "Please fill the feedback!" }]}
                >
                  <TextArea rows={4} placeholder="Enter the client's feedback here..." />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ReviewFormModal;
