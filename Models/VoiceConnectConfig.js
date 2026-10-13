const mongoose = require("mongoose");

const voiceConnectConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    channelId: {
        type: String,
        required: true
    },
    updatedBy: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model("VoiceConnectConfig", voiceConnectConfigSchema);
