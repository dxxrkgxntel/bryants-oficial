const { Schema, model } = require('mongoose');

const economyConfig = new Schema({
  guildId: String,

  dailyAmount: { type: Number, default: 500 },
  dailyCooldown: { type: Number, default: 86400000 },

  workMin: { type: Number, default: 100 },
  workMax: { type: Number, default: 300 },
  workCooldown: { type: Number, default: 3600000 },

  bankFeeRate: { type: Number, default: 0.1 }, // 10% para probar

  gambleMin: { type: Number, default: 100 },
  gambleMax: { type: Number, default: 500 },

  shopRoles: [
    {
      roleId: String,
      price: Number,
    },
  ],
});

module.exports = model('EconomyConfig', economyConfig);