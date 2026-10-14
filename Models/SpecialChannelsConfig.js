const { Schema, model } = require("mongoose");

const channelRuleSchema = new Schema({
    channelId: { type: String, required: true },
    text: { type: Boolean, default: true },
    images: { type: Boolean, default: false },
    videos: { type: Boolean, default: false },
    files: { type: Boolean, default: false },
    stickers: { type: Boolean, default: false },
    links: { type: Boolean, default: false },
    commands: { type: Boolean, default: false },
    immuneRoles: { type: [String], default: [] },
    logChannelId: { type: String, default: null }
}, { _id: false });

const schema = new Schema({
    guildId: { type: String, required: true, unique: true },
    channels: { type: [channelRuleSchema], default: [] }
});

module.exports = model("SpecialChannelsConfig", schema);
