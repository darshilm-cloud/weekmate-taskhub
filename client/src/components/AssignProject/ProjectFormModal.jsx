import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  message,
  Spin,
} from "antd";
import {
  FolderOutlined,
  MessageOutlined,
  CalendarOutlined,
  UserOutlined,
  UsergroupAddOutlined,
  TeamOutlined,
  AppstoreOutlined,
  TagOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import dayjs from "dayjs";
import Service from "../../service";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import MultiSelect from "../CustomSelect/MultiSelect";
import { removeTitle } from "../../util/nameFilter";
import { generateCacheKey } from "../../util/generateCacheKey";
import { useParams, useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { getRoles } from "../../util/hasPermission";
import "./ProjectFormModal.css";

const ProjectFormModal = ({
  isModalOpen,
  modalMode,
  selectedProject,
  handleCancel,
  setIsModalOpen,
  triggerRefreshList,
}) => {
  const companySlug = localStorage.getItem("companyDomain");
  const [form] = Form.useForm();
  const { editProjectId } = useParams();
  const history = useHistory();
  const { emitEvent } = useSocketAction();
  const dispatch = useDispatch();

  const [technologyList, setTechnologyList] = useState([]);
  const [projectTypeList, setProjectTypeList] = useState([]);
  const [projectStatusList, setProjectStatusList] = useState([]);
  const [workflow, setWorkflow] = useState([]);
  const [projectManagerList, setProjectManagerList] = useState([]);
  const [projectAssigneesList, setProjectAssigneesList] = useState([]);
  const [projectClientList, setProjectClientList] = useState([]);
  const [accountManagerList, setAccountManagerList] = useState([]);
  const [selectedClient, setSelectedClient] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [newFilteredAssignees, setNewFilteredAssignees] = useState([]);
  const [newFilteredClients, setNewFilteredClients] = useState([]);
  const [editorData, setEditorData] = useState("");
  const [projectTypeSlug, setProjectTypeSlug] = useState("");
  const [projectTech, setProjectTech] = useState([]);
  const [projectTypeselect, setProjectTypeselect] = useState("");
  const [isBillable, setIsBillable] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [noEndDate, setNoEndDate] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        dispatch(showAuthLoader());
        const apiCalls = [
          getTechnologyList(),
          getProjectType(),
          getStatus(),
          getProjectassignees(),
          getProjectClients(),
          getManager(),
          getAccountManager(),
          getWorkflow(),
          getProjectTypeSlug(),
          selectedProject ? fetchProjectDetails(selectedProject._id) : Promise.resolve(),
        ];
        await Promise.all(apiCalls);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        dispatch(hideAuthLoader());
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [selectedProject, dispatch]);

  const fetchProjectDetails = async (id) => {
    try {
      let Key = generateCacheKey("project", { _id: id });
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: { _id: id },
        options: { cachekey: Key },
      });
      if (response.data.statusCode === 401) {
        window.location.href = `${process.env.REACT_APP_URL}unauthorised`;
      }
      if (response.data && response.data.data) {
        const p = response.data.data;
        setSelectedItems(p?.assignees || []);
        setSelectedClient(p?.pms_clients || []);
        setNewFilteredAssignees(p?.assignees || []);
        setNewFilteredClients(p?.pms_clients || []);
        setEditorData(p?.descriptions || "");
        setIsBillable(p?.isBillable || false);
        const technologyIds = p?.technology?.map((item) => item?._id) || [];
        setProjectTech(technologyIds);
        if (!p?.end_date) setNoEndDate(true);
        form.setFieldsValue({
          title: p?.title?.trim(),
          technology: technologyIds,
          project_type: p?.project_type?._id,
          descriptions: removeHTMLTags(p?.descriptions || ""),
          workFlow: p?.workFlow?._id,
          manager: p?.manager?._id,
          acc_manager: p?.acc_manager?._id,
          estimatedHours: p?.estimatedHours,
          project_status: p?.project_status?._id,
          start_date: p?.start_date ? dayjs(p.start_date) : null,
          end_date: p?.end_date ? dayjs(p.end_date) : null,
          isBillable: p?.isBillable,
          recurringType: p?.recurringType,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const removeHTMLTags = (inputText) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(inputText, "text/html");
    return doc.body.textContent || "";
  };

  const getTechnologyList = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectTech,
        body: { isDropdown: true },
      });
      if (response?.data?.data) setTechnologyList(response.data.data);
    } catch (error) { console.error(error); }
  };

  const getProjectType = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListing,
      });
      if (response?.data?.data) setProjectTypeList(response.data.data);
    } catch (error) { console.error(error); }
  };

  const getProjectTypeSlug = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectTypeSLug,
      });
      if (response?.data?.data) setProjectTypeSlug(response.data.data.slug);
    } catch (error) { console.error(error); }
  };

  const getProjectClients = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getClients,
        body: { isDropdown: true },
      });
      if (response?.data?.data) setProjectClientList(response.data.data);
    } catch (error) { console.error(error); }
  };

  const getProjectassignees = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployees,
      });
      if (response?.data?.data) setProjectAssigneesList(response.data.data);
    } catch (error) { console.error(error); }
  };

  const getManager = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectManager,
      });
      if (response?.data?.data) setProjectManagerList(response.data.data);
    } catch (error) { console.error(error); }
  };

  const getAccountManager = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getAccountManager,
      });
      if (response?.data?.data) setAccountManagerList(response.data.data);
    } catch (error) { console.error(error); }
  };

  const getStatus = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectStatus,
        body: { isDropdown: true },
      });
      if (response?.data?.data) setProjectStatusList(response.data.data);
    } catch (error) { console.error(error); }
  };

  const getWorkflow = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getworkflow,
        body: { isDropdown: "true" },
      });
      if (response?.data?.data && response?.data?.status) {
        setWorkflow(response.data.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) { console.error(error); }
  };

  const handleSearch = (searchValue) => setSearchKeyword(searchValue);

  const handleSelectedItemsChange = (selectedItemIds) => {
    setSelectedItems(projectAssigneesList.filter((item) => selectedItemIds.includes(item._id)));
    setSearchKeyword("");
  };

  const handleClients = (val) => {
    setSelectedClient(projectClientList.filter((item) => val.includes(item._id)));
    setSearchKeyword("");
  };

  const handleClearAssignees = () => setSelectedItems([]);
  const handleClearClient = () => setSelectedClient([]);

  const handleChange = (event, editor) => setEditorData(editor.getData());

  const handlePaste = (event, editor) => {
    const pastedData = (event.clipboardData || window.clipboardData).getData("text");
    const newData = pastedData.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    editor.setData(newData);
  };

  const handleBillable = (e) => setIsBillable(e.target.checked);
  const handleProjectTech = (val) => setProjectTech(val);

  function generatePattern(projectTypeSlug) {
    const patternString = `^[A-Z]{2}\\d+\\/(?:${projectTypeSlug})\\/[\\s\\S]+$`;
    return new RegExp(patternString);
  }

  const getProjectTypeIdByName = (name) =>
    projectTypeList.find((t) => t.project_type === name);
  const getProjectStatusIdByName = (name) =>
    projectStatusList.find((s) => s.title === name);
  const getManagerIdByName = (name) =>
    projectManagerList.find((m) => m.manager_name === name);
  const getWorkflowIdByName = (name) =>
    workflow.find((w) => w.project_workflow === name);

  const addProjectDetails = async (values) => {
    try {
      dispatch(showAuthLoader());
      const assignees = selectedItems?.map((item) => item._id) || [];
      const clients = selectedClient?.map((item) => item._id) || [];
      const reqBody = {
        title: values.title.trim(),
        assignees,
        pms_clients: clients,
        start_date: values.start_date,
        end_date: noEndDate ? null : values.end_date,
        estimatedHours: values.estimatedHours || "0",
        manager: values.manager,
        acc_manager: values?.acc_manager || "",
        project_status:
          values.project_status ||
          projectStatusList.find((item) => item?.title?.toLowerCase() === "active")?._id,
        workFlow: values.workFlow,
        project_type: values.project_type,
        descriptions: editorData,
        technology: values.technology,
        isBillable,
        recurringType: values?.recurringType || "",
      };
      form.setFieldsValue({ assignees, clients });
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectdetails,
        body: reqBody,
        options: { moduleprefix: "project" },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        form.resetFields();
        setIsModalOpen(false);
        try {
          const notificationKey = `weekmate-project-notifications-${companySlug || "default"}`;
          const existingNotifications = JSON.parse(localStorage.getItem(notificationKey) || "[]");
          const createdProject = response.data.data;
          const nextNotifications = [
            {
              _id: `local-project-${createdProject?._id || Date.now()}`,
              type: "localProjectCreated",
              localTitle: "Project created",
              message: `Project "${createdProject?.title || values.title.trim()}" created successfully.`,
              createdAt: new Date().toISOString(),
              project_id: createdProject?._id,
            },
            ...existingNotifications,
          ];
          localStorage.setItem(notificationKey, JSON.stringify(nextNotifications.slice(0, 25)));
          window.dispatchEvent(new CustomEvent("weekmate:project-notification"));
        } catch (notificationError) {
          console.error("project notification save error", notificationError);
        }
        await emitEvent(socketEvents.ADD_PROJECT_ASSIGNEE, response.data.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      triggerRefreshList();
    }
  };

  const editProjectdetails = async (id, values) => {
    try {
      dispatch(showAuthLoader());
      const assignees = selectedItems.map((item) => item._id);
      const clients = selectedClient.map((item) => item._id);
      const managerId = getManagerIdByName(values.manager);
      const acc_managerId = getManagerIdByName(values?.acc_manager);
      const typeId = getProjectTypeIdByName(values.project_type);
      const statusId = getProjectStatusIdByName(values.project_status);
      const workflowID = getWorkflowIdByName(values.workFlow);

      const reqBody = {
        ...values,
        descriptions: editorData,
        assignees,
        pms_clients: clients,
        technology: values.technology,
        project_type: typeId ? typeId._id : values.project_type,
        project_status: statusId ? statusId._id : values?.project_status,
        manager: managerId ? managerId._id : values.manager,
        acc_manager: acc_managerId ? acc_managerId._id : values.acc_manager,
        workFlow: workflowID ? workflowID._id : values.workFlow,
        recurringType: values?.recurringType,
        end_date: noEndDate ? null : values.end_date,
      };

      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateProjectdetails + params,
        body: reqBody,
        options: { moduleprefix: "project" },
      });
      dispatch(hideAuthLoader());
      if (response.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setIsModalOpen(false);
        let filterAssignees = assignees.filter(
          (id) => !newFilteredAssignees.some((user) => user._id === id)
        );
        let filterClients = clients.filter(
          (id) => !newFilteredClients.some((user) => user._id === id)
        );
        await emitEvent(socketEvents.EDIT_PROJECT_ASSIGNEE, {
          _id: id,
          manager: managerId ? managerId._id : values.manager,
          assignees: filterAssignees,
          pms_clients: filterClients,
        });
        if (editProjectId) {
          history.push(`/${companySlug}/project/app/${editProjectId}`);
        }
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      triggerRefreshList();
    }
  };

  if (isLoading) {
    return (
      <Modal
        footer={null}
        width={580}
        open={isModalOpen}
        onCancel={handleCancel}
        className="pfm-modal"
        destroyOnClose
      >
        <div className="pfm-header">
          <h2 className="pfm-title">Loading Project Details</h2>
        </div>
        <div style={{ padding: "24px 0", display: "flex", justifyContent: "center" }}>
          <Spin size="large" />
        </div>
      </Modal>
    );
  }

  const isEdit = modalMode !== "add";

  return (
    <Modal
      footer={null}
      width={580}
      open={isModalOpen}
      onCancel={handleCancel}
      className="pfm-modal"
      destroyOnClose
    >
      <div className="pfm-header">
        <h2 className="pfm-title">
          {isEdit ? "Update Project Details" : "Add Project Details"}
        </h2>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          isEdit
            ? editProjectdetails(selectedProject?._id, values)
            : addProjectDetails(values)
        }
      >
        {/* Project Title */}
        <div className="pfm-field-row">
          <FolderOutlined className="pfm-icon" />
          <Form.Item
            name="title"
            className="pfm-form-item"
            rules={[
              { required: true, whitespace: true, message: "Please enter a valid title" },
              {
                pattern: generatePattern(projectTypeSlug),
                message: "Title must be in the format AB1234/TM/ABC",
              },
            ]}
          >
            <Input
              placeholder="Project Title (AB1234/TM/ABC)"
              className="pfm-input"
              bordered={false}
            />
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Description */}
        <div className="pfm-field-row pfm-field-row--top">
          <MessageOutlined className="pfm-icon" />
          <Form.Item name="descriptions" className="pfm-form-item">
            <div className="pfm-editor-wrapper">
              <CKEditor
                editor={Custombuild}
                data={editorData}
                onChange={handleChange}
                onPaste={handlePaste}
                config={{
                  toolbar: [
                    "heading", "|", "bold", "italic", "underline", "|",
                    "fontColor", "fontBackgroundColor", "|", "link", "|",
                    "numberedList", "bulletedList", "|",
                    "alignment:left", "alignment:center", "alignment:right", "|",
                    "fontSize", "|", "print",
                  ],
                  fontSize: { options: ["default", ...Array.from({ length: 32 }, (_, i) => i + 1)] },
                  print: {},
                }}
              />
            </div>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Dates */}
        <div className="pfm-dates-row">
          <div className="pfm-date-col">
            <CalendarOutlined className="pfm-icon" />
            <Form.Item
              name="start_date"
              className="pfm-form-item"
              rules={[{ required: true, message: "Please select a start date" }]}
            >
              <DatePicker
                placeholder="Start Date"
                className="pfm-datepicker"
                bordered={false}
                format="DD/MM/YYYY"
                onChange={() => form.setFieldValue("end_date", "")}
              />
            </Form.Item>
          </div>
          <div className="pfm-date-divider" />
          <div className="pfm-date-col">
            <CalendarOutlined className="pfm-icon" />
            <Form.Item
              name="end_date"
              className="pfm-form-item"
              rules={
                noEndDate
                  ? []
                  : [
                      { required: true, message: "Please select an end date" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("start_date") < value)
                            return Promise.resolve();
                          return Promise.reject(new Error("End date must be later than start date"));
                        },
                      }),
                    ]
              }
            >
              <DatePicker
                placeholder="End Date"
                className="pfm-datepicker"
                bordered={false}
                format="DD/MM/YYYY"
                disabled={noEndDate}
                disabledDate={(v) => v < form.getFieldValue("start_date")}
              />
            </Form.Item>
          </div>
        </div>
        <div className="pfm-no-end-date-row">
          <Checkbox
            checked={noEndDate}
            onChange={(e) => {
              setNoEndDate(e.target.checked);
              if (e.target.checked) form.setFieldValue("end_date", null);
            }}
          >
            No End Date
          </Checkbox>
        </div>
        <div className="pfm-divider" />

        {/* Department (Technology) */}
        <div className="pfm-field-row">
          <AppstoreOutlined className="pfm-icon" />
          <Form.Item
            name="technology"
            className="pfm-form-item"
            rules={[{ required: true, message: "Please select a department" }]}
          >
            <Select
              mode="multiple"
              placeholder="Department"
              bordered={false}
              className="pfm-select"
              showSearch
              filterOption={(input, option) =>
                option.children?.toLowerCase()?.indexOf(input?.toLowerCase()) >= 0
              }
              onChange={handleProjectTech}
              value={projectTech}
            >
              {technologyList.map((item) => (
                <Select.Option key={item._id} value={item._id}>
                  {item.project_tech}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Project Type */}
        <div className="pfm-field-row">
          <TagOutlined className="pfm-icon" />
          <Form.Item
            name="project_type"
            className="pfm-form-item"
            rules={[{ required: true, message: "Please select a project type" }]}
          >
            <Select
              placeholder="Project Type"
              bordered={false}
              className="pfm-select"
              showSearch
              filterOption={(input, option) =>
                option.children?.toLowerCase()?.indexOf(input?.toLowerCase()) >= 0
              }
              onChange={(value) => setProjectTypeselect(value)}
            >
              {projectTypeList.map((item) => (
                <Select.Option key={item._id} value={item._id}>
                  {item.project_type}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Client */}
        <div className="pfm-field-row">
          <UserOutlined className="pfm-icon" />
          <Form.Item name="client" className="pfm-form-item">
            <div className="pfm-multiselect-wrapper">
              <MultiSelect
                onSearch={handleSearch}
                onChange={handleClients}
                values={selectedClient?.map((item) => item._id)}
                listData={projectClientList}
                search={searchKeyword}
                placeholder="Client name"
              />
            </div>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Assignees */}
        <div className="pfm-field-row">
          <UsergroupAddOutlined className="pfm-icon" />
          <Form.Item name="assignees" className="pfm-form-item">
            <div className="pfm-multiselect-wrapper">
              <MultiSelect
                onSearch={handleSearch}
                onChange={handleSelectedItemsChange}
                values={selectedItems?.map((item) => item._id)}
                listData={projectAssigneesList}
                search={searchKeyword}
                placeholder="+Assignee / Team group"
              />
            </div>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Project Manager */}
        <div className="pfm-field-row">
          <UserOutlined className="pfm-icon" />
          <Form.Item
            name="manager"
            className="pfm-form-item"
            rules={[{ required: true, message: "Please select a project manager" }]}
          >
            <Select
              placeholder="Project Manager"
              bordered={false}
              className="pfm-select"
              showSearch
              filterOption={(input, option) =>
                option.children?.toLowerCase()?.indexOf(input?.toLowerCase()) >= 0
              }
            >
              {projectManagerList.map((item) => (
                <Select.Option key={item._id} value={item._id}>
                  {removeTitle(item.manager_name)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Account Manager */}
        <div className="pfm-field-row">
          <UserOutlined className="pfm-icon" />
          <Form.Item
            name="acc_manager"
            className="pfm-form-item"
            rules={
              projectTypeselect === "65b9e9e70f085dbd9bb12797"
                ? []
                : [{ required: true, message: "This field is required!" }]
            }
          >
            <Select
              placeholder="Account Manager"
              bordered={false}
              className="pfm-select"
              showSearch
              filterOption={(input, option) =>
                option.children?.toLowerCase()?.indexOf(input?.toLowerCase()) >= 0
              }
            >
              {accountManagerList.map((item) => (
                <Select.Option key={item._id} value={item._id}>
                  {removeTitle(item.full_name)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Workflow */}
        <div className="pfm-field-row">
          <ApartmentOutlined className="pfm-icon" />
          <Form.Item
            name="workFlow"
            className="pfm-form-item"
            initialValue={workflow.find((w) => w.isDefault)?._id}
            rules={[{ required: true, message: "Please select a workflow" }]}
          >
            <Select
              placeholder="Associate Workflow"
              bordered={false}
              className="pfm-select"
              showSearch
              onDropdownVisibleChange={(open) => open && getWorkflow()}
            >
              {workflow.map((item) => (
                <Select.Option key={item._id} value={item._id}>
                  {item.project_workflow}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Status */}
        <div className="pfm-field-row">
          <CheckCircleOutlined className="pfm-icon" />
          <Form.Item name="project_status" className="pfm-form-item">
            <Select
              placeholder="Status"
              bordered={false}
              className="pfm-select"
              showSearch
            >
              {projectStatusList.map((item) => (
                <Select.Option key={item._id} value={item._id}>
                  {item.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Estimated Hours */}
        <div className="pfm-field-row">
          <ClockCircleOutlined className="pfm-icon" />
          <Form.Item
            name="estimatedHours"
            className="pfm-form-item"
            rules={[{ required: true, message: "Please provide estimated hours" }]}
          >
            <Input
              placeholder="Estimated Hours"
              className="pfm-input"
              bordered={false}
              disabled={modalMode !== "add" ? !getRoles(["Admin"]) : false}
              type="number"
              min={0}
            />
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Recurring */}
        <div className="pfm-field-row">
          <SyncOutlined className="pfm-icon" />
          <Form.Item name="recurringType" className="pfm-form-item">
            <Select
              placeholder="Recurring"
              bordered={false}
              className="pfm-select"
              allowClear
            >
              <Select.Option value="monthly">Monthly</Select.Option>
              <Select.Option value="yearly">Yearly</Select.Option>
            </Select>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Billable */}
        <div className="pfm-field-row pfm-field-row--checkbox">
          <DollarOutlined className="pfm-icon" />
          <Form.Item name="isBillable" className="pfm-form-item" valuePropName="checked">
            <Checkbox checked={isBillable} onChange={handleBillable}>
              Billable Project
            </Checkbox>
          </Form.Item>
        </div>

        {/* Footer buttons */}
        <div className="pfm-footer">
          <Button className="pfm-cancel-btn" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" className="pfm-submit-btn">
            {isEdit ? "Update" : "Save"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ProjectFormModal;
