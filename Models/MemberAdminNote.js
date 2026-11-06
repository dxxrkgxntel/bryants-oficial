const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    authorId: { type: String, required: true },
    authorUsername: { type: String, default: null, maxlength: 100 },
    content: { type: String, required: true, trim: true, maxlength: 1000 }
}, { timestamps: true, versionKey: false });

schema.index({ guildId: 1, userId: 1, createdAt: -1 });
module.exports = model("MemberAdminNote", schema);
