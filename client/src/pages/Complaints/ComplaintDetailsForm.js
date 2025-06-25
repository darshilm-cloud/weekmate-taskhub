import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Row,
  Select,
  message,
  Upload,
  Popconfirm,
} from "antd";
import TextArea from "antd/es/input/TextArea";
import "../../assets/css/pms.css";
import "../../assets/css/style.css";
import Service from "../../service";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import moment from "moment";
import { valueToLable } from "../../util/statusValueToLable";
import { UploadOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import MyAvatar from "../../components/Avatar/MyAvatar";
import "./ComplaintsForm.css";

const ComplaintDetailsForm = () => {
  const [form] = Form.useForm();
  const [commentForm] = Form.useForm();
  const { id } = useParams();
  const dispatch = useDispatch();

  const loggedinUserId = JSON.parse(
    localStorage.getItem("user_data") || "{}"
  )?._id;

  const [isActionRequired, setIsActionRequired] = useState(false);
  const [complaintsData, setComplaintsData] = useState();
  const [complaintsStatusData, setComplaintsStatusData] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [isEditComment, setIsEditComment] = useState(false);
  const [fileAttachment, setFileAttachment] = useState(null);
  const [complaintComments, setComplaintComments] = useState([]);
  const [commentIdForEdit, setCommentIdForEdit] = useState(null);
  const [resolvedStatus, setResolvedStatus] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(
    form.getFieldValue("status")
  );

  // Track changes in the form
  const handleFormChange = (changedValues) => {
    if (changedValues.status) {
      setSelectedStatus(changedValues.status);
    }
  };

  const handleStatusChange = (changedValues) => {
    if (changedValues.status) {
      const status = changedValues.status;
      if (["client_review", "resolved", "customer_lost"].includes(status)) {
        setIsActionRequired(true);
      } else {
        setIsActionRequired(false);
      }
    }
  };

  useEffect(() => {
    if (id != undefined) {
      getComplaintById(id);
      getComplaintStatus(id);
      getComplaintComments(id);
    }
  }, []);

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

  const handleChangeEditStatus = () => {
    setIsEdit(!isEdit);
  };

  const handleConfirm = () => {
    setResolvedStatus(true);
    form.submit();
  };

  const handleCancel = () => {
    setResolvedStatus(false);
    form.submit();
  };

  const getComplaintComments = async (complaint_id) => {
    try {
      dispatch(showAuthLoader());
      const params = `/${complaint_id}`;
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getComplaintCommmentsList + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setComplaintComments(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getComplaintById = async (complaint_id) => {
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
        setComplaintsData(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getComplaintStatus = async (complaint_id) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        complaint_id: complaint_id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getComplaintStatusList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        if (response.data.data.length > 0) {
          setComplaintsStatusData(response.data.data);
          form.setFieldsValue({
            status: response.data.data[0].status,
            root_cause: response.data.data[0].root_cause,
            immediate_action: response.data.data[0].immediate_action,
            corrective_action: response.data.data[0].corrective_action,
            note: response.data.data[0].comments,
          });
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const deleteComment = async (id) => {
    try {
      dispatch(showAuthLoader());
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteComplaintComments + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        message.success(response.data.message);
        getComplaintComments(complaintsData?._id);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleSubmit = async (values) => {
    try {
      const reqBody = {
        complaint_id: complaintsData?._id,
        status: values.status,
        root_cause: values.root_cause,
        resolved_status: resolvedStatus || false,
      };
      if (values?.immediate_action != undefined) {
        reqBody.immediate_action = values.immediate_action;
      }

      if (values?.corrective_action != undefined) {
        reqBody.corrective_action = values.corrective_action;
      }
      if (!isEdit) {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.addComplaintStatus,
          body: reqBody,
        });
        if (response.data && response.data.data) {
          message.success(response.data.message);
          getComplaintStatus(complaintsData?._id);
        }
      } else {
        const params = `/${complaintsStatusData[0]._id}`;
        const response = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: Service.updateComplaintStatus + params,
          body: reqBody,
        });
        if (response.data && response.data.data) {
          message.success(response.data.message);
          getComplaintStatus(complaintsData?._id);
          handleChangeEditStatus();
        }
      }
    } catch (error) {
      console.log(error);
    }

    // Reset the form after submission
    form.resetFields();
  };
  const handleSubmitForComment = async (values) => {
    const reqBody = {
      comment: values.comments,
      complaint_id: complaintsData?._id,
    };
    if (fileAttachment != null) {
      const attachments = await uploadFiles();
      reqBody.attachments = attachments;
    }
    if (!isEditComment) {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addComplaintComments,
        body: reqBody,
      });
      if (response.data && response.data.data) {
        message.success(response.data.message);
        getComplaintStatus(complaintsData?._id);
        commentForm.resetFields();
        getComplaintComments(complaintsData?._id);
        setFileAttachment(null);
      }
    } else {
      //for edit
      const reqBodyForEdit = {
        comment: values.comments,
      };
      const params = `/${commentIdForEdit}`;
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.editComplaintComments + params,
        body: reqBodyForEdit,
      });
      if (response.data && response.data.data) {
        message.success(response.data.message);
        getComplaintStatus(complaintsData?._id);
        commentForm.resetFields();
        getComplaintComments(complaintsData?._id);
        setIsEditComment(false);
        setCommentIdForEdit(null);
      }
    }
  };

  const onFileChange = ({ file }) => {
    setFileAttachment(file);
  };

  const uploadFiles = async () => {
    try {
      const formData = new FormData();
      formData.append("document", fileAttachment);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileUpload}?file_for=complaint_comments`,
        body: formData,
        options: {
          "content-type": "multipart/form-data",
        },
      });
      return response?.data?.data;
    } catch (error) {
      console.log(error);
    }
  };

  const editComment = (id, comment) => {
    setCommentIdForEdit(id);
    commentForm.setFieldsValue({
      comments: comment,
    });
  };

  return (
    <div className="feedback-form-view-detail-form">
      <Card title="Complaint Details" className="feedbackForm-card">
        <div className="project-details">
          <div className="project-details-data">
            <span className="title">Project : </span>
            <span className="title-value">
              {complaintsData?.project?.title}
            </span>
          </div>

          <div className="project-details-data">
            <span className="title">Client Name : </span>
            <span className="title-value">{complaintsData?.client_name}</span>
          </div>

          <div className="project-details-data">
            <span className="title">Project Manager : </span>
            <span className="title-value">
              {complaintsData?.manager?.full_name}
            </span>
          </div>

          <div className="project-details-data">
            <span className="title">Account Manager : </span>
            <span className="title-value">
              {complaintsData?.acc_manager?.full_name}
            </span>
          </div>

          <div className="project-details-data">
            <span className="title">Date : </span>
            <span className="title-value">
              {" "}
              {moment(complaintsData?.createdAt).format("DD-MM-YYYY")}
            </span>
          </div>
        </div>
      </Card>
      <Card title="Complaint Status" className="feedbackForm-card">
        {complaintsStatusData.length > 0 && !isEdit ? (
          <span
            onClick={() => handleChangeEditStatus()}
            className="edit-complaint-status-btn"
          >
            Edit
          </span>
        ) : complaintsStatusData.length > 0 ? (
          <span
            onClick={() => handleChangeEditStatus()}
            className="edit-complaint-status-btn ant-delete"
          >
            Cancel
          </span>
        ) : (
          ""
        )}
        <div className="Complaint-status-form">
          <Form
            form={form}
            noValidate
            onValuesChange={(value) => {
              handleFormChange(value);
              handleStatusChange(value);
            }}
            {...formItemLayout}
            className="complaint-details-form"
            onFinish={handleSubmit}
          >
            <div className="employee-main-information complaint-status-form-inner mb2">
              <Row>
                <Col sm={24} lg={12} xl={10} className="feedback-detail-views">
                  <div className="employee-info-1">
                    <Form.Item
                      name="status"
                      label="Status"
                      rules={[
                        {
                          required: true,
                          message: "Please add status",
                        },
                      ]}
                    >
                      {complaintsStatusData.length > 0 && !isEdit ? (
                        valueToLable(complaintsStatusData[0]?.status)
                      ) : (
                        <Select
                          defaultValue="open"
                          onChange={() => {
                            setResolvedStatus(false);
                          }}
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
                      )}
                    </Form.Item>

                    <Form.Item
                      name="root_cause"
                      label="Root Cause"
                      rules={[
                        {
                          required: true,
                          message: "Please add root cause",
                        },
                      ]}
                    >
                      {complaintsStatusData.length > 0 && !isEdit ? (
                        complaintsStatusData[0]?.root_cause
                      ) : (
                        <TextArea
                          rows={4}
                          placeholder="Enter your root cause details"
                        />
                      )}
                    </Form.Item>
                  </div>
                </Col>
                <Col sm={24} lg={12} xl={9} className="feedback-detail-views">
                  <div className="employee-info">
                    <Form.Item
                      name="corrective_action"
                      label="Corrective Action"
                      rules={[
                        {
                          required: isActionRequired,
                          message:
                            "Corrective Action is required for selected status",
                        },
                      ]}
                    >
                      {complaintsStatusData.length > 0 && !isEdit ? (
                        complaintsStatusData[0]?.corrective_action
                      ) : (
                        <TextArea rows={4} />
                      )}
                    </Form.Item>

                    <Form.Item
                      name="immediate_action"
                      label="Immediate Action"
                      rules={[
                        {
                          required: isActionRequired,
                          message:
                            "Immediate Action is required for selected status",
                        },
                      ]}
                    >
                      {complaintsStatusData.length > 0 && !isEdit ? (
                        complaintsStatusData[0]?.immediate_action
                      ) : (
                        <TextArea rows={4} />
                      )}
                    </Form.Item>
                  </div>
                </Col>
              </Row>
            </div>
            {complaintsStatusData.length > 0 && !isEdit ? (
              ""
            ) : (
              <Form.Item className="feedback-details-submit-button-form">
                <div className="feedback-details-submit-button">
                  {selectedStatus === "resolved" ? (
                    <Popconfirm
                      icon={
                        <QuestionCircleOutlined
                          style={{
                            color: "red",
                          }}
                        />
                      }
                      title="Are you sure, you want to update the status of the complaint to Resolved? As the feedback mail will be sent to client."
                      onConfirm={handleConfirm}
                      onCancel={handleCancel}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button id="addbutton" type="primary">
                        {complaintsStatusData.length > 0 ? "Update" : "Submit"}
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Button id="addbutton" type="primary" htmlType="submit">
                      {complaintsStatusData.length > 0 ? "Update" : "Submit"}
                    </Button>
                  )}
                  <Button
                    type="primary"
                    className="ant-delete"
                    onClick={() => {
                      form.resetFields();
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </Form.Item>
            )}
          </Form>
        </div>
      </Card>
      <Card title="Complaint Comments" className="feedbackForm-card">
        <div className="ticket-comment">
          <Card className="atttachment">
            <Form
              form={commentForm}
              noValidate
              {...formItemLayout}
              onFinish={handleSubmitForComment}
            >
              <Row>
                <Col span={24} md={12}>
                  <div className="inout-header mb2 text-left">
                    <h2>Complaint Comments</h2>
                  </div>
                  <Form.Item
                    label="Comments"
                    name="comments"
                    className="left-title"
                    rules={[
                      {
                        required: true,
                        message: "Please add your comment",
                      },
                    ]}
                  >
                    <TextArea rows={3} />
                  </Form.Item>
                  {!isEditComment ? (
                    <Form.Item label="Document" name="document">
                      <Upload
                        name="document"
                        listType="text"
                        beforeUpload={() => false}
                        maxCount={1}
                        onChange={onFileChange}
                      >
                        <Button icon={<UploadOutlined />}>
                          Upload Document
                        </Button>
                      </Upload>
                    </Form.Item>
                  ) : (
                    ""
                  )}

                  <Form.Item className="feedback-details-submit-button-form">
                    <div className="feedback-details-submit-button">
                      <Button id="addbutton" type="primary" htmlType="submit">
                        {isEditComment ? "Update" : "Submit"}
                      </Button>
                      <Button
                        className="ant-delete"
                        type="primary"
                        onClick={() => form.resetFields()}
                      >
                        Clear
                      </Button>
                    </div>
                  </Form.Item>
                </Col>
                <Col span={24} md={12}>
                  <div className="ticket-history">
                    <div className="inout-header mb2 text-left">
                      <h2>Comments History</h2>
                    </div>
                    <div>
                      <div className="scroll450">
                        {complaintComments?.length > 0
                          ? complaintComments?.map((item) => {
                              return (
                                <div className="ticket-wrapper">
                                  <div className="ticket-user">
                                    <MyAvatar
                                      userName={
                                        item?.createdBy?.full_name || "-"
                                      }
                                      src={item?.createdBy?.emp_img}
                                      key={item?.createdBy?._id}
                                      alt={item?.createdBy?.full_name}
                                    />
                                    <h4 className="comment-user-name">
                                      {item?.createdBy?.full_name}
                                    </h4>
                                    {loggedinUserId == item?.createdBy?._id ? (
                                      <div className="comment-actions">
                                        <div
                                          onClick={() => {
                                            setIsEditComment(true);
                                            editComment(
                                              item?._id,
                                              item?.comment
                                            );
                                          }}
                                        >
                                          Edit
                                        </div>
                                        <Popconfirm
                                          icon={
                                            <QuestionCircleOutlined
                                              style={{
                                                color: "red",
                                              }}
                                            />
                                          }
                                          title="Are you sure to delete this Comment?"
                                          onConfirm={() => {
                                            deleteComment(item._id);
                                          }}
                                          okText="Yes"
                                          cancelText="No"
                                        >
                                          <div>Delete</div>
                                        </Popconfirm>
                                      </div>
                                    ) : (
                                      ""
                                    )}
                                  </div>
                                  <div className="complaint-ticket-description">
                                    <div className="ticket-desc-head">
                                      <p></p>
                                    </div>
                                    <div className="ticket-desc-body">
                                      <div className="complaint-comment-item">
                                        {item.comment}
                                      </div>
                                      <p className="attatch-complaint-item">
                                        {item.attachments.length > 0 ? (
                                          <>
                                            Attachment:
                                            <a
                                              href={
                                                Service.Server_Base_URL +
                                                "/public/" +
                                                item.attachments[0].path
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              {item.attachments[0].name}
                                            </a>
                                          </>
                                        ) : (
                                          ""
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          : "No Comments Found!"}
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Form>
          </Card>
        </div>
      </Card>
    </div>
  );
};

export default ComplaintDetailsForm;
