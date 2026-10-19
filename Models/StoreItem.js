const { Schema, model } = require("mongoose");

const storeItemSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    itemId: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 300 },
    emoji: { type: String, default: "🛍️", maxlength: 100 },
    price: { type: Number, required: true, min: 1, max: 99999999999 },
    stock: { type: Number, default: -1, min: -1 },
    maxPerUser: { type: Number, default: 0, min: 0 },
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

storeItemSchema.index({ guildId: 1, itemId: 1 }, { unique: true });
module.exports = model("StoreItem", storeItemSchema);
