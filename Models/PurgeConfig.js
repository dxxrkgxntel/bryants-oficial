const mongoose = require("mongoose");

const purgeConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    channelId: {
        type: String,
        required: true
    },
    configuredAt: {
        type: Date,
        default: Date.now
    },
    lastPurgeDate: {
        type: String,
        default: null
    },
    lastPurgeAt: {
        type: Date,
        default: null
    },
    confirmationChannelId: {
        type: String,
        default: null
    },
    confirmationMessageId: {
        type: String,
        default: null
    },
    confirmationDeleteAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model("PurgeConfig", purgeConfigSchema);
