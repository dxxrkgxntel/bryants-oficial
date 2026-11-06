const mongoose = require("mongoose");

const dashboardNotificationSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    category: { type: String, enum: ["configuration", "security", "community", "system"], default: "system", index: true },
    severity: { type: String, enum: ["info", "success", "warning", "critical"], default: "info" },
    targetUserIds: { type: [String], default: [] },
    readBy: { type: [String], default: [] },
    createdBy: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, default: null }
}, { versionKey: false });

dashboardNotificationSchema.index({ guildId: 1, createdAt: -1 });
dashboardNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } });

module.exports = mongoose.models.DashboardNotification || mongoose.model("DashboardNotification", dashboardNotificationSchema);
