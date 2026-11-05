function createWarningAchievementMetricTracker({ createWarning, countWarnings, trackProgress }) {
    if (typeof createWarning !== "function" || typeof countWarnings !== "function" || typeof trackProgress !== "function") {
        throw new TypeError("Warning achievement tracker dependencies are required.");
    }

    return async function recordWarningAchievement(interaction, targetUser, reason = "No especificada") {
        const guild = interaction?.guild;
        const moderator = interaction?.user;
        const interactionId = interaction?.id;
        if (!guild?.id || !moderator?.id || moderator.bot || !targetUser?.id ||
            targetUser.bot || typeof interactionId !== "string" || !interactionId) {
            return false;
        }

        try {
            try {
                await createWarning({
                    guildId: guild.id,
                    moderatorId: moderator.id,
                    targetId: targetUser.id,
                    interactionId,
                    reason: String(reason || "No especificada").slice(0, 1000)
                });
            } catch (error) {
                if (error?.code !== 11000) throw error;
            }

            const total = await countWarnings(guild.id, moderator.id);
            if (!Number.isSafeInteger(total) || total < 0) return false;
            await trackProgress(guild, moderator, "warns_issued", total, { absolute: true });
            return true;
        } catch (error) {
            console.warn("[Achievements] No se pudo guardar la advertencia:", error.message);
            return false;
        }
    };
}

async function recordWarningAchievement(interaction, targetUser, reason = "No especificada") {
    const ModerationWarning = require("../Models/ModerationWarning");
    const { trackAchievementProgress } = require("./achievementTracker");
    const tracker = createWarningAchievementMetricTracker({
        createWarning: data => ModerationWarning.create(data),
        countWarnings: (guildId, moderatorId) => ModerationWarning.countDocuments({ guildId, moderatorId }),
        trackProgress: (...args) => trackAchievementProgress(...args)
    });
    return tracker(interaction, targetUser, reason);
}

module.exports = {
    createWarningAchievementMetricTracker,
    recordWarningAchievement
};
