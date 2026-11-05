function createAchievementCompletionRecorder({ trackProgress, recordFirstUnlock } = {}) {
    if (typeof trackProgress !== "function" || typeof recordFirstUnlock !== "function") {
        throw new TypeError("Achievement completion callbacks are required.");
    }

    return async function recordAchievementCompletions({ guild, user, achievementIds = [] } = {}) {
        if (!guild?.id || !user?.id) return { completed: 0, firstUnlocks: 0 };
        const ids = [...new Set(achievementIds.filter(id => typeof id === "string" && id.trim()))];
        if (!ids.length) return { completed: 0, firstUnlocks: 0 };

        // One completion event per achievement, not one event per tier.
        await trackProgress(guild, user, "achievements_unlocked", ids.length);
        let firstUnlocks = 0;
        for (const achievementId of ids) {
            if (await recordFirstUnlock({
                guildId: guild.id,
                userId: user.id,
                achievementId,
                guild,
                user
            })) firstUnlocks += 1;
        }
        return { completed: ids.length, firstUnlocks };
    };
}

module.exports = { createAchievementCompletionRecorder };
