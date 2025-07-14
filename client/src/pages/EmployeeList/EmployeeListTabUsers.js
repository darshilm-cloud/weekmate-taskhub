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
  const companySlug = localStorage.getItem("companyDomain");

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

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "full_name",
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
      render: (text, record) => {
        return <span>{ record?.email }</span>;
      },
    },
   
    {
      title: "Role",
      dataIndex: "role_name",
      key: "role_name",
      render: (text, record) => {
        return <span>{ record?.pms_role?.role_name }</span>;
      },
    },
   
    {
      title: "Actions",
      dataIndex: "action",
      render: (text, record) => (
        <div
          style={ {
            display: "flex",
            flexwrap: "wrap",
          } }
        >
          <Link to={ `/${companySlug}/roles-permission/${record._id}` }>
            <ApiOutlined props={ record._id } />
          </Link>
        </div>
      ),
    },
  ];

  const getFooterDetails = () => {
    return (
      <label>
        Total Records Count is { pagination.total > 0 ? pagination.total : 0 }
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
      <div className="profile-sub-head  global-search  employee-module">

        <Search
          ref={ searchRef }
          placeholder="Search..."
          onSearch={ onSearch }
          onKeyUp={ resetSearchFilter }
          style={ { width: 200 } }
          onChange={ (e) => {
            setPagination({ ...pagination, current: 1 });
          } }
        />
        <div className="filter-btn-wrapper">

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

      <div className="block-table-content">
        <Table
          columns={ columns }
          pagination={ {
            showSizeChanger: true,
            ...pagination,
          } }
          footer={ getFooterDetails }
          onChange={ handleTableChange }
          dataSource={ userlist }
        />
      </div>
    </>
  );
};

export default EmployeeListTabUsers;
