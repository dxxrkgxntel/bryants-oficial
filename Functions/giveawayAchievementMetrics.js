function createGiveawayAchievementMetricSync({ GiveawayModel, trackProgress, getGuild, getMember } = {}) {
    if (!GiveawayModel || typeof GiveawayModel.aggregate !== "function" || typeof trackProgress !== "function" || typeof getGuild !== "function" || typeof getMember !== "function") {
        throw new TypeError("Giveaway achievement sync dependencies are required.");
    }
    let running = false;
    return async function syncGiveawayAchievementMetrics() {
        if (running) return { processed: 0, skipped: 0 };
        running = true;
        let processed = 0;
        let skipped = 0;
        try {
            const sources = [
                ["giveaways_created", [{ $group: { _id: { guildId: "$guildId", userId: "$creatorId" }, total: { $sum: 1 } } }]],
                ["giveaways_entered", [{ $unwind: "$entryHistory" }, { $group: { _id: { guildId: "$guildId", userId: "$entryHistory" }, total: { $sum: 1 } } }]],
                ["giveaways_won", [{ $unwind: "$winnerIds" }, { $group: { _id: { guildId: "$guildId", userId: "$winnerIds" }, total: { $sum: 1 } } }]]
            ];
            for (const [metric, pipeline] of sources) {
                const totals = await GiveawayModel.aggregate(pipeline);
                for (const row of totals) {
                    const guildId = row?._id?.guildId;
                    const userId = row?._id?.userId;
                    const total = Number(row?.total);
                    if (!guildId || !userId || !Number.isSafeInteger(total) || total < 1) { skipped += 1; continue; }
                    try {
                        const guild = await getGuild(guildId);
                        if (!guild?.id) { skipped += 1; continue; }
                        const member = await getMember(guild, userId);
                        if (!member?.user?.id) { skipped += 1; continue; }
                        await trackProgress(guild, member.user, metric, total, { absolute: true });
                        processed += 1;
                    } catch (error) {
                        skipped += 1;
                        console.warn("[Achievement Giveaways] No se pudo sincronizar", metric, guildId, userId, error.message);
                    }
                }
            }
            return { processed, skipped };
        } finally { running = false; }
    };
}

function startGiveawayAchievementMetricSync(client, { intervalMs = 60_000 } = {}) {
    if (!client?.guilds) throw new TypeError("A Discord client is required.");
    const GiveawayModel = require("../Models/Giveaway");
    const { trackAchievementProgress } = require("./achievementTracker");
    const sync = createGiveawayAchievementMetricSync({
        GiveawayModel,
        trackProgress: trackAchievementProgress,
        getGuild: async guildId => client.guilds.cache.get(guildId) || client.guilds.fetch(guildId),
        getMember: (guild, userId) => guild.members.fetch(userId).catch(() => null)
    });
    const run = () => sync().catch(error => console.error("[Achievement Giveaways] Error de sincronización:", error));
    run();
    const timer = setInterval(run, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return () => clearInterval(timer);
}

module.exports = { createGiveawayAchievementMetricSync, startGiveawayAchievementMetricSync };
