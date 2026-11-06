const assert = require("assert");
const { createSelfRoleAchievementMetricTracker } = require("../Functions/selfRoleAchievementMetrics");
const { createVerificationAchievementMetricTracker } = require("../Functions/verificationAchievementMetrics");
const { achievementProgressUpdate } = require("../Functions/achievementRules");
const { wholeDaysSince, DAY_MS } = require("../Functions/memberAchievementMetrics");
const { completedCalendarMonths, resolvePremiumSince } = require("../Functions/boostAchievementMetrics");

async function run() {
    const roleRecords = new Map();
    const roleCalls = [];
    const roleModel = {
        async findOneAndUpdate(filter, update) {
            const key = filter.guildId + ":" + filter.userId;
            const current = roleRecords.get(key) || { guildId: filter.guildId, userId: filter.userId, roleIds: [] };
            for (const roleId of update.$addToSet.roleIds ? [update.$addToSet.roleIds] : []) {
                if (!current.roleIds.includes(roleId)) current.roleIds.push(roleId);
            }
            roleRecords.set(key, current);
            return { ...current, roleIds: [...current.roleIds] };
        }
    };
    const recordRole = createSelfRoleAchievementMetricTracker({
        model: roleModel,
        trackProgress: async (...args) => roleCalls.push(args)
    });
    const guild = { id: "guild-123" };
    const user = { id: "12345678901234567", bot: false };
    assert.strictEqual(await recordRole(guild, user, "22345678901234567"), 1);
    assert.strictEqual(await recordRole(guild, user, "22345678901234567"), 1);
    assert.strictEqual(await recordRole(guild, user, "32345678901234567"), 2);
    assert.strictEqual(roleCalls.length, 3);
    assert(roleCalls.every(call => call[2] === "self_roles_taken" && call[4].absolute === true));
    assert.strictEqual(await recordRole(guild, { ...user, bot: true }, "42345678901234567"), 0);

    const verified = new Set();
    const verificationCalls = [];
    const verificationModel = {
        async updateOne(filter) { verified.add(filter.guildId + ":" + filter.userId); }
    };
    const recordVerified = createVerificationAchievementMetricTracker({
        model: verificationModel,
        trackProgress: async (...args) => verificationCalls.push(args)
    });
    assert.strictEqual(await recordVerified(guild, user, "verification-config-a"), true);
    assert.strictEqual(await recordVerified(guild, user, "verification-config-a"), true);
    assert.strictEqual(verified.size, 1);
    assert.strictEqual(verificationCalls.length, 2);
    assert(verificationCalls.every(call => call[2] === "verified" && call[3] === 1 && call[4].absolute === true));
    assert.strictEqual(await recordVerified(guild, { ...user, bot: true }), false);

    const now = Date.UTC(2026, 10, 6, 12);
    const joinedAgain = new Date(now - 2 * DAY_MS);
    assert.strictEqual(wholeDaysSince(joinedAgain, now), 2);
    assert.deepStrictEqual(achievementProgressUpdate(2, true), { $max: { progress: 2 } });
    assert.deepStrictEqual(achievementProgressUpdate(365, true), { $max: { progress: 365 } });

    const boostStart = new Date(Date.UTC(2026, 0, 31, 12));
    assert.strictEqual(resolvePremiumSince({ premiumSince: boostStart }, { premiumSince: null }), boostStart);
    assert.strictEqual(resolvePremiumSince({ premiumSince: boostStart }, { premiumSince: new Date(Date.UTC(2026, 1, 1)) }).getTime(), Date.UTC(2026, 1, 1));
    assert.strictEqual(completedCalendarMonths(boostStart, Date.UTC(2026, 1, 28, 12)), 1);
    assert.strictEqual(completedCalendarMonths(boostStart, Date.UTC(2026, 1, 28, 11, 59)), 0);

    console.log("Community achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
