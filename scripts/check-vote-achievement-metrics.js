const assert = require("node:assert/strict");
const { createVoteAchievementMetricSync } = require("../Functions/voteAchievementMetrics");

async function run() {
    const calls = [];
    const rows = [
        { _id: { guildId: "guild-1", userId: "user-1" }, total: 5 },
        { _id: { guildId: "guild-2", userId: "user-1" }, total: 2 },
        { _id: { guildId: "guild-1", userId: "user-2" }, total: 0 },
        { _id: { guildId: "", userId: "user-3" }, total: 1 }
    ];
    const sync = createVoteAchievementMetricSync({
        VoteModel: { aggregate: async pipeline => {
            assert.equal(pipeline[0].$group._id.guildId, "$guildId");
            assert.equal(pipeline[0].$group._id.userId, "$userId");
            return rows;
        } },
        trackProgress: async (...args) => calls.push(args),
        getGuild: async id => ({ id }),
        getMember: async (_guild, id) => ({ user: { id } })
    });

    assert.deepEqual(await sync(), { processed: 2, skipped: 2 });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map(call => [call[0].id, call[1].id, call[2], call[3]]), [
        ["guild-1", "user-1", "votes", 5],
        ["guild-2", "user-1", "votes", 2]
    ]);
    assert(calls.every(call => call[4]?.absolute === true));

    const noMember = createVoteAchievementMetricSync({
        VoteModel: { aggregate: async () => [{ _id: { guildId: "g", userId: "u" }, total: 1 }] },
        trackProgress: async (...args) => calls.push(args),
        getGuild: async id => ({ id }),
        getMember: async () => null
    });
    assert.deepEqual(await noMember(), { processed: 0, skipped: 1 });

    const failing = createVoteAchievementMetricSync({
        VoteModel: { aggregate: async () => [{ _id: { guildId: "g", userId: "u" }, total: 1 }] },
        trackProgress: async () => { throw new Error("temporary tracker failure"); },
        getGuild: async id => ({ id }),
        getMember: async (_guild, id) => ({ user: { id } })
    });
    assert.deepEqual(await failing(), { processed: 0, skipped: 1 });

    console.log("Vote achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
