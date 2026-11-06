const { Schema, model } = require("mongoose");

const communityPanelSchema = new Schema({
    guildId: { type: String, required: true },
    panelId: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    kind: { type: String, enum: ["self_roles", "verification"], required: true },
    enabled: { type: Boolean, default: true },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    messageType: { type: String, enum: ["text", "embed", "components_v2"], default: "embed" },
    content: { type: String, default: "", maxlength: 2000 },
    title: { type: String, default: "", maxlength: 256 },
    description: { type: String, default: "", maxlength: 4000 },
    color: { type: String, default: "#8A2BE2", maxlength: 7 },
    imageUrl: { type: String, default: null, maxlength: 500 },
    thumbnailUrl: { type: String, default: null, maxlength: 500 },
    controlType: { type: String, enum: ["buttons", "select"], default: "buttons" },
    roles: {
        type: [{
            roleId: { type: String, required: true },
            label: { type: String, required: true, maxlength: 80 },
            description: { type: String, default: "", maxlength: 100 },
            emoji: { type: String, default: "", maxlength: 100 }
        }],
        default: []
    },
    maxValues: { type: Number, default: 1, min: 1, max: 25 },
    selectPlaceholder: { type: String, default: "Selecciona tus roles", maxlength: 150 },
    verifyLabel: { type: String, default: "Verificarme", maxlength: 80 },
    verifyEmoji: { type: String, default: "", maxlength: 100 },
    verificationRoleId: { type: String, default: null },
    removeRoleIds: { type: [String], default: [] }
}, { timestamps: true });

communityPanelSchema.index({ guildId: 1, panelId: 1 }, { unique: true });
communityPanelSchema.index({ guildId: 1, kind: 1, enabled: 1 });
module.exports = model("CommunityPanel", communityPanelSchema);
