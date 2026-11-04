const ROLE_LABEL_MAP = {
  TL:    "Manager",
  PC:    "Project Manager",
  User:  "Standard",
};

/**
 * Returns a human-friendly display label for an internal role code.
 * Falls back to the original value when no mapping is defined.
 */
const getRoleLabel = (roleCode) => {
  if (!roleCode) return roleCode;
  return ROLE_LABEL_MAP[roleCode] ?? roleCode;
};

/**
 * Display label for a user: the generic Project Manager (PC) permission label is
 * replaced by the person's designation when it is more specific (e.g. CTO).
 * Permissions are unaffected; display only.
 */
export const getUserRoleLabel = (user) => {
  const code = user?.pms_role?.role_name;
  const label = getRoleLabel(code);
  const desig = (user?.designation_name || user?.designation?.name || "").trim();
  if (code === "PC" && desig && desig.toLowerCase() !== "project manager") return desig;
  return label;
};

export default getRoleLabel;
