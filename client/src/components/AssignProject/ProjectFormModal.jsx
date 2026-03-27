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
  CloseOutlined,
  PlusOutlined,
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
  const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
  const companyId = userData?.companyId;
  const [form] = Form.useForm();
  const [departmentForm] = Form.useForm();
  const [clientCreateForm] = Form.useForm();
  const [employeeCreateForm] = Form.useForm();
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
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isSavingDepartment, setIsSavingDepartment] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [employeeModalType, setEmployeeModalType] = useState("project_manager");

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        dispatch(showAuthLoader());
        await Promise.all([
          getTechnologyList(),
          getProjectType(),
          getStatus(),
          getProjectassignees(),
          getProjectClients(),
          getManager(),
          getAccountManager(),
          getWorkflow(),
          getProjectTypeSlug(),
        ]);
        // Fetch project details AFTER all dropdown lists are loaded so that
        // form.setFieldsValue can resolve IDs to labels correctly.
        if (selectedProject) {
          await fetchProjectDetails(selectedProject._id);
        }
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
        setProjectTypeselect(p?.project_type?._id || "");
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
      const nextList = response?.data?.data || [];
      setTechnologyList(nextList);
      return nextList;
    } catch (error) { console.error(error); }
    return [];
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
      const nextList = response?.data?.data || [];
      setProjectClientList(nextList);
      return nextList;
    } catch (error) { console.error(error); }
    return [];
  };

  const getProjectassignees = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployees,
      });
      const nextList = response?.data?.data || [];
      setProjectAssigneesList(nextList);
      return nextList;
    } catch (error) { console.error(error); }
    return [];
  };

  const getManager = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectManager,
      });
      const nextList = response?.data?.data || [];
      setProjectManagerList(nextList);
      return nextList;
    } catch (error) { console.error(error); }
    return [];
  };

  const getAccountManager = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getAccountManager,
      });
      const nextList = response?.data?.data || [];
      setAccountManagerList(nextList);
      return nextList;
    } catch (error) { console.error(error); }
    return [];
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

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getAllRole,
      });
      setRoles(response?.data?.data || []);
      return response?.data?.data || [];
    } catch (error) {
      console.error(error);
      message.error("Unable to fetch roles");
      setRoles([]);
      return [];
    } finally {
      setRolesLoading(false);
    }
  };

  const getMatchingRoleId = (roleType, availableRoles = roles) => {
    if (roleType === "assignee") {
      return undefined;
    }
    const target = roleType === "account_manager" ? "account manager" : "project manager";
    return (
      availableRoles.find((role) => role?.role_name?.trim()?.toLowerCase() === target)?._id ||
      availableRoles.find((role) => role?.role_name?.trim()?.toLowerCase()?.includes(target))?._id ||
      undefined
    );
  };

  const openAddDepartmentModal = () => {
    departmentForm.resetFields();
    setIsAddDepartmentOpen(true);
  };

  const openAddClientModal = () => {
    clientCreateForm.setFieldsValue({ status: "Active" });
    setIsAddClientOpen(true);
  };

  const openAddEmployeeModal = async (type) => {
    setEmployeeModalType(type);
    const availableRoles = roles.length ? roles : await fetchRoles();
    employeeCreateForm.resetFields();
    employeeCreateForm.setFieldsValue({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      isActivate: true,
      pmsRoleId: getMatchingRoleId(type, availableRoles) || null,
    });
    setIsAddEmployeeOpen(true);
  };

  const handleCreateDepartment = async (values) => {
    try {
      setIsSavingDepartment(true);
      const departmentName = values.project_tech?.trim();
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addprojectTech,
        body: { project_tech: departmentName },
      });

      if (!response?.data?.status) {
        return message.error(response?.data?.message || "Unable to add department");
      }

      message.success(response?.data?.message || "Department added");
      const refreshedDepartments = await getTechnologyList();
      const createdDepartment =
        refreshedDepartments.find((item) => item?._id === response?.data?.data?._id) ||
        refreshedDepartments.find(
          (item) => item?.project_tech?.trim()?.toLowerCase() === departmentName?.toLowerCase()
        );

      if (createdDepartment?._id) {
        const nextTechnologyIds = [...new Set([...(projectTech || []), createdDepartment._id])];
        setProjectTech(nextTechnologyIds);
        form.setFieldValue("technology", nextTechnologyIds);
      }

      departmentForm.resetFields();
      setIsAddDepartmentOpen(false);
    } catch (error) {
      console.error(error);
      message.error("Unable to add department");
    } finally {
      setIsSavingDepartment(false);
    }
  };

  const handleCreateClient = async (values) => {
    const fullName = `${values.first_name} ${values.last_name}`.trim();
    const reqBody = {
      last_name: values.last_name?.trim(),
      first_name: values.first_name?.trim(),
      company_name: values.company_name?.trim(),
      phone_number: values.phone_number?.trim(),
      password: values?.plain_password,
      full_name: fullName,
      email: values.email?.trim(),
      extra_details: values.extra_details?.trim(),
      isActivate: values.status === "Active",
    };

    try {
      setIsSavingClient(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.clientAdd,
        body: reqBody,
      });

      if (response?.data?.statusCode !== 201) {
        return message.error(response?.data?.message || "Unable to add client");
      }

      message.success(response?.data?.message || "Client added");
      const refreshedClients = await getProjectClients();
      const createdClient =
        refreshedClients.find((item) => item?._id === response?.data?.data?._id) ||
        refreshedClients.find(
          (item) => item?.email?.trim()?.toLowerCase() === values.email?.trim()?.toLowerCase()
        );

      if (createdClient?._id) {
        setSelectedClient((prev) => {
          const nextClients = prev.some((item) => item?._id === createdClient._id)
            ? prev
            : [...prev, createdClient];
          form.setFieldValue("client", nextClients.map((item) => item._id));
          return nextClients;
        });
      }

      clientCreateForm.resetFields();
      setIsAddClientOpen(false);
    } catch (error) {
      console.error(error);
      message.error("Unable to add client");
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleCreateEmployee = async (values) => {
    try {
      setIsSavingEmployee(true);
      const payload = {
        firstName: values.first_name?.trim(),
        lastName: values.last_name?.trim(),
        companyId,
        isActivate: values.isActivate,
        email: values.email?.trim(),
        password: values.password,
        pmsRoleId: values.pmsRoleId,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addUser,
        body: payload,
      });

      const resData = response?.data;
      const createdEmployee = resData?.data || null;

      // status=0 means explicit backend error
      if (resData?.status === 0) {
        return message.error(resData?.message || "Unable to add employee");
      }

      message.success(resData?.message || "Employee added successfully");

      if (employeeModalType === "account_manager") {
        const nextAccountManagers = await getAccountManager();
        const createdAccountManager = nextAccountManagers.find(
          (item) =>
            item?._id === createdEmployee?._id ||
            item?.email?.trim()?.toLowerCase() === values.email?.trim()?.toLowerCase()
        );
        if (createdAccountManager?._id) {
          form.setFieldValue("acc_manager", createdAccountManager._id);
        }
      } else if (employeeModalType === "assignee") {
        const nextAssignees = await getProjectassignees();
        const createdAssignee = nextAssignees.find(
          (item) =>
            item?._id === createdEmployee?._id ||
            item?.email?.trim()?.toLowerCase() === values.email?.trim()?.toLowerCase()
        );
        if (createdAssignee?._id) {
          setSelectedItems((prev) => {
            const nextSelected = prev.some((item) => item?._id === createdAssignee._id)
              ? prev
              : [...prev, createdAssignee];
            form.setFieldValue("assignees", nextSelected.map((item) => item._id));
            return nextSelected;
          });
        }
      } else {
        const nextProjectManagers = await getManager();
        const createdProjectManager = nextProjectManagers.find(
          (item) =>
            item?._id === createdEmployee?._id ||
            item?.email?.trim()?.toLowerCase() === values.email?.trim()?.toLowerCase()
        );
        if (createdProjectManager?._id) {
          form.setFieldValue("manager", createdProjectManager._id);
        }
      }

      employeeCreateForm.resetFields();
      setIsAddEmployeeOpen(false);
    } catch (error) {
      console.error(error);
      message.error(error?.data?.message || error?.response?.data?.message || "Unable to add employee");
    } finally {
      setIsSavingEmployee(false);
    }
  };

  function generatePattern() {
    const patternString = "^[A-Z]{2}\\d+\\/[A-Z]{2,10}\\/[^/]+$";
    return new RegExp(patternString);
  }

  const getTitleFormatExample = () => "AB1234/TM/ABC";

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
        sessionStorage.removeItem("dashboard_project_total_count_v1");
        sessionStorage.removeItem("dashboard_project_list_v1");
        window.dispatchEvent(new CustomEvent("weekmate:projects-changed", {
          detail: { action: "add", projectId: response.data.data?._id },
        }));
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
        sessionStorage.removeItem("dashboard_project_total_count_v1");
        sessionStorage.removeItem("dashboard_project_list_v1");
        window.dispatchEvent(new CustomEvent("weekmate:projects-changed", {
          detail: { action: "edit", projectId: id },
        }));
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

  const isEdit = modalMode !== "add";

  return (
    <>
    <Modal
      footer={null}
      width={960}
      open={isModalOpen}
      onCancel={handleCancel}
      className="pfm-modal"
      closable={false}
      destroyOnClose
    >
      <div className="pfm-header">
        <h2 className="pfm-title">
          {isEdit ? "Update Project Details" : "Add Project Details"}
        </h2>
        <button type="button" className="pfm-close-btn" onClick={handleCancel} aria-label="Close">
          <CloseOutlined />
        </button>
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
              () => ({
                validator(_, value) {
                  const trimmedValue = (value || "").trim();
                  if (!trimmedValue) return Promise.resolve();

                  if (generatePattern().test(trimmedValue)) {
                    return Promise.resolve();
                  }

                  return Promise.reject(
                    new Error(`Title must be in the format ${getTitleFormatExample()}`)
                  );
                },
              }),
            ]}
          >
            <div className="pfm-input-group">
              <div className="pfm-field-label pfm-field-label--required">Project Title</div>
              <Input
                placeholder={getTitleFormatExample()}
                className="pfm-input"
                bordered={false}
              />
            </div>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Description */}
        <div className="pfm-field-row pfm-field-row--top">
          <MessageOutlined className="pfm-icon" />
          <Form.Item name="descriptions" className="pfm-form-item">
            <div className="pfm-input-group">
              <div className="pfm-field-label">Description</div>
              <div className="pfm-editor-wrapper">
              <CKEditor
                editor={Custombuild}
                data={editorData}
                onChange={handleChange}
                onPaste={handlePaste}
                config={{
                  toolbar: [
                    "bold", "italic", "underline", "|",
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
              <div className="pfm-input-group">
                <div className="pfm-field-label">Start Date</div>
                <DatePicker
                  placeholder="Select start date"
                  className="pfm-datepicker"
                  bordered={false}
                  format="DD/MM/YYYY"
                  onChange={() => form.setFieldValue("end_date", "")}
                />
              </div>
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
              <div className="pfm-input-group">
                <div className="pfm-field-label">End Date</div>
                <DatePicker
                  placeholder="Select end date"
                  className="pfm-datepicker"
                  bordered={false}
                  format="DD/MM/YYYY"
                  disabled={noEndDate}
                  disabledDate={(v) => v < form.getFieldValue("start_date")}
                />
              </div>
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

        {/* 2-col grid for all simple fields */}
        <div className="pfm-fields-grid">

        {/* Department (Technology) */}
        <div className="pfm-field-row">
          <AppstoreOutlined className="pfm-icon" />
          <Form.Item
            name="technology"
            className="pfm-form-item"
            rules={[{ required: true, message: "Please select a department" }]}
          >
            <div className="pfm-input-group">
              <div className="pfm-field-label-row">
                <div className="pfm-field-label">Department</div>
                <button type="button" className="pfm-add-new-btn" onClick={openAddDepartmentModal}>
                  <PlusOutlined /> Add New
                </button>
              </div>
              <Select
                mode="multiple"
                placeholder="Select department"
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
            </div>
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
            <div className="pfm-input-group">
              <div className="pfm-field-label">Project Type</div>
              <Select
                placeholder="Select project type"
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
            </div>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Client */}
        <div className="pfm-field-row">
          <UserOutlined className="pfm-icon" />
          <Form.Item name="client" className="pfm-form-item">
            <div className="pfm-input-group">
              <div className="pfm-field-label-row">
                <div className="pfm-field-label">Client Name</div>
                <button type="button" className="pfm-add-new-btn" onClick={openAddClientModal}>
                  <PlusOutlined /> Add New
                </button>
              </div>
              <div className="pfm-multiselect-wrapper">
                <MultiSelect
                  onSearch={handleSearch}
                  onChange={handleClients}
                  values={selectedClient?.map((item) => item._id)}
                  listData={projectClientList}
                  search={searchKeyword}
                  placeholder="Select client"
                />
              </div>
            </div>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Assignees */}
        <div className="pfm-field-row">
          <UsergroupAddOutlined className="pfm-icon" />
          <Form.Item name="assignees" className="pfm-form-item">
            <div className="pfm-input-group">
              <div className="pfm-field-label-row">
                <div className="pfm-field-label">Assignee / Team Group</div>
                <button
                  type="button"
                  className="pfm-add-new-btn"
                  onClick={() => openAddEmployeeModal("assignee")}
                >
                  <PlusOutlined /> Add New
                </button>
              </div>
              <div className="pfm-multiselect-wrapper">
                <MultiSelect
                  onSearch={handleSearch}
                  onChange={handleSelectedItemsChange}
                  values={selectedItems?.map((item) => item._id)}
                  listData={projectAssigneesList}
                  search={searchKeyword}
                  placeholder="Select assignees"
                />
              </div>
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
            <div className="pfm-input-group">
              <div className="pfm-field-label-row">
                <div className="pfm-field-label">Project Manager</div>
                <button
                  type="button"
                  className="pfm-add-new-btn"
                  onClick={() => openAddEmployeeModal("project_manager")}
                >
                  <PlusOutlined /> Add New
                </button>
              </div>
              <Select
                placeholder="Select project manager"
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
            </div>
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
            <div className="pfm-input-group">
              <div className="pfm-field-label-row">
                <div className="pfm-field-label">Account Manager</div>
                <button
                  type="button"
                  className="pfm-add-new-btn"
                  onClick={() => openAddEmployeeModal("account_manager")}
                >
                  <PlusOutlined /> Add New
                </button>
              </div>
              <Select
                placeholder="Select account manager"
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
            </div>
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
            <div className="pfm-input-group">
              <div className="pfm-field-label">Associate Workflow</div>
              <Select
                placeholder="Select workflow"
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
            </div>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Status */}
        <div className="pfm-field-row">
          <CheckCircleOutlined className="pfm-icon" />
          <Form.Item name="project_status" className="pfm-form-item">
            <div className="pfm-input-group">
              <div className="pfm-field-label">Status</div>
              <Select
                placeholder="Select status"
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
            </div>
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
            <div className="pfm-input-group">
              <div className="pfm-field-label">Estimated Hours</div>
              <Input
                placeholder="Enter estimated hours"
                className="pfm-input"
                bordered={false}
                disabled={modalMode !== "add" ? !getRoles(["Admin"]) : false}
                type="number"
                min={0}
              />
            </div>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Recurring */}
        <div className="pfm-field-row">
          <SyncOutlined className="pfm-icon" />
          <Form.Item name="recurringType" className="pfm-form-item">
            <div className="pfm-input-group">
              <div className="pfm-field-label">Recurring</div>
              <Select
                placeholder="Select recurring type"
                bordered={false}
                className="pfm-select"
                allowClear
              >
                <Select.Option value="monthly">Monthly</Select.Option>
                <Select.Option value="yearly">Yearly</Select.Option>
              </Select>
            </div>
          </Form.Item>
        </div>
        <div className="pfm-divider" />

        {/* Billable */}
        <div className="pfm-field-row pfm-field-row--checkbox">
          <DollarOutlined className="pfm-icon" />
          <Form.Item name="isBillable" className="pfm-form-item" valuePropName="checked">
            <div className="pfm-input-group">
              <div className="pfm-field-label">Billable Project</div>
              <Checkbox checked={isBillable} onChange={handleBillable}>
                Yes
              </Checkbox>
            </div>
          </Form.Item>
        </div>

        </div>{/* end pfm-fields-grid */}

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
    <Modal
      title="Add Department"
      open={isAddDepartmentOpen}
      className="pfm-inline-modal"
      onCancel={() => {
        setIsAddDepartmentOpen(false);
        departmentForm.resetFields();
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            setIsAddDepartmentOpen(false);
            departmentForm.resetFields();
          }}
        >
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isSavingDepartment}
          onClick={() => departmentForm.submit()}
        >
          Add
        </Button>,
      ]}
    >
      <Form form={departmentForm} layout="vertical" onFinish={handleCreateDepartment}>
        <Form.Item
          label="Department Name"
          name="project_tech"
          rules={[{ required: true, whitespace: true, message: "Department name is required" }]}
        >
          <Input placeholder="Enter department name" />
        </Form.Item>
      </Form>
    </Modal>
    <Modal
      title="Add Client"
      open={isAddClientOpen}
      width={720}
      className="pfm-inline-modal"
      onCancel={() => {
        setIsAddClientOpen(false);
        clientCreateForm.resetFields();
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            setIsAddClientOpen(false);
            clientCreateForm.resetFields();
          }}
        >
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isSavingClient}
          onClick={() => clientCreateForm.submit()}
        >
          Add
        </Button>,
      ]}
    >
      <Form
        form={clientCreateForm}
        layout="vertical"
        initialValues={{ status: "Active" }}
        onFinish={handleCreateClient}
      >
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="First name"
              name="first_name"
              rules={[{ required: true, message: "First name is required" }]}
            >
              <Input placeholder="First name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Last name"
              name="last_name"
              rules={[{ required: true, message: "Last name is required" }]}
            >
              <Input placeholder="Last name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Company name"
              name="company_name"
              rules={[{ required: true, message: "Company name is required" }]}
            >
              <Input placeholder="Company name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input placeholder="Email" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Phone" name="phone_number">
              <Input placeholder="Phone (optional)" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Password"
              name="plain_password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password placeholder="Password" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: "Status is required" }]}
            >
              <Select placeholder="Status">
                <Select.Option value="Active">Active</Select.Option>
                <Select.Option value="Inactive">Inactive</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Extra details" name="extra_details">
              <Input.TextArea rows={3} placeholder="Notes (optional)" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
    <Modal
      title={
        employeeModalType === "account_manager"
          ? "Add Account Manager"
          : employeeModalType === "assignee"
          ? "Add Assignee"
          : "Add Project Manager"
      }
      open={isAddEmployeeOpen}
      width={640}
      className="pfm-inline-modal"
      onCancel={() => {
        setIsAddEmployeeOpen(false);
        employeeCreateForm.resetFields();
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            setIsAddEmployeeOpen(false);
            employeeCreateForm.resetFields();
          }}
        >
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isSavingEmployee}
          onClick={() => employeeCreateForm.submit()}
        >
          Add
        </Button>,
      ]}
    >
      <Form
        form={employeeCreateForm}
        layout="vertical"
        initialValues={{ isActivate: true }}
        onFinish={handleCreateEmployee}
      >
        <Form.Item
          name="first_name"
          label="First Name"
          rules={[{ required: true, message: "First name is required" }]}
        >
          <Input placeholder="Enter first name" />
        </Form.Item>

        <Form.Item
          name="last_name"
          label="Last Name"
          rules={[{ required: true, message: "Last name is required" }]}
        >
          <Input placeholder="Enter last name" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Email is required" },
            { type: "email", message: "Enter a valid email" },
          ]}
        >
          <Input placeholder="Enter email" />
        </Form.Item>

        <Form.Item
          name="pmsRoleId"
          label="Role"
          rules={[{ required: true, message: "Please select a role" }]}
        >
          <Select placeholder="Select role" loading={rolesLoading} showSearch>
            {roles.map((role) => (
              <Select.Option key={role._id} value={role._id}>
                {role.role_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: "Password is required" }]}
        >
          <Input.Password placeholder="Enter password" autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          name="isActivate"
          label="Status"
          rules={[{ required: true, message: "Status is required" }]}
        >
          <Select placeholder="Select status">
            <Select.Option value={true}>Active</Select.Option>
            <Select.Option value={false}>Inactive</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
    </>
  );
};

export default ProjectFormModal;
