const assert = require("node:assert/strict");
const { createReferralAchievementMetricSync } = require("../Functions/referralAchievementMetrics");

async function run() {
    const calls = [];
    let rows = [
        { _id: { guildId: "guild-1", userId: "referrer-1" }, total: 3 },
        { _id: { guildId: "guild-2", userId: "referrer-1" }, total: 1 },
        { _id: { guildId: "guild-1", userId: "referrer-2" }, total: 0 },
        { _id: { guildId: "", userId: "referrer-3" }, total: 2 }
    ];
    const sync = createReferralAchievementMetricSync({
        ReferralModel: { aggregate: async pipeline => {
            assert.equal(pipeline[0].$group._id.guildId, "$guildId");
            assert.equal(pipeline[0].$group._id.userId, "$referrerId");
            return rows;
        } },
        trackProgress: async (...args) => calls.push(args),
        getGuild: async id => ({ id }),
        getUser: async id => ({ id }),
        getMember: async (_guild, id) => ({ user: { id } })
    });

    assert.deepEqual(await sync(), { processed: 2, skipped: 2 });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map(call => [call[0].id, call[1].id, call[2], call[3]]), [
        ["guild-1", "referrer-1", "referrals", 3],
        ["guild-2", "referrer-1", "referrals", 1]
    ]);
    assert(calls.every(call => call[4]?.absolute === true));

    calls.length = 0;
    rows = [{ _id: { guildId: "guild-1", userId: "referrer-1" }, total: 4 }];
    await sync();
    await sync();
    assert.equal(calls.length, 2);
    assert(calls.every(call => call[3] === 4 && call[4].absolute === true));

    const departedReferrerCalls = [];
    const departedReferrer = createReferralAchievementMetricSync({
        ReferralModel: { aggregate: async () => [{ _id: { guildId: "g", userId: "departed-user" }, total: 7 }] },
        trackProgress: async (...args) => departedReferrerCalls.push(args),
        getGuild: async id => ({ id }),
        getUser: async id => ({ id }),
        getMember: async () => null
    });
    assert.deepEqual(await departedReferrer(), { processed: 1, skipped: 0 });
    assert.equal(departedReferrerCalls.length, 1);
    assert.deepEqual(departedReferrerCalls[0].slice(1), [
        { id: "departed-user" },
        "referrals",
        7,
        { absolute: true }
    ]);

    const missingUser = createReferralAchievementMetricSync({
        ReferralModel: { aggregate: async () => [{ _id: { guildId: "g", userId: "missing-user" }, total: 1 }] },
        trackProgress: async (...args) => calls.push(args),
        getGuild: async id => ({ id }),
        getUser: async () => null,
        getMember: async () => null
    });
    assert.deepEqual(await missingUser(), { processed: 0, skipped: 1 });

    const failing = createReferralAchievementMetricSync({
        ReferralModel: { aggregate: async () => [{ _id: { guildId: "g", userId: "u" }, total: 1 }] },
        trackProgress: async () => { throw new Error("temporary tracker failure"); },
        getGuild: async id => ({ id }),
        getUser: async id => ({ id }),
        getMember: async (_guild, id) => ({ user: { id } })
    });
    assert.deepEqual(await failing(), { processed: 0, skipped: 1 });

    console.log("Referral achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
