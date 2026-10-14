const moment = require("moment");
const { createMyLoggedTimeTable } = require("./myLoggedTimeColumns");

exports.sheet1 = (data, requestedColumns = []) => {
    try {
        const table = createMyLoggedTimeTable(requestedColumns);
        let htmlContent = `<table id="table-to-xls">${table.header}`;

        Object.entries(data).forEach(([date, entries]) => {
            if (!entries.items) return;
            htmlContent += table.group(moment(date).format("DD MMM YYYY"));
            htmlContent += entries.items.map((entry) => table.entry(entry)).join("");
            if (entries?.totalTime) {
                htmlContent += table.total(
                    "Total",
                    `${entries.totalTime.hours}h ${entries.totalTime.minutes}m`
                );
            }
        });

        if (data?.grandTotal) {
            htmlContent += table.total(
                "<strong>Grand Total Time</strong>",
                `${data.grandTotal.hours}h  ${data.grandTotal.minutes}m  `
            );
        }

        htmlContent += '</table>';
        return { html: htmlContent }
    } catch (e) {
        console.log("error at timehseetReportsCSV.js:", e)
    }
}
