const { Schema, model } = require("mongoose");

const verificationRequestSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    panelId: { type: String, required: true, lowercase: true },
    userId: { type: String, required: true },
    method: { type: String, enum: ["captcha", "question", "manual_approval"], required: true },
    status: { type: String, enum: ["challenge", "pending", "approved", "rejected", "expired"], default: "challenge" },
    answerHash: { type: String, default: null, select: false },
    reviewChannelId: { type: String, default: null },
    reviewMessageId: { type: String, default: null },
    reviewerId: { type: String, default: null },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

verificationRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationRequestSchema.index({ guildId: 1, panelId: 1, userId: 1, method: 1, status: 1 });
module.exports = model("VerificationRequest", verificationRequestSchema);
