const mongoose = require("mongoose");

const dashboardAuditLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    actorId: { type: String, required: true },
    actorUsername: { type: String, default: null, maxlength: 32 },
    action: { type: String, required: true, maxlength: 160 },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

dashboardAuditLogSchema.index({ guildId: 1, createdAt: -1 });

module.exports = mongoose.model("DashboardAuditLog", dashboardAuditLogSchema);
