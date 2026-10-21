import { getRoles, hasPermission } from "../util/hasPermission";

// Sidebar entries that open a submenu. Shared by the sidebar (as the menu's
// children) and by SubmenuTabs (the tab bar under the header), so both always
// list the same pages with the same access rules.
export const getSidebarSubmenus = (companySlug) => [
  {
    key: "Feedback",
    label: "Feedback",
    // Read (View) permission on Feedback - Permission Management.
    isVisible: () => getRoles(["Admin"]) || hasPermission(["feedback_view"]),
    children: [
      {
        key: "FeedBack-Positive Reviews",
        label: "Positive Reviews",
        path: `/${companySlug}/positive-review`,
        permissions: ["feedback_view"],
      },
      {
        key: "FeedBack-Complaints",
        label: "Complaints",
        path: `/${companySlug}/complaints`,
        permissions: ["feedback_view"],
      },
    ],
  },
];

// Same rule the sidebar's click handler applies: admins always pass, everyone
// else needs one of the listed permissions.
export const canAccessSubmenuItem = (item) =>
  getRoles(["Admin"]) || !item.permissions?.length || hasPermission(item.permissions);
