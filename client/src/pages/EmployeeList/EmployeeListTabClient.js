import React, { useState, useEffect, useRef } from "react";
import {
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  CalendarOutlined,
  MoreOutlined,
  PlusOutlined
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import Service from "../../service";
import { hideAuthLoader } from "../../appRedux/actions/Auth";
import {
  Table,
  Button,
  Input,
  Form,
  Row,
  Modal,
  Col,
  Select,
  Popconfirm,
  message,
} from "antd";
import TextArea from "antd/es/input/TextArea";
import "./EmployeeListTabClient.css";
import { removeTitle } from "../../util/nameFilter";
import ClientFilterComponent from "./ClientFilterComponent";

const EmployeeListTabClient = ({ taskLikeDesign = false }) => {
  const dispatch = useDispatch();
  const Search = Input.Search;
  const searchRef = useRef();

  // Search, sort, pagination
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [isListLoading, setisListLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState({sortBy:"desc"});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Check
  let [editid, setEditid] = useState();

  // Client listing
  const [clientList, setClientList] = useState([]);

  // Setting prefilled values in edit form
  const [prefilled, setPrefilled] = useState({});

  // ✅ Updated: Replace filterData with appliedFilters to match ClientFilterComponent format
  const [appliedFilters, setAppliedFilters] = useState({
    client: "",
    status: ""
  });

  // Add edit form
  const [addemployee] = Form.useForm();
  const [addModal, setaddModal] = useState(false);

  // Set the modal mode
  const [modalMode, setModalMode] = useState("add");

  // Set delete api response
  const [deletedata, setdelete] = useState();

  // ✅ NEW: Handle filter changes from ClientFilterComponent
  const handleFilterChange = (filterValues) => {
    console.log('Filters applied:', filterValues);
    setAppliedFilters(filterValues);
    // Reset pagination to first page when filters change
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // ✅ Updated: Clear all filters function
  const clearAllFilters = () => {
    console.log("Clear Filter button clicked");
    
    // Reset applied filters
    setAppliedFilters({
      client: "",
      status: ""
    });
    
    // Reset pagination
    setPagination({ ...pagination, current: 1 });
    
    // Note: The ClientFilterComponent manages its own internal state
    // When filters are cleared, it will call handleFilterChange with empty values
  };

  // Update client api
  const UpdateClient = async (values) => {
    const params = prefilled._id;
    try {
      const full_name = `${values.first_name} ${values.last_name}`;

      const reqBody = {
        first_name: values.first_name,
        last_name: values.last_name,
        full_name: full_name,
        email: values.email,
        phone_number: values.phone_number,
        password: values.plain_password,
        extra_details: values.extra_details,
        isActivate: values.status == "Active" ? true : false,
        company_name: values.company_name,
      };
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateClient}/${params}`,
        body: reqBody,
      });
      if (response.data.statusCode == 200) {
        message.success(response.data.message);
      } else {
        message.error(response.data.message || "Something went to wrong!");
      }
    } catch (error) {
      console.log(error);
    }
    setaddModal(false);
    getClientList();
  };

  // Add client api
  const addemp = async (values) => {
    const fullName = `${values.first_name} ${values.last_name}`;
    const reqBody = {
      last_name: values.last_name,
      first_name: values.first_name,
      company_name: values.company_name,
      phone_number: values.phone_number,
      password: values?.plain_password,
      full_name: fullName,
      email: values.email,
      extra_details: values.extra_details,
      isActivate: values.status == "Active" ? true : false,
    };
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.clientAdd,
        body: reqBody,
      });
      if (response.data.statusCode !== 201) {
        return message.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
    setaddModal(false);
    addemployee.setFieldsValue({
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      plain_password: "",
      company_name: "",
      extra_details: "",
      status: null,
    });
  };

  // Cancel
  const handleCancel = () => {
    setaddModal(false);
    addemployee.setFieldsValue({
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      plain_password: "",
      company_name: "",
      extra_details: "",
      status: null,
    });
  };

  // Ok
  const handleOk = () => {
    setaddModal(false);
  };

  // Delete client api
  const handleDelete = async (record) => {
    const params = record._id;

    try {
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: `${Service.deleteClient}/${params}`,
      });
      if (response.data.statusCode == 200) {
        setdelete(response.data);
        message.success(response.data.message);
      } else {
        message.error(response.data.message || "Something went to wrong!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Add button modal
  const openAddModal = () => {
    addemployee.setFieldsValue({
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      company_name: "",
      extra_details: "",
      status: "Active",
    });
    setaddModal(true);
    setModalMode("add");
  };

  // ✅ Updated: Export CSV with new filter format
  const exportCSV = async () => {
    try {
      const reqBody = {
        exportFileType: "csv",
        isExport: true,
      };
      if (sortBy?.sort) {
        reqBody.sort = sortBy.sort;
      }
      if (sortBy?.sortBy) {
        reqBody.sortBy = sortBy.sortBy;
      }
      if (searchText) {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }
      
      // ✅ Updated: Use appliedFilters instead of filterData
      if (appliedFilters.status) {
        reqBody.isActivate = appliedFilters.status === "Active" ? true : false;
      }
      if (appliedFilters.client) {
        reqBody.user_id = appliedFilters.client;
      }
      
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.clientlist,
        body: reqBody,
      });
      const exportButton = document.getElementById("exportButton");
      if (response?.data?.data) {
        let base64 = response.data.data;
        const linkSource = "data:text/csv;base64," + base64;
        const downloadLink = document.createElement("a");
        const fileName = "Users Clients.csv";
        downloadLink.href = linkSource;
        downloadLink.download = fileName;
        downloadLink.style.display = "none";
        downloadLink.click();
        downloadLink.remove();
      } else {
        message.error(response.data.message);
        exportButton.disabled = true;
      }
    } catch (error) {
      console.log(error);
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const passwordRules = [
    {
      required: true,
      message: "Please enter Password",
    },
    {
      validator: (_, value) => {
        if (!value) {
          return Promise.resolve();
        }

        const passwordPattern =
          /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

        if (!passwordPattern.test(value)) {
          return Promise.reject(
            new Error(
              "Password must be 8-20 char long & uppercase letter, lowercase letter, number, special character"
            )
          );
        }

        return Promise.resolve();
      },
    },
  ];

  const showModal = async (id) => {
    try {
      const reqBody = {
        _id: id,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.clientlist,
        body: reqBody,
      });

      setPrefilled({
        _id: id,
      });
      addemployee.setFieldsValue({
        first_name: response?.data.data.first_name,
        last_name: response?.data.data.last_name,
        email: response?.data.data.email,
        phone_number: response?.data.data.phone_number,
        plain_password: response?.data?.data?.plain_password,
        company_name: response?.data.data.company_name,
        extra_details: response?.data.data.extra_details,
        status: response?.data.data.isActivate ? "Active" : "Not Active",
      });

      setaddModal(true);
    } catch (error) {
      console.log(error);
    }
  };

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

  // Columns (no changes needed here)
  const columns1 = [
    {
      title: "Name",
      dataIndex: "name",
      key: "full_name",
      width: 300,
      render: (text, record) => {
        const full_name = record.full_name;
        return (
          <span style={ { textTransform: "capitalize" } }>
            { removeTitle(full_name) }
          </span>
        );
      },
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
      render: (_, record) => {
        return <span>{ record.email }</span>;
      },
    },
    {
      title: "Company Name",
      dataIndex: "company_name",
      key: "company_name",
      width: 300,
      render: (_, record) => {
        return (
          <span style={ { textTransform: "capitalize" } }>
            { record.company_name }
          </span>
        );
      },
    },
    {
      title: "Contact Number",
      dataIndex: "contact_number",
      key: "contact_number",
      width: 200,
      render: (_, record) => {
        return (
          <span style={ { textTransform: "capitalize" } }>
            { record.phone_number }
          </span>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (text, record) => {
        return record?._id == editid ? (
          <Select
            defaultValue={ record.isActivate ? "Active" : "Not Active" }
            options={ [
              {
                value: true,
                label: "Active",
              },
              {
                value: false,
                label: "Not Active",
              },
            ] }
          />
        ) : (
          <span style={ { textTransform: "capitalize" } }>
            { record.isActivate ? "Active" : "Not Active" }
          </span>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "action",
      width: 200,
      render: (text, record, index) => (
        <div
          className="action-edit-btn"
          style={ {
            display: "flex",
            flexwrap: "wrap",
          } }
        >
          <Button type="link edit">
            <EditOutlined
              className="edit-btn"
              style={ { color: "green" } }
              onClick={ () => {
                showModal(record._id);
                setModalMode("Edit");
              } }
            />
          </Button>

          <Popconfirm
            title="Do you want to delete?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDelete(record)}
          >
            <DeleteOutlined className="edit-btn" style={ { color: "red" } } />
          </Popconfirm>
        </div>
      ),
    },
  ];

  // Footer details
  const getFooterDetails = () => {
    return (
      <label>
        Total Records Count is { pagination.total > 0 ? pagination.total : 0 }
      </label>
    );
  };

  // Pagination
  const handleTableChange = (page, filters, sorter) => {
    setPagination({ ...pagination, ...page });
    const { field, order } = sorter;
    setPagination({ ...pagination, ...page });
    setSortBy({
      sortBy: order === "ascend" ? "asc" : "desc",
      sort: field,
    });
  };

  // ✅ Updated: Client listing with new filter format
  const getClientList = async () => {
    try {
      setisListLoading(true);
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
      };
      if (sortBy?.sort) {
        reqBody.sort = sortBy.sort;
      }
      if (sortBy?.sortBy) {
        reqBody.sortBy = sortBy.sortBy;
      }
      if (searchText && searchText !== "") {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }

      // ✅ Updated: Use appliedFilters instead of filterData
      if (appliedFilters.client) {
        reqBody.user_id = appliedFilters.client;
      }
      if (appliedFilters.status) {
        reqBody.isActivate = appliedFilters.status === "Active" ? true : false;
      }
      
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.clientlist,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        setPagination((prevPagination) => ({
          ...prevPagination,
          total: response.data.metadata.total,
        }));
        setClientList(response.data.data);
      } else {
        setClientList([]);
        setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    } finally{
      setisListLoading(false);
    }
  };

  // ✅ Updated: useEffect dependency changed from filterData to appliedFilters
  useEffect(() => {
    getClientList();
  }, [
    appliedFilters, // Changed from filterData to appliedFilters
    searchText,
    sortBy.sort,
    sortBy.sortBy,
    pagination.current,
    pagination.pageSize,
    addModal,
    deletedata,
  ]);




  const resetSearchFilter = (e) => {
    const keyCode = e && e.keyCode ? e.keyCode : e;
    const currentValue = searchRef.current?.input?.value || '';
    
    switch (keyCode) {
      case 8: // Backspace
        if (currentValue.length <= 1 && seachEnabled) {
          searchRef.current.input.value = "";
          setSearchText("");
          setSearchEnabled(false);
          setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
        }
        break;
      case 46: // Delete
        if (currentValue.length <= 1 && seachEnabled) {
          searchRef.current.input.value = "";
          setSearchText("");
          setSearchEnabled(false);
          setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
        }
        break;
      default:
        break;
    }
  };

  const onSearch = (value) => {
    if (value === '' || !value) {
      // Handle empty search
      setSearchText("");
      setSearchEnabled(false);
    } else {
      setSearchText(value);
      setSearchEnabled(true);
    }
    setPagination({ ...pagination, current: 1 });
  };

  // ✅ Helper function to check if any filters are applied
  const hasActiveFilters = () => {
    return appliedFilters.client !== "" || appliedFilters.status !== "";
  };

  return (
    <>
    
        <div className={taskLikeDesign ? "tasklike-list-toolbar" : "global-search"}>
          <Search
            ref={ searchRef }
            placeholder={taskLikeDesign ? "Search" : "Search..."}
            className="client-search-bar"
            onSearch={ onSearch }
            onChange={ (e) => {
              setPagination({ ...pagination, current: 1 });
            } }
            allowClear
            onKeyUp={ resetSearchFilter }
        style={{width: taskLikeDesign ? "220px" : "200px"}}
          />
          <div className={taskLikeDesign ? "tasklike-toolbar-actions" : "filter-btn-wrapper"}>
            {taskLikeDesign ? (
              <>
                <Button icon={<FilterOutlined />}>Filter</Button>
                <Select
                  size="middle"
                  defaultValue="all"
                  options={[
                    { label: "Status", value: "all" },
                    { label: "Active", value: "active" },
                    { label: "Not Active", value: "inactive" }
                  ]}
                />
                <Select
                  size="middle"
                  defaultValue="default"
                  options={[{ label: "Default", value: "default" }]}
                />
                <Button icon={<CalendarOutlined />}>Date Type</Button>
                <Button onClick={openAddModal} type="primary" icon={<PlusOutlined />}>
                  Add Client
                </Button>
                <Button icon={<MoreOutlined />}>More</Button>
              </>
            ) : (
              <>
                <Button onClick={openAddModal} type="primary" className="btn">
                  <i className="fi fi-rr-plus-small"></i> Add
                </Button>
                <ClientFilterComponent onFilterChange={handleFilterChange} />
                <Button
                  className="mr2 export-btn"
                  id="exportButton"
                  disabled={pagination.total != 0 ? false : true}
                  onClick={exportCSV}
                >
                  Export CSV
                </Button>
              </>
            )}
          </div>
        </div>
    
      
      <div className={taskLikeDesign ? "block-table-content client-table-block tasklike-table-wrap" : "block-table-content client-table-block"}>
        <Table
          columns={columns1}
          loading={isListLoading}
          pagination={{
            showSizeChanger: true,
            ...pagination,
          } }
          footer={ getFooterDetails }
          onChange={ handleTableChange }
          dataSource={ clientList }
        />
      </div>

      {/* Add edit button modal */}
      <Modal
        className="add-and-edit-client"
        title={ modalMode === "add" ? "Add Client" : "Edit Client" }
        open={ addModal }
        width={ 800 }
        footer={ [
          <Button key="submit" type="primary" htmlType="submit" form="addClientForm">
            { modalMode === "add" ? "Add" : "Save" }
          </Button>,
          <Button
            className="ant-delete"
            type="primary"
            onClick={ handleCancel }
          >
            Cancel
          </Button>
        ] }
        onOk={ handleOk }
        onCancel={ handleCancel }
      >

        <div className="overview-modal-wrapper ">

          <Form
          id="addClientForm"
            form={ addemployee }
   layout="vertical"
            onFinish={ (values) => {
              modalMode === "add" ? addemp(values) : UpdateClient(values);
            } }
          >

             <Row gutter={ [0, 0] }>
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
                <Form.Item
                  label="First name"
                  name="first_name"
                  rules={ [
                    {
                      required: true,
                      message: "Please enter first name",
                    },
                  ] }
                >
                  <Input placeholder="Enter First Name" />
                </Form.Item>
              </Col>
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>
              <Form.Item
                  label="Last Name"
                  name="last_name"
                  rules={ [
                    {
                      required: true,
                      message: "Please enter last name",
                    },
                  ] }
                >
                  <Input placeholder="Enter Last Name" />
                </Form.Item>
               
              </Col>
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>

                <Form.Item
                  label="Email"
                  name="email"
                  rules={ [
                    {
                      required: true,
                      message: "Please Enter email",
                      type: "email",
                    },
                  ] }
                >
                  <Input placeholder="Enter Email" />
                </Form.Item>
              </Col>
              <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 }>

                <Form.Item label="Extra Info" name="extra_details">
                  <TextArea />
                </Form.Item>
              </Col>

              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>

              <Form.Item
                  label="Phone number"
                  name="phone_number"
                  rules={ [
                    {
                      len: 10,
                      message: "Phone number must be 10 digits",
                    },
                    {
                      pattern: /^[0-9]+$/,
                      message: "Phone number must contain only digits",
                    },
                  ] }
                >
                  <Input placeholder="Enter Phone Number" />
                </Form.Item>
               
              </Col>
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>

                <Form.Item
                  label="Company Name"
                  name="company_name"
                  rules={ [
                    {
                      required: true,
                      message: "Please enter company name",
                    },
                  ] }
                >
                  <Input placeholder="Enter Company Name" />
                </Form.Item>
              </Col>
                <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>

                <Form.Item label="Status" name="status">
                  <Select
                    onChange={ (e) => console.log(e, "eeee") }
                    options={ [
                      {
                        value: "Active",
                        label: "Active",
                      },
                      {
                        value: "Not Active",
                        label: "Not Active",
                      },
                    ] }
                  />
                </Form.Item>
              </Col>
              <Col xs={ 24 } sm={ 24 } md={ 12 } lg={ 12 }>

                { modalMode === "add" && (
                  <Form.Item
                    className=" client-input-password"
                    label="Password"
                    name="plain_password"
                    rules={ passwordRules }
                  >
                    <Input
                      placeholder="Enter Password"
                      type={ passwordVisible ? "text" : "password" }
                      min={ 8 }
                      autoComplete="off"
                      suffix={
                        <Button
                          type="link"
                          onClick={ togglePasswordVisibility }
                          icon={
                            passwordVisible ? (
                              <EyeInvisibleOutlined />
                            ) : (
                              <EyeTwoTone />
                            )
                          }
                        />
                      }
                    />
                  </Form.Item>
                ) }
              </Col>
            
            </Row>

          </Form>

        </div>
      </Modal>
    </>
  );
};

export default EmployeeListTabClient;
