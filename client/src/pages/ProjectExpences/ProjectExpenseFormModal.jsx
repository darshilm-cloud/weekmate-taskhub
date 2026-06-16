import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Button,
  Form,
  Input,
  message,
  Radio,
  Select,
  Upload,
  Modal,
  Row,
  Col,
  Spin,
} from "antd";
import {
  DollarCircleOutlined,
  FileTextOutlined,
  PaperClipOutlined,
  UploadOutlined,
  UserOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { sideBarContentId2 } from "../../constants";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";

const STATIC_ACCOUNTANT_ID = [sideBarContentId2];

const BILLING_CYCLE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly",  label: "Yearly"  },
];

const RADIO_OPTIONS = [
  { value: true,  label: "Yes" },
  { value: false, label: "No"  },
];

const ProjectExpenseFormModal = ({ open, onCancel, onSuccess, expenseId, mode = "add" }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { emitEvent } = useSocketAction();
  const companySlug = localStorage.getItem("companyDomain");

  const [projects, setProjects] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [viewData, setViewData] = useState({});
  const [isRecurring, setIsRecurring] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isViewOnly = mode === "view";
  const isEditMode = mode === "edit";

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

  const fetchProjects = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: {},
      });
      const projs = response?.data?.data?.data || response?.data?.data || [];
      setProjects(Array.isArray(projs) ? projs : []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchProjectDetails = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
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
      console.error(error);
    }
  }, [form]);

  const fetchExpenseData = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectexpanses,
        body: { _id: id },
      });
      if (response?.data?.data) {
        const data = response.data.data;
        const paid = data.status === "Paid";
        setViewData(data);
        setIsRecurring(data.is_recuring || false);
        setIsPaid(paid);
        if (data.project?._id) await fetchProjectDetails(data.project._id);
        form.setFieldsValue({
          project: isAccountant ? data.project?.title : data.project?._id,
          project_manager: data.manager?.full_name || "",
          account_manager: data.acc_manager?.full_name || "",
          purchase_request_details: data.purchase_request_details?.replace(/<br\s*\/?>/g, "\n") || "",
          cost_in_usd: data.cost_in_usd,
          need_to_bill_customer: data.need_to_bill_customer,
          status: data.status,
          details: data.details || "",
          billing_cycle: data.billing_cycle || "monthly",
          is_recuring: data.is_recuring || false,
          nature_Of_expense: data.nature_Of_expense || "",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [form, fetchProjectDetails, isAccountant]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setFileList([]);
      setIsRecurring(false);
      setIsPaid(false);
      fetchProjects();
      if (expenseId) {
        fetchExpenseData(expenseId);
      }
    }
  }, [open, expenseId, fetchExpenseData, fetchProjects, form]);

  const handleSubmit = async (values) => {
    if (isViewOnly) {
      onCancel();
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      fileList.forEach((item) => {
        if (item.originFileObj) formData.append("projectexpences", item.originFileObj);
      });

      const excluded = ["project_manager", "account_manager", "billing_cycle", "is_recuring"];
      Object.entries(values).forEach(([key, value]) => {
        if (!excluded.includes(key) && value !== undefined && value !== null && value !== "") {
          formData.append(key === "project" ? "project_id" : key, value);
        }
      });
      if (values.billing_cycle && values.is_recuring) {
        formData.append("billing_cycle", values.billing_cycle);
        formData.append("is_recuring", values.is_recuring);
      }

      let response;
      if (isEditMode && expenseId) {
        response = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: `${Service.updateprojectexpanses}/${expenseId}`,
          body: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.addprojectexpanses,
          body: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (response?.data?.statusCode === 201 || response?.data?.statusCode === 200) {
        await emitEvent(
          isEditMode ? socketEvents.PROJECT_EXPENSE_UPDATED : socketEvents.PROJECT_EXPENSE_UPDATED,
          { type: isEditMode ? "update" : "add", id: expenseId || response?.data?.data?._id }
        );
        onSuccess(response.data.message);
      } else {
        message.error(response?.data?.message || "Operation failed");
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DollarCircleOutlined style={{ color: "#2563eb" }} />
          <span>{isViewOnly ? "View Expense" : isEditMode ? "Edit Expense" : "Add Expense"}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
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
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={isViewOnly}
          onValuesChange={(changed) => {
            if (changed.status !== undefined) setIsPaid(changed.status === "Paid");
            if (changed.is_recuring !== undefined) setIsRecurring(changed.is_recuring);
          }}
          style={{ padding: "20px 0" }}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item name="project" label="Project" rules={[{ required: true }]}>
                {isAccountant ? (
                  <Input disabled />
                ) : (
                  <Select
                    placeholder="Select project"
                    showSearch
                    filterOption={(input, option) =>
                      option.label?.toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={fetchProjectDetails}
                    options={projects.map((p) => ({ value: p._id, label: p.title }))}
                  />
                )}
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="project_manager" label="Project Manager">
                <Input prefix={<UserOutlined />} disabled />
              </Form.Item>
            </Col>
            {/* <Col xs={24} md={12}>
              <Form.Item name="account_manager" label="Account Manager">
                <Input prefix={<UserOutlined />} disabled />
              </Form.Item>
            </Col> */}
            <Col xs={24} md={12}>
              <Form.Item
                label="Cost (₹)"
                name="cost_in_usd"
                rules={[
                  { required: true, message: "Required" },
                  { pattern: /^\d+(\.\d{1,2})?$/, message: "Invalid amount" },
                ]}
              >
                <Input prefix="₹" type="number" step="0.01" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Billable to Customer?" name="need_to_bill_customer" initialValue={true}>
                <Radio.Group options={RADIO_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Recurring Purchase?" name="is_recuring" initialValue={false}>
                <Radio.Group options={RADIO_OPTIONS} />
              </Form.Item>
            </Col>
            {isRecurring && (
              <Col xs={24} md={12}>
                <Form.Item label="Billing Cycle" name="billing_cycle" initialValue="monthly">
                  <Select options={BILLING_CYCLE_OPTIONS} />
                </Form.Item>
              </Col>
            )}
            <Col xs={24}>
              <Form.Item
                label="Purchase Request Details"
                name="purchase_request_details"
                rules={[{ required: true }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          {(isEditMode || isViewOnly) && (
            <>
              <div style={{ borderTop: "1px solid #f1f5f9", margin: "16px 0" }} />
              <Row gutter={24}>
                {canEditStatus && (
                  <Col xs={24} md={12}>
                    <Form.Item label="Status" name="status">
                      <Select options={statusOptions} />
                    </Form.Item>
                  </Col>
                )}
                {isPaid && (
                  <Col xs={24}>
                    <Form.Item label="Nature of Expense" name="nature_Of_expense" rules={[{ required: true }]}>
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </Col>
                )}
                {(isPaid || viewData?.projectexpences?.length > 0) && (
                  <Col xs={24}>
                    <Form.Item label="Accounting Details" name="details" rules={[{ required: true }]}>
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </Col>
                )}
              </Row>

              {isPaid && !isViewOnly && (
                <Form.Item label="Upload Invoice" name="invoice" valuePropName="file">
                  <Upload
                    maxCount={1}
                    beforeUpload={() => false}
                    onChange={(info) => setFileList(info.fileList)}
                  >
                    <Button icon={<UploadOutlined />}>Click to Upload</Button>
                  </Upload>
                </Form.Item>
              )}

              {viewData?.projectexpences?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontWeight: 600, marginRight: 8 }}>Document:</span>
                  <a
                    href={`${process.env.REACT_APP_API_URL}/public/projectexpense/${viewData.projectexpences}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileTextOutlined /> {viewData.projectexpences}
                  </a>
                </div>
              )}
            </>
          )}
        </Form>
      </Spin>
    </Modal>
  );
};

export default ProjectExpenseFormModal;
