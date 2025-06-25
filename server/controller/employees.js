const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const Employees = mongoose.model("employees");
const PMSRoles = mongoose.model("pms_roles");
const {
  getPagination,
  getTotalCountQuery,
  searchDataArr,
  getAggregationPagination,
} = require("../helpers/queryHelper");
const { statusCode } = require("../helpers/constant");
const messages = require("../helpers/messages");
const _ = require("lodash");
const { generateCSV, generateXLSX } = require("../helpers/common");
const config = require("../settings/config.json");

// Get Employees list...
exports.getEmployees = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      pageNo: Joi.number().integer().min(1).default(1),
      search: Joi.string().allow("").optional(),
      sort: Joi.string().default("_id"),
      sortBy: Joi.string().default("desc"),
      emp_id: Joi.string().optional().allow(""),
      emp_code: Joi.string().optional(),
      first_name: Joi.string().optional(),
      full_name: Joi.string().optional(),
      department_id: Joi.string().optional(),
      designation_id: Joi.string().optional(),
      pms_role_id: Joi.string().optional(),
      isExport: Joi.boolean().default(false),
      exportFileType: Joi.string()
        .optional()
        .valid("csv", "xlsx")
        .insensitive()
        .default("csv"),
    });

    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const pagination = getPagination({
      pageLimit: value.limit,
      pageNum: value.pageNo,
      sort: value.sort,
      sortBy: value.sortBy,
    });

    let matchQuery = {
      isDeleted: false,
      isSoftDeleted: false,
      isActivate: true,
      // Apply filters..
      ...(value.emp_id && { _id: new mongoose.Types.ObjectId(value.emp_id) }),
      ...(value.emp_code && { emp_code: value.emp_code }),
      ...(value.first_name && { first_name: value.first_name }),
      ...(value.full_name && { full_name: value.full_name }),
      ...(value.department_id && {
        department_id: new mongoose.Types.ObjectId(value.department_id),
      }),
      ...(value.designation_id && {
        "designation._id": new mongoose.Types.ObjectId(value.designation_id),
      }),
      ...(value.pms_role_id && {
        "pms_role._id": new mongoose.Types.ObjectId(value.pms_role_id),
      }),
    };

    if (value.search) {
      matchQuery = {
        ...matchQuery,
        ...searchDataArr(
          [
            "first_name",
            "last_name",
            "full_name",
            "emp_code",
            "department.department_name",
            "designation.designation_name",
            "pms_role.role_name",
          ],
          value.search
        ),
      };
    }

    const mainQuery = [
      {
        $lookup: {
          from: "empdepartments",
          let: { department_id: "$department_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$department_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "department",
        },
      },
      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "empdesignations",
          let: { designation_id: "$designation_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$designation_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "designation",
        },
      },
      {
        $unwind: {
          path: "$designation",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "pms_roles",
          let: { pms_role_id: "$pms_role_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$pms_role_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "pms_role",
        },
      },
      {
        $unwind: {
          path: "$pms_role",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: matchQuery },
      {
        $project: {
          _id: "$_id",
          intial_name: { $ifNull: ["$intial_name", ""] },
          full_name: {
            $concat: ["$intial_name", " ", "$first_name", " ", "$last_name"],
          },
          first_name: { $ifNull: ["$first_name", ""] },
          last_name: { $ifNull: ["$last_name", ""] },
          phone_number: { $ifNull: ["$phone_number", ""] },
          email: { $ifNull: ["$email", ""] },
          emp_code: { $ifNull: ["$emp_code", ""] },
          branch: { $ifNull: ["$branch", ""] },
          joining_date: { $ifNull: ["$joining_date", ""] },
          user_img: { $ifNull: ["$user_img", ""] },
          department_name: { $ifNull: ["$department.department_name", ""] },
          designation_name: {
            $ifNull: ["$designation.designation_name", ""],
          },
          emp_type: { $ifNull: ["$emp_type", ""] },
          emp_img: { $ifNull: ["$emp_img", ""] },
          pms_role: { $ifNull: ["$pms_role", null] },
        },
      },
    ];

    const countQuery = getTotalCountQuery(mainQuery);
    const totalCountResult = await Employees.aggregate(countQuery);
    const totalCount = totalCountResult[0] ? totalCountResult[0].count : 0;

    const listQuery = await getAggregationPagination(mainQuery, pagination);
    let data = await Employees.aggregate(listQuery);

    let metaData = {};

    if (value?.isExport) {
      data = await this.exportEmpData(mainQuery, value.exportFileType);
    } else {
      metaData = {
        total: totalCount,
        limit: pagination.limit,
        pageNo: pagination.page,
        totalPages:
          pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 1,
        currentPage: pagination.page,
      };
    }

    // add pms role in emp model...
    await this.addEmpPMSRole(data);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data,
      metaData
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// Export employee data..
exports.exportEmpData = async (query, exportFileType) => {
  try {
    let result = [];
    const data = await Employees.aggregate([
      ...query,
      { $sort: { first_name: -1 } },
    ]).exec();

    // Loop through each item in the data
    for (let i = 0; i < data.length; i++) {
      let item = data[i];

      // Map the rest of the fields
      result.push({
        "Employee code": item.emp_code,
        Name: item.full_name,
        Role: item?.pms_role?.role_name || "-",
        "Joining Date": moment(item.joining_date)
          .add(6, "hours")
          .format("DD-MMM-YYYY"),
        "Department Name": item.department_name,
        "Designation Name": item.designation_name,
        "Employee Type": item.emp_type,
      });
    }

    const csvFields = [
      "Employee code",
      "Name",
      "Role",
      "Joining Date",
      "Department Name",
      "Designation Name",
      "Employee Type",
    ];

    const exportFileTypeLower = _.toLower(exportFileType);

    if (exportFileTypeLower === "csv") {
      result = await generateCSV(result, csvFields);
    } else if (exportFileTypeLower === "xlsx") {
      result = await generateXLSX(csvData);
      // const linkSource = "data:text/csv;base64," + base64;
    }
    return result;
  } catch (error) {
    console.log("🚀 ~ exports.exportEmpData= ~ error:", error);
  }
};

// Get emp by id...
exports.getEmployeeDetails = async (req, res) => {
  try {
    let matchQuery = {
      _id: new mongoose.Types.ObjectId(req.params.id),
      isDeleted: false,
      isSoftDeleted: false,
      isActivate: true,
    };

    const mainQuery = [
      {
        $lookup: {
          from: "resourcepermissions",
          let: { empId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user_id", "$$empId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "permissions",
        },
      },
      {
        $lookup: {
          from: "empdepartments",
          let: { department_id: "$department_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$department_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "department",
        },
      },
      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "empdesignations",
          let: { designation_id: "$designation_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$designation_id"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "designation",
        },
      },
      {
        $unwind: {
          path: "$designation",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: matchQuery },
      {
        $project: {
          plain_password: 0,
          password: 0,
        },
      },
    ];

    let data = await Employees.aggregate(mainQuery);
    if (data && data.length > 0) {
      return successResponse(
        res,
        statusCode.SUCCESS,
        messages.LISTING,
        data,
        []
      );
    } else {
      return errorResponse(
        res,
        statusCode.NOT_FOUND,
        messages.NOT_FOUND,
        data,
        []
      );
    }
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// emp list For dropdown...
exports.getEmployeesForDropdown = async (req, res) => {
  try {
    let data = await Employees.find({
      isDeleted: false,
      isSoftDeleted: false,
      isActivate: true,
    })
      .select("_id full_name emp_img")
      .sort({ full_name: 1 });

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

// manager list For dropdown...
exports.getReportingManagerForDropdown = async (req, res) => {
  try {
    // TL, PC AND MANAGER..
    let query = [
      {
        $facet: {
          pc_tl: [
            {
              $lookup: {
                from: "pms_roles",
                let: { roleId: "$pms_role_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$roleId"] },
                          { $eq: ["$isDeleted", false] },
                        ],
                      },
                    },
                  },
                ],
                as: "role",
              },
            },
            {
              $unwind: {
                path: "$role",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $match: {
                isDeleted: false,
                isSoftDeleted: false,
                isActivate: true,
                "role.role_name": {
                  $in: [config.PMS_ROLES.PC, config.PMS_ROLES.TL,config.PMS_ROLES.ADMIN],
                },
              },
            },
            {
              $project: {
                _id: 1,
                manager_name: "$full_name",
                emp_img: "$emp_img",
              },
            },
          ],
          manager: [
            {
              $match: {
                isDeleted: false,
                isSoftDeleted: false,
                isActivate: true,
                reporting_manager: { $exists: true, $ne: null },
              },
            },
            {
              $group: {
                _id: "$reporting_manager",
              },
            },
            {
              $lookup: {
                from: "employees",
                localField: "_id",
                foreignField: "_id",
                as: "managerDetails",
              },
            },
            {
              $unwind: {
                path: "$managerDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 1,
                manager_name: "$managerDetails.full_name",
                emp_img: "$managerDetails.emp_img",
              },
            },
          ],
        },
      },
      {
        $project: {
          managers: {
            $setUnion: ["$pc_tl", "$manager"],
          },
        },
      },
      {
        $unwind: "$managers",
      },
      {
        $sort: {
          "managers.manager_name": 1, // Sort by manager_name in ascending order
        },
      },
      {
        $group: {
          _id: null,
          sortedArray: {
            $push: "$managers",
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id field
          managers: "$sortedArray", // Rename sortedArray to managers
        },
      },
    ];
    let data = await Employees.aggregate(query);

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      data[0]?.managers || [],
      {}
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getEmployeesForDropdownDeptwise = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      departments: Joi.array().optional(),
    });

    const { value, error } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }
    let data = await Employees.find({
      subdepartment_id: { $in: value?.departments },
      isDeleted: false,
      isSoftDeleted: false,
      isActivate: true,
    })
      .select("_id full_name emp_img subdepartment_id")
      .populate({
        path: "subdepartment_id",
        model: "subdepartments",
        select: "sub_department_name",
      })
      .sort({ full_name: 1 });

    return successResponse(res, statusCode.SUCCESS, messages.LISTING, data, {});
  } catch (error) {
    console.log("errorr--0>",error)
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.addEmpPMSRole = async (emps) => {
  try {
    if (emps && emps.length > 0) {
      // get user role...
      const role = await PMSRoles.findOne({
        role_name: config.PMS_ROLES.USER,
        isDeleted: false,
      });
      if (role) {
        for (let i = 0; i < emps.length; i++) {
          const ele = emps[i];

          if (!ele?.pms_role?._id) {
            await Employees.findByIdAndUpdate(ele._id, {
              $set: {
                pms_role_id: new mongoose.Types.ObjectId(role._id),
              },
            });
          }
        }
      }
    }
  } catch (error) {
    console.log("🚀 ~ exports.addEmpPermissions= ~ error:", error);
  }
};
