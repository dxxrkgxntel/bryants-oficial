const mongoose = require("mongoose");

const dashboardReferralSchema = new mongoose.Schema({
    referrerId: { type: String, required: true, index: true },
    inviteeId: { type: String, required: true, unique: true, index: true },
    guildId: { type: String, required: true },
    reward: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("DashboardReferral", dashboardReferralSchema);
