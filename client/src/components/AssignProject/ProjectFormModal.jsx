import React, { useEffect, useMemo, useState } from "react";
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

// ── Module-level dropdown cache (persists across modal opens) ───────────────
// Dropdown data (technologies, types, statuses etc.) almost never changes
// per session, so we cache them here to avoid repeating 9 API calls every
// time the modal is opened. Cache is invalidated only on page reload.
const _dropdownCache = {
  technologyList: null,
  projectTypeList: null,
  projectStatusList: null,
  workflow: null,
  projectManagerList: null,
  projectAssigneesList: null,
  projectClientList: null,
  accountManagerList: null,
  projectTypeSlug: null,
};
// track if an in-flight fetch is happening so parallel opens don't double-fetch
let _fetchPromise = null;
const BACKEND_ONLY_PROJECT_KEYS = new Set(["id", "created_by", "created_at", "updated_at"]);
const PROJECT_BUILTIN_FIELD_KEYS = new Set([
  "title",
  "descriptions",
  "start_date",
  "end_date",
  "technology",
  "project_type",
  "pms_clients",
  "assignees",
  "manager",
  "acc_manager",
  "workFlow",
  "project_status",
  "estimatedHours",
  "recurringType",
  "isBillable",
]);


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

  const [technologyList, setTechnologyList] = useState(_dropdownCache.technologyList || []);
  const [projectTypeList, setProjectTypeList] = useState(_dropdownCache.projectTypeList || []);
  const [projectStatusList, setProjectStatusList] = useState(_dropdownCache.projectStatusList || []);
  const [workflow, setWorkflow] = useState(_dropdownCache.workflow || []);
  const [projectManagerList, setProjectManagerList] = useState(_dropdownCache.projectManagerList || []);
  const [projectAssigneesList, setProjectAssigneesList] = useState(_dropdownCache.projectAssigneesList || []);
  const [projectClientList, setProjectClientList] = useState(_dropdownCache.projectClientList || []);
  const [accountManagerList, setAccountManagerList] = useState(_dropdownCache.accountManagerList || []);
  const [selectedClient, setSelectedClient] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [newFilteredAssignees, setNewFilteredAssignees] = useState([]);
  const [newFilteredClients, setNewFilteredClients] = useState([]);
  const [editorData, setEditorData] = useState("");
  const [projectTech, setProjectTech] = useState([]);
  const [projectTypeSlug, setProjectTypeSlug] = useState(_dropdownCache.projectTypeSlug || "");
  const [projectTypeselect, setProjectTypeselect] = useState("");
  const [isBillable, setIsBillable] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  // If cache is already populated skip the loading state entirely
  const cacheReady = Boolean(
    _dropdownCache.technologyList &&
    _dropdownCache.projectTypeList &&
    _dropdownCache.projectStatusList &&
    _dropdownCache.workflow &&
    _dropdownCache.projectManagerList &&
    _dropdownCache.projectAssigneesList &&
    _dropdownCache.projectClientList &&
    _dropdownCache.accountManagerList &&
    _dropdownCache.projectTypeSlug !== null
  );
  const [isLoading, setIsLoading] = useState(!cacheReady || Boolean(selectedProject));
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [editorRefreshKey, setEditorRefreshKey] = useState(0);
  const [projectFormFields, setProjectFormFields] = useState([]);
  const [linkedOptionsByField, setLinkedOptionsByField] = useState({});

  const visibleCustomFields = useMemo(
    () =>
      (projectFormFields || []).filter((field) => {
        const key = String(field?.key || "").trim();
        if (!key) return false;
        if (BACKEND_ONLY_PROJECT_KEYS.has(key)) return false;
        if (PROJECT_BUILTIN_FIELD_KEYS.has(key)) return false;
        return true;
      }),
    [projectFormFields]
  );

  const getLookupCollections = (overrides = {}) => ({
    technologyList: overrides.technologyList ?? technologyList,
    projectTypeList: overrides.projectTypeList ?? projectTypeList,
    projectStatusList: overrides.projectStatusList ?? projectStatusList,
    workflow: overrides.workflow ?? workflow,
    projectManagerList: overrides.projectManagerList ?? projectManagerList,
    projectAssigneesList: overrides.projectAssigneesList ?? projectAssigneesList,
    projectClientList: overrides.projectClientList ?? projectClientList,
    accountManagerList: overrides.accountManagerList ?? accountManagerList,
  });

  const fetchProjectFormConfig = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectFormConfig,
      });
      if (response?.data?.status === 1) {
        const fields = Array.isArray(response?.data?.data?.fields) ? response.data.data.fields : [];
        setProjectFormFields(fields.sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0)));
      } else {
        setProjectFormFields([]);
      }
    } catch (error) {
      setProjectFormFields([]);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      // Don't reset if we are already showing some data from selectedProject hydration
      // unless we are switching projects.
      setIsLoading(true);
      try {
        dispatch(showAuthLoader());
        console.log("🚀 ~ fetchAllData ~ selectedProject:", selectedProject)
        if (selectedProject) {
          hydrateProjectForm(selectedProject);
        }

        const [
          technologyListResult,
          projectTypeListResult,
          projectStatusListResult,
          projectAssigneesListResult,
          projectClientListResult,
          projectManagerListResult,
          accountManagerListResult,
          workflowResult,
        ] = await Promise.allSettled([
          getTechnologyList(),
          getProjectType(),
          getStatus(),
          getProjectassignees(),
          getProjectClients(),
          getManager(),
          getAccountManager(),
          getWorkflow(),
          getProjectTypeSlug(),
          fetchProjectFormConfig(),
        ]);

        const lookupOverrides = getLookupCollections({
          technologyList:
            technologyListResult.status === "fulfilled" ? technologyListResult.value : undefined,
          projectTypeList:
            projectTypeListResult.status === "fulfilled" ? projectTypeListResult.value : undefined,
          projectStatusList:
            projectStatusListResult.status === "fulfilled" ? projectStatusListResult.value : undefined,
          projectAssigneesList:
            projectAssigneesListResult.status === "fulfilled" ? projectAssigneesListResult.value : undefined,
          projectClientList:
            projectClientListResult.status === "fulfilled" ? projectClientListResult.value : undefined,
          projectManagerList:
            projectManagerListResult.status === "fulfilled" ? projectManagerListResult.value : undefined,
          accountManagerList:
            accountManagerListResult.status === "fulfilled" ? accountManagerListResult.value : undefined,
          workflow:
            workflowResult.status === "fulfilled" ? workflowResult.value : undefined,
        });

        // Fetch project details after dropdown lists are loaded so field labels resolve correctly.
        if (selectedProject) {
          await fetchProjectDetails(selectedProject._id, lookupOverrides);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        dispatch(hideAuthLoader());
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [selectedProject]);


  const resetModalState = () => {
    form.resetFields();
    setSelectedItems([]);
    setSelectedClient([]);
    setNewFilteredAssignees([]);
    setNewFilteredClients([]);
    setEditorData("");
    setProjectTech([]);
    setProjectTypeselect("");
    setIsBillable(false);
    setNoEndDate(false);
    setEditorRefreshKey((prev) => prev + 1);
  };

  const getEntityId = (value) => {
    if (!value) return undefined;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      return value?._id || value?.id || value?.value;
    }
    return undefined;
  };

  const getNormalizedText = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const resolveSingleSelectValue = (rawValue, options = [], nameKeys = []) => {
    if (!rawValue) return undefined;

    const directId = getEntityId(rawValue);
    if (directId && options.some((item) => item?._id === directId)) {
      return directId;
    }

    const candidateTexts = [
      rawValue,
      rawValue?.title,
      rawValue?.name,
      rawValue?.label,
      rawValue?.full_name,
      rawValue?.manager_name,
      rawValue?.project_type,
      rawValue?.project_workflow,
      rawValue?.project_tech,
      rawValue?.department_name,
      rawValue?.sub_department_name,
      rawValue?.technology_name,
    ]
      .map(getNormalizedText)
      .filter(Boolean);

    const matchedOption = options.find((item) =>
      nameKeys.some((key) => candidateTexts.includes(getNormalizedText(item?.[key])))
    );

    return matchedOption?._id || directId;
  };

  const resolveMultiSelectValues = (rawValues, options = [], nameKeys = []) => {
    if (!Array.isArray(rawValues)) return [];

    return rawValues
      .map((value) => resolveSingleSelectValue(value, options, nameKeys))
      .filter(Boolean);
  };

  const resolveEntityList = (rawValues, options = [], nameKeys = []) => {
    if (!Array.isArray(rawValues)) return [];

    return rawValues
      .map((value) => {
        const resolvedId = resolveSingleSelectValue(value, options, nameKeys);
        return (
          options.find((item) => item?._id === resolvedId) ||
          (typeof value === "object" ? value : null)
        );
      })
      .filter(Boolean);
  };

  const mergeUniqueById = (prev = [], next = []) => {
    const merged = [...prev];
    next.forEach((item) => {
      const itemId = item?._id;
      if (!itemId) return;
      if (!merged.some((existing) => existing?._id === itemId)) {
        merged.push(item);
      }
    });
    return merged;
  };

  const normalizeTechnologyOption = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      return { _id: value, project_tech: value };
    }
    if (Array.isArray(value)) {
      return null;
    }
    return {
      ...value,
      _id: value?._id || value?.id || value?.value,
      project_tech:
        value?.project_tech ||
        value?.department_name ||
        value?.sub_department_name ||
        value?.technology_name ||
        value?.title ||
        value?.name ||
        "",
    };
  };

  const extractTechnologyCandidates = (value, acc = []) => {
    if (!value) return acc;

    if (Array.isArray(value)) {
      value.forEach((item) => extractTechnologyCandidates(item, acc));
      return acc;
    }

    if (typeof value === "string") {
      const text = value.trim();
      if (text) acc.push({ _id: text, project_tech: text });
      return acc;
    }

    if (typeof value === "object") {
      const directOption = normalizeTechnologyOption(value);
      if (directOption?._id || directOption?.project_tech) {
        acc.push({
          _id: directOption?._id || directOption?.project_tech,
          project_tech: directOption?.project_tech || directOption?._id,
        });
      }

      [
        value?.technology,
        value?.department,
        value?.departments,
        value?.projectDepartment,
        value?.project_department,
        value?.project_tech,
        value?.department_name,
        value?.sub_department_name,
        value?.technology_name,
        value?.name,
        value?.title,
        value?.label,
      ].forEach((nested) => extractTechnologyCandidates(nested, acc));
    }

    return acc;
  };

  const normalizeProjectTypeOption = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      return { _id: value, project_type: value };
    }
    return {
      ...value,
      _id: value?._id || value?.id || value?.value,
      project_type: value?.project_type || value?.title || value?.name || "",
    };
  };

  const normalizeWorkflowOption = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      return { _id: value, project_workflow: value };
    }
    return {
      ...value,
      _id: value?._id || value?.id || value?.value,
      project_workflow:
        value?.project_workflow || value?.title || value?.name || value?.workflow || "",
    };
  };

  const normalizeAccountManagerOption = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      return { _id: value, full_name: value };
    }
    return {
      ...value,
      _id: value?._id || value?.id || value?.value,
      full_name: value?.full_name || value?.manager_name || value?.name || "",
    };
  };

  const normalizeClientOption = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      return { _id: value, company_name: value };
    }
    return {
      ...value,
      _id: value?._id || value?.id || value?.value,
      company_name:
        value?.company_name || value?.client_name || value?.full_name || value?.name || "",
    };
  };

  const hydrateProjectForm = (projectDataRaw = {}, lookupOverrides = {}) => {
    const projectData = Array.isArray(projectDataRaw) ? projectDataRaw[0] : projectDataRaw;
    if (!projectData || (Object.keys(projectData).length === 0)) return;


    const {
      technologyList: availableTechnologyList,
      projectTypeList: availableProjectTypeList,
      projectStatusList: availableProjectStatusList,
      workflow: availableWorkflow,
      projectManagerList: availableProjectManagerList,
      projectAssigneesList: availableProjectAssigneesList,
      projectClientList: availableProjectClientList,
      accountManagerList: availableAccountManagerList,
    } = getLookupCollections(lookupOverrides);

    const rawDescription =
      projectData?.descriptions ??
      projectData?.description ??
      projectData?.project_description ??
      "";
    const rawTechnology =
      projectData?.technology ??
      projectData?.department ??
      projectData?.departments ??
      projectData?.projectDepartment ??
      projectData?.project_department ??
      projectData?.project_tech ??
      [];
    const rawProjectType =
      projectData?.project_type ??
      projectData?.projectType ??
      projectData?.type ??
      projectData?.projectTypeId;
    const rawWorkflow =
      projectData?.workFlow ??
      projectData?.workflow ??
      projectData?.work_flow ??
      projectData?.workflow_id ??
      projectData?.work_flow_id;
    const rawAccountManager =
      projectData?.acc_manager ??
      projectData?.account_manager ??
      projectData?.accManager ??
      projectData?.accountManager ??
      projectData?.acc_manager_id;
    const rawClients =
      projectData?.pms_clients ??
      projectData?.clients ??
      projectData?.client ??
      projectData?.client_name ??
      [];
    const rawRecurringType =
      projectData?.recurringType ??
      projectData?.recurring_type ??
      projectData?.recurring ??
      projectData?.billing_cycle ??
      null;
    const rawBillable =
      projectData?.isBillable ??
      projectData?.is_billable ??
      projectData?.billable ??
      projectData?.need_to_bill_customer ??
      false;

    const normalizedTechnologyOptions = extractTechnologyCandidates(projectData?.technology || []);
    const normalizedFallbackTechnologyOptions = extractTechnologyCandidates(rawTechnology);
    const normalizedProjectTypeOption = normalizeProjectTypeOption(rawProjectType);
    const normalizedWorkflowOption = normalizeWorkflowOption(rawWorkflow);
    const normalizedAccountManagerOption = normalizeAccountManagerOption(rawAccountManager);
    const normalizedClientOptions = (Array.isArray(rawClients) ? rawClients : [rawClients])
      .map(normalizeClientOption)
      .filter(Boolean);
    const allTechnologyOptions = mergeUniqueById(
      normalizedTechnologyOptions,
      normalizedFallbackTechnologyOptions
    );

    if (allTechnologyOptions.length > 0) {
      setTechnologyList((prev) => mergeUniqueById(prev, allTechnologyOptions));
    }
    if (normalizedProjectTypeOption?._id) {
      setProjectTypeList((prev) => mergeUniqueById(prev, [normalizedProjectTypeOption]));
    }
    if (normalizedWorkflowOption?._id) {
      setWorkflow((prev) => mergeUniqueById(prev, [normalizedWorkflowOption]));
    }
    if (normalizedAccountManagerOption?._id) {
      setAccountManagerList((prev) => mergeUniqueById(prev, [normalizedAccountManagerOption]));
    }
    if (normalizedClientOptions.length > 0) {
      setProjectClientList((prev) => mergeUniqueById(prev, normalizedClientOptions));
    }

    const assignees = resolveEntityList(
      projectData?.assignees || [],
      availableProjectAssigneesList,
      ["full_name", "name", "username"]
    );
    const clients = resolveEntityList(
      Array.isArray(rawClients) ? rawClients : [rawClients],
      mergeUniqueById(availableProjectClientList, normalizedClientOptions),
      ["full_name", "company_name", "client_name", "name"]
    );
    const technologyIds = resolveMultiSelectValues(
      Array.isArray(rawTechnology) ? rawTechnology : [rawTechnology],
      mergeUniqueById(availableTechnologyList, allTechnologyOptions),
      ["project_tech", "department_name", "sub_department_name", "technology_name", "title", "name"]
    );
    if (technologyIds.length === 0 && rawTechnology) {
      console.debug("ProjectFormModal department debug", {
        projectId: projectData?._id,
        rawTechnology,
        availableTechnologyList,
        allTechnologyOptions,
      });
    }
    const hasNoEndDate = !projectData?.end_date;
    const projectTypeId = resolveSingleSelectValue(
      rawProjectType,
      mergeUniqueById(
        availableProjectTypeList,
        normalizedProjectTypeOption ? [normalizedProjectTypeOption] : []
      ),
      ["project_type", "title", "name"]
    );
    const workflowId =
      resolveSingleSelectValue(
        rawWorkflow,
        mergeUniqueById(availableWorkflow, normalizedWorkflowOption ? [normalizedWorkflowOption] : []),
        ["project_workflow", "title", "name"]
      ) || availableWorkflow.find((item) => item?.isDefault)?._id;
    const managerId = resolveSingleSelectValue(
      projectData?.manager,
      availableProjectManagerList,
      ["manager_name", "full_name", "name"]
    );
    const accountManagerId = resolveSingleSelectValue(
      rawAccountManager,
      mergeUniqueById(
        availableAccountManagerList,
        normalizedAccountManagerOption ? [normalizedAccountManagerOption] : []
      ),
      ["full_name", "manager_name", "name"]
    );
    const projectStatusId = resolveSingleSelectValue(
      projectData?.project_status,
      availableProjectStatusList,
      ["title", "name", "status"]
    );
    const estimatedHours =
      projectData?.estimatedHours ??
      projectData?.estimated_hours ??
      projectData?.estimate_hours ??
      projectData?.estimatedHour ??
      projectData?.estimated_time ??
      projectData?.total_estimated_hours ??
      "";

    setSelectedItems(assignees);
    setSelectedClient(clients);
    if (assignees?.length > 0) setNewFilteredAssignees(assignees);
    if (clients?.length > 0) setNewFilteredClients(clients);
    if (rawDescription) {
      setEditorData(rawDescription);
      setEditorRefreshKey((prev) => prev + 1);
    }
    if (rawBillable !== undefined) setIsBillable(Boolean(rawBillable));
    if (technologyIds?.length > 0) setProjectTech(technologyIds);
    if (projectTypeId) setProjectTypeselect(projectTypeId);
    if (hasNoEndDate !== undefined) setNoEndDate(hasNoEndDate);

    const currentValues = form.getFieldsValue();
    const newValues = {
      title: projectData?.title?.trim?.() || currentValues.title || "",
      technology: technologyIds?.length > 0 ? technologyIds : currentValues.technology,
      project_type: projectTypeId || currentValues.project_type,
      descriptions: rawDescription ? removeHTMLTags(rawDescription) : (currentValues.descriptions || ""),
      workFlow: workflowId || currentValues.workFlow,
      manager: managerId || currentValues.manager,
      acc_manager: accountManagerId || currentValues.acc_manager,
      estimatedHours: estimatedHours || currentValues.estimatedHours,
      project_status: projectStatusId || currentValues.project_status,
      start_date: projectData?.start_date ? dayjs(projectData.start_date) : currentValues.start_date,
      end_date: hasNoEndDate ? null : (projectData?.end_date ? dayjs(projectData.end_date) : currentValues.end_date),
      isBillable: rawBillable !== undefined ? Boolean(rawBillable) : currentValues.isBillable,
      recurringType:
        rawRecurringType !== undefined
          ? typeof rawRecurringType === "boolean"
            ? rawRecurringType
              ? "monthly"
              : null
            : rawRecurringType
          : currentValues.recurringType,
      assignees: assignees?.length > 0 ? assignees.map((item) => item?._id).filter(Boolean) : currentValues.assignees,
      pms_clients: clients?.length > 0 ? clients.map((item) => item?._id).filter(Boolean) : currentValues.pms_clients,
      custom_fields: projectData?.custom_fields || currentValues?.custom_fields || {},
    };

    form.setFieldsValue(newValues);
  };

  const fetchProjectDetails = async (id, lookupOverrides = {}) => {
    try {
      const overviewResponse = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getOverview}/${id}`,
      });

      if (overviewResponse?.data?.statusCode === 401) {
        window.location.href = `${process.env.REACT_APP_URL}unauthorised`;
      }

      const overviewProjectDetails = overviewResponse?.data?.data;
      if (overviewProjectDetails) {
        hydrateProjectForm(overviewProjectDetails, lookupOverrides);
        return;
      }

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
        hydrateProjectForm(response.data.data, lookupOverrides);
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
    if (_dropdownCache.technologyList) {
      setTechnologyList(_dropdownCache.technologyList);
      return _dropdownCache.technologyList;
    }
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectTech,
        body: { isDropdown: true },
      });
      const nextList = response?.data?.data || [];
      _dropdownCache.technologyList = nextList;
      setTechnologyList(nextList);
      return nextList;
    } catch (error) { console.error(error); }
    return [];
  };

  const getProjectType = async () => {
    if (_dropdownCache.projectTypeList) {
      setProjectTypeList(_dropdownCache.projectTypeList);
      return _dropdownCache.projectTypeList;
    }
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListing,
      });
      if (response?.data?.data) setProjectTypeList(response.data.data);
    } catch (error) { console.error(error); }
    return [];
  };

  const getProjectTypeSlug = async () => {
    if (_dropdownCache.projectTypeSlug) {
      setProjectTypeSlug(_dropdownCache.projectTypeSlug);
      return _dropdownCache.projectTypeSlug;
    }
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectTypeSLug,
      });
      if (response?.data?.data) {
        _dropdownCache.projectTypeSlug = response.data.data.slug;
        setProjectTypeSlug(response.data.data.slug);
      }
    } catch (error) { console.error(error); }
  };

  const getProjectClients = async () => {
    if (_dropdownCache.projectClientList) {
      setProjectClientList(_dropdownCache.projectClientList);
      return _dropdownCache.projectClientList;
    }
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getClients,
        body: { isDropdown: true },
      });
      const nextList = response?.data?.data || [];
      _dropdownCache.projectClientList = nextList;
      setProjectClientList(nextList);
      return nextList;
    } catch (error) { console.error(error); }
    return [];
  };

  const getProjectassignees = async () => {
    if (_dropdownCache.projectAssigneesList) {
      setProjectAssigneesList(_dropdownCache.projectAssigneesList);
      return _dropdownCache.projectAssigneesList;
    }
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployees,
      });
      const nextList = response?.data?.data || [];
      _dropdownCache.projectAssigneesList = nextList;
      setProjectAssigneesList(nextList);
      return nextList;
    } catch (error) { console.error(error); }
    return [];
  };

  const getManager = async () => {
    if (_dropdownCache.projectManagerList) {
      setProjectManagerList(_dropdownCache.projectManagerList);
      return _dropdownCache.projectManagerList;
    }
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectManager,
      });
      const nextList = response?.data?.data || [];
      _dropdownCache.projectManagerList = nextList;
      setProjectManagerList(nextList);
      return nextList;
    } catch (error) { console.error(error); }
    return [];
  };

  const getAccountManager = async () => {
    if (_dropdownCache.accountManagerList) {
      setAccountManagerList(_dropdownCache.accountManagerList);
      return _dropdownCache.accountManagerList;
    }
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getAccountManager,
      });
      const nextList = response?.data?.data || [];
      _dropdownCache.accountManagerList = nextList;
      setAccountManagerList(nextList);
      return nextList;
    } catch (error) { console.error(error); }
    return [];
  };

  const getStatus = async () => {
    if (_dropdownCache.projectStatusList) {
      setProjectStatusList(_dropdownCache.projectStatusList);
      return _dropdownCache.projectStatusList;
    }
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectStatus,
        body: { isDropdown: true },
      });
      if (response?.data?.data) setProjectStatusList(response.data.data);
    } catch (error) { console.error(error); }
    return [];
  };

  const getWorkflow = async () => {
    if (_dropdownCache.workflow) {
      setWorkflow(_dropdownCache.workflow);
      return _dropdownCache.workflow;
    }
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
    return [];
  };

  const normalizeDynamicOptions = (module, source = []) => {
    const arr = Array.isArray(source) ? source : [];
    return arr
      .map((item) => {
        if (!item) return null;
        const value = item?._id || item?.id || item?.value;
        if (!value) return null;
        if (module === "employees" || module === "managers" || module === "account_managers") {
          return { value, label: removeTitle(item?.full_name || item?.manager_name || item?.name || "") };
        }
        if (module === "clients") {
          return { value, label: item?.company_name || item?.full_name || item?.name || "" };
        }
        if (module === "projects") {
          return { value, label: item?.title || item?.name || "" };
        }
        if (module === "project_types") {
          return { value, label: item?.project_type || item?.title || item?.name || "" };
        }
        if (module === "project_statuses") {
          return { value, label: item?.title || item?.name || "" };
        }
        if (module === "workflows") {
          return { value, label: item?.project_workflow || item?.title || item?.name || "" };
        }
        if (module === "departments") {
          return { value, label: item?.project_tech || item?.department_name || item?.name || "" };
        }
        return { value, label: item?.label || item?.title || item?.name || String(value) };
      })
      .filter((item) => item?.value && item?.label);
  };

  const loadLinkedOptionsForField = async (field) => {
    const key = String(field?.key || "").trim();
    const module = field?.linkedModule;
    if (!key || !module) return;
    if (Array.isArray(linkedOptionsByField[key]) && linkedOptionsByField[key].length > 0) return;

    try {
      let source = [];
      if (module === "employees") {
        source = projectAssigneesList.length > 0 ? projectAssigneesList : await getProjectassignees();
      } else if (module === "clients") {
        source = projectClientList.length > 0 ? projectClientList : await getProjectClients();
      } else if (module === "projects") {
        const res = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectdetails,
          body: { isDropdown: true, limit: 5000 },
        });
        source = Array.isArray(res?.data?.data) ? res.data.data : [];
      } else if (module === "project_types") {
        source = projectTypeList.length > 0 ? projectTypeList : await getProjectType();
      } else if (module === "project_statuses") {
        source = projectStatusList.length > 0 ? projectStatusList : await getStatus();
      } else if (module === "workflows") {
        source = workflow.length > 0 ? workflow : await getWorkflow();
      } else if (module === "departments") {
        source = technologyList.length > 0 ? technologyList : await getTechnologyList();
      } else if (module === "managers") {
        source = projectManagerList.length > 0 ? projectManagerList : await getManager();
      } else if (module === "account_managers") {
        source = accountManagerList.length > 0 ? accountManagerList : await getAccountManager();
      }

      setLinkedOptionsByField((prev) => ({
        ...prev,
        [key]: normalizeDynamicOptions(module, source),
      }));
    } catch (error) {
      setLinkedOptionsByField((prev) => ({ ...prev, [key]: [] }));
    }
  };

  const renderCustomFieldControl = (field) => {
    const key = String(field?.key || "").trim();
    const type = field?.type || "text";
    const isSelectType = type === "select" || type === "multiselect";

    if (type === "textarea") return <Input.TextArea rows={3} placeholder={field?.label || key} />;
    if (type === "number") return <Input type="number" placeholder={field?.label || key} />;
    if (type === "date" || type === "datetime") {
      return <DatePicker className="pfm-datepicker" style={{ width: "100%" }} format={type === "date" ? "DD/MM/YYYY" : "DD/MM/YYYY HH:mm"} showTime={type === "datetime"} />;
    }
    if (type === "checkbox") return <Checkbox>{field?.label || key}</Checkbox>;
    if (type === "file") return <Input placeholder="File upload URL / value" />;
    if (isSelectType) {
      const options =
        field?.optionSource === "linked"
          ? linkedOptionsByField[key] || []
          : (field?.options || []).map((option) => ({ value: option, label: option }));
      return (
        <Select
          mode={type === "multiselect" ? "multiple" : undefined}
          placeholder={field?.label || key}
          options={options}
          onDropdownVisibleChange={(open) => {
            if (open && field?.optionSource === "linked") loadLinkedOptionsForField(field);
          }}
        />
      );
    }
    return <Input placeholder={field?.label || key} />;
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

  const handleProjectTech = (values = []) => {
    setProjectTech(Array.isArray(values) ? values : []);
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
    if (roleType === "assignee") return undefined;
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
        const current = form.getFieldValue("technology") || [];
        const nextTechnologyIds = [...new Set([...current, createdDepartment._id])];
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
      if (resData?.status === 0) {
        return message.error(resData?.message || "Unable to add employee");
      }
      message.success(resData?.message || "Employee added successfully");
      if (employeeModalType === "account_manager") {
        const nextAccountManagers = await getAccountManager();
        const found = nextAccountManagers.find(
          (item) =>
            item?._id === createdEmployee?._id ||
            item?.email?.trim()?.toLowerCase() === values.email?.trim()?.toLowerCase()
        );
        if (found?._id) form.setFieldValue("acc_manager", found._id);
      } else if (employeeModalType === "assignee") {
        const nextAssignees = await getProjectassignees();
        const found = nextAssignees.find(
          (item) =>
            item?._id === createdEmployee?._id ||
            item?.email?.trim()?.toLowerCase() === values.email?.trim()?.toLowerCase()
        );
        if (found?._id) {
          setSelectedItems((prev) =>
            prev.some((item) => item?._id === found._id) ? prev : [...prev, found]
          );
        }
      } else {
        const nextManagers = await getManager();
        const found = nextManagers.find(
          (item) =>
            item?._id === createdEmployee?._id ||
            item?.email?.trim()?.toLowerCase() === values.email?.trim()?.toLowerCase()
        );
        if (found?._id) form.setFieldValue("manager", found._id);
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

  const getProjectTypeIdByName = (name) => projectTypeList.find((t) => t.project_type === name);
  const getProjectStatusIdByName = (name) => projectStatusList.find((s) => s.title === name);
  const getManagerIdByName = (name) => projectManagerList.find((m) => m.manager_name === name);
  const getWorkflowIdByName = (name) => workflow.find((w) => w.project_workflow === name);

  const addProjectDetails = async (values) => {
    try {
      setIsSubmitting(true);
      dispatch(showAuthLoader());
      const assignees = Array.isArray(values?.assignees) ? values.assignees : [];
      const clients = Array.isArray(values?.pms_clients) ? values.pms_clients : [];
      const custom_fields = values?.custom_fields || {};
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
        descriptions: values?.descriptions || "",
        technology: values.technology,
        isBillable: Boolean(values?.isBillable),
        recurringType: values?.recurringType || "",
        custom_fields,
      };
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
        await emitEvent(socketEvents.ADD_PROJECT_ASSIGNEE, response.data.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
      triggerRefreshList();
    }
  };

  const editProjectdetails = async (id, values) => {
    try {
      setIsSubmitting(true);
      dispatch(showAuthLoader());
      const assignees = Array.isArray(values?.assignees) ? values.assignees : [];
      const clients = Array.isArray(values?.pms_clients) ? values.pms_clients : [];
      const custom_fields = values?.custom_fields || {};
      const reqBody = {
        ...values,
        descriptions: values?.descriptions || "",
        assignees,
        pms_clients: clients,
        technology: values.technology,
        project_type: values.project_type,
        project_status: values?.project_status,
        manager: values.manager,
        acc_manager: values.acc_manager,
        workFlow: values.workFlow,
        recurringType: values?.recurringType,
        end_date: values?.end_date || null,
        custom_fields,
      };
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateProjectdetails + `/${id}`,
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
          (aid) => !newFilteredAssignees.some((user) => user._id === aid)
        );
        let filterClients = clients.filter(
          (cid) => !newFilteredClients.some((user) => user._id === cid)
        );
        await emitEvent(socketEvents.EDIT_PROJECT_ASSIGNEE, {
          _id: id,
          manager: values.manager,
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
      setIsSubmitting(false);
      triggerRefreshList();
    }
  };

  const visibleConfiguredFields = useMemo(
    () =>
      (projectFormFields || [])
        .filter((field) => field?.key && !BACKEND_ONLY_PROJECT_KEYS.has(String(field.key).trim()))
        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0)),
    [projectFormFields]
  );

  useEffect(() => {
    if (!isModalOpen) return;
    const linkedFields = (visibleConfiguredFields || []).filter(
      (field) =>
        (field?.type === "select" || field?.type === "multiselect") &&
        field?.optionSource === "linked" &&
        field?.linkedModule
    );
    if (!linkedFields.length) return;
    linkedFields.forEach((field) => {
      loadLinkedOptionsForField(field);
    });
  }, [isModalOpen, visibleConfiguredFields]);

  const renderConfiguredField = (field) => {
    const key = String(field?.key || "").trim();
    const requiredRules = field?.required
      ? [{ required: true, message: `${field?.label || key} is required` }]
      : [];

    const departmentOptions = (technologyList || []).map((item) => ({
      value: item?._id,
      label: item?.project_tech,
    }));
    const projectTypeOptions = (projectTypeList || []).map((item) => ({
      value: item?._id,
      label: item?.project_type,
    }));
    const clientOptions = (projectClientList || []).map((item) => ({
      value: item?._id,
      label: item?.company_name || item?.full_name,
    }));
    const assigneeOptions = (projectAssigneesList || []).map((item) => ({
      value: item?._id,
      label: removeTitle(item?.full_name || item?.manager_name || ""),
    }));
    const managerOptions = (projectManagerList || []).map((item) => ({
      value: item?._id,
      label: removeTitle(item?.manager_name || item?.full_name || ""),
    }));
    const accountManagerOptions = (accountManagerList || []).map((item) => ({
      value: item?._id,
      label: removeTitle(item?.full_name || ""),
    }));
    const workflowOptions = (workflow || []).map((item) => ({
      value: item?._id,
      label: item?.project_workflow,
    }));
    const statusOptions = (projectStatusList || []).map((item) => ({
      value: item?._id,
      label: item?.title,
    }));

    if (key === "title") {
      return <Form.Item name="title" className="pfm-form-item" rules={requiredRules}><Input placeholder="Please enter project title" className="pfm-input" bordered={false} /></Form.Item>;
    }
    if (key === "descriptions") {
      return (
        <Form.Item name="descriptions" className="pfm-form-item" rules={requiredRules}>
          <div className="pfm-editor-wrapper">
            <CKEditor
              editor={Custombuild}
              data={form.getFieldValue("descriptions") || ""}
              config={{
                toolbar: [
                  "bold",
                  "italic",
                  "underline",
                  "|",
                  "fontColor",
                  "fontBackgroundColor",
                  "|",
                  "link",
                  "|",
                  "numberedList",
                  "bulletedList",
                  "|",
                  "alignment:left",
                  "alignment:center",
                  "alignment:right",
                  "|",
                  "fontSize",
                ],
                removePlugins: ["MediaEmbed", "ImageUpload", "EasyImage", "CKFinderUploadAdapter"],
              }}
              onChange={(event, editor) => {
                form.setFieldValue("descriptions", editor.getData());
              }}
            />
          </div>
        </Form.Item>
      );
    }
    if (key === "start_date" || key === "end_date") {
      return <Form.Item name={key} className="pfm-form-item" rules={requiredRules}><DatePicker className="pfm-datepicker" style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item>;
    }
    if (key === "technology") {
      return <Form.Item name="technology" className="pfm-form-item" rules={requiredRules}><Select mode="multiple" options={departmentOptions} placeholder="Select department" /></Form.Item>;
    }
    if (key === "project_type") {
      return <Form.Item name="project_type" className="pfm-form-item" rules={requiredRules}><Select options={projectTypeOptions} placeholder="Select category" /></Form.Item>;
    }
    if (key === "pms_clients") {
      return <Form.Item name="pms_clients" className="pfm-form-item" rules={requiredRules}><Select mode="multiple" options={clientOptions} placeholder="Select client" /></Form.Item>;
    }
    if (key === "assignees") {
      return <Form.Item name="assignees" className="pfm-form-item" rules={requiredRules}><Select mode="multiple" options={assigneeOptions} placeholder="Select assignees" /></Form.Item>;
    }
    if (key === "manager") {
      return <Form.Item name="manager" className="pfm-form-item" rules={requiredRules}><Select options={managerOptions} placeholder="Select project manager" /></Form.Item>;
    }
    if (key === "acc_manager") {
      return <Form.Item name="acc_manager" className="pfm-form-item" rules={requiredRules}><Select options={accountManagerOptions} placeholder="Select account manager" /></Form.Item>;
    }
    if (key === "workFlow") {
      return <Form.Item name="workFlow" className="pfm-form-item" rules={requiredRules}><Select options={workflowOptions} placeholder="Select workflow" /></Form.Item>;
    }
    if (key === "project_status") {
      return <Form.Item name="project_status" className="pfm-form-item" rules={requiredRules}><Select options={statusOptions} placeholder="Select status" /></Form.Item>;
    }
    if (key === "estimatedHours") {
      return <Form.Item name="estimatedHours" className="pfm-form-item" rules={requiredRules}><Input type="number" min={0} placeholder="Enter estimated hours" /></Form.Item>;
    }
    if (key === "recurringType") {
      const recurringOptions = (field?.options?.length ? field.options : ["monthly", "yearly"]).map((item) => ({ value: item, label: item[0]?.toUpperCase() + item.slice(1) }));
      return <Form.Item name="recurringType" className="pfm-form-item" rules={requiredRules}><Select allowClear options={recurringOptions} placeholder="Select recurring type" /></Form.Item>;
    }
    if (key === "isBillable") {
      return <Form.Item name="isBillable" className="pfm-form-item" valuePropName="checked"><Checkbox>Yes</Checkbox></Form.Item>;
    }
    return (
      <Form.Item name={["custom_fields", key]} className="pfm-form-item" rules={requiredRules}>
        {renderCustomFieldControl(field)}
      </Form.Item>
    );
  };

  const isEdit = modalMode !== "add";
  const useDynamicProjectForm = true;

  if (useDynamicProjectForm) {
    return (
<Modal
  open={isModalOpen}
  onCancel={handleCancel}
  width={700}
  className="pfm-modal"
  destroyOnClose
  title={
    <div className="modal-title">
      <h2>
        {isEdit ? "Update Project Details" : "Add Project Details"}
      </h2>
    </div>
  }
  footer={[
    <Button
      type="secondry"
      key="cancel"
      onClick={handleCancel}
      className="delete-btn"
    >
      Cancel
    </Button>,
    <Button
      key="submit"
      type="primary"
      loading={isSubmitting}
      onClick={() => form.submit()}
      className="pfm-submit-btn"
    >
      {isEdit ? "Update" : "Save"}
    </Button>,
  ]}
>
  <Spin spinning={isLoading}>
    <Form
      form={form}
      layout="vertical"
      onFinish={(values) =>
        isEdit
          ? editProjectdetails(selectedProject?._id, values)
          : addProjectDetails(values)
      }
    >
      <Row gutter={[16, 16]}>
        
        <Col xs={24}>
          <div className="pfm-fields-grid">
            {visibleConfiguredFields.map((field) => (
              <div
                key={field.key}
                className="pfm-field-row"
                style={
                  String(field?.key || "").trim() === "descriptions"
                    ? { gridColumn: "1 / -1" }
                    : undefined
                }
              >
                <TagOutlined className="pfm-icon" />

                <div className="pfm-input-group">
                  <div className="pfm-field-label">
                    {field?.required ? "* " : ""}
                    {field?.label || field?.key}
                  </div>

                  {renderConfiguredField(field)}
                </div>
              </div>
            ))}
          </div>
        </Col>

      </Row>
    </Form>
  </Spin>
</Modal>
    );
  }

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
        
        </div>

        <Spin spinning={isLoading}>
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
          <div className="pfm-input-group">
            <div className="pfm-field-label pfm-field-label--required">Project Title</div>
            <Form.Item
              name="title"
              className="pfm-form-item"
              rules={[
                { required: true, whitespace: true, message: "Please enter a valid title" },
              ]}
            >
              <Input
                placeholder="Please enter project title"
                className="pfm-input"
                bordered={false}
              />
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Description */}
        <div className="pfm-field-row pfm-field-row--top">
          <MessageOutlined className="pfm-icon" />
          <div className="pfm-input-group pfm-input-group--align-top">
            <div className="pfm-field-label">Description</div>
            <Form.Item
              name="descriptions"
              className="pfm-form-item"
            >
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
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Dates */}
        <div className="pfm-dates-row">
          <div className="pfm-date-col">
            <CalendarOutlined className="pfm-icon" />
            <div className="pfm-input-group">
              <div className="pfm-field-label">Start Date</div>
              <Form.Item
                name="start_date"
                className="pfm-form-item"
                rules={[{ required: true, message: "Please select a start date" }]}
              >
                <DatePicker
                  placeholder="Select start date"
                  className="pfm-datepicker"
                  bordered={false}
                  format="DD/MM/YYYY"
                  onChange={() => form.setFieldValue("end_date", "")}
                />
              </Form.Item>
            </div>
          </div>
          <div className="pfm-date-divider" />
          <div className="pfm-date-col">
            <CalendarOutlined className="pfm-icon" />
            <div className="pfm-input-group">
              <div className="pfm-field-label">End Date</div>
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
                  placeholder="Select end date"
                  className="pfm-datepicker"
                  bordered={false}
                  format="DD/MM/YYYY"
                  disabled={noEndDate}
                  disabledDate={(v) => v < form.getFieldValue("start_date")}
                />
              </Form.Item>
            </div>
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

          {/* ── 2-col grid ── */}
          <div className="pfm-fields-grid">

        {/* Department (Technology) */}
        <div className="pfm-field-row">
          <AppstoreOutlined className="pfm-icon" />
          <div className="pfm-input-group">
            <div className="pfm-field-label-row">
              <div className="pfm-field-label">Department</div>
              <button type="button" className="pfm-add-new-btn" onClick={openAddDepartmentModal}>
                <PlusOutlined /> Add New
              </button>
            </div>
            <Form.Item
              name="technology"
              className="pfm-form-item"
              rules={[{ required: true, message: "Please select a department" }]}
            >
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
              >
                {technologyList.map((item) => (
                  <Select.Option key={item._id} value={item._id}>
                    {item.project_tech}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Category */}
        <div className="pfm-field-row">
          <TagOutlined className="pfm-icon" />
          <div className="pfm-input-group">
            <div className="pfm-field-label">Category</div>
            <Form.Item
              name="project_type"
              className="pfm-form-item"
              rules={[{ required: true, message: "Please select a category" }]}
            >
              <Select
                placeholder="Select category"
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
        </div>
        <div className="pfm-divider" />

        {/* Client */}
        <div className="pfm-field-row">
          <UserOutlined className="pfm-icon" />
          <div className="pfm-input-group">
            <div className="pfm-field-label-row">
              <div className="pfm-field-label">Client</div>
              <button type="button" className="pfm-add-new-btn" onClick={openAddClientModal}>
                <PlusOutlined /> Add New
              </button>
            </div>
            <Form.Item name="client" className="pfm-form-item">
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
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Assignees */}
        <div className="pfm-field-row">
          <UsergroupAddOutlined className="pfm-icon" />
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
            <Form.Item name="assignees" className="pfm-form-item">
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
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Project Manager */}
        <div className="pfm-field-row">
          <UserOutlined className="pfm-icon" />
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
            <Form.Item
              name="manager"
              className="pfm-form-item"
              rules={[{ required: true, message: "Please select a project manager" }]}
            >
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
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Account Manager */}
        <div className="pfm-field-row">
          <UserOutlined className="pfm-icon" />
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
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Workflow */}
        <div className="pfm-field-row">
          <ApartmentOutlined className="pfm-icon" />
          <div className="pfm-input-group">
            <div className="pfm-field-label">Associate Workflow</div>
            <Form.Item
              name="workFlow"
              className="pfm-form-item"
              initialValue={workflow.find((w) => w.isDefault)?._id}
              rules={[{ required: true, message: "Please select a workflow" }]}
            >
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
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Status */}
        <div className="pfm-field-row">
          <CheckCircleOutlined className="pfm-icon" />
          <div className="pfm-input-group">
            <div className="pfm-field-label">Status</div>
            <Form.Item name="project_status" className="pfm-form-item">
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
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Estimated Hours */}
        <div className="pfm-field-row">
          <ClockCircleOutlined className="pfm-icon" />
          <div className="pfm-input-group">
            <div className="pfm-field-label">Estimated Hours</div>
            <Form.Item
              name="estimatedHours"
              className="pfm-form-item"
              rules={[{ required: true, message: "Please provide estimated hours" }]}
            >
              <Input
                placeholder="Enter estimated hours"
                className="pfm-input"
                bordered={false}
                disabled={modalMode !== "add" ? !getRoles(["Admin"]) : false}
                type="number"
                min={0}
              />
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Recurring */}
        <div className="pfm-field-row">
          <SyncOutlined className="pfm-icon" />
          <div className="pfm-input-group">
            <div className="pfm-field-label">Recurring</div>
            <Form.Item name="recurringType" className="pfm-form-item">
              <Select
                placeholder="Select recurring type"
                bordered={false}
                className="pfm-select"
                allowClear
              >
                <Select.Option value="monthly">Monthly</Select.Option>
                <Select.Option value="yearly">Yearly</Select.Option>
              </Select>
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

        {/* Billable */}
        <div className="pfm-field-row pfm-field-row--checkbox">
          <DollarOutlined className="pfm-icon" />
          <div className="pfm-input-group">
            <div className="pfm-field-label">Billable Project</div>
            <Form.Item name="isBillable" className="pfm-form-item" valuePropName="checked">
              <Checkbox onChange={handleBillable}>
                Yes
              </Checkbox>
            </Form.Item>
          </div>
        </div>
        <div className="pfm-divider" />

          </div>{/* end pfm-fields-grid */}

        {visibleCustomFields.length > 0 ? (
          <>
            <div className="pfm-divider" />
            <div className="pfm-fields-grid">
              {visibleCustomFields.map((field) => (
                <div className="pfm-field-row" key={field.key}>
                  <TagOutlined className="pfm-icon" />
                  <div className="pfm-input-group">
                    <div className="pfm-field-label">
                      {field?.required ? "* " : ""}
                      {field?.label || field?.key}
                    </div>
                    <Form.Item
                      name={["custom_fields", field.key]}
                      className="pfm-form-item"
                      rules={
                        field?.required
                          ? [{ required: true, message: `${field?.label || field?.key} is required` }]
                          : []
                      }
                    >
                      {renderCustomFieldControl(field)}
                    </Form.Item>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {/* Footer buttons */}
        <div className="pfm-footer">
          <Button className="delete-btn" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" className="add-btn" loading={isSubmitting}>
            {isEdit ? "Update" : "Save"}
          </Button>
        </div>
      </Form>
      </Spin>
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
  onOk={() => clientCreateForm.submit()}
  confirmLoading={isSavingClient}
  okText="Add"
  cancelText="Cancel"
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
        onCancel={() => { setIsAddEmployeeOpen(false); employeeCreateForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setIsAddEmployeeOpen(false); employeeCreateForm.resetFields(); }}>Cancel</Button>,
          <Button key="submit" type="primary" loading={isSavingEmployee} onClick={() => employeeCreateForm.submit()}>Add</Button>,
        ]}
      >
        <Form form={employeeCreateForm} layout="vertical" initialValues={{ isActivate: true }} onFinish={handleCreateEmployee}>
          <Form.Item
            name="first_name"
            label="First Name"
            rules={[
              { required: true, whitespace: true, message: "First name is required" },
              { min: 2, message: "Minimum 2 characters" },
              { max: 50, message: "Cannot exceed 50 characters" },
              { pattern: /^[a-zA-Z ]+$/, message: "Only letters allowed" },
            ]}
          >
            <Input placeholder="Enter first name" maxLength={50} />
          </Form.Item>
          <Form.Item
            name="last_name"
            label="Last Name"
            rules={[
              { required: true, whitespace: true, message: "Last name is required" },
              { min: 2, message: "Minimum 2 characters" },
              { max: 50, message: "Cannot exceed 50 characters" },
              { pattern: /^[a-zA-Z ]+$/, message: "Only letters allowed" },
            ]}
          >
            <Input placeholder="Enter last name" maxLength={50} />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email address" },
              { max: 100, message: "Email cannot exceed 100 characters" },
            ]}
          >
            <Input placeholder="Enter email" maxLength={100} />
          </Form.Item>
          <Form.Item name="pmsRoleId" label="Role" rules={[{ required: true, message: "Please select a role" }]}>
            <Select placeholder="Select role" loading={rolesLoading} showSearch>
              {roles.map((role) => (
                <Select.Option key={role._id} value={role._id}>{role.role_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Password is required" },
              { min: 8, message: "Password must be at least 8 characters" },
              { max: 64, message: "Password cannot exceed 64 characters" },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: "Must have uppercase, lowercase and a number",
              },
            ]}
          >
            <Input.Password placeholder="Enter password" autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="isActivate" label="Status" rules={[{ required: true, message: "Status is required" }]}>
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
