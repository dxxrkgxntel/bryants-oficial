const mongoose = require("mongoose");
const schema = new mongoose.Schema({
 guildId: { type: String, required: true, index: true },
 formId: { type: String, required: true, index: true },
 formTitle: { type: String, required: true, maxlength: 100 },
 userId: { type: String, required: true, index: true },
 username: { type: String, default: "Usuario", maxlength: 100 },
 answers: [{
  questionId: { type: String, required: true },
  question: { type: String, required: true, maxlength: 45 },
  answer: { type: String, required: true, maxlength: 4000 }
 }],
 discordChannelId: { type: String, default: null },
 discordMessageId: { type: String, default: null }
}, { timestamps: true, versionKey: false });
schema.index({ guildId: 1, formId: 1, createdAt: -1 });
module.exports = mongoose.models.CustomFormResponse || mongoose.model("CustomFormResponse", schema);
