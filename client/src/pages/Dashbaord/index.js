import React, { useState } from "react";
import "./dashboard.css";
import DashboardController from "./DashboardController";
import {
  Button,
  Checkbox,
  Form,
  Input,
  Popover,
  Radio,
  Tooltip,
  Progress,
} from "antd";
import { DatePicker } from "antd";
import { Link } from "react-router-dom";
import { StarFilled } from "@ant-design/icons";
import { StarOutlined } from "@ant-design/icons";
import moment from "moment";
import { calculateTimeDifference } from "../../util/formatTimeDifference";
import { removeTitle } from "../../util/nameFilter";
import ProjectListModal from "../../components/Modal/ProjectListModal";
import MyAvatar from "../../components/Avatar/MyAvatar";


const index = () => {
  const {
    showFiltersProject,
    handleFiltersProject,
    handleCategory,
    handleStatus,
    handleProjects,
    handleTaskStatus,
    handleBugStatus,
    statusList,
    categoryList,
    timeOfDay,
    firstName,
    empImage,
    fullName,
    showLoggedTimeFiltrs,
    setShowLoggedTimeFiltrs,
    showTasksiltrs,
    setTasksFiltrs,
    showBugsFiltrs,
    setShowBugsFiltrs,
    isModalOpen,
    setIsModalOpen,
    onSearch,
    projectDetails,
    handleCancel,
    form,
    showModal,
    myProj,
    myTask,
    myBug,
    myTime,
    myProjects,
    myTasks,
    myBugs,
    myLoggedTime,
    getDateFormatted,
    handleCancelProjectCategory,
    handleCancelProjectStatus,
    formatTimeDifference,
    handleCancelTaskProject,
    taskStatus,
    bugStatus,
    setPopOver,
    popOver,
    handleVisibleChange,
    handleChangeDate,
    dates,
    projStatus,
    setProjStatus,
    category,
    setCategory,
    projects,
    setProjects,
    projectsTime,
    setprojectsTime,
    projectsBug,
    setProjectsBug,
    searchCategory,
    handleSearchCategory,
    filteredCategoryList,
    searchTaskProject,
    handleSearchTaskProject,
    filteredTaskProjectList,
    filteredTimeProjectList,
    filteredBugProjectList,
    handleSearchTimeProject,
    handleSearchBugProject,
    searchTimeProject,
    searchBugProject,
    handleFilters,
    handleBookmark,
    listId,
    history,
    getProjectMianTask,
    addVisitedData,
    recentList,
    getProjectListing,
    currentMonth,
    totalLoggedProgress,
  } = DashboardController();

  const companySlug = localStorage.getItem("companyDomain");

  const hours = totalLoggedProgress?.data2?.total_time
    ? totalLoggedProgress?.data2?.total_time.split(":")[0]
    : "0";

  const loggedPercentageValue = parseFloat(
    totalLoggedProgress?.loggedPercentage
  );

  return (
    <div className="main-dashboard-wrapper">
      { console.log(
        totalLoggedProgress,
        "totalLoggedProgress",
        totalLoggedProgress?.data2?.total_time
      ) }
      <div className="container">
        <div className="profileNameAndImg d-flex">
          <div className="image-and-name-div">
            <div className="profile-img">
              <MyAvatar
                userName={ fullName }
                alt={ fullName }
                src={ empImage }
                isThumbnail={ false }
              />
            </div>
            <div className="profile-name">
              <h2>
                { timeOfDay }, { firstName } !
              </h2>
            </div>
          </div>
          {/* <div className="progress-of-logged-hours-background">
              
          </div> */}
          <div className="progress-of-logged-hours-background">
            <div className="logged-hours-icon">
              {/* You can replace this with any icon */ }
              { currentMonth }
            </div>
            <div className="logged-hours-content d-flex">
              <div className="logged-hours-text">
                <div className="logged-hours-title">
                  <p>Monthly Logged Hours</p>
                  <span
                    className={
                      totalLoggedProgress?.behindHours ? "red-alert" : ""
                    }
                  >
                    { hours } Hours / { totalLoggedProgress?.totalWorkingHours }{ " " }
                    Hours
                  </span>
                </div>
                <div className="progress-bar-container">
                  {/* <div className="progress-bar"> */ }
                  {/* <div 
              className="progress-filled" 
              
            /> */}
                  <Progress
                    percent={ loggedPercentageValue }
                    percentPosition={ {
                      align: "center",
                      type: "inner",
                    } }
                    showInfo={ false }
                    strokeColor={
                      totalLoggedProgress?.behindHours ? "#ff0000" : "#28a745"
                    }
                  />
                  {/* </div> */ }
                </div>
              </div>
              { totalLoggedProgress?.behindHours ?
                <div className="remaining-hours-container">
                  <span>Remaining Hours : { totalLoggedProgress?.totalBehindHoursTillToday }</span>
                </div> : "" }
            </div>
          </div>
        </div>
        <div className="profile-input-form-wrapper">
          <form action="" className="profile-form-wrapper">
            <div className="profile-input-wrapper">
              <input
                id="meJumpField-inputEl"
                data-ref="inputEl"
                type="text"
                name="meJumpField-inputEl"
                placeholder="Jump to a project"
                onClick={ showModal }
                readOnly
              />
            </div>
          </form>

          <ProjectListModal
            projectDetails={ projectDetails }
            recentList={ recentList }
            isModalOpen={ isModalOpen }
            handleCancel={ handleCancel }
            addVisitedData={ addVisitedData }
            setIsModalOpen={ setIsModalOpen }
            form={ form }
            getProjectListing={ getProjectListing }
          />
        </div>
        <div className="main-dashboard-box-wrapper d-flex">
          <div className="main-project-wrapper">
            <table className="project-table-wrapper all-dashboard-project">
              <thead>
                <tr>
                  <th>
                    <div className="folder-project-wrpper d-flex">
                      <a href="#">
                        <i className="fa-regular fa-folder"></i>
                      </a>
                      <span>Projects</span>
                    </div>
                  </th>
                  <th>
                    <div
                      className="right-project-filter"
                      onClick={ handleFiltersProject }
                    >
                      <i className="fa-solid fa-filter"></i>
                    </div>
                  </th>
                </tr>
                { showFiltersProject && (
                  <tr>
                    <th colSpan={ 3 }>
                      <div className="main-filter-pop">
                        <div
                          className="status-wrapper"
                          style={ { cursor: "pointer" } }
                        >
                          <div className="filter-name">
                            <p>Status:</p>
                            <Popover
                              trigger="click"
                              placement="bottomRight"
                              visible={ popOver.projectStatus }
                              onVisibleChange={ () =>
                                handleVisibleChange("projectStatus", true)
                              }
                              content={
                                <div className="right-popover-wrapper">
                                  <ul>
                                    <li>
                                      <Checkbox
                                        checked={ projStatus.length === 0 }
                                        onChange={ () =>
                                          handleFilters(
                                            "",
                                            projStatus,
                                            setProjStatus
                                          )
                                        }
                                      >
                                        { " " }
                                        All
                                      </Checkbox>
                                    </li>
                                  </ul>

                                  <div>
                                    <ul className="assigness-data">
                                      { statusList
                                        .sort((a, b) => {
                                          if (a.title === "Archived") return -1;
                                          if (b.title === "Archived") return 1;

                                          return 0;
                                        })
                                        ?.map((val, index) => (
                                          <li key={ index }>
                                            <Checkbox
                                              onChange={ () =>
                                                handleFilters(
                                                  val,
                                                  projStatus,
                                                  setProjStatus
                                                )
                                              }
                                              checked={ projStatus.includes(
                                                val?._id
                                              ) }
                                            >
                                              { val?.title }
                                            </Checkbox>
                                          </li>
                                        )) }
                                    </ul>
                                  </div>
                                  <div className="popver-footer-btn">
                                    <Button
                                      type="primary"
                                      className="square-primary-btn ant-btn-primary"
                                      onClick={ () => {
                                        myProjects();
                                        setPopOver({
                                          ...popOver,
                                          projectStatus: false,
                                        });
                                      } }
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      className="square-outline-btn ant-delete"
                                      onClick={ () => {
                                        // handleCancelProjectStatus()
                                        setPopOver({
                                          ...popOver,
                                          projectStatus: false,
                                        });
                                      } }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              }
                            >
                              <i className="fi fi-rs-check-circle"></i>{ " " }
                              { projStatus.length == 0 ? "All" : "Selected" }
                            </Popover>
                          </div>
                        </div>
                        <div
                          className="category-wrapper"
                          style={ { cursor: "pointer" } }
                        >
                          <div className="filter-name">
                            <p>Category:</p>
                            <Popover
                              trigger="click"
                              placement="bottomRight"
                              visible={ popOver.projectCategory }
                              onVisibleChange={ () =>
                                handleVisibleChange("projectCategory", true)
                              }
                              content={
                                <div className="right-popover-wrapper">
                                  <ul>
                                    <li>
                                      <Checkbox
                                        checked={ category.length === 0 }
                                        onChange={ () =>
                                          handleFilters(
                                            "",
                                            category,
                                            setCategory
                                          )
                                        }
                                      >
                                        { " " }
                                        All
                                      </Checkbox>
                                    </li>
                                  </ul>

                                  <div className="search-filter">
                                    <Input
                                      placeholder="Search"
                                      value={ searchCategory }
                                      onChange={ handleSearchCategory }
                                    />
                                  </div>
                                  <ul className="assigness-data">
                                    { filteredCategoryList?.map((val, index) => (
                                      <>
                                        <li key={ index }>
                                          <Checkbox
                                            onChange={ () => {
                                              handleFilters(
                                                val,
                                                category,
                                                setCategory
                                              );
                                            } }
                                            checked={ category.includes(
                                              val?._id
                                            ) }
                                          >
                                            { val?.project_tech }
                                          </Checkbox>
                                        </li>
                                      </>
                                    )) }
                                  </ul>

                                  <div className="popver-footer-btn">
                                    <Button
                                      type="primary"
                                      className="square-primary-btn ant-btn-primary"
                                      onClick={ () => {
                                        myProjects();
                                        setPopOver({
                                          ...popOver,
                                          projectCategory: false,
                                        });
                                      } }
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      className="square-outline-btn ant-delete"
                                      onClick={ () => {
                                        setPopOver({
                                          ...popOver,
                                          projectCategory: false,
                                        });
                                      } }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              }
                            >
                              <i className="fi fi-rr-users"></i>{ " " }
                              { category.length == 0 ? "All" : "Selected" }
                            </Popover>
                          </div>
                        </div>
                      </div>
                    </th>
                  </tr>
                ) }
              </thead>

              <tbody className={ showFiltersProject && "showfilter" }>
                { myProj.length > 0 ? (
                  myProj?.map((item, index) => (
                    <tr key={ index }>
                      <td>
                        <div className="cell-inner">
                          <span className="projectname">
                            <span
                              onClick={ () => {
                                handleBookmark(item);
                              } }
                              style={ { cursor: "pointer" } }
                            >
                              { item?.isStarred ? (
                                <StarFilled style={ { color: "#ffd200" } } />
                              ) : (
                                <StarOutlined />
                              ) }
                            </span>{ " " }
                            <Link>
                              <span
                                onClick={ () => getProjectMianTask(item?._id) }
                              >
                                { item?.title }
                              </span>
                            </Link>
                          </span>

                          <span className="project-hours-color">
                            <span className="timeago">
                              { calculateTimeDifference(item?.createdAt) }
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="grid-cell-inner ">
                          <div className="gray">
                            <i>
                              { getDateFormatted(item?.start_date) }
                              <i class="fa-solid fa-arrow-right"></i>{ " " }
                              { getDateFormatted(item?.end_date) }
                            </i>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <div className="no-data-found-dashboard">No Data Found</div>
                ) }
              </tbody>
            </table>
          </div>
          <div className="main-project-wrapper">
            <table className="project-table-wrapper">
              <thead>
                <tr>
                  <th>
                    <div className="folder-project-wrpper d-flex">
                      <a href="#">
                        <i class="fa-solid fa-list-check"></i>
                      </a>
                      <span>My tasks</span>
                    </div>
                  </th>
                  <th></th>
                  <th>
                    <div
                      className="right-project-filter"
                      onClick={ () => setTasksFiltrs(!showTasksiltrs) }
                    >
                      <i className="fa-solid fa-filter"></i>
                    </div>
                  </th>
                </tr>
                { showTasksiltrs && (
                  <tr>
                    <th colSpan={ 3 }>
                      <div className="main-filter-pop">
                        <div
                          className="status-wrapper"
                          style={ { cursor: "pointer" } }
                        >
                          <div className="filter-name">
                            <p>Status:</p>
                            <Popover
                              trigger="click"
                              visible={ popOver.taskStatus }
                              onVisibleChange={ () =>
                                handleVisibleChange("taskStatus", true)
                              }
                              placement="bottomRight"
                              content={
                                <div className="right-popover-wrapper">
                                  <ul>
                                    <Radio.Group
                                      onChange={ (e) => {
                                        handleTaskStatus(e.target.value);
                                      } }
                                      value={ taskStatus }
                                    >
                                      <li>
                                        <Radio value="all"> All</Radio>
                                      </li>
                                      <li>
                                        <Radio value="completed">
                                          Completed
                                        </Radio>
                                      </li>
                                      <li>
                                        <Radio value="incompleted">
                                          InCompleted
                                        </Radio>
                                      </li>
                                    </Radio.Group>
                                  </ul>
                                  <div className="popver-footer-btn">
                                    <Button
                                      type="primary"
                                      className="square-primary-btn ant-btn-primary"
                                      onClick={ () => {
                                        myTasks();
                                        handleVisibleChange(
                                          "taskStatus",
                                          false
                                        );
                                      } }
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      className="square-outline-btn ant-delete"
                                      onClick={ () => {
                                        handleVisibleChange(
                                          "taskStatus",
                                          false
                                        );
                                      } }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              }
                            >
                              <i className="fi fi-rs-check-circle"></i>{ " " }
                              { taskStatus === "completed"
                                ? "Completed"
                                : taskStatus === "incompleted"
                                  ? "Incompleted"
                                  : "All" }
                            </Popover>
                          </div>
                        </div>
                        <div
                          className="category-wrapper"
                          style={ { cursor: "pointer" } }
                        >
                          <div className="filter-name">
                            <p>Projects:</p>
                            <Popover
                              trigger="click"
                              placement="bottom"
                              visible={ popOver.taskProject }
                              onVisibleChange={ () =>
                                handleVisibleChange("taskProject", true)
                              }
                              content={
                                <div
                                  className="right-popover-wrapper"
                                  style={ {
                                    width: "100%",

                                    maxWidth: "300px",

                                    wordBreak: "break-word",
                                  } }
                                >
                                  <ul>
                                    <li>
                                      <Checkbox
                                        checked={ projects.length === 0 }
                                        onChange={ () =>
                                          handleFilters(
                                            "",
                                            projects,
                                            setProjects
                                          )
                                        }
                                      >
                                        { " " }
                                        All
                                      </Checkbox>
                                    </li>
                                  </ul>
                                  <div className="search-filter">
                                    <Input
                                      placeholder="Search"
                                      value={ searchTaskProject }
                                      onChange={ handleSearchTaskProject }
                                    />
                                  </div>
                                  <ul className="assigness-data">
                                    { filteredTaskProjectList?.map(
                                      (val, index) => (
                                        <li key={ index }>
                                          <Checkbox
                                            onChange={ () =>
                                              handleFilters(
                                                val,
                                                projects,
                                                setProjects
                                              )
                                            }
                                            checked={ projects.includes(
                                              val?._id
                                            ) }
                                          >
                                            { val?.title }
                                          </Checkbox>
                                        </li>
                                      )
                                    ) }
                                  </ul>
                                  <div className="popver-footer-btn">
                                    <Button
                                      type="primary"
                                      className="square-primary-btn ant-btn-primary"
                                      onClick={ () => {
                                        myTasks();
                                        handleVisibleChange(
                                          "taskProject",
                                          false
                                        );
                                      } }
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      className="square-outline-btn ant-delete"
                                      onClick={ () => {
                                        handleVisibleChange(
                                          "taskProject",
                                          false
                                        );
                                      } }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              }
                            >
                              <i className="fi fi-rr-users"></i>{ " " }
                              { projects.length == 0 ? "All" : "Selected" }
                            </Popover>
                          </div>
                        </div>
                        <div
                          className="view-data-range-wrapper"
                          style={ { cursor: "pointer" } }
                        >
                          <div className="filter-name">
                            <p>Date range:</p>
                            <Popover
                              placement="bottom"
                              trigger="click"
                              visible={ popOver.taskDate }
                              onVisibleChange={ () =>
                                handleVisibleChange("taskDate", true)
                              }
                              content={
                                <div className="right-popover-wrapper popover-task">
                                  <Form.Item label="Start Date">
                                    <DatePicker
                                      value={ dates.taskStartDate }
                                      onChange={ (date) =>
                                        handleChangeDate("taskStartDate", date)
                                      }
                                    />
                                  </Form.Item>
                                  <Form.Item label="Due Date">
                                    <DatePicker
                                      value={ dates.taskEndDate }
                                      onChange={ (date) =>
                                        handleChangeDate("taskEndDate", date)
                                      }
                                    />
                                  </Form.Item>
                                  <div className="popver-footer-btn">
                                    <Button
                                      type="primary"
                                      className="square-primary-btn ant-btn-primary"
                                      onClick={ () => {
                                        myTasks();
                                        handleVisibleChange("taskDate", false);
                                      } }
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      type="outlined"
                                      className="square-outline-btn ant-delete"
                                      onClick={ () => {
                                        handleVisibleChange("taskDate", false);
                                      } }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              }
                            >
                              <span className="status-check-icon">
                                <i className="fa-solid fa-calendar-alt"></i>
                                <span className="all-status">
                                  Start: , Due:{ " " }
                                </span>
                              </span>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    </th>
                  </tr>
                ) }
                <tr>
                  <th className="table-task-title">
                    <div className="task-title">
                      <p> Title</p>
                    </div>
                  </th>
                  <th>
                    <div className="task-date">
                      <span>Due date</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className={ showTasksiltrs ? "showfilter" : "" }>
                { myTask.length > 0 ? (
                  myTask?.map((item, index) => (
                    <tr key={ index }>
                      <td className="task-description custom-border-right">
                        <div className="taskCheckBox d-flex">
                          <div className="tasktitle">
                            <Link
                              to={ `/${companySlug}/project/app/${item?.project?._id}?tab=Tasks&listID=${item?.mainTask?._id}&taskID=${item?._id}` }
                            >
                              { item?.title.charAt(0).toUpperCase() +
                                item?.title.slice(1) }
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="custom-border-right" colSpan={ 2 }>
                        <span className="taskdate">
                          { getDateFormatted(item.due_date) }
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <div className="no-data-found-dashboard">No Data Found</div>
                ) }
              </tbody>
            </table>
          </div>
          <div className="main-project-wrapper">
            <table className="project-table-wrapper time-log-wrapper">
              <thead>
                <tr>
                  <th>
                    <Tooltip title="See your logged time data here!">
                      <Link to={`/${companySlug}/my-log-time`}>
                        <div className="folder-project-wrpper d-flex">
                          <a href="#">
                            <i class="fa-regular fa-clock"></i>
                          </a>
                          <span>My logged time</span>{ " " }
                        </div>
                      </Link>{ " " }
                    </Tooltip>
                  </th>
                  <th></th>
                  <th>
                    <div
                      className="right-project-filter"
                      onClick={ () =>
                        setShowLoggedTimeFiltrs(!showLoggedTimeFiltrs)
                      }
                    >
                      <i className="fa-solid fa-filter"></i>
                    </div>
                  </th>
                </tr>
                { showLoggedTimeFiltrs && (
                  <tr>
                    <th colSpan={ 3 }>
                      <div className="main-filter-pop">
                        <div
                          className="category-wrapper"
                          style={ { cursor: "pointer" } }
                        >
                          <div className="filter-name">
                            <p>Projects:</p>
                            <Popover
                              trigger="click"
                              placement="bottom"
                              visible={ popOver.timeProject }
                              onVisibleChange={ () =>
                                handleVisibleChange("timeProject", true)
                              }
                              content={
                                <div
                                  className="right-popover-wrapper"
                                  style={ {
                                    width: "100%",
                                    maxWidth: "300px",
                                    wordBreak: "break-word",
                                  } }
                                >
                                  <ul className="assigness-data">
                                    <li>
                                      <Checkbox
                                        checked={ projectsTime.length == 0 }
                                        onChange={ () => {
                                          handleFilters(
                                            "",
                                            projectsTime,
                                            setprojectsTime
                                          );
                                        } }
                                      >
                                        { " " }
                                        All
                                      </Checkbox>
                                    </li>
                                  </ul>
                                  <div className="search-filter">
                                    <Input
                                      placeholder="Search"
                                      value={ searchTimeProject }
                                      onChange={ handleSearchTimeProject }
                                    />
                                  </div>
                                  <ul className="assigness-data">
                                    { filteredTimeProjectList?.map(
                                      (val, index) => (
                                        <li key={ index }>
                                          <Checkbox
                                            checked={ projectsTime?.includes(
                                              val?._id
                                            ) }
                                            onChange={ () => {
                                              handleFilters(
                                                val,
                                                projectsTime,
                                                setprojectsTime
                                              );
                                            } }
                                          >
                                            { val?.title }
                                          </Checkbox>
                                        </li>
                                      )
                                    ) }
                                  </ul>
                                  <div className="popver-footer-btn">
                                    <Button
                                      type="primary"
                                      className="square-primary-btn ant-btn-primary"
                                      onClick={ () => {
                                        myLoggedTime();
                                        handleVisibleChange(
                                          "timeProject",
                                          false
                                        );
                                      } }
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      className="square-outline-btn ant-delete"
                                      onClick={ () => {
                                        handleVisibleChange(
                                          "timeProject",
                                          false
                                        );
                                      } }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              }
                            >
                              <i className="fi fi-rr-users"></i>{ " " }
                              { projectsTime.length == 0 ? "All" : "Selected" }
                            </Popover>
                          </div>
                        </div>
                        <div
                          className="view-data-range-wrapper"
                          style={ { cursor: "pointer" } }
                        >
                          <div className="filter-name">
                            <p>Date range:</p>
                            <Popover
                              trigger="click"
                              placement="bottom"
                              visible={ popOver.timeDate }
                              onVisibleChange={ () =>
                                handleVisibleChange("timeDate", true)
                              }
                              content={
                                <div className="right-popover-wrapper popover-task">
                                  <Form.Item label="Start Date">
                                    <DatePicker
                                      value={ dates.timeStartDate }
                                      onChange={ (date) =>
                                        handleChangeDate("timeStartDate", date)
                                      }
                                    />
                                  </Form.Item>

                                  <Form.Item label="Due Date">
                                    <DatePicker
                                      value={ dates.timeEndDate }
                                      onChange={ (date) =>
                                        handleChangeDate("timeEndDate", date)
                                      }
                                    />
                                  </Form.Item>
                                  <div className="popver-footer-btn">
                                    <Button
                                      type="primary"
                                      className="square-primary-btn ant-btn-primary"
                                      onClick={ () => {
                                        myLoggedTime();
                                        handleVisibleChange("timeDate", false);
                                      } }
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      type="outlined"
                                      className="square-outline-btn ant-delete"
                                      onClick={ () => {
                                        handleVisibleChange("timeDate", false);
                                      } }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              }
                            >
                              <span className="status-check-icon">
                                <i className="fa-solid fa-calendar-alt"></i>
                                <span className="all-status">
                                  Start: , Due:{ " " }
                                </span>
                              </span>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    </th>
                  </tr>
                ) }
                <tr>
                  <th colSpan={ 2 } className="table-task-title">
                    <div className="task-title">
                      <p> Logged by</p>
                    </div>
                  </th>
                  <th
                    style={ {
                      borderRight: " 1px solid #a8a8a8",
                      textAlign: "center",
                    } }
                  >
                    <div className="log-time ">
                      <p>Logged Date</p>
                    </div>
                  </th>
                  <th>
                    <div className="log-time">
                      <p>Time logged</p>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className={ showLoggedTimeFiltrs && "showfilter" }>
                { myTime.length > 0 ? (
                  myTime?.map((item, index) => (
                    <React.Fragment key={ index }>
                      <tr>
                        <td>
                          <Link
                            to={ `/${companySlug}/project/app/${item?.project?._id}?tab=Time` }
                          >
                            <span className="project-time-sheet-title">
                              { item.project.title }
                            </span>
                          </Link>
                        </td>
                      </tr>

                      { item?.logged_data?.map((log, i) => (
                        <tr
                          className="clickable-roww"
                          key={ i }
                        >
                          <td className="task-description custom-border-right">
                            <div className="taskCheckBox d-flex">
                              <div className="logtime-user-img">
                                <MyAvatar
                                  src={ log?.createdBy?.emp_img }
                                  alt={ log?.createdBy?.full_name }
                                  userName={ log?.createdBy?.full_name }
                                  key={ log?.createdBy?._id }
                                />

                                <span className="togtime-username">
                                  { removeTitle(log?.createdBy?.full_name) }
                                </span>
                              </div>
                            </div>
                          </td>
                          <td
                            style={ {
                              borderRight: " 1px solid #a8a8a8",
                              textAlign: "center",
                            } }
                          >
                            { moment(log?.logged_date).format("DD MMM , YY") }
                          </td>
                          <td>
                            <div className="time-log">
                              <p>
                                { log?.logged_hours }h { log?.logged_minutes }m
                              </p>
                            </div>
                          </td>
                        </tr>
                      )) }
                    </React.Fragment>
                  ))
                ) : (
                  <div className="no-data-found-dashboard">No Data Found</div>
                ) }
              </tbody>
            </table>
          </div>
          <div className="main-project-wrapper">
            <table className="project-table-wrapper">
              <thead>
                <tr>
                  <th>
                    <div className="folder-project-wrpper d-flex">
                      <a href="#">
                        <i class="fa-solid fa-list-check"></i>
                      </a>
                      <span>Bugs</span>
                    </div>
                  </th>
                  <th></th>
                  <th>
                    <div
                      className="right-project-filter"
                      onClick={ () => setShowBugsFiltrs(!showBugsFiltrs) }
                    >
                      <i className="fa-solid fa-filter"></i>
                    </div>
                  </th>
                </tr>
                { showBugsFiltrs && (
                  <tr>
                    <th colSpan={ 3 }>
                      <div className="main-filter-pop">
                        <div
                          className="status-wrapper"
                          style={ { cursor: "pointer" } }
                        >
                          <div className="filter-name">
                            <p>Status:</p>
                            <Popover
                              trigger="click"
                              placement="bottomRight"
                              visible={ popOver.bugStatus }
                              onVisibleChange={ () =>
                                handleVisibleChange("bugStatus", true)
                              }
                              content={
                                <div className="right-popover-wrapper">
                                  <ul className="assigness-data">
                                    <Radio.Group
                                      onChange={ (e) => {
                                        handleBugStatus(e.target.value);
                                      } }
                                      value={ bugStatus }
                                    >
                                      <li>
                                        <Radio value="all"> All</Radio>
                                      </li>
                                      <li>
                                        <Radio value="completed">
                                          Completed
                                        </Radio>
                                      </li>
                                      <li>
                                        <Radio value="incompleted">
                                          InCompleted
                                        </Radio>
                                      </li>
                                    </Radio.Group>
                                  </ul>
                                  <div className="popver-footer-btn">
                                    <Button
                                      type="primary"
                                      className="square-primary-btn ant-btn-primary"
                                      onClick={ () => {
                                        myBugs();
                                        handleVisibleChange("bugStatus", false);
                                      } }
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      className="square-outline-btn ant-delete"
                                      onClick={ () => {
                                        handleVisibleChange("bugStatus", false);
                                      } }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              }
                            >
                              <i className="fi fi-rs-check-circle"></i>{ " " }
                              { bugStatus == "completed"
                                ? "Completed"
                                : bugStatus == "incompleted"
                                  ? "Incompleted"
                                  : "All" }
                            </Popover>
                          </div>
                        </div>
                        <div
                          className="category-wrapper"
                          style={ { cursor: "pointer" } }
                        >
                          <div className="filter-name">
                            <p>Projects:</p>
                            <Popover
                              trigger="click"
                              placement="bottom"
                              visible={ popOver.bugProject }
                              onVisibleChange={ () =>
                                handleVisibleChange("bugProject", true)
                              }
                              content={
                                <div
                                  className="right-popover-wrapper"
                                  style={ {
                                    width: "100%",
                                    maxWidth: "300px",
                                    wordBreak: "break-word",
                                  } }
                                >
                                  <ul>
                                    <li>
                                      <Checkbox
                                        checked={ projectsBug.length == 0 }
                                        onChange={ () =>
                                          handleFilters(
                                            "",
                                            projectsBug,
                                            setProjectsBug
                                          )
                                        }
                                      >
                                        { " " }
                                        All
                                      </Checkbox>
                                    </li>
                                  </ul>
                                  <div className="search-filter">
                                    <Input
                                      placeholder="Search"
                                      value={ searchBugProject }
                                      onChange={ handleSearchBugProject }
                                    />
                                  </div>
                                  <ul className="assigness-data">
                                    { filteredBugProjectList?.map(
                                      (val, index) => (
                                        <li key={ index }>
                                          <Checkbox
                                            onChange={ () =>
                                              handleFilters(
                                                val,
                                                projectsBug,
                                                setProjectsBug
                                              )
                                            }
                                            checked={ projectsBug.includes(
                                              val?._id
                                            ) }
                                          >
                                            { val?.title }
                                          </Checkbox>
                                        </li>
                                      )
                                    ) }
                                  </ul>
                                  <div className="popver-footer-btn">
                                    <Button
                                      type="primary"
                                      className="square-primary-btn ant-btn-primary"
                                      onClick={ () => {
                                        myBugs();
                                        handleVisibleChange(
                                          "bugProject",
                                          false
                                        );
                                      } }
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      className="square-outline-btn ant-delete"
                                      onClick={ () =>
                                        handleVisibleChange("bugProject", false)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              }
                            >
                              <i className="fi fi-rr-users"></i>{ " " }
                              { projectsBug.length === 0 ? "All" : "Selected" }
                            </Popover>
                          </div>
                        </div>

                        <div
                          className="view-data-range-wrapper"
                          style={ { cursor: "pointer" } }
                        >
                          <div className="filter-name">
                            <p>View : </p>
                            <Popover
                              placement="bottom"
                              trigger="click"
                              visible={ popOver.bugDate }
                              onVisibleChange={ () =>
                                handleVisibleChange("bugDate", true)
                              }
                              content={
                                <div className="right-popover-wrapper popover-task">
                                  <Form.Item label="Start Date">
                                    <DatePicker
                                      value={ dates.bugStartDate }
                                      onChange={ (date) =>
                                        handleChangeDate("bugStartDate", date)
                                      }
                                    />
                                  </Form.Item>

                                  <Form.Item label="Due Date">
                                    <DatePicker
                                      value={ dates.bugEndDate }
                                      onChange={ (date) =>
                                        handleChangeDate("bugEndDate", date)
                                      }
                                    />
                                  </Form.Item>
                                  <div className="popver-footer-btn">
                                    <Button
                                      type="primary"
                                      className="square-primary-btn ant-btn-primary"
                                      onClick={ () => {
                                        myBugs();
                                        handleVisibleChange("bugDate", false);
                                      } }
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      type="outlined"
                                      className="square-outline-btn ant-delete"
                                      onClick={ () => {
                                        handleVisibleChange("bugDate", false);
                                      } }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              }
                            >
                              <span className="status-check-icon">
                                <i className="fa-solid fa-calendar-alt"></i>
                                <span className="all-status">
                                  Start: , Due:{ " " }
                                </span>
                              </span>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    </th>
                  </tr>
                ) }
                <tr>
                  <th className="table-task-title">
                    <div className="task-title">
                      <p> Title</p>
                    </div>
                  </th>
                  <th>
                    <div className="task-date">
                      <span>Due date</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className={ showBugsFiltrs && "showfilter" }>
                { myBug?.length > 0 ? (
                  myBug?.map((item) => (
                    <tr>
                      <td className="task-description custom-border-right">
                        <div className="taskCheckBox d-flex">
                          <div className="tasktitle">
                            <Link
                              to={ `/${companySlug}/project/app/${item?.project?._id}?tab=Bugs&bugID=${item?._id}` }
                            >
                              <span>
                                { item?.title.charAt(0).toUpperCase() +
                                  item?.title.slice(1) }
                              </span>
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="custom-border-right" colSpan={ 2 }>
                        <span className="taskdate">
                          { getDateFormatted(item?.due_date) }
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <div className="no-data-found-dashboard">No Data Found</div>
                ) }
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default index;
