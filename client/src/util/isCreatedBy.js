const userDataString = localStorage.getItem("user_data");
const authUser = JSON.parse(userDataString)

export const isCreatedBy = (isCreatedBy) =>{   
    return isCreatedBy == authUser?._id ? true : false
}