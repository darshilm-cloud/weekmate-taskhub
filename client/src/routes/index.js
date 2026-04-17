import React, { Suspense } from "react";
import { Route, Redirect } from "react-router-dom";
import { useLocation } from "react-router-dom/cjs/react-router-dom.min";
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
import {
  DashboardSkeleton,
  DiscussionSkeleton,
  ProjectListSkeleton,
  ReportsHubSkeleton,
  ReportsDetailSkeleton,
  ReportsSkeleton,
  SettingsSkeleton,
  TimesheetSkeleton,
  UsersPageSkeleton,
} from "../components/common/SkeletonLoader";

import AdminDashboard from "../pages/AdminDashboard";
import CompanyManagement from "../pages/AdminModules/CompanyManagement";
import SettingsModule from "../pages/AdminModules/SettingsModule/SettingsModule";
import TaskFormBuilder from "../pages/AdminModules/TaskFormBuilder";
import ProjectFormBuilder from "../pages/AdminModules/ProjectFormBuilder";
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
const ReportsHub = React.lazy(() => import("../pages/ReportsHub"));
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
const ReviewDetailForm = React.lazy(() =>
  import("../pages/PositiveReview/ReviewDetailsForm.js")
);

const DashboardModule = React.lazy(() => import("../pages/Dashbaord"));
const TaskPageModule = React.lazy(() => import("../pages/TaskPage"));
const BillableHoursAdmin = React.lazy(() =>
  import("../pages/BillableHours/SuperAdminBillableHours.js")
);
const ActivityLogs = React.lazy(() =>
  import("../pages/ActivityLogs/ActivityLogs")
);

const NotesPage = React.lazy(() =>
  import("../pages/Notes/index")
);

const DiscussionPage = React.lazy(() =>
  import("../pages/Discussion/index")
);

const ResourceMatrix = React.lazy(() =>
  import("../pages/ResourceMatrix/ResourceMatrix")
);
const WorkflowStages = React.lazy(() =>
  import("../pages/WorkflowStages")
);
const BugWorkflowStages = React.lazy(() =>
  import("../pages/BugWorkflowStages")
);

const ProjectsRunning = React.lazy(() => import("../pages/Reports"));
const TimeSheet = React.lazy(() => import("../pages/Reports/TimeSheet"));

const MiraAi = React.lazy(() =>
  import("../pages/MiraAI/MiraAI")
);

const ProjectEntryRedirect = ({ match }) => (
  <Redirect to={`/${match.params.companySlug}/project-list`} />
);

const RouteSkeletonFallback = () => {
  const location = useLocation();
  const path = (location?.pathname || "").toLowerCase();

  if (path.includes("/admin/settings") || path.includes("/admin/task-form-builder") || path.includes("/admin/project-form-builder")) return <SettingsSkeleton />;
  if (path.includes("/project-users")) return <UsersPageSkeleton />;
  if (path.includes("/project-list")) return <ProjectListSkeleton />;
  if (path.includes("/timesheet-reports")) return <TimesheetSkeleton />;
  if (path.includes("/project-runnig-reports")) return <ReportsSkeleton />;
  if (path.includes("/reports/")) return <ReportsDetailSkeleton />;
  if (path.endsWith("/reports")) return <ReportsHubSkeleton />;
  if (path.includes("/discussion")) return <DiscussionSkeleton />;

  return <DashboardSkeleton />;
};

const index = ({ match, userPermission }) => {
  const routeArray = [
    {
      path: ":companySlug/manage-project-type",
      component: ManageProjectType,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project-technologies",
      component: ProjectTechnologies,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/workflows-tasks/:id",
      component: WorkflowTasksUpdate,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/workflows",
      component: Workflows,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/resources",
      component: Resource,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/workflow-stages",
      component: WorkflowStages,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/bug-workflow-stages",
      component: BugWorkflowStages,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project-archieved",
      component: ProjectArchieved,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },

    {
      path: ":companySlug/roles-permission/:id",
      component: ResourcePermission,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project-users",
      component: EmployeeMasterList,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project-users/client",
      component: EmployeeListTabClient,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project-labels",
      component: ProjectLabels,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/my-library",
      component: Library,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project",
      component: ProjectEntryRedirect,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/project-list",
      component: AssignProject,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/project-list/edit/:editProjectId",
      component: AssignProject,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/trash",
      component: TrashIndex,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project/app/:projectId",
      component: ProgressBoardofProject,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/project-status",
      component: ProjectStatus,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/my-log-time",
      component: MylogtimeWidget,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/reports",
      component: ReportsHub,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.AM,
      ],
    },
    {
      path: ":companySlug/reports/:reportKey",
      component: ReportsHub,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.AM,
      ],
    },
    {
      path: ":companySlug/project-runnig-reports",
      component: ProjectsRunning,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.AM,
      ],
    },
    {
      path: ":companySlug/timesheet-reports",
      component: TimeSheet,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.AM,
      ],
    },
    {
      path: ":companySlug/permission-access",
      component: PermissionModule,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/dashboard",
      component: DashboardModule,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/tasks",
      component: TaskPageModule,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/billable-hours",
      component: BillableHoursAdmin,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.USER,
      ],
    },
    {
      path: ":companySlug/complaints",
      component: ComplaintsModule,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/add/complaintsform",
      component: ComplaintsForm,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/edit/complaintsForm/:complaint_id",
      component: ComplaintsForm,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/positive-review",
      component: PositiveReview,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/add/positiveReviewForm",
      component: PositiveReviewForm,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/edit/positiveReviewForm/:review_id",
      component: PositiveReviewForm,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/add/complaintForm-action-details/:id",
      component: ComplaintDetailForm,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/add/reviewForm-action-details/:id",
      component: ReviewDetailForm,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/projectexpense",
      component: Projectexpences,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.CLIENT,
      ],
    },

    {
      path: ":companySlug/add/projectexpenseform",
      component: ProjectexpencesForm,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.CLIENT,
      ],
    },
    {
      path: ":companySlug/edit/projectexpenseform/:review_id",
      component: ProjectexpencesForm,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.CLIENT,
      ],
    },
    {
      path: ":companySlug/admin/dashboard",
      component: AdminDashboard,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/admin/company-management",
      component: CompanyManagement,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/admin/settings",
      component: SettingsModule,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/admin/task-form-builder",
      component: TaskFormBuilder,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/admin/project-form-builder",
      component: ProjectFormBuilder,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    // {
    //   path: ":companySlug/admin/company-employee",
    //   component: CompanyEmployee,
    //   roleName: [
    //     config.PMS_ROLES.ADMIN,
    //     config.PMS_ROLES.USER,
    //     config.PMS_ROLES.CLIENT,
    //     config.PMS_ROLES.PC,
    //     config.PMS_ROLES.AM,
    //     config.PMS_ROLES.TL,
    //   ],
    // },
    {
      path: "admin/Administrator",
      component: Administrator,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
      ],
    },
    {
      path: ":companySlug/admin/mira-ai",
      component: MiraAi,
      roleName: [
        config.PMS_ROLES.ADMIN,
      ],
    },
    {
      path: ":companySlug/admin/activity-logs",
      component: ActivityLogs,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/notes",
      component: NotesPage,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/discussion",
      component: DiscussionPage,
      roleName: [
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: ":companySlug/resource-matrix",
      component: ResourceMatrix,
      roleName: [config.PMS_ROLES.ADMIN],
    },
  ];
  let userData = JSON.parse(localStorage.getItem("user_data"));
  return (
    <>
      <Suspense fallback={<RouteSkeletonFallback />}>
        {routeArray.map((item, index) => (
          <Route
            exact
            key={index}
            path={`${match.url}${item.path}`}
            render={(routeProps) => {
              const isSpecialUser = userData._id === sideBarContentId; // Static User Check
              const isSpecificPath =
                item.path.includes("/reports") ||
                item.path === ":companySlug/project-runnig-reports" ||
                item.path === ":companySlug/timesheet-reports";

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
