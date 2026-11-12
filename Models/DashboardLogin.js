const mongoose = require("mongoose");

const dashboardLoginSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String, default: "", maxlength: 100 },
    globalName: { type: String, default: "", maxlength: 100 },
    avatar: { type: String, default: null },
    firstLoginAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now, index: true },
    loginCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model("DashboardLogin", dashboardLoginSchema);
