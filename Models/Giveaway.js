const mongoose = require("mongoose");

const giveawaySchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: null, index: true },
    creatorId: { type: String, required: true, index: true },
    prize: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    winnerCount: { type: Number, required: true, min: 1, max: 20, default: 1 },
    entrants: { type: [String], default: [] },
    entryHistory: { type: [String], default: [] },
    winnerIds: { type: [String], default: [] },
    status: { type: String, enum: ["active", "ending", "ended", "cancelled"], default: "active", index: true },
    endAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, default: null },
    endedBy: { type: String, default: null }
}, { timestamps: true });

giveawaySchema.index({ guildId: 1, status: 1, endAt: 1 });
giveawaySchema.index({ guildId: 1, creatorId: 1, createdAt: -1 });

module.exports = mongoose.models.Giveaway || mongoose.model("Giveaway", giveawaySchema);
