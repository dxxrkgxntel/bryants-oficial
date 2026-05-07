const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildId: String,
    allowedChannels: [String],
    logChannel: String, // 👈 NUEVO
    thumbnail: String,
    image: String,
});

module.exports = model("ImageConfig", schema);