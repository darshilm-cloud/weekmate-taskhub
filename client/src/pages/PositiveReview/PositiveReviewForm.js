/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button, Checkbox, Col, Form, Input, message, Row, Select } from "antd";
import {
  ProjectOutlined,
  UserOutlined,
  TeamOutlined,
  MessageOutlined,
  ArrowLeftOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { useHistory, useParams } from "react-router-dom";
import TextArea from "antd/es/input/TextArea";

import Service from "../../service";
import { ReviewFormSkeleton } from "../../components/common/SkeletonLoader";
import "../Complaints/ComplaintsForm.css";
import "./PositiveReview.css";
import "../../assets/css/pms.css";
import "../../assets/css/style.css";

// Constants
const FEEDBACK_TYPE_OPTIONS = [
  { value: "Clutch Review", label: "Clutch Review" },
  { value: "Video Testimonial", label: "Video Testimonial" },
  { value: "Text Testimonial", label: "Text Testimonial" },
  { value: "Feedback", label: "Feedback" },
  { value: "Zoho Partner Profile", label: "Zoho Partner Profile" },
];

const PositiveReviewForm = () => {
  const { review_id } = useParams();
  const companySlug = localStorage.getItem("companyDomain");
  const [form] = Form.useForm();
  const history = useHistory();

  const [projects, setProjects] = useState([]);
  const [selectedFeedbackType, setSelectedFeedbackType] = useState("");
  const [reviewId, setReviewId] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(true);  // project dropdown loading
  const [detailLoading, setDetailLoading] = useState(false);     // on project select
  const [submitting, setSubmitting] = useState(false);           // form submit only
  const [pageLoading, setPageLoading] = useState(!!review_id);   // skeleton only in edit mode

  const isEditMode = useMemo(() => Boolean(reviewId), [reviewId]);
  const headerTitle = useMemo(() => `${isEditMode ? "Edit" : "Add"} Review`, [isEditMode]);
  const submitButtonText = useMemo(() => (isEditMode ? "Update" : "Submit"), [isEditMode]);

  const getProjectDetails = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      setDetailLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getOverview}/${projectId}`,
      });
      if (response?.data?.data) {
        const { manager, acc_manager } = response.data.data;
        form.setFieldsValue({
          project_manager: manager?.full_name || "",
          account_manager: acc_manager?.full_name || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch project details", error);
    } finally {
      setDetailLoading(false);
    }
  }, [form]);

  const handleSubmit = useCallback(async (values) => {
    const reqBody = {
      project_id: values.project,
      client_name: values.client_name,
      feedback_type: selectedFeedbackType,
      feedback: values.feedback,
      client_nda_sign: values.client_nda_sign || false,
    };
    try {
      setSubmitting(true);
      let response;
      if (reviewId) {
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
        message.success(response.data.message || "Review saved successfully");
        history.push(`/${companySlug}/positive-review`);
      } else {
        message.error(response?.data?.message || "Failed to save review");
      }
    } catch (error) {
      console.error("Submit error:", error);
      message.error("An error occurred while saving the review");
    } finally {
      setSubmitting(false);
    }
  }, [selectedFeedbackType, reviewId, history]);

  const handleFeedbackTypeChange = useCallback((value) => {
    setSelectedFeedbackType(value);
  }, []);

  const handleProjectChange = useCallback((projectId) => {
    getProjectDetails(projectId);
  }, [getProjectDetails]);

  const handleCancel = useCallback(() => {
    history.push(`/${companySlug}/positive-review`);
  }, [history]);

  useEffect(() => {
    // Fetch projects in background — don't block page render
    const fetchProjects = async () => {
      try {
        // Check session cache first to avoid slow repeated fetches
        const cached = sessionStorage.getItem("prf_projects");
        if (cached) {
          setProjects(JSON.parse(cached));
          setProjectsLoading(false);
          return;
        }
        const res = await Service.makeAPICall({ methodName: Service.postMethod, api_url: Service.myProjects });
        if (res?.data?.data) {
          setProjects(res.data.data);
          sessionStorage.setItem("prf_projects", JSON.stringify(res.data.data));
        }
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setProjectsLoading(false);
      }
    };

    // Fetch review data (fast) — only in edit mode, this drives the skeleton
    const fetchReview = async () => {
      if (!review_id) return;
      try {
        setReviewId(review_id);
        const res = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getReviewList,
          body: { _id: review_id },
        });
        if (res?.data?.data) {
          const d = res.data.data;
          setSelectedFeedbackType(d.feedback_type || "");
          form.setFieldsValue({
            project: d.project_id,
            client_name: d.client_name,
            feedback: d.feedback,
            feedback_type: d.feedback_type,
            project_manager: d.manager?.full_name || "",
            account_manager: d.acc_manager?.full_name || "",
            client_nda_sign: d.client_nda_sign || false,
          });
        }
      } catch (error) {
        console.error("Failed to fetch review", error);
      } finally {
        setPageLoading(false);
      }
    };

    // Both run in parallel — projects loads quietly, review unblocks skeleton fast
    fetchProjects();
    fetchReview();
  }, [review_id]);

  const projectOptions = useMemo(() =>
    projects.map((project, index) => (
      <Select.Option
        key={`${project._id}-${index}`}
        value={project._id}
        style={{ textTransform: "capitalize" }}
      >
        {project.title}
      </Select.Option>
    )),
    [projects]
  );

  if (pageLoading) return <ReviewFormSkeleton />;

  return (
    <div className="prf-page">
      {/* Page Header */}
      <div className="prf-header">
        <button className="prf-back-btn" onClick={handleCancel}>
          <ArrowLeftOutlined />
        </button>
        <div className="prf-header-text">
          <div className="prf-header-icon">
            <StarOutlined />
          </div>
          <div>
            <h2 className="prf-title">{headerTitle}</h2>
            <p className="prf-subtitle">Fill in the details to record client feedback</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="prf-card">
        <Form
          form={form}
          noValidate
          layout="vertical"
          onFinish={handleSubmit}
          className="prf-form"
        >
          {/* Section: Project Info */}
          <div className="prf-section">
            <div className="prf-section-title">
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
                    filterSort={(a, b) =>
                      a.children?.toLowerCase().localeCompare(b.children?.toLowerCase())
                    }
                    onChange={handleProjectChange}
                  >
                    {projectOptions}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="project_manager"
                  label="Project Manager"
                  rules={[{ required: true, message: "Please enter Project Manager name!" }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Auto-filled on project select" disabled suffix={detailLoading ? <span className="ant-spin-dot" style={{width:12,height:12}} /> : null} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="account_manager"
                  label="Account Manager"
                  rules={[{ required: true, message: "Please select Account Manager!" }]}
                >
                  <Input prefix={<TeamOutlined />} placeholder="Auto-filled on project select" disabled suffix={detailLoading ? <span className="ant-spin-dot" style={{width:12,height:12}} /> : null} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Client Name"
                  name="client_name"
                  rules={[{ required: true, message: "Please enter client name!" }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Enter client name" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Divider */}
          <div className="prf-divider" />

          {/* Section: Feedback Details */}
          <div className="prf-section">
            <div className="prf-section-title">
              <MessageOutlined /> Feedback Details
            </div>
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="feedback_type" label="Feedback Type">
                  <Select
                    onChange={handleFeedbackTypeChange}
                    placeholder="Select feedback type"
                    options={FEEDBACK_TYPE_OPTIONS}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Did the client sign the NDA?"
                  name="client_nda_sign"
                  valuePropName="checked"
                  className="prf-nda-item"
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
                  <TextArea rows={5} placeholder="Enter the client's feedback here..." />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Actions */}
          <div className="prf-actions">
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              className="prf-submit-btn"
            >
              {submitButtonText}
            </Button>
            <Button
              className="prf-cancel-btn"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default PositiveReviewForm;
