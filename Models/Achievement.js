const { Schema, model } = require("mongoose");

const achievementSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    achievementId: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    emoji: { type: String, default: "🏆", maxlength: 100 },
    category: { type: String, default: "activity", trim: true, lowercase: true, maxlength: 50 },
    metric: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    comparator: { type: String, enum: ["gte", "gt", "eq", "lte", "lt"], default: "gte" },
    goal: { type: Number, required: true, min: 1, max: 1000000000 },
    points: { type: Number, default: 10, min: 0, max: 1000000 },
    rarity: { type: String, enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"], default: "common" },
    levelGoals: { type: String, default: "", maxlength: 500, trim: true },
    levelPoints: { type: String, default: "", maxlength: 500, trim: true },
    levelRarities: { type: String, default: "", maxlength: 300, trim: true },
    rewardXP: { type: Number, default: 0, min: 0, max: 1000000000 },
    rewardCoins: { type: Number, default: 0, min: 0, max: 99999999999 },
    rewardRoleIds: { type: [String], default: [] },
    rewardRemoveRoleIds: { type: [String], default: [] },
    rewardTitle: { type: String, default: null, maxlength: 100 },
    secret: { type: Boolean, default: false },
    repeatable: { type: Boolean, default: false },
    announce: { type: Boolean, default: true },
    prerequisiteIds: { type: [String], default: [] },
    icon: { type: String, default: "🏆", maxlength: 100 },
    iconType: { type: String, default: "emoji", maxlength: 30 },
    iconUrl: { type: String, default: null, maxlength: 500 },
    symbol: { type: String, default: null, maxlength: 80 },
    badgeFrame: { type: String, default: null, maxlength: 50 },
    color: { type: String, default: null, maxlength: 20 },
    source: { type: String, default: "custom", maxlength: 40 },
    builtinKey: { type: String, default: null, maxlength: 80 },
    announcementChannelId: { type: String, default: null },
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

achievementSchema.index({ guildId: 1, achievementId: 1 }, { unique: true });
achievementSchema.index({ guildId: 1, enabled: 1, metric: 1 });
achievementSchema.index({ guildId: 1, category: 1, rarity: 1 });
module.exports = model("Achievement", achievementSchema);
