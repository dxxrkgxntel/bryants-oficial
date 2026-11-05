function createReferralAchievementMetricSync({ ReferralModel, trackProgress, getGuild, getUser } = {}) {
    if (!ReferralModel || typeof ReferralModel.aggregate !== "function") {
        throw new TypeError("A referral model with aggregate() is required.");
    }
    if (typeof trackProgress !== "function" || typeof getGuild !== "function" || typeof getUser !== "function") {
        throw new TypeError("Referral achievement sync callbacks are required.");
    }

    let running = false;
    return async function syncReferralAchievementMetrics() {
        if (running) return { processed: 0, skipped: 0 };
        running = true;
        let processed = 0;
        let skipped = 0;
        try {
            const totals = await ReferralModel.aggregate([
                { $group: { _id: { guildId: "$guildId", userId: "$referrerId" }, total: { $sum: 1 } } }
            ]);
            for (const row of totals) {
                const guildId = row?._id?.guildId;
                const userId = row?._id?.userId;
                const total = Number(row?.total);
                if (!guildId || !userId || !Number.isSafeInteger(total) || total < 1) {
                    skipped += 1;
                    continue;
                }
                try {
                    const [guild, user] = await Promise.all([getGuild(guildId), getUser(userId)]);
                    if (!guild?.id || !user?.id) {
                        skipped += 1;
                        continue;
                    }
                    await trackProgress(guild, user, "referrals", total, { absolute: true });
                    processed += 1;
                } catch (error) {
                    skipped += 1;
                    console.warn("[Achievement Referrals] No se pudo sincronizar", guildId, userId, error.message);
                }
            }
            return { processed, skipped };
        } finally {
            running = false;
        }
    };
}

function startReferralAchievementMetricSync(client, { intervalMs = 60_000 } = {}) {
    if (!client?.guilds || typeof client.users?.fetch !== "function") {
        throw new TypeError("A Discord client is required to sync referral achievements.");
    }
    const DashboardReferral = require("../Models/DashboardReferral");
    const { trackAchievementProgress } = require("./achievementTracker");
    const sync = createReferralAchievementMetricSync({
        ReferralModel: DashboardReferral,
        trackProgress: trackAchievementProgress,
        getGuild: async guildId => client.guilds.cache.get(guildId) || client.guilds.fetch(guildId),
        getUser: userId => client.users.fetch(userId)
    });
    const run = () => sync().catch(error => console.error("[Achievement Referrals] Error de sincronización:", error));
    run();
    const timer = setInterval(run, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return () => clearInterval(timer);
}

module.exports = { createReferralAchievementMetricSync, startReferralAchievementMetricSync };
