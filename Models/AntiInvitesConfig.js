const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    logChannelId: { type: String, default: null },
    ruleId: { type: String, default: null }
}, { timestamps: true });

module.exports = model("AntiInvitesConfig", schema);
