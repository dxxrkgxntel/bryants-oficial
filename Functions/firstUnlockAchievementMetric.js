function createFirstUnlockRecorder({ model, onFirstUnlock } = {}) {
    if (!model || typeof model.updateOne !== "function") {
        throw new TypeError("A first-unlock persistence model is required.");
    }

    return async function recordFirstUnlock({ guildId, userId, achievementId, guild, user } = {}) {
        if (![guildId, userId, achievementId].every(value => typeof value === "string" && value.trim())) {
            return false;
        }

        try {
            const result = await model.updateOne(
                { guildId, achievementId },
                {
                    $setOnInsert: {
                        guildId,
                        achievementId,
                        userId,
                        unlockedAt: new Date()
                    }
                },
                { upsert: true }
            );
            const claimed = result?.upsertedCount === 1 || Boolean(result?.upsertedId);
            if (!claimed) return false;

            if (typeof onFirstUnlock === "function") {
                await onFirstUnlock({ guildId, userId, achievementId, guild, user });
            }
            return true;
        } catch (error) {
            // A concurrent insert for the same guild/achievement means another member won.
            if (error?.code === 11000) return false;
            throw error;
        }
    };
}

async function recordFirstAchievementUnlock(args = {}) {
    // Load Mongoose only in the live persistence path; regression tests inject a fake model.
    const AchievementFirstUnlock = require("../Models/AchievementFirstUnlock");
    const record = createFirstUnlockRecorder({
        model: AchievementFirstUnlock,
        onFirstUnlock: async ({ guild, user }) => {
            if (!guild?.id || !user?.id) return;
            const { trackAchievementProgress } = require("./achievementTracker");
            await trackAchievementProgress(guild, user, "first_unlocks", 1);
        }
    });
    return record(args);
}

module.exports = {
    createFirstUnlockRecorder,
    recordFirstAchievementUnlock
};
