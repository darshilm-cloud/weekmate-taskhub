const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { MULTER } = require("./constant");
const nodemailer = require("nodemailer");
const chalk = require("chalk");
const mongoose = require("mongoose");

const { Parser } = require("json2csv");
const json2xls = require("json2xls");
const { utcDefault } = require("../configs");
const config = require("../settings/config.json");

let extArr = [
  `.txt`,
  `.xlsx`,
  `.csv`,
  `.xls`,
  `.pdf`,
  `.doc`,
  `.docx`,
  `.png`,
  `.jpg`,
  `.jpeg`,
  `.json`,
  `.mp4`,
  `.zip`,
  `.rar`,
];

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  // host: 'smtppro.zoho.com',
  // port: 587,
  // requireTLS: true,
  // requireTLS: false,
  // secure: true,
  // secure: false,
  tls: {
    rejectUnauthorized: false,
  },
  pool: true,
  auth: {
    user: "hrms@elsner.com",
    pass: "bztjjhyvdarogdex",
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.log(chalk.red(error));
  } else {
    console.log();
    console.log(
      chalk.green("Server is verified to send"),
      chalk.yellow("E-Mail")
    );
  }
});

class CommonHelpers {
  generateRandomId() {
    return "#" + Math.floor(100000 + Math.random() * 900000);
  }

  getFileUploadPath(fileFor = null) {
    let dynamicPath = MULTER.DESTINATION;
    switch (fileFor) {
      case "task":
        dynamicPath = MULTER.TASK;
        break;

      case "subTask":
        dynamicPath = MULTER.SUBTASK;
        break;

      case "comment":
        dynamicPath = MULTER.COMMENT;
        break;

      case "folder":
        dynamicPath = MULTER.FOLDERS;
        break;

      case "discussionsTopics":
        dynamicPath = MULTER.DISCUSSION_TOPIC;
        break;

      case "discussionsTopicsDetails":
        dynamicPath = MULTER.DISCUSSION_TOPIC_DETAILS;
        break;

      case "bugs":
        dynamicPath = MULTER.BUGS;
        break;

      case "appSetting":
        dynamicPath = MULTER.APP_SETTING;
        break;

      case "complaint_comments":
        dynamicPath = MULTER.COMPLAINT_COMMENTS;
        break;

      default:
        break;
    }
    return dynamicPath;
  }

  dynamicDestination(req, file, cb) {
    try {
      const dynamicPath = module.exports.getFileUploadPath(
        req?.query?.file_for
      );
      const dir = path.join(__dirname, "../", dynamicPath);

      try {
        // sudo chmod 755 /home/nteam/elsnerpms/server/public/
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      } catch (err) {
        console.error("Error creating directory:", err);
      }

      cb(null, `.${dynamicPath}`);
    } catch (error) {
      console.log("🚀 ~ CommonHelpers ~ dynamicDestination ~ error:", error);
    }
  }

  upload = multer({
    storage: multer.diskStorage({
      destination: this.dynamicDestination,
      filename: function (req, file, cb) {
        cb(
          null,
          (
            file.originalname
              .substring(0, file.originalname.lastIndexOf("."))
              .trim() + `_${Date.now()}`
          ).replace(/\s+/g, "_") + path.extname(file.originalname)
        );
      },
    }),
    limits: { fileSize: MULTER.MAX_FILE_SIZE },
    // fileFilter: function (req, file, cb) {
    //   if (!extArr.includes(path.extname(file.originalname))) {
    //     cb(new Error("File not allowed"));
    //   } else {
    //     cb(null, true);
    //   }
    // },
  });

  emailSenderForPMS = async (
    to,
    content,
    cc = null,
    from = `"Elsner TaskHub" hrms@elsner.com`
  ) => {
    let contacts = {
      to: Array.isArray(to) ? to.join(", ") : to,
      from,
    };

    if (cc) {
      contacts.cc = Array.isArray(cc) ? cc.join(", ") : cc;
    }

    let email = Object.assign({}, content, contacts);

    return await transporter.sendMail(email, (err, message) => {
      if (err) {
        console.log(
          "🚀 ~ CommonHelpers ~ emailSenderForPMS.sendMail ~ err:",
          err
        );
      } else {
        console.log("sucsses mail",message);
        return;
      }
    });
  };

  arraysAreEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }

    const sortedArr1 = arr1.slice().sort();
    const sortedArr2 = arr2.slice().sort();

    for (let i = 0; i < sortedArr1.length; i++) {
      if (sortedArr1[i] !== sortedArr2[i]) {
        return false;
      }
    }

    return true;
  }

  getArrayChanges(originalArray, updatedArray) {
    const sortedArr1 = originalArray?.slice().sort();
    const sortedArr2 = updatedArray?.slice().sort();
    const addedValues = sortedArr2?.filter(
      (value) => !sortedArr1?.includes(value)
    );
    const removedValues = sortedArr1?.filter(
      (value) => !sortedArr2?.includes(value)
    );

    return {
      added: addedValues || [],
      removed: removedValues || [],
    };
  }

  async generateCSV(data, csvFields = null) {
    return new Promise(async (resolve, reject) => {
      try {
        let json2csvParser;
        if (csvFields) {
          json2csvParser = new Parser({ csvFields });
        } else {
          json2csvParser = new Parser();
        }
        const csvData = json2csvParser.parse(data);
        let result = Buffer.from(csvData).toString("base64");
        resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  }
  async generateXLSX(data) {
    return new Promise(async (resolve, reject) => {
      try {
        // json2xls returns xlsx file data in binary format
        const xlsxBinaryData = json2xls(data);
        // https://stackabuse.com/encoding-and-decoding-base64-strings-in-node-js/#encodingbinarydatatobase64strings
        // read Reza Rahmati's comment
        const xlsxDataBuffer = Buffer.from(xlsxBinaryData, "binary");
        let result = xlsxDataBuffer.toString("base64");
        resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  }

  async generatePassword(length) {
    try {
      const charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let password = "";
      for (let i = 0; i < length; ++i) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
      }
      return password;
    } catch (error) {
      console.log("🚀 ~ CommonHelpers ~ generatePassword ~ error:", error);
    }
  }

  commonSchema(isRefPath = true, addExpiry = false) {
    try {
      return {
        // Create..
        createdBy: isRefPath
          ? {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "createdByModel",
          }
          : {
            type: mongoose.Schema.Types.ObjectId,
            ref: "employees",
            required: true,
          },
        ...(isRefPath
          ? {
            createdByModel: {
              type: String,
              enum: ["employees", "pmsclients"],
              required: true,
            },
          }
          : {}),
        createdAt: {
          type: Date,
          default: utcDefault,
          ...(addExpiry && { expires: "10d", index: true }),
        },

        // Update...
        updatedBy: isRefPath
          ? {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "updatedByModel",
            required: true,
          }
          : {
            type: mongoose.Schema.Types.ObjectId,
            ref: "employees",
            required: true,
          },
        ...(isRefPath
          ? {
            updatedByModel: {
              type: String,
              enum: ["employees", "pmsclients"],
              required: true,
            },
          }
          : {}),
        updatedAt: { type: Date, default: utcDefault },

        // Delete..
        deletedBy: isRefPath
          ? {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "deletedByModel",
            default: null,
          }
          : {
            type: mongoose.Schema.Types.ObjectId,
            ref: "employees",
            default: null,
          },
        ...(isRefPath
          ? {
            deletedByModel: {
              type: String,
              enum: ["employees", "pmsclients"],
              default: null,
            },
          }
          : {}),
        deletedAt: { type: Date, default: null },

        isDeleted: { type: Boolean, default: false },
      };
    } catch (error) {
      console.log("🚀 ~ CommonHelpers ~ commonSchema ~ error:", error);
    }
  }

  notificationCommonSchema(isRefPath = true) {
    try {
      return {
        // sender...
        sender_id: isRefPath
          ? {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "senderModel",
            required: true,
          }
          : {
            type: mongoose.Schema.Types.ObjectId,
            ref: "employees",
            required: true,
          },
        ...(isRefPath
          ? {
            senderModel: {
              type: String,
              enum: ["employees", "pmsclients"],
              required: true,
            },
          }
          : {}),

        // receiver..
        receiver_ids: isRefPath
          ? [
            {
              type: mongoose.Schema.Types.ObjectId,
              required: true,
              refPath: "receiverModels",
            },
          ]
          : [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "employees",
              default: [],
            },
          ],
        ...(isRefPath
          ? {
            receiverModels: {
              type: [String],
              enum: ["employees", "pmsclients"],
              required: true,
            },
          }
          : {}),

        // Read history...
        read_history: isRefPath
          ? {
            type: [
              {
                receiver_id: {
                  type: mongoose.Schema.Types.ObjectId,
                  refPath: "readByModel",
                },
                updatedAt: { type: Date },
                readByModel: {
                  type: String,
                  enum: ["employees", "pmsclients"],
                  required: true,
                },
              },
            ],
            default: [],
          }
          : {
            type: [
              {
                receiver_id: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "employees",
                },
                updatedAt: { type: Date },
              },
            ],
            default: [],
          },
      };
    } catch (error) {
      console.log("🚀 ~ CommonHelpers ~ commonSchema ~ error:", error);
    }
  }

  // Ref model for by forget the created user is HRMS emp or PMS client...
  async getRefModelFromLoginUser(
    loginUser,
    isUpdate = false,
    isDelete = false
  ) {
    try {
      const objectId = "67c81990506e8203272e6267";

      // let refModel =
      //   loginUser &&
      //     (loginUser?.pms_role_id?.role_name == config.PMS_ROLES.CLIENT)
      //     ? "pmsclients"
      //     : "employees";

      // refModel = loginUser?._id == objectId ? "pmsclients" : refModel;
      let refModel =
        loginUser &&
          loginUser?._id?.toString() == objectId
          ? "pmsclients"
          : loginUser?.pms_role_id?.role_name === config.PMS_ROLES.CLIENT
            ? "pmsclients"
            : "employees";

      // console.log("refModel:", refModel, loginUser, "tt");
      console.log("refModel:", refModel, loginUser, 'tt', loginUser?.toString() == objectId.toString(),
        loginUser?._id, objectId, loginUser)
      return {
        ...(!isUpdate && !isDelete
          ? {
            createdByModel: refModel,
            updatedByModel: refModel,
          }
          : isUpdate && !isDelete
            ? { updatedByModel: refModel }
            : { deletedByModel: refModel }),
      };
    } catch (error) {
      console.log("🚀 ~ CommonHelpers ~ getUpdatedByQuery ~ error:", error);
    }
  }

  async getCreatedUpdatedDeletedByQuery(
    fieldName = "createdBy",
    matchKey = "$_id"
  ) {
    try {
      const refModel =
        fieldName == "createdBy"
          ? "$createdByModel"
          : fieldName == "updatedBy"
            ? "$updatedByModel"
            : "$deletedByModel";

      const obj = { [fieldName]: `$${fieldName}` };
      const matchVar = `$$${fieldName}`;
      const empVar = `${fieldName}Emp`;
      const clientVar = `${fieldName}Client`;
      console.log("=====", refModel)
      return [
        {
          $lookup: {
            from: "employees",
            let: obj,
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: [matchKey, matchVar] },
                      // { $eq: ["$isDeleted", false] },
                      // { $eq: ["$isSoftDeleted", false] },
                      // { $eq: ["$isActivate", true] },
                    ],
                  },
                },
              },
            ],
            as: empVar,
          },
        },
        {
          $lookup: {
            from: "pmsclients",
            let: obj,
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: [matchKey, matchVar] },
                      // { $eq: ["$isDeleted", false] },
                      // { $eq: ["$isSoftDeleted", false] },
                      // { $eq: ["$isActivate", true] },
                    ],
                  },
                },
              },
            ],
            as: clientVar,
          },
        },
        {
          $addFields: {
            [fieldName]: {
              $cond: {
                if: { $eq: [refModel, "employees"] },
                then: { $arrayElemAt: [`$${empVar}`, 0] },
                else: { $arrayElemAt: [`$${clientVar}`, 0] },
              },
            },
          },
        },
      ];
    } catch (error) {
      console.log("🚀 ~ CommonHelpers ~ getCreatedByQuery ~ error:", error);
    }
  }

  // get pms client query..
  async getClientQuery(isProjection = false, filterClientIds = []) {
    try {
      let query = [
        {
          $lookup: {
            from: "pmsclients",
            let: {
              clientIds: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$pms_clients" },
                      { $ne: ["$pms_clients", []] },
                    ],
                  },
                  then: "$pms_clients",
                  else: [],
                },
              },
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$clientIds"] },
                      { $eq: ["$isDeleted", false] },
                      { $eq: ["$isSoftDeleted", false] },
                      { $eq: ["$isActivate", true] },
                    ],
                  },
                },
              },
            ],
            as: "pms_clients",
          },
        },
      ];

      if (isProjection) {
        query = {
          pms_clients: {
            $filter: {
              input: {
                $map: {
                  input: {
                    $cond: {
                      if: {
                        $and: [
                          { $isArray: "$pms_clients" },
                          { $ne: ["$pms_clients", []] },
                        ],
                      },
                      then: "$pms_clients",
                      else: [],
                    },
                  },
                  as: "clientId",
                  in: {
                    $cond: {
                      if: {
                        ...(filterClientIds.length > 0
                          ? {
                            $in: [
                              "$$clientId._id",
                              filterClientIds.map(
                                (n) => new mongoose.Types.ObjectId(n)
                              ),
                            ],
                          }
                          : {}),
                      },
                      then: {
                        _id: "$$clientId._id",
                        full_name: "$$clientId.full_name",
                        first_name: "$$clientId.first_name",
                        last_name: "$$clientId.last_name",
                        email: "$$clientId.email",
                        client_img: "$$clientId.client_img",
                        for_tag_user: {
                          $concat: [
                            "$$clientId.first_name",
                            "_",
                            "$$clientId.last_name",
                          ],
                        },
                      },
                      else: null, // Or any other value you prefer for non-matching IDs
                    },
                    // _id: "$$clientId._id",
                    // full_name: "$$clientId.full_name",
                    // first_name: "$$clientId.first_name",
                    // last_name: "$$clientId.last_name",
                    // email: "$$clientId.email",
                    // client_img: "$$clientId.client_img",
                    // for_tag_user: {
                    //   $concat: [
                    //     "$$clientId.first_name",
                    //     "_",
                    //     "$$clientId.last_name",
                    //   ],
                    // },
                  },
                },
              },
              as: "client",
              cond: { $ne: ["$$client", null] },
            },
          },
        };
      }
      return query;
    } catch (error) {
      console.log("🚀 ~ CommonHelpers ~ error:", error);
    }
  }

  async getProjectDefaultSettingQuery(fieldName = "_id", isProjection = false) {
    try {
      let query;

      if (!isProjection) {
        query = [
          {
            $lookup: {
              from: "project_tabs_settings",
              let: { projectId: `$${fieldName}` },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$project_id", "$$projectId"] },
                        { $eq: ["$isDeleted", false] },
                        { $eq: ["$isDefault", true] },
                      ],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "project_tabs",
                    let: { tab_id: "$tab_id" },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              { $eq: ["$_id", "$$tab_id"] },
                              { $eq: ["$isDeleted", false] },
                            ],
                          },
                        },
                      },
                    ],
                    as: "tab",
                  },
                },
                {
                  $unwind: {
                    path: "$tab",
                    preserveNullAndEmptyArrays: true,
                  },
                },
              ],
              as: "projectDefaultTab",
            },
          },
          {
            $unwind: {
              path: "$projectDefaultTab",
              preserveNullAndEmptyArrays: true,
            },
          },
        ];
      } else {
        query = {
          defaultTab: {
            _id: "$projectDefaultTab.tab._id",
            name: "$projectDefaultTab.tab.name",
          },
        };
      }

      return query;
    } catch (error) {
      console.log("🚀 ~ CommonHelpers ~ error:", error);
    }
  }

  getUserName = (user) => {
    try {
      return (
        user?.first_name + (user?.last_name !== "" ? " " + user?.last_name : "")
      );
    } catch (error) {
      console.log("🚀 ~ SocketCommonFn ~ error:", error);
    }
  };

  async getExcpetionalProjects() {
    let project_ids = ["665473f638bcaa161261cf31"]; // This array is made for id of project named ~> "Smart Dental Care"
    // where the task comments notfications is not applicable as there are lots of clients.
    return project_ids
  }

  async getExcpetionalProjectsForNomailRegardstoLoggedHours() {
    let project_ids = ["666bd1cc9b47ea98ae8b92b7"];// This array is made for id of project named ~> "SO1001/IH/TimeTrackNRG"
    //where to make this project's manager to not to receive email 
    //for hours being logged, no changes to mailsettings as mailsettings says that quarterly mails shall be sent that is
    //after every 4 hours so can't overwrite keys to be true as logged_hours remain false.. so statically made changes in code here.
    return project_ids
  }

  async getPCandAMunderCEOIDtoexcludeCEOformail() {
    let emp_email = "harshal@mailinator.com"//"harshal@elsner.in"; // To not to send mail to ceo for all PC and AM's manager being ceo.
    // for complaints we send mail to pc and am's manager too 
    // so, to check that if their manager is ceo then to exclude them as mail to ceo will be sent if escalation level 2..
    return emp_email
  }
}

module.exports = new CommonHelpers();
