function createCommandUsageRecorder(trackAchievementProgress) {
    return async function trackCommandUsage(guild, user) {
        if (!guild?.id || !user?.id || typeof trackAchievementProgress !== "function") return false;
        await trackAchievementProgress(guild, user, "commands_used", 1);
        return true;
    };
}

async function trackCommandUsage(guild, user) {
    const { trackAchievementProgress } = require("./achievementTracker");
    return createCommandUsageRecorder(trackAchievementProgress)(guild, user);
}

module.exports = { createCommandUsageRecorder, trackCommandUsage };
