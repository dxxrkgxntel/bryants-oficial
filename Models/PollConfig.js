const mongoose = require("mongoose");

const pollConfigSchema = new mongoose.Schema({
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
    }
});

module.exports = mongoose.model("PollConfig", pollConfigSchema);
