const moment = require("moment");

exports.sheet1 = (data) => {
    // console.log("🚀 ~ data:", data)
    try {

        let htmlContent = '<table id="table-to-xls"><tr><th></th><th>Created By</th><th>Date</th><th>Project</th><th>Task List</th><th>Task</th><th>Description</th><th>Bug</th><th>Time</th></tr>';

        Object.entries(data).map(([date, entries], value) => {
            // console.log("🚀 ~ Object.entries ~ date:", date)
            if (entries.items) {
                // console.log("🚀 ~ Object.entries ~ entries:", entries, " \n\n\n\n-----------------", entries.items)

                htmlContent += ` <tr>
                              <td>${moment(date).format("DD MMM YYYY")}</td>
                            </tr>
                            
                            ${entries.items.map((entry) => {
                    // console.log("🚀 ~ ${entries.items?.map ~ entry:", entry)
                    return `<tr><td></td>
                                <td>${entry?.createdBy?.full_name || " - "}</td>
                                
                                <td> ${moment(entry?.logged_date).format("DD MMM YYYY") || " - "}</td>

                                 <td>${entry?.projectDetails?.title || " - "}</td>

                                 <td>${entry?.main_taskList || " - "}</td>
                                
                                <td>${entry?.task || " - "}</td>
    
                                <td>${entry?.descriptions.slice(0, 23) || " - "}</td>
    
                                <td>${entry?.bug || " - "}</td>
    
                                <td>${entry?.time || " - "}</td>
                                
                                </tr>`
                })}
    
                            ${entries?.totalTime ? `
                                
                                <tr> 
                                
                                <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td>Total</td>
    
                                <td>
                                 
                                ${entries?.totalTime?.hours +
                        "h" +
                        " " +
                        entries?.totalTime?.minutes +
                        "m"}
                                
                                </td>
                                
                                </tr>
                                
                                
                                ` : ` - `}
                            `
            }

        })
        Object.entries(data).map(([date, entries], value) => {
            if (date == "grandTotal") {

                htmlContent += `<tr>

                        <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td>

                        <td>

                        <strong>Grand Total Time</strong>

                        </td>

                        <td> 

                        ${entries?.hours + "h  " + entries?.minutes + "m  "}

                        </td>

            </tr>`
            }
        })
        htmlContent += '</table>';
        return { html: htmlContent }
    } catch (e) {
        console.log("error at timehseetReportsCSV.js:", e)
    }
}