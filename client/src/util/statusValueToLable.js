export const valueToLable = (value) => {
  if (value == "in_progress") {
    return "In Progress";
  } else if (value == "client_review") {
    return "Client Review";
  } else if (value == "customer_lost") {
    return "Customer Lost";
  } else if (value == "open") {
    return "Open";
  } else if (value == "resolved") {
    return "Resolved";
  } else if (value == "reopened") {
    return "Reopened";
  }
};
