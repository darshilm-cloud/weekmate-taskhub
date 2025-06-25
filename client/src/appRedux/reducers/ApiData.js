import { createSlice } from "@reduxjs/toolkit";
import Service from "../../service";

const ApiData = createSlice({
  name: "ApiData",
  initialState: {
    projectLabels: [],
    foldersList: [],
    employeeList: [],
    projectWorkflowStage: [],
    subscribersList: [],
    clientsList: [],
    taggedUserList: [],

    projectOverviewData: {
      title: "TEsting 26/03",
      project_type: {
        _id: "65e076b36f18d488aebacf3e",
        title: "In-house",
      },
      project_status: {
        _id: "65f056e95476d3b29e597c4b",
        title: "In progress",
      },
      total_assignees: 1,
      estimatedHours: "80",
      total_logged_time: "63:0",
      start_date: "2024-03-12T06:37:59.368Z",
      end_date: "2025-04-12T06:46:14.560Z",
      logged_hours: [
        {
          logged_status: "Void",
          total_logged_hours: 21,
          total_logged_minutes: 0,
        },
        {
          logged_status: "Billable",
          total_logged_hours: 42,
          total_logged_minutes: 0,
        },
        {
          logged_status: "Billed",
          total_logged_hours: 0,
          total_logged_minutes: 0,
        },
        {
          logged_status: "Non-billable",
          total_logged_hours: 0,
          total_logged_minutes: 0,
        },
      ],
    },
  },
  reducers: {
    setData(stateObject, action) {
      const { stateName, data } = action.payload;
      stateObject[stateName] = data;
    },
  },
});

export const { setData } = ApiData.actions;
export default ApiData.reducer;

//API calling Functions
export const getLables = () => {
  return async (dispatch) => {
    try {
      const reqBody = {
        isDropdown: true,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectLables,
        body: reqBody,
      });
      if (response.data && response.data.data) {
        dispatch(
          setData({ stateName: "projectLabels", data: response.data.data })
        );
      }
    } catch (error) {
      console.log(error);
    }
  };
};

export const getSpecificProjectWorkflowStage = (stagesId) => {
  return async (dispatch) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getworkflowStatus + "/" + stagesId,
        //  `${Service.getWorkflowStatus}/${stagesId}`,
      });
      if (response.data && response.data.data) {
        dispatch(
          setData({
            stateName: "projectWorkflowStage",
            data: response.data.data,
          })
        );
      }
    } catch (error) {
      console.log(error);
    }
  };
};

export const getFolderList = (projectId) => {
  return async (dispatch) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getFolderslist,
        body: {
          project_id: projectId,
        },
      });
      if (response.data && response.data.data) {
        dispatch(
          setData({ stateName: "foldersList", data: response.data.data })
        );
      }
    } catch (error) {
      console.log(error);
    }
  };
};

export const getEmployeeList = () => {
  return async (dispatch) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployees,
      });
      if (response.data && response.data.data) {
        dispatch(
          setData({ stateName: "employeeList", data: response.data.data })
        );
      }
    } catch (error) {
      console.log(error);
    }
  };
};

export const getSubscribersList = (projectId) => {
  return async (dispatch) => {
    try {
      const params = `/${projectId}`;
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getMasterSubscribers + params,
      });
      if (response.data && response.data.data) {
        dispatch(
          setData({ stateName: "subscribersList", data: response.data.data })
        );
      }
    } catch (error) {
      console.log(error);
    }
  };
};

export const getTaggedUserList = (topicId,taskId,bugId,noteId,loggedhoursId) => {    
  return async (dispatch) => {
    let reqBody ={};
    if(topicId){
      reqBody = {
        isDiscussions : true,
        disucssionTopicid : topicId,
      }  
    }
      if(taskId) {
        reqBody = {
          isTasks : true,
          taskId : taskId,
        }
      }
      if(bugId){
        reqBody = {
          isBugs : true,
          bugId : bugId,
        }      
      }      
      if(noteId){
        reqBody = {
          isNotes : true,
          noteId : noteId,
        }  
      }

      if(loggedhoursId){
        reqBody = {
          isLoggedhours : true,
          loggedhoursId : loggedhoursId,
        }  
      }
      
      
   
    try {      
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.gettaggedUsersList,
        body : reqBody,
      });
      if (response.data && response.data.data) {
        console.log(response.data.data[0].users,"res.data.data")
        dispatch(
          setData({ stateName: "taggedUserList", data: response.data.data[0].users })
        );
      }
    } catch (error) {
      console.log(error);
    }
  };
};

//client list (replace end point remaining)
export const getClientList = (projectId = null) => {
  return async (dispatch) => {
    try {
      // const params = `/${projectId}`
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getclient,
        body: {
          isDropdown: true,
          ...(projectId ? { project_id: projectId } : {}),
        },
      });
      console.log(response.data, "getclientss");
      if (response.data && response.data.data) {
        dispatch(
          setData({ stateName: "clientsList", data: response.data.data })
        );
      }
    } catch (error) {
      console.log(error);
    }
  };
};

export const getOverviewProjectByID = (projectId) => {
  return async (dispatch) => {
    try {
      const params = `/${projectId}`;
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getOverview + params,
      });
      if (response.data.data) {
        dispatch(
          setData({
            stateName: "projectOverviewData",
            data: response.data.data,
          })
        );
      }
    } catch (error) {
      console.log(error);
    }
  };
};

function removeTitleWithAtSign(namesArray) {
  return namesArray.map((person) => {
    let fullName = person.full_name;
    fullName = fullName.replace(/Mr\. |Mr |Ms\. |Ms |Mrs\. |Mrs  /i, "");
    return "@" + fullName.trim();
  });
}
