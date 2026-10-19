const mongoose = require("mongoose");

const personalStatsDailySchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    day: { type: String, required: true, index: true },
    messages: { type: Number, default: 0 },
    voiceSeconds: { type: Number, default: 0 },
    reactionsGiven: { type: Number, default: 0 },
    reactionsReceived: { type: Number, default: 0 },
    activitySeconds: { type: Map, of: Number, default: () => ({}) },
    gamingSeconds: { type: Map, of: Number, default: () => ({}) },
    channelMessages: { type: Map, of: Number, default: () => ({}) }
}, { timestamps: true });

personalStatsDailySchema.index({ userId: 1, guildId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model("PersonalStatsDaily", personalStatsDailySchema);
