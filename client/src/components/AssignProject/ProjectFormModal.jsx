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
} from "antd";
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
import "./AssignProject.css";

const ProjectFormModal = ({
  isModalOpen,
  modalMode,
  selectedProject,
  handleCancel,
  setIsModalOpen,
  triggerRefreshList
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
        const projectDetails = response.data.data;
        setSelectedItems(projectDetails?.assignees || []);
        setSelectedClient(projectDetails?.pms_clients || []);
        setNewFilteredAssignees(projectDetails?.assignees || []);
        setNewFilteredClients(projectDetails?.pms_clients || []);
        setEditorData(projectDetails?.descriptions || "");
        setIsBillable(projectDetails?.isBillable || false);
        
        // Fix: Ensure technology IDs are properly set and sync with projectTech state
        const technologyIds = projectDetails?.technology?.map((item) => item?._id) || [];
        setProjectTech(technologyIds);
        
        form.setFieldsValue({
          title: projectDetails?.title?.trim(),
          technology: technologyIds,
          project_type: projectDetails?.project_type?._id,
          descriptions: removeHTMLTags(projectDetails?.descriptions || ""),
          workFlow: projectDetails?.workFlow?._id,
          manager: projectDetails?.manager?._id,
          acc_manager: projectDetails?.acc_manager?._id,
          estimatedHours: projectDetails?.estimatedHours,
          project_status: projectDetails?.project_status?._id,
          start_date: projectDetails?.start_date ? dayjs(projectDetails.start_date) : null,
          end_date: projectDetails?.end_date ? dayjs(projectDetails.end_date) : null,
          isBillable: projectDetails?.isBillable,
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
      const reqBody = { isDropdown: true };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectTech,
        body: reqBody,
      });
      if (response?.data?.data) {
        setTechnologyList(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getProjectType = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListing,
      });
      if (response?.data?.data) {
        setProjectTypeList(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getProjectTypeSlug = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectTypeSLug,
      });
      if (response?.data?.data) {
        setProjectTypeSlug(response.data.data.slug);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getProjectClients = async () => {
    try {
      const reqBody = { isDropdown: true };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getClients,
        body: reqBody,
      });
      if (response?.data?.data) {
        setProjectClientList(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getProjectassignees = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployees,
      });
      if (response?.data?.data) {
        setProjectAssigneesList(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getManager = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectManager,
      });
      if (response?.data?.data) {
        setProjectManagerList(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getAccountManager = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getAccountManager,
      });
      if (response?.data?.data) {
        setAccountManagerList(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getStatus = async () => {
    try {
      const reqBody = { isDropdown: true };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectStatus,
        body: reqBody,
      });
      if (response?.data?.data) {
        setProjectStatusList(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getWorkflow = async () => {
    try {
      const reqBody = { isDropdown: "true" };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getworkflow,
        body: reqBody,
      });
      if (response?.data?.data && response?.data?.status) {
        setWorkflow(response.data.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearch = (searchValue) => {
    setSearchKeyword(searchValue);
  };

  const handleSelectedItemsChange = (selectedItemIds) => {
    setSelectedItems(projectAssigneesList.filter((item) => selectedItemIds.includes(item._id)));
    setSearchKeyword("");
  };

  const handleClients = (val) => {
    setSelectedClient(projectClientList.filter((item) => val.includes(item._id)));
    setSearchKeyword("");
  };

  const handleClearAssignees = () => {
    setSelectedItems([]);
  };

  const handleClearClient = () => {
    setSelectedClient([]);
  };

  const handleChange = (event, editor) => {
    setEditorData(editor.getData());
  };

  const handlePaste = (event, editor) => {
    const pastedData = (event.clipboardData || window.clipboardData).getData("text");
    const newData = pastedData.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    editor.setData(newData);
  };

  const handleBillable = (e) => {
    setIsBillable(e.target.checked);
  };

  const handleProjectTech = (val) => {
    setProjectTech(val);
  };

  function generatePattern(projectTypeSlug) {
    const patternString = `^[A-Z]{2}\\d+\\/(?:${projectTypeSlug})\\/[\\s\\S]+$`;
    return new RegExp(patternString);
  }

  // Remove these unused helper functions that were causing the issue
  // const getTechnologyIdByName = (technologyName) => {
  //   return technologyList.find((tech) => tech.project_tech === technologyName);
  // };

  const getProjectTypeIdByName = (projectTypeName) => {
    return projectTypeList.find((type) => type.project_type === projectTypeName);
  };

  const getProjectStatusIdByName = (statusName) => {
    return projectStatusList.find((status) => status.title === statusName);
  };

  const getManagerIdByName = (managerName) => {
    return projectManagerList.find((mgr) => mgr.manager_name === managerName);
  };

  const getWorkflowIdByName = (workflowName) => {
    return workflow.find((item) => item.project_workflow === workflowName);
  };

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
        end_date: values.end_date,
        estimatedHours: values.estimatedHours || "0",
        manager: values.manager,
        acc_manager: values?.acc_manager || "",
        project_status: values.project_status || projectStatusList.find((item) => item?.title?.toLowerCase() === "active")?._id,
        workFlow: values.workFlow,
        project_type: values.project_type,
        descriptions: editorData,
        technology: values.technology,
        isBillable,
      };
      form.setFieldsValue({ assignees, clients });
      let moduleprefix = "project";
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addProjectdetails,
        body: reqBody,
        options: { moduleprefix },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data && response?.data?.status) {
        message.success(response.data.message);
        form.resetFields();
        setIsModalOpen(false);
        await emitEvent(socketEvents.ADD_PROJECT_ASSIGNEE, response.data.data);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.error(error);
    } finally{
      triggerRefreshList()
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
        // Fix: Use technology values directly as they are already IDs from the form
        technology: values.technology,
        project_type: typeId ? typeId._id : values.project_type,
        project_status: statusId ? statusId._id : values?.project_status,
        manager: managerId ? managerId._id : values.manager,
        acc_manager: acc_managerId ? acc_managerId._id : values.acc_manager,
        workFlow: workflowID ? workflowID._id : values.workFlow,
      };
      
      let moduleprefix = "project";
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateProjectdetails + params,
        body: reqBody,
        options: { moduleprefix },
      });
      dispatch(hideAuthLoader());
      if (response.data?.data && response?.data?.status) {
        message.success(response.data.message);
        setIsModalOpen(false);
        let filterAssignees = assignees.filter((id) => !newFilteredAssignees.some((user) => user._id === id));
        let filterClients = clients.filter((id) => !newFilteredClients.some((user) => user._id === id));
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
    } finally{
      triggerRefreshList()
    }
  };

  if (isLoading) {
    return null; // Loader is handled by showAuthLoader
  }

  return (
    <Modal
      footer={false}
      width={800}
      open={isModalOpen}
      onCancel={handleCancel}
      className="project-add-wrapper"
      destroyOnClose
    >
      <div className="modal-header">
        <h1>{modalMode === "add" ? "Add Project" : "Edit Project"}</h1>
      </div>
      <div className="overview-modal-wrapper">
        <Form
          form={form}
          onFinish={(values) =>
            modalMode === "add"
              ? addProjectDetails(values)
              : editProjectdetails(selectedProject?._id, values)
          }
        >
          <div className="topic-cancel-wrapper">
            <div className="pop-project-task-main-wrapper">
              <Form.Item
                name="title"
                label="Project Title"
                rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Please enter a valid title",
                    },
                    {
                      pattern: generatePattern(projectTypeSlug),
                      message: "Title must be in the format AB1234/TM/ABC",
                    },
                  ]}
              >
                <Input placeholder="AB1234/TM/ABC" />
              </Form.Item>
              <Row>
                <Col span={12}>
                  <Form.Item
                    label="Department"
                    name="technology"
                    rules={[{ required: true, message: "Please select a technology" }]}
                    className="assign-project-tech-input"
                  >
                    <Select
                      mode="multiple"
                      placeholder="Department"
                      size="large"
                      showSearch
                      filterOption={(input, option) =>
                        option.children?.toLowerCase()?.indexOf(input?.toLowerCase()) >= 0
                      }
                      filterSort={(optionA, optionB) =>
                        optionA.children?.toLowerCase()?.localeCompare(optionB.children?.toLowerCase())
                      }
                      onChange={handleProjectTech}
                      value={projectTech}
                    >
                      {technologyList.map((item, index) => (
                        <Select.Option key={index} value={item._id} style={{ textTransform: "capitalize" }}>
                          {item.project_tech}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12} >
                  <Form.Item
                    label="Project Type"
                    // className="poject-type"
                    name="project_type"
                    rules={[{ required: true, message: "Please select a project type" }]}
                  >
                    <Select
                      placeholder="Project Type"
                      size="large"
                      showSearch
                      filterOption={(input, option) =>
                        option.children?.toLowerCase()?.indexOf(input?.toLowerCase()) >= 0
                      }
                      filterSort={(optionA, optionB) =>
                        optionA.children?.toLowerCase()?.localeCompare(optionB.children?.toLowerCase())
                      }
                      onChange={(value) => setProjectTypeselect(value)}
                    >
                      {projectTypeList.map((item, index) => (
                        <Select.Option key={index} value={item._id} style={{ textTransform: "capitalize" }}>
                          {item.project_type}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Description" colon={false} name="descriptions">
                <CKEditor
                  editor={Custombuild}
                  data={editorData}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  config={{
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
                        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
                      ],
                    },
                    print: {},
                    styles: { height: "10px" },
                  }}
                />
              </Form.Item>
              <Form.Item
                label="Account Manager"
                colon={false}
                name="acc_manager"
                rules={
                  projectTypeselect === "65b9e9e70f085dbd9bb12797"
                    ? []
                    : [{ required: true, message: "This field is required!" }]
                }
              >
                <Select
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option.children?.toLowerCase()?.indexOf(input?.toLowerCase()) >= 0
                  }
                  filterSort={(optionA, optionB) =>
                    optionA.children?.toLowerCase()?.localeCompare(optionB.children?.toLowerCase())
                  }
                >
                  {accountManagerList.map((item, index) => (
                    <Select.Option key={index} value={item._id} style={{ textTransform: "capitalize" }}>
                      {removeTitle(item.full_name)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Row>
                <Col span={12}>
                  <Form.Item
                    label="Associate Workflow"
                    colon={false}
                    name="workFlow"
                    initialValue={workflow.find((w) => w.isDefault)?._id}
                    rules={[{ required: true }]}
                  >
                    <Select
                      size="large"
                      showSearch
                      onDropdownVisibleChange={(open) => open && getWorkflow()}
                    >
                      {workflow.map((item, index) => (
                        <Select.Option key={index} value={item._id} style={{ textTransform: "capitalize" }}>
                          {item.project_workflow}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Project manager"
                    colon={false}
                    name="manager"
                    className="subscriber-btn"
                    rules={[{ required: true, message: "Please select a project manager" }]}
                  >
                    <Select
                      size="large"
                      showSearch
                      filterOption={(input, option) =>
                        option.children?.toLowerCase()?.indexOf(input?.toLowerCase()) >= 0
                      }
                      filterSort={(optionA, optionB) =>
                        optionA.children?.toLowerCase()?.localeCompare(optionB.children?.toLowerCase())
                      }
                    >
                      {projectManagerList.map((item, index) => (
                        <Select.Option key={index} value={item._id} style={{ textTransform: "capitalize" }}>
                          {removeTitle(item.manager_name)}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Assignees" colon={false} name="assignees" className="subscriber-btn">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <MultiSelect
                        onSearch={handleSearch}
                        onChange={handleSelectedItemsChange}
                        values={selectedItems?.map((item) => item._id)}
                        listData={projectAssigneesList}
                        search={searchKeyword}
                      />
                    </Space>
                    <div className="list-clear-btn">
                      <Button className="list-clear-btn ant-delete" onClick={handleClearAssignees}>
                        Clear
                      </Button>
                    </div>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Client" colon={false} name="client" className="subscriber-btn">
                    <MultiSelect
                      onSearch={handleSearch}
                      onChange={handleClients}
                      values={selectedClient?.map((item) => item._id)}
                      listData={projectClientList}
                      search={searchKeyword}
                    />
                    <div className="clear-btn">
                      <Button className="list-clear-btn ant-delete" onClick={handleClearClient}>
                        Clear
                      </Button>
                    </div>
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col span={12}>
                  <Form.Item
                    label="Project Estimated Hours"
                    colon={false}
                    name="estimatedHours"
                    rules={[{ required: true, message: "Please provide estimated hours" }]}
                  >
                    <Input disabled={modalMode !== "add" ? !getRoles(["Admin"]) : false} type="number" min={0} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Status" colon={false} name="project_status">
                    <Select
                      size="large"
                      defaultValue={projectStatusList.find((item) => item.title?.toLowerCase() === "active")?._id}
                      showSearch
                      filterOption={(input, option) =>
                        option.children?.toLowerCase()?.indexOf(input?.toLowerCase()) >= 0
                      }
                      filterSort={(optionA, optionB) =>
                        optionA.children?.toLowerCase()?.localeCompare(optionB.children?.toLowerCase())
                      }
                    >
                      {projectStatusList.map((item, index) => (
                        <Select.Option key={index} value={item._id} style={{ textTransform: "capitalize" }}>
                          {item.title}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col span={12}>
                  <Form.Item
                    label="Start Date"
                    colon={false}
                    name="start_date"
                    rules={[{ required: true, message: "Please select a start date" }]}
                  >
                    <DatePicker
                      placeholder="Start Date"
                      onChange={(date, dateString) => {
                        form.setFieldValue("end_date", "");
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="End Date"
                    colon={false}
                    name="end_date"
                    rules={[
                      { required: true, message: "Please select an end date" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("start_date") < value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("End date must be later than start date"));
                        },
                      }),
                    ]}
                  >
                    <DatePicker
                      placeholder="End Date"
                      disabledDate={(value) => value < form.getFieldValue("start_date")}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <div className="modal-footer-flex">
                <div className="flex-btn">
                  <Button type="primary" htmlType="submit">
                    Save
                  </Button>
                  <Button className="ant-delete" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default ProjectFormModal;