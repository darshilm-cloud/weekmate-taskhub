const moment = require("moment");
const { pickExportColumns, renderHeaderRow, renderRow } = require("../helpers/exportColumns");

const formatDate = (value) => (value ? moment(value).format("YYYY-MM-DD") : " - ");

const COLUMNS = [
    { label: "Issue Id", value: (ele) => ele.bugId },
    { label: "Issue", value: (ele) => ele.title },
    { label: "Project Name", value: (ele) => ele.project },
    { label: "Task Name", value: (ele) => ele.task },
    { label: "Description", value: (ele) => ele.descriptions },
    { label: "Estimated Time", value: (ele) => `${ele.estimated_hours}:${ele.estimated_minutes}` },
    { label: "Used Hours", value: (ele) => ele.time },
    { label: "Start Date", value: (ele) => formatDate(ele.start_date) },
    { label: "End Date", value: (ele) => (ele.start_date ? formatDate(ele.due_date) : " - ") },
    { label: "Bug Workflow Status", value: (ele) => ele.bug_status },
    { label: "Assignees", value: (ele) => (ele.assignees || []).map((assignee) => assignee.name).join(", ") }
];

exports.EXPORT_COLUMNS = COLUMNS.map((column) => column.label);

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
        console.log("error at exportsRepeatedBugsCSV.js:", e)
    }
}
