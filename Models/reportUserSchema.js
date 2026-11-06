const {model, Schema} = require('mongoose');

const reportSchema = new Schema({
    reportGuildId: { type: String, required: true, index: true },
    reportUserId: { type: String, required: true },
    reportMessageId: { type: String, required: true },
    reporterUserId: { type: String, default: null },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["pending", "reviewing", "resolved", "dismissed"], default: "pending", index: true },
    reviewNote: { type: String, default: "", maxlength: 1000 },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, index: true }
});
reportSchema.index({ reportGuildId: 1, createdAt: -1 });
module.exports = model('reportUser', reportSchema);
