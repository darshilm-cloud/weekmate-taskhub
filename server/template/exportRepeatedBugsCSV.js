const moment = require("moment");

exports.sheet = (data) => {
    try {
       
        let htmlContent = '<table id="table-to-xls"><tr><th>Issue Id</th><th>Issue</th><th>Project Name</th><th>Task Name</th><th>Description</th><th>Estimated Time</th><th>Used Hours</th><th>Start Date</th><<th>End Date</th><th>Bug Workflow Staus</th><th>Assignees></th></tr>';

       data.forEach(ele =>{ 
        htmlContent += `<tr> <td>${ele.bugId}</td> <td>${ele.title}</td> <td>${ele.project}</td> <td>${ele.task}</td> <td>${ele.descriptions}</td> <td>${ele.estimated_hours}:${ele.estimated_minutes} </td><td> ${ele.time}</td>`
        if(ele.start_date != undefined || ele.start_date != null ){
            htmlContent += `<td>${moment(ele.start_date).format('YYYY-MM-DD')}</td> <td>${moment(ele.due_date).format('YYYY-MM-DD')}</td>` 
        }else {
            htmlContent += `<td> - </td> <td> - </td>`
        }
        htmlContent += `<td> ${ele.bug_status}</td> <td> ${ele.assignees.map(ele => ele.name)} </td>`
       })

        htmlContent += '</table>';
        return { html: htmlContent }
    } catch (e) {
        console.log("error at exportsRepeatedBugsCSV.js:", e)
    }
}