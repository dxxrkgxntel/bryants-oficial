const { Schema, model } = require("mongoose");

const verifiedMemberSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    verifiedAt: { type: Date, default: Date.now },
    verificationConfigId: { type: String, default: null }
}, { timestamps: true });

verifiedMemberSchema.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = model("VerifiedMember", verifiedMemberSchema);
