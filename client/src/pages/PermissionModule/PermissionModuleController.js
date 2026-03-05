import { useState,useEffect } from "react";
import { message } from "antd";
import Service from "../../service";
import { useLocation } from 'react-router-dom';
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions/Auth";
import { useDispatch } from "react-redux";

const PermissionModuleController = () => {

  const dispatch = useDispatch();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const role_id = params.get('role_id');

  const [PermissionModalOpen, setPermissionModalOpen] = useState(false);
  const [roleListData, setRoleListData] = useState([]);
  const [permissionListData, setPermissionListData] = useState([]);


  //Get Roles Data Function:
  const getRoledetails = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getAllRole,
      });      
      dispatch(hideAuthLoader());
      setRoleListData(response.data.data);
    } catch (error) {
      console.log(error, "erorrr");
      message.error("Something went wrong!");
    }
  };

  //Get Role List Data Function:
  const getPermissionByRole = async (roleId) => {
    const params = roleId;
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getPermissionByRole}/${params}`,
      });
      setPermissionListData(response?.data?.data);      
    } catch (error) {
      message.error("Something went wrong!");
    }
  };

  useEffect(() => {
    getRoledetails();    
  }, []);

  //Permission switch onChange Function:
  const onPermissionChange = async(checked, id) => {
    try {
      dispatch(showAuthLoader());
      const updatedPermissionListData = permissionListData.map(item => {
        if (item._id === id) {
          return { ...item, isAccess: checked };
        }
        return item;
      });
      setPermissionListData(updatedPermissionListData);

      const reqBody = {
        resource_ids: updatedPermissionListData
          .filter(item => item.isAccess)
          .map(item => item._id),
        pms_role_id: role_id,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addPermissionByRole,
        body: reqBody,
      });

      if (response?.data && response?.data?.status === 1) {
        dispatch(hideAuthLoader());
        await getPermissionByRole(role_id);
      }
    } catch (error) {
      message.error(error);
    }
  };

  return {
    roleListData,
    permissionListData,
    PermissionModalOpen,
    setPermissionModalOpen,
    onPermissionChange,
    getPermissionByRole,
  };
};

export default PermissionModuleController;
