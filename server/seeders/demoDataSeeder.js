/**
 * Demo Data Seeder — Weekmate TaskHub
 *
 * Seeds: 55 employees, 10 projects, 100 tasks, 100 notes, 100 bugs,
 *        100 discussions, 5–6 project expenses, 12 complaints,
 *        12 consumer-feedback forms, 12 reviews.
 *
 * Usage:
 *   node server/seeders/demoDataSeeder.js
 *   node server/seeders/demoDataSeeder.js --companyId=<ObjectId>
 *   node server/seeders/demoDataSeeder.js --companyId=<ObjectId> --userId=<EmployeeObjectId>
 *
 * --companyId: If omitted, the first active company in the DB is used.
 * --userId:    Employee ID of the logged-in user. When provided, that user is added
 *              as an assignee on every seeded task so they appear on the main task
 *              listing page even when "My Tasks" (view_all: false) is active.
 *
 * NOTE: Group-chat functionality has no model in this codebase — skipped.
 */

"use strict";

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const crypto = require("crypto");

// Required globals (normally set by app.js)
global.moment = require("moment");
global.chalk  = require("chalk");

const envPath = path.resolve(__dirname, "../env/.env.dev");
dotenv.config({ path: envPath });

require("../models");
require("../models/projectexpanses"); // not in models/index.js

// ─── Model references ────────────────────────────────────────────────────────
const Company            = mongoose.model("companies");
const Employee           = mongoose.model("employees");
const PMSClient          = mongoose.model("pmsclients");
const PMSRole            = mongoose.model("pms_roles");
const Project            = mongoose.model("projects");
const ProjectType        = mongoose.model("projecttypes");
const ProjectStatus      = mongoose.model("projectstatus");
const ProjectWorkFlow    = mongoose.model("projectworkflows");
const WorkFlowStatus     = mongoose.model("workflowstatus");
const BugWFStatus        = mongoose.model("bugsworkflowstatus");
const ProjectMainTask    = mongoose.model("projectmaintasks");
const Task               = mongoose.model("projecttasks");
const Bug                = mongoose.model("projecttaskbugs");
const NoteBook           = mongoose.model("notebook");
const Note               = mongoose.model("notes_pms");
const Discussion         = mongoose.model("discussionstopics");
const ProjectExpense     = mongoose.model("projectexpanses");
const Complaint          = mongoose.model("complaints");
const ConsumerFeedback   = mongoose.model("consumer_feedback_forms");
const Review             = mongoose.model("reviews");

// ─── Helpers ─────────────────────────────────────────────────────────────────
const md5 = (str) => crypto.createHash("md5").update(str).digest("hex");
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const range = (n)   => Array.from({ length: n }, (_, i) => i);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function isoDate(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d;
}

// ─── Static realistic data ────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Arjun","Priya","Rohan","Ananya","Karan","Sneha","Rahul","Pooja","Vikram","Meera",
  "Aditya","Kavya","Nikhil","Divya","Siddharth","Shreya","Akash","Neha","Ravi","Anjali",
  "Harish","Swati","Manish","Rekha","Deepak","Preeti","Suresh","Lalitha","Ashwin","Bhavana",
  "James","Emily","Michael","Sarah","David","Jessica","Daniel","Ashley","Matthew","Amanda",
  "Liam","Olivia","Noah","Emma","Oliver","Ava","Elijah","Sophia","Lucas","Isabella",
  "Ethan","Charlotte","Aiden","Mia","Jackson"
];

const LAST_NAMES = [
  "Sharma","Patel","Singh","Kumar","Gupta","Reddy","Mehta","Shah","Joshi","Nair",
  "Iyer","Verma","Agarwal","Bose","Kapoor","Chopra","Malhotra","Sinha","Rao","Pillai",
  "Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Garcia","Wilson","Martinez",
  "Anderson","Taylor","Thomas","Jackson","White","Harris","Clark","Lewis","Robinson","Walker",
  "Hall","Allen","Young","King","Scott","Green","Baker","Adams","Nelson","Carter",
  "Mitchell","Roberts","Campbell","Turner","Phillips"
];

const DEPARTMENTS = ["Engineering","Design","QA","DevOps","Product","Marketing","Sales","Finance","HR","Operations"];

const PROJECT_DATA = [
  {
    title: "NexaBank Digital Transformation",
    descriptions: "End-to-end digital overhaul of retail banking infrastructure including mobile app, API gateway, and core banking modernisation.",
    color: "#4e73df",
    estimatedHours: "2400",
  },
  {
    title: "HealthPulse Patient Portal",
    descriptions: "Secure, HIPAA-compliant portal allowing patients to book appointments, view lab results, and communicate with physicians.",
    color: "#1cc88a",
    estimatedHours: "1800",
  },
  {
    title: "ShopEase E-commerce Platform",
    descriptions: "Multi-vendor marketplace with real-time inventory, AI-powered recommendations, and seamless Stripe/PayPal checkout.",
    color: "#36b9cc",
    estimatedHours: "2000",
  },
  {
    title: "LogiTrack Fleet Management",
    descriptions: "Real-time GPS fleet tracking, route optimisation, fuel analytics, and driver performance dashboards.",
    color: "#f6c23e",
    estimatedHours: "1600",
  },
  {
    title: "EduSpark Learning Management System",
    descriptions: "Interactive LMS featuring live classes, quiz engine, gamification, and adaptive learning paths for K-12 students.",
    color: "#e74a3b",
    estimatedHours: "2200",
  },
  {
    title: "PropView Real Estate Hub",
    descriptions: "Property listing aggregator with virtual tours, mortgage calculator, agent matching, and CRM integration.",
    color: "#858796",
    estimatedHours: "1400",
  },
  {
    title: "CloudVault SaaS Infrastructure",
    descriptions: "Multi-tenant cloud storage SaaS with role-based access control, versioning, audit logs, and S3-compatible API.",
    color: "#5a5c69",
    estimatedHours: "2600",
  },
  {
    title: "RetailMatrix POS System",
    descriptions: "Cross-platform point-of-sale application with offline sync, barcode scanning, loyalty programmes, and inventory management.",
    color: "#fd7e14",
    estimatedHours: "1200",
  },
  {
    title: "TechHire Recruitment Portal",
    descriptions: "AI-assisted talent acquisition platform with resume parsing, interview scheduling, and analytics dashboards for HR teams.",
    color: "#6f42c1",
    estimatedHours: "1000",
  },
  {
    title: "GreenEnergy Monitoring Dashboard",
    descriptions: "IoT-driven renewable energy monitoring system tracking solar/wind output, consumption patterns, and carbon credit reporting.",
    color: "#20c997",
    estimatedHours: "1800",
  },
];

const TASK_LIST_NAMES = [
  ["Sprint 1 — Discovery","Sprint 2 — Design","Sprint 3 — Development","Sprint 4 — QA & Release"],
  ["Research & Planning","UI/UX Design","Backend Development","Frontend Integration","Testing & Deployment"],
  ["Backlog","In Progress","Review","Done"],
];

const TASK_TITLES = [
  "Set up project repository and CI/CD pipeline",
  "Define database schema and ERD",
  "Implement user authentication with JWT",
  "Design dashboard wireframes in Figma",
  "Integrate third-party payment gateway",
  "Write unit tests for core services",
  "Configure Nginx reverse proxy",
  "Build RESTful API for user management",
  "Implement role-based access control",
  "Create email notification templates",
  "Set up Docker Compose for local dev",
  "Optimise SQL query performance",
  "Add pagination to listing endpoints",
  "Implement file upload with AWS S3",
  "Write API documentation with Swagger",
  "Design mobile-responsive UI components",
  "Integrate real-time notifications with Socket.IO",
  "Build admin analytics dashboard",
  "Add multi-language (i18n) support",
  "Perform security audit and fix vulnerabilities",
  "Implement caching layer with Redis",
  "Create onboarding flow for new users",
  "Build reporting module with CSV export",
  "Migrate legacy data to new schema",
  "Implement two-factor authentication",
  "Design and implement dark mode",
  "Integrate Google Maps / MapBox SDK",
  "Write end-to-end tests with Cypress",
  "Set up monitoring with Grafana + Prometheus",
  "Implement webhook system for external integrations",
  "Build drag-and-drop Kanban board",
  "Add soft delete and data archiving",
  "Create customer support chat widget",
  "Implement advanced search with Elasticsearch",
  "Build calendar and scheduling module",
  "Add barcode / QR code scanning support",
  "Design error handling and fallback UI",
  "Implement audit trail for sensitive operations",
  "Optimise bundle size and lazy loading",
  "Build push notification service",
  "Integrate SSO with OAuth2 / SAML",
  "Create PDF generation for invoices",
  "Implement rate limiting on public APIs",
  "Build data import / export wizard",
  "Add A/B testing framework",
  "Design and implement in-app help centre",
  "Set up automated database backups",
  "Implement GDPR data export and deletion",
  "Build custom form builder module",
  "Conduct code review and refactoring sprint",
  "Add activity feed and audit log viewer",
  "Implement multi-tenant architecture",
  "Create automated deployment scripts",
  "Build approval workflow engine",
  "Integrate third-party analytics (Mixpanel)",
  "Design error monitoring with Sentry",
  "Implement server-side rendering for SEO",
  "Build inventory alert system",
  "Create employee onboarding module",
  "Integrate payment reconciliation reports",
  "Implement geofencing for location tracking",
  "Build financial forecasting module",
  "Add watermarking to exported documents",
  "Design system: create shared component library",
  "Implement data masking for PII fields",
  "Build subscription billing with Stripe",
  "Create SLA monitoring and alerting",
  "Add bulk import via CSV/Excel",
  "Implement micro-frontend architecture",
  "Build recommendation engine with ML model",
  "Create automated testing pipeline",
  "Implement feature flag system",
  "Add real-time collaboration editing",
  "Build asset management module",
  "Design and build customer portal",
  "Implement deep-linking in mobile app",
  "Create custom report builder",
  "Add vendor management functionality",
  "Implement SSE for live data streaming",
  "Build smart search with autocomplete",
  "Create network topology visualiser",
  "Add contract management module",
  "Implement cookie consent banner",
  "Build KPI dashboard for executives",
  "Create automated invoice generation",
  "Implement multi-currency support",
  "Add time zone handling for global users",
  "Build SLA breach notification system",
  "Design checklist and approval forms",
  "Implement resource allocation planner",
  "Create workflow automation engine",
  "Add fingerprint / Face ID login",
  "Build bulk action tools for admin panel",
  "Implement data retention policies",
  "Create compliance reporting module",
  "Add document e-signature integration",
  "Build live chat support module",
  "Implement offline-first PWA functionality",
  "Create white-label theming system",
  "Add batch processing for background jobs",
  "Build integration test harness",
  "Implement cross-browser compatibility fixes",
];

const BUG_TITLES = [
  "Login page crashes on iOS Safari 16",
  "Dashboard charts not rendering on Firefox",
  "File upload fails for files larger than 5 MB",
  "Password reset email not received in Gmail",
  "User session expires after 5 minutes despite 'Remember Me'",
  "Date picker shows wrong timezone in UTC+5:30",
  "Pagination breaks when filter is applied",
  "Export to CSV includes deleted records",
  "Notification badge count doesn't reset on read",
  "Profile picture upload distorts aspect ratio",
  "Search returns duplicate results for partial matches",
  "API returns 500 on empty optional fields",
  "Mobile sidebar overlaps main content on Android",
  "Table sorting resets after page refresh",
  "Form validation allows special characters in name fields",
  "Invoice PDF missing line items on second page",
  "Email template renders broken on Outlook 2016",
  "Kanban card drag-drop loses assignee on drop",
  "Report download link expires before user clicks",
  "Multi-select dropdown clears on keyboard navigation",
  "Task due date not saving when set to today",
  "Avatar initials show for deleted users",
  "Calendar month view misaligns on leap year February",
  "API rate limiter blocks admin users unexpectedly",
  "Project archive button visible to non-admin roles",
  "Deep link redirects to 404 after login",
  "Real-time notification fires twice on duplicate events",
  "Filter chip label truncates at 15 characters",
  "Dark mode CSS variables missing in print stylesheet",
  "Row hover state remains after modal opens",
  "Bulk delete fails silently on network timeout",
  "Dropdown z-index clipped inside scrollable container",
  "File preview crashes for password-protected PDFs",
  "Search input loses focus after first character typed",
  "Dashboard widget positions not persisted after logout",
  "Time tracker continues running after task is closed",
  "Comment edit saves empty content without error",
  "Sub-task completion doesn't update parent task progress",
  "Webhook delivery fails after SSL certificate renewal",
  "Two-factor auth flow skipped on social login",
  "Graph tooltip overlaps axis labels on small screens",
  "Image gallery keyboard navigation stops at slide 5",
  "Color picker hex input doesn't accept 3-digit values",
  "User timezone change not reflected until next login",
  "Scheduled report sends at wrong time after DST change",
  "Currency formatting shows incorrect symbol in France",
  "Table column resizing resets on scroll",
  "Offline mode shows stale data for 30 minutes",
  "Delete confirmation modal submits on Escape key",
  "Auto-save overwrites manual changes on concurrent edit",
  "Password strength meter counts spaces as valid characters",
  "CSV import silently skips rows with Unicode characters",
  "Tooltip disappears before readable on slow connections",
  "Branch filter in reports includes archived branches",
  "Audit log timestamps show server time not user local time",
  "Admin impersonate mode doesn't restore original session",
  "Drag-resize breaks grid layout in nested containers",
  "Activity feed shows events in wrong chronological order",
  "Role change requires logout to take effect",
  "Map marker clustering crashes when zooming past level 15",
  "Form submit button enabled before all required fields filled",
  "Email unsubscribe link generates 404",
  "Bulk status update sends individual email per record",
  "Progress bar exceeds 100% when hours overlogged",
  "Comment @mention notification sent to deactivated user",
  "Tag autocomplete shows tags from deleted projects",
  "Chart tooltip value rounds to 0 for values below 0.5",
  "Attachment preview unavailable for .heic image format",
  "Lazy-loaded images flicker on initial scroll",
  "Report filter 'Last 30 days' includes day 31",
  "Invoice total shows wrong amount when discount applied",
  "User import skips row when phone number has leading +",
  "Logo upload accepts non-image MIME types",
  "Push notification not delivered on iOS when DND active",
  "API response includes full stack trace in production",
  "Employee onboarding checklist resets if browser tab refreshed",
  "Timeline Gantt chart bars overlap when tasks have same end date",
  "Settings save button incorrectly shows loading state",
  "Notification sound plays even when 'mute' is enabled",
  "Time log description field accepts SQL injection characters",
  "Currency conversion rate not updated after daily refresh",
  "Task title allows 0-character save on mobile enter tap",
  "Admin table 'Select All' checkbox deselects on page scroll",
  "Tab key order skips 'Cancel' button in modal forms",
  "Recurring task generates duplicate on timezone boundary midnight",
  "Module permission toggle doesn't disable child permissions",
  "Sign-up flow allows duplicate emails with different casing",
  "Batch export exceeds memory limit for 10k+ records",
  "Client portal shows internal employee comments",
  "Gantt chart print view cuts off right half of timeline",
  "Multi-file upload shows progress bar at 0% permanently",
  "Keyboard shortcut Ctrl+Z triggers browser back on Firefox",
  "Dashboard summary card totals don't match detail view counts",
  "Invoice approval email not sent when approver email has alias",
  "Mobile scroll inertia causes unintended item selection",
  "Employee photo compressor corrupts transparency in PNG files",
  "Project completion percentage shows NaN when no tasks exist",
  "Date range picker disables incorrect dates in non-Gregorian locales",
  "Logout API endpoint accessible without authentication token",
  "Rich-text editor loses formatting on copy-paste from Microsoft Word",
];

const NOTE_TITLES = [
  "Architecture Decision Record — Microservices vs Monolith",
  "Sprint Review Notes — Week 12",
  "API Integration Guide: Third-party Payment Gateway",
  "Database Indexing Strategy",
  "Meeting Minutes — Client Kickoff Call",
  "Q3 Roadmap Planning Notes",
  "Security Audit Findings and Remediation",
  "Onboarding Checklist for New Developers",
  "UI/UX Design Principles & Style Guide Reference",
  "Infrastructure Cost Breakdown — AWS",
  "Staging Environment Setup Instructions",
  "Release Checklist — v2.1.0",
  "Technical Debt Register",
  "Data Migration Plan",
  "Third-party Service SLAs and Contacts",
  "Code Review Guidelines",
  "Load Testing Results — October",
  "Compliance Requirements (GDPR / ISO 27001)",
  "Mobile App Submission Checklist (App Store)",
  "Analytics Tracking Plan",
  "Deployment Runbook",
  "Incident Post-mortem: Database Downtime",
  "A/B Test Hypotheses Log",
  "Customer Feedback Synthesis — Q2",
  "Feature Flag Strategy",
  "Team Retrospective Notes — Sprint 8",
  "Cross-browser Testing Matrix",
  "Disaster Recovery Plan",
  "SSO Integration Notes (SAML 2.0)",
  "API Rate Limiting Policy",
  "Third-party Library Audit",
  "Performance Benchmarks — Page Load Times",
  "Design System Tokens Reference",
  "User Research Interview Insights",
  "Accessibility Compliance Checklist (WCAG 2.1)",
  "Webhook Events Catalogue",
  "Payment Reconciliation Logic",
  "Error Code Reference Guide",
  "Localisation and i18n Guide",
  "CI/CD Pipeline Documentation",
  "Database Backup and Restore Procedures",
  "Multi-tenancy Architecture Notes",
  "Email Deliverability Troubleshooting",
  "Integration Test Coverage Report",
  "Project Risk Register",
  "SEO Technical Audit Notes",
  "Monitoring and Alerting Runbook",
  "Custom Report Builder Spec",
  "Sprint Velocity Chart Notes",
  "Client Demo Preparation Checklist",
  "Data Flow Diagram Notes",
  "Authentication Flows Documentation",
  "RBAC Permission Matrix Notes",
  "Service Dependency Map",
  "Server Capacity Planning",
  "User Story Map Notes",
  "SDK Setup Guide for Mobile Team",
  "Third-party API Changelog Review",
  "Acceptance Criteria Template",
  "Definition of Done Reference",
  "Code Freeze Checklist",
  "GraphQL Schema Design Notes",
  "Event Sourcing Architecture Notes",
  "Kafka Topic Design Document",
  "Caching Strategy Notes",
  "Microservice Boundaries Document",
  "Data Retention Policy Implementation Notes",
  "Zero-downtime Deployment Checklist",
  "Feature Development Timeline Notes",
  "Stakeholder Communication Plan",
  "Product Backlog Grooming Notes",
  "API Versioning Strategy",
  "Token Refresh Flow Notes",
  "Data Validation Rules Reference",
  "Testing Strategy Document",
  "Observability Strategy Notes",
  "Team Capacity and Leave Notes",
  "Partner Integration Specifications",
  "Design Review Feedback Notes",
  "Security Pen Test Scope Notes",
  "Customer Success Handover Notes",
  "Regression Test Suite Coverage",
  "Localization File Management Notes",
  "Payment Gateway Failover Notes",
  "Infrastructure Scaling Triggers",
  "Sprint Goal Notes — Sprint 15",
  "Knowledge Transfer Document",
  "Pre-launch Communication Plan",
  "Service Account Permission Audit",
  "Mock Data Strategy for Development",
  "Session Management Notes",
  "Module Ownership Registry",
  "Browser Support Policy",
  "End-of-sprint Demo Script",
  "Interview Pipeline Notes for Tech Roles",
  "Feature Prioritisation Matrix",
  "User Acceptance Testing Plan",
  "System Health Check Procedures",
  "Changelog and Version History",
  "External Audit Preparation Notes",
  "Bug Triage Process Notes",
  "Sprint 1 Planning Notes",
];

const DISCUSSION_TITLES = [
  "Should we move to a microservices architecture?",
  "Proposal: Adopt TypeScript across the entire codebase",
  "Best practices for managing feature flags in production",
  "Database: PostgreSQL vs MongoDB — which fits best?",
  "How should we handle API versioning going forward?",
  "Design system: single repo or separate package?",
  "CI/CD pipeline optimisation ideas",
  "Code review standards — what should be mandatory?",
  "Should we invest in a dedicated DevOps engineer?",
  "Frontend framework evaluation: React vs Next.js",
  "How do we reduce deployment downtime to near zero?",
  "On-call rotation policy discussion",
  "Sprint length: 1 week vs 2 weeks — pros and cons",
  "Client feedback portal — who owns the roadmap?",
  "Handling breaking changes in public APIs",
  "Automated testing strategy — unit vs integration vs E2E",
  "Should we build or buy the analytics module?",
  "Remote work best practices for distributed teams",
  "Performance budgets and how to enforce them",
  "Data privacy: audit trail requirements",
  "Proposal: introduce pair programming sessions",
  "How to handle legacy code during the refactor",
  "Discussion: team naming conventions for branches",
  "Should mobile apps share business logic via shared lib?",
  "OKR alignment for Q4 — tech team perspective",
  "Rollout strategy for the new notification system",
  "Handling internationalization for right-to-left languages",
  "Should we adopt GraphQL or stick with REST?",
  "Incident response process improvements",
  "Proposal: weekly architecture office hours",
  "Data backup frequency and retention policy",
  "Observability stack: Datadog vs Grafana+Prometheus",
  "How should we handle GDPR deletion requests at scale?",
  "Proposal: monthly open-source contribution time",
  "Tech debt prioritisation — how we decide",
  "Release notes process and ownership",
  "Service mesh: do we need Istio at our scale?",
  "Improving developer experience in the local setup",
  "Should QA be embedded in squads or centralised?",
  "Documentation culture — making it a team habit",
  "Client onboarding tech requirements discussion",
  "Migrating from REST to event-driven architecture",
  "How to handle multi-region data residency requirements",
  "Proposal: internal hackathon — quarterly cadence",
  "Automated security scanning in CI pipeline",
  "Codebase ownership model — who can merge to main?",
  "Discussion: should we expose a public API?",
  "Handling timezone complexity in global scheduling features",
  "Approach to mobile offline-first functionality",
  "Design tokens: centralised or per-component?",
  "How we should structure error handling across services",
  "Introducing AI-assisted code review tools",
  "Proposal: rotating tech lead role",
  "Scaling strategy for the upcoming product launch",
  "Should we allow clients to customise their data schema?",
  "Discussion: browser support policy for 2025",
  "Feedback on the new sprint planning process",
  "Integrating accessibility from day one vs retrofitting",
  "Technical hiring bar — what should we test?",
  "How to prevent scope creep on feature branches",
  "Testing in production: safe patterns",
  "Handling third-party vendor outages",
  "Inter-team API contract management",
  "Proposal: consolidate multiple repos into a monorepo",
  "Improving sprint retrospectives — new formats to try",
  "Containerisation strategy: Docker Compose vs Kubernetes",
  "Cross-project shared component library governance",
  "Should we introduce a formal RFC process?",
  "Reducing flaky tests in the CI pipeline",
  "Discussing query optimisation approach for reporting module",
  "Multi-tenancy: schema-per-tenant vs row-level security",
  "Handling large file uploads reliably",
  "Proposal: open-source some of our internal tools",
  "Standardising log formats across services",
  "How we handle secrets and credential rotation",
  "Frontend state management: Redux vs Zustand vs Context",
  "Discussion: moving to edge computing for low-latency APIs",
  "Async vs sync communication between services",
  "Dark mode rollout plan and feedback",
  "How should we track and report on technical debt?",
  "Proposal: internal blog for engineering updates",
  "Reviewing our SLA commitments — are they realistic?",
  "How to effectively use AI coding assistants on the team",
  "Improving cross-team collaboration for shared projects",
  "Making the onboarding experience better for new hires",
  "Proposal: reduce meeting load with async updates",
  "Discussion: annual performance review structure for engineers",
  "How we handle production hotfixes without breaking process",
  "Feedback collection from clients — current process gaps",
  "Migrating from monolith to domain-driven modules",
  "Approach to managing environment variables securely",
  "Should we introduce architectural fitness functions?",
  "Proposal: dedicated innovation sprints",
  "Reviewing our test data management strategy",
  "How to improve visibility into project health metrics",
  "Discussion: service reliability — error budget approach",
  "Draft proposal for engineering career ladder",
  "Feedback on the latest deployment process changes",
  "Approach to managing database schema migrations",
  "Using feature branches vs trunk-based development",
  "Impact of AI-generated code on code review processes",
];

const COMPLAINT_DATA = [
  { complaint: "Payment processing failed three times during checkout, causing significant lost revenue for our peak sales period.", reason: "Payment gateway timeout not handled gracefully, no retry mechanism in place.", priority: "critical" },
  { complaint: "Customer data exported via the reports module contained PII from other client accounts.", reason: "Multi-tenant data isolation bug in the reporting query.", priority: "critical" },
  { complaint: "Application response time exceeded 30 seconds during end-of-month processing, making the system unusable.", reason: "Unoptimised batch query runs synchronously on the main thread.", priority: "high" },
  { complaint: "Email notifications are not delivered to clients using corporate Exchange servers.", reason: "SMTP relay blocklist entry; SPF/DKIM misconfiguration.", priority: "high" },
  { complaint: "The mobile app crashes immediately on Android 14 devices when opening the task list.", reason: "Incompatible native module with Android 14 API changes.", priority: "high" },
  { complaint: "File download feature is broken — files corrupt after download for sizes above 2 MB.", reason: "Buffer overflow in the file-streaming middleware.", priority: "high" },
  { complaint: "The dashboard graphs display incorrect totals for the previous quarter.", reason: "Off-by-one date boundary in the aggregation pipeline.", priority: "medium" },
  { complaint: "Users are logged out randomly every 20–30 minutes despite 'Remember Me' being checked.", reason: "JWT token refresh race condition in concurrent tab scenario.", priority: "medium" },
  { complaint: "Search functionality does not return relevant results when using multi-word queries.", reason: "Full-text search index not updated after recent data migration.", priority: "medium" },
  { complaint: "CSV import fails for files with UTF-8 encoded characters, blocking bulk onboarding.", reason: "Character encoding not declared in the CSV parser configuration.", priority: "medium" },
  { complaint: "Project archive operation permanently deletes associated tasks instead of archiving them.", reason: "Cascade delete instead of soft-delete on task records.", priority: "high" },
  { complaint: "Calendar event reminders are sent 24 hours late for users in timezones west of UTC.", reason: "Reminder scheduler stores absolute UTC time ignoring user timezone offset.", priority: "low" },
];

const REVIEW_DATA = [
  { client_name: "Samantha Clarke", feedback: "The team delivered the portal two weeks ahead of schedule with zero critical bugs. Their attention to accessibility standards exceeded our expectations.", feedback_type: "Clutch Review" },
  { client_name: "Hiroshi Tanaka", feedback: "Outstanding technical expertise throughout the engagement. They proactively identified performance bottlenecks before they became issues.", feedback_type: "Text Testimonial" },
  { client_name: "Amelia Okonkwo", feedback: "Communication was clear at every milestone. The API integration guide they produced is now used by our entire development team.", feedback_type: "Feedback" },
  { client_name: "Rafael Mendoza", feedback: "Genuinely impressed by their UI/UX work. The new dashboard reduced our customer support tickets by 40% in the first month.", feedback_type: "Clutch Review" },
  { client_name: "Sophie Leclerc", feedback: "They tackled a complex multi-tenant migration with minimal downtime. Highly professional and responsive team.", feedback_type: "Text Testimonial" },
  { client_name: "David Osei", feedback: "The mobile app they built consistently achieves 4.8 stars on both app stores. We attribute that directly to their QA rigour.", feedback_type: "Video Testimonial" },
  { client_name: "Priyanka Nambiar", feedback: "Their work on GDPR compliance saved us from a potential regulatory issue we hadn't even identified. True partners, not just contractors.", feedback_type: "Feedback" },
  { client_name: "Benjamin Hartley", feedback: "Solid delivery against a tight deadline. The handover documentation was thorough — our internal team got up to speed in days.", feedback_type: "Zoho Partner Profile" },
  { client_name: "Mei-Ling Chen", feedback: "The analytics dashboards they designed are now a key selling point for us with prospects. Excellent strategic input alongside the technical work.", feedback_type: "Clutch Review" },
  { client_name: "Carlos Reyes", feedback: "They flagged a potential security vulnerability during development and fixed it proactively. That kind of ownership is rare.", feedback_type: "Text Testimonial" },
  { client_name: "Fatima Al-Rashid", feedback: "We've worked with many vendors but none matched their ability to translate business requirements into elegant technical solutions.", feedback_type: "Feedback" },
  { client_name: "Ethan Kowalski", feedback: "The CI/CD pipeline they set up cut our deployment time from 45 minutes to 4 minutes. Game changer for our release cadence.", feedback_type: "Clutch Review" },
];

const EXPENSE_DATA = [
  { purchase_request_details: "AWS EC2 and RDS hosting for production environment — November 2024", cost_in_usd: 2840, nature_Of_expense: "Infrastructure", status: "Approved", need_to_bill_customer: true },
  { purchase_request_details: "Figma Professional plan — annual team subscription (12 seats)", cost_in_usd: 1440, nature_Of_expense: "Software License", status: "Paid", need_to_bill_customer: false },
  { purchase_request_details: "Sentry error monitoring — Business plan annual subscription", cost_in_usd: 780, nature_Of_expense: "Software License", status: "Paid", need_to_bill_customer: false },
  { purchase_request_details: "Penetration testing service — scope: web app + API layer", cost_in_usd: 4500, nature_Of_expense: "Security", status: "Approved", need_to_bill_customer: true },
  { purchase_request_details: "Twilio SMS and voice API credits for OTP notification service", cost_in_usd: 320, nature_Of_expense: "Third-party API", status: "Pending", need_to_bill_customer: true },
  { purchase_request_details: "MacBook Pro M3 for new senior backend engineer — hardware procurement", cost_in_usd: 2499, nature_Of_expense: "Hardware", status: "Approved", need_to_bill_customer: false },
];

// ─── Main seed function ────────────────────────────────────────────────────────

// Parse --companyId=<value> from CLI args
const argCompanyId = (() => {
  const arg = process.argv.slice(2).find(a => a.startsWith("--companyId="));
  return arg ? arg.split("=")[1] : null;
})();

// Parse --userId=<value> from CLI args (employee to assign tasks to)
const argUserId = (() => {
  const arg = process.argv.slice(2).find(a => a.startsWith("--userId="));
  return arg ? arg.split("=")[1] : null;
})();

async function seed() {
  console.log("🔌  Connecting to database …");
  if (!process.env.DB_URL) throw new Error("DB_URL not set in .env.dev");
  await mongoose.connect(process.env.DB_URL);
  console.log("✅  Connected.\n");

  // ── 0. Prerequisites ──────────────────────────────────────────────────────
  let company;
  if (argCompanyId) {
    if (!mongoose.Types.ObjectId.isValid(argCompanyId))
      throw new Error(`Invalid --companyId value: "${argCompanyId}"`);
    company = await Company.findOne({ _id: argCompanyId, isDeleted: false }).lean();
    if (!company) throw new Error(`No active company found with id: ${argCompanyId}`);
    console.log(`   Using company: ${company.company_name || company.name || argCompanyId}\n`);
  } else {
    company = await Company.findOne({ isDeleted: false }).lean();
    if (!company) throw new Error("No active company found. Create one first.");
    console.log(`   Using company: ${company.company_name || company.name || company._id}\n`);
  }
  const companyId = company._id;

  const [roles, projectTypes, projectStatuses, workflows] = await Promise.all([
    PMSRole.find({ isDeleted: false }).lean(),
    ProjectType.find({ isDeleted: false }).limit(6).lean(),
    ProjectStatus.find({ isDeleted: false }).lean(),
    ProjectWorkFlow.find({ companyId, isDeleted: false }).lean(),
  ]);

  if (!roles.length)           throw new Error("No PMS roles found. Run default setup first.");
  if (!projectTypes.length)    throw new Error("No project types found.");
  if (!projectStatuses.length) throw new Error("No project statuses found.");
  if (!workflows.length)       throw new Error("No workflows found.");

  // Bug workflow statuses checked after admin is created (adminId needed for defaults)

  // Find "active" status
  const activeStatus = projectStatuses.find(s =>
    /active/i.test(s.title || s.name || s.project_status || "")
  ) || projectStatuses[0];

  // Default employee role (non-admin)
  const empRole = roles.find(r =>
    /employee|member|developer|staff/i.test(r.role_name)
  ) || roles[roles.length - 1];

  // Client PMS role
  const clientRole = roles.find(r =>
    /client/i.test(r.role_name)
  ) || roles[0];

  // Pick an admin/manager role
  const adminRole = roles.find(r =>
    /admin|manager/i.test(r.role_name)
  ) || roles[0];

  // Find "To-Do" workflow status for tasks
  const todoWorkflowStatus = (await WorkFlowStatus.find({ isDeleted: false }).lean())[0];

  let bugStatuses = await BugWFStatus.find({ companyId, isDeleted: false }).lean();

  
  // Find first bug statuses
  const bugTodoStatus = bugStatuses.find(s => /to.do|open|todo/i.test(s.title || "")) || bugStatuses[0];

  // ── 1. Create admin / creator employee ────────────────────────────────────
  console.log("👤  Creating seed admin …");
  let seedAdmin = await Employee.findOne({ email: "seed.admin@weekmate.dev", isDeleted: false }).lean();
  if (!seedAdmin) {
    const admin = new Employee({
      companyId,
      first_name: "Seed",
      last_name: "Admin",
      full_name: "Seed Admin",
      email: "seed.admin@weekmate.dev",
      password: md5("SeedAdmin@2024"),
      pms_role_id: adminRole._id,
      isAdmin: true,
      isActivate: true,
    });
    await admin.save();
    seedAdmin = admin.toObject();
    console.log("   ✓ Admin created:", seedAdmin.email);
  } else {
    console.log("   ↩  Admin already exists — reusing.");
  }
  const adminId = seedAdmin._id;

  // Resolve --userId to an Employee _id (if provided)
  let currentUserId = null;
  if (argUserId) {
    if (!mongoose.Types.ObjectId.isValid(argUserId))
      throw new Error(`Invalid --userId value: "${argUserId}"`);
    const found = await Employee.findOne({ _id: argUserId, isDeleted: false }).lean();
    if (!found) throw new Error(`No active employee found with id: ${argUserId}`);
    currentUserId = found._id;
    console.log(`   Using current user: ${found.email}\n`);
  }

  // ── 1b. Bug workflow statuses — create defaults for this company if none exist
  if (!bugStatuses.length) {
    console.log("   ⚙️  No bug stages for this company — creating defaults …");
    const DEFAULT_BUG_STAGES = [
      { title: "To-Do",        color: "#64748b", sequence: 1, isDefault: true  },
      { title: "In Progress",  color: "#3b82f6", sequence: 2, isDefault: false },
      { title: "To be Tested", color: "#f59e0b", sequence: 3, isDefault: false },
      { title: "On Hold",      color: "#f97316", sequence: 4, isDefault: false },
      { title: "Closed",       color: "#22c55e", sequence: 5, isDefault: false },
    ];
    const created = await BugWFStatus.insertMany(
      DEFAULT_BUG_STAGES.map((s) => ({
        ...s,
        companyId,
        createdBy: adminId,
        updatedBy: adminId,
      }))
    );
    bugStatuses = created.map((d) => (d.toObject ? d.toObject() : d));
    console.log(`   ✓ ${bugStatuses.length} default bug stages created.`);
  } else {
    console.log(`   ✓ ${bugStatuses.length} existing bug stages found.`);
  }

  // ── 2. Create 55 employees ─────────────────────────────────────────────────
  console.log("\n👥  Creating 55 employees …");
  const employees = [];
  const usedEmails = new Set();

  for (let i = 0; i < 55; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[i % LAST_NAMES.length];
    const base = `${fn.toLowerCase()}.${ln.toLowerCase()}`;
    let email = `${base}@weekmate.dev`;
    if (usedEmails.has(email)) email = `${base}${i}@weekmate.dev`;
    usedEmails.add(email);

    const existing = await Employee.findOne({ email, isDeleted: false }).lean();
    if (existing) { employees.push(existing); continue; }

    const isManager = i < 10;
    const emp = new Employee({
      companyId,
      first_name: fn,
      last_name: ln,
      full_name: `${fn} ${ln}`,
      email,
      password: md5("Welcome@2024"),
      pms_role_id: isManager ? adminRole._id : empRole._id,
      isAdmin: false,
      isActivate: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    await emp.save();
    employees.push(emp.toObject());
  }
  console.log(`   ✓ ${employees.length} employees ready.`);

  // ── 3. Create 6 PMS clients ────────────────────────────────────────────────
  console.log("\n🤝  Creating 6 PMS clients …");
  const clientNames = [
    ["Alex","Monroe"],["Julia","Hartmann"],["Omar","Farouk"],
    ["Yuki","Matsuda"],["Chloe","Beaumont"],["Ivan","Petrov"],
  ];
  const pmsClients = [];
  for (const [fn, ln] of clientNames) {
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@client.demo`;
    const existing = await PMSClient.findOne({ email, isDeleted: false }).lean();
    if (existing) { pmsClients.push(existing); continue; }
    const cli = new PMSClient({
      companyId,
      first_name: fn,
      last_name: ln,
      full_name: `${fn} ${ln}`,
      email,
      password: md5("Client@2024"),
      plain_password: "Client@2024",
      pms_role_id: clientRole._id,
      company_name: `${ln} Enterprises`,
      isActivate: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    await cli.save();
    pmsClients.push(cli.toObject());
  }
  console.log(`   ✓ ${pmsClients.length} PMS clients ready.`);

  // ── 4. Create 10 projects ──────────────────────────────────────────────────
  console.log("\n📁  Creating 10 projects …");
  const projects = [];
  for (let i = 0; i < PROJECT_DATA.length; i++) {
    const pd = PROJECT_DATA[i];
    const existing = await Project.findOne({ title: pd.title, companyId, isDeleted: false }).lean();
    if (existing) { projects.push(existing); continue; }

    const manager   = employees[i * 5 % employees.length];
    const assigneePool = employees.slice(i * 3 % 45, (i * 3 % 45) + 6);
    const workflow  = workflows[0]; // always use default (Standard) workflow so tasks appear on main listing
    const pType     = projectTypes[i % projectTypes.length];

    const proj = await Project.create({
      companyId,
      title: pd.title,
      projectId: `P-${String(i + 1).padStart(4, "0")}-${Date.now().toString().slice(-4)}`,
      color: pd.color,
      descriptions: pd.descriptions,
      project_type: pType._id,
      project_status: activeStatus._id,
      manager: manager._id,
      workFlow: workflow._id,
      estimatedHours: pd.estimatedHours,
      isBillable: i % 3 !== 0,
      isBugsEnabled: true,
      assignees: assigneePool.map(e => e._id),
      start_date: isoDate(-randInt(30, 120)),
      end_date: isoDate(randInt(60, 180)),
      createdBy: adminId,
      updatedBy: adminId,
      createdByModel: "employees",
      updatedByModel: "employees",
    });
    projects.push(proj.toObject ? proj.toObject() : proj);
  }
  console.log(`   ✓ ${projects.length} projects ready.`);

  // ── 5. Create task lists (ProjectMainTask) ─────────────────────────────────
  console.log("\n📋  Creating task lists …");
  const mainTasksByProject = {};
  for (const proj of projects) {
    const listSet = TASK_LIST_NAMES[proj.title.length % TASK_LIST_NAMES.length];
    mainTasksByProject[proj._id] = [];
    for (const listTitle of listSet) {
      const existing = await ProjectMainTask.findOne({
        title: listTitle, project_id: proj._id, isDeleted: false
      }).lean();
      if (existing) { mainTasksByProject[proj._id].push(existing); continue; }
      const mt = await ProjectMainTask.create({
        title: listTitle,
        project_id: proj._id,
        subscribers: [employees[randInt(0, 20)]._id],
        createdBy: adminId,
        updatedBy: adminId,
        createdByModel: "employees",
        updatedByModel: "employees",
        task_status: todoWorkflowStatus?._id || null,
      });
      mainTasksByProject[proj._id].push(mt.toObject ? mt.toObject() : mt);
    }
  }
  console.log("   ✓ Task lists created.");

  // ── 6. Create 100 tasks ────────────────────────────────────────────────────
  console.log("\n✅  Creating 100 tasks …");
  const shuffledTasks = [...TASK_TITLES].sort(() => Math.random() - 0.5).slice(0, 100);
  let taskCounter = 0;

  // Fetch workflow statuses per workflow
  const wfStatusMap = {};
  for (const wf of workflows) {
    const statuses = await WorkFlowStatus.find({ workflow_id: wf._id, isDeleted: false }).lean();
    wfStatusMap[wf._id.toString()] = statuses;
  }

  const createdTasks = [];
  for (let i = 0; i < 100; i++) {
    const proj = projects[i % projects.length];
    const lists = mainTasksByProject[proj._id];
    const mainTask = lists[i % lists.length];
    const wfId = (proj.workFlow || "").toString();
    const wfStatuses = wfStatusMap[wfId] || [];
    const taskStatus = wfStatuses.length ? pick(wfStatuses)._id : null;
    const assignee = employees[randInt(0, 54)];
    const taskAssignees = [assignee._id];
    if (currentUserId && String(currentUserId) !== String(assignee._id)) {
      taskAssignees.push(currentUserId);
    }

    taskCounter++;
    const task = await Task.create({
      title: shuffledTasks[i],
      project_id: proj._id,
      main_task_id: mainTask._id,
      taskId: `T-${String(taskCounter).padStart(5, "0")}`,
      priority: pick(["Low","Medium","High"]),
      task_status: taskStatus,
      assignees: taskAssignees,
      estimated_hours: String(randInt(2, 40)),
      start_date: isoDate(-randInt(1, 60)),
      end_date: isoDate(randInt(1, 90)),
      descriptions: `Detailed work item: ${shuffledTasks[i]}. This task covers all design, implementation, and testing requirements as specified in the sprint backlog.`,
      createdBy: adminId,
      updatedBy: adminId,
      createdByModel: "employees",
      updatedByModel: "employees",
    });
    createdTasks.push(task);
  }
  console.log(`   ✓ ${createdTasks.length} tasks created.`);

  // ── 7. Create notebooks + 100 notes ───────────────────────────────────────
  console.log("\n📓  Creating notebooks and 100 notes …");
  const notebooksByProject = {};
  for (const proj of projects) {
    const nbTitle = `${proj.title} — Notebooks`;
    let nb = await NoteBook.findOne({ title: nbTitle, project_id: proj._id, isDeleted: false }).lean();
    if (!nb) {
      nb = await NoteBook.create({
        title: nbTitle,
        project_id: proj._id,
        createdBy: adminId,
        updatedBy: adminId,
      });
      nb = nb.toObject ? nb.toObject() : nb;
    }
    notebooksByProject[proj._id] = nb;
  }

  const NOTE_COLORS = ["#e0f7fa","#fce4ec","#f3e5f5","#e8f5e9","#fff8e1","#e3f2fd","#fbe9e7"];
  const shuffledNotes = [...NOTE_TITLES].sort(() => Math.random() - 0.5).slice(0, 100);

  for (let i = 0; i < 100; i++) {
    const proj = projects[i % projects.length];
    const nb   = notebooksByProject[proj._id];
    await Note.create({
      companyId,
      title: shuffledNotes[i],
      project_id: proj._id,
      noteBook_id: nb._id,
      color: NOTE_COLORS[i % NOTE_COLORS.length],
      notesInfo: `<p>${shuffledNotes[i]}</p><p>This note captures key decisions, context, and references for the team. Last reviewed by ${employees[i % 55].full_name} on ${isoDate(-randInt(0,30)).toDateString()}.</p>`,
      subscribers: [employees[randInt(0, 54)]._id, employees[randInt(0, 54)]._id],
      isBookmark: i % 10 === 0,
      isPrivate: i % 15 === 0,
      createdBy: adminId,
      updatedBy: adminId,
      createdByModel: "employees",
      updatedByModel: "employees",
    });
  }
  console.log("   ✓ 100 notes created.");

  // ── 8. Create 100 bugs ─────────────────────────────────────────────────────
  console.log("\n🐛  Creating 100 bugs …");
  const shuffledBugs = [...BUG_TITLES].sort(() => Math.random() - 0.5).slice(0, 100);
  let bugCounter = 0;
  for (let i = 0; i < 100; i++) {
    const proj   = projects[i % projects.length];
    const task   = createdTasks[i % createdTasks.length];
    const status = bugStatuses[i % bugStatuses.length];
    const assignee = employees[randInt(0, 54)];
    bugCounter++;
    await Bug.create({
      title: shuffledBugs[i],
      project_id: proj._id,
      task_id: task._id,
      bugId: `BUG-${String(bugCounter).padStart(5, "0")}`,
      descriptions: `Steps to reproduce: 1) Navigate to the relevant section. 2) Perform the action described. 3) Observe the unexpected behaviour.\n\nExpected: The feature works correctly.\nActual: ${shuffledBugs[i]}`,
      bug_status: status._id,
      assignees: [assignee._id],
      start_date: isoDate(-randInt(1, 30)),
      due_date: isoDate(randInt(1, 60)),
      estimated_hours: String(randInt(1, 12)),
      progress: String(pick([0, 25, 50, 75, 100])),
      createdBy: adminId,
      updatedBy: adminId,
      createdByModel: "employees",
      updatedByModel: "employees",
    });
  }
  console.log("   ✓ 100 bugs created.");

  // ── 9. Create 100 discussions ──────────────────────────────────────────────
  console.log("\n💬  Creating 100 discussions …");
  const shuffledDiscussions = [...DISCUSSION_TITLES].sort(() => Math.random() - 0.5).slice(0, 100);
  for (let i = 0; i < 100; i++) {
    const proj  = projects[i % projects.length];
    const subs  = [employees[randInt(0,54)]._id, employees[randInt(0,54)]._id, employees[randInt(0,54)]._id];
    await Discussion.create({
      companyId,
      title: shuffledDiscussions[i],
      project_id: proj._id,
      descriptions: `Open discussion for the team: "${shuffledDiscussions[i]}". Please share your views, concerns, and suggestions below. Decision expected by ${isoDate(randInt(3, 14)).toDateString()}.`,
      subscribers: subs,
      status: "active",
      isPinToTop: i % 20 === 0,
      isPrivate: i % 25 === 0,
      createdBy: adminId,
      updatedBy: adminId,
      createdByModel: "employees",
      updatedByModel: "employees",
    });
  }
  console.log("   ✓ 100 discussions created.");

  // ── 10. Create 5–6 project expenses ───────────────────────────────────────
  console.log("\n💰  Creating 6 project expenses …");
  for (let i = 0; i < EXPENSE_DATA.length; i++) {
    const exp = EXPENSE_DATA[i];
    const proj = projects[i % projects.length];
    await ProjectExpense.create({
      companyId,
      project_id: proj._id,
      purchase_request_details: exp.purchase_request_details,
      cost_in_usd: exp.cost_in_usd,
      need_to_bill_customer: exp.need_to_bill_customer,
      status: exp.status,
      nature_Of_expense: exp.nature_Of_expense,
      details: `Expense submitted for ${proj.title}. Approved by finance team on ${isoDate(-randInt(1, 15)).toDateString()}.`,
      billing_cycle: pick(["monthly","one-time","annual"]),
      is_recuring: exp.nature_Of_expense === "Infrastructure",
      createdBy: adminId,
      updatedBy: adminId,
      createdByModel: "employees",
      updatedByModel: "employees",
    });
  }
  console.log("   ✓ 6 project expenses created.");

  // ── 11. Create 12 complaints ───────────────────────────────────────────────
  console.log("\n📢  Creating 12 complaints …");
  const createdComplaints = [];
  for (let i = 0; i < COMPLAINT_DATA.length; i++) {
    const cd   = COMPLAINT_DATA[i];
    const proj = projects[i % projects.length];
    const escalationEmp = employees[randInt(0, 9)];
    const client = pmsClients[i % pmsClients.length];
    const comp = await Complaint.create({
      companyId,
      project_id: proj._id,
      client_name: client.full_name,
      client_email: client.email,
      complaint: cd.complaint,
      priority: cd.priority,
      reason: cd.reason,
      status: pick(["open","in_progress","client_review"]),
      escalation_level: escalationEmp._id,
      createdBy: adminId,
      updatedBy: adminId,
      createdByModel: "employees",
      updatedByModel: "employees",
    });
    createdComplaints.push(comp.toObject ? comp.toObject() : comp);
  }
  console.log("   ✓ 12 complaints created.");

  // ── 12. Create 12 consumer-feedback forms ─────────────────────────────────
  console.log("\n⭐  Creating 12 consumer-feedback forms …");
  const feedbackComments = [
    "The issue was resolved quickly once escalated. Appreciate the transparency.",
    "Response time was acceptable but the fix took longer than expected.",
    "Team was professional and kept us informed throughout the process.",
    "Initial response was slow but the resolution was satisfactory.",
    "Excellent communication and swift resolution. Very satisfied.",
    "The root cause analysis was thorough and helped prevent recurrence.",
    "We're satisfied with how this was handled, though prevention would be better.",
    "Good follow-through after the initial delay. Would have preferred faster response.",
    "Very impressed with the level of detail in the post-mortem report.",
    "Happy with the outcome. Regular status updates made a big difference.",
    "The workaround provided was helpful while the permanent fix was applied.",
    "Issue fully resolved. Looking forward to the preventive measures promised.",
  ];
  for (let i = 0; i < createdComplaints.length; i++) {
    await ConsumerFeedback.create({
      complaint_id: createdComplaints[i]._id,
      satisfaction: randInt(2, 5),
      rate_reviews: randInt(2, 5),
      additional_comments: feedbackComments[i],
    });
  }
  console.log("   ✓ 12 consumer-feedback forms created.");

  // ── 13. Create 12 reviews ─────────────────────────────────────────────────
  console.log("\n🌟  Creating 12 reviews …");
  for (let i = 0; i < REVIEW_DATA.length; i++) {
    const rv   = REVIEW_DATA[i];
    const proj = projects[i % projects.length];
    await Review.create({
      project_id: proj._id,
      client_name: rv.client_name,
      feedback: rv.feedback,
      feedback_type: rv.feedback_type,
      client_nda_sign: i % 3 !== 0,
      createdBy: adminId,
      updatedBy: adminId,
      createdByModel: "employees",
      updatedByModel: "employees",
    });
  }
  console.log("   ✓ 12 reviews created.");

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║          SEED COMPLETED SUCCESSFULLY            ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Employees          : ${String(employees.length).padEnd(26)}║`);
  console.log(`║  PMS Clients        : ${String(pmsClients.length).padEnd(26)}║`);
  console.log(`║  Projects           : ${String(projects.length).padEnd(26)}║`);
  console.log(`║  Tasks              : ${String(createdTasks.length).padEnd(26)}║`);
  console.log(`║  Bugs               : 100                        ║`);
  console.log(`║  Notes              : 100                        ║`);
  console.log(`║  Discussions        : 100                        ║`);
  console.log(`║  Project Expenses   : ${String(EXPENSE_DATA.length).padEnd(26)}║`);
  console.log(`║  Complaints         : ${String(createdComplaints.length).padEnd(26)}║`);
  console.log(`║  Consumer Feedback  : ${String(createdComplaints.length).padEnd(26)}║`);
  console.log(`║  Reviews            : ${String(REVIEW_DATA.length).padEnd(26)}║`);
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  NOTE: Group-chat has no model in this codebase. ║");
  console.log("║  Skipped — add the model first to seed it.      ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("\n❌  Seeder failed:", err.message || err);
  mongoose.disconnect().finally(() => process.exit(1));
});
