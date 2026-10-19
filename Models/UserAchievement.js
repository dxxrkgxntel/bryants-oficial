const { Schema, model } = require("mongoose");

const userAchievementSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    achievementId: { type: String, required: true },
    progress: { type: Number, default: 0, min: 0 },
    unlockedLevels: { type: [Number], default: [] },
    pointsEarned: { type: Number, default: 0, min: 0 },
    unlockedAt: { type: Date, default: null }
}, { timestamps: true });

userAchievementSchema.index({ guildId: 1, userId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ guildId: 1, userId: 1, unlockedAt: 1 });
module.exports = model("UserAchievement", userAchievementSchema);
