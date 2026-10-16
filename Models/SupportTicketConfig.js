const mongoose = require("mongoose");

const supportTicketConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true },
    panelChannelId: { type: String, default: null },
    categoryId: { type: String, default: null },
    staffRoleId: { type: String, default: null },
    staffUserIds: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.models.SupportTicketConfig || mongoose.model("SupportTicketConfig", supportTicketConfigSchema);
