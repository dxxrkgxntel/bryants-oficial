const mongoose = require("mongoose");
const dashboardAutomationSchema = new mongoose.Schema({
 guildId: { type: String, required: true, index: true },
 name: { type: String, required: true, trim: true, maxlength: 80 },
 scheduleType: { type: String, enum: ["once", "interval"], default: "once" },
 runAt: { type: Date, default: null },
 intervalMinutes: { type: Number, default: null, min: 5, max: 525600 },
 nextRunAt: { type: Date, required: true, index: true },
 channelId: { type: String, required: true },
 message: { type: String, required: true, maxlength: 2000 },
 enabled: { type: Boolean, default: true, index: true },
 completedAt: { type: Date, default: null },
 lastRunAt: { type: Date, default: null },
 lastError: { type: String, default: null, maxlength: 500 },
 lockedUntil: { type: Date, default: null },
 createdBy: { type: String, default: null }
}, { timestamps: true, versionKey: false });
dashboardAutomationSchema.index({ guildId: 1, nextRunAt: 1, enabled: 1 });
module.exports = mongoose.models.DashboardAutomation || mongoose.model("DashboardAutomation", dashboardAutomationSchema);
