import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import { message } from "antd";

const PositiveReviewController = () => {
  const [technologyList, setTechnologyList] = useState([]);
  const [projectManagerList, setProjectManagerList] = useState([]);
  const [projectTypeList, setProjectTypeList] = useState([]);
  const [searchTechnology, setsearchTechnology] = useState("");
  const [searchManager, setsearchManager] = useState("");
  const [searchProject, setsearchProject] = useState("");
  const [technology, setTechnology] = useState([]);
  const [manager, setManager] = useState([]);
  const [accontManager, setAccountManager] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState([]);
  const [searchAccountManager, setSearchAccountManager] = useState("");
  const [reviewList, setReviewList] = useState([]);
  const [priority, setPriority] = useState("");
  const [feedBackTypeFilter, setFeedBackTypeFilter] = useState("");
  const [isModalOpenTopic, setIsModalOpenTopic] = useState(false);
  const [feedBackDetails, setFeedBackDetails] = useState([]);

  const [status, setStatus] = useState("");

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });

  const [popOver, setPopOver] = useState({
    project: false,
    manager: false,
    technology: false,
    accontManager: false,
    type: false,
    priority: false,
    status: false,
    feedBackType: false,
  });

  const dispatch = useDispatch();

  useEffect(() => {
    getTechnologyList();
    getManager();
    getProjectType();
    getProjects();
  }, []);

  useEffect(() => {
    getReviewList();
  }, [pagination.current, pagination.pageSize]);

  const handleVisibleChange = (key, visible) => {
    if (!visible) {
      setPopOver((prevState) => ({
        ...prevState,
        [key]: visible,
      }));
    } else {
      setPopOver((prevState) => ({
        ...prevState,
        [key]: !prevState[key],
      }));
    }
  };

  const handleFilters = (val, state, setState) => {
    if (val === "") {
      setState([]);
    } else {
      if (state.includes(val._id)) {
        setState(state.filter((id) => id !== val._id));
      } else {
        setState([...state, val._id]);
      }
    }
  };

  const handleFeedBackTypeFilter = (e) => {
    const value = e.target.value;
    setFeedBackTypeFilter(value);
  };

  const handlePriorityFilter = (e) => {
    const value = e.target.value;
    setPriority(value);
  };

  const handleStatusFilter = (e) => {
    const value = e.target.value;
    setStatus(value);
  };

  const handleSearchTechnology = (e) => {
    setsearchTechnology(e.target.value);
  };

  const handleSearchManager = (e) => {
    setsearchManager(e.target.value);
  };

  const handleSearchProjects = (e) => {
    setsearchProject(e.target.value);
  };
  const handleSearchAccountManager = (e) => {
    setSearchAccountManager(e.target.value);
  };

  const handleTableChange = (page) => {
    setPagination({ ...pagination, ...page });
  };

  // get tech list
  const getTechnologyList = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getprojectTech,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setTechnologyList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteComplaints = async (id) => {
    try {
      dispatch(showAuthLoader());
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteComplaint + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        message.success(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  //get my project list
  const getProjects = async () => {
    try {
      dispatch(showAuthLoader());

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjects(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get manager list
  const getManager = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getProjectManager,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectManagerList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };
  // get projecttype list
  const getProjectType = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectListing,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setProjectTypeList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get review list
  const getReviewList = async () => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        project_id: selectedProject,
        technology: technology,
        manager_id: manager,
        acc_manager_id: accontManager,
        feedback_type: feedBackTypeFilter,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getReviewList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setReviewList(response?.data?.data);
        setPagination({
          ...pagination,
          total: response?.data?.metadata.total,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getReviewById = async (reviewId) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        _id: reviewId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getReviewList,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setFeedBackDetails(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteReview = async (deleteId) => {
    try {
      dispatch(showAuthLoader());
      const params = `/${deleteId}`;

      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteReview + params,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        getReviewList();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const filteredTechnologyList = technologyList.filter((item) =>
    item?.project_tech?.toLowerCase()?.includes(searchTechnology?.toLowerCase())
  );

  const filteredManagerList = projectManagerList.filter((item) =>
    item?.manager_name?.toLowerCase()?.includes(searchManager?.toLowerCase())
  );

  const filteredProjectsList = projects.filter((item) =>
    item?.title?.toLowerCase()?.includes(searchProject?.toLowerCase())
  );

  const filteredAccManagerList = projectManagerList.filter((item) =>
    item?.manager_name
      ?.toLowerCase()
      ?.includes(searchAccountManager?.toLowerCase())
  );
  return {
    technologyList,
    setTechnologyList,
    projectManagerList,
    setProjectManagerList,
    projectTypeList,
    setProjectTypeList,
    popOver,
    setPopOver,
    handleVisibleChange,
    filteredTechnologyList,
    handleSearchTechnology,
    searchTechnology,
    setsearchTechnology,
    technology,
    setTechnology,
    handleFilters,
    filteredManagerList,
    handleSearchManager,
    searchManager,
    setsearchManager,
    manager,
    setManager,
    accontManager,
    setAccountManager,
    projects,
    setProjects,
    searchProject,
    handleSearchProjects,
    filteredProjectsList,
    selectedProject,
    setSelectedProject,
    handleSearchAccountManager,
    searchAccountManager,
    setSearchAccountManager,
    filteredAccManagerList,
    reviewList,
    setReviewList,
    handleTableChange,
    pagination,
    setPagination,
    handlePriorityFilter,
    priority,
    handleStatusFilter,
    status,
    deleteComplaints,
    feedBackTypeFilter,
    handleFeedBackTypeFilter,
    getReviewList,
    isModalOpenTopic,
    setIsModalOpenTopic,
    getReviewById,
    feedBackDetails,
    setFeedBackDetails,
    deleteReview,
  };
};

export default PositiveReviewController;