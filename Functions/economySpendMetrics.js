function normalizeSpendAmount(amount) {
    const value = Number(amount);
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

async function recordEconomySpend({ guild, user, amount, category, operationId }) {
    const normalizedAmount = normalizeSpendAmount(amount);
    if (!guild?.id || !user?.id || operationId == null || !String(operationId).trim() || !category || !normalizedAmount) {
        return { recorded: false, totalSpent: null };
    }

    const EconomyTransaction = require("../Models/EconomyTransaction");
    const normalizedOperationId = String(operationId);
    let recorded = false;

    try {
        const result = await EconomyTransaction.updateOne(
            { guildId: guild.id, userId: user.id, operationId: normalizedOperationId },
            {
                $setOnInsert: {
                    guildId: guild.id,
                    userId: user.id,
                    operationId: normalizedOperationId,
                    category: String(category),
                    amount: normalizedAmount
                }
            },
            { upsert: true }
        );
        recorded = Number(result?.upsertedCount || 0) > 0;
    } catch (error) {
        // A duplicate key means this exact operation was already persisted.
        if (error?.code !== 11000) throw error;
    }

    // Recalculate from the ledger on every call, including retries. This lets a
    // retry repair achievement progress if the ledger write succeeded but the
    // tracker failed during the previous attempt.
    const [summary] = await EconomyTransaction.aggregate([
        { $match: { guildId: guild.id, userId: user.id } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalSpent = Math.max(0, Number(summary?.total) || 0);

    const { trackAchievementProgress } = require("./achievementTracker");
    await trackAchievementProgress(guild, user, "total_spent", totalSpent, { absolute: true });
    return { recorded, totalSpent };
}

module.exports = { normalizeSpendAmount, recordEconomySpend };
