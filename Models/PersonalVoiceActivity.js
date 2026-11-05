const mongoose = require("mongoose");

const personalVoiceActivitySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    channelId: { type: String, default: null },
    voiceStartedAt: { type: Date, default: null },
    streamingStartedAt: { type: Date, default: null },
    videoStartedAt: { type: Date, default: null },
    totalVoiceSeconds: { type: Number, default: 0 },
    voiceMinutesReported: { type: Number, default: 0 },
    totalStreamingSeconds: { type: Number, default: 0 },
    streamingMinutesReported: { type: Number, default: 0 },
    totalVideoSeconds: { type: Number, default: 0 },
    videoMinutesReported: { type: Number, default: 0 }
}, { timestamps: true });

personalVoiceActivitySchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model("PersonalVoiceActivity", personalVoiceActivitySchema);
