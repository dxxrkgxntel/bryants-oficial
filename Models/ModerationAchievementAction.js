const { Schema, model } = require("mongoose");

const moderationAchievementActionSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    interactionId: { type: String, required: true, unique: true },
    action: { type: String, enum: ["ban", "unban", "kick", "mute", "unmute", "purge"], required: true },
    targetId: { type: String, default: null }
}, { timestamps: true });

moderationAchievementActionSchema.index({ guildId: 1, userId: 1, createdAt: 1 });

module.exports = model("ModerationAchievementAction", moderationAchievementActionSchema);
