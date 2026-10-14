const moment = require("moment");
const { pickExportColumns, renderHeaderRow, renderRow } = require("../helpers/exportColumns");

const COLUMNS = [
    { label: "Project Name", value: (ele) => ele.title },
    { label: "Project Manager", value: (ele) => ele.managerName },
    { label: "Technology", value: (ele) => ele.technologyName },
    { label: "Category", value: (ele) => (ele.project_typeName ? ele.project_typeName : "-") },
    { label: "Estimated Hours", value: (ele) => ele.estimatedHours },
    { label: "Used Hours", value: (ele) => ele.total_logged_time },
    { label: "Start Date", value: (ele) => moment(ele.start_date).format("YYYY-MM-DD") },
    { label: "End Date", value: (ele) => moment(ele.end_date).format("YYYY-MM-DD") }
];

exports.sheet = (data, requestedColumns = []) => {
    try {
        const columns = pickExportColumns(COLUMNS, requestedColumns);
        let htmlContent = `<table id="table-to-xls">${renderHeaderRow(columns)}`;

        data.forEach((ele) => {
            htmlContent += renderRow(columns, ele);
        });

        htmlContent += '</table>';
        return { html: htmlContent }
    } catch (e) {
        console.log("error at projectReportsCSV.js:", e)
    }
}
