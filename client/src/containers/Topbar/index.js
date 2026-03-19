import React, { useCallback, useEffect, useRef, useState } from "react";
import { Layout, Form } from "antd";
import { useDispatch } from "react-redux";
import { SearchOutlined } from "@ant-design/icons";
import UserProfile from "../Sidebar/UserProfile";
import ProjectListModal from "../../components/Modal/ProjectListModal";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import "./Topbar.css";

const { Header } = Layout;

function Topbar() {
  const companySlug = typeof localStorage !== "undefined" ? localStorage.getItem("companyDomain") : "";
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [recentList, setRecentList] = useState([]);
  const [isProjectListLoading, setIsProjectListLoading] = useState(false);
  const [isRecentListLoading, setIsRecentListLoading] = useState(false);
  const projectRequestRef = useRef(null);
  const recentRequestRef = useRef(null);

  const getProjectList = useCallback(async ({ forceRefresh = false, useLoader = false } = {}) => {
    const cacheKey = "sidebar_project_list_search_modal_v2";

    if (!forceRefresh) {
      const cachedProjects = sessionStorage.getItem(cacheKey);
      if (cachedProjects) {
        try {
          const parsedProjects = JSON.parse(cachedProjects);
          if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
            setProjectList(parsedProjects);
          }
        } catch (error) {
          sessionStorage.removeItem(cacheKey);
        }
      }
    }

    if (projectRequestRef.current) {
      return projectRequestRef.current;
    }

    setIsProjectListLoading(true);

    try {
      if (useLoader) {
        dispatch(showAuthLoader());
      }

      projectRequestRef.current = Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListForSearch,
        body: {
          pageNo: 1,
          limit: 500,
          sortBy: "desc",
          filterBy: "all",
        },
      });
      const response = await projectRequestRef.current;

      if (useLoader) {
        dispatch(hideAuthLoader());
      }

      if (Array.isArray(response?.data?.data)) {
        setProjectList(response.data.data);
        sessionStorage.setItem(cacheKey, JSON.stringify(response.data.data));
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    } finally {
      projectRequestRef.current = null;
      setIsProjectListLoading(false);
    }
  }, [dispatch]);

  const getVisitedData = useCallback(async () => {
    if (recentRequestRef.current) {
      return recentRequestRef.current;
    }

    setIsRecentListLoading(true);
    try {
      recentRequestRef.current = Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getrecentVisited,
      });
      const response = await recentRequestRef.current;
      if (response?.data?.statusCode === 200) {
        setRecentList(response.data.data);
      }
    } catch (error) {
      console.log("get project error");
    } finally {
      recentRequestRef.current = null;
      setIsRecentListLoading(false);
    }
  }, []);

  const addVisitedData = async (projectId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addrecentVisited,
        body: { project_id: projectId },
      });
      if (response?.data?.statusCode === 200) {
        dispatch(hideAuthLoader());
      }
    } catch (error) {
      console.log("add project error");
    }
  };

  const removeVisitedData = async (recentId) => {
    try {
      setRecentList((prev) => prev.filter((item) => item._id !== recentId));
      await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.removerecentVisited,
        body: { recent_id: recentId },
      });
    } catch (error) {
      console.log("remove recent project error");
      getVisitedData();
    }
  };

  const showModal = async () => {
    setIsModalOpen(true);
    getProjectList({ useLoader: projectList.length === 0 });
    getVisitedData();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  useEffect(() => {
    getProjectList();
    getVisitedData();
  }, [getProjectList, getVisitedData]);

  return (
    <>
      <Header className="top-header top-header-icons weekmate-header taskpad-header weekmate-header-shell">
        <div className="weekmate-header-card">
          <div className="weekmate-header-left">
          <div className="weekmate-header-title">
            {companySlug ? companySlug.replace(/-/g, " ") : "Demo Tech"}
          </div>
        </div>
          <div className="weekmate-header-right">
            <button type="button" className="weekmate-navbar-search-btn" onClick={showModal}>
              <SearchOutlined />
              <span>Search</span>
            </button>
            <UserProfile />
          </div>
        </div>
      </Header>

      <ProjectListModal
        projectList={projectList}
        recentList={recentList}
        isProjectListLoading={isProjectListLoading}
        isRecentListLoading={isRecentListLoading}
        isModalOpen={isModalOpen}
        handleCancel={handleCancel}
        addVisitedData={addVisitedData}
        removeVisitedData={removeVisitedData}
        setIsModalOpen={setIsModalOpen}
        form={form}
      />
    </>
  );
}

export default Topbar;
