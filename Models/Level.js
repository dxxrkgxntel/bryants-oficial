const { Schema, model } = require("mongoose");

const levelSchema = new Schema({
    userId: String,
    guildId: String,
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    prestige: { type: Number, default: 0 },
});

levelSchema.index({ guildId: 1, level: -1, xp: -1, prestige: -1 });
levelSchema.index({ guildId: 1, userId: 1 });

module.exports = model("Level", levelSchema);