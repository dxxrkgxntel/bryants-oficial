const assert = require("assert");
const {
    DAY_MS,
    wholeDaysSince,
    getAssignableRoleCount,
    buildMemberAchievementMetrics,
    createMemberAchievementMetricTracker
} = require("../Functions/memberAchievementMetrics");

async function run() {
    const now = Date.UTC(2026, 10, 5, 12);
    assert.strictEqual(wholeDaysSince(new Date(now - 10 * DAY_MS - 1), now), 10);
    assert.strictEqual(wholeDaysSince(new Date(now + DAY_MS), now), 0);
    assert.strictEqual(wholeDaysSince("not-a-date", now), null);

    const member = {
        guild: { id: "guild-1" },
        joinedAt: new Date(now - 30 * DAY_MS),
        roles: {
            cache: new Map([
                ["everyone", { id: "guild-1", managed: false }],
                ["role-a", { id: "role-a", managed: false }],
                ["role-b", { id: "role-b", managed: false }],
                ["bot-role", { id: "bot-role", managed: true }]
            ])
        }
    };
    assert.strictEqual(getAssignableRoleCount(member), 2);
    assert.strictEqual(getAssignableRoleCount({}), null);

    const metrics = buildMemberAchievementMetrics({
        user: { id: "user-1", createdAt: new Date(now - 100 * DAY_MS) },
        member,
        now
    });
    assert.deepStrictEqual(metrics, {
        account_age_days: 100,
        membership_days: 30,
        roles_count: 2
    });

    const calls = [];
    const track = createMemberAchievementMetricTracker({
        trackProgress: async (...args) => calls.push(args)
    });
    await track({ id: "guild-1" }, { id: "user-1", createdAt: new Date(now - 100 * DAY_MS) }, member, now);
    assert.strictEqual(calls.length, 3);
    assert.deepStrictEqual(calls.map(call => call[2]), ["account_age_days", "membership_days", "roles_count"]);
    assert(calls.every(call => call[4]?.absolute === true));
    assert.deepStrictEqual(await track(null, { id: "user-1" }, member, now), {});

    console.log("Member age and role achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
