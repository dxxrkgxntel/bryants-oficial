function createSelfRoleAchievementMetricTracker({ model, trackProgress } = {}) {
    if (!model || typeof model.findOneAndUpdate !== "function" || typeof trackProgress !== "function") {
        throw new TypeError("Self-role persistence and progress callbacks are required.");
    }

    return async function recordSelfRoleSelection(guild, user, roleId) {
        if (!guild?.id || !user?.id || user.bot || !/^\d{17,20}$/.test(String(roleId || ""))) return 0;
        const update = model.findOneAndUpdate(
            { guildId: guild.id, userId: user.id },
            {
                $addToSet: { roleIds: String(roleId) },
                $setOnInsert: { guildId: guild.id, userId: user.id }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        const record = update && typeof update.lean === "function" ? await update.lean() : await update;
        const count = new Set((record?.roleIds || []).map(String)).size;
        if (count > 0) await trackProgress(guild, user, "self_roles_taken", count, { absolute: true });
        return count;
    };
}

let runtimeTracker;
async function recordSelfRoleSelection(guild, user, roleId) {
    if (!runtimeTracker) {
        const SelfRoleSelection = require("../Models/SelfRoleSelection");
        const { trackAchievementProgress } = require("./achievementTracker");
        runtimeTracker = createSelfRoleAchievementMetricTracker({
            model: SelfRoleSelection,
            trackProgress: trackAchievementProgress
        });
    }
    return runtimeTracker(guild, user, roleId);
}

module.exports = { createSelfRoleAchievementMetricTracker, recordSelfRoleSelection };
