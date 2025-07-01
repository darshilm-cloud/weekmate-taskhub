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
import CompanyRegistration from "../pages/AdminModules/CompanyRegistration";
import SettingsModule from "../pages/AdminModules/SettingsModule/SettingsModule";
import CompanyEmployee from "../pages/AdminModules/CompanyEmployee";
 

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

const index = ({ match, userPermission }) => {
  const routeArray = [
    {
      path: "manage-project-type",
      component: ManageProjectType,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "project-technologies",
      component: ProjectTechnologies,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "workflows-tasks/:id",
      component: WorkflowTasksUpdate,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "workflows",
      component: Workflows,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "resources",
      component: Resource,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "project-archieved",
      component: ProjectArchieved,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },

    {
      path: "roles-permission/:id",
      component: ResourcePermission,
      roleName: [config.PMS_ROLES.SUPER_ADMIN],
    },
    {
      path: "project-users",
      component: EmployeeMasterList,
      roleName: [config.PMS_ROLES.SUPER_ADMIN],
    },
    {
      path: "project-users/client",
      component: EmployeeListTabClient,
      roleName: [config.PMS_ROLES.SUPER_ADMIN],
    },
    {
      path: "project-labels",
      component: ProjectLabels,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "my-library",
      component: Library,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "project-list",
      component: AssignProject,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "project-list/edit/:editProjectId",
      component: AssignProject,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "trash",
      component: TrashIndex,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "project/app/:projectId",
      component: ProgressBoardofProject,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "project-status",
      component: ProjectStatus,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "my-log-time",
      component: MylogtimeWidget,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "project-runnig-reports",
      component: ProjectsRunningReports,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "timesheet-reports",
      component: TimeSheetReports,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "permission-access",
      component: PermissionModule,
      roleName: [config.PMS_ROLES.SUPER_ADMIN, config.PMS_ROLES.ADMIN],
    },
    {
      path: "dashboard",
      component: DashboardModule,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },

    {
      path: "billable-hours",
      component: BillableHoursAdmin,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
      ],
    },
    {
      path: "complaints",
      component: ComplaintsModule,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "add/complaintsform",
      component: ComplaintsForm,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "edit/complaintsForm/:complaint_id",
      component: ComplaintsForm,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "positive-review",
      component: PositiveReview,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "add/positiveReviewForm",
      component: PositiveReviewForm,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "edit/positiveReviewForm/:review_id",
      component: PositiveReviewForm,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "add/complaintForm-action-details/:id",
      component: ComplaintDetailForm,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "projectexpense",
      component: Projectexpences,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.CLIENT,
      ],
    },

    {
      path: "add/projectexpenseform",
      component: ProjectexpencesForm,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.CLIENT,
      ],
    },
    {
      path: "edit/projectexpenseform/:review_id",
      component: ProjectexpencesForm,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.TL,
        config.PMS_ROLES.CLIENT,
      ],
    },
    {
      path: "admin/dashboard",
      component: AdminDashboard,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "admin/company-registartion",
      component: CompanyRegistration,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "admin/settings",
      component: SettingsModule,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    },
    {
      path: "admin/company-employee",
      component: CompanyEmployee,
      roleName: [
        config.PMS_ROLES.SUPER_ADMIN,
        config.PMS_ROLES.ADMIN,
        config.PMS_ROLES.USER,
        config.PMS_ROLES.CLIENT,
        config.PMS_ROLES.PC,
        config.PMS_ROLES.AM,
        config.PMS_ROLES.TL,
      ],
    }
  ];
  let userData = JSON.parse(localStorage.getItem("user_data"));
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
