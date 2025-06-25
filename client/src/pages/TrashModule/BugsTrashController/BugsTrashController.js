import React, { useState } from "react";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import Service from "../../../service";
import MyAvatar from "../../../components/Avatar/MyAvatar";
import moment from "moment";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";
const BugsTrashController = () => {
  const dispatch = useDispatch();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 30,
  });
  const getBugTrash = async (callback) => {
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
        api_url: Service.trashBugs,
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
  const BugsTrashColumns = [
    {
      title: "Project",
      dataIndex: "projectTitle",
      key: "projectTitle",
      render: (text, record) => {
        const Title = record?.project?.title;
        const ProjectId = record?.project?._id;
        const color = record?.color;
        return (
          <Link to={`project/app/${ProjectId}?tab=Tasks`}>
          <div className="project_title_main_div">
            <span style={{ textTransform: "capitalize" }}>{Title}</span>
          </div>
          </Link>
        );
      },
    },

    {
      title: "Bugs",
      dataIndex: "bugs",
      key: "bugs",
      render: (text, record) => {
        const names = record.title ? record.title : "-";
        return <span>{names}</span>;
      },
    },

    {
      title: "Deleted By",
      dataIndex: "Deleted by",
      width: 200,
      key: "Deleted by",
      render: (text, record) => {
        return (
          <MyAvatar
            userName={record?.deletedBy?.full_name || "-"}
            src={record?.deletedBy?.emp_img}
            key={record.deletedBy?._id}
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
  return { getBugTrash, BugsTrashColumns };
};

export default BugsTrashController;
