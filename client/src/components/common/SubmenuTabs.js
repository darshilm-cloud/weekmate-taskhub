import React, { useMemo } from "react";
import { Tabs } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import {
  canAccessSubmenuItem,
  getSidebarSubmenus,
} from "../../constants/sidebarSubmenus";
import "./SubmenuTabs.css";

const matchesPath = (pathname, path) =>
  pathname === path || pathname.startsWith(`${path}/`);

// Tab bar under the header listing the sibling pages of the sidebar submenu
// the current page belongs to (mirrors HRMS's SubmenuTabs). Renders nothing
// on pages that aren't part of a submenu.
const SubmenuTabs = () => {
  const location = useLocation();
  const history = useHistory();
  const companySlug = localStorage.getItem("companyDomain") || "";

  const items = useMemo(() => {
    const group = getSidebarSubmenus(companySlug).find(
      (submenu) =>
        submenu.isVisible() &&
        submenu.children.some((child) => matchesPath(location.pathname, child.path))
    );
    return group ? group.children.filter(canAccessSubmenuItem) : [];
  }, [companySlug, location.pathname]);

  if (items.length === 0) return null;

  const activeKey =
    items.find((item) => matchesPath(location.pathname, item.path))?.key || items[0].key;

  return (
    <div className="header-submenu-tabs">
      <Tabs
        activeKey={activeKey}
        onChange={(key) => {
          const target = items.find((item) => item.key === key);
          if (target) history.push(target.path);
        }}
        items={items.map((item) => ({ key: item.key, label: item.label }))}
      />
    </div>
  );
};

export default SubmenuTabs;
