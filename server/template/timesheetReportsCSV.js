const moment = require("moment");

exports.sheet = (data) => {
    try {
    
        let htmlContent = '<table id="table-to-xls"><tr><th>Employee Code</th><th>Employee</th><th>Project</th><th>Description</th><th>Date</th><th>Hours</th></tr>';

       data.forEach(ele =>{ 
        htmlContent += `<tr> <td>${ele?.user_code}</td> <td>${ele.user}</td> <td>${ele.project}</td> <td>${ele.descriptions}</td> <td>${moment(ele.logged_date).format('YYYY-MM-DD')}</td><td> ${ele.logged_hours}:${ele.logged_minutes} </td>`
       })

        htmlContent += '</table>';
        return { html: htmlContent }
    } catch (e) {
        console.log("error at timehseetReportsCSV.js:", e)
    }
}