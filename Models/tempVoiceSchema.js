const mongoose = require("mongoose");

const tempVoiceSchema = new mongoose.Schema({

    guildId: {
        type: String,
        required: true,
        unique: true
    },

    enabled: {
        type: Boolean,
        default: true
    },

    creatorChannelId: {
        type: String,
        default: null
    },

    categoryId: {
        type: String,
        default: null
    },

    panelChannelId: {
        type: String,
        default: null
    },

    panelMessageId: {
        type: String,
        default: null
    },

    setups: [{
        categoryId: { type: String, required: true },
        creatorChannelId: { type: String, required: true },
        panelChannelId: { type: String, required: true },
        panelMessageId: { type: String, default: null }
    }]

});

module.exports = mongoose.model(
    "TempVoice",
    tempVoiceSchema
);
