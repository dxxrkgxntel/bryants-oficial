const mongoose = require("mongoose");

const socialAlertStateSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    alertId: { type: mongoose.Schema.Types.ObjectId, required: true },
    platform: { type: String, enum: ["Kick", "TikTok"], default: "Kick" },
    channelId: { type: String, required: true },
    lastStreamId: { type: String, default: null },
    lastViewers: { type: Number, default: null },
    lastViewerUpdateAt: { type: Date, default: null },
    messageId: { type: String, default: null },
    webhookId: { type: String, default: null },
    webhookToken: { type: String, default: null },
    webhookChannelId: { type: String, default: null }
}, { timestamps: true });

socialAlertStateSchema.index({ guildId: 1, alertId: 1 }, { unique: true });

module.exports = mongoose.model("SocialAlertState", socialAlertStateSchema);
