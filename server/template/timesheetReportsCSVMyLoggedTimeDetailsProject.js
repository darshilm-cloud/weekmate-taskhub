const moment = require("moment");

exports.sheet2 = (data) => {
  // console.log("🚀 ~ data:", data)
  try {
    let htmlContent =
      '<table id="table-to-xls"><tr><th></th><th>Created By</th><th>Date</th><th>Project</th><th>Task List</th><th>Task</th><th>Description</th><th>Bug</th><th>Time</th></tr>';

    data.forEach((project) => {
      // console.log("🚀 ~ Object.entries ~ date:", date)

      // console.log("🚀 ~ Object.entries ~ entries:", entries, " \n\n\n\n-----------------", entries.items)

      htmlContent += ` <tr>
                              <td>${project.project.title}</td>
                            </tr>
                            
                            ${project.logged_data.map((log) =>
                              log.data.map((entry) => {
                                // console.log("🚀 ~ ${entries.items?.map ~ entry:", entry)
                                return `<tr><td></td>
                                <td>${entry?.createdBy?.full_name || " - "}</td>
                                
                                <td> ${
                                  moment(entry?.logged_date).format(
                                    "DD MMM YYYY"
                                  ) || " - "
                                }</td>

                                 <td>${
                                   entry?.projectDetails?.title || " - "
                                 }</td>

                                 <td>${entry?.main_taskList || " - "}</td>
                                
                                <td>${entry?.task || " - "}</td>
    
                                <td>${
                                  entry?.descriptions.slice(0, 23) || " - "
                                }</td>
    
                                <td>${entry?.bug || " - "}</td>
    
                                <td>${entry?.time || " - "}</td>
                                
                                </tr>`;
                              })
                            )}
    
                             
                                
                                <tr> 
                                
                                <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td>Total</td>
    
                                <td>
                                 
                                ${
                                  project?.total_hours +
                                  "h" +
                                  " " +
                                  project?.total_minutes +
                                  "m"
                                }
                                
                                
                                </td>
                                
                                </tr>
                                
                       
                            `;
    });

    if (data?.grandTotalHours && data?.grandTotalMinutes) {
      htmlContent += `<tr> 
            
            
             <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td>Total</td>
    
                                <td>
                                 
                                ${
                                  data?.grandTotalHours +
                                  "h" +
                                  " " +
                                  data?.grandTotalMinutes +
                                  "m"
                                }
                                
                                
                                </td>
            
            </tr>`;
    }

    htmlContent += "</table>";
    return { html: htmlContent };
  } catch (e) {
    console.log("error at timehseetReportsCSV.js:", e);
  }
};
