const mongoose = require("mongoose");
const schema = new mongoose.Schema({ userId: { type: String, required: true }, guildId: { type: String, required: true }, daysActive: { type: Number, default: 0 }, currentStreak: { type: Number, default: 0 }, bestStreak: { type: Number, default: 0 }, daysActiveReported: { type: Number, default: 0 }, bestStreakReported: { type: Number, default: 0 }, daysActiveProgressDelta: { type: Number, default: 0 }, bestStreakProgressDelta: { type: Number, default: 0 }, lastActiveDay: { type: String, default: null } }, { timestamps: true });
schema.index({ userId: 1, guildId: 1 }, { unique: true });
module.exports = mongoose.model("PersonalActivity", schema);
