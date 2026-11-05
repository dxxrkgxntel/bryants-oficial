const { Schema, model } = require("mongoose");
const schema = new Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  enabled: { type: Boolean, default: false },
  currentNumber: { type: Number, default: 0, min: 0 },
  highestNumber: { type: Number, default: 0, min: 0 },
  currentStreak: { type: Number, default: 0, min: 0 },
  lastUserId: { type: String, default: null }
}, { timestamps: true });
module.exports = model("CountingConfig", schema);
