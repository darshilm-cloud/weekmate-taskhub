import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Form,
  Select,
  Modal,
  Input,
  Popover,
  Checkbox,
  Radio,
  Table,
  message,
  Popconfirm,
  Row,
  Col,
  DatePicker,
  Space,
  Drawer,
} from "antd";
import {
  CheckSquareOutlined,
  DeleteTwoTone,
  EditTwoTone,
  PlusOutlined,
} from "@ant-design/icons";
import Service from "../../service";
import dayjs from "dayjs";

import moment from "moment";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import "./AssignProject.css";
import { useParams, useHistory } from "react-router-dom";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import { getRoles, hasPermission } from "../../util/hasPermission";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import Custombuild from "ckeditor5-custom-build/build/ckeditor";
import MyAvatar from "../Avatar/MyAvatar";
import MyAvatarGroup from "../AvatarGroup/MyAvatarGroup";
import MultiSelect from "../CustomSelect/MultiSelect";
import { removeTitle } from "../../util/nameFilter";
import { generateCacheKey } from "../../util/generateCacheKey";

function AssignProject() {
  const companySlug = localStorage.getItem("companyDomain");

  const [form] = Form.useForm();
  const { editProjectId } = useParams();
  const { emitEvent } = useSocketAction();
  const { Option } = Select;
  const dispatch = useDispatch();
  const Search = Input.Search;
  const [formData] = Form.useForm();
  const history = useHistory();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 30,
  });
  const searchRef = useRef();
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sortColumn] = useState("_id");
  const [sortOrder] = useState("des");
  const [modalMode, setModalMode] = useState("add");
  const [columnDetails, setColumnDetails] = useState([]);
  const [filterData, setFilterData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, setData] = useState([]);
  const [technologyList, setTechnologyList] = useState([]);
  const [projectTech, setProjectTech] = useState([]);
  const [projectTypeList, setProjectTypeList] = useState([]);
  const [projectStatusList, setProjectStatusList] = useState([]);
  const [workflow, setWorkflow] = useState([]);
  const [projectManagerList, setProjectManagerList] = useState([]);
  const [accountManagerList, setAccountManagerList] = useState([]);
  const [projectAssigneesList, setProjectAssigneesList] = useState([]);

  //UseState to store exist data:
  const [newFilteredAssignees, setNewFilteredAssignees] = useState([]);
  const [newFilteredClients, setNewFilteredClients] = useState([]);
  const [projectClientList, setProjectClientList] = useState([]);
  const [selectedClient, setSelectedClient] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editorData, setEditorData] = useState("");
  const [projectTypeSlug, setProjectTypeSlug] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

  //filters
  const [status, setStatus] = useState([]);
  const [manager, setManager] = useState([]);
  const [acc_manager, setAccManager] = useState([]);
  const [technology, setTechnology] = useState([]);
  const [projectType, setProjectType] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [sortOption, setSortOption] = useState("createdAt");
  const [projectTypeselect, setProjectTypeselect] = useState("");
  const [popOver, setPopOver] = useState({
    status: false,
    manager: false,
    technology: false,
    type: false,
    assignees: false,
    sortBy: false,
    acc_manager: false,
  });
  const [searchKeyword, setSearchKeyword] = useState("");




  const handleSearch = (searchValue) => {
    setSearchKeyword(searchValue);
  };

  const handleSortFilter = (val) => {
    setSortOption(val);
  };

  const handleSelectedItemsChange = (selectedItemIds) => {
    setSelectedItems(
      projectAssigneesList.filter((item) => selectedItemIds.includes(item._id))
    );
    setSearchKeyword("");
  };

  const handleChange = (event, editor) => {
    const data = editor.getData();
    setEditorData(data);
  };

  const handlePaste = (event, editor) => {
    const pastedData = (event.clipboardData || window.clipboardData).getData(
      "text"
    );
    const newData = pastedData.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank">$1</a>'
    );
    editor.setData(newData);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setShowEditor(!showEditor);
    form.resetFields();
    if (editProjectId) {
      history.push(`/${companySlug}/project/app/${editProjectId}`);
    }
  };

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const resetSearchFilter = (e) => {
    const keyCode = e && e.keyCode ? e.keyCode : e;
    switch (keyCode) {
      case 8:
        if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
          searchRef.current.state.value = "";
          setSearchText("");
          setSearchEnabled(false);
        }
        break;
      case 46:
        if (searchRef.current.state?.value?.length <= 1 && seachEnabled) {
          searchRef.current.state.value = "";
          setSearchText("");
          setSearchEnabled(false);
        }
        break;
      default:
        break;
    }
  };

  // This function returns the customized pagination text
  const showTotal = (total) => `Total Records Count is ${total}`;

  function removeHTMLTags(inputText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(inputText, "text/html");
    return doc.body.textContent || "";
  }

  // open modal and calling getlisting api
  const showModal = async (id) => {
    formData.resetFields();
    try {
      dispatch(showAuthLoader());
      let Key = generateCacheKey("project", { _id: id });

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: { _id: id },
        options: {
          cachekey: Key,
        },
      });

      dispatch(hideAuthLoader());
      if (response.data.statusCode == 401) {
        window.location.href = `${process.env.REACT_APP_URL}unauthorised`;
      }
      if (response.data && response.data.data) {
        const projectDetails = response.data.data;

        setData(projectDetails);
        setIsModalOpen(true);

        setSelectedItems(projectDetails?.assignees);
        setSelectedClient(projectDetails?.pms_clients);
        setNewFilteredAssignees(projectDetails?.assignees);
        setNewFilteredClients(projectDetails?.pms_clients);
        setEditorData(
          projectDetails?.descriptions ? projectDetails?.descriptions : ""
        );

        form.setFieldsValue({
          title: projectDetails?.title?.trim(),
          technology: projectDetails?.technology.map((item) => item?._id),
          project_type: projectDetails?.project_type?._id,
          descriptions: removeHTMLTags(
            projectDetails?.descriptions ? projectDetails?.descriptions : ""
          ),
          workFlow: projectDetails?.workFlow?._id,
          manager: projectDetails?.manager?._id,
          acc_manager: projectDetails?.acc_manager?._id,
          estimatedHours: projectDetails?.estimatedHours,
          project_status: projectDetails?.project_status?._id,
          start_date: projectDetails?.start_date
            ? dayjs(projectDetails.start_date)
            : null,
          end_date: projectDetails?.end_date
            ? dayjs(projectDetails.end_date)
            : null,
        });
        getProjectassignees();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteProject = async (id) => {
    try {
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteProjectdetails + params,
      });
      if (response.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        const isLastItemOnPage =
          columnDetails.length === 1 && pagination.current > 1;
        if (isLastItemOnPage) {
          setPagination((prevPagination) => ({
            ...prevPagination,
            current: prevPagination.current - 1,
          }));
        }
        getProjectListing();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text, record) => {
        const Title = record?.title;
        const ProjectId = record?._id;
        const title = record?.title;
        const formattedTitle = title?.replace(
          /(?:^|\s)([a-z])/g,
          function (match, group1) {
            return match?.charAt(0) + group1?.toUpperCase();
          }
        );

        return (
          <Link to={ `/${companySlug}/project/app/${ProjectId}?tab=${record?.defaultTab?.name}` }>
            <div className="project_title_main_div">
              <span>{ formattedTitle }</span>
            </div>
          </Link>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 200,
      render: (_, record) => {
        let startDate = "";
        let endDate = "";

        if (moment(record?.start_date).isValid()) {
          startDate = moment(record?.start_date).format("DD MMM YY");
        }

        if (moment(record?.end_date).isValid()) {
          endDate = moment(record?.end_date).format("DD MMM YY");
        }

        return (
          <span style={ { textTransform: "capitalize" } }>
            { startDate } - { endDate }
          </span>
        );
      },
    },
    {
      title: "AM",
      dataIndex: "acc_manager",
      key: "acc_manager",
      width: 100,
      render: (text, record) => {
        return (
          <div className="avtar-group">
            { record?.acc_manager ? (
              <MyAvatar
                userName={ record?.acc_manager?.full_name || "-" }
                src={ record?.acc_manager?.emp_img }
                key={ record?.acc_manager?._id }
                alt={ record?.acc_manager?.full_name }
              />
            ) : (
              " - "
            ) }
          </div>
        );
      },
    },
    {
      title: "PM",
      dataIndex: "manager",
      key: "manager",
      width: 100,
      render: (text, record) => {
        return (
          <div className="avtar-group">
            { record?.manager ? (
              <MyAvatar
                userName={ record?.manager?.full_name || "-" }
                src={ record?.manager?.emp_img }
                key={ record?.manager?._id }
                alt={ record?.manager?.full_name }
              />
            ) : (
              " - "
            ) }
          </div>
        );
      },
    },
    {
      title: "Assignees",
      dataIndex: "assignees",
      key: "assignees",
      width: 150,
      render: (text, record) => {
        return (
          <div className="avtar-group">
            <MyAvatarGroup
              record={ record?.assignees }
              maxPopoverTrigger={ "click" }
            />
          </div>
        );
      },
    },
  ];

  if (hasPermission(["project_edit"])) {
    columns.push({
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      width: 100,
      render: (text, record) => {
        const content = (
          <div className="project-edit-btn-wrapper">
            { hasPermission(["project_edit"]) && (
              <>
                <div
                  onClick={ () => {
                    showModal(record._id);
                    setModalMode("Edit");
                  } }
                  style={ { cursor: "pointer" } }
                >
                  <EditTwoTone twoToneColor="green" />
                  Edit
                </div>
              </>
            ) }
            { hasPermission(["project_delete"]) && (
              <Popconfirm
                title="Do you want to delete?"
                okText="Yes"
                cancelText="No"
                onConfirm={ () => deleteProject(record?._id) }
              >
                <div className="ant-delete" style={ { cursor: "pointer" } }>
                  <DeleteTwoTone twoToneColor="red" />
                  Delete
                </div>
              </Popconfirm>
            ) }
          </div>
        );

        return (
          <div className="edit-delete">
            <Popover arrow={false} content={ content } trigger="click" placement="left">
              <i className="fa-solid fa-ellipsis-vertical"></i>
            </Popover>
          </div>
        );
      },
    });
  }

  const onChange = (date, dateString) => {
    console.log(date, dateString);
  };

  //clear assignees
  const handleClearAssignees = () => {
    setSelectedItems([]);
  };

  // clients
  const handleClearClient = () => {
    setSelectedClient([]);
  };

  useEffect(() => {
    getTechnologyList();
    getProjectType();
    getStatus();
    getProjectassignees();
    getProjectClients(); //clients
    getManager();
    getAccountManager();
    getWorkflow();
    getProjectTypeSlug();
  }, []);

  useEffect(() => {
    if (editProjectId) {
      showModal(editProjectId);
      setModalMode("Edit");
    }
  }, []);

  const handleProjectTech = (val) => {
    setProjectTech(val);
  };

  const handleClients = (val) => {
    setSelectedClient(
      projectClientList.filter((item) => val.includes(item._id))
    );
    setSearchKeyword("");
  };

  const [searchAssignees, setsearchAssignees] = useState("");
  const [searchManager, setsearchManager] = useState("");
  const [searchAccManager, setsearchAccManager] = useState("");
  const [searchTechnology, setsearchTechnology] = useState("");

  // Function to handle search term change
  const handleSearchTermAssignees = (e) => {
    setsearchAssignees(e.target.value);
  };

  const handleSearchManager = (e) => {
    setsearchManager(e.target.value);
  };
  const handleSearchAccManager = (e) => {
    setsearchManager(e.target.value);
  };

  const handleSearchTechnology = (e) => {
    setsearchTechnology(e.target.value);
  };

  // Function to filter technology list based on search term
  const filteredTechnologyList = technologyList.filter((item) =>
    item?.project_tech?.toLowerCase()?.includes(searchTechnology?.toLowerCase())
  );

  const filteredManagerList = projectManagerList.filter((item) =>
    item?.manager_name?.toLowerCase()?.includes(searchManager?.toLowerCase())
  );
  const filteredAccManagerList = accountManagerList.filter((item) =>
    item?.full_name?.toLowerCase()?.includes(searchAccManager?.toLowerCase())
  );

  const filteredAssigneesList = projectAssigneesList.filter((item) =>
    item?.full_name?.toLowerCase()?.includes(searchAssignees?.toLowerCase())
  );

  // add the project
  const addProjectDetails = async (values) => {
    try {
      dispatch(showAuthLoader());
      const assignees = selectedItems?.map((item) => item._id) || [];
      const clients = selectedClient?.map((item) => item._id) || []; //clients
      const reqBody = {
        title: values.title.trim(),
        assignees: assignees,
        pms_clients: clients, //clients
        start_date: values.start_date,
        end_date: values.end_date,
        estimatedHours:
          values.estimatedHours && values.estimatedHours != ""
            ? values.estimatedHours
            : "0",
        manager: values.manager,
        acc_manager: values?.acc_manager || "",
        project_status: values.project_status
          ? values.project_status
          : projectStatusList.find(
            (item) => item?.title?.toLowerCase() === "active"
          )?._id,
        workFlow: values.workFlow,
        project_type: values.project_type,
        descriptions: editorData,
        technology: values.technology,
      };
      form.setFieldsValue({
        assignees: assignees,
        clients: clients, //clients
      });

      let moduleprefix = "project";
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectdetails,
        body: reqBody,
        options: {
          moduleprefix,
        },
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        form.resetFields();
        getProjectListing();
        setIsModalOpen(false);
        await emitEvent(socketEvents.ADD_PROJECT_ASSIGNEE, response.data.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log("error----------------------------", error);
    }
  };

  // get tech list
  const getTechnologyList = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        sortBy: "desc",
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectTech,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setTechnologyList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get projecttype list
  const getProjectType = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListing,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectTypeList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get projecttype slug
  const getProjectTypeSlug = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectTypeSLug,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectTypeSlug(response?.data?.data?.slug);
      }
    } catch (error) {
      console.log(error);
    }
  };

  function generatePattern(projectTypeSlug) {
    const patternString = `^SO\\d+\\/(?:${projectTypeSlug})\\/[\\s\\S]+$`;
    return new RegExp(patternString);
  }

  const getProjectClients = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getClients,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectClientList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get project assignees list
  const getProjectassignees = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployees,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectAssigneesList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get manager list
  const getManager = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectManager,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectManagerList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get acc_manager list
  const getAccountManager = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getAccountManager,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setAccountManagerList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get status list
  const getStatus = async () => {
    dispatch(showAuthLoader());
    try {
      const reqBody = {
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectStatus,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectStatusList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get workflow
  const getWorkflow = async () => {
    try {
      const reqBody = {
        isDropdown: "true",
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getworkflow,
        body: reqBody,
      });
      if (response?.data && response?.data?.data && response?.data?.status) {
        setWorkflow(response?.data?.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getProjectListing();
  }, [
    filterData,
    searchText,
    pagination.current,
    pagination.pageSize,
    sortOrder,
    sortColumn,
  ]);

  const getProjectListing = async () => {
    try {
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        sortBy: "desc",
        filterBy: "all",
        sort: sortOption,
      };

      if (status && status.length > 0) {
        reqBody.project_status = status;
      }

      if (manager && manager.length > 0) {
        reqBody.manager_id = manager;
      }

      if (acc_manager && acc_manager.length > 0) {
        reqBody.acc_manager_id = acc_manager;
      }

      if (technology && technology.length > 0) {
        reqBody.technology = technology;
      }

      if (projectType && projectType.length > 0) {
        reqBody.project_type = projectType;
      }

      if (assignees && assignees.length > 0) {
        reqBody.assignee_id = assignees;
      }

      if (searchText && searchText !== "") {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }

      let Key = generateCacheKey("project", reqBody);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: {
          cachekey: Key,
        },
      });

      dispatch(hideAuthLoader());

      if (response?.data && response?.data?.data.length > 0) {
        setColumnDetails(response?.data?.data);

        if (filterData?.isActive == true) {
          setPagination((prevPagination) => ({
            ...prevPagination,
            total: response.data.metadata.total,
          }));
        } else {
          setPagination({
            ...pagination,
            total: response.data.metadata.total,
          });
        }
      } else {
        setColumnDetails([]);
        setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getTechnologyIdByName = (technologyName) => {
    const technology = technologyList.find(
      (tech) => tech.project_tech === technologyName
    );
    return technology;
  };

  const getProjectTypeIdByName = (projectTypeName) => {
    const projectType = projectTypeList.find(
      (type) => type.project_type === projectTypeName
    );
    return projectType;
  };

  const getProjectStatusIdByName = (statusName) => {
    const projectStatus = projectStatusList.find(
      (status) => status.title === statusName
    );
    return projectStatus;
  };

  const getManagerIdByName = (managerName) => {
    const manager = projectManagerList.find(
      (mgr) => mgr.manager_name === managerName
    );
    return manager;
  };

  const getWorkflowIdByName = (workflowName) => {
    const workflow1 = workflow.find(
      (item) => item.project_workflow === workflowName
    );
    return workflow1;
  };

  // edit project
  const editProjectdetails = async (id, values) => {
    try {
      dispatch(showAuthLoader());
      const assignees = Array.from(selectedItems.map((item) => item._id));
      const clients = Array.from(selectedClient.map((item) => item._id));
      const managerId = getManagerIdByName(values.manager);
      const acc_managerId = getManagerIdByName(values?.acc_manager);
      const techId = getTechnologyIdByName(values.technology);
      const typeId = getProjectTypeIdByName(values.project_type);
      const statusId = getProjectStatusIdByName(values.project_status);
      const workflowID = getWorkflowIdByName(values.workFlow);

      const reqBody = {
        ...values,
        descriptions: editorData,
        assignees: assignees,
        pms_clients: clients,
        technology: techId ? techId?._id : values.technology,
        project_type: typeId ? typeId?._id : values.project_type,
        project_status: statusId ? statusId?._id : values?.project_status,
        manager: managerId ? managerId?._id : values.manager,
        acc_manager: acc_managerId ? acc_managerId?._id : values.acc_manager,
        workFlow: workflowID ? workflowID?._id : values.workFlow,
      };

      let moduleprefix = "project";
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateProjectdetails + params,
        body: reqBody,
        options: {
          moduleprefix,
        },
      });
      dispatch(hideAuthLoader());
      if (response.data && response?.data?.data && response?.data?.status) {
        message.success(response?.data?.message);
        setIsModalOpen(false);
        setData(response?.data?.data);
        //Filter new assignees & clients:
        let filterAssignees = assignees.filter(
          (id) => !newFilteredAssignees.some((user) => user._id === id)
        );
        let filterClients = clients.filter(
          (id) => !newFilteredClients.some((user) => user._id === id)
        );

        await emitEvent(socketEvents.EDIT_PROJECT_ASSIGNEE, {
          _id: id,
          manager: managerId ? managerId?._id : values.manager,
          assignees: filterAssignees,
          pms_clients: filterClients,
        });

        if (editProjectId) {
          history.push(`/${companySlug}/project/app/${editProjectId}`);
        }
      } else {
        message.error(response?.data?.message);
      }
      getProjectListing();
      //  else {
      // }
    } catch (error) {
      console.log(error);
    }
  };

  const handleTableChange = (page) => {
    setPagination({ ...pagination, ...page });
  };

  //filters

  const handleFilters = (val, state, setState) => {
    if (val === "") {
      setState([]);
    } else {
      if (state.includes(val._id)) {
        setState(state.filter((id) => id !== val._id));
      } else {
        setState([...state, val._id]);
      }
    }
  };

  const handleVisibleChange = (key, visible) => {
    if (!visible) {
      setPopOver((prevState) => ({
        ...prevState,
        [key]: visible,
      }));
    } else {
      setPopOver((prevState) => ({
        ...prevState,
        [key]: !prevState[key],
      }));
    }
  };
  return (
    <div className="ant-project-task  all-project-main-wrapper">
      <Card>

        <div className="heading-wrapper">
          <div className="heading-main">
            <h2>All Projects</h2>
          </div>
          { hasPermission(["project_add"]) && (
            <Button
              icon={ <PlusOutlined /> }
              type="primary"
              className="square-primary-btn"
              onClick={ () => {
                showModal();
                setModalMode("add");
              } }
            >
              Add Project
            </Button>
          ) }

        </div>


        <div className="global-search">
          <Search
            ref={ searchRef }
            placeholder="Search..."
            onSearch={ onSearch }
            onKeyUp={ resetSearchFilter }
          />
          <div className="filter-btn-wrapper ">
            { getRoles(["Admin"]) && (
              <>
                <Popover
                  trigger="click"
                  placement="bottomRight"
                  open={ popOver.acc_manager }
                  onOpenChange={ (visible) => handleVisibleChange("acc_manager", visible) }
                  content={
                    <div className="assignees-popover assign-global-height">
                      <ul>
                        <li>
                          <Checkbox
                            checked={ acc_manager.length === 0 }
                            onChange={ () => handleFilters("", acc_manager, setAccManager) }
                          >
                            { " " }All
                          </Checkbox>
                        </li>
                      </ul>
                      <div className="search-filter">
                        <Input
                          placeholder="Search"
                          value={ searchAccManager }
                          onChange={ handleSearchAccManager }
                        />
                      </div>
                      <div>
                        <ul className="assigness-data">
                          { filteredAccManagerList.map((item) => (
                            <li key={ item._id }>
                              <Checkbox
                                onChange={ () => {
                                  handleFilters(item, acc_manager, setAccManager);
                                } }
                                checked={ acc_manager.includes(item._id) }
                              >
                                { removeTitle(item?.full_name) }
                              </Checkbox>
                            </li>
                          )) }
                        </ul>
                      </div>
                      <div className="popover-footer-btn">
                        <Button
                          type="primary"
                          className="square-primary-btn ant-btn-primary"
                          onClick={ () => {
                            getProjectListing();
                            setPopOver({ ...popOver, acc_manager: false });
                          } }
                        >
                          Apply
                        </Button>
                        <Button
                          className="square-outline-btn ant-delete"
                          onClick={ () => {
                            setPopOver({ ...popOver, acc_manager: false });
                          } }
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <Button className="dropdown-button">
                    <span className="filter-text">
                      <span>
                        Account Manager:</span>
                      <span>
                        { acc_manager.length === 0 ? "All" : "Selected" }
                      </span>

                    </span>
                  </Button>
                </Popover>


                <Popover
                  trigger="click"
                  placement="bottomRight"
                  open={ popOver.manager }
                  onOpenChange={ (visible) => handleVisibleChange("manager", visible) }
                  content={
                    <div className="assignees-popover assign-global-height">
                      <ul>
                        <li>
                          <Checkbox
                            checked={ manager.length === 0 }
                            onChange={ () => handleFilters("", manager, setManager) }
                          >
                            { " " }All
                          </Checkbox>
                        </li>
                      </ul>
                      <div className="search-filter">
                        <Input
                          placeholder="Search"
                          value={ searchManager }
                          onChange={ handleSearchManager }
                        />
                      </div>
                      <div>
                        <ul className="assigness-data">
                          { filteredManagerList.map((item) => (
                            <li key={ item._id }>
                              <Checkbox
                                onChange={ () => handleFilters(item, manager, setManager) }
                                checked={ manager.includes(item._id) }
                              >
                                { removeTitle(item.manager_name) }
                              </Checkbox>
                            </li>
                          )) }
                        </ul>
                      </div>
                      <div className="popover-footer-btn">
                        <Button
                          type="primary"
                          className="square-primary-btn ant-btn-primary"
                          onClick={ () => {
                            getProjectListing();
                            setPopOver({ ...popOver, manager: false });
                          } }
                        >
                          Apply
                        </Button>
                        <Button
                          className="square-outline-btn ant-delete"
                          onClick={ () => {
                            setPopOver({ ...popOver, manager: false });
                          } }
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <Button className="dropdown-button">
                    <span className="filter-text">

                      <span >Project Manager:</span>
                      <span>

                        { manager.length === 0 ? "All" : "Selected" }
                      </span>

                    </span>
                  </Button>
                </Popover>


              </>
            ) }
            <Popover
              trigger="click"
              placement="bottomRight"
              visible={ popOver.technology }
              onVisibleChange={ () => handleVisibleChange("technology", true) }
              content={
                <div className="assignees-popover assign-global-height">
                  <ul>
                    <li>
                      <Checkbox
                        checked={ technology.length === 0 }
                        onChange={ () => handleFilters("", technology, setTechnology) }
                      >
                        { " " }All
                      </Checkbox>
                    </li>
                  </ul>
                  <div className="search-filter">
                    <Input
                      placeholder="Search"
                      value={ searchTechnology }
                      onChange={ handleSearchTechnology }
                    />
                  </div>
                  <div>
                    <ul className="assigness-data">
                      { filteredTechnologyList.map((item) => (
                        <li key={ item._id }>
                          <Checkbox
                            onChange={ () =>
                              handleFilters(item, technology, setTechnology)
                            }
                            checked={ technology.includes(item._id) }
                          >
                            { item.project_tech }
                          </Checkbox>
                        </li>
                      )) }
                    </ul>
                  </div>
                  <div className="popover-footer-btn">
                    <Button
                      type="primary"
                      className="square-primary-btn ant-btn-primary"
                      onClick={ () => {
                        getProjectListing();
                        handleVisibleChange("technology", false);
                      } }
                    >
                      Apply
                    </Button>
                    <Button
                      className="square-outline-btn ant-delete"
                      onClick={ () => {
                        handleVisibleChange("technology", false);
                      } }
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              }
            >

              <Button className="dropdown-button">
                <span className="filter-text">

                  <span >Technology:</span>
                  <span>

                    { technology.length === 0 ? "All" : "Selected" }
                  </span>
                </span>
              </Button>
            </Popover>


            <Popover
              trigger="click"
              placement="bottomRight"
              visible={ popOver.type }
              onVisibleChange={ (visible) => handleVisibleChange("type", visible) }
              content={
                <div className="assignees-popover">
                  <ul>
                    <li>
                      <Checkbox
                        checked={ projectType.length === 0 }
                        onChange={ () =>
                          handleFilters("", projectType, setProjectType)
                        }
                      >
                        { " " }All
                      </Checkbox>
                    </li>
                    { projectTypeList.map((item) => (
                      <li key={ item._id }>
                        <Checkbox
                          onChange={ () => {
                            handleFilters(item, projectType, setProjectType);
                          } }
                          checked={ projectType.includes(item._id) }
                        >
                          { item?.project_type }
                        </Checkbox>
                      </li>
                    )) }
                  </ul>
                  <div className="popver-footer-btn">
                    <Button
                      type="primary"
                      className="square-primary-btn ant-btn-primary"
                      onClick={ () => {
                        getProjectListing();
                        handleVisibleChange("type", false);
                      } }
                    >
                      Apply
                    </Button>
                    <Button
                      className="square-outline-btn ant-delete"
                      onClick={ () => {
                        handleVisibleChange("type", false);
                      } }
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              }
            >


              <Button className="dropdown-button">
                <span className="filter-text">

                  <span >Project Type:</span>
                  <span>

                    { projectType.length === 0 ? "All" : "Selected" }
                  </span>
                </span>
              </Button>
            </Popover>

            <Popover
              trigger="click"
              visible={ popOver.assignees }
              onVisibleChange={ (visible) => handleVisibleChange("assignees", visible) }
              placement="bottomRight"
              content={
                <div className="assignees-popover assign-global-height">
                  <ul>
                    <li>
                      <Checkbox
                        checked={ assignees.length === 0 }
                        onChange={ () => handleFilters("", assignees, setAssignees) }
                      >
                        { " " }All
                      </Checkbox>
                    </li>
                  </ul>
                  <div className="search-filter">
                    <Input
                      placeholder="Search"
                      value={ searchAssignees }
                      onChange={ handleSearchTermAssignees }
                    />
                  </div>
                  <ul className="assigness-data">
                    { filteredAssigneesList.map((item) => (
                      <li key={ item._id }>
                        <Checkbox
                          onChange={ () => {
                            handleFilters(item, assignees, setAssignees);
                          } }
                          checked={ assignees.includes(item._id) }
                        >
                          { removeTitle(item?.full_name) }
                        </Checkbox>
                      </li>
                    )) }
                  </ul>
                  <div className="popover-footer-btn">
                    <Button
                      type="primary"
                      className="square-primary-btn ant-btn-primary"
                      onClick={ () => {
                        getProjectListing();
                        handleVisibleChange("assignees", false);
                      } }
                    >
                      Apply
                    </Button>
                    <Button
                      className="square-outline-btn ant-delete"
                      onClick={ () => handleVisibleChange("assignees", false) }
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              }
            >


              <Button className="dropdown-button">
                <span className="filter-text">
                  <span >Assignees:</span>
                  <span>
                    { assignees.length === 0 ? "All" : "Selected" }
                  </span>
                </span>

              </Button>
            </Popover>

            <Popover
              trigger="click"
              visible={ popOver.sortBy }
              onVisibleChange={ (visible) => handleVisibleChange("sortBy", visible) }
              placement="bottomRight"
              content={
                <div className="right-popover-wrapper">
                  <ul className="assigness-data">
                    <Radio.Group
                      onChange={ (e) => handleSortFilter(e.target.value) }
                      value={ sortOption }
                    >
                      <li>
                        <Radio value="createdAt">Latest Updated</Radio>
                      </li>
                      <li>
                        <Radio value="title">Name</Radio>
                      </li>
                      <li>
                        <Radio value="project_type">Status</Radio>
                      </li>
                    </Radio.Group>
                  </ul>
                  <div className="popver-footer-btn">
                    <Button
                      type="primary"
                      className="square-primary-btn ant-btn-primary"
                      onClick={ () => {
                        getProjectListing();
                        handleVisibleChange("sortBy", false);
                      } }
                    >
                      Apply
                    </Button>
                    <Button
                      className="square-outline-btn ant-delete"
                      onClick={ () => handleVisibleChange("sortBy", false) }
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              }
            >

              <Button className="dropdown-button">
                <span className="filter-text">

                  <span >Sort By:
                  </span>
                  <span>

                    { sortOption === "createdAt"
                      ? "Latest Updated"
                      : sortOption === "title"
                        ? "Name"
                        : "Status" }
                  </span>
                </span>
              </Button>
            </Popover>

          </div>

        </div>

        <div className="block-table-content new-block-table">
          <Table
            columns={ columns }
            dataSource={ columnDetails }
            pagination={ {
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "30"],
              showTotal: showTotal,
              ...pagination,
            } }
            onChange={ handleTableChange }
            // scroll={ {
            //   x: "100%",
            // } }
          />
        </div>
      </Card>

      <Modal
        footer={ false }
        open={ isModalOpen }
        onOk={ handleOk }
        onCancel={ handleCancel }
        className="project-add-wrapper"
      >
        <div className="modal-header">
          <h1>{ modalMode === "add" ? "Add Project" : "Edit Project" }</h1>
        </div>
        <div className="overview-modal-wrapper">
          <Form
            form={ form }
            onFinish={ (values) => {
              modalMode === "add"
                ? addProjectDetails(values)
                : editProjectdetails(data?._id, values);
            } }
          >
            <div className="topic-cancel-wrapper">
              <div className="pop-project-task-main-wrapper">
                <Form.Item
                  name="title"
                  rules={ [
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter a valid title",
                    },
                    {
                      pattern: generatePattern(projectTypeSlug),
                      message: "Title must be in the format SO1140/TM/PMS",
                    },
                  ] }
                >
                  <Input placeholder="SO1140/TM/PMS" />
                </Form.Item>

                <Row>
                  <Col span={ 12 }>
                    <Form.Item
                      name="technology"
                      rules={ [
                        {
                          required: true,
                          message: "Please select a technology",
                        },
                      ] }
                      className="assign-project-tech-input"
                    >
                      <Select
                        mode="multiple"
                        placeholder="Technology"
                        size="large"
                        showSearch
                        filterOption={ (input, option) =>
                          option.children
                            ?.toLowerCase()
                            ?.indexOf(input?.toLowerCase()) >= 0
                        }
                        filterSort={ (optionA, optionB) =>
                          optionA.children
                            ?.toLowerCase()
                            ?.localeCompare(optionB.children?.toLowerCase())
                        }
                        onChange={ handleProjectTech }
                        value={ projectTech }
                      >
                        { technologyList.map((item, index) => (
                          <>
                            <Option
                              key={ index }
                              value={ item._id }
                              style={ { textTransform: "capitalize" } }
                            >
                              { item.project_tech }
                            </Option>
                          </>
                        )) }
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={ 12 } className="assign-project-tech-input">
                    <Form.Item
                      className="poject-type"
                      name="project_type"
                      rules={ [
                        {
                          required: true,
                          message: "Please select a project type",
                        },
                      ] }
                    >
                      <Select
                        placeholder="Project Type"
                        size="large"
                        showSearch
                        filterOption={ (input, option) =>
                          option.children
                            ?.toLowerCase()
                            ?.indexOf(input?.toLowerCase()) >= 0
                        }
                        filterSort={ (optionA, optionB) =>
                          optionA.children
                            ?.toLowerCase()
                            ?.localeCompare(optionB.children?.toLowerCase())
                        }
                        onChange={ (value) => setProjectTypeselect(value) }
                      >
                        { projectTypeList.map((item, index) => (
                          <>
                            <Option
                              key={ index }
                              value={ item._id }
                              style={ { textTransform: "capitalize" } }
                            >
                              { item.project_type }
                            </Option>
                          </>
                        )) }
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="Description"
                  colon={ false }
                  name="descriptions"
                >
                  <CKEditor
                    editor={ Custombuild }
                    data={ editorData }
                    onChange={ handleChange }
                    onPaste={ handlePaste }
                    config={ {
                      toolbar: [
                        "heading",
                        "|",
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
                        "|",
                        "print",
                      ],
                      fontSize: {
                        options: [
                          "default",
                          1,
                          2,
                          3,
                          4,
                          5,
                          6,
                          7,
                          8,
                          9,
                          10,
                          11,
                          12,
                          13,
                          14,
                          15,
                          16,
                          17,
                          18,
                          19,
                          20,
                          21,
                          22,
                          23,
                          24,
                          25,
                          26,
                          27,
                          28,
                          29,
                          30,
                          31,
                          32,
                        ],
                      },
                      print: {
                        // Implement print functionality here
                      },
                      styles: {
                        height: "10px",
                      },
                    } }
                  />
                </Form.Item>

                <Form.Item
                  label="Account Manager"
                  colon={ false }
                  name="acc_manager"
                  rules={
                    projectTypeselect === "65b9e9e70f085dbd9bb12797"
                      ? [] // Not required
                      : [{ required: true, message: "This field is required!" }] // Required
                  }
                >
                  <Select
                    size="large"
                    showSearch
                    // optionFilterProp="children"
                    filterOption={ (input, option) =>
                      option.children
                        ?.toLowerCase()
                        ?.indexOf(input?.toLowerCase()) >= 0
                    }
                    filterSort={ (optionA, optionB) =>
                      optionA.children
                        ?.toLowerCase()
                        ?.localeCompare(optionB.children?.toLowerCase())
                    }
                  >
                    { accountManagerList.map((item, index) => (
                      <>
                        <Option
                          key={ index }
                          value={ item._id }
                          style={ { textTransform: "capitalize" } }
                        >
                          { removeTitle(item.full_name) }
                        </Option>
                      </>
                    )) }
                  </Select>
                </Form.Item>

                <Row>
                  <Col span={ 12 }>
                    <Form.Item
                      label="Associate Workflow"
                      colon={ false }
                      name="workFlow"
                      initialValue={ workflow.find((w) => w.isDefault)?._id }
                      rules={ [
                        {
                          required: true,
                        },
                      ] }
                    >
                      <Select
                        size="large"
                        showSearch
                        onDropdownVisibleChange={ (open) =>
                          open && getWorkflow()
                        }
                      >
                        { workflow.map((item, index) => (
                          <>
                            <Option
                              key={ index }
                              value={ item._id }
                              style={ { textTransform: "capitalize" } }
                            >
                              { item.project_workflow }
                            </Option>
                          </>
                        )) }
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={ 12 }>
                    <Form.Item
                      label="Project manager"
                      colon={ false }
                      name="manager"
                      className="subscriber-btn"
                      rules={ [
                        {
                          required: true,
                          message: "Please select a project manager",
                        },
                      ] }
                    >
                      <Select
                        size="large"
                        showSearch
                        // optionFilterProp="children"
                        filterOption={ (input, option) =>
                          option.children
                            ?.toLowerCase()
                            ?.indexOf(input?.toLowerCase()) >= 0
                        }
                        filterSort={ (optionA, optionB) =>
                          optionA.children
                            ?.toLowerCase()
                            ?.localeCompare(optionB.children?.toLowerCase())
                        }
                      >
                        { projectManagerList.map((item, index) => (
                          <>
                            <Option
                              key={ index }
                              value={ item._id }
                              style={ { textTransform: "capitalize" } }
                            >
                              { removeTitle(item.manager_name) }
                            </Option>
                          </>
                        )) }
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col span={ 12 }>
                    <Form.Item
                      label="Assignees"
                      colon={ false }
                      name="assignees"
                      className="subscriber-btn"
                    >
                      <Space
                        direction="vertical"
                        style={ {
                          width: "100%",
                        } }
                      >
                        <MultiSelect
                          onSearch={ handleSearch }
                          onChange={ handleSelectedItemsChange }
                          values={
                            selectedItems &&
                            selectedItems.map((item) => item._id)
                          }
                          listData={ projectAssigneesList }
                          search={ searchKeyword }
                        />
                      </Space>

                      <div className="list-clear-btn">
                        <Button
                          className="list-clear-btn ant-delete"
                          onClick={ handleClearAssignees }
                        >
                          Clear
                        </Button>
                      </div>
                    </Form.Item>
                  </Col>

                  <Col span={ 12 }>
                    <Form.Item
                      label="Client"
                      colon={ false }
                      name="client"
                      className="subscriber-btn"
                    >
                      <MultiSelect
                        onSearch={ handleSearch }
                        onChange={ handleClients }
                        values={
                          selectedClient &&
                          selectedClient.map((item) => item._id)
                        }
                        listData={ projectClientList }
                        search={ searchKeyword }
                      />

                      <div className="clear-btn">
                        <Button
                          className="list-clear-btn ant-delete"
                          onClick={ handleClearClient }
                        >
                          Clear
                        </Button>
                      </div>
                    </Form.Item>
                  </Col>

                  <Col span={ 12 }></Col>
                </Row>
                <Row>
                  <Col span={ 12 }>
                    <Form.Item
                      label="Project Estimated Hours"
                      colon={ false }
                      name="estimatedHours"
                      rules={ [
                        {
                          required: true,
                          message: "Please provide estimated hours",
                        },
                      ] }
                    >
                      <Input type="number" min={ 0 } />
                    </Form.Item>
                  </Col>
                  <Col span={ 12 }>
                    <Form.Item
                      label="Status"
                      colon={ false }
                      name="project_status"
                    >
                      <Select
                        size="large"
                        defaultValue={
                          projectStatusList.find(
                            (item) => item.title?.toLowerCase() === "active"
                          )?._id
                        }
                        showSearch
                        filterOption={ (input, option) =>
                          option.children
                            ?.toLowerCase()
                            ?.indexOf(input?.toLowerCase()) >= 0
                        }
                        filterSort={ (optionA, optionB) =>
                          optionA.children
                            ?.toLowerCase()
                            ?.localeCompare(optionB.children?.toLowerCase())
                        }
                      >
                        { projectStatusList.map((item, index) => (
                          <>
                            <Option
                              key={ index }
                              value={ item._id }
                              style={ { textTransform: "capitalize" } }
                            >
                              { item.title }
                            </Option>
                          </>
                        )) }
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Row>
                  <Col span={ 12 }>
                    <Form.Item
                      label="Start Date"
                      colon={ false }
                      name="start_date"
                      rules={ [
                        {
                          required: true,
                          message: "Please select a start date",
                        },
                      ] }
                    >
                      <DatePicker
                        placeholder="Start Date"
                        onChange={ (date, dateString) => {
                          onChange(date, dateString, "start_date");
                          form.setFieldValue({ end_date: "" });
                        } }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={ 12 }>
                    <Form.Item
                      label="End Date"
                      colon={ false }
                      name="end_date"
                      rules={ [
                        {
                          required: true,
                          message: "Please select an end date",
                        },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (
                              !value ||
                              form.getFieldValue("start_date") < value
                            ) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              new Error(
                                "End date must be later than start date"
                              )
                            );
                          },
                        }),
                      ] }
                    >
                      <DatePicker
                        placeholder="End Date"
                        onChange={ (date, dateString) =>
                          onChange(date, dateString, "end_date")
                        }
                        disabledDate={ (value) => {
                          return value < form.getFieldValue("start_date");
                        } }
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <div className="modal-footer-flex">
                  <div className="flex-btn">
                    <Button type="primary" htmlType="submit">
                      Save
                    </Button>
                    <Button className="ant-delete" onClick={ handleCancel }>
                      Cancel
                    </Button>
                  </div>
                
                </div>
              </div>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
}

export default AssignProject;
