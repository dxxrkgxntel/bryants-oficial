const { Schema, model } = require("mongoose");

const boostAchievementStatsSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    bestMonths: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

boostAchievementStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = model("BoostAchievementStats", boostAchievementStatsSchema);
