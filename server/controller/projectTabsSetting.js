const Joi = require("joi");
const {
  errorResponse,
  successResponse,
  catchBlockErrorResponse,
} = require("../helpers/response");
const mongoose = require("mongoose");
const ProjectTabs = mongoose.model("project_tabs");
const ProjectTabsSettings = mongoose.model("project_tabs_settings");
const Projects = mongoose.model("projects");

const { statusCode, DEFAULT_DATA } = require("../helpers/constant");
const messages = require("../helpers/messages");
const configs = require("../configs");

exports.addDefaultProjectTabs = async (req, res) => {
  try {
    const defaultData = Object.values(DEFAULT_DATA.PROJECT_TABS);

    for (let i = 0; i < defaultData.length; i++) {
      const tab = defaultData[i];

      const isExist = await ProjectTabs.findOne({
        isDeleted: false,
        name: { $regex: new RegExp(`^${tab}$`, "i") },
      });

      if (!isExist) {
        const newData = new ProjectTabs({
          name: tab,
          createdBy: req.user._id,
          updatedBy: req.user._id,
        });
        await newData.save();
      }
    }
    return successResponse(res, statusCode.SUCCESS, messages.CREATED, {});
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.addEditProjectTabsSetting = async (req, res) => {
  try {
    const validationSchema = Joi.object({
      project_id: Joi.string().required(),
      setting_id: Joi.string().required(),
      isEnable: Joi.boolean().required(),
      isDefault: Joi.boolean().required(),
    });
    const { error, value } = validationSchema.validate(req.body);
    if (error) {
      return errorResponse(
        res,
        statusCode.BAD_REQUEST,
        error.details[0].message
      );
    }

    const where = {
      _id: new mongoose.Types.ObjectId(value.setting_id),
      project_id: new mongoose.Types.ObjectId(value.project_id),
      isDeleted: false,
    };

    const getSetting = await ProjectTabsSettings.findOne(where);

    if (!getSetting) {
      return errorResponse(res, statusCode.NOT_FOUND, messages.NOT_FOUND);
    } else {
      await ProjectTabsSettings.findOneAndUpdate(where, {
        $set: {
          isEnable: value.isEnable,
          isDefault: value.isDefault,
        },
      });

      if(value.isDefault == true){
        await ProjectTabsSettings.updateMany({
          project_id: new mongoose.Types.ObjectId(value.project_id),
          _id : {
            $ne :  new mongoose.Types.ObjectId(value.setting_id)
          },
          isDefault : true,
          isDeleted : false
        }, {
          $set: {
            isDefault: false,
          },
        });
      }
    }

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.TAB_SETTING_UPDATED,
      {}
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.getProjectTabsSetting = async (req, res) => {
  try {
    await this.manageProjectTabSetting(req.params.projectId, req.user);

    const getTabSettings = await ProjectTabsSettings.find({
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(req.params.projectId),
    })
      .sort({ _id: 1 })
      .populate({
        path: "tab_id",
        select: "_id name",
      })
      .select("_id project_id tab_id isEnable isDefault")
      .lean();

    return successResponse(
      res,
      statusCode.SUCCESS,
      messages.LISTING,
      getTabSettings
    );
  } catch (error) {
    return catchBlockErrorResponse(res, error.message);
  }
};

exports.manageProjectTabSetting = async (projectId, loginUser) => {
  try {
    let isExist = await ProjectTabsSettings.find({
      isDeleted: false,
      project_id: new mongoose.Types.ObjectId(projectId),
    });

    // If and dummy data are added then delete all and all new...
    if (
      isExist &&
      isExist.length > 0 &&
      (isExist.every((p) => p.isDefault == false) ||
        isExist.every((p) => p.isDefault == true) ||
        isExist.filter((p) => p.isDefault == true).length > 1)
    ) {
      await ProjectTabsSettings.deleteMany({
        isDeleted: false,
        project_id: new mongoose.Types.ObjectId(projectId),
      });

      isExist = [];
    }

    // if not added first add project setting ...
    // Add default tab setting...
    if (isExist && isExist.length == 0) {
      const getTabs = await ProjectTabs.find({
        isDeleted: false,
      });

      if (getTabs && getTabs.length > 0) {
        let obj = {
          project_id: new mongoose.Types.ObjectId(projectId),
          createdBy: loginUser._id,
          updatedBy: loginUser._id,
        };

        for (let i = 0; i < getTabs.length; i++) {
          const tab = getTabs[i];
          const newData = new ProjectTabsSettings({
            ...obj,
            isDefault:
              tab.name == DEFAULT_DATA.PROJECT_TABS.TASKS ? true : false,
            tab_id: new mongoose.Types.ObjectId(tab._id),
          });
          await newData.save();
        }
      } else {
        console.log("No project tabs...");
      }
    }
  } catch (error) {
    console.log("🚀 ~ exports.manageProjectTabSetting=async ~ error:", error);
  }
};

exports.manageAllProjectTabSetting = async (loginUser) => {
  try {
    const projects = await Projects.find({}).lean();
    if (projects && projects.length > 0) {
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        await this.manageProjectTabSetting(project._id, loginUser);
      }
    }
  } catch (error) {
    console.log("🚀 ~ exports.manageProjectTabSetting=async ~ error:", error);
  }
};
