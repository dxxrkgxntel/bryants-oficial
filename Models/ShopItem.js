const { Schema, model } = require('mongoose');

const shopItemSchema = new Schema({
  guildId: {type: String,required: true},
  roleId: {type: String, required: true},
  price: Number,
});

shopItemSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

module.exports = model('ShopItem', shopItemSchema);