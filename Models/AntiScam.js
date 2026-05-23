const mongoose = require("mongoose");

const antiScamSchema = new mongoose.Schema({

    guildId: {
        type: String,
        required: true,
        unique: true
    },

    enabled: {
        type: Boolean,
        default: true
    },

    punishment: {
        type: String,
        enum: ["delete", "timeout", "kick", "ban"],
        default: "timeout"
    },

    timeoutDuration: {
        type: Number,
        default: 60 // minutos
    },

    logChannelId: {
        type: String,
        default: null
    },

    whitelistDomains: {
        type: [String],
        default: []
    },

    ignoredChannels: {
        type: [String],
        default: []
    },

    ignoredRoles: {
        type: [String],
        default: []
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "AntiScam",
    antiScamSchema
);