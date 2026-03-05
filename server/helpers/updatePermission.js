const mongoose = require("mongoose");
let Resources = mongoose.model('resource')
let PMSRole = mongoose.model("pms_roles");

const fs = require('fs').promises;
const path = require('path');
const permissionsFilePath = path.join(__dirname, '../../settings/permission.json');
const roleFilePath = path.join(__dirname, '../../settings/role.json');

class updatePermissionFile {
    async updatePermission() {
        try {
            let resourceData = await Resources.find({ isDeleted: false });
    
            // Prepare new permissions data
            const newPermissions = {};
            resourceData.forEach(resource => {
                newPermissions[resource.resource_name] = resource._id.toString();
            });
    
            // Write the new permissions data to the file, overwriting the existing content
            await fs.writeFile(permissionsFilePath, JSON.stringify(newPermissions, null, 2));
            console.log('Permissions updated.');
        } catch (err) {
            console.error('Error updating permissions:', err);
        }
    }

    async updateRoles() {
        try {
            let roleData = await PMSRole.find({ isDeleted: false });
    
            // Prepare new role data
            const newRoles = {};
            roleData.forEach(role => {
                newRoles[role.role_name] = role._id.toString();
            });
    
            // Write the new role data to the file, overwriting the existing content
            await fs.writeFile(roleFilePath, JSON.stringify(newRoles, null, 2));
            console.log('Roles updated.');
        } catch (err) {
            console.error('Error updating permissions:', err);
        }
    }
}

module.exports = new updatePermissionFile();
