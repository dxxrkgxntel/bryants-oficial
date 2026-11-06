const mongoose = require("mongoose");

const permissionRuleSchema = new mongoose.Schema({
    roleId: { type: String, required: true },
    modules: { type: [String], default: [] },
    actions: { type: [String], default: ["view"] }
}, { _id: false });

const userPermissionRuleSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    modules: { type: [String], default: [] },
    actions: { type: [String], default: ["view"] }
}, { _id: false });

const dashboardGuildPermissionSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true, index: true },
    roleRules: { type: [permissionRuleSchema], default: [] },
    userRules: { type: [userPermissionRuleSchema], default: [] },
    updatedBy: { type: String, default: null }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.DashboardGuildPermission || mongoose.model("DashboardGuildPermission", dashboardGuildPermissionSchema);
