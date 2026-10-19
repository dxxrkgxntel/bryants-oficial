const { Schema, model } = require("mongoose");

const trophySettingsSchema = new Schema({
    guildId: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true },
    announcementMode: { type: String, enum: ["card", "components", "embed", "text", "dm", "silent"], default: "embed" },
    announcementChannelId: { type: String, default: null },
    announcementTemplate: { type: String, default: "{user} desbloqueó {achievement} (+{points} puntos)", maxlength: 1500 },
    cardTitle: { type: String, default: "TROFEO DESBLOQUEADO", maxlength: 100 },
    cardColor: { type: String, default: "#0000FF", match: /^#[0-9a-fA-F]{6}$/ },
    cardBackgroundUrl: { type: String, default: null, maxlength: 500 },
    pointsMultiplier: { type: Number, default: 1, min: 0, max: 100 },
    minimumAccountAgeDays: { type: Number, default: 0, min: 0, max: 3650 },
    includeBots: { type: Boolean, default: false },
    leaderboardEnabled: { type: Boolean, default: true },
    seasonEnabled: { type: Boolean, default: true },
    seasonKey: { type: String, default: "" },
    firstPlaceRoleId: { type: String, default: null },
    secondPlaceRoleId: { type: String, default: null },
    thirdPlaceRoleId: { type: String, default: null },
    publicProfiles: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = model("TrophySettings", trophySettingsSchema);
