const EconomyConfig = require('../Models/EconomyConfig');

module.exports = async (guildId) => {
  let config = await EconomyConfig.findOne({ guildId });
  if (!config) {
    config = await EconomyConfig.create({ guildId });
  }
  return config;
};