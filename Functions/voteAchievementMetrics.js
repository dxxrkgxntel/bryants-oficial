function createVoteAchievementMetricSync({ VoteModel, trackProgress, getGuild, getMember } = {}) {
    if (!VoteModel || typeof VoteModel.aggregate !== "function") {
        throw new TypeError("A vote model with aggregate() is required.");
    }
    if (typeof trackProgress !== "function" || typeof getGuild !== "function" || typeof getMember !== "function") {
        throw new TypeError("Vote achievement sync callbacks are required.");
    }

    let running = false;
    return async function syncVoteAchievementMetrics() {
        if (running) return { processed: 0, skipped: 0 };
        running = true;
        let processed = 0;
        let skipped = 0;
        try {
            const totals = await VoteModel.aggregate([
                { $group: { _id: { guildId: "$guildId", userId: "$userId" }, total: { $sum: 1 } } }
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
                    await trackProgress(guild, member.user, "votes", total, { absolute: true });
                    processed += 1;
                } catch (error) {
                    skipped += 1;
                    console.warn("[Achievement Votes] No se pudo sincronizar", guildId, userId, error.message);
                }
            }
            return { processed, skipped };
        } finally {
            running = false;
        }
    };
}

function startVoteAchievementMetricSync(client, { intervalMs = 60_000 } = {}) {
    if (!client?.guilds) {
        throw new TypeError("A Discord client is required to sync vote achievements.");
    }
    const DashboardVote = require("../Models/DashboardVote");
    const { trackAchievementProgress } = require("./achievementTracker");
    const sync = createVoteAchievementMetricSync({
        VoteModel: DashboardVote,
        trackProgress: trackAchievementProgress,
        getGuild: async guildId => client.guilds.cache.get(guildId) || client.guilds.fetch(guildId),
        getMember: (guild, userId) => guild.members.fetch(userId).catch(() => null)
    });
    const run = () => sync().catch(error => console.error("[Achievement Votes] Error de sincronización:", error));
    run();
    const timer = setInterval(run, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return () => clearInterval(timer);
}

module.exports = { createVoteAchievementMetricSync, startVoteAchievementMetricSync };
