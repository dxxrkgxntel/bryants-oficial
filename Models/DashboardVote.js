const mongoose = require("mongoose");

const dashboardVoteSchema = new mongoose.Schema({
    voteId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    source: { type: String, default: "topgg", trim: true, maxlength: 40 },
    votedAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

dashboardVoteSchema.index({ guildId: 1, userId: 1, votedAt: 1 });

module.exports = mongoose.model("DashboardVote", dashboardVoteSchema);
