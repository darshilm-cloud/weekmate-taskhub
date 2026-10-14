const { createMyLoggedTimeTable } = require("./myLoggedTimeColumns");

exports.sheet2 = (data, requestedColumns = []) => {
  try {
    const table = createMyLoggedTimeTable(requestedColumns);
    let htmlContent = `<table id="table-to-xls">${table.header}`;

    data.forEach((project) => {
      htmlContent += table.group(project.project.title);
      htmlContent += project.logged_data
        .map((log) => log.data.map((entry) => table.entry(entry)).join(""))
        .join("");
      htmlContent += table.total(
        "Total",
        `${project?.total_hours}h ${project?.total_minutes}m`
      );
    });

    if (data?.grandTotalHours && data?.grandTotalMinutes) {
      htmlContent += table.total(
        "Total",
        `${data.grandTotalHours}h ${data.grandTotalMinutes}m`
      );
    }

    htmlContent += "</table>";
    return { html: htmlContent };
  } catch (e) {
    console.log("error at timehseetReportsCSV.js:", e);
  }
};
