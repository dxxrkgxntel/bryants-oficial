const { Schema, model } = require('mongoose');

const economyUser = new Schema({
  guildId: {type: String, required: true},
  userId: {type: String, required: true},
  wallet: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  lastWork: { type: Number, default: 0 },
  lastDaily: { type: Number, default: 0 },
  lastGamble: { type: Number, default: 0 },
  gamblesWon: {type: Number, default: 0},
  gamblesLost: {type: Number, default: 0},
  jackpots: {type: Number, default: 0},
  gambleStreak: {type: Number, default: 0},
  biggestWin: {type: Number, default: 0},
  lastBankBonus: {type: Number, default: 0},
  dailyStreak: {type: Number, default: 0},
  lastDailyDate: {type: String, default: null},
  debt: {type: Number, default: 0},
  loanTaken: {type: Boolean, default: false},
  loanDate: {type: Date, default: null},
  bankDonated: {type: Number, default: 0},
  diceWins: {type: Number, default: 0},
  diceLosses: {type: Number, default: 0},
});

economyUser.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = model('EconomyUser', economyUser);