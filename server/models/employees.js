const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const configs = require("../configs");
const crypto = require("crypto");
const SALT_WORK_FACTOR = 10;

var today = new Date();
var date =
  today.getFullYear() + "" + (today.getMonth() + 1) + "" + today.getDate();
var time = today.getHours() + "" + today.getMinutes();
var dateTime = date + "" + time;

const prevEmpExperianceSchema = new Schema({
  company_name: String,
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  designation: String,
  experiance: String,
});

const employeeSchema = new Schema({
  org_id: { type: Schema.Types.ObjectId, ref: "org" },
  intial_name: {
    type: String,
    enum: ["Mr.", "Ms.", "Mrs."],
    default: "Mr.",
  },
  branch: {
    type: String,
    enum: ["ISKON Office", "IFFCO Office"],
    default: "IFFCO Office",
  },
  salary_grade: {
    type: String,
    enum: ["A", "B", "C", "D", "E", "F"],
    default: "A",
  },
  experience_grade: {
    type: String,
    enum: ["A", "B", "C", "D", "I"],
    default: "A",
  },
  shift: {
    type: String,
    enum: [
      "Aus Shift",
      "Early Log",
      "Early Shift",
      "General Shift",
      "Part time",
      "Part time 1",
      "US Telecaller",
      "WordPress Shift",
      "US Shift",
      "UK Shift",
    ],
    default: "General Shift",
  },
  designation_id: { type: Schema.Types.ObjectId, ref: "empdesignations" },
  birthdate: { type: Date, default: configs.utcDefault },
  enrollment_no: { type: String },
  gender: { type: String },
  login_alias: { type: String },
  emp_code: { type: String },
  joining_date: { type: Date, default: configs.utcDefault },
  left_date: { type: Date, default: null },
  feedback_information: { type: Schema.Types.Mixed },
  emp_last_working_date: { type: Date, default: null },
  reporting_manager: { type: Schema.Types.ObjectId, ref: "employees" },
  buddy: { type: Schema.Types.ObjectId, ref: "employees" },
  ctc_salary: { type: Number },
  basic_salary: { type: Number },
  gross_salary: { type: Number },
  emp_type: {
    type: String,
    enum: ["Permanent", "Probation", "Tenure", "Intern"],
    default: "Permanent",
  },
  // emp_type2: {
  //     type: Array,
  //     default: ['Overtime', 'Full PF']
  // },
  emp_sign: { type: String, default: "" },
  hiddenTalent: { type: String },
  full_name: { type: String },
  middleName: { type: String },
  mothername: { type: String },
  marital_status: { type: String },
  personal_email: { type: String },
  personal_no: { type: String },
  first_name: { type: String },
  last_name: { type: String },
  country: { type: String },
  state: { type: String },
  city: { type: String },
  district: { type: String },
  pin_code: { type: Number },
  personal_information: { type: Schema.Types.Mixed },
  address: { type: Schema.Types.Mixed },
  present_address: { type: Schema.Types.Mixed },
  resignation_date: { type: Date, default: null },
  resignation_accepted_date: { type: Date, default: null },
  other_reason: { type: String, default: "" },
  reason_type: {
    type: String,
    enum: ["Resignation", "Retirement", "Terminated", "Death", "Absconded", ""],
    default: "",
  },
  reason: {
    type: String,
    enum: [
      "Better Career",
      "Health Issue",
      "Career Change",
      "Better Prospect",
      "Relocation",
      "Higher Studies",
      "Traveling",
      "Abroad",
      "Marriage",
      "Family",
      "Circumstances",
      "Performance Issue",
      "",
    ],
    default: "",
  },
  // left_reson: {
  //     type: String,
  //     enum: ['RETIREMENT', 'DEATH IN SERVICE', 'SUPERNNUATION', 'PERMANENT DISABLEMENT', 'CESSATION(SHORT SERVICE)', 'DEATH AWAY FROM SERVICE'],
  //     default: 'RETIREMENT'
  // },
  // uniform_return: {
  //     type: String,
  //     enum: ['Yes', 'No', 'NA',],
  //     default: 'NA'
  // },
  exit_interview: {
    type: String,
    enum: ["Yes", "No", "NA"],
    default: "NA",
  },
  notice_period: {
    type: String,
    enum: ["Yes", "No", "NA"],
    default: "NA",
  },
  emp_img: { type: String, default: "" },
  email: { type: String },
  phone_number: { type: String, default: "" },
  department_id: { type: Schema.Types.ObjectId, ref: "empdepartments" },
  subdepartment_id: { type: Schema.Types.ObjectId, ref: "subdepartments" },
  function_role_id: { type: Schema.Types.ObjectId, ref: "function" },
  password: { type: String },
  // plain_password: { type: String },
  role_id: { type: Schema.Types.ObjectId, ref: "roles", required: true },
  pms_role_id: { type: Schema.Types.ObjectId, ref: "pms_roles", default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  createdAt: { type: Date, default: configs.utcDefault },
  excreatedAt: { type: Date },
  updatedAt: { type: Date, default: configs.utcDefault },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  isSoftDeleted: { type: Boolean, default: false },
  isActivate: { type: Boolean, default: true },
  resetCode: { type: String },
  isAdmin: { type: Boolean, default: false },
  isfeedbackemailsent: { type: Boolean, default: false },
  FeedbackAttachment: { type: String },
  referred_by: { type: String, default: "" },
  appraisal_date: {
    type: String,
    enum: ["January", "April", "July", "October", ""],
    default: "",
  },
  NDA_attachment: { type: String, default: "" },
  employment_details: {
    type: Schema.Types.Mixed,
    default: () => ({
      businessUnit: null,
      confirmation_status: false,
      // other dynamic fields...
    }),
  },
  addition_details: { type: Schema.Types.Mixed },
  confirmation_date: { type: Date, default: "" },
  confirmation_feedback: { type: String, default: "" },
  prevEmpExperiance: [prevEmpExperianceSchema],
});

employeeSchema.pre("save", function (next) {
  var user = this;
  user.email =
    user.email && user.email != "" ? user.email.toLowerCase() : undefined;

  if (typeof user.password !== "undefined" && user.password !== "") {
    if (!user.isModified("password")) {
      return next();
    }

    const hash = crypto.createHash("md5").update(user.password).digest("hex");
    user.password = hash;
    next();
  } else {
    next();
  }
});

employeeSchema.methods.comparePassword = function (candidatePassword, cb) {
  const encryptedInputPassword = crypto
    .createHash("md5")
    .update(candidatePassword)
    .digest("hex");
  cb(null, encryptedInputPassword === this.password);
};

module.exports = mongoose.model("employees", employeeSchema);
