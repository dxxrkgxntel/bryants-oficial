function createSelfRoleAchievementMetricTracker({ model, trackProgress } = {}) {
    if (!model || typeof model.findOneAndUpdate !== "function" || typeof trackProgress !== "function") {
        throw new TypeError("Self-role persistence and progress callbacks are required.");
    }

    return async function recordSelfRoleSelection(guild, user, roleId) {
        if (!guild?.id || !user?.id || user.bot || !/^\d{17,20}$/.test(String(roleId || ""))) return 0;
        const filter = { guildId: guild.id, userId: user.id };
        const update = {
            $addToSet: { roleIds: String(roleId) },
            $setOnInsert: { guildId: guild.id, userId: user.id }
        };
        let query;
        try {
            query = model.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
        } catch (error) {
            if (error.code !== 11000) throw error;
            query = model.findOneAndUpdate(filter, update, { new: true });
        }
        let record;
        try {
            record = query && typeof query.lean === "function" ? await query.lean() : await query;
        } catch (error) {
            if (error.code !== 11000) throw error;
            const retry = model.findOneAndUpdate(filter, update, { new: true });
            record = retry && typeof retry.lean === "function" ? await retry.lean() : await retry;
        }
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
