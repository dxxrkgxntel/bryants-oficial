const mongoose = require("mongoose");

const weeklyDropSchema = new mongoose.Schema({

    guildId: {
        type: String,
        required: true,
        unique: true
    },

    enabled: {
        type: Boolean,
        default: false
    },

    minAmount: {
        type: Number,
        default: 500
    },

    maxAmount: {
        type: Number,
        default: 5000
    },

    logChannelId: {
        type: String,
        default: null
    },

    lastDrop: {
        type: Date,
        default: null
    },

    nextDrop: {
        type: Date,
        default: null
    }

});

module.exports =
mongoose.model(
    "WeeklyDrop",
    weeklyDropSchema
);