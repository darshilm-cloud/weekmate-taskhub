import React, { useState } from "react";
import Service from "../../../service";
import MyAvatar from "../../../components/Avatar/MyAvatar";
import moment from "moment";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";

const ProjectTrashController = () => {
  const [pagination] = useState({
    current: 1,
    pageSize: 30,
  });

  const dispatch = useDispatch();

  const getProjectTrash = async (callback) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        // search: searchText,
        sortBy: "desc",
        sort: "deletedAt",
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.trashProjects,
        body: reqBody,
      });
      if (response?.data && response?.data?.data) {
        if (callback) {
          callback(response.data.data);
        }
      }
      dispatch(hideAuthLoader());
    } catch (error) {
      console.log(error);
    } finally {
      dispatch(hideAuthLoader());
    }
  };
  const ProjectTrashColumns = [
    {
      title: "Project",
      dataIndex: "projectTitle",
      key: "projectTitle",
      render: (text, record) => {
        const Title = record?.title;
        return (
          <div className="project_title_main_div">
            <span style={{ textTransform: "capitalize" }}>{Title}</span>
          </div>
        );
      },
    },

    {
      title: "Deleted By",
      dataIndex: "Deleted by",
      key: "Deleted by",
      render: (text, record) => {
        return (
          <MyAvatar
            userName={record?.deletedBy?.full_name || "-"}
            src={record?.deletedBy?.emp_img}
            key={record?.deletedBy?._id}
            alt={record?.deletedBy?.full_name}
          />
        );
      },
    },
    {
      title: "Deleted At",
      dataIndex: "date",
      key: "date",
      render: (_, record) => {
        const deletedAt = moment(record?.deletedAt).format(
          "DD MMM YY, hh:mm A"
        );

        return <span>{deletedAt}</span>;
      },
    },
  ];
  return {
    getProjectTrash,
    ProjectTrashColumns,
  };
};

export default ProjectTrashController;
