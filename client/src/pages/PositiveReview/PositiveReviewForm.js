/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button, Checkbox, Col, Form, Input, message, Row, Select } from "antd";
import { Header } from "antd/es/layout/layout";
import { useDispatch } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import TextArea from "antd/es/input/TextArea";

import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import "../Complaints/ComplaintsForm.css";
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

const FORM_LAYOUT = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};

const PositiveReviewForm = () => {
  // Hooks
  const { review_id } = useParams();
  const companySlug = localStorage.getItem("companyDomain");
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const history = useHistory();

  // State
  const [projects, setProjects] = useState([]);
  const [selectedFeedbackType, setSelectedFeedbackType] = useState("");
  const [reviewId, setReviewId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Memoized values
  const isEditMode = useMemo(() => Boolean(reviewId), [reviewId]);
  const headerTitle = useMemo(() => `${isEditMode ? "Edit" : "Add"} Review`, [isEditMode]);
  const submitButtonText = useMemo(() => isEditMode ? "Update" : "Submit", [isEditMode]);

  // API calls with error handling
  const handleApiCall = useCallback(async (apiCall, errorMessage = "An error occurred") => {
    try {
      setLoading(true);
      dispatch(showAuthLoader());
      const response = await apiCall();
      return response;
    } catch (error) {
      console.error(errorMessage, error);
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
      dispatch(hideAuthLoader());
    }
  }, [dispatch]);

  // Fetch projects
  const getProjects = useCallback(async () => {
    await handleApiCall(
      async () => {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.myProjects,
        });

        if (response?.data?.data) {
          setProjects(response.data.data);
        }
        return response;
      },
      "Failed to fetch projects"
    );
  }, [handleApiCall]);

  // Fetch project details
  const getProjectDetails = useCallback(async (projectId) => {
    if (!projectId) return;

    await handleApiCall(
      async () => {
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
        return response;
      },
      "Failed to fetch project details"
    );
  }, [form, handleApiCall]);

  // Fetch review for editing
  const getReviewForEdit = useCallback(async (reviewId) => {
    if (!reviewId) return;

    setReviewId(reviewId);
    await handleApiCall(
      async () => {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getReviewList,
          body: { _id: reviewId },
        });

        if (response?.data?.data) {
          const reviewData = response.data.data;
          setSelectedFeedbackType(reviewData.feedback_type || "");
          
          form.setFieldsValue({
            project: reviewData.project_id,
            client_name: reviewData.client_name,
            feedback: reviewData.feedback,
            feedback_type: reviewData.feedback_type,
            project_manager: reviewData.manager?.full_name || "",
            account_manager: reviewData.acc_manager?.full_name || "",
            client_nda_sign: reviewData.client_nda_sign || false,
          });
        }
        return response;
      },
      "Failed to fetch review details"
    );
  }, [form, handleApiCall]);

  // Handle form submission
  const handleSubmit = useCallback(async (values) => {
    const reqBody = {
      project_id: values.project,
      client_name: values.client_name,
      feedback_type: selectedFeedbackType,
      feedback: values.feedback,
      client_nda_sign: values.client_nda_sign || false,
    };

    try {
      setLoading(true);
      let response;

      if (reviewId) {
        // Update existing review
        response = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: `${Service.updateReview}/${reviewId}`,
          body: reqBody,
        });
      } else {
        // Create new review
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
      setLoading(false);
    }
  }, [selectedFeedbackType, reviewId, history]);

  // Event handlers
  const handleFeedbackTypeChange = useCallback((value) => {
    setSelectedFeedbackType(value);
  }, []);

  const handleProjectChange = useCallback((projectId) => {
    getProjectDetails(projectId);
  }, [getProjectDetails]);

  const handleCancel = useCallback(() => {
    history.push(`/${companySlug}/positive-review`);
  }, [history]);

  // Effects
  useEffect(() => {
    const initializeForm = async () => {
      await getProjects();
      if (review_id) {
        await getReviewForEdit(review_id);
      }
    };

    initializeForm();
  }, [review_id, getProjects, getReviewForEdit]);

  // Memoized project options
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

  return (
    <div className="main-time-sheet-project-wrapper pr-form-page">
      <Header className="main-header">
        <div className="project-name">
          <h3 style={{ textTransform: "capitalize" }}>
            {headerTitle}
          </h3>
        </div>
      </Header>
      
      <div className="project-wrapper new-project-overview project-running-reports">
        <div className="peoject-page">
          <div className="header">
            <div className="project-running-reports-fillter-wrapper feedback-form">
              <Form
                form={form}
                noValidate
 labelCol={{ xs: 24, sm: 24, md: 8, lg: 8 }}
  wrapperCol={{ xs: 24, sm: 24, md: 16, lg: 16 }}
  labelWrap
                // {...FORM_LAYOUT}
                  labelAlign="left"
                onFinish={handleSubmit}
              >
                <Row>
                  <Col span={12}>
                    <Form.Item
                      name="project"
                      label="Project"
                      rules={[
                        {
                          required: true,
                          message: "Please Select Project !",
                        },
                      ]}
                    >
                      <Select
                        placeholder="Project"
                        showSearch
                        loading={loading}
                        filterOption={(input, option) =>
                          option.children
                            ?.toLowerCase()
                            .indexOf(input?.toLowerCase()) >= 0
                        }
                        filterSort={(optionA, optionB) =>
                          optionA.children
                            ?.toLowerCase()
                            .localeCompare(optionB.children?.toLowerCase())
                        }
                        onChange={handleProjectChange}
                      >
                        {projectOptions}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="project_manager"
                      label="Project Manager"
                      rules={[
                        {
                          required: true,
                          message: "Please enter Project Manager name !",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Enter Project Manager name"
                        disabled
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row>
                  <Col span={12}>
                    <Form.Item
                      name="account_manager"
                      label="Account Manager"
                      rules={[
                        {
                          required: true,
                          message: "Please Select Account Manager !",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Enter Account Manager name"
                        disabled
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Client Name"
                      name="client_name"
                      rules={[
                        {
                          required: true,
                          message: "Please enter client name !",
                        },
                      ]}
                    >
                      <Input placeholder="Enter client name" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row>
                  <Col span={12}>
                    <Form.Item name="feedback_type" label="Feedback Type">
                      <Select
                        onChange={handleFeedbackTypeChange}
                        defaultValue="--select--"
                        options={FEEDBACK_TYPE_OPTIONS}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row>
                  <Col span={12}>
                    <Form.Item
                      label="Did the client sign the NDA?"
                      name="client_nda_sign"
                      valuePropName="checked"
                    >
                      <Checkbox />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Feedback"
                      name="feedback"
                      rules={[
                        {
                          required: true,
                          message: "Please fill the feedback!",
                        },
                      ]}
                    >
                      <TextArea rows={4} placeholder="Enter your feedback" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <div className="feedback-submit-button-form">
                    <Button 
                      id="addbutton" 
                      type="primary" 
                      htmlType="submit"
                      loading={loading}
                    >
                      {submitButtonText}
                    </Button>
                    <Button
                      className="ant-delete delete-btn"
          
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </Form.Item>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PositiveReviewForm;
