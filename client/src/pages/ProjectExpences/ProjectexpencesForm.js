import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Button,
  Form,
  Input,
  message,
  Radio,
  Select,
  Upload,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  PaperClipOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useHistory, useParams } from "react-router-dom";

import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { sideBarContentId2 } from "../../constants";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import "../Complaints/ComplaintDetails.css";

/* ── constants ─────────────────────────────────────────────── */
const STATIC_ACCOUNTANT_ID = [sideBarContentId2];

const BILLING_CYCLE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly",  label: "Yearly"  },
];

const RADIO_OPTIONS = [
  { value: true,  label: "Yes" },
  { value: false, label: "No"  },
];

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
const ProjectExpensesForm = () => {
  const companySlug   = localStorage.getItem("companyDomain");
  const [form]        = Form.useForm();
  const dispatch      = useDispatch();
  const history       = useHistory();
  const { emitEvent } = useSocketAction();
  const { review_id } = useParams();

  const [state, setState] = useState({
    projects:     [],
    file:         [],
    selectedFile: null,
    viewData:     {},
    isRecurring:  false,
    isPaid:       false,
    reviewId:     null,
  });

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const isEdit = Boolean(state.reviewId);

  /* ── Role helpers ──────────────────────────────────────── */
  const userRole = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user_data")) || {}; }
    catch { return {}; }
  }, []);

  const isAccountant = useMemo(
    () =>
      STATIC_ACCOUNTANT_ID.includes(userRole?._id) &&
      userRole?.pms_role_id?.role_name !== "Admin",
    [userRole]
  );

  const canEditStatus = useMemo(
    () =>
      userRole?.pms_role_id?.role_name === "Admin" ||
      STATIC_ACCOUNTANT_ID.includes(userRole?._id),
    [userRole]
  );

  const statusOptions = useMemo(() => {
    if (STATIC_ACCOUNTANT_ID.includes(userRole?._id)) {
      return userRole?.pms_role_id?.role_name === "Admin"
        ? [{ value: "Paid", label: "Paid" }]
        : [];
    }
    if (userRole?.pms_role_id?.role_name === "Admin") {
      return [
        { value: "Approved", label: "Approved" },
        { value: "Rejected", label: "Rejected" },
        { value: "Paid",     label: "Paid"     },
      ];
    }
    return [];
  }, [userRole]);

  /* ── API ─────────────────────────────────────────────────── */
  const fetchProjects = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.myProjects,
        body:       {},
      });
      const projects =
        response?.data?.data?.data ||
        response?.data?.data ||
        [];
      updateState({ projects: Array.isArray(projects) ? projects : [] });
    } catch (error) {
      console.error(error);
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
          api_url:    `${Service.getOverview}/${projectId}`,
        });
        if (response?.data?.data) {
          const { manager, acc_manager } = response.data.data;
          form.setFieldsValue({
            project_manager: manager?.full_name     || "",
            account_manager: acc_manager?.full_name || "",
          });
        }
      } catch (error) {
        console.error(error);
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
          api_url:    Service.getprojectexpanses,
          body:       { _id: reviewId },
        });
        if (response?.data?.data) {
          const data   = response.data.data;
          const isPaid = data.status === "Paid";
          updateState({ viewData: data, isRecurring: data.is_recuring || false, isPaid });
          if (data.project?._id) await fetchProjectDetails(data.project._id);
          form.setFieldsValue({
            project:                   isAccountant ? data.project?.title : data.project?._id,
            project_manager:           data.manager?.full_name       || "",
            account_manager:           data.acc_manager?.full_name   || "",
            purchase_request_details:  data.purchase_request_details?.replace(/<br\s*\/?>/g, "\n") || "",
            cost_in_usd:               data.cost_in_usd,
            need_to_bill_customer:     data.need_to_bill_customer,
            status:                    data.status,
            details:                   data.details              || "",
            billing_cycle:             data.billing_cycle        || "monthly",
            is_recuring:               data.is_recuring          || false,
            nature_Of_expense:         data.nature_Of_expense    || "",
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        dispatch(hideAuthLoader());
      }
    },
    [dispatch, form, fetchProjectDetails, isAccountant, updateState]
  );

  useEffect(() => {
    fetchProjects();
    if (review_id) fetchReviewData(review_id);
  }, [fetchProjects, fetchReviewData, review_id]);

  /* ── Handlers ────────────────────────────────────────────── */
  const handleFileChange  = useCallback((info) => updateState({ file: info.fileList, selectedFile: info.fileList }), [updateState]);
  const handleRemoveFile  = useCallback(() => updateState({ selectedFile: null, file: [] }), [updateState]);

  /* ── Submit ──────────────────────────────────────────────── */
  const handleSubmit = useCallback(
    async (values) => {
      try {
        dispatch(showAuthLoader());
        if (state.reviewId) {
          const formData = new FormData();
          state.file.forEach((item) => {
            if (item.originFileObj) formData.append("projectexpences", item.originFileObj);
          });
          const excluded = ["project_manager", "account_manager", "billing_cycle", "is_recuring"];
          Object.entries(values).forEach(([key, value]) => {
            if (!excluded.includes(key) && value !== undefined && value !== null && value !== "") {
              if (key === "invoice") formData.delete(key);
              else formData.append(key === "project" ? "project_id" : key, value);
            }
          });
          if (values.billing_cycle && values.is_recuring) {
            formData.append("billing_cycle", values.billing_cycle);
            formData.append("is_recuring",   values.is_recuring);
          }
          const response = await Service.makeAPICall({
            methodName: Service.putMethod,
            api_url:    `${Service.updateprojectexpanses}/${state.reviewId}`,
            body:       formData,
            headers:    { "Content-Type": "multipart/form-data" },
          });
          if (response?.data?.data) {
            message.success(response.data.message);
            await emitEvent(socketEvents.PROJECT_EXPENSE_UPDATED, {
              type: "update",
              id: state.reviewId,
            });
            history.push(`/${companySlug}/projectexpense`);
          } else {
            message.error(response.data.message);
          }
        } else {
          const selectedProject = state.projects.find((project) => project?._id === values.project);
          const reviewData = {
            cost_in_usd:               values.cost_in_usd,
            project_id:                values.project,
            purchase_request_details:  values.purchase_request_details,
            need_to_bill_customer:     values.need_to_bill_customer,
          };
          if (values.billing_cycle && values.is_recuring) {
            reviewData.billing_cycle = values.billing_cycle;
            reviewData.is_recuring   = values.is_recuring;
          }
          const response = await Service.makeAPICall({
            methodName: Service.postMethod,
            api_url:    Service.addprojectexpanses,
            body:       reviewData,
          });
          if (response?.data?.statusCode === 201) {
            message.success(response.data.message);
            const createdExpense = {
              ...(response?.data?.data || {}),
              _id: response?.data?.data?._id || response?.data?.data?.id,
              cost_in_usd: values.cost_in_usd,
              need_to_bill_customer: values.need_to_bill_customer,
              purchase_request_details: values.purchase_request_details,
              status: response?.data?.data?.status || "Pending",
              createdAt: response?.data?.data?.createdAt || new Date().toISOString(),
              project:
                response?.data?.data?.project || {
                  _id: values.project,
                  title: selectedProject?.title || form.getFieldValue("project"),
                },
              manager:
                response?.data?.data?.manager || {
                  full_name: values.project_manager || form.getFieldValue("project_manager") || "",
                },
              acc_manager:
                response?.data?.data?.acc_manager || {
                  full_name: values.account_manager || form.getFieldValue("account_manager") || "",
                },
              createdBy:
                response?.data?.data?.createdBy || {
                  _id: userRole?._id,
                  full_name:
                    userRole?.full_name ||
                    [userRole?.first_name, userRole?.last_name].filter(Boolean).join(" ") ||
                    userRole?.name ||
                    "You",
                },
            };
            await emitEvent(socketEvents.PROJECT_EXPENSE_UPDATED, {
              type: "add",
              id: createdExpense._id,
            });
            history.push(`/${companySlug}/projectexpense`, {
              justCreatedExpense: createdExpense,
            });
          } else {
            message.error(response.data.message);
          }
        }
      } catch (error) {
        console.error(error);
        message.error("Failed to submit form");
      } finally {
        dispatch(hideAuthLoader());
      }
    },
    [state, dispatch, history, companySlug, emitEvent, form, userRole]
  );

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="ps-page">
      <div className="ps-card">
        {/* Header */}
        <div className="ps-header">
          <h2 className="ps-title">
            <span className="ps-title-icon"><DollarCircleOutlined /></span>
            {isEdit ? "Edit Project Expense" : "Add Project Expense"}
          </h2>
          <div className="ps-header-right">
            <button
              className="add-btn"
              onClick={() => history.push(`/${companySlug}/projectexpense`)}
            >
              <ArrowLeftOutlined /> Back to Expenses
            </button>
          </div>
        </div>

        <div className="ps-form-wrap">
          <Form
            form={form}
            layout="vertical"
            className="ps-form"
            onFinish={handleSubmit}
            onValuesChange={(changed) => {
              if (changed.status    !== undefined) updateState({ isPaid:      changed.status === "Paid" });
              if (changed.is_recuring !== undefined) updateState({ isRecurring: changed.is_recuring });
            }}
          >
            <div className="ps-form-grid">

              {/* Project */}
              <Form.Item
                name="project"
                label="Project"
                rules={[{ required: true, message: "Please select a project" }]}
              >
                {isAccountant ? (
                  <Input placeholder="Project" disabled />
                ) : (
                  <Select
                    placeholder="Select project"
                    showSearch
                    filterOption={(input, option) =>
                      option.label?.toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={fetchProjectDetails}
                    options={state.projects.map((p) => ({ value: p._id, label: p.title }))}
                  />
                )}
              </Form.Item>

              {/* Project Manager */}
              <Form.Item
                name="project_manager"
                label="Project Manager"
                rules={[{ required: true, message: "Project manager is required" }]}
              >
                <Input
                  placeholder="Auto-filled from project"
                  disabled
                  prefix={<UserOutlined style={{ color: "#cbd5e1" }} />}
                />
              </Form.Item>

              {/* Account Manager */}
              <Form.Item
                name="account_manager"
                label="Account Manager"
                rules={[{ required: true, message: "Account manager is required" }]}
              >
                <Input
                  placeholder="Auto-filled from project"
                  disabled
                  prefix={<UserOutlined style={{ color: "#cbd5e1" }} />}
                />
              </Form.Item>

              {/* Cost in USD */}
              <Form.Item
                label="Cost"
                name="cost_in_usd"
                rules={[
                  { required: true, message: "Please enter the cost in USD" },
                  { pattern: /^\d+(\.\d{1,2})?$/, message: "Enter a valid cost (up to 2 decimal places)" },
                ]}
              >
                <Input
                  prefix={<DollarCircleOutlined style={{ color: "#cbd5e1" }} />}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </Form.Item>

              {/* Need to Bill Customer */}
              <Form.Item
                label="Need to Bill Customer?"
                name="need_to_bill_customer"
                initialValue={true}
              >
                <Radio.Group>
                  {RADIO_OPTIONS.map((o) => (
                    <Radio key={String(o.value)} value={o.value}>{o.label}</Radio>
                  ))}
                </Radio.Group>
              </Form.Item>

              {/* Is Recurring Purchase */}
              <Form.Item
                label="Is Recurring Purchase?"
                name="is_recuring"
                initialValue={false}
              >
                <Radio.Group>
                  {RADIO_OPTIONS.map((o) => (
                    <Radio key={String(o.value)} value={o.value}>{o.label}</Radio>
                  ))}
                </Radio.Group>
              </Form.Item>

              {/* Billing Cycle (conditional) */}
              {state.isRecurring && (
                <Form.Item
                  label="Billing Cycle"
                  name="billing_cycle"
                  initialValue="monthly"
                >
                  <Select
                    placeholder="Select billing cycle"
                    options={BILLING_CYCLE_OPTIONS}
                  />
                </Form.Item>
              )}

            </div>

            {/* Purchase Request Details — full width */}
            <Form.Item
              label="Purchase Request Details"
              name="purchase_request_details"
              rules={[{ required: true, message: "Please enter purchase request details" }]}
            >
              <Input.TextArea
                placeholder="Enter purchase request details"
                rows={4}
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            {/* ── Status / Paid section (edit only) ───────────── */}
            {isEdit && (
              <>
                <div style={{ borderTop: "1px solid #f1f5f9", margin: "8px 0 20px" }} />

                <div className="ps-form-grid">
                  {canEditStatus && (
                    <Form.Item label="Status" name="status">
                      <Select
                        placeholder="Select status"
                        options={statusOptions}
                      />
                    </Form.Item>
                  )}

                  {state.isPaid && (
                    <Form.Item
                      label="Nature of Expense"
                      name="nature_Of_expense"
                      rules={[{ required: true, message: "Please enter nature of expense" }]}
                    >
                      <Input.TextArea
                        placeholder="Enter nature of expense"
                        rows={4}
                        style={{ borderRadius: 8 }}
                      />
                    </Form.Item>
                  )}
                </div>

                {(state.isPaid || state.viewData?.projectexpences?.length > 0) && (
                  <Form.Item
                    label="Accounting Details"
                    name="details"
                    rules={[{ required: true, message: "Please enter details" }]}
                  >
                    <Input.TextArea
                      placeholder="Enter accounting details"
                      rows={4}
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>
                )}

                {state.isPaid && (
                  <>
                    <Form.Item
                      label="Upload Invoice"
                      name="invoice"
                      valuePropName="file"
                      rules={[{ required: true, message: "Please upload an invoice" }]}
                    >
                      <Upload
                        maxCount={1}
                        beforeUpload={() => false}
                        showUploadList={false}
                        onChange={handleFileChange}
                      >
                        <button type="button" className="cad-upload-btn">
                          <UploadOutlined style={{ marginRight: 6 }} />
                          Click to Upload
                        </button>
                      </Upload>
                    </Form.Item>

                    {state.selectedFile && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13, color: "#475569" }}>
                        <PaperClipOutlined />
                        <span>
                          {state.selectedFile
                            .map((f) => f.name.length > 30 ? `${f.name.slice(0, 30)}…` : f.name)
                            .join(", ")}
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: 0 }}
                        >
                          <DeleteOutlined />
                        </button>
                      </div>
                    )}
                  </>
                )}

                {!state.isPaid && state.viewData?.projectexpences?.length > 0 && (
                  <div style={{ marginBottom: 16, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, marginRight: 8, color: "#475569" }}>Document:</span>
                    <a
                      href={`${process.env.REACT_APP_API_URL}/public/projectexpense/${state.viewData.projectexpences}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2563eb" }}
                    >
                      <FileTextOutlined style={{ marginRight: 4 }} />
                      {state.viewData.projectexpences[0]?.length > 30
                        ? `${state.viewData.projectexpences[0].slice(0, 30)}…`
                        : state.viewData.projectexpences[0]}
                    </a>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="ps-form-actions">
              <Button type="submit" className="add-btn">
             
                {isEdit ? "Update" : "Submit"}
              </Button>
              <Button
                type="button"
                className="delete-btn"
                onClick={() => history.push(`/${companySlug}/projectexpense`)}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ProjectExpensesForm;
