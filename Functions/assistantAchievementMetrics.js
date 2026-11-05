function createAssistantAchievementMetricSync({ UsageModel, trackProgress, getGuild, getMember } = {}) {
    if (!UsageModel || typeof UsageModel.aggregate !== "function") {
        throw new TypeError("An assistant usage model with aggregate() is required.");
    }
    if (typeof trackProgress !== "function" || typeof getGuild !== "function" || typeof getMember !== "function") {
        throw new TypeError("Assistant achievement sync callbacks are required.");
    }

    let running = false;
    return async function syncAssistantAchievementMetrics() {
        if (running) return { processed: 0, skipped: 0 };
        running = true;
        let processed = 0;
        let skipped = 0;
        try {
            const totals = await UsageModel.aggregate([
                {
                    $group: {
                        _id: { guildId: "$guildId", userId: "$userId" },
                        ai_conversations: { $sum: { $cond: ["$conversationStarted", 1, 0] } },
                        ai_messages: { $sum: { $add: ["$userMessages", "$assistantMessages"] } },
                        questions_asked: { $sum: "$userMessages" }
                    }
                }
            ]);
            for (const row of totals) {
                const guildId = row?._id?.guildId;
                const userId = row?._id?.userId;
                if (!guildId || !userId) {
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
                    for (const metric of ["ai_conversations", "ai_messages", "questions_asked"]) {
                        const total = Number(row[metric]);
                        if (!Number.isSafeInteger(total) || total < 0) {
                            throw new Error("Invalid assistant metric total: " + metric);
                        }
                        if (total > 0) {
                            await trackProgress(guild, member.user, metric, total, { absolute: true });
                        }
                    }
                    processed += 1;
                } catch (error) {
                    skipped += 1;
                    console.warn("[Achievement Assistant] No se pudo sincronizar", guildId, userId, error.message);
                }
            }
            return { processed, skipped };
        } finally {
            running = false;
        }
    };
}

function startAssistantAchievementMetricSync(client, { intervalMs = 60_000 } = {}) {
    if (!client?.guilds) {
        throw new TypeError("A Discord client is required to sync assistant achievements.");
    }
    const UsageModel = require("../Models/DashboardAssistantUsage");
    const { trackAchievementProgress } = require("./achievementTracker");
    const sync = createAssistantAchievementMetricSync({
        UsageModel,
        trackProgress: trackAchievementProgress,
        getGuild: async guildId => client.guilds.cache.get(guildId) || client.guilds.fetch(guildId),
        getMember: (guild, userId) => guild.members.fetch(userId).catch(() => null)
    });
    const run = () => sync().catch(error => console.error("[Achievement Assistant] Error de sincronización:", error));
    run();
    const timer = setInterval(run, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return () => clearInterval(timer);
}

module.exports = { createAssistantAchievementMetricSync, startAssistantAchievementMetricSync };
