const mongoose = require("mongoose");

const schema =
    new mongoose.Schema({

        guildId: String,
        channelId: String,
        ownerId: String,
        panelMessageId: String,
        name: String,
        limit: Number,
        bitrate: Number,
        region: String,
        locked: Boolean,
        hidden: Boolean,
        waitingRoom: Boolean,
        textChannelId: String,
        panelChannelId: String,
        waitingRoomChannelId: String,
        threadId: String,
        chatClosed: Boolean,
        trustedUserIds: [String]

    });

module.exports = mongoose.model("TempVoiceChannels",schema);
