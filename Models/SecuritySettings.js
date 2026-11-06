const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true },
    joinThreshold: { type: Number, min: 3, max: 50, default: 7 },
    joinWindowSeconds: { type: Number, min: 5, max: 120, default: 10 },
    alertCooldownMinutes: { type: Number, min: 1, max: 60, default: 5 },
    alertChannelId: { type: String, default: null },
    notifyDashboard: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.SecuritySettings || mongoose.model("SecuritySettings", schema);
