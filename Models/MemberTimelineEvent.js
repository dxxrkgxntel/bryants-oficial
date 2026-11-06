const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["joined", "left", "kick", "ban", "warn", "timeout_added", "timeout_removed"], required: true },
    actorId: { type: String, default: null },
    reason: { type: String, default: null, maxlength: 1000 },
    metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true, versionKey: false });

schema.index({ guildId: 1, userId: 1, createdAt: -1 });
schema.index({ guildId: 1, type: 1, createdAt: -1 });
module.exports = model("MemberTimelineEvent", schema);
