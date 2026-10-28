import React, { Suspense } from "react";
import { Route, Redirect } from "react-router-dom";
import { useLocation } from "react-router-dom/cjs/react-router-dom.min";
import config from "../settings/config.json";
import Workflows from "../components/PMS/Workflows";
import ProjectStatus from "../components/PMS/ProjectStatus";
import ProjectLabels from "../components/PMS/ProjectLabels";
import EmployeeListTabClient from "../pages/EmployeeList/EmployeeListTabClient.js";
import { getRoles, hasPermission } from "../util/hasPermission.js";
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
import EmailPreferences from "../pages/EmailPreferences";
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
const WorkflowStagesEdit = React.lazy(() =>
  import("../pages/WorkflowStages/WorkflowStagesEdit")
);
const BugWorkflowStages = React.lazy(() =>
  import("../pages/BugWorkflowStages")
);

const ProjectsRunning = React.lazy(() => import("../pages/Reports"));
const TimeSheet = React.lazy(() => import("../pages/Reports/TimeSheet"));

// const MiraAi = React.lazy(() =>
//   import("../pages/MiraAI/MiraAI")
// );

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
      viewPermission: ["settings_view"],
      component: ManageProjectType,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project-technologies",
      viewPermission: ["settings_view"],
      component: ProjectTechnologies,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/workflows-tasks/:id",
      viewPermission: ["settings_view"],
      component: WorkflowTasksUpdate,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/workflows",
      viewPermission: ["settings_view"],
      component: Workflows,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/resources",
      viewPermission: ["settings_view"],
      component: Resource,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/workflow-stages/:workflowId",
      viewPermission: ["settings_view"],
      component: WorkflowStagesEdit,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/workflow-stages",
      viewPermission: ["settings_view"],
      component: WorkflowStages,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/bug-workflow-stages",
      viewPermission: ["settings_view"],
      component: BugWorkflowStages,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project-archieved",
      viewPermission: ["projects_view"],
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
      viewPermission: ["settings_view"],
      component: ResourcePermission,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project-users",
      viewPermission: ["people_view"],
      component: EmployeeMasterList,
      roleName: [config.PMS_ROLES.ADMIN],
      permissions: ["people_view", "people_add", "people_edit", "people_delete", "manage_people"],
    },
    {
      path: ":companySlug/project-users/client",
      viewPermission: ["people_view"],
      component: EmployeeListTabClient,
      roleName: [config.PMS_ROLES.ADMIN],
      permissions: ["people_view", "people_add", "people_edit", "people_delete", "manage_people"],
    },
    {
      path: ":companySlug/project-labels",
      viewPermission: ["settings_view"],
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
      viewPermission: ["projects_view"],
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
      viewPermission: ["projects_view"],
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
      viewPermission: ["project_edit"],
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
      viewPermission: ["settings_view"],
      component: TrashIndex,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/project/app/:projectId",
      viewPermission: ["projects_view"],
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
      viewPermission: ["settings_view"],
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
      viewPermission: ["reports_view"],
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
      viewPermission: ["reports_view"],
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
      viewPermission: ["reports_view"],
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
      viewPermission: ["reports_view"],
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
      viewPermission: ["settings_view"],
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
      viewPermission: ["tasks_view"],
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
      viewPermission: ["feedback_view"],
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
      viewPermission: ["feedback_add"],
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
      viewPermission: ["feedback_edit"],
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
      viewPermission: ["feedback_view"],
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
      viewPermission: ["feedback_add"],
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
      viewPermission: ["feedback_edit"],
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
      viewPermission: ["feedback_edit"],
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
      viewPermission: ["feedback_edit"],
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
      viewPermission: ["expense_view"],
      component: Projectexpences,
      roleName: [config.PMS_ROLES.ADMIN],
      permissions: ["projects_manage", "projects_view"],
    },
    {
      path: ":companySlug/add/projectexpenseform",
      viewPermission: ["expense_add"],
      component: ProjectexpencesForm,
      roleName: [config.PMS_ROLES.ADMIN],
      permissions: ["projects_manage", "projects_view"],
    },
    {
      path: ":companySlug/edit/projectexpenseform/:review_id",
      viewPermission: ["expense_edit"],
      component: ProjectexpencesForm,
      roleName: [config.PMS_ROLES.ADMIN],
      permissions: ["projects_manage", "projects_view"],
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
      viewPermission: ["settings_view"],
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
      // every user manages their own email preferences - no module permission
      path: ":companySlug/email-preferences",
      component: EmailPreferences,
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
      viewPermission: ["settings_view"],
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
      viewPermission: ["settings_view"],
      component: TaskFormBuilder,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/admin/project-form-builder",
      viewPermission: ["settings_view"],
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
    // {
    //   path: ":companySlug/admin/mira-ai",
    //   component: MiraAi,
    //   roleName: [
    //     config.PMS_ROLES.ADMIN,
    //   ],
    // },
    {
      path: ":companySlug/admin/activity-logs",
      viewPermission: ["settings_view"],
      component: ActivityLogs,
      roleName: [config.PMS_ROLES.ADMIN],
    },
    {
      path: ":companySlug/notes",
      viewPermission: ["notes_view"],
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
      viewPermission: ["discussion_view"],
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
      viewPermission: ["settings_view"],
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
              const slug =
                routeProps.match.params.companySlug ||
                localStorage.getItem("companyDomain") ||
                "";

              // ✅ Module pages: open on the module's Read permission
              // (Permission Management). Admins always pass.
              if (item.viewPermission) {
                if (getRoles(["Admin"]) || hasPermission(item.viewPermission)) {
                  return React.createElement(item.component, { ...routeProps });
                }
                if (getRoles(["Client"])) {
                  // Clients land on the project list - unless that's the page
                  // they can't open (would loop); My Log Time is open to all.
                  return item.path === ":companySlug/project-list"
                    ? <Redirect to={`/${slug}/my-log-time`} />
                    : <Redirect to={`/${slug}/project-list`} />;
                }
                return <Redirect to={`/${slug}/dashboard`} />;
              }

              // ✅ Normal Role-Based Access
              if (getRoles(item.roleName)) {
                return React.createElement(item.component, { ...routeProps });
              }

              // ✅ Permission-Based Access (for routes that expose a permissions array)
              if (item.permissions && hasPermission(item.permissions)) {
                return React.createElement(item.component, { ...routeProps });
              }

              // ✅ Special User Override (Only for 'project-runnig-reports')
              if (isSpecificPath && isSpecialUser) {
                return React.createElement(item.component, { ...routeProps });
              }

              // ✅ If the user has "Client" role, redirect to "project-list"
              if (getRoles(["Client"])) {
                return <Redirect to={`/${slug}/project-list`} />;
              }

              // ❌ Otherwise, redirect unauthorized users to the "dashboard"
              return <Redirect to={`/${slug}/dashboard`} />;
            }}
          />
        ))}
      </Suspense>
    </>
  );
};

export default index;
