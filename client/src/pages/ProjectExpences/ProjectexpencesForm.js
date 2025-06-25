import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Button,
  Col,
  Form,
  Input,
  message,
  Radio,
  Row,
  Select,
  Typography,
  Upload,
} from "antd";
import { Header } from "antd/es/layout/layout";
import { useDispatch } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import {
  DeleteOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  UploadOutlined,
} from "@ant-design/icons";

import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import "../Complaints/ComplaintsForm.css";
import "../../assets/css/pms.css";
import "../../assets/css/style.css";
import { sideBarContentId2 } from "../../constants";

const { Option } = Select;
const { Text } = Typography;

// Constants
const STATIC_ACCOUNTANT_ID = [sideBarContentId2];
const FORM_ITEM_LAYOUT = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 8 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
  },
};

const BILLING_CYCLE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const RADIO_OPTIONS = {
  BILLING: [
    { value: true, label: "Yes" },
    { value: false, label: "No" },
  ],
};

const ProjectExpensesForm = () => {
  // Hooks
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const history = useHistory();
  const { review_id } = useParams();

  // State
  const [state, setState] = useState({
    isModalOpen: false,
    projects: [],
    file: [],
    selectedFile: null,
    viewData: {},
    isRecurring: false,
    billingCycle: "monthly",
    reviewId: null,
  });

  // Memoized values
  const userRole = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user_data")) || {};
    } catch (error) {
      console.error("Error parsing user data:", error);
      return {};
    }
  }, []);

  const isAccountant = useMemo(
    () =>
      STATIC_ACCOUNTANT_ID.includes(userRole?._id) &&
      !(userRole?.pms_role_id?.role_name === "Super Admin"),
    [userRole]
  );

  const canEditStatus = useMemo(
    () =>
      userRole?.pms_role_id?.role_name === "Super Admin" ||
      STATIC_ACCOUNTANT_ID.includes(userRole?._id) ||
      userRole?.pms_role_id?.role_name === "Admin",
    [userRole]
  );

  // Update state helper
  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // API calls
  const fetchProjects = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
      });

      if (response?.data?.data) {
        updateState({ projects: response.data.data });
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      message.error("Failed to fetch projects");
    } finally {
      dispatch(hideAuthLoader());
    }
  }, [dispatch, updateState]);

  const fetchProjectDetails = useCallback(
    async (projectId) => {
      try {
        dispatch(showAuthLoader());
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
        console.error("Error fetching project details:", error);
        message.error("Failed to fetch project details");
      } finally {
        dispatch(hideAuthLoader());
      }
    },
    [dispatch, form]
  );

  const fetchReviewData = useCallback(
    async (reviewId) => {
      updateState({ reviewId });

      try {
        dispatch(showAuthLoader());
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getprojectexpanses,
          body: { _id: reviewId },
        });

        if (response?.data?.data) {
          const data = response.data.data;
          updateState({
            viewData: data,
            isRecurring: data.is_recuring || false,
          });

          // Fetch project details if available
          if (data.project?._id) {
            await fetchProjectDetails(data.project._id);
          }

          // Set form values based on user role
          const formValues = {
            project: isAccountant ? data.project?.title : data.project?._id,
            project_manager: data.manager?.full_name || "",
            account_manager: data.acc_manager?.full_name || "",
            purchase_request_details:
              data.purchase_request_details?.replace(/<br\s*\/?>/g, "\n") || "",
            cost_in_usd: data.cost_in_usd,
            need_to_bill_customer: data.need_to_bill_customer,
            status: data.status,
            details: data.details || "",
            billing_cycle: data.billing_cycle || "monthly",
            is_recuring: data.is_recuring || false,
            nature_Of_expense: data.nature_Of_expense || "",
          };

          form.setFieldsValue(formValues);
        }
      } catch (error) {
        console.error("Error fetching review data:", error);
        message.error("Failed to fetch review data");
      } finally {
        dispatch(hideAuthLoader());
      }
    },
    [dispatch, form, fetchProjectDetails, isAccountant, updateState]
  );

  // Event handlers
  const handleFileChange = useCallback(
    (info) => {
      const uploadedFiles = info.fileList;
      updateState({
        file: uploadedFiles,
        selectedFile: uploadedFiles,
      });
    },
    [updateState]
  );

  const handleRemoveFile = useCallback(() => {
    updateState({ selectedFile: null, file: [] });
  }, [updateState]);

  const handleStatusChange = useCallback(
    (value) => {
      updateState({ isModalOpen: value === "Paid" });
    },
    [updateState]
  );

  const handleProjectChange = useCallback(
    (projectId) => {
      fetchProjectDetails(projectId);
    },
    [fetchProjectDetails]
  );

  const handleRecurringChange = useCallback(
    (e) => {
      updateState({ isRecurring: e.target.value });
    },
    [updateState]
  );

  const handleBillingCycleChange = useCallback(
    (value) => {
      updateState({ billingCycle: value });
    },
    [updateState]
  );

  // Form submission
  const handleSubmit = useCallback(
    async (values) => {
      try {
        dispatch(showAuthLoader());

        if (state.reviewId) {
          // Update existing record
          const formData = new FormData();

          // Append files
          if (state.file.length > 0) {
            state.file.forEach((item) => {
              if (item.originFileObj) {
                formData.append("projectexpences", item.originFileObj);
              }
            });
          }

          const excludedKeys = [
            "project_manager",
            "account_manager",
            "billing_cycle",
            "is_recuring",
          ];
          Object.entries(values).forEach(([key, value]) => {
            if (
              !excludedKeys.includes(key) &&
              value !== undefined &&
              value !== null &&
              value !== ""
            ) {
              if (key === "status" && value === undefined) {
                formData.append(key, "Pending");
              } else {
                formData.append(key === "project" ? "project_id" : key, value);
              }
            }
          });

          // Handle recurring billing
          if (values.billing_cycle && values.is_recuring) {
            formData.append("billing_cycle", values.billing_cycle);
            formData.append("is_recuring", values.is_recuring);
          }

          const response = await Service.makeAPICall({
            methodName: Service.putMethod,
            api_url: `${Service.updateprojectexpanses}/${state.reviewId}`,
            body: formData,
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (response?.data?.data) {
            message.success(response.data.message);
            history.push("/projectexpense");
          } else {
            message.error(response.data.message);
          }
        } else {
          // Create new record
          const reviewData = {
            cost_in_usd: values.cost_in_usd,
            project_id: values.project,
            purchase_request_details: values.purchase_request_details,
            need_to_bill_customer: values.need_to_bill_customer,
            status: values.status,
          };

          if (values.billing_cycle && values.is_recuring) {
            reviewData.billing_cycle = values.billing_cycle;
            reviewData.is_recuring = values.is_recuring;
          }

          const response = await Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: Service.addprojectexpanses,
            body: reviewData,
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (response?.data?.statusCode === 201) {
            message.success(response.data.message);
            history.push("/projectexpense");
          } else {
            message.error(response.data.message);
          }
        }
      } catch (error) {
        console.error("Error submitting form:", error);
        message.error("Failed to submit form");
      } finally {
        dispatch(hideAuthLoader());
      }
    },
    [state, dispatch, history]
  );

  const handleCancel = useCallback(() => {
    history.push("/projectexpense");
  }, [history]);

  // Effects
  useEffect(() => {
    fetchProjects();
    if (review_id) {
      fetchReviewData(review_id);
    }
  }, [fetchProjects, fetchReviewData, review_id]);

  // Render helpers
  const renderProjectField = () => (
    <Form.Item
      name="project"
      label="Project"
      rules={[{ required: true, message: "Please Select Project!" }]}
    >
      {isAccountant ? (
        <Input placeholder="Project" disabled />
      ) : (
        <Select
          placeholder="Project"
          showSearch
          filterOption={(input, option) =>
            option.children?.toLowerCase().includes(input?.toLowerCase())
          }
          filterSort={(optionA, optionB) =>
            optionA.children
              ?.toLowerCase()
              .localeCompare(optionB.children?.toLowerCase())
          }
          onChange={handleProjectChange}
        >
          {state.projects.map((item) => (
            <Option
              key={item._id}
              value={item._id}
              style={{ textTransform: "capitalize" }}
            >
              {item.title}
            </Option>
          ))}
        </Select>
      )}
    </Form.Item>
  );

  const renderStatusOptions = () => {
    if (STATIC_ACCOUNTANT_ID.includes(userRole?._id)) {
      return userRole?.pms_role_id?.role_name === "Super Admin" ? (
        <Option value="Paid">Paid</Option>
      ) : null;
    }

    return (
      <>
        {userRole?.pms_role_id?.role_name === "Super Admin" && (
          <>
            <Option value="Approved">Approved</Option>
            <Option value="Rejected">Rejected</Option>
            <Option value="Paid">Paid</Option>
          </>
        )}
        {userRole?.pms_role_id?.role_name === "Admin" && (
          <>
            <Option value="Approved">Approved</Option>
            <Option value="Rejected">Rejected</Option>
          </>
        )}
      </>
    );
  };

  const renderFileUpload = () => (
    <Col xs={24} sm={24}>
      <Form.Item
        label={<Text className="font-medium">Upload Invoice</Text>}
        name="invoice"
        valuePropName="file"
        rules={[{ required: true, message: "Please upload an invoice!" }]}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
      >
        <Upload
          maxCount={1}
          beforeUpload={() => false}
          showUploadList={false}
          onChange={handleFileChange}
        >
          <Button
            icon={<UploadOutlined />}
            className="border-blue-500 text-blue-500 hover:border-blue-700 hover:text-blue-700"
          >
            Click to Upload
          </Button>
        </Upload>
      </Form.Item>

      {state.selectedFile && (
        <Row
          align="middle"
          className="project-expenses-hover-effect"
          style={{
            marginTop: -6,
            paddingLeft: 10,
            marginBottom: 20,
            width: 350,
            justifyContent: "space-between",
            padding: 5,
          }}
        >
          <Text>
            {state.selectedFile.map((file) =>
              file.name.length > 30 ? `${file.name.slice(0, 30)}...` : file.name
            )}
          </Text>
          <DeleteOutlined
            style={{
              color: "#545454",
              marginLeft: 10,
              cursor: "pointer",
            }}
            onClick={handleRemoveFile}
          />
        </Row>
      )}
    </Col>
  );

  return (
    <div
      className="main-time-sheet-project-wrapper"
      style={{ overflow: "auto" }}
    >
      <Header className="main-header">
        <div className="project-name">
          <h3 style={{ textTransform: "capitalize" }}>
            {state.reviewId ? "Edit" : "Add"} Project Expense
          </h3>
        </div>
      </Header>

      <div className="project-wrapper new-project-overview project-running-reports">
        <div className="peoject-page">
          <div className="header">
            <div className="project-running-reports-fillter-wrapper project-expences-wrapper feedback-form">
              <Form
                form={form}
                noValidate
                {...FORM_ITEM_LAYOUT}
                onFinish={handleSubmit}
              >
                <Row>
                  <Col span={12}>{renderProjectField()}</Col>
                  <Col span={12}>
                    <Form.Item
                      name="project_manager"
                      label="Project Manager"
                      rules={[
                        {
                          required: true,
                          message: "Please enter Project Manager name!",
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
                          message: "Please Select Account Manager!",
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
                      label="Cost in USD"
                      name="cost_in_usd"
                      rules={[
                        {
                          required: true,
                          message: "Please enter the cost in USD!",
                        },
                        {
                          pattern: /^\d+(\.\d{1,2})?$/,
                          message:
                            "Please enter a valid cost (up to 2 decimal places)!",
                        },
                      ]}
                    >
                      <Input
                        addonBefore={
                          <DollarCircleOutlined className="text-gray-500" />
                        }
                        placeholder="Enter cost in USD"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row>
                  <Col span={12}>
                    <Form.Item
                      label="Need to Bill Customer?"
                      name="need_to_bill_customer"
                      initialValue={true}
                    >
                      <Radio.Group>
                        {RADIO_OPTIONS.BILLING.map((option) => (
                          <Radio key={option.value} value={option.value}>
                            {option.label}
                          </Radio>
                        ))}
                      </Radio.Group>
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item
                      label="Is Recurring Purchase?"
                      name="is_recuring"
                      initialValue={state.isRecurring}
                    >
                      <Radio.Group onChange={handleRecurringChange}>
                        {RADIO_OPTIONS.BILLING.map((option) => (
                          <Radio key={option.value} value={option.value}>
                            {option.label}
                          </Radio>
                        ))}
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                </Row>

                <Row>
                  <Col span={12}>
                    <Form.Item
                      label="Purchase Request Details"
                      name="purchase_request_details"
                      rules={[
                        {
                          required: true,
                          message: "Please enter purchase request details!",
                        },
                      ]}
                    >
                      <Input.TextArea
                        placeholder="Enter purchase request details"
                        rows={4}
                      />
                    </Form.Item>
                  </Col>

                  {state.isRecurring && (
                    <Col span={12}>
                      <Form.Item
                        label="Billing Cycle"
                        name="billing_cycle"
                        initialValue={state.billingCycle}
                      >
                        <Select
                          value={state.billingCycle}
                          onChange={handleBillingCycleChange}
                          style={{ width: "100%" }}
                          placeholder="Select Billing Cycle"
                          disabled={!state.isRecurring}
                        >
                          {BILLING_CYCLE_OPTIONS.map((option) => (
                            <Option key={option.value} value={option.value}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  )}
                </Row>

                {state.reviewId && (
                  <>
                    <hr />
                    <Row style={{ paddingTop: "16px" }}>
                      <Col span={12} style={{ paddingTop: "16px" }}>
                        {canEditStatus && (
                          <Form.Item name="status" label="Status">
                            <Select
                              placeholder="Select Status"
                              onChange={handleStatusChange}
                              disabled={!canEditStatus}
                            >
                              {renderStatusOptions()}
                            </Select>
                          </Form.Item>
                        )}
                      </Col>

                      <Col span={12}>
                        {state.isModalOpen ? (
                          <Row>
                            <Col span={24}>
                              <Form.Item
                                label="Nature Of Expense"
                                name="nature_Of_expense"
                                rules={[
                                  {
                                    required: true,
                                    message: "Please enter Nature Of Expense!",
                                  },
                                ]}
                              >
                                <Input.TextArea
                                  placeholder="Enter details"
                                  rows={4}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={24}>
                              <Form.Item
                                label="Accounting Details"
                                name="details"
                                rules={[
                                  {
                                    required: true,
                                    message: "Please enter details!",
                                  },
                                ]}
                              >
                                <Input.TextArea
                                  placeholder="Enter details"
                                  rows={4}
                                />
                              </Form.Item>
                            </Col>
                            {renderFileUpload()}
                          </Row>
                        ) : (
                          state.viewData?.projectexpences?.length > 0 && (
                            <Row align="middle" style={{ marginTop: 16 }}>
                              <Col span={24}>
                                <Form.Item
                                  label="Accounting Details"
                                  name="details"
                                  rules={[
                                    {
                                      required: true,
                                      message: "Please enter details!",
                                    },
                                  ]}
                                >
                                  <Input.TextArea
                                    placeholder="Enter details"
                                    rows={4}
                                  />
                                </Form.Item>
                              </Col>

                              <Col style={{ padding: "20px 0" }}>
                                <Text strong style={{ paddingRight: "5px" }}>
                                  Document:
                                </Text>
                                <a
                                  href={`${process.env.REACT_APP_API_URL}/public/projectexpense/${state.viewData.projectexpences}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-500 hover:text-blue-700"
                                >
                                  <FileTextOutlined
                                    style={{ marginRight: 5 }}
                                  />
                                  {state.viewData.projectexpences[0]?.length >
                                  30
                                    ? `${state.viewData.projectexpences[0].slice(
                                        0,
                                        30
                                      )}...`
                                    : state.viewData.projectexpences[0]}
                                </a>
                              </Col>
                            </Row>
                          )
                        )}
                      </Col>
                    </Row>
                  </>
                )}

                <Form.Item>
                  <div
                    className="feedback-submit-button-form"
                    style={{ paddingTop: "15px" }}
                  >
                    <Button id="addbutton" type="primary" htmlType="submit">
                      {state.reviewId ? "Update" : "Submit"}
                    </Button>
                    <Button type="primary" onClick={handleCancel}>
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

export default ProjectExpensesForm;
