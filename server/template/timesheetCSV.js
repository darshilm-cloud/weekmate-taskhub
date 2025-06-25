const moment = require('moment')

exports.sheet = (data) => {
    let content = `<table id="table-to-xls" style="display:none">
            <tr> 
                <th> Company </th>
                <th> Elsner Technologies Pvt Ltd </th>
            </tr>
            <tr>
            <th> Project </th> 
            <th> ${data[0]?.project}</th>
            </tr>
            <tr>
             <th> Timesheet </th> 
             <th> ${data[0]?.timesheet} </th>
             </tr>
            <tr>
                <th> Downloaded on : </th>
                <th> ${moment().format("YYYY-MM-DD HH:mm:ss")} </th>
            </tr>
            <tr></tr>
            <tr></tr>
            <tr>
            <td> Date </td>
            <td> Time (hours) </td>
            <td> Time (mins) </td>
            <td>Time(hh:mm)</td>
            <td> User </td>
                <td> Description </td>
                <td> Task List </td>
                <td> Task </td>
                <td> Task Id </td>
                <td> Bug </td>
                <td> Bug Id </td>
            </tr>
            ${data.map((item) => {
              return `<tr> 
              <td> ${item.logged_date} </td>
              <td> ${item.logged_hours} </td>
              <td> ${item.logged_minutes} </td>
              <td> ${item.time} </td>
              <td> ${item.loggedBy} </td>
              <td> ${item.descriptions == "" ? "" : item?.descriptions} </td>
              <td> ${item.main_taskList} </td>
              <td> ${item.task} </td>
              <td> ${item.taskId} </td>
              <td> ${item.bug}  </td>
              <td> ${item.bugId} </td>
                        </tr>`;
            })}  
        </table>`;
    return { html: content }
}