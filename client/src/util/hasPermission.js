import getCookie from "../hooks/getCookie";
import permissionsMap from "../settings/permission.json";
import roleMap from "../settings/role.json";

export const hasPermission = (
  permissionName,
  userPermission = JSON.parse(getCookie("user_permission")) || []
) => {
  let permissionId = permissionName.map((item) => permissionsMap[item]);
  return userPermission.some((ele) => permissionId.includes(ele));
};

export const getRoles = (roleName, useroleID = getCookie("pms_role_id") || "6620c5d13cb3ee347303b35e") => {
  let flag;
  console.log(useroleID,'useroleID');
  
  for (const role in roleMap) {
    if (roleMap.hasOwnProperty(role)) {
      if (roleMap[role] === useroleID) {
       flag =roleName.includes(role)
      }
    }
  }
  return flag;
};
