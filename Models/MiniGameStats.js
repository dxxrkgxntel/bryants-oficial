const { Schema, model } = require("mongoose");

const miniGameStatsSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    totalGames: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    totalGuesses: { type: Number, default: 0 },
    perfectGames: { type: Number, default: 0 }
}, { timestamps: true });

miniGameStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model("MiniGameStats", miniGameStatsSchema);
