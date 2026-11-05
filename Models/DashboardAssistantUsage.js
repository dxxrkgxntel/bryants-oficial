const mongoose = require("mongoose");

const dashboardAssistantUsageSchema = new mongoose.Schema({
    requestId: { type: String, required: true, unique: true, index: true },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    conversationStarted: { type: Boolean, default: false, required: true },
    userMessages: { type: Number, default: 1, min: 1, required: true },
    assistantMessages: { type: Number, default: 1, min: 1, required: true },
    createdAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

dashboardAssistantUsageSchema.index({ guildId: 1, userId: 1, createdAt: 1 });

module.exports = mongoose.model("DashboardAssistantUsage", dashboardAssistantUsageSchema);
