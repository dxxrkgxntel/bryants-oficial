const { Schema, model } = require("mongoose");

const moderationWarningSchema = new Schema({
    guildId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    targetId: { type: String, required: true },
    interactionId: { type: String, required: true, unique: true },
    reason: { type: String, default: "No especificada", maxlength: 1000 }
}, { timestamps: true });

moderationWarningSchema.index({ guildId: 1, moderatorId: 1, createdAt: 1 });
moderationWarningSchema.index({ guildId: 1, targetId: 1, createdAt: -1 });

module.exports = model("ModerationWarning", moderationWarningSchema);
