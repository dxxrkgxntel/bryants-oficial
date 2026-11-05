const assert = require("assert");
const {
    completedCalendarMonths,
    createBoostAchievementMetricTracker
} = require("../Functions/boostAchievementMetrics");

async function run() {
    const jan31 = Date.UTC(2026, 0, 31, 12);
    assert.strictEqual(completedCalendarMonths(new Date(jan31), Date.UTC(2026, 1, 28, 12)), 1);
    assert.strictEqual(completedCalendarMonths(new Date(jan31), Date.UTC(2026, 1, 28, 11, 59)), 0);
    assert.strictEqual(completedCalendarMonths(new Date(Date.UTC(2026, 0, 15)), Date.UTC(2026, 4, 14)), 3);
    assert.strictEqual(completedCalendarMonths(new Date(Date.UTC(2026, 0, 15)), Date.UTC(2026, 4, 15)), 4);
    assert.strictEqual(completedCalendarMonths(null, Date.now()), null);
    assert.strictEqual(completedCalendarMonths(new Date(Date.UTC(2026, 2, 1)), Date.UTC(2026, 1, 1)), null);

    const stored = new Map();
    const calls = [];
    const fakeModel = {
        async findOneAndUpdate(filter, update) {
            const key = filter.guildId + ":" + filter.userId;
            const current = stored.get(key) || { guildId: filter.guildId, userId: filter.userId, bestMonths: 0 };
            current.bestMonths = Math.max(current.bestMonths, update.$max.bestMonths);
            stored.set(key, current);
            return { ...current };
        }
    };
    const track = createBoostAchievementMetricTracker({
        model: fakeModel,
        trackProgress: async (...args) => calls.push(args)
    });
    const guild = { id: "guild-1" };
    const member = { user: { id: "user-1" } };
    const start = new Date(Date.UTC(2026, 0, 1));

    assert.strictEqual(await track(guild, member, start, Date.UTC(2026, 2, 1)), 2);
    assert.strictEqual(await track(guild, member, start, Date.UTC(2026, 2, 15)), 2);
    assert.strictEqual(await track(guild, member, start, Date.UTC(2026, 3, 1)), 3);
    assert.strictEqual(stored.get("guild-1:user-1").bestMonths, 3);
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[0][2], "boost_months");
    assert.strictEqual(calls[0][3], 2);
    assert.strictEqual(calls[1][3], 3);
    assert(calls.every(call => call[4]?.absolute === true));

    console.log("Boost duration achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
