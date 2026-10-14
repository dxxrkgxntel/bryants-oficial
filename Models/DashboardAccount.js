const mongoose = require("mongoose");

const dashboardAccountSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    bio: { type: String, default: "", maxlength: 2000 },
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referralCount: { type: Number, default: 0 },
    voteCount: { type: Number, default: 0 },
    lastVoteAt: { type: Date, default: null },
    backgroundImage: { type: Buffer, default: null, select: false },
    backgroundMimeType: { type: String, default: null, select: false },
    backgroundBlur: { type: Number, default: 0, min: 0, max: 20 },
    links: {
        type: [{ label: { type: String, trim: true, maxlength: 40 }, url: { type: String, trim: true, maxlength: 300 } }],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model("DashboardAccount", dashboardAccountSchema);
