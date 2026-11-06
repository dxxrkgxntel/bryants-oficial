function normalizeExperienceAmount(amount) {
    const value = Number(amount);
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

async function getTotalExperience(ExperienceModel, guildId, userId) {
    const [summary] = await ExperienceModel.aggregate([
        { $match: { guildId, userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    return Math.max(0, Number(summary?.total) || 0);
}

async function recordExperience({ guild, user, amount, category, operationId, syncProgress = true }) {
    const normalizedAmount = normalizeExperienceAmount(amount);
    if (!guild?.id || !user?.id || operationId == null || !String(operationId).trim() || !category || !normalizedAmount) {
        return { recorded: false, totalXp: null };
    }

    const ExperienceModel = require("../Models/ExperienceTransaction");
    let recorded = false;
    try {
        const result = await ExperienceModel.updateOne(
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

    const totalXp = await getTotalExperience(ExperienceModel, guild.id, user.id);
    if (syncProgress) {
        const { trackAchievementProgress } = require("./achievementTracker");
        await trackAchievementProgress(guild, user, "xp", totalXp, { absolute: true });
    }
    return { recorded, totalXp };
}

function createExperienceMetricSync({ ExperienceModel, trackProgress, getGuild, getMember } = {}) {
    if (!ExperienceModel || typeof ExperienceModel.aggregate !== "function") {
        throw new TypeError("An experience model with aggregate() is required.");
    }
    if (typeof trackProgress !== "function" || typeof getGuild !== "function" || typeof getMember !== "function") {
        throw new TypeError("Experience sync callbacks are required.");
    }

    let running = false;
    return async function syncExperienceMetrics() {
        if (running) return { processed: 0, skipped: 0 };
        running = true;
        let processed = 0;
        let skipped = 0;
        try {
            const totals = await ExperienceModel.aggregate([
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
                    await trackProgress(guild, member.user, "xp", total, { absolute: true });
                    processed += 1;
                } catch (error) {
                    skipped += 1;
                    console.warn("[Achievement XP] No se pudo sincronizar", guildId, userId, error.message);
                }
            }
            return { processed, skipped };
        } finally {
            running = false;
        }
    };
}

function startExperienceMetricSync(client, { intervalMs = 60_000 } = {}) {
    if (!client?.guilds) throw new TypeError("A Discord client is required to sync XP achievements.");
    const ExperienceModel = require("../Models/ExperienceTransaction");
    const { trackAchievementProgress } = require("./achievementTracker");
    const sync = createExperienceMetricSync({
        ExperienceModel,
        trackProgress: trackAchievementProgress,
        getGuild: async guildId => client.guilds.cache.get(guildId) || client.guilds.fetch(guildId),
        getMember: (guild, userId) => guild.members.fetch(userId).catch(() => null)
    });
    const run = () => sync().catch(error => console.error("[Achievement XP] Error de sincronización:", error));
    run();
    const timer = setInterval(run, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return () => clearInterval(timer);
}

module.exports = {
    normalizeExperienceAmount,
    getTotalExperience,
    recordExperience,
    createExperienceMetricSync,
    startExperienceMetricSync
};
