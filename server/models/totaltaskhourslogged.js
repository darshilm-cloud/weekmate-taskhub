const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const TotalTaskHoursLogsSchema = new mongoose.Schema({
    employee_id: {
        type: Schema.Types.ObjectId,
        ref: "employees",
    },
    month: {
        type: String,
    },
    year: {
        type: String,
    },
    total_time: {
        type: String,
        default: "00:00",
    },
    ...commonSchema(),
});

module.exports = mongoose.model("projecttotaltaskhourlogs", TotalTaskHoursLogsSchema);
