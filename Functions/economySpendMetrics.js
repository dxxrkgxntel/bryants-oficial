const EconomyTransaction = require("../Models/EconomyTransaction");

function normalizeSpendAmount(amount) {
    const value = Number(amount);
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

async function recordEconomySpend({ guild, user, amount, category, operationId }) {
    const normalizedAmount = normalizeSpendAmount(amount);
    if (!guild?.id || !user?.id || !operationId || !category || !normalizedAmount) {
        return { recorded: false, totalSpent: null };
    }

    try {
        await EconomyTransaction.updateOne(
            { guildId: guild.id, userId: user.id, operationId: String(operationId) },
            {
                $setOnInsert: {
                    guildId: guild.id,
                    userId: user.id,
                    operationId: String(operationId),
                    category: String(category),
                    amount: normalizedAmount
                }
            },
            { upsert: true }
        );
    } catch (error) {
        // A duplicate key means this exact operation was already persisted.
        if (error?.code !== 11000) throw error;
    }

    const [summary] = await EconomyTransaction.aggregate([
        { $match: { guildId: guild.id, userId: user.id } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalSpent = Math.max(0, Number(summary?.total) || 0);

    const { trackAchievementProgress } = require("./achievementTracker");
    await trackAchievementProgress(guild, user, "total_spent", totalSpent, { absolute: true });
    return { recorded: true, totalSpent };
}

module.exports = { normalizeSpendAmount, recordEconomySpend };
