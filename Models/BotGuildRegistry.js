const mongoose = require("mongoose");

const botGuildRegistrySchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    icon: { type: String, default: null },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    isPresent: { type: Boolean, default: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model("BotGuildRegistry", botGuildRegistrySchema);
