const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildId: String,
    enabled: { type: Boolean, default: true },
    allowedChannels: [String],
    logChannel: String, // 👈 NUEVO
    thumbnail: String,
    image: String,
});

module.exports = model("ImageConfig", schema);
