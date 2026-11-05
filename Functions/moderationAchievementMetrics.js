function createModerationAchievementMetricTracker({ createAction, countActions, trackProgress }) {
    if (typeof createAction !== "function" || typeof countActions !== "function" || typeof trackProgress !== "function") {
        throw new TypeError("Moderation achievement tracker dependencies are required.");
    }

    return async function recordModerationAchievementAction(interaction, action, targetUser = null) {
        const guild = interaction?.guild;
        const moderator = interaction?.user;
        const interactionId = interaction?.id;
        const validActions = new Set(["ban", "unban", "kick", "mute", "unmute", "purge"]);
        if (!guild?.id || !moderator?.id || moderator.bot || typeof interactionId !== "string" || !validActions.has(action)) {
            return false;
        }

        try {
            try {
                await createAction({
                    guildId: guild.id,
                    userId: moderator.id,
                    interactionId,
                    action,
                    targetId: typeof targetUser?.id === "string" ? targetUser.id : null
                });
            } catch (error) {
                if (error?.code !== 11000) throw error;
            }

            const total = await countActions(guild.id, moderator.id);
            if (!Number.isSafeInteger(total) || total < 0) return false;
            await trackProgress(guild, moderator, "mod_actions", total, { absolute: true });
            return true;
        } catch (error) {
            console.warn("[Achievements] No se pudo registrar la acción de moderación:", error.message);
            return false;
        }
    };
}

async function recordModerationAchievementAction(interaction, action, targetUser = null) {
    const ModerationAchievementAction = require("../Models/ModerationAchievementAction");
    const { trackAchievementProgress } = require("./achievementTracker");
    const tracker = createModerationAchievementMetricTracker({
        createAction: data => ModerationAchievementAction.create(data),
        countActions: (guildId, userId) => ModerationAchievementAction.countDocuments({ guildId, userId }),
        trackProgress: (...args) => trackAchievementProgress(...args)
    });
    return tracker(interaction, action, targetUser);
}

module.exports = {
    createModerationAchievementMetricTracker,
    recordModerationAchievementAction
};
