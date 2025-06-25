import {
  Table,
  Button,
  Input,
  Form,
  Row,
  Modal,
  Col,
  Select,
  message,
} from "antd";
import React, { useState, useEffect, useRef } from "react";
import { ApiOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import Service from "../../service";
import { showAuthLoader, hideAuthLoader } from "../../appRedux/actions/Auth";
import { removeTitle } from "../../util/nameFilter";

const EmployeeListTabUsers = () => {
  const Search = Input.Search;
  const searchRef = useRef();
  const [formData] = Form.useForm();
  const [addemployee] = Form.useForm();
  const dispatch = useDispatch();
  const { Option } = Select;

  const [seachEnabled, setSearchEnabled] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("desc");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });
  const [userlist, setUserList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterData, setFilterData] = useState(null);
  const [designationList, setDesignationList] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [employee, setEmployee] = useState([]);

  useEffect(() => {
    getDepartmentList();
    getDesignationList();
    getEmployeeList();
  }, []);

  const getDesignationList = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getDesignationList,
      });

      if (response?.data && response?.data?.data) {
        setDesignationList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getDepartmentList = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getDepartmentList,
      });

      if (response?.data && response?.data?.data) {
        setDepartmentList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getEmployeeList = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployeeList,
      });

      if (response?.data && response?.data?.data) {
        setEmployee(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onReset = () => {
    formData.resetFields();
    setFilterData(null);
  };

  const filterEmp = async (values) => {
    setFilterData(values);
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
    formData.resetFields();
    addemployee.resetFields();
  };
  const handleOk = () => {
    setIsModalOpen(true);
  };
  const openFilterModel = () => {
    setIsModalOpen(true);
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

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "full_name",
      render: (text, record) => {
        const full_name = record.full_name;
        return (
          <span style={{ textTransform: "capitalize" }}>
            {removeTitle(full_name)}
          </span>
        );
      },
    },
    {
      title: "EMP Code",
      key: "emp_code",
      render: (text, record) => {
        const position = record?.emp_code;
        return <span style={{ textTransform: "capitalize" }}>{position}</span>;
      },
    },
    {
      title: "Designation",
      dataIndex: "designation",
      key: "designation_name",
      render: (text, record) => {
        const position = record?.designation_name;
        return <span style={{ textTransform: "capitalize" }}>{position}</span>;
      },
    },
    {
      title: "Role",
      dataIndex: "role_name",
      key: "role_name",
      render: (text, record) => {
        return <span>{record?.pms_role?.role_name}</span>;
      },
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department_name",
      render: (text, record) => {
        const position = record?.department_name;
        return <span style={{ textTransform: "capitalize" }}>{position}</span>;
      },
    },
    {
      title: "Actions",
      dataIndex: "action",
      render: (text, record) => (
        <div
          style={{
            display: "flex",
            flexwrap: "wrap",
          }}
        >
          <Link to={`roles-permission/${record._id}`}>
            <ApiOutlined props={record._id} />
          </Link>
        </div>
      ),
    },
  ];

  const getFooterDetails = () => {
    return (
      <label>
        Total Records Count is {pagination.total > 0 ? pagination.total : 0}
      </label>
    );
  };

  const handleTableChange = (page, filters, sorter) => {
    setPagination({ ...pagination, ...page });
    const { field, order } = sorter;
    setPagination({ ...pagination, ...page });
    setSortBy({
      sortBy: order === "ascend" ? "asc" : "desc",
      sort: field,
    });
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

      if (filterData?.employee) {
        reqBody.emp_id = filterData.employee;
      }
      if (filterData?.department_id) {
        reqBody.department_id = filterData.department_id;
      }
      if (filterData?.designation_id) {
        reqBody.designation_id = filterData.designation_id;
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsermaster,
        body: reqBody,
      });
      const exportButton = document.getElementById("exportButton");
      if (response?.data?.data) {
        let base64 = response.data.data;
        const linkSource = "data:text/csv;base64," + base64;
        const downloadLink = document.createElement("a");
        const fileName = "Users Employees.csv";
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

  const getUserList = async () => {
    try {
      dispatch(showAuthLoader());

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

      if (filterData?.employee) {
        reqBody.emp_id = filterData.employee;
      }
      if (filterData?.department_id) {
        reqBody.department_id = filterData.department_id;
      }
      if (filterData?.designation_id) {
        reqBody.designation_id = filterData.designation_id;
      }
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsermaster,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data?.length > 0) {
        setPagination((prevPagination) => ({
          ...prevPagination,
          total: response.data.metadata.total,
        }));

        setUserList(response.data.data);
      } else {
        setUserList([]);
        setPagination((prevPagination) => ({ ...prevPagination, total: 0 }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getUserList();
  }, [
    filterData,
    searchText,
    sortBy.sort,
    sortBy.sortBy,
    pagination.current,
    pagination.pageSize,
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

  return (
    <>
      <div className="profile-sub-head employee-module">
        <div className="head-box-inner">
          <Search
            ref={searchRef}
            placeholder="Search..."
            onSearch={onSearch}
            onKeyUp={resetSearchFilter}
            style={{ width: 200 }}
            onChange={(e) => {
              setPagination({ ...pagination, current: 1 });
            }}
          />
          <Button onClick={openFilterModel} className="filter-btn">
            Filter
          </Button>
          <Button
            className="ant-delete"
            onClick={() => {
              formData.resetFields();
              setFilterData(null);
            }}
            disabled={filterData != null ? false : true}
          >
            Clear Filter
          </Button>

          <Button
            className="mr2 export-btn"
            id="exportButton"
            disabled={pagination.total != 0 ? false : true}
            onClick={exportCSV}
          >
            Export CSV
          </Button>
        </div>
      </div>
      <div className="block-table-content">
        <Table
          columns={columns}
          pagination={{
            showSizeChanger: true,
            ...pagination,
          }}
          footer={getFooterDetails}
          onChange={handleTableChange}
          dataSource={userlist}
        />
      </div>

      <Modal
        title="Filter"
        width={1000}
        open={isModalOpen}
        footer={false}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <div className="filter-pop-wrapper">
          <Row>
            <Col span={24}>
              <Form form={formData} {...formItemLayout} onFinish={filterEmp}>
                <div className="inout-employee">
                  <Row>
                    <Col sm={24} lg={12}>
                      <div className="filter-employeelist">
                        <Form.Item label="Employee code" name="employee_code">
                          <Select
                            size="large"
                            showSearch
                            filterOption={(input, option) =>
                              option.children
                                .toLowerCase()
                                .indexOf(input.toLowerCase()) >= 0
                            }
                            filterSort={(optionA, optionB) =>
                              optionA.children
                                .toLowerCase()
                                .localeCompare(optionB.children.toLowerCase())
                            }
                            onChange={(e) => {
                              let data = employee.filter(
                                (val) => val.emp_code == e
                              );
                              formData.setFieldsValue({
                                employee: data[0]?._id,
                              });
                            }}
                          >
                            {employee.map((item, index) => (
                              <Option
                                key={index}
                                value={item?.emp_code}
                                style={{ textTransform: "capitalize" }}
                              >
                                {item?.emp_code}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item label="Designation" name="designation_id">
                          <Select
                            size="large"
                            showSearch
                            filterOption={(input, option) =>
                              option.children
                                .toLowerCase()
                                .indexOf(input.toLowerCase()) >= 0
                            }
                            filterSort={(optionA, optionB) =>
                              optionA.children
                                .toLowerCase()
                                .localeCompare(optionB.children.toLowerCase())
                            }
                          >
                            {designationList.map((item, index) => (
                              <>
                                <Option
                                  key={index}
                                  value={item._id}
                                  style={{ textTransform: "capitalize" }}
                                >
                                  {item.designation_name}
                                </Option>
                              </>
                            ))}
                          </Select>
                        </Form.Item>
                      </div>
                    </Col>
                    <Col sm={24} lg={12}>
                      <div>
                        <Form.Item label="Employee" name="employee">
                          <Select
                            size="large"
                            showSearch
                            filterOption={(input, option) =>
                              option.children
                                .toLowerCase()
                                .indexOf(input.toLowerCase()) >= 0
                            }
                            filterSort={(optionA, optionB) =>
                              optionA.children
                                .toLowerCase()
                                .localeCompare(optionB.children.toLowerCase())
                            }
                            onChange={(e) => {
                              let data = employee.filter((val) => val._id == e);
                              formData.setFieldsValue({
                                employee_code: data[0]?.emp_code,
                              });
                            }}
                          >
                            {employee.map((item, index) => (
                              <Option
                                key={index}
                                value={item?._id}
                                style={{ textTransform: "capitalize" }}
                              >
                                {removeTitle(item.full_name)}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Form.Item label="Department" name="department_id">
                          <Select
                            size="large"
                            showSearch
                            filterOption={(input, option) =>
                              option.children
                                .toLowerCase()
                                .indexOf(input.toLowerCase()) >= 0
                            }
                            filterSort={(optionA, optionB) =>
                              optionA.children
                                .toLowerCase()
                                .localeCompare(optionB.children.toLowerCase())
                            }
                          >
                            {departmentList.map((item, index) => (
                              <Option
                                key={index}
                                value={item._id}
                                style={{ textTransform: "capitalize" }}
                              >
                                {item.department_name}
                              </Option>
                            ))}
                          </Select>
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
                    <Button type="primary" onClick={onReset}>
                      Reset
                    </Button>
                    <Button
                      type="primary"
                      onClick={handleCancel}
                      className="ant-delete"
                    >
                      Cancel
                    </Button>
                  </div>{" "}
                </div>
              </Form>
            </Col>
          </Row>
        </div>
      </Modal>
    </>
  );
};

export default EmployeeListTabUsers;
