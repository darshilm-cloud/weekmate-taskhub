const mongoose = require("mongoose");
let PMSRole = mongoose.model("pms_roles");

const fs = require("fs");
const path = require("path");
const permissionsFilePath = path.join(
  __dirname,
  "../../settings/permission.json"
);
const roleFilePath = path.join(__dirname, "../../settings/role.json");

class clearRolesandPermissionFile {
  async clearPermissionFile() {
    fs.readFile(permissionsFilePath, (err, data) => {
      if (err) throw err;

      const currentPermissions = JSON.parse(data);
      let isUpdated = false;

      Object.keys(currentPermissions).forEach((permissionKey) => {
        if (currentPermissions[permissionKey]) {
          delete currentPermissions[permissionKey];
          isUpdated = true;
        }
      });

      if (isUpdated) {
        fs.writeFile(
          permissionsFilePath,
          JSON.stringify(currentPermissions, null, 2),
          (err) => {
            if (err) throw err;
            console.log("Permissions file made empty.");
          }
        );
      } else {
        console.log("Permission changes not emptied.");
      }
    });
  }
  async clearRolesFile() {
    fs.readFile(roleFilePath, (err, data) => {
      if (err) throw err;

      const currentRoles = JSON.parse(data);
      let isUpdated = false;

      Object.keys(currentRoles).forEach((permissionKey) => {
        if (currentRoles[permissionKey]) {
          delete currentRoles[permissionKey];
          isUpdated = true;
        }
      });

      if (isUpdated) {
        fs.writeFile(
          roleFilePath,
          JSON.stringify(currentRoles, null, 2),
          (err) => {
            if (err) throw err;
            console.log("Role file made empty..");
          }
        );
      } else {
        console.log("Role changes not emptied.");
      }
    });
  }
}

module.exports = new clearRolesandPermissionFile();
