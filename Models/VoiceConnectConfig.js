const mongoose = require("mongoose");

const voiceConnectConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    channelId: {
        type: String,
        default: null
    },
    enabled: {
        type: Boolean,
        default: undefined
    },
    updatedBy: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model("VoiceConnectConfig", voiceConnectConfigSchema);
