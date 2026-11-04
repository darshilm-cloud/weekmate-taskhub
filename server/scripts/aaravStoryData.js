/**
 * Static story data for seedAaravEnterprises.js (mirrors docs/aarav/STORYLINE.md in the
 * weekmate_pms repo). Dates are expressed as day offsets from the run date ("d-75" = -75).
 */
"use strict";

const COMPANY = {
  id: "6730a4a4a4a4a4a4a4a4a4a1",
  name: "Aarav Enterprises",
  domain: "aaravent",
  code: "AARAV",
  adminEmail: "admin@aaravent.com",
  password: "Aarav@2026",
  clientPassword: "Client@2026",
};

// Taskhub PMS roles are Admin / PC / AM / TL / User / Client. PM (Neha) -> PC, delivery manager -> PC,
// account manager -> AM, team managers -> TL.
const CORE_PEOPLE = [
  { code: "AA001", name: "Rajesh Mehta", title: "Managing Director", role: "Admin", dept: "Management", ctc: 350000, skills: [], branch: "Ahmedabad" },
  { code: "AA002", name: "Priya Sharma", title: "HR Manager", role: "User", dept: "HR", ctc: 120000, skills: [], branch: "Ahmedabad" },
  { code: "AA003", name: "Amit Patel", title: "CTO / Delivery Manager", role: "PC", dept: "Delivery", ctc: 260000, skills: ["Architecture", "Magento", "AWS"], branch: "Ahmedabad" },
  { code: "AA004", name: "Neha Gupta", title: "Project Manager", role: "PC", dept: "Delivery", ctc: 150000, skills: ["Project Mgmt", "Agile"], branch: "Ahmedabad" },
  { code: "AA005", name: "Vikram Singh", title: "Sales Manager", role: "User", dept: "Sales", ctc: 140000, skills: [], branch: "Mumbai" },
  { code: "AA006", name: "Kavita Shah", title: "Account Manager", role: "AM", dept: "Sales", ctc: 90000, skills: [], branch: "Ahmedabad" },
  { code: "AA007", name: "Divya Menon", title: "Finance Manager", role: "User", dept: "Finance", ctc: 95000, skills: ["Tally", "GST"], branch: "Ahmedabad" },
  { code: "AA008", name: "Siddharth Rao", title: "Sales Executive", role: "User", dept: "Sales", ctc: 55000, skills: [], branch: "Bengaluru" },
  { code: "AA009", name: "Sneha Iyer", title: "Team Manager, Magento/PHP", role: "TL", dept: "Engineering", ctc: 170000, skills: ["Magento", "PHP", "MySQL"], branch: "Ahmedabad", group: "magento" },
  { code: "AA010", name: "Arjun Reddy", title: "Team Manager, Mobile", role: "TL", dept: "Engineering", ctc: 165000, skills: ["React Native", "Flutter", "Android"], branch: "Bengaluru", group: "mobile" },
  { code: "AA011", name: "Pooja Verma", title: "Team Manager, QA and UI/UX", role: "TL", dept: "QA", ctc: 130000, skills: ["Selenium", "Figma"], branch: "Mumbai", group: "qa" },
  { code: "AA012", name: "Rohan Desai", title: "Senior Magento Developer", role: "User", dept: "Engineering", ctc: 110000, skills: ["Magento", "PHP"], branch: "Ahmedabad", group: "magento" },
  { code: "AA013", name: "Anjali Nair", title: "UI/UX Designer", role: "User", dept: "Design", ctc: 85000, skills: ["Figma", "UI/UX"], branch: "Mumbai", group: "design" },
  { code: "AA014", name: "Karan Joshi", title: "Mobile App Developer", role: "User", dept: "Engineering", ctc: 95000, skills: ["React Native"], branch: "Bengaluru", group: "mobile" },
  { code: "AA015", name: "Manish Kulkarni", title: "PHP Developer", role: "User", dept: "Engineering", ctc: 70000, skills: ["PHP", "Laravel"], branch: "Ahmedabad", group: "php" },
];

// Extras AA016-AA056: skill groups. Names/emails/CTC come from data/aaravRoster.json (HRMS people master); only the group metadata is used.
const EXTRA_GROUPS = [
  { from: 16, to: 22, group: "magento", title: "Magento Developer", dept: "Engineering", skills: ["Magento", "PHP"], manager: "AA009" },
  { from: 23, to: 28, group: "php", title: "PHP/Laravel Developer", dept: "Engineering", skills: ["PHP", "Laravel"], manager: "AA009" },
  { from: 29, to: 36, group: "mobile", title: "Mobile Developer", dept: "Engineering", skills: ["React Native", "Flutter"], manager: "AA010" },
  { from: 37, to: 45, group: "react", title: "React/Node.js Developer", dept: "Engineering", skills: ["React", "Node.js"], manager: "AA010" },
  { from: 46, to: 50, group: "qa", title: "QA Engineer", dept: "QA", skills: ["Selenium", "Manual Testing"], manager: "AA011" },
  { from: 51, to: 53, group: "design", title: "UI/UX Designer", dept: "Design", skills: ["Figma", "UI/UX"], manager: "AA011" },
  { from: 54, to: 56, group: "devops", title: "DevOps Engineer", dept: "DevOps", skills: ["AWS", "Docker"], manager: "AA003" },
];

const FIRST_NAMES = ["Aditya", "Ishaan", "Kunal", "Nikhil", "Harsh", "Yash", "Ritesh", "Tushar", "Gaurav", "Mihir", "Pranav", "Dhruv", "Jay", "Chirag", "Hiren", "Bhavin", "Ankit", "Deepak", "Suresh", "Ramesh", "Ayesha", "Ritu", "Meera", "Kritika", "Nisha", "Pallavi", "Shruti", "Tanvi", "Swati", "Bhavna", "Komal", "Disha", "Hetal", "Jinal", "Khushi", "Mansi", "Nidhi", "Payal", "Rekha", "Sana", "Trisha", "Varun", "Zubin", "Lakshmi", "Ganesh", "Venkat", "Preeti", "Farhan", "Imran", "Sandeep"];
const LAST_NAMES = ["Trivedi", "Bhatt", "Pandya", "Parekh", "Modi", "Solanki", "Chauhan", "Rathod", "Jadeja", "Dave", "Thakkar", "Raval", "Kapadia", "Desai", "Naik", "Pillai", "Menon", "Hegde", "Shetty", "Kamath", "Bhosale", "Deshmukh", "Jadhav", "Pawar", "Gokhale", "Banerjee", "Chatterjee", "Mukherjee", "Sen", "Das", "Malhotra", "Khanna", "Arora", "Bansal", "Saxena", "Tiwari", "Mishra", "Pandey", "Yadav", "Qureshi", "Ansari", "Sheikh", "Naidu", "Rao", "Krishnan", "Subramanian", "Ramaswamy", "Varghese", "Thomas", "George"];

// ── Customers / projects ──────────────────────────────────────────────────────
// All pmsclients are created for the 6 customers; projects 001, 002, 003, 006 exist in Taskhub.
const CUSTOMERS = [
  { code: "001", name: "ABC Technologies", city: "Ahmedabad", domain: "abctechnologies.in", contact: ["Mahesh", "Thakkar"] },
  { code: "002", name: "Kaveri Retail Pvt Ltd", city: "Surat", domain: "kaveriretail.in", contact: ["Hetal", "Choksi"] },
  { code: "003", name: "Sundaram Logistics", city: "Chennai", domain: "sundaramlogistics.in", contact: ["Ramesh", "Sundaram"] },
  { code: "004", name: "Greenfield Agro Ltd", city: "Pune", domain: "greenfieldagro.in", contact: ["Sanjay", "Kulkarni"] },
  { code: "005", name: "Zenith Healthcare", city: "Mumbai", domain: "zenithhealthcare.in", contact: ["Dr. Anita", "Deshpande"] },
  { code: "006", name: "Orbit Finserv", city: "Bengaluru", domain: "orbitfinserv.in", contact: ["Prakash", "Hegde"] },
];

const MILESTONES = [
  { key: "M1", title: "Kickoff and requirements", weight: 10, billingPercent: 30 },
  { key: "M2", title: "UI/UX design and approval", weight: 15, billingPercent: 20 },
  { key: "M3", title: "Backend development", weight: 25, billingPercent: 0 },
  { key: "M4", title: "Mobile/Frontend development", weight: 20, billingPercent: 30 },
  { key: "M5", title: "Integration and QA", weight: 15, billingPercent: 0 },
  { key: "M6", title: "UAT and client review", weight: 10, billingPercent: 0 },
  { key: "M7", title: "Deployment and handover", weight: 5, billingPercent: 20 },
];

/**
 * team: [code, allocation %, optional segments [{from, to, pct}] (day offsets, overrides the base %)]
 * ms:   per milestone { due, status, approved?, submitted?, returned?, rework?, note?, evidence? } (day offsets)
 * hoursTarget / costTarget: calibration of the logged hours (see seed script).
 */
const PROJECTS = [
  {
    code: "PRJ-2026-001", customer: "001", title: "ABC Technologies - Magento E-commerce and Mobile App",
    value: 1500000, start: -75, end: 75, estimatedHours: 2400, status: "Active", color: "#4e73df",
    types: ["E-commerce", "Mobile App"], tech: ["Magento", "PHP", "React Native", "MySQL", "AWS"],
    descriptions: "Magento 2 e-commerce storefront with a companion React Native mobile app for ABC Technologies: catalogue, checkout, ERP stock sync and order tracking.",
    team: [["AA012", 100], ["AA016", 100], ["AA015", 100], ["AA014", 100], ["AA029", 100], ["AA013", 25], ["AA046", 50], ["AA004", 40], ["AA009", 10]],
    manager: "AA004", teamManager: "AA009", bugs: true, hoursTarget: 1100,
    ms: [
      { due: -58, status: "Approved", approved: -55 },
      { due: -25, status: "Approved", approved: -22 },
      { due: -3, status: "Submitted", submitted: -1, evidence: 2, note: "Backend APIs (catalogue, cart, checkout, order sync) complete and deployed to staging. Postman collection and API docs attached." },
      { due: 25, status: "Not Started" }, { due: 50, status: "Not Started" }, { due: 65, status: "Not Started" }, { due: 75, status: "Not Started" },
    ],
  },
  {
    code: "PRJ-2026-002", customer: "002", title: "Kaveri Retail - Inventory and ERP Web Platform",
    value: 2200000, start: -90, end: 120, estimatedHours: 4800, status: "Active", color: "#1cc88a",
    types: ["ERP", "Web Development"], tech: ["React", "Node.js", "PHP", "MySQL"],
    descriptions: "Multi-warehouse inventory and ERP web platform for Kaveri Retail: purchase, stock, sales and GST invoicing with role based dashboards.",
    team: [["AA037", 100], ["AA038", 100], ["AA039", 100], ["AA040", 100], ["AA023", 100], ["AA047", 50], ["AA051", 50], ["AA004", 30], ["AA009", 10]],
    manager: "AA004", teamManager: "AA009", bugs: true, approvedHoursTarget: 800,
    ms: [
      { due: -72, status: "Approved", approved: -70 },
      { due: -9, status: "Rework Required", submitted: -6, returned: -4, rework: 1, evidence: 2, note: "Figma prototype for all ERP modules submitted for approval.", reviewNote: "Prototype missing mobile responsive screens; resubmit with updated Figma links" },
      { due: 20, status: "Not Started" }, { due: 55, status: "Not Started" }, { due: 80, status: "Not Started" }, { due: 100, status: "Not Started" }, { due: 120, status: "Not Started" },
    ],
  },
  {
    code: "PRJ-2026-003", customer: "003", title: "Sundaram Logistics - Fleet Tracking Mobile App",
    value: 1850000, start: -170, end: 30, estimatedHours: 6500, status: "Active", color: "#f6c23e",
    types: ["Mobile App"], tech: ["React Native", "Flutter", "Node.js", "AWS", "Docker"],
    descriptions: "Fleet tracking mobile app for Sundaram Logistics: live GPS tracking, trip management, driver app, geofencing alerts and operations dashboard.",
    team: [["AA030", 100], ["AA031", 100], ["AA032", 100], ["AA033", 100], ["AA041", 100], ["AA048", 50], ["AA054", 50], ["AA004", 30]],
    manager: "AA004", teamManager: "AA010", bugs: true, approvedHoursTarget: 890,
    ms: [
      { due: -152, status: "Approved", approved: -150 }, { due: -128, status: "Approved", approved: -125 },
      { due: -88, status: "Approved", approved: -85 }, { due: -42, status: "Approved", approved: -40 },
      { due: 5, status: "In Progress" }, { due: 20, status: "Not Started" }, { due: 30, status: "Not Started" },
    ],
  },
  {
    code: "PRJ-2026-006", customer: "006", title: "Orbit Finserv - Payments Analytics Dashboard",
    value: 900000, start: -240, end: -20, closedOn: -10, estimatedHours: 1800, status: "Closed", color: "#36b9cc",
    types: ["Analytics", "Web Development"], tech: ["React", "Node.js", "PHP", "MySQL"],
    descriptions: "Payments analytics dashboard for Orbit Finserv: settlement reconciliation, failure analytics and merchant-wise revenue reports. Delivered and closed.",
    // varied allocation over the life of the project
    team: [
      ["AA018", 60], ["AA024", 80], ["AA042", 100], ["AA043", 100], ["AA050", 50],
      ["AA013", 40, [{ from: -240, to: -190, pct: 100 }, { from: -189, to: -20, pct: 20 }]],
    ],
    manager: "AA004", teamManager: "AA009", bugs: true, costTarget: 640000,
    ms: [
      { due: -222, status: "Approved", approved: -220 }, { due: -198, status: "Approved", approved: -195 },
      { due: -165, status: "Approved", approved: -160, rework: 1 }, { due: -125, status: "Approved", approved: -120 },
      { due: -90, status: "Approved", approved: -85 }, { due: -55, status: "Approved", approved: -50 },
      { due: -25, status: "Approved", approved: -22 },
    ],
  },
];

// Task title templates per milestone: [title, discipline]. Discipline picks assignees by skill group.
const TASKS_BY_MILESTONE = {
  M1: [
    ["Kickoff meeting with client stakeholders", "pm"], ["Capture business requirements (BRD)", "pm"], ["Prepare scope and assumptions document", "pm"],
    ["Technical feasibility and architecture notes", "dev"], ["Define project plan, milestones and RACI", "pm"], ["Set up repositories, environments and CI", "devops"],
    ["Risk register and communication plan", "pm"], ["Sign-off on requirements", "pm"],
  ],
  M2: [
    ["User flows and information architecture", "design"], ["Wireframes for core screens", "design"], ["Design system and style guide", "design"],
    ["High fidelity UI mockups", "design"], ["Clickable prototype in Figma", "design"], ["Mobile responsive screen designs", "design"],
    ["Design review with client", "pm"], ["Design approval and asset handoff", "design"],
  ],
  M3: [
    ["Database schema and migrations", "dev"], ["Authentication and role based access", "dev"], ["Catalogue and inventory APIs", "dev"],
    ["Cart and checkout APIs", "dev"], ["Order management and status workflow", "dev"], ["Payment gateway integration", "dev"],
    ["Admin panel modules", "dev"], ["Email and notification service", "dev"], ["API documentation (Swagger)", "dev"],
    ["Unit tests for core services", "qa"], ["Performance tuning of heavy queries", "dev"], ["Deploy backend to staging", "devops"],
  ],
  M4: [
    ["Storefront / app shell and navigation", "dev"], ["Product listing and search screens", "dev"], ["Product detail and gallery", "dev"],
    ["Cart and checkout screens", "dev"], ["Account, orders and tracking screens", "dev"], ["Push notifications and deep links", "dev"],
    ["Offline handling and error states", "dev"], ["Accessibility and responsive polish", "design"], ["Frontend unit tests", "qa"],
  ],
  M5: [
    ["Third-party and ERP integration", "dev"], ["End-to-end test plan", "qa"], ["Functional test execution (cycle 1)", "qa"],
    ["Regression suite automation", "qa"], ["Security review and fixes", "dev"], ["Performance and load testing", "devops"],
    ["Bug triage and fixes (cycle 1)", "dev"], ["Bug triage and fixes (cycle 2)", "dev"], ["QA sign-off report", "qa"],
  ],
  M6: [
    ["Prepare UAT environment and data", "devops"], ["UAT scripts and training session", "pm"], ["Client UAT execution support", "qa"],
    ["Fix UAT defects", "dev"], ["Collect client feedback and sign-off", "pm"],
  ],
  M7: [
    ["Production environment setup", "devops"], ["Data migration and go-live checklist", "devops"], ["Production deployment", "devops"],
    ["Hypercare and monitoring", "dev"], ["Documentation and knowledge transfer", "pm"], ["Handover and project closure", "pm"],
  ],
};

const SUBTASK_TITLES = ["Analysis and approach", "Implementation", "Code review changes", "Testing and verification", "Documentation", "Client feedback changes"];

const COMMENTS = [
  "Picked this up today, will share an update by EOD.", "Done on my side, moving to review.", "Blocked on credentials from the client, pinged Kavita.",
  "Updated as per the review comments, please re-check.", "Verified on staging, looks good.", "Added edge-case handling for empty states.",
  "Client asked for a small change here, discussed with Neha.", "Estimate revised after looking at the integration complexity.",
  "Merged to the release branch.", "Need one more day for testing, no impact on the milestone date.", "Found a regression, raised a bug and fixed it.",
  "Shared the build with the client for a quick look.", "Please review the Figma link before the stand-up.", "Closing this, all acceptance criteria met.",
];

const LABELS = [
  { title: "Frontend", color: "#4e73df" }, { title: "Backend", color: "#1cc88a" }, { title: "Mobile", color: "#36b9cc" },
  { title: "Design", color: "#e83e8c" }, { title: "QA", color: "#f6c23e" }, { title: "DevOps", color: "#6f42c1" },
  { title: "Client Request", color: "#fd7e14" }, { title: "Blocked", color: "#e74a3b" }, { title: "Documentation", color: "#858796" },
];

const FILE_NAMES = [
  ["Requirements_BRD", ".pdf"], ["Scope_and_Assumptions", ".docx"], ["Project_Plan", ".xlsx"], ["UI_Style_Guide", ".pdf"], ["Wireframes_v2", ".pdf"],
  ["API_Documentation", ".pdf"], ["Postman_Collection", ".json"], ["Test_Cases", ".xlsx"], ["UAT_Signoff_Template", ".docx"], ["Architecture_Diagram", ".png"],
  ["Weekly_Status_Report", ".pdf"], ["Release_Notes", ".md"],
];

const BUG_TITLES = [
  "Checkout total mismatch with tax on mixed carts", "Order status not updating after payment webhook", "Push notification not received on Android 14",
  "Search results ignore category filter", "Date picker shows wrong timezone", "Report export fails above 5000 rows", "Image upload rejects PNG over 2 MB",
  "Login session expires too early on mobile", "Pagination resets after applying filters", "Stock count off by one after cancelled order",
];

const NOTE_TITLES = ["Kickoff meeting notes", "Client call: scope clarifications", "Architecture decisions", "Sprint retro", "UAT feedback summary", "Release checklist"];
const DISCUSSION_TITLES = ["Release plan and freeze date", "Payment gateway choice", "Mobile responsive requirements", "Environment access for client", "Change request: loyalty points"];

module.exports = {
  COMPANY, CORE_PEOPLE, EXTRA_GROUPS, FIRST_NAMES, LAST_NAMES, CUSTOMERS, MILESTONES, PROJECTS,
  TASKS_BY_MILESTONE, SUBTASK_TITLES, COMMENTS, LABELS, FILE_NAMES, BUG_TITLES, NOTE_TITLES, DISCUSSION_TITLES,
};
