const moment = require("moment");

exports.sheet = (data) => {
    try {
        let htmlContent = '<table id="table-to-xls"><tr><th>Project Name</th><th>Project Manager</th><th>Technology</th><th>Project Type</th><th>Estimated Hours</th><th>Used Hours</th><th>Start Date</th><<th>End Date</th></tr>';

       data.forEach(ele =>{ 
        htmlContent += `<tr> <td>${ele.title}</td> <td>${
          ele.managerName
        }</td> <td>${ele.technologyName}</td> <td>${
          ele.project_typeName ? ele.project_typeName : "-"
        } </td> <td>${ele.estimatedHours} </td> <td>${ele.total_logged_time}</td> <td>${moment(
          ele.start_date
        ).format("YYYY-MM-DD")}</td> <td>${moment(ele.end_date).format(
          "YYYY-MM-DD"
        )}</td>`;
       })

        htmlContent += '</table>';
        return { html: htmlContent }
    } catch (e) {
        console.log("error at projectReportsCSV.js:", e)
    }
}