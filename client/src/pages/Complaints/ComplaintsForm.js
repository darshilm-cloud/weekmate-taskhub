import React, { useState, useEffect, useCallback } from "react";
import { Form, Input, Select, message, Popconfirm } from "antd";
import TextArea from "antd/es/input/TextArea";
import {
  AlertOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MailOutlined,
  QuestionCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import "./ComplaintDetails.css";

/* ── constants ─────────────────────────────────────────────── */
const REASON_OPTIONS = [
  { value: "Project Delays and Missed Deadlines",              label: "Project Delays and Missed Deadlines" },
  { value: "Quality Issues and Buggy Software",                label: "Quality Issues and Buggy Software" },
  { value: "Lack of Transparency and Communication",           label: "Lack of Transparency and Communication" },
  { value: "Poor Customer Support and Responsiveness",         label: "Poor Customer Support and Responsiveness" },
  { value: "Unmet Expectations for Digital Marketing Results", label: "Unmet Expectations for Digital Marketing Results" },
  { value: "Lack of Strategy and Proactiveness in Marketing Efforts", label: "Lack of Strategy and Proactiveness in Marketing Efforts" },
  { value: "Inadequate Reporting and Analytics",               label: "Inadequate Reporting and Analytics" },
  { value: "Overpromising and Under Delivering",               label: "Overpromising and Under Delivering" },
  { value: "Scope Creep and Unexpected Charges",               label: "Scope Creep and Unexpected Charges" },
  { value: "Privacy and Security Concerns",                    label: "Privacy and Security Concerns" },
  { value: "3rd Party Issue (Extension/API/Support)",          label: "3rd Party Issue (Extension/API/Support)" },
  { value: "Downtime or Performance Issue",                    label: "Downtime or Performance Issue" },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high",     label: "High" },
  { value: "medium",   label: "Medium" },
  { value: "low",      label: "Low" },
];

const ESCALATION_OPTIONS = [
  { value: "level1", label: "Level 1 (Director)" },
  { value: "level2", label: "Level 2 (CEO)" },
];

const STATUS_OPTIONS = [
  { value: "open",          label: "Open" },
  { value: "in_progress",   label: "In Progress" },
  { value: "client_review", label: "Client Review" },
  { value: "resolved",      label: "Resolved" },
  { value: "reopened",      label: "Reopen" },
  { value: "customer_lost", label: "Customer Lost" },
];

const PRIORITY_COLORS = {
  critical: { bg: "#fef2f2", color: "#dc2626" },
  high:     { bg: "#fef2f2", color: "#dc2626" },
  medium:   { bg: "#fff7ed", color: "#ea580c" },
  low:      { bg: "#f0fdf4", color: "#16a34a" },
};

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
const ComplaintsForm = ({
  embedded = false,
  complaintId: complaintIdProp,
  onSuccess: onSuccessCallback,
  onCancel: onCancelCallback,
} = {}) => {
  const companySlug      = localStorage.getItem("companyDomain");
  const { complaint_id: complaint_idFromRoute } = useParams();
  const complaint_id = embedded ? complaintIdProp : complaint_idFromRoute;
  const [form]           = Form.useForm();
  const dispatch         = useDispatch();
  const history          = useHistory();

  const [projects,       setProjects]       = useState([]);
  const [complaintId,    setComplaintId]    = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isSubmitting,   setIsSubmitting]   = useState(false);

  const isEdit = Boolean(complaintId);

  /* ── API ─────────────────────────────────────────────────── */
  const getProjects = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.myProjects,
        body:       { isComplaints: true },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) setProjects(response.data.data);
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch]);

  const getComplaintById = useCallback(async (id) => {
    setComplaintId(id);
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.getComplaintList,
        body:       { _id: id },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        const d = response.data.data;
        setSelectedStatus(d.status || "");
        form.setFieldsValue({
          project:          d.project_id,
          client_name:      d.client_name,
          reason:           d.reason,
          client_email:     d.client_email,
          Complaint:        d.complaint,
          priority:         d.priority,
          escalation_level: d.escalation_level,
          status:           d.status,
          project_manager:  d.manager?.full_name,
          account_manager:  d.acc_manager?.full_name,
        });
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch, form]);

  const getProjectDetails = useCallback(async (project_id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url:    `${Service.getOverview}/${project_id}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        form.setFieldsValue({
          project_manager: response.data.data?.manager?.full_name,
          account_manager: response.data.data?.acc_manager?.full_name,
        });
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch, form]);

  useEffect(() => {
    getProjects();
    if (complaint_id) getComplaintById(complaint_id);
  }, [complaint_id, getProjects, getComplaintById]);

  /* ── Submit ───────────────────────────────────────────────── */
  const handleSubmit = async (values) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const reqBody = {
        project_id:       values.project,
        client_name:      values.client_name,
        reason:           values.reason,
        client_email:     values.client_email,
        complaint:        values.Complaint,
        priority:         values.priority,
        escalation_level: values.escalation_level,
        status:           values.status,
      };

      let response;
      if (complaintId) {
        response = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url:    `${Service.editComplaint}/${complaintId}`,
          body:       reqBody,
        });
      } else {
        response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url:    Service.addComplaint,
          body:       reqBody,
        });
      }

      if (response?.data?.status === 1) {
        message.success(response.data.message);
        if (embedded) {
          onSuccessCallback?.();
        } else {
          history.push(`/${companySlug}/complaints`);
        }
      } else {
        message.error(response?.data?.message || "Failed to save complaint");
      }
    } catch (error) {
      console.error(error);
      message.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeave = () => {
    if (embedded) {
      onCancelCallback?.();
    } else {
      history.push(`/${companySlug}/complaints`);
    }
  };

  /* ── Render ───────────────────────────────────────────────── */
  const formInner = (
    <>
      {!embedded && (
        <div className="ps-header">
          <h2 className="ps-title">
            <span className="ps-title-icon">
              {isEdit ? <ExclamationCircleOutlined /> : <AlertOutlined />}
            </span>
            {isEdit ? "Edit Complaint" : "Add Complaint"}
          </h2>
          <div className="ps-header-right">
            <button className="add-btn" type="button" onClick={handleLeave}>
              <ArrowLeftOutlined /> Back to Complaints
            </button>
          </div>
        </div>
      )}

      <div className={embedded ? "ps-form-wrap cmp-embedded-ps-form-wrap" : "ps-form-wrap"}>
          <Form
            form={form}
            layout="vertical"
            className="ps-form"
            onFinish={handleSubmit}
            onValuesChange={(changed) => {
              if (changed.status) setSelectedStatus(changed.status);
            }}
          >
            {/* Row 1: Project + Project Manager */}
            <div className="ps-form-grid">
              <Form.Item
                name="project"
                label="Project"
                rules={[{ required: true, message: "Please select a project" }]}
              >
                <Select
                  placeholder="Select project"
                  showSearch
                  filterOption={(input, option) =>
                    option.label?.toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={getProjectDetails}
                  options={projects.map((p) => ({ value: p._id, label: p.title }))}
                />
              </Form.Item>

              <Form.Item
                name="project_manager"
                label="Project Manager"
                rules={[{ required: true, message: "Project manager is required" }]}
              >
                <Input
                  placeholder="Auto-filled from project"
                  disabled
                  prefix={<UserOutlined style={{ color: "#7aa3bf" }} />}
                />
              </Form.Item>

              <Form.Item
                name="account_manager"
                label="Account Manager"
                rules={[{ required: true, message: "Account manager is required" }]}
              >
                <Input
                  placeholder="Auto-filled from project"
                  disabled
                  prefix={<UserOutlined style={{ color: "#7aa3bf" }} />}
                />
              </Form.Item>

              <Form.Item
                name="client_name"
                label="Client"
                rules={[{ required: true, message: "Please enter client name" }]}
              >
                <Input
                  placeholder="Enter client name"
                  prefix={<UserOutlined style={{ color: "#7aa3bf" }} />}
                />
              </Form.Item>

              <Form.Item
                name="client_email"
                label="Client Email"
                rules={[
                  { required: true, message: "Please enter client email" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input
                  placeholder="Enter client email"
                  prefix={<MailOutlined style={{ color: "#7aa3bf" }} />}
                />
              </Form.Item>

              <Form.Item
                name="reason"
                label="Reason"
                rules={[{ required: true, message: "Please select a reason" }]}
              >
                <Select placeholder="Select reason" options={REASON_OPTIONS} />
              </Form.Item>

              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: "Please select priority" }]}
              >
                <Select
                  placeholder="Select priority"
                  options={PRIORITY_OPTIONS.map((o) => ({
                    value: o.value,
                    label: (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        color: PRIORITY_COLORS[o.value]?.color,
                        fontWeight: 600,
                      }}>
                        {o.label}
                      </span>
                    ),
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="escalation_level"
                label="Escalation Level"
                rules={[{ required: true, message: "Please select escalation level" }]}
              >
                <Select placeholder="Select escalation level" options={ESCALATION_OPTIONS} />
              </Form.Item>

              {!isEdit && (
                <Form.Item
                  name="status"
                  label="Status"
                  initialValue="open"
                  rules={[{ required: true, message: "Please select status" }]}
                >
                  <Select options={STATUS_OPTIONS} />
                </Form.Item>
              )}
            </div>

            {/* Complaint textarea — full width */}
            <Form.Item
              name="Complaint"
              label="Complaint Description"
              rules={[{ required: true, message: "Please describe the complaint" }]}
            >
              <TextArea
                rows={5}
                placeholder="Describe the complaint in detail…"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            {/* Actions */}
            <div className="ps-form-actions">
              {selectedStatus === "resolved" ? (
                <Popconfirm
                  icon={<QuestionCircleOutlined style={{ color: "#dc2626" }} />}
                  title="Marking as Resolved will send a feedback email to the client. Continue?"
                  onConfirm={() => form.submit()}
                  okText="Yes, resolve"
                  cancelText="No"
                >
                  <button type="button" className="add-btn" disabled={isSubmitting}>
                    <CheckCircleOutlined />
                    {isEdit ? "Update" : "Submit"}
                  </button>
                </Popconfirm>
              ) : (
                <button type="submit" className="add-btn" disabled={isSubmitting}>
                  <CheckCircleOutlined />
                  {isSubmitting ? "Saving..." : isEdit ? "Update" : "Submit"}
                </button>
              )}
              <button type="button" className="ps-btn-secondary" onClick={handleLeave}>
                Cancel
              </button>
            </div>
          </Form>
        </div>
    </>
  );

  if (embedded) {
    return <div className="ps-card cmp-embedded-complaint-form">{formInner}</div>;
  }

  return <div className="ps-page"><div className="ps-card">{formInner}</div></div>;
};

export default ComplaintsForm;
