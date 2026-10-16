const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema({
    authorId: { type: String, required: true },
    authorName: { type: String, required: true, maxlength: 100 },
    authorAvatar: { type: String, default: null, maxlength: 500 },
    source: { type: String, enum: ["web", "discord", "system"], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    discordMessageId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const supportTicketSchema = new mongoose.Schema({
    ticketNumber: { type: Number, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    guildId: { type: String, default: null, index: true },
    guildName: { type: String, default: null, maxlength: 100 },
    username: { type: String, required: true, maxlength: 100 },
    userAvatar: { type: String, default: null, maxlength: 500 },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, enum: ["bot", "website"], required: true, index: true },
    status: { type: String, enum: ["open", "closed"], default: "open", index: true },
    source: { type: String, enum: ["web", "discord"], required: true },
    discordGuildId: { type: String, default: null, index: true },
    discordChannelId: { type: String, default: null, index: true },
    messages: { type: [supportMessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    closedAt: { type: Date, default: null }
}, { timestamps: true });

supportTicketSchema.index({ userId: 1, status: 1, updatedAt: -1 });
supportTicketSchema.index({ guildId: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.models.SupportTicket || mongoose.model("SupportTicket", supportTicketSchema);
