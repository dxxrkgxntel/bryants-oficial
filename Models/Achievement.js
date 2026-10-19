const { Schema, model } = require("mongoose");

const achievementSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    achievementId: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    emoji: { type: String, default: "🏆", maxlength: 100 },
    category: { type: String, enum: ["activity", "progression", "economy", "shop", "messages", "reactions", "voice", "community"], default: "activity" },
    metric: { type: String, enum: ["messages", "levels", "dailyClaims", "workClaims", "itemsPurchased", "coinsEarned", "attachments", "mentions", "characters", "codeBlocks", "commands", "customEmojis", "embeds", "gifs", "images", "links", "longMessages", "reactionsAdded", "reactionsReceived", "voiceMinutes", "voiceJoins", "threads", "words", "polls", "questions", "answers", "spoilers", "stickers"], required: true },
    goal: { type: Number, required: true, min: 1, max: 1000000000 },
    points: { type: Number, default: 10, min: 0, max: 1000000 },
    rarity: { type: String, enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"], default: "common" },
    levelGoals: { type: String, default: "", maxlength: 500, trim: true },
    levelPoints: { type: String, default: "", maxlength: 500, trim: true },
    levelRarities: { type: String, default: "", maxlength: 300, trim: true },
    rewardXP: { type: Number, default: 0, min: 0, max: 1000000000 },
    rewardCoins: { type: Number, default: 0, min: 0, max: 99999999999 },
    announcementChannelId: { type: String, default: null },
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

achievementSchema.index({ guildId: 1, achievementId: 1 }, { unique: true });
achievementSchema.index({ guildId: 1, enabled: 1, metric: 1 });
module.exports = model("Achievement", achievementSchema);
