const { Schema, model } = require("mongoose");

const achievementFirstUnlockSchema = new Schema({
    guildId: { type: String, required: true },
    achievementId: { type: String, required: true },
    userId: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now }
}, { timestamps: true });

achievementFirstUnlockSchema.index({ guildId: 1, achievementId: 1 }, { unique: true });
achievementFirstUnlockSchema.index({ guildId: 1, userId: 1 });

module.exports = model("AchievementFirstUnlock", achievementFirstUnlockSchema);
