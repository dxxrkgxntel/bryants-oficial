const { Schema, model } = require("mongoose");

const experienceTransactionSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    operationId: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    createdAt: { type: Date, default: Date.now, immutable: true }
}, { versionKey: false });

experienceTransactionSchema.index(
    { guildId: 1, userId: 1, operationId: 1 },
    { unique: true, name: "unique_experience_operation" }
);
experienceTransactionSchema.index({ guildId: 1, userId: 1, createdAt: 1 });

module.exports = model("ExperienceTransaction", experienceTransactionSchema);
