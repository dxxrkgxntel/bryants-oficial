const { Schema, model } = require("mongoose");

const achievementSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    achievementId: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    emoji: { type: String, default: "🏆", maxlength: 100 },
    category: { type: String, enum: ["activity", "progression", "economy", "shop"], default: "activity" },
    metric: { type: String, enum: ["messages", "levels", "dailyClaims", "workClaims", "itemsPurchased", "coinsEarned"], required: true },
    goal: { type: Number, required: true, min: 1, max: 1000000000 },
    rewardCoins: { type: Number, default: 0, min: 0, max: 99999999999 },
    announcementChannelId: { type: String, default: null },
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

achievementSchema.index({ guildId: 1, achievementId: 1 }, { unique: true });
achievementSchema.index({ guildId: 1, enabled: 1, metric: 1 });
module.exports = model("Achievement", achievementSchema);
