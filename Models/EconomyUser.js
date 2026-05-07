const { Schema, model } = require('mongoose');

const economyUser = new Schema({
  guildId: String,
  userId: String,
  wallet: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  lastWork: { type: Number, default: 0 },
  lastDaily: { type: Number, default: 0 },
  lastGamble: { type: Number, default: 0 },
});

module.exports = model('EconomyUser', economyUser);