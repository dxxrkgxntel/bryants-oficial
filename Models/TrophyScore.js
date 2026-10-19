const { Schema, model } = require("mongoose");

const trophyScoreSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    seasonKey: { type: String, required: true },
    points: { type: Number, default: 0, min: 0 },
    unlocks: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

trophyScoreSchema.index({ guildId: 1, userId: 1, seasonKey: 1 }, { unique: true });
trophyScoreSchema.index({ guildId: 1, seasonKey: 1, points: -1 });
module.exports = model("TrophyScore", trophyScoreSchema);
