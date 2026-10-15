import React from "react";
import EditIcon from "../../assets/images/EditIcon";
import DeleteIcon from "../../assets/images/DeleteIcon";

/**
 * WeekMate's edit / delete icons (the same SVGs HRMS and Payroll use),
 * wrapped like an antd icon (span.anticon) so they drop in for
 * antd's EditOutlined / DeleteOutlined: onClick, className and style keep
 * working, and the size follows font-size (12px by default, as in HRMS).
 * The delete icon is drawn in currentColor, so a red style / danger button
 * still shows it red.
 */
const makeActionIcon = (Svg, name) => {
  const ActionIcon = React.forwardRef(({ className = "", ...props }, ref) => (
    <span ref={ref} role="img" aria-label={name} className={`anticon wm-action-icon ${className}`.trim()} {...props}>
      <Svg width="1em" height="1em" />
    </span>
  ));
  ActionIcon.displayName = `${name}ActionIcon`;
  return ActionIcon;
};

export const EditActionIcon = makeActionIcon(EditIcon, "edit");
export const DeleteActionIcon = makeActionIcon(DeleteIcon, "delete");
