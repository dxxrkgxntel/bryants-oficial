const mongoose = require("mongoose");
const questionSchema = new mongoose.Schema({
 questionId: { type: String, required: true, maxlength: 40 },
 label: { type: String, required: true, trim: true, maxlength: 45 },
 style: { type: String, enum: ["short", "paragraph"], default: "short" },
 required: { type: Boolean, default: true },
 placeholder: { type: String, default: "", maxlength: 100 }
}, { _id: false });
const schema = new mongoose.Schema({
 guildId: { type: String, required: true, index: true },
 formId: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
 title: { type: String, required: true, trim: true, maxlength: 100 },
 description: { type: String, default: "", maxlength: 1000 },
 channelId: { type: String, required: true },
 responseChannelId: { type: String, required: true },
 buttonLabel: { type: String, default: "Abrir formulario", maxlength: 80 },
 questions: { type: [questionSchema], default: [] },
 enabled: { type: Boolean, default: true },
 publishedMessageId: { type: String, default: null },
 publishedAt: { type: Date, default: null },
 createdBy: { type: String, default: null }
}, { timestamps: true, versionKey: false });
schema.index({ guildId: 1, formId: 1 }, { unique: true });
module.exports = mongoose.models.CustomForm || mongoose.model("CustomForm", schema);
