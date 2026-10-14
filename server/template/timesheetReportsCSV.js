const moment = require("moment");
const { pickExportColumns, renderHeaderRow, renderRow } = require("../helpers/exportColumns");

const COLUMNS = [
    { label: "Employee", value: (ele) => ele.user },
    { label: "Project", value: (ele) => ele.project },
    { label: "Description", value: (ele) => ele.descriptions },
    { label: "Date", value: (ele) => moment(ele.logged_date).format('YYYY-MM-DD') },
    { label: "Hours", value: (ele) => ` ${ele.logged_hours}:${ele.logged_minutes} ` },
    { label: "Project Manager", value: (ele) => ele.projectManager || "" },
    { label: "Technology", value: (ele) => (ele.projectTechnology || []).join(", ") },
    { label: "Category", value: (ele) => ele.projectType || "" }
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
        console.log("error at timehseetReportsCSV.js:", e)
    }
}
