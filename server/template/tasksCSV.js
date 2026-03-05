exports.sheet = (data) => {
    try {
        let htmlContent = '<table id="table-to-xls"><tr><th>Stages</th><th>Tasks</th><th>Descriptions</th><th>Start Date</th><th>Due Date</th><th>Labels</th><<th>Assignees</th><th>Clients</th><th>Estimated Time</th></tr>';

        data.forEach(stage => {
            const title = stage[0].title;
            const tasks = stage[0].tasks;
            const rowspan = tasks.length > 0 ? tasks.length : 1;

            htmlContent += `<tr><td rowspan="${rowspan}">${title}</td>`;

            if (tasks.length === 0) {
                htmlContent += '<td></td><td></td></tr>';
            } else {
                tasks.forEach((task, index) => {
                    if (index > 0) htmlContent += "<tr>";
                    if (task.dueDate === "Invalid date" || task.dueDate === null) {
                        task.dueDate = " - ";
                    }
                    if (task.startDate === "Invalid date" || task.startDate === null) {
                        task.startDate = " - ";
                    }
                    if (task.descriptions === "") {
                        task.descriptions = " - ";
                    }
                    if (task.assignees.length <= 0 || task.assignees == undefined) {
                        task.assignees = " - ";
                    }
                    if (task.labels == undefined) {
                        task.labels = " - ";
                    }
                    if (task.clients == undefined) {
                        task.clients = " - ";
                    }
                    let clients;
                    let empAssignees;
                    if (Array.isArray(task.assignees)) {
                        clients = task.assignees.filter(assignee => assignee.for_tag_user).map(assignee => assignee.full_name);
                        empAssignees = task.assignees
                          .filter((assignee) => !assignee.for_tag_user)
                          .map((assignee) => assignee.full_name);
                    } else {
                        clients = " - ";
                        empAssignees = " - ";
                    }
                    htmlContent += `<td>${task.taskTitle}</td><td>${
                      task.descriptions
                    }</td><td>${task.startDate}</td><td>${
                      task.dueDate
                    }</td><td>${task.labels.map(
                      (ele) => ele.title
                    )}</td><td>${empAssignees}</td><td>${clients}</td><td>${
                      task.hours
                    }:${task.minutes}</td></tr>`;

                });
            }
        });

        htmlContent += '</table>';
        return { html: htmlContent }
    } catch (e) {
        console.log("error at taskCSV.js:", e)
    }
}