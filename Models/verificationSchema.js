const { Schema, model } = require("mongoose");

const verifySchema = new Schema({

    guildId: String,

    channelId: String,

    messageId: String,

    roleId: String,

    removeRoleId: String,

    thumbnail: String,

    image: String,

    footer: String
});

module.exports =
    model(
        "verify",
        verifySchema
    );