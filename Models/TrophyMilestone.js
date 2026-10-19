const { Schema, model } = require("mongoose");

const trophyMilestoneSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    milestoneId: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 300 },
    pointsRequired: { type: Number, required: true, min: 1, max: 1000000000 },
    roleId: { type: String, default: null },
    rewardCoins: { type: Number, default: 0, min: 0, max: 99999999999 },
    rewardXP: { type: Number, default: 0, min: 0, max: 1000000000 },
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

trophyMilestoneSchema.index({ guildId: 1, milestoneId: 1 }, { unique: true });
trophyMilestoneSchema.index({ guildId: 1, enabled: 1, pointsRequired: 1 });
module.exports = model("TrophyMilestone", trophyMilestoneSchema);
