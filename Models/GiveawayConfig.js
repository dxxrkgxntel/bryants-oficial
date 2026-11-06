const mongoose = require("mongoose");

const giveawayConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true },
    configuredAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.GiveawayConfig || mongoose.model("GiveawayConfig", giveawayConfigSchema);
