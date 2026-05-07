const EconomyUser = require('../Models/EconomyUser');

module.exports = async (guildId, userId) => {
  let user = await EconomyUser.findOne({ guildId, userId });
  if (!user) {
    user = await EconomyUser.create({ guildId, userId });
  }
  return user;
};