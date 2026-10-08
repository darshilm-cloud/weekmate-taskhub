/**
 * Create a new company + admin login, then (by default) populate it with the
 * full demo dataset via seeders/demoDataSeeder.js.
 *
 * Usage:
 *   node server/scripts/createCompany.js
 *   node server/scripts/createCompany.js --name="Acme Robotics" --domain=acme-robotics \
 *     --email=admin@acme-robotics.com --password=Acme@2026
 *   node server/scripts/createCompany.js --noDemoData   (company + admin only, no demo data)
 *
 * Flags (all optional, sensible defaults applied):
 *   --name       Company name
 *   --domain     Company domain/slug (defaults to a slugified --name)
 *   --firstName  Admin first name
 *   --lastName   Admin last name
 *   --email      Admin login email
 *   --password   Admin login password
 *   --noDemoData Skip running demoDataSeeder.js after the company is created
 */

"use strict";

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const { spawnSync } = require("child_process");

global.moment = require("moment");
global.chalk = require("chalk");

const envPath = path.resolve(__dirname, "../env/.env.dev");
dotenv.config({ path: envPath });

require("../models");
const { CompanyModel, employeeSchema: Employee, PMSRoles } = require("../models");
const commonHelpers = require("../helpers/common");
const CONFIG_JSON = require("../settings/config.json");

function parseArg(name, fallback) {
  const arg = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const companyName = parseArg("name", "Lumina Softworks");
  const companyDomain = parseArg("domain", slugify(companyName));
  const adminFirstName = parseArg("firstName", "Alex");
  const adminLastName = parseArg("lastName", "Morgan");
  const adminEmail = parseArg("email", `admin@${companyDomain}.com`).toLowerCase();
  const adminPassword = parseArg("password", "Lumina@2026");
  const skipDemoData = hasFlag("noDemoData");

  if (!process.env.DB_URL) throw new Error("DB_URL not set in env/.env.dev");
  console.log("Connecting to database …");
  await mongoose.connect(process.env.DB_URL);
  console.log("Connected.\n");

  const existingCompanyName = await CompanyModel.findOne({ companyName });
  if (existingCompanyName) {
    throw new Error(`Company name "${companyName}" already exists (id: ${existingCompanyName._id})`);
  }

  const existingDomain = await CompanyModel.findOne({ companyDomain });
  if (existingDomain) {
    throw new Error(`Company domain "${companyDomain}" already exists (id: ${existingDomain._id})`);
  }

  const existingAdmin = await Employee.findOne({ email: adminEmail });
  if (existingAdmin) {
    throw new Error(`Admin email "${adminEmail}" already exists (employee id: ${existingAdmin._id})`);
  }

  const adminRole = await PMSRoles.findOne({ role_name: CONFIG_JSON.PMS_ROLES.ADMIN });
  if (!adminRole) {
    throw new Error(`"${CONFIG_JSON.PMS_ROLES.ADMIN}" PMS role not found — run core setup/migrations first.`);
  }

  const company = await new CompanyModel({ companyName, companyDomain }).save();
  console.log(`✓ Company created: ${company.companyName} (${company._id})`);

  let adminUser;
  try {
    adminUser = await new Employee({
      first_name: adminFirstName,
      last_name: adminLastName,
      full_name: `${adminFirstName} ${adminLastName}`,
      email: adminEmail,
      password: adminPassword, // hashed by the employees.js pre-save hook
      companyId: company._id,
      pms_role_id: adminRole._id,
      isActivate: true,
      isAdmin: true
    }).save();
    console.log(`✓ Admin user created: ${adminUser.email} (${adminUser._id})`);

    await commonHelpers.addDefaultPermission(company._id, adminUser._id);
    console.log("✓ Default role permissions added.");

    await commonHelpers.addDefaultProjectStatus(company._id, adminUser._id);
    console.log("✓ Default project statuses added.");

    await commonHelpers.addDefaultWorkflowandStages(company._id, adminUser._id);
    console.log("✓ Default workflow and stages added.");
  } catch (err) {
    console.error("\nSetup failed, rolling back:", err.message);
    if (adminUser) await Employee.deleteOne({ _id: adminUser._id });
    await CompanyModel.deleteOne({ _id: company._id });
    throw err;
  }

  console.log("\n=== Company & admin login ready ===");
  console.log(`Company   : ${company.companyName}`);
  console.log(`Domain    : ${company.companyDomain}`);
  console.log(`companyId : ${company._id}`);
  console.log(`userId    : ${adminUser._id}`);
  console.log(`Login     : ${adminEmail} / ${adminPassword}`);

  await mongoose.disconnect();

  if (!skipDemoData) {
    console.log("\nPopulating demo data (projects, tasks, bugs, notes, discussions, expenses, complaints, reviews) …\n");
    const seederPath = path.resolve(__dirname, "../seeders/demoDataSeeder.js");
    const result = spawnSync(
      process.execPath,
      [seederPath, `--companyId=${company._id}`, `--userId=${adminUser._id}`],
      { stdio: "inherit" }
    );
    if (result.status !== 0) {
      throw new Error("demoDataSeeder.js exited with a non-zero status; see output above.");
    }
  }

  return { companyId: company._id.toString(), userId: adminUser._id.toString(), adminEmail, adminPassword };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n❌ Failed:", err.message);
      mongoose.disconnect().finally(() => process.exit(1));
    });
}

module.exports = main;
