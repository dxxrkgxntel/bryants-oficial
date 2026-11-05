const EconomyUser = require("../Models/EconomyUser");

async function reserveBlackjackBet({ guildId, userId, amount }) {
    if (!guildId || !userId || !Number.isSafeInteger(amount) || amount <= 0) return null;
    return EconomyUser.findOneAndUpdate(
        { guildId, userId, wallet: { $gte: amount } },
        { $inc: { wallet: -amount } },
        { new: true, runValidators: true }
    );
}

async function releaseBlackjackBet({ guildId, userId, amount }) {
    if (!guildId || !userId || !Number.isSafeInteger(amount) || amount <= 0) return null;
    return EconomyUser.findOneAndUpdate(
        { guildId, userId },
        { $inc: { wallet: amount } },
        { new: true, runValidators: true }
    );
}

async function settleBlackjackBet({ guildId, userId, amount, result }) {
    if (!guildId || !userId || !Number.isSafeInteger(amount) || amount <= 0) return null;
    const refund = result === "win" ? amount * 2 : result === "draw" ? amount : 0;
    if (!refund) return EconomyUser.findOne({ guildId, userId });
    return EconomyUser.findOneAndUpdate(
        { guildId, userId },
        { $inc: { wallet: refund } },
        { new: true, runValidators: true }
    );
}

module.exports = { reserveBlackjackBet, releaseBlackjackBet, settleBlackjackBet };
