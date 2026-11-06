const { Schema, model } = require("mongoose");

const selfRoleSelectionSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    roleIds: { type: [String], default: [] }
}, { timestamps: true });

selfRoleSelectionSchema.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = model("SelfRoleSelection", selfRoleSelectionSchema);
