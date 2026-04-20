import React, { useState } from "react";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import Service from "../../../service";
import MyAvatar from "../../../components/Avatar/MyAvatar";
import moment from "moment";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";

const TaskTrashController = () => {
  const companySlug = localStorage.getItem("companyDomain");
  
  const [pagination] = useState({
    current: 1,
    pageSize: 30,
  });
  const dispatch = useDispatch();

  const TaskTrashColumns = [
    {
      title: "Project",
      dataIndex: "projectTitle",
      key: "projectTitle",
      render: (text, record) => {
        const Title = record?.project?.title;
        const ProjectId = record?.project?._id;
        return (
          <Link to={`/${companySlug}/project/app/${ProjectId}?tab=Tasks`}>
          <div className="project_title_main_div">
            <span style={{ textTransform: "capitalize" }}>{Title}</span>
          </div></Link>
        );
      },
    },

    {
      title: "Task",
      dataIndex: "task",
      key: "task",
      render: (text, record) => {
        const names = record.title ? record.title : "-";
        return <span>{names}</span>;
      },
    },
    {
      title: "Deleted By",
      dataIndex: "Deleted by",
      key: "Deleted by",
      render: (text, record) => {
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MyAvatar
              userName={record?.deletedBy?.full_name || "-"}
              src={record?.deletedBy?.emp_img}
              key={record?.deletedBy?._id}
              alt={record?.deletedBy?.full_name}
            />
            <span style={{ color: "inherit" }}>{record?.deletedBy?.full_name || "-"}</span>
          </div>
        );
      },
    },
    {
      title: "Deleted At",
      dataIndex: "date",
      key: "date",
      render: (_, record) => {
        const val =
          record?.deletedAt !== "" && record?.deletedAt !== null
            ? moment(record?.deletedAt).format("DD-MM-YYYY")
            : "-";

        return <span>{val}</span>;
      },
    },
  ];

  const getTaskTrash = async (callback) => {
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
        api_url: Service.trashTasks,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        if (callback) {
          callback(response.data.data);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      dispatch(hideAuthLoader());
    }
  };
  return { getTaskTrash, TaskTrashColumns };
};

export default TaskTrashController;
