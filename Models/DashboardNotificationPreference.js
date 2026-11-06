const mongoose = require("mongoose");

const dashboardNotificationPreferenceSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    categories: {
        configuration: { type: Boolean, default: true },
        security: { type: Boolean, default: true },
        community: { type: Boolean, default: true },
        system: { type: Boolean, default: true }
    }
}, { timestamps: true, versionKey: false });

dashboardNotificationPreferenceSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.models.DashboardNotificationPreference || mongoose.model("DashboardNotificationPreference", dashboardNotificationPreferenceSchema);
