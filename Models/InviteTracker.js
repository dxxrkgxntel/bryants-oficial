const mongoose = require("mongoose");

const inviteTrackerSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    inviterId: { type: String, required: true },
    invites: { type: Number, default: 0, min: 0 },
    lastInvitedAt: { type: Date, default: null }
}, { timestamps: true });

inviteTrackerSchema.index({ guildId: 1, inviterId: 1 }, { unique: true });

module.exports = mongoose.model("InviteTracker", inviteTrackerSchema);
