const moment = require('moment')
const { pickExportColumns } = require("../helpers/exportColumns");

const COLUMNS = [
    { label: "Date", value: (item) => item.logged_date },
    { label: "Time (hours)", value: (item) => item.logged_hours },
    { label: "Time (mins)", value: (item) => item.logged_minutes },
    { label: "Time(hh:mm)", value: (item) => item.time },
    { label: "User", value: (item) => item.loggedBy },
    { label: "Description", value: (item) => (item.descriptions == "" ? "" : item?.descriptions) },
    { label: "Task List", value: (item) => item.main_taskList },
    { label: "Task", value: (item) => item.task },
    { label: "Task Id", value: (item) => item.taskId },
    { label: "Bug", value: (item) => item.bug },
    { label: "Bug Id", value: (item) => item.bugId },
    { label: "Status", value: (item) => item.logged_status || "" }
];

exports.sheet = (data, requestedColumns = []) => {
    const columns = pickExportColumns(COLUMNS, requestedColumns);
    let content = `<table id="table-to-xls" style="display:none">
            <tr>
                <th> Company </th>
                <th> Taskhub </th>
            </tr>
            <tr>
            <th> Project </th>
            <th> ${data[0]?.project}</th>
            </tr>
            <tr>
             <th> Timesheet </th>
             <th> ${data[0]?.timesheet} </th>
             </tr>
            <tr>
                <th> Downloaded on : </th>
                <th> ${moment().format("YYYY-MM-DD HH:mm:ss")} </th>
            </tr>
            <tr></tr>
            <tr></tr>
            <tr>
            ${columns.map((column) => `<td> ${column.label} </td>`).join("")}
            </tr>
            ${data.map((item) => {
              return `<tr>
              ${columns.map((column) => `<td> ${column.value(item) ?? ""} </td>`).join("")}
                        </tr>`;
            }).join("")}
        </table>`;
    return { html: content }
}
