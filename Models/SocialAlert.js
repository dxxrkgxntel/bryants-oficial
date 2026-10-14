const mongoose = require("mongoose");

const socialAlertSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    platform: { type: String, enum: ["Kick", "TikTok", "Twitch"], required: true, default: "Kick" },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    channelId: { type: String, required: true },
    includeViewerCount: { type: Boolean, default: false },
    title: { type: String, required: true, maxlength: 256 },
    messageTemplate: { type: String, required: true, maxlength: 2000 },
    image: { type: String, default: null, maxlength: 2048 },
    color: { type: String, default: null, maxlength: 7 },
    displayName: { type: String, default: null, maxlength: 80 },
    avatarUrl: { type: String, default: null, maxlength: 2048 },
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

socialAlertSchema.index({ guildId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model("SocialAlert", socialAlertSchema);
