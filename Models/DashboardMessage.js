const { Schema, model } = require("mongoose");

const messageBuilderSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    channelId: { type: String, required: true },
    format: { type: String, enum: ["embed", "components_v2"], required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    messageId: { type: String, default: null },
    createdBy: { type: String, default: null }
}, { timestamps: true });

messageBuilderSchema.index({ guildId: 1, updatedAt: -1 });
module.exports = model("DashboardMessage", messageBuilderSchema);
