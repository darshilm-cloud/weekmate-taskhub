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

export default getRoleLabel;
