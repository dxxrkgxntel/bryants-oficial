const { Schema, model } = require("mongoose");

const levelSchema = new Schema({
    userId: String,
    guildId: String,
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 }
});

module.exports = model("Level", levelSchema);