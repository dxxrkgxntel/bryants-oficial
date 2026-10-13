const mongoose = require("mongoose");

const serverStatsConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    categoryId: {
        type: String,
        required: true
    },
    membersChannelId: {
        type: String,
        required: true
    },
    inviteChannelId: {
        type: String,
        required: true
    },
    inviteLink: {
        type: String,
        required: true
    },
    updatedBy: String
});

module.exports = mongoose.model("ServerStatsConfig", serverStatsConfigSchema);
