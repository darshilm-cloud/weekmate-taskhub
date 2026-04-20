/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Form,
  Select,
  message,
  Upload,
  Popconfirm,
  Tooltip,
} from "antd";
import TextArea from "antd/es/input/TextArea";
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  LinkOutlined,
  MessageOutlined,
  PaperClipOutlined,
  QuestionCircleOutlined,
  SyncOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import moment from "moment";
import Service from "../../service";
import MyAvatar from "../../components/Avatar/MyAvatar";
import "./ComplaintDetails.css";

/* ── helpers ─────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: "open",          label: "Open" },
  { value: "in_progress",   label: "In Progress" },
  { value: "client_review", label: "Client Review" },
  { value: "resolved",      label: "Resolved" },
  { value: "reopened",      label: "Reopen" },
  { value: "customer_lost", label: "Customer Lost" },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

const ACTION_REQUIRED = new Set(["client_review", "resolved", "customer_lost"]);

const statusBadgeClass = (s = "") => {
  const k = s.toLowerCase().replace(/[\s-]+/g, "_");
  return STATUS_OPTIONS.some((o) => o.value === k) ? k : "open";
};

/* ══════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════ */
const ComplaintDetailsForm = () => {
  const [form]        = Form.useForm();
  const [commentForm] = Form.useForm();
  const { id }        = useParams();
  const dispatch      = useDispatch();

  const loggedinUserId = JSON.parse(localStorage.getItem("user_data") || "{}")?._id;

  const [complaintsData,       setComplaintsData]       = useState(null);
  const [complaintsStatusData, setComplaintsStatusData] = useState([]);
  const [complaintComments,    setComplaintComments]    = useState([]);
  const [isEdit,               setIsEdit]               = useState(false);
  const [isEditComment,        setIsEditComment]        = useState(false);
  const [commentIdForEdit,     setCommentIdForEdit]     = useState(null);
  const [fileAttachment,       setFileAttachment]       = useState(null);
  const [isActionRequired,     setIsActionRequired]     = useState(false);
  const [resolvedStatus,       setResolvedStatus]       = useState(false);
  const [selectedStatus,       setSelectedStatus]       = useState("");

  /* ── API ───────────────────────────────────────────────── */
  const getComplaintById = useCallback(async (complaint_id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.getComplaintList,
        body:       { _id: complaint_id },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) setComplaintsData(response.data.data);
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch]);

  const getComplaintStatus = useCallback(async (complaint_id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.getComplaintStatusList,
        body:       { complaint_id },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        const d = response.data.data[0];
        setComplaintsStatusData(response.data.data);
        setSelectedStatus(d.status);
        form.setFieldsValue({
          status:           d.status,
          root_cause:       d.root_cause,
          immediate_action: d.immediate_action,
          corrective_action:d.corrective_action,
        });
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch, form]);

  const getComplaintComments = useCallback(async (complaint_id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url:    `${Service.getComplaintCommmentsList}/${complaint_id}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) setComplaintComments(response.data.data);
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      getComplaintById(id);
      getComplaintStatus(id);
      getComplaintComments(id);
    }
  }, [id, getComplaintById, getComplaintStatus, getComplaintComments]);

  /* ── Status form submit ────────────────────────────────── */
  const handleSubmit = async (values) => {
    const reqBody = {
      complaint_id:  complaintsData?._id,
      status:        values.status,
      root_cause:    values.root_cause,
      resolved_status: resolvedStatus || false,
    };
    if (values.immediate_action)  reqBody.immediate_action  = values.immediate_action;
    if (values.corrective_action) reqBody.corrective_action = values.corrective_action;

    try {
      dispatch(showAuthLoader());
      let response;
      if (!isEdit) {
        response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url:    Service.addComplaintStatus,
          body:       reqBody,
        });
      } else {
        response = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url:    `${Service.updateComplaintStatus}/${complaintsStatusData[0]._id}`,
          body:       reqBody,
        });
      }
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        message.success(response.data.message);
        getComplaintStatus(complaintsData?._id);
        if (isEdit) setIsEdit(false);
        form.resetFields();
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  /* ── Comment submit ────────────────────────────────────── */
  const uploadFiles = async () => {
    const formData = new FormData();
    formData.append("document", fileAttachment);
    const response = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url:    `${Service.fileUpload}?file_for=complaint_comments`,
      body:       formData,
      options:    { "content-type": "multipart/form-data" },
    });
    return response?.data?.data;
  };

  const handleSubmitForComment = async (values) => {
    const reqBody = {
      comment:      values.comments,
      complaint_id: complaintsData?._id,
    };
    if (fileAttachment) {
      reqBody.attachments = await uploadFiles();
    }
    try {
      dispatch(showAuthLoader());
      let response;
      if (!isEditComment) {
        response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url:    Service.addComplaintComments,
          body:       reqBody,
        });
      } else {
        response = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url:    `${Service.editComplaintComments}/${commentIdForEdit}`,
          body:       { comment: values.comments },
        });
      }
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        message.success(response.data.message);
        commentForm.resetFields();
        setFileAttachment(null);
        setIsEditComment(false);
        setCommentIdForEdit(null);
        getComplaintComments(complaintsData?._id);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url:    `${Service.deleteComplaintComments}/${commentId}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        message.success(response.data.message);
        getComplaintComments(complaintsData?._id);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  };

  const startEditComment = (commentId, comment) => {
    setIsEditComment(true);
    setCommentIdForEdit(commentId);
    commentForm.setFieldsValue({ comments: comment });
  };

  /* ── Derived ───────────────────────────────────────────── */
  const hasStatus     = complaintsStatusData.length > 0;
  const currentStatus = hasStatus ? complaintsStatusData[0] : null;
  const showForm      = !hasStatus || isEdit;

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="cad-page">

      {/* ── Complaint Info ── */}
      <div className="cad-info-card">
        <div className="cad-info-icon"><AlertOutlined /></div>
        <div className="cad-info-body">
          <h1 className="cad-info-title">Complaint Details</h1>
          <div className="cad-info-fields">
            <div className="cad-info-field">
              <div className="cad-info-label"><FileTextOutlined /> Project</div>
              <div className="cad-info-value">{complaintsData?.project?.title || "—"}</div>
            </div>
            <div className="cad-info-field">
              <div className="cad-info-label"><UserOutlined /> Client</div>
              <div className="cad-info-value">{complaintsData?.client_name || "—"}</div>
            </div>
            <div className="cad-info-field">
              <div className="cad-info-label"><UserOutlined /> Project Manager</div>
              <div className="cad-info-value">{complaintsData?.manager?.full_name || "—"}</div>
            </div>
            <div className="cad-info-field">
              <div className="cad-info-label"><UserOutlined /> Account Manager</div>
              <div className="cad-info-value">{complaintsData?.acc_manager?.full_name || "—"}</div>
            </div>
            <div className="cad-info-field">
              <div className="cad-info-label"><CalendarOutlined /> Date</div>
              <div className="cad-info-value">
                {complaintsData?.createdAt
                  ? moment(complaintsData.createdAt).format("DD-MM-YYYY")
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Complaint Status ── */}
      <div className="cad-section">
        <div className="cad-section-header">
          <div className="cad-section-title">
            <span className="cad-section-icon"><SyncOutlined /></span>
            Complaint Status
          </div>
          {hasStatus && (
            isEdit
              ? (
                <button className="cad-btn cancel-toggle" onClick={() => setIsEdit(false)}>
                  Cancel
                </button>
              ) : (
                <button className="cad-btn edit-toggle" onClick={() => setIsEdit(true)}>
                  <EditOutlined /> Edit
                </button>
              )
          )}
        </div>

        <div className="cad-section-body">
          {/* Read-only view */}
          {hasStatus && !isEdit ? (
            <div className="cad-status-view">
              <div className="cad-status-field">
                <div className="cad-field-label">Status</div>
                <div className="cad-field-value">
                  <span className={`cad-status-badge ${statusBadgeClass(currentStatus.status)}`}>
                    {STATUS_LABELS[currentStatus.status] || currentStatus.status}
                  </span>
                </div>
              </div>
              <div className="cad-status-field" style={{ gridColumn: "1 / -1" }}>
                <div className="cad-field-label">Root Cause</div>
                <div className="cad-field-value">{currentStatus.root_cause || "—"}</div>
              </div>
              {currentStatus.corrective_action && (
                <div className="cad-status-field">
                  <div className="cad-field-label">Corrective Action</div>
                  <div className="cad-field-value">{currentStatus.corrective_action}</div>
                </div>
              )}
              {currentStatus.immediate_action && (
                <div className="cad-status-field">
                  <div className="cad-field-label">Immediate Action</div>
                  <div className="cad-field-value">{currentStatus.immediate_action}</div>
                </div>
              )}
            </div>
          ) : (
            /* Edit / Add form */
            <Form
              form={form}
              layout="vertical"
              className="cad-status-form"
              onFinish={handleSubmit}
            >
              <div className="cad-form-grid">
                <Form.Item
                  name="status"
                  label="Status"
                  rules={[{ required: true, message: "Please select a status" }]}
                >
                  <Select
                    options={STATUS_OPTIONS}
                    placeholder="Select status"
                    onChange={(val) => {
                      setSelectedStatus(val);
                      setResolvedStatus(false);
                      setIsActionRequired(ACTION_REQUIRED.has(val));
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="root_cause"
                  label="Root Cause"
                  rules={[{ required: true, message: "Please enter root cause" }]}
                >
                  <TextArea rows={3} placeholder="Describe the root cause…" />
                </Form.Item>

                <Form.Item
                  name="corrective_action"
                  label="Corrective Action"
                  rules={[{
                    required: isActionRequired,
                    message: "Corrective action is required for this status",
                  }]}
                >
                  <TextArea rows={3} placeholder="What corrective action was taken?" />
                </Form.Item>

                <Form.Item
                  name="immediate_action"
                  label="Immediate Action"
                  rules={[{
                    required: isActionRequired,
                    message: "Immediate action is required for this status",
                  }]}
                >
                  <TextArea rows={3} placeholder="What immediate action was taken?" />
                </Form.Item>
              </div>

              <div className="cad-form-actions">
                {selectedStatus === "resolved" ? (
                  <Popconfirm
                    icon={<QuestionCircleOutlined style={{ color: "#dc2626" }} />}
                    title="Marking as Resolved will send a feedback email to the client. Continue?"
                    onConfirm={() => { setResolvedStatus(true);  form.submit(); }}
                    onCancel={()  => { setResolvedStatus(false); form.submit(); }}
                    okText="Yes, resolve"
                    cancelText="No"
                  >
                    <button type="button" className="cad-btn primary">
                      <CheckCircleOutlined />
                      {hasStatus ? "Update" : "Submit"}
                    </button>
                  </Popconfirm>
                ) : (
                  <button type="submit" className="cad-btn primary">
                    <CheckCircleOutlined />
                    {hasStatus ? "Update" : "Submit"}
                  </button>
                )}
                <button type="button" className="cad-btn danger" onClick={() => form.resetFields()}>
                  Clear
                </button>
              </div>
            </Form>
          )}
        </div>
      </div>

      {/* ── Comments ── */}
      <div className="cad-section">
        <div className="cad-section-header">
          <div className="cad-section-title">
            <span className="cad-section-icon"><MessageOutlined /></span>
            Complaint Comments
          </div>
          {isEditComment && (
            <button
              className="cad-btn cancel-toggle"
              onClick={() => {
                setIsEditComment(false);
                setCommentIdForEdit(null);
                commentForm.resetFields();
              }}
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="cad-section-body">
          <div className="cad-comments-grid">

            {/* Left: Comment form */}
            <div className="cad-comment-form-panel">
              <div className="cad-comment-panel-title">
                {isEditComment ? "Edit Comment" : "Add Comment"}
              </div>
              <Form
                form={commentForm}
                layout="vertical"
                className="cad-comment-form"
                onFinish={handleSubmitForComment}
              >
                <Form.Item
                  name="comments"
                  label="Comment"
                  rules={[{ required: true, message: "Please enter a comment" }]}
                >
                  <TextArea rows={4} placeholder="Write your comment here…" />
                </Form.Item>

                {!isEditComment && (
                  <Form.Item name="document" label="Attachment">
                    <Upload
                      name="document"
                      listType="text"
                      beforeUpload={() => false}
                      maxCount={1}
                      onChange={({ file }) => setFileAttachment(file)}
                    >
                      <button type="button" className="cad-upload-btn">
                        <UploadOutlined /> Upload Document
                      </button>
                    </Upload>
                  </Form.Item>
                )}

                <div className="cad-form-actions">
                  <button type="submit" className="cad-btn primary">
                    <CheckCircleOutlined />
                    {isEditComment ? "Update" : "Submit"}
                  </button>
                  <button
                    type="button"
                    className="cad-btn"
                    onClick={() => {
                      commentForm.resetFields();
                      setFileAttachment(null);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </Form>
            </div>

            {/* Right: Comment history */}
            <div className="cad-history-panel">
              <div className="cad-comment-panel-title">
                Comments History
                {complaintComments.length > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>
                    ({complaintComments.length})
                  </span>
                )}
              </div>

              <div className="cad-comment-thread">
                {complaintComments.length === 0 ? (
                  <div className="cad-empty-comments">
                    <div className="cad-empty-icon"><MessageOutlined /></div>
                    No comments yet
                  </div>
                ) : (
                  complaintComments.map((item) => (
                    <div key={item._id} className="cad-comment-item">
                      <div className="cad-comment-meta">
                        <MyAvatar
                          userName={item?.createdBy?.full_name || "—"}
                          src={item?.createdBy?.emp_img}
                          key={item?.createdBy?._id}
                          alt={item?.createdBy?.full_name}
                        />
                        <span className="cad-comment-author">
                          {item?.createdBy?.full_name || "—"}
                        </span>
                        <span className="cad-comment-time">
                          {moment(item.createdAt).format("DD-MM-YYYY, hh:mm A")}
                        </span>
                        {loggedinUserId === item?.createdBy?._id && (
                          <div className="cad-comment-actions">
                            <Tooltip title="Edit">
                              <span
                                className="cad-comment-action-btn edit-btn"
                                onClick={() => startEditComment(item._id, item.comment)}
                              >
                                Edit
                              </span>
                            </Tooltip>
                            <Popconfirm
                              icon={<QuestionCircleOutlined style={{ color: "#dc2626" }} />}
                              title="Delete this comment?"
                              onConfirm={() => deleteComment(item._id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Tooltip title="Delete">
                                <span className="cad-comment-action-btn delete-btn">Delete</span>
                              </Tooltip>
                            </Popconfirm>
                          </div>
                        )}
                      </div>

                      <div className="cad-comment-text">{item.comment}</div>

                      {item.attachments?.length > 0 && (
                        <div className="cad-comment-attachment">
                          <PaperClipOutlined />
                          <a
                            href={`${Service.Server_Base_URL}/public/${item.attachments[0].path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {item.attachments[0].name}
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default ComplaintDetailsForm;
