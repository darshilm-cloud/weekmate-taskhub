import React from "react";
import "./pageHeader.css";

/**
 * The page title bar every page uses: white card, blue accent bar + blue
 * title on the left, the page's actions on the right (assets/css/pms.css
 * .inout-header.text-left — matches HRMS).
 */
const PageHeader = ({ title, children, className = "" }) => (
  <div className={`inout-header text-left page-header ${className}`.trim()}>
    <h2>{title}</h2>
    {children ? <div className="header-btns page-header-actions">{children}</div> : null}
  </div>
);

export default PageHeader;
