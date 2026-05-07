const { Schema, model } = require('mongoose');

const shopItemSchema = new Schema({
  guildId: String,
  roleId: String,
  price: Number,
});

module.exports = model('ShopItem', shopItemSchema);