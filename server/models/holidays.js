const mongoose = require('mongoose');
const configs = require('../configs');
const Schema = mongoose.Schema;

const holidaysSchema = new mongoose.Schema({
    org_id: { type: Schema.Types.ObjectId, ref: 'org', required: true },
    holiday_name: { type: String, required: true },
    holiday_date: { type: Date, required: true },
    isOptional: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'employees', required: true },
    created_At: { type: Date, default: configs.utcDefault },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'employees', required: true },
    updated_At: { type: Date, default: configs.utcDefault },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'employees' },
    isDeleted: { type: Boolean, default: false }
})

module.exports = mongoose.model('holidays', holidaysSchema)