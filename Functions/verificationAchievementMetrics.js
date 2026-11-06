function createVerificationAchievementMetricTracker({ model, trackProgress } = {}) {
    if (!model || typeof model.updateOne !== "function" || typeof trackProgress !== "function") {
        throw new TypeError("Verification persistence and progress callbacks are required.");
    }

    return async function recordVerifiedMember(guild, user, verificationConfigId = null, verifiedAt = new Date()) {
        if (!guild?.id || !user?.id || user.bot) return false;
        await model.updateOne(
            { guildId: guild.id, userId: user.id },
            {
                $setOnInsert: {
                    guildId: guild.id,
                    userId: user.id,
                    verifiedAt,
                    verificationConfigId: verificationConfigId ? String(verificationConfigId) : null
                }
            },
            { upsert: true }
        );
        await trackProgress(guild, user, "verified", 1, { absolute: true });
        return true;
    };
}

let runtimeTracker;
async function recordVerifiedMember(guild, user, verificationConfigId = null, verifiedAt = new Date()) {
    if (!runtimeTracker) {
        const VerifiedMember = require("../Models/VerifiedMember");
        const { trackAchievementProgress } = require("./achievementTracker");
        runtimeTracker = createVerificationAchievementMetricTracker({
            model: VerifiedMember,
            trackProgress: trackAchievementProgress
        });
    }
    return runtimeTracker(guild, user, verificationConfigId, verifiedAt);
}

module.exports = { createVerificationAchievementMetricTracker, recordVerifiedMember };
