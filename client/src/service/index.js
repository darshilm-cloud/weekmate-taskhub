import axios from "axios";
import { message } from "antd";
import getCookie from "../hooks/getCookie";
import removeCookie from "../hooks/removeCookie";
const { REACT_APP_API_URL } = process.env;

export default class Service {
  static HRMS_Base_URL = "https://hrms.elsner.com";
  static Server_Base_URL = REACT_APP_API_URL;
  // static API_URL = "https://dev-econnect-sass.elsnerdev.co/v1/"
  static API_URL = 
    process.env.NODE_ENV === "production"
      ? process.env.REACT_APP_API_URL + "/v1"
      : `${this.Server_Base_URL}/v1`;

  static API_Call_Counter = 0;
  static incre_API_Call_Counter = () => this.API_Call_Counter++;
  static decre_API_Call_Counter = () =>
  (this.API_Call_Counter =
    this.API_Call_Counter > 0 ? this.API_Call_Counter - 1 : 0);

  static error_message = "Something went wrong!";
  static error_message_key = "error_message_key";

  static message_containner = [];
  static add_message = (text) => {
    var index = this.message_containner.findIndex((x) => x === text);
    // here you can check specific property for an object whether it exist in your array or not
    if (index === -1) {
      this.message_containner.push(text);
    }
    return index;
  };
  static remove_message = (message) =>
  (this.message_containner = this.message_containner.filter(
    (m) => m !== message
  ));
  static messageError = (msg) => {
    const index = this.add_message(msg);
    if (index === -1) {
      message.error(msg).then(() => {
        this.remove_message(msg);
      });
    }
  };

  static messageInfo = (msg) => {
    const index = this.add_message(msg);
    if (index === -1) {
      message.info(msg).then(() => {
        this.remove_message(msg);
      });
    }
  };

  static postMethod = "POST";
  static getMethod = "GET";
  static putMethod = "PUT";
  static deleteMethod = "DELETE";
  static headers = {
    accept: "application/json",
    "content-type": "application/json",
  };

  //Auth Module
  static userById = "/admin/userById";
  // static empById = "/emp/getempbyid";
  static editAdmin = "/admin/editadminuserprofile";
  static refreshToken = "/auth/refreshToken";
  static forgotPassword = "/authentication/client/forgotPassword";
  static resetPassword = "/authentication/client/resetPassword";
  static loginWithHRMSRedirect = "/authentication/redirectToBack";
  static login = "/authentication/login";

  //icon & logo
  // static editLogo_Icon = "/adminsettings/editAdminSetting";
  // static customadminSetting = "/adminsettings/customadminSetting";
  // static getAdminSettings = "/adminsettings/adminSetting";

  // trash module
  static trashProjects = "/trash/get/projects";
  static trashDiscussion = "/trash/get/discussion";
  static trashTasks = "/trash/get/tasks";
  static trashBugs = '/trash/get/bugs';
  static trashNotes = '/trash/get/notes';
  static trashLoggedTime = '/trash/get/logged-time'
  static Trashdelete = '/trash/delete'
  static TrashRestore = '/trash/restore'


  // project types
  static addProjectType = "/project/type/add";
  static getProjectListing = "/project/type/get";
  static deleteProjectName = "/project/type/delete";
  static updateProjectName = "/project/type/update";
  static getProjectTypeSLug = "/project/type/get/slug";

  //project Technology
  static addprojectTech = "/projectTech/addProjectTech";
  static getprojectTech = "/projectTech/getProjectTech";
  static deleteProjectTech = "/projectTech/deleteProjectTech";
  static updateProjectTech = "/projectTech/updateProjectTech";

  //workflow
  static addworkflow = "/projectWorkFlow/addProjectWorkFlow";
  static getworkflow = "/projectWorkFlow/getProjectWorkFlow";
  static updateWorkflow = "/projectWorkFlow/updateProjectWorkFlow";
  static deleteWorkflow = "/projectWorkFlow/deleteProjectWorkFlow";

  //workflow status
  static addworkflowStatus = "/work-flow/status/add";
  static getworkflowStatus = "/work-flow/status/get";
  static deleteworkflowStatus = "/work-flow/status/delete";
  static updateworkflowStatus = "/work-flow/status/update";

  //resource
  static getResource = "/resource/getResource";
  static addResource = "/resource/addResource";
  static editResource = "/resource/updateResource";
  static deleteResource = "/resource/deleteResource";

  //user - employees
  static getUsermaster = "/employees/get";
  static editEmployee = "/employees/editEmployee";

  // project status
  static getProjectStatus = "/project/status/get";
  static addProjectStatus = "/project/status/add";
  static editProjectStatus = "/project/status/update";
  static deleteProjectStatus = "/project/status/delete";

  // resource permissions
  static getResourcePermit = "/resourcePermissions/get/permission";
  static addResourcePermit = "/resourcePermissions/addResourcePermission";

  // assign project
  static addProjectdetails = "/projects/add";
  static getProjectdetails = "/projects/get";
  static updateProjectdetails = "/projects/update";
  static deleteProjectdetails = "/projects/delete";

  // assignees project
  static getEmployees = "/employees/dropdown";

  //client project
  static getClients = "/master/get/clients";
  // projectMianTask
  static getProjectMianTask = "/projects/main-task/get";
  static addProjectMainTask = "/projects/main-task/add";
  static updateProjectmainTask = "/projects/main-task/update";
  static deleteProjectMainTask = "/projects/main-task/delete";
  static getProjectBoardTasks = "/projects/main-task/details";
  static exportCSVProjectMainTask = "/projects/main-task/exporttaskCSV";

  // projectLables
  static getProjectLables = "/projects/labels/get";

  // project manager
  static getProjectManager = "/employees/manager/dropdown";

  // Account manager
  static getAccountManager = "/master/get/account_managers";

  // work-flow status
  static getWorkflowStatus = "/work-flow/status/get";
  static updateSubTaskListInStatus = "/projects/tasks/update-multiple-status";
  static updateSubTaskListInMainTask = "/projects/main-task/tasks/move";

  //Task ops
  static taskaddition = "/projects/tasks/add";
  static taskupdation = "/projects/tasks/update";
  static taskPropUpdation = "/projects/tasks/props/update";
  static taskUpdateWorkFlow = "/projects/tasks/update-workflow";
  static getTasks = "/projects/tasks/get";
  static getTaskHistory = "/projects/tasks/getHistory";

  // project labels
  static addProjectLabels = "/projects/labels/add";
  static getProjectLabels = "/projects/labels/get";
  static deleteProjectLabels = "/projects/labels/delete";
  static updateProjectLabels = "/projects/labels/update";
  static deleteTask = "/projects/tasks/delete";

  // GET Task List
  static getMainTask = "/master/get/tasks";

  // Timesheet
  static getTimesheetList = "/master/get/timesheets";
  static addTimesheet = "/projects/timesheet/add";
  static updateTimesheetApi = "/projects/timesheet/update";

  static getTimesheet = "/projects/timesheet/get";
  static getTimesheetSummary = "/projects/timesheet/getSummary";

  static deleteTime = "/projects/task-logged-hours/delete";

  static updateTimesheet = "/projects/task-logged-hours/update";

  static deleteMultipleTimesheet = "/projects/task-logged-hours/updateMultiple";

  // get buglist dropdown
  static getBuglistdropdown = "/master/get/bugs/";
  // Logged Hours

  static addLoggedHours = "/projects/task-logged-hours/add";
  static getLoggedHoursById = "/projects/task-logged-hours/getHours";
  static getCsv = "/projects/task-logged-hours/getHoursCSV";

  //File Upload
  static fileUpload = "/files/upload";
  static fileDelete = "/files/unlink";

  //Folders
  static getFolderslist = "/folders/get";

  // Notes
  static addNotes = "/projects/notes/add";
  static getNotes = "/projects/notes/get";
  static updateNotes = "/projects/notes/update";
  static deleteNotes = "/projects/notes/delete";
  static notesBookmark = "/projects/notes/update/bookmark";

  // Notebook
  static addNotebook = "/projects/notebook/add";
  static getNotebook = "/projects/notebook/get";
  static deleteNotebook = "/projects/notebook/delete";
  static updateNotebook = "/projects/notebook/update";
  static getNotebookDetails = "/projects/notebook/getDetails";
  static notebokkBookmark = "/projects/notebook/update/bookmark";

  // change password
  static pmschangepassword = "/authentication/client/updatePassword";

  // subscribers master
  static getMasterSubscribers = "/master/get/subscribers";
  // tagged users
  static gettaggedUsersList = "/master/get/taggedUsersList";

  // Notes Comments
  static addNotesComment = "/notesComments/add";
  static getNotesComment = "/notesComments/commentList";
  static updateNotesComment = "/notesComments/editComment";
  static deleteNotesComment = "/notesComments/deleteComment";
  static historyNotesComment = "/notesComments/historyComments";
  static commentResolve = "/notesComments/editCommentsResolve";

  //tasks comments
  static listTaskComments = "/comments/commentList";
  static addTaskComments = "/comments/add";
  static editTaskComments = "/comments/editComment";
  static deleteTaskComments = "/comments/deleteComment";
  static taskHistorycomments = "/comments/historyComments";
  static taskResolveComments = "/comments/editCommentsResolve";


  //logged hours comments
  static listLoggedTimeComments = "/loggedhours/comments/commentList";
  static addLoggedTimeComments = "/loggedhours/comments/add";
  static editLoggedTimeComments = "/loggedhours/comments/editComment";
  static deleteLoggedTimeComments = "/loggedhours/comments/deleteComment";
  static loggedhoursHistorycomments = "/loggedhours/comments/historyComments";

  // Department List
  static getDepartmentList = "/master/get/department";
  static getsubDepartmentList = "/master/get/subdepartment";
  // Designation List
  static getDesignationList = "/master/get/designation";

  // Employee List
  static getEmployeeList = "/master/get/employees";

  // tab settings
  static getTabSetting = '/project-tabs/setting/get/'
  static EditTabSetting = '/project-tabs/setting/add-edit'

  // Bugs Module
  static addBug = "/projects/bug/add";
  static getBug = "/projects/bug/get-all";
  static getTaskDropdown = "/projects/tasks/project-wise";
  static tasksDropdownforTime = "/master/get/tasksAssigned";
  static getBugDetails = "/projects/bug/details";
  static deleteBugs = "/projects/bug/delete";
  static updateWorkflowOfBugs = "/projects/bug/update-workflow";
  static editBugTask = "/projects/bug/update";
  static historyofbugs = "/projects/bug/history";
  static importCsvBug = "/projects/bug/import";
  static exportCsvOfRepeatedBug = "/projects/bug/repeatedbugsCSV";

  static bugAddComment = "/projects/bugcomments/add";
  static listBugComment = "/projects/bugcomments/commentList";
  static historyOfBugComments = "/projects/bugcomments/details";
  static editBugComment = "/projects/bugcomments/editComment";
  static deleteBugComment = "/projects/bugcomments/deleteComment";
  static resolveBugComment = "/projects/bugcomments/editCommentsResolve";
  static getBugWorkFlowStatus = "/master/get/bugs-workflow";

  // Add Folder
  static addFolder = "/folders/add";
  static getFolder = "/folders/get";
  static updateFolder = "/folders/update";
  static deleteFolder = "/folders/delete";
  static uploadFolder = "/folders/upload/files";
  static getFileById = "/folders/get/file";
  static renameFile = "/folders/rename/files";
  static deleteFile = "/folders/delete/file";
  static getAllFiles = "/folders/getAll/files";
  static updateSubscribers = "/folders/update/file/subscribers";
  static projectArchieved = "/projects/archive-to-active";

  // Discussion module
  static addDiscussion = "/projects/discussion-topic/add";
  static getDiscussionTopic = "/projects/discussion-topic/get";
  static updateDiscussionTopic = "/projects/discussion-topic/update";
  static deleteDiscussionTopic = "/projects/discussion-topic/delete";

  static addDiscussionTopicList = "/projects/discussion-topic-details/add";
  static getDiscussionComment = "/projects/discussion-topic-details/get";
  static deleteDiscussionComment = "/projects/discussion-topic-details/delete";
  static updateDiscussionComment = "/projects/discussion-topic-details/update";

  // Overview Module
  static getOverview = "/projects/overview";
  static getTaskList = "/projects/tasks/getOverviewData";

  //Reports module
  static getProjectList = "/master/get/projects";
  static getProjectRunningReportsDetails = "/projects/getprojectReports";
  static exportProjectRunningReportCSV = "/projects/getprojectReportsCSV";
  static getEmployeesDepartmentWise = "/employees/dropdownDeptwiseUsers";
  static getTimeSheetReportsDetails =
    "/projects/task-logged-hours/gettimesheetsReports";
  static exportTimeSheetReportCSV =
    "/projects/task-logged-hours/gettimesheetsReportsCSV";
  //users client
  static clientAdd = "/pms/client/add";
  static clientlist = "/pms/client/get";
  static getclient = "/master/get/clients";
  static updateClient = "/pms/client/update";
  static deleteClient = "/pms/client/delete";

  //permission module
  static getAllRole = "/roles/getAll";
  static getPermissionByRole = "/roles/get/permissions";
  static addPermissionByRole = "/roles/add/permissions";

  static empRoles = "/roles/get/employee";
  static updateRoles = "/roles/update";

  //dashboard module
  static myProjects = "/dashboard/get/my-project";
  static myTasks = "/dashboard/get/my-task";
  static myBugs = "/dashboard/get/my-bugs";
  static myLoggedTime = "/dashboard/get/my-logged-time";


  static myloggedtime = "/projects/task-logged-hours/getMyLoggedHours"
  static myloggedtimebyDate = "/projects/task-logged-hours/getMyLoggedHoursDate"
  static myLoggedTimeCSV = "/projects/task-logged-hours/myloggedhoursDateCSV"
  static myLoggedPojectsTimeCSV = "/projects/task-logged-hours/myloggedhoursProjectCSV"
  // issuedata Api

  static getissuedata = "/projects/tasks/task-wiseBugs";
  static importTaskCSV = "/projects/tasks/import";
  // get MainTask  Api for copy
  static getMainTaskData = "/master/get/maintasks";
  static addProjectTaskCopy = "/projects/tasks/addProjectsTaskCopy"; //bookmark

  static bookmarked = "/projects/star/update";
  static copyTaskList = "/projects/main-task/create-a-copy";
  static managePeople = "/projects/managePeople";
  static taskLoggedHours = "/projects/task-logged-hours/getTaskwiseHours"

  //email setting
  static updateSettings = "/mail/settings/edit";
  static getSettings = "/mail/settings/get";

  //recent visited
  static addrecentVisited = "/recent-visited-data/add"
  static getrecentVisited = "/recent-visited-data/get"

  //api key details
  static getApiKey = "/xapikeys/get"
  static updateApiKey = "/xapikeys/edit"

  //app setting
  static getGeneralSetting = "/app/setting/get"
  static addGeneralSetting = "/app/setting/add-edit"


  // billable hours api
  static getBillableHoursForPC = "/projects/task-logged-hours/getEmployeesHours"
  // static getTotalBillableHoursForPC= "/projects/task-logged-hours/getTotalHours"
  static empHoursDetails = "/projects/task-logged-hours/getHoursDetails"
  static addApprovedBillableHours = "/approvehours/add"

  static empMgrWise = "/master/get/employeesManagerWise"

  // logged hours api for progress on dashboard

  static getLoggedHoursProgress = "/dashboard/get/total-trackedhours"

  //complaints
  static getComplaintList = "/taskhub/complaints/get"
  static addComplaint = "/taskhub/complaints/add"
  static editComplaint = "/taskhub/complaints/update"
  static deleteComplaint = "/taskhub/complaints/delete"

  static getComplaintStatusList = "/taskhub/complaints/status/get"
  static addComplaintStatus = "/taskhub/complaints/status/add"
  static updateComplaintStatus = "/taskhub/complaints/status/update"

  //complaints comments
  static getComplaintCommmentsList = "/taskhub/complaints/comments/get"
  static addComplaintComments = "/taskhub/complaints/comments/add"
  static editComplaintComments = "/taskhub/complaints/comments/update"
  static deleteComplaintComments = "/taskhub/complaints/comments/delete"

  //review
  static getReviewList = "/taskhub/reviews/get"
  static addReview = "/taskhub/reviews/add"
  static updateReview = "/taskhub/reviews/update"
  static deleteReview = "/taskhub/reviews/delete"


  //projectexpence.
  static addprojectexpanses = "/taskhub/projectexpanses/add"
  static getprojectexpanses = "/taskhub/projectexpanses/get"
  static updateprojectexpanses = "/taskhub/projectexpanses/update"
  static deleteprojectexpanses = "/taskhub/projectexpanses/delete"
  static exportProjectExpenses = "/taskhub/projectexpanses/exportProjectExpenses"

  
  // static updateReview = "/taskhub/reviews/update"
  // static deleteReview = "/taskhub/reviews/delete"



  // consumer feedback form
  static consumerResolutionForm = "/taskhub/complaint/resolution/feedback/add"
  static getconsumerResolutionData = "/taskhub/complaint/resolution/feedback/get"

  //Saas flow API's
  static registerAdminAndCompany = "/CompanyReg/registerAdminAndCompany"
  static verifyRegistration = '/CompanyReg/verify-registration'
  
  static getDashboardData = "/superAdmin/getDashboardData"
  static addAdmin = '/superAdmin/addAdmin'
  static getAdminList = '/superAdmin/getAdminList'
  static getAdminList = '/superAdmin/getAdminList'
  static deleteAdmin = '/superAdmin/deleteAdmin'
  static editAdminList = '/superAdmin/editAdmin'

  static getCompanyList = '/CompanyManage/getCompanyList'
  static addCompany = '/CompanyManage/addCompany'
  static editCompany = '/CompanyManage/editCompany'
  static deleteCompany = '/CompanyManage/deleteCompany'

  static getUsersList = '/adminManage/getUsersList'
  static addUser = '/adminManage/addUser'
  static editUser = '/adminManage/editUser'
  static deleteUser = '/adminManage/deleteUser'
  static importUsers = "/adminManage/admin/users/upload-csv"

  static smtpConfig = '/smtpConfig/verifyAndSaveSMTP'
  static smtpGetConfig = '/smtpConfig/getSmtpConfig'

  //file size limit
  static fileSizeUpload = "/CompanyManage/file-upload-size"

  static async makeAPICall({
    props,
    methodName,
    api_url,
    body,
    params,
    options = {},
  }) {
    api_url = this.API_URL + api_url;

    //request interceptor to add the auth token header to requests
    axios.interceptors.request.use(
      (config) => {
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
          config.headers = {
            "Access-Control-Allow-Origin": "*",
            authorization: "Bearer " + accessToken,
            platform: "web-admin",
            // ...config.cachekey ?{ cachekey:config.cachekey} : {},
            // ...config.moduleprefix ?{ moduleprefix:config.moduleprefix} : {},
            ...options,
          };
        } else {
          config.headers = {
            platform: "web-admin",
            ...options,
          };
        }
        return config;
      },
      (error) => {
        Promise.reject(error);
      }
    );
    //response interceptor to refresh token on receiving token expired error
    axios.interceptors.response.use(
      (response) => {
        if (response.data.code == 401) {
          localStorage.clear();
          window.location = "/signin";
        } else if (response.data.code == 403) {
          window.location.href = `${process.env.REACT_APP_URL}unauthorised`;
        } else {
          return response;
        }
      },
      async function (error) {
        const originalRequest = error.config;
        let refreshToken = localStorage.getItem("refreshToken");
        if (
          refreshToken &&
          error?.response?.status === 401 &&
          !originalRequest._retry
        ) {
          if (originalRequest.url.includes("/refreshToken")) {
            return Promise.reject(error);
          }
          originalRequest._retry = true;
          try {
            const url = Service.API_URL + Service.refreshToken;
            const response = await axios.post(url, {
              refreshToken: refreshToken,
            });
            if (response.status === 200 && response.data.authToken) {
              localStorage.setItem(
                "accessToken",
                response.data.authToken.accessToken
              );
              localStorage.setItem(
                "refreshToken",
                response.data.authToken.refreshToken
              );
              const res = await axios(originalRequest);
              return res;
            } else {
              return Promise.reject(response);
            }
          } catch (e) {
            return Promise.reject(e);
          }
        } else if (refreshToken && error?.response?.status === 403) {
          window.location.href = `${process.env.REACT_APP_URL}unauthorised`;
        } else {
          return Promise.reject(error);
        }
      }
    );

    if (methodName === this.getMethod) {
      if (params) {
        api_url = api_url + "?" + params;
      }
      try {
        const response = await axios.get(api_url);
        if (!api_url.includes(this.getGeneralSetting)) {
          this.permissionRoleChange(response.data);
        }
        return response;
      } catch (error) {
        if (props && error.response && error.response.status === 401) {
          this.logOut(props);
        }
        return error.response;
      }
    }
    if (methodName === this.postMethod) {
      if (params) {
        api_url = api_url + "/" + params;
      }
      try {
        const response = await axios.post(api_url, body, options);
        this.permissionRoleChange(response.data);
        return response;
      } catch (error) {
        if (props && error.response && error.response.status === 401) {
          this.logOut(props);
        }
        return error.response;
      }
    }
    if (methodName === this.putMethod) {
      if (params) {
        api_url = api_url + "/" + params;
      }
      try {
        const response = await axios.put(api_url, body, options);
        this.permissionRoleChange(response.data);
        return response;
      } catch (error) {
        if (props && error.response && error.response.status === 401) {
          this.logOut(props);
        }
        return error.response;
      }
    }
    if (methodName === this.deleteMethod) {
      if (params) {
        api_url = api_url + "/" + params;
      }
      try {
        const response = await axios.delete(api_url, { data: body });
        this.permissionRoleChange(response.data);
        return response;
      } catch (error) {
        if (props && error.response && error.response.status === 401) {
          this.logOut(props);
        }
        return error.response;
      }
    }
  }

  static logOut() {
    localStorage.clear();
    window.location = "/signin";
    removeCookie("user_permission");
    removeCookie("pms_role_id");
  }

  static uuidv4() {
    return "xxxxxxxx_4xxx_yxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  static permissionRoleChange(data) {
    try {
      const pms_role = getCookie("pms_role_id");
      const storage_permission = JSON.parse(getCookie("user_permission"));
      const permissions = data.permissions;

      function arraysAreEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) {
          return false;
        }
        for (let i = 0; i < arr1.length; i++) {
          if (arr1[i] !== arr2[i]) {
            return false;
          }
        }
        return true;
      }

      if (
        (pms_role && data.pms_role_id !== pms_role) ||
        !arraysAreEqual(permissions, storage_permission)
      ) {
        this.logOut();
      }
    } catch (error) {
      console.log(error, "error");
    }
  }
}
