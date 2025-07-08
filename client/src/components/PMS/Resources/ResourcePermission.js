import { Card, Table, Radio } from "antd";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Service from "../../../service";
import PropTypes from "prop-types";
import { showAuthLoader, hideAuthLoader } from "../../../appRedux/actions";
import { Link } from "react-router-dom";
import { ArrowLeftOutlined } from "@ant-design/icons";
import "./ResourcePermission.css";

function ResourcePermission(props) {
  const companySlug = localStorage.getItem("companyDomain");
  const dispatch = useDispatch();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [empData, setEmpData] = useState([]);

  useEffect(() => {
    getUserResourceDetails();
  }, []);

  const columns = [
    {
      title: "Roles",
      dataIndex: "name",
      key: "name",
      render: (text, record) => {
        return (
          <span style={{ textTransform: "capitalize" }}>{record.name}</span>
        );
      },
    },
    {
      title: "Permissions",
      dataIndex: "isAccess",
      key: "isAccess",
      render: (_, record) => (
        <Radio.Group
          onChange={e => handleModuleToggle(e)}
          value={record.isAccess ? record?._id : null}
        >
          <Radio defaultChecked={false} value={record?._id}></Radio>
        </Radio.Group>
      ),
    },
  ];

  const getUserResourceDetails = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.empRoles}/${props.match.params.id}`,
      });
      if (response?.data?.data?.length > 0) {
        setEmpData(response.data.data);
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    }
  };

  const handleModuleToggle = async event => {
    const payload = {
      user_id: props.match.params.id,
      pms_role_id: event.target.value,
    };

    const response = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.updateRoles,
      body: payload,
    });
    if (response.data.status === 200) {
      getUserResourceDetails();
    } else {
      getUserResourceDetails();
    }
  };

  const handleTableChange = page => {
    setPagination({ ...pagination, ...page });
  };

  // empData.map(value => {
  //   if (value.isAccess == true) {
  //     return value._id;
  //   }
  // });

  return (
    <div className="taskhub-wrapper">
      <Card
        title={
          <>
            <Link to={`/${companySlug}/project-users`}>
              <ArrowLeftOutlined style={{ color: "black" }} />
            </Link>
            &nbsp; Roles Permission
          </>
        }
      >
        <Table
          columns={columns}
          pagination={false}
          footer={false}
          onChange={handleTableChange}
          dataSource={empData}
        />
      </Card>
    </div>
  );
}

ResourcePermission.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default ResourcePermission;
