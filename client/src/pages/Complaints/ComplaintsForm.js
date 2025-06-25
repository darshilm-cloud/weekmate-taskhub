import React, { useState, useEffect } from "react";
import {
  Button,
  Col,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  message,
} from "antd";
import TextArea from "antd/es/input/TextArea";
import { Header } from "antd/es/layout/layout";
import "./ComplaintsForm.css";
import "../../assets/css/pms.css";
import "../../assets/css/style.css";
import Service from "../../service";
import { useDispatch } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useHistory, useParams } from "react-router-dom";
import { QuestionCircleOutlined } from "@ant-design/icons";

const ComplaintsForm = () => {
  const { complaint_id } = useParams();
  const [form] = Form.useForm();
  const { Option } = Select;
  const history = useHistory();

  const [projects, setProjects] = useState([]);
  const [complaintId, setComplaintId] = useState();
  const [selectedStatus, setSelectedStatus] = useState(
    form.getFieldValue("status")
  );

  // Track changes in the form
  const handleFormChange = (changedValues) => {
    if (changedValues.status) {
      setSelectedStatus(changedValues.status);
    }
  };

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 8 },
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 16 },
    },
  };

  useEffect(() => {
    getProjects();
    if (complaint_id != undefined) {
      getComplaintById(complaint_id);
    }
  }, []);

  const dispatch = useDispatch();
  const getComplaintById = async (complaint_id) => {
    setComplaintId(complaint_id);
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        _id: complaint_id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getComplaintList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        form.setFieldsValue({
          project: response.data.data?.project_id,
          client_name: response.data.data?.client_name,
          reason: response.data.data?.reason,
          client_email: response.data.data?.client_email,
          Complaint: response.data.data?.complaint,
          priority: response.data.data?.priority,
          escalation_level: response.data.data?.escalation_level,
          status: response.data.data?.status,
          project_manager: response.data.data?.manager?.full_name,
          account_manager: response.data.data?.acc_manager?.full_name,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getProjects = async () => {
    try {
      dispatch(showAuthLoader());

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: {
          isComplaints: true,
        },
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjects(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const reqBody = {
        project_id: values.project,
        client_name: values.client_name,
        reason: values.reason,
        client_email: values.client_email,
        complaint: values.Complaint,
        priority: values.priority,
        escalation_level: values.escalation_level,
        status: values.status,
      };
      if (complaintId) {
        const params = `/${complaintId}`;
        const response = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: Service.editComplaint + params,
          body: reqBody,
        });
        if (response.data && response.data.data) {
          message.success(response.data.message);
          history.push("/complaints");
        }
      } else {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.addComplaint,
          body: reqBody,
        });
        if (response.data && response.data.data) {
          message.success(response.data.message);
          history.push("/complaints");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getProjectDetails = async (project_id) => {
    try {
      dispatch(showAuthLoader());
      const params = `/${project_id}`;
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getOverview + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        form.setFieldsValue({
          project_manager: response.data.data?.manager?.full_name,
          account_manager: response.data.data?.acc_manager?.full_name,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <div className="main-time-sheet-project-wrapper">
        <Header className="main-header">
          <div className="project-name">
            <h3 style={{ textTransform: "capitalize" }}>
              {complaintId ? "Edit" : "Add"} Complaint
            </h3>
          </div>
        </Header>
        <div className="project-wrapper new-project-overview project-running-reports">
          <div className="peoject-page">
            <div className="header">
              <div className="project-running-reports-fillter-wrapper feedback-form add-complaint-wrapper">
                <Form
                  form={form}
                  noValidate
                  {...formItemLayout}
                  onFinish={handleSubmit}
                  onValuesChange={handleFormChange}
                >
                  <Row>
                    <Col sm={24} md={12}>
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
                          onChange={(e) => getProjectDetails(e)}
                        >
                          {projects.map((item, index) => (
                            <Option
                              key={index}
                              value={item._id}
                              style={{ textTransform: "capitalize" }}
                            >
                              {item?.title}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col sm={24} md={12}>
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
                    <Col sm={24} md={12}>
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
                      <Form.Item
                        label="Reason"
                        name="reason"
                        rules={[
                          {
                            required: true,
                            message: "Please enter Reason !",
                          },
                        ]}
                      >
                        <Select
                          defaultValue="--select--"
                          options={[
                            {
                              value: "Project Delays and Missed Deadlines",
                              label: "Project Delays and Missed Deadlines",
                            },
                            {
                              value: "Quality Issues and Buggy Software",
                              label: "Quality Issues and Buggy Software",
                            },
                            {
                              value: "Lack of Transparency and Communication",
                              label: "Lack of Transparency and Communication",
                            },
                            {
                              value: "Poor Customer Support and Responsiveness",
                              label: "Poor Customer Support and Responsiveness",
                            },
                            {
                              value:
                                "Unmet Expectations for Digital Marketing Results",
                              label:
                                "Unmet Expectations for Digital Marketing Results",
                            },
                            {
                              value:
                                "Lack of Strategy and Proactiveness in Marketing Efforts",
                              label:
                                "Lack of Strategy and Proactiveness in Marketing Efforts",
                            },

                            {
                              value: "Inadequate Reporting and Analytics",
                              label: "Inadequate Reporting and Analytics",
                            },
                            {
                              value: "Overpromising and Under Delivering",
                              label: "Overpromising and Under Delivering",
                            },
                            {
                              value: "Scope Creep and Unexpected Charges",
                              label: "Scope Creep and Unexpected Charges",
                            },
                            {
                              value: "Privacy and Security Concerns",
                              label: "Privacy and Security Concerns",
                            },
                            {
                              value: "3rd Party Issue (Extension/API/Support)",
                              label: "3rd Party Issue (Extension/API/Support)",
                            },
                            {
                              value: "Downtime or Performance Issue",
                              label: "Downtime or Performance Issue",
                            },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col sm={24} md={12}>
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
                      <Form.Item
                        label="Client Email"
                        name="client_email"
                        rules={[
                          {
                            required: true,
                            message: "Please enter client email !",
                          },
                        ]}
                      >
                        <Input placeholder="Enter client email" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row>
                    <Col sm={24} md={12}>
                      <Form.Item
                        label="Complaint"
                        name="Complaint"
                        rules={[
                          {
                            required: true,
                            message: "Please enter your Complaint !",
                          },
                        ]}
                      >
                        <TextArea rows={4} placeholder="Enter your Complaint" />
                      </Form.Item>
                    </Col>
                    <Col sm={24} md={12}>
                      <Form.Item
                        name="priority"
                        label="Priority"
                        rules={[
                          {
                            required: true,
                            message: "Please select priority !",
                          },
                        ]}
                      >
                        <Select
                          defaultValue="--select--"
                          options={[
                            {
                              value: "critical",
                              label: "Critical",
                            },
                            {
                              value: "high",
                              label: "High",
                            },

                            {
                              value: "medium",
                              label: "Medium",
                            },
                            {
                              value: "low",
                              label: "Low",
                            },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row>
                    <Col sm={24} md={12}>
                      <Form.Item
                        name="escalation_level"
                        label="Escalation Level"
                        rules={[
                          {
                            required: true,
                            message: "Please Escalation level !",
                          },
                        ]}
                      >
                        <Select
                          defaultValue="--select--"
                          options={[
                            {
                              value: "level1",
                              label: "Level 1 (Director)",
                            },
                            {
                              value: "level2",
                              label: "Level 2 (CEO)",
                            },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    {!complaintId ? (
                      <Col sm={24} md={12}>
                        <Form.Item
                          name="status"
                          label="Status"
                          initialValue="open"
                          rules={[
                            {
                              required: true,
                              message: "Please select status !",
                            },
                          ]}
                        >
                          <Select
                            defaultValue="open"
                            options={[
                              {
                                value: "open",
                                label: "Open",
                              },
                              {
                                value: "in_progress",
                                label: "In Progress",
                              },
                              {
                                value: "client_review",
                                label: "Client Review",
                              },
                              {
                                value: "resolved",
                                label: "Resolved",
                              },
                              {
                                value: "reopened",
                                label: "Reopen",
                              },
                              {
                                value: "customer_lost",
                                label: "Customer Lost",
                              },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    ) : (
                      ""
                    )}
                  </Row>

                  <Form.Item>
                    <div className="feedback-submit-button-form">
                      {selectedStatus === "resolved" ? (
                        <Popconfirm
                          icon={
                            <QuestionCircleOutlined
                              style={{
                                color: "red",
                              }}
                            />
                          }
                          title="Are you sure, you want to update the status of the complaint to Client Review? As the feedback mail will be sent to client."
                          onConfirm={() => form.submit()}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button id="addbutton" type="primary">
                            {complaintId ? "Update" : "Submit"}
                          </Button>
                        </Popconfirm>
                      ) : (
                        <Button id="addbutton" type="primary" htmlType="submit">
                          {complaintId ? "Update" : "Submit"}
                        </Button>
                      )}
                    </div>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ComplaintsForm;
