import React, { useState } from "react";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import Service from "../../../service";
import MyAvatar from "../../../components/Avatar/MyAvatar";
import moment from "moment";
import { hideAuthLoader, showAuthLoader } from "../../../appRedux/actions";
import { useDispatch } from "react-redux";

const DiscussionTrash = () => {
  const companySlug = localStorage.getItem("companyDomain");
  const dispatch = useDispatch();

  const [pagination] = useState({
    current: 1,
    pageSize: 30,
  });

  const getDiscussionTrash = async (callback) => {
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
        api_url: Service.trashDiscussion,
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

  const DiscussionTrashColumns = [
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
          </div>
          </Link>
        );
      },
    },

    {
      title: "Discussion",
      dataIndex: "discussionTitle",
      key: "discussionTitle",
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
        const deletedAt = moment(record?.deletedAt).format(
          "DD MMM YY, hh:mm A"
        );

        return <span>{deletedAt}</span>;
      },
    },
  ];

  return { DiscussionTrashColumns, getDiscussionTrash };
};

export default DiscussionTrash;
