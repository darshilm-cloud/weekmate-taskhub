import React, { useState, useEffect, useRef } from "react";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
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

const EmployeeListTabClient = () => {
  const [formData] = Form.useForm();
  const dispatch = useDispatch();
  const Search = Input.Search;
  const searchRef = useRef();

  //search , sort , pagination
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("desc");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });
  const [passwordVisible, setPasswordVisible] = useState(false);

  //check
  let [editid, setEditid] = useState();
  const [client, setClient] = useState([]);

  //client listing
  const [clientList, setClientList] = useState([]);

  //setting prefilled values in edit form
  const [prefilled, setPrefilled] = useState({});

  //filter data form
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  //setting filter data
  let [filterData, setFilterData] = useState(null);

  //add edit form
  const [addemployee] = Form.useForm();
  const [addModal, setaddModal] = useState(false);

  //set the modal mode
  const [modalMode, setModalMode] = useState("add");

  //set delete api response
  const [deletedata, setdelete] = useState();

  //update client api
  const UpdateClient = async (values) => {
    const params = prefilled._id;
    try {
      const full_name = `${values.first_name} ${values.last_name}`;

      const reqBody = {
        // intial_name: values.intial_name,
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

  //add client api
  const addemp = async (values) => {
    const fullName =
      // `${values.intial_name}
      `${values.first_name} ${values.last_name}`;
    const reqBody = {
      // intial_name: values.intial_name,
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
      // intial_name: "",
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

  //cancel
  const handleCancel = () => {
    setIsFilterModalOpen(false);
    setaddModal(false);
    addemployee.setFieldsValue({
      // intial_name: "",
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

  //ok
  const handleOk = () => {
    setIsFilterModalOpen(true);
    setaddModal(false);
  };

  //delete client api
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

  //filter button modal
  const openFilterModel = () => {
    setIsFilterModalOpen(true);
  };
  //add button modal
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
      if (filterData) {
        reqBody.isActivate = filterData.status == "Active" ? true : false;
        reqBody.user_id = filterData.client;
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

  //columns
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
        // }
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
            // onConfirm={() => deleteProject(record?._id)}
            onConfirm={ () => handleDelete(record) }
          >
            <DeleteOutlined className="edit-btn" style={ { color: "red" } } />
          </Popconfirm>
        </div>
      ),
    },
  ];

  //footer details
  const getFooterDetails = () => {
    return (
      <label>
        Total Records Count is { pagination.total > 0 ? pagination.total : 0 }
      </label>
    );
  };
  //pagination
  const handleTableChange = (page, filters, sorter) => {
    setPagination({ ...pagination, ...page });
    const { field, order } = sorter;
    setPagination({ ...pagination, ...page });
    setSortBy({
      sortBy: order === "ascend" ? "asc" : "desc",
      sort: field,
    });
  };

  //client listing
  const getClientList = async () => {
    try {
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

      if (filterData) {
        reqBody.user_id = filterData.client;
      }
      if (filterData?.status) {
        reqBody.isActivate = filterData.status == "Active" ? true : false;
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
    }
  };

  //emp dropdown
  const getMasterClient = async () => {
    const reqBody = {
      isDropdown: false,
    };
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getclient,
        body: reqBody,
      });

      if (response?.data && response?.data?.data) {
        setClient(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getMasterClient();
  }, [addModal]);

  useEffect(() => {
    getClientList();
  }, [
    filterData,
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

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  //fiter modal onFinish function
  const filterEmp = async (values) => {
    setFilterData(values);
    setIsFilterModalOpen(false);
  };

  //reset of filter form
  const onReset = () => {
    formData.resetFields();
    setFilterData(null);
  };

  return (
    <>
      <div className="profile-sub-head global-search clint-module">
        <div className="head-box-inner">

          <Search
            ref={ searchRef }
            placeholder="Search..."
            className="client-search-bar"
            onSearch={ onSearch }
            onChange={ (e) => {
              setPagination({ ...pagination, current: 1 });
            } }
            onKeyUp={ resetSearchFilter }
          />
          <div className="filter-btn-wrapper">
            <Button onClick={ openAddModal } type="primary" className="btn">
              <i className="fi fi-rr-plus-small"></i> Add
            </Button>
            <Button onClick={ openFilterModel } className="filter-btn">
              Filter
            </Button>
            <Button
              className="ant-delete"
              onClick={ () => {
                formData.resetFields();
                setFilterData(null);
              } }
              disabled={ filterData != null ? false : true }
            >
              Clear Filter
            </Button>

            <Button
              className="mr2 export-btn"
              id="exportButton"
              disabled={ pagination.total != 0 ? false : true }
              onClick={ exportCSV }
            >
              Export CSV
            </Button>
          </div>
        </div>
      </div>
      <div className="block-table-content client-table-block">
        <Table
          columns={ columns1 }
          pagination={ {
            showSizeChanger: true,
            ...pagination,
          } }
          footer={ getFooterDetails }
          onChange={ handleTableChange }
          dataSource={ clientList }
        />
      </div>

      {/* add edit button modal */ }
      <Modal
        className="add-and-edit-client"
        open={ addModal }
        width={ 1000 }
        footer={ false }
        onOk={ handleOk }
        onCancel={ handleCancel }
      >
        <div className="modal-header ">
          <h1>{ modalMode === "add" ? "Add Client" : "Edit Client" }</h1>
        </div>
        <div className="filter-pop-wrapper">
          <Row>
            <Col span={ 24 }>
              <Form
                form={ addemployee }
                { ...formItemLayout }
                onFinish={ (values) => {
                  modalMode === "add" ? addemp(values) : UpdateClient(values);
                } }
              >
                <div className="edit-clint-pop">
                  <Row>
                    <Col sm={ 24 } lg={ 12 }>
                      <div>
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
                        <Form.Item label="Extra Info" name="extra_details">
                          <TextArea />
                        </Form.Item>
                      </div>
                    </Col>
                    <Col sm={ 24 } lg={ 12 }>
                      <div>
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
                      </div>
                    </Col>
                  </Row>
                  <div className="add-btn-wrapper">
                    <Button type="primary" htmlType="submit">
                      { modalMode === "add" ? "Add" : "Save" }
                    </Button>
                    <Button
                      className="ant-delete"
                      type="primary"
                      onClick={ handleCancel }
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Form>
            </Col>
          </Row>
        </div>
      </Modal>

      {/* filter modal */ }
      <Modal
        title="Filter"
        width={ 1000 }
        open={ isFilterModalOpen }
        footer={ false }
        onOk={ handleOk }
        onCancel={ handleCancel }
      >
        <div className="filter-pop-wrapper">
          <Row>
            <Col span={ 24 }>
              <Form form={ formData } { ...formItemLayout } onFinish={ filterEmp }>
                <div className="inout-employee">
                  <Row>
                    <Col sm={ 24 } lg={ 12 }>
                      <div>
                        <Form.Item label="Clients" name="client">
                          <Select
                            size="large"
                            showSearch
                            filterOption={ (input, option) =>
                              option?.children
                                .toLowerCase()
                                .indexOf(input.toLowerCase()) >= 0
                            }
                            filterSort={ (optionA, optionB) =>
                              optionA?.children
                                .toLowerCase()
                                .localeCompare(optionB?.children?.toLowerCase())
                            }
                            onChange={ (e) => {
                              let data = client.filter((val) => val._id == e);
                              formData.setFieldsValue({
                                client: data[0]?._id,
                              });
                            } }
                          >
                            { client.map((item, index) => (
                              <option
                                key={ index }
                                value={ item?._id }
                                style={ { textTransform: "capitalize" } }
                              >
                                { item?.full_name }
                              </option>
                            )) }
                          </Select>
                        </Form.Item>
                      </div>
                    </Col>
                    <Col sm={ 24 } lg={ 12 }>
                      <div>
                        <Form.Item label="Status" name="status">
                          <Select
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
                      </div>
                    </Col>
                  </Row>
                  <div className="filter-btn-wrapper">
                    <Button
                      className="ant-btn-primary"
                      type="primary"
                      htmlType="submit"
                    >
                      Apply
                    </Button>
                    <Button type="primary" onClick={ onReset }>
                      Reset
                    </Button>
                    <Button
                      type="primary"
                      onClick={ handleCancel }
                      className="ant-delete"
                    >
                      Cancel
                    </Button>
                  </div>{ " " }
                </div>
              </Form>
            </Col>
          </Row>
        </div>
      </Modal>
    </>
  );
};

export default EmployeeListTabClient;
