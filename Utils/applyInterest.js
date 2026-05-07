const getConfig = require('./getConfig');

module.exports = async (userData, guildId) => {
  const config = await getConfig(guildId);

  const feeRate = config.bankFeeRate ?? config.interestRate;
  if (!feeRate || feeRate <= 0) return;
  if (userData.bank <= 0) return;

  const fee = Math.floor(userData.bank * feeRate);
  if (fee <= 0) return;

  userData.bank -= fee;

  if (userData.bank < 0) userData.bank = 0;
  
};