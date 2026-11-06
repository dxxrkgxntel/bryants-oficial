function normalizeEarningAmount(amount) {
    const value = Number(amount);
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

async function getTotalEarned(EarningModel, guildId, userId) {
    const [summary] = await EarningModel.aggregate([
        { $match: { guildId, userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    return Math.max(0, Number(summary?.total) || 0);
}

async function recordEconomyEarning({ guild, user, amount, category, operationId }) {
    const normalizedAmount = normalizeEarningAmount(amount);
    if (!guild?.id || !user?.id || operationId == null || !String(operationId).trim() || !category || !normalizedAmount) {
        return { recorded: false, totalEarned: null };
    }

    const EarningModel = require("../Models/EconomyEarningTransaction");
    let recorded = false;
    try {
        const result = await EarningModel.updateOne(
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
        recorded = Number(result?.upsertedCount || 0) > 0;
    } catch (error) {
        if (error?.code !== 11000) throw error;
    }

    const totalEarned = await getTotalEarned(EarningModel, guild.id, user.id);
    const { trackAchievementProgress } = require("./achievementTracker");
    await trackAchievementProgress(guild, user, "total_earned", totalEarned, { absolute: true });
    return { recorded, totalEarned };
}

function createTotalEarnedMetricSync({ EarningModel, trackProgress, getGuild, getMember } = {}) {
    if (!EarningModel || typeof EarningModel.aggregate !== "function") {
        throw new TypeError("An earning model with aggregate() is required.");
    }
    if (typeof trackProgress !== "function" || typeof getGuild !== "function" || typeof getMember !== "function") {
        throw new TypeError("Total-earned sync callbacks are required.");
    }

    let running = false;
    return async function syncTotalEarnedMetrics() {
        if (running) return { processed: 0, skipped: 0 };
        running = true;
        let processed = 0;
        let skipped = 0;
        try {
            const totals = await EarningModel.aggregate([
                { $group: { _id: { guildId: "$guildId", userId: "$userId" }, total: { $sum: "$amount" } } }
            ]);
            for (const row of totals) {
                const guildId = row?._id?.guildId;
                const userId = row?._id?.userId;
                const total = Number(row?.total);
                if (!guildId || !userId || !Number.isFinite(total) || total <= 0) {
                    skipped += 1;
                    continue;
                }
                try {
                    const guild = await getGuild(guildId);
                    if (!guild?.id) {
                        skipped += 1;
                        continue;
                    }
                    const member = await getMember(guild, userId);
                    if (!member?.user?.id) {
                        skipped += 1;
                        continue;
                    }
                    await trackProgress(guild, member.user, "total_earned", total, { absolute: true });
                    processed += 1;
                } catch (error) {
                    skipped += 1;
                    console.warn("[Achievement Total Earned] No se pudo sincronizar", guildId, userId, error.message);
                }
            }
            return { processed, skipped };
        } finally {
            running = false;
        }
    };
}

function startTotalEarnedMetricSync(client, { intervalMs = 60_000 } = {}) {
    if (!client?.guilds) throw new TypeError("A Discord client is required to sync total_earned.");
    const EarningModel = require("../Models/EconomyEarningTransaction");
    const { trackAchievementProgress } = require("./achievementTracker");
    const sync = createTotalEarnedMetricSync({
        EarningModel,
        trackProgress: trackAchievementProgress,
        getGuild: async guildId => client.guilds.cache.get(guildId) || client.guilds.fetch(guildId),
        getMember: (guild, userId) => guild.members.fetch(userId).catch(() => null)
    });
    const run = () => sync().catch(error => console.error("[Achievement Total Earned] Error de sincronización:", error));
    run();
    const timer = setInterval(run, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return () => clearInterval(timer);
}

module.exports = {
    normalizeEarningAmount,
    getTotalEarned,
    recordEconomyEarning,
    createTotalEarnedMetricSync,
    startTotalEarnedMetricSync
};
