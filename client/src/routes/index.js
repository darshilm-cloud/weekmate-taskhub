import React, { Suspense } from "react";
import { Route, Redirect } from "react-router-dom";
import config from "../settings/config.json";
import Workflows from "../components/PMS/Workflows";
import ProjectStatus from "../components/PMS/ProjectStatus";
import ProjectLabels from "../components/PMS/ProjectLabels";
import EmployeeListTabClient from "../pages/EmployeeList/EmployeeListTabClient.js";
import { getRoles } from "../util/hasPermission.js";
import MylogtimeWidget from "../pages/Mylogtime/MylogtimeWidget";
import Projectexpences from "../pages/ProjectExpences/Projectexpences.js";
import ProjectexpencesForm from "../pages/ProjectExpences/ProjectexpencesForm.js";
import { sideBarContentId } from "../constants";

import AdminDashboard from "../pages/AdminDashboard";
import CompanyManagement from "../pages/AdminModules/CompanyManagement";
import SettingsModule from "../pages/AdminModules/SettingsModule/SettingsModule";
import CompanyEmployee from "../pages/AdminModules/CompanyEmployee";
import Administrator from "../pages/AdminModules/Administrator";
 

const ProgressBoardofProject = React.lazy(() =>
  import("../components/PMS/ProgressBoardofProject")
);
const ProjectTechnologies = React.lazy(() =>
  import("../components/ManageCategory/ProjectTechnologies")
);
const TrashIndex = React.lazy(() =>
  import("../pages/TrashModule/MainTrashBoard")
);
const ManageProjectType = React.lazy(() =>
  import("../components/PMS/ManageProjectType")
);
const WorkflowTasksUpdate = React.lazy(() =>
  import("../components/PMS/WorkflowTasksUpdate")
);
const Resource = React.lazy(() =>
  import("../components/PMS/Resources/Resource")
);
const ProjectArchieved = React.lazy(() =>
  import("../components/PMS/ProjectArchieved/index")
);

const AssignProject = React.lazy(() =>
  import("../components/AssignProject/AssignProject")
);
const Library = React.lazy(() => import("../components/PMS/Library"));
const EmployeeMasterList = React.lazy(() =>
  import("../pages/EmployeeList/EmployeeMasterList")
);
const ProjectsRunningReports = React.lazy(() => import("../pages/Reports"));
const ReportsHome = React.lazy(() => import("../pages/Reports/ReportsHome"));
const TimeSheetReports = React.lazy(() => import("../pages/Reports/TimeSheet"));
const PermissionModule = React.lazy(() => import("../pages/PermissionModule"));
const ResourcePermission = React.lazy(() =>
  import("../components/PMS/Resources/ResourcePermission")
);
const ComplaintsModule = React.lazy(() => import("../pages/Complaints"));
const ComplaintsForm = React.lazy(() =>
  import("../pages/Complaints/ComplaintsForm")
);
const ComplaintDetailForm = React.lazy(() =>
  import("../pages/Complaints/ComplaintDetailsForm")
);

const PositiveReview = React.lazy(() => import("../pages/PositiveReview"));
const PositiveReviewForm = React.lazy(() =>
  import("../pages/PositiveReview/PositiveReviewForm.js")
);

const DashboardModule = React.lazy(() => import("../pages/Dashbaord"));
const BillableHoursAdmin = React.lazy(() =>
  import("../pages/BillableHours/SuperAdminBillableHours.js")
);
const ActivityLogs = React.lazy(() =>
  import("../pages/ActivityLogs/ActivityLogs")
);

const MiraAi = React.lazy(() =>
  import("../pages/MiraAI/MiraAI")
);

// Role shorthand
const ALL_ROLES = [
  config.PMS_ROLES.ADMIN,
  config.PMS_ROLES.USER,
  config.PMS_ROLES.CLIENT,
  config.PMS_ROLES.PC,
  config.PMS_ROLES.AM,
  config.PMS_ROLES.TL,
];
const ALL_EXCEPT_CLIENT = [
  config.PMS_ROLES.ADMIN,
  config.PMS_ROLES.USER,
  config.PMS_ROLES.PC,
  config.PMS_ROLES.AM,
  config.PMS_ROLES.TL,
];
const ADMIN_ONLY = [config.PMS_ROLES.ADMIN];
const MANAGEMENT = [
  config.PMS_ROLES.ADMIN,
  config.PMS_ROLES.PC,
  config.PMS_ROLES.AM,
  config.PMS_ROLES.TL,
];

// Static route config — defined once, never recreated
const routeArray = [
  { path: ":companySlug/manage-project-type", component: ManageProjectType, roleName: ADMIN_ONLY },
  { path: ":companySlug/project-technologies", component: ProjectTechnologies, roleName: ADMIN_ONLY },
  { path: ":companySlug/workflows-tasks/:id", component: WorkflowTasksUpdate, roleName: ADMIN_ONLY },
  { path: ":companySlug/workflows", component: Workflows, roleName: ADMIN_ONLY },
  { path: ":companySlug/resources", component: Resource, roleName: ADMIN_ONLY },
  { path: ":companySlug/project-archieved", component: ProjectArchieved, roleName: ALL_ROLES },
  { path: ":companySlug/roles-permission/:id", component: ResourcePermission, roleName: ADMIN_ONLY },
  { path: ":companySlug/project-users", component: EmployeeMasterList, roleName: ADMIN_ONLY },
  { path: ":companySlug/project-users/client", component: EmployeeListTabClient, roleName: ADMIN_ONLY },
  { path: ":companySlug/project-labels", component: ProjectLabels, roleName: ADMIN_ONLY },
  { path: ":companySlug/my-library", component: Library, roleName: ADMIN_ONLY },
  { path: ":companySlug/project-list", component: AssignProject, roleName: ALL_ROLES },
  { path: ":companySlug/project-list/edit/:editProjectId", component: AssignProject, roleName: MANAGEMENT },
  { path: ":companySlug/trash", component: TrashIndex, roleName: ADMIN_ONLY },
  { path: ":companySlug/project/app/:projectId", component: ProgressBoardofProject, roleName: ALL_ROLES },
  { path: ":companySlug/project-status", component: ProjectStatus, roleName: ADMIN_ONLY },
  { path: ":companySlug/my-log-time", component: MylogtimeWidget, roleName: ALL_ROLES },
  { path: ":companySlug/project-runnig-reports", component: ProjectsRunningReports, roleName: ADMIN_ONLY },
  { path: ":companySlug/timesheet-reports", component: TimeSheetReports, roleName: ADMIN_ONLY },
  { path: ":companySlug/permission-access", component: PermissionModule, roleName: ADMIN_ONLY },
  { path: ":companySlug/dashboard", component: DashboardModule, roleName: ALL_EXCEPT_CLIENT },
  { path: ":companySlug/billable-hours", component: BillableHoursAdmin, roleName: ALL_EXCEPT_CLIENT },
  { path: ":companySlug/complaints", component: ComplaintsModule, roleName: MANAGEMENT },
  { path: ":companySlug/add/complaintsform", component: ComplaintsForm, roleName: MANAGEMENT },
  { path: ":companySlug/edit/complaintsForm/:complaint_id", component: ComplaintsForm, roleName: MANAGEMENT },
  { path: ":companySlug/positive-review", component: PositiveReview, roleName: MANAGEMENT },
  { path: ":companySlug/add/positiveReviewForm", component: PositiveReviewForm, roleName: MANAGEMENT },
  { path: ":companySlug/edit/positiveReviewForm/:review_id", component: PositiveReviewForm, roleName: MANAGEMENT },
  { path: ":companySlug/add/complaintForm-action-details/:id", component: ComplaintDetailForm, roleName: MANAGEMENT },
  { path: ":companySlug/projectexpense", component: Projectexpences, roleName: [config.PMS_ROLES.ADMIN, config.PMS_ROLES.PC, config.PMS_ROLES.TL, config.PMS_ROLES.CLIENT] },
  { path: ":companySlug/add/projectexpenseform", component: ProjectexpencesForm, roleName: [config.PMS_ROLES.ADMIN, config.PMS_ROLES.PC, config.PMS_ROLES.TL, config.PMS_ROLES.CLIENT] },
  { path: ":companySlug/edit/projectexpenseform/:review_id", component: ProjectexpencesForm, roleName: [config.PMS_ROLES.ADMIN, config.PMS_ROLES.PC, config.PMS_ROLES.TL, config.PMS_ROLES.CLIENT] },
  { path: ":companySlug/admin/dashboard", component: AdminDashboard, roleName: ALL_ROLES },
  { path: ":companySlug/admin/company-management", component: CompanyManagement, roleName: ALL_ROLES },
  { path: ":companySlug/admin/settings", component: SettingsModule, roleName: ALL_ROLES },
  { path: "admin/Administrator", component: Administrator, roleName: [config.PMS_ROLES.SUPER_ADMIN] },
  { path: ":companySlug/admin/mira-ai", component: MiraAi, roleName: ADMIN_ONLY },
  { path: ":companySlug/admin/activity-logs", component: ActivityLogs, roleName: ADMIN_ONLY },
  {
      path: ":companySlug/reports-home",
      component: ReportsHome,
      roleName: ADMIN_ONLY,
    },
];

const RoutesIndex = ({ match, userPermission }) => {
  const userData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user_data")) || {};
    } catch {
      return {};
    }
  }, []);

  return (
    <>
      <Suspense fallback={<></>}>
        {routeArray.map((item, index) => (
          <Route
            exact
            key={index}
            path={`${match.url}${item.path}`}
            render={(routeProps) => {
              const isSpecialUser = userData._id == sideBarContentId; // Static User Check
              const isSpecificPath =
                item.path === "project-runnig-reports" ||
                item.path === "timesheet-reports"; // Check for the specific route

              // ✅ Normal Role-Based Access (For Users With Proper Permissions)
              if (getRoles(item.roleName)) {
                return React.createElement(item.component, { ...routeProps });
              }

              // ✅ Special User Override (Only for 'project-runnig-reports')
              if (isSpecificPath && isSpecialUser) {
                return React.createElement(item.component, { ...routeProps });
              }

              // ✅ If the user has "Client" role, redirect to "project-list"
              if (getRoles(["Client"])) {
                return <Redirect to="/project-list" />;
              }

              // ❌ Otherwise, redirect unauthorized users to the "dashboard"
              return <Redirect to="/dashboard" />;
            }}
          />
        ))}
      </Suspense>
    </>
  );
};

export default index;
