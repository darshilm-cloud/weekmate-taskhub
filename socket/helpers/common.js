const moment = require("moment");
const mongoose = require("mongoose");
const { getDB } = require("./db");
const { Models } = require("./constants");

class SocketCommonFn {
  utcDefault = () => {
    let date = new Date();
    return moment.utc().toDate(); // moment.utc(date).format();
  };

  getProjectQuery = async (foreignField = "project_id") => {
    try {
      return [
        {
          $lookup: {
            from: "projects",
            let: { project_id: `$${foreignField}` },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$project_id"] },
                      { $eq: ["$isDeleted", false] },
                    ],
                  },
                },
              },
            ],
            as: "project",
          },
        },
        {
          $unwind: {
            path: "$project",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];
    } catch (error) {
      console.log("🚀 ~ SocketCommonFn ~ getProjectQuery= ~ error:", error);
    }
  };

  getTaskQuery = async (foreignField = "task_id") => {
    try {
      return [
        {
          $lookup: {
            from: "projecttasks",
            let: { task_id: `$${foreignField}` },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$task_id"] },
                      { $eq: ["$isDeleted", false] },
                    ],
                  },
                },
              },
            ],
            as: "task",
          },
        },
        {
          $unwind: {
            path: "$task",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];
    } catch (error) {
      console.log("🚀 ~ SocketCommonFn ~ getTaskQuery= ~ error:", error);
    }
  };

  commonLookupQuery = async (
    Model,
    foreignField,
    getAs,
    localFields = "_id",
    conditions = [],
    foreignFieldIsArray = false
  ) => {
    try {
      return [
        {
          $lookup: {
            from: Model,
            let: { foreignField: `$${foreignField}` },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      !foreignFieldIsArray
                        ? { $eq: [`$${localFields}`, "$$foreignField"] }
                        : { $in: [`$${localFields}`, "$$foreignField"] },
                      { $eq: ["$isDeleted", false] },
                      ...conditions,
                    ],
                  },
                },
              },
            ],
            as: getAs,
          },
        },
        ...(!foreignFieldIsArray
          ? [
              {
                $unwind: {
                  path: `$${getAs}`,
                  preserveNullAndEmptyArrays: true,
                },
              },
            ]
          : []),
      ];
    } catch (error) {
      console.log("🚀 ~ SocketCommonFn ~ error:", error);
    }
  };

  checkIsPMSClient = async (id) => {
    try {
      let isClient = true;

      const data = await getDB().Employees.findOne({
        isDeleted: false,
        isSoftDeleted: false,
        isActivate: true,
        _id: new mongoose.Types.ObjectId(id),
      });

      if (data) {
        isClient = false;
      }

      return isClient;
    } catch (error) {
      console.log("🚀 ~ SocketCommonFn ~ checkIsPMSClient= ~ error:", error);
    }
  };

  getLoginUserData = async (userId) => {
    try {
      let loginUser = null;

      if (userId) {
        const isClient = await this.checkIsPMSClient(userId);

        const query = [
          {
            $match: {
              _id: new mongoose.Types.ObjectId(userId),
              isDeleted: false,
              isSoftDeleted: false,
              isActivate: true,
            },
          },
          {
            $lookup: {
              from: "roles",
              let: { role_id: "$role_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$_id", "$$role_id"] },
                        { $eq: ["$isDeleted", false] },
                      ],
                    },
                  },
                },
              ],
              as: "role_id",
            },
          },
          {
            $unwind: {
              path: "$role_id",
              preserveNullAndEmptyArrays: true,
            },
          },
        ];
        if (!isClient) {
          loginUser = await getDB().Employees.aggregate(query).toArray();
        } else {
          loginUser = await getDB().PMSClients.aggregate(query).toArray();
        }
      }
      return loginUser && loginUser?.length > 0 ? loginUser[0] : null;
    } catch (error) {
      console.log("🚀 ~ SocketCommonFn ~ getLoginUserData= ~ error:", error);
    }
  };

  getRefModelFromLoginUser = async (
    loginUser,
    isUpdate = false,
    isDelete = false
  ) => {
    try {
      const refModel =
        loginUser && loginUser?.role_id?.role_type == "pms_client"
          ? "pmsclients"
          : "employees";

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
      console.log("🚀 ~ SocketCommonFn ~ error:", error);
    }
  };

  getRefModelForSenderReceiver = async (loginUser) => {
    try {
      const refModel =
        loginUser && loginUser?.role_id?.role_type == "pms_client"
          ? "pmsclients"
          : "employees";

      return {
        senderModel: refModel,
        receiverModels: ["employees", "pmsclients"],
      };
    } catch (error) {
      console.log("🚀 ~ SocketCommonFn ~ error:", error);
    }
  };

  getCreatedUpdatedDeletedByQuery = async (
    fieldName = "createdBy",
    matchKey = "$_id"
  ) => {
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
  };

  getUserName = (user) => {
    try {
      return (
        user?.first_name + (user?.last_name !== "" ? " " + user?.last_name : "")
      );
    } catch (error) {
      console.log("🚀 ~ SocketCommonFn ~ error:", error);
    }
  };

  getAssigneeData = async (dataFor = "assignees", model = Models.Employees) => {
    try {
      return await this.commonLookupQuery(
        model,
        dataFor,
        dataFor,
        "_id",
        [],
        true
      );
    } catch (error) {
      console.log("🚀 ~ SocketCommonFn ~ getAssigneeData error:", error);
    }
  };

  getAssigneesName = (users, managerId) => {
    try {
      return users
        .filter((e) => e._id.toString() !== managerId.toString())
        .map((u) => this.getUserName(u))
        .join(", ");
    } catch (error) {
      console.log("🚀 ~ SocketCommonFn ~getAssigneesName : error:", error);
    }
  };
}

module.exports = new SocketCommonFn();
