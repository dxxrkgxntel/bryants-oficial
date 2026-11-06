const assert = require("node:assert/strict");
const { createGiveawayAchievementMetricSync } = require("../Functions/giveawayAchievementMetrics");

async function main() {
    const rows = {
        created: [{ _id: { guildId: "guild-1", userId: "creator-1" }, total: 2 }],
        entrants: [{ _id: { guildId: "guild-1", userId: "entrant-1" }, total: 3 }],
        winners: [{ _id: { guildId: "guild-1", userId: "winner-1" }, total: 1 }]
    };
    const model = {
        async aggregate(pipeline) {
            if (pipeline.some(stage => stage.$unwind === "$entrants")) return rows.entrants;
            if (pipeline.some(stage => stage.$unwind === "$winnerIds")) return rows.winners;
            return rows.created;
        }
    };
    const tracked = [];
    const sync = createGiveawayAchievementMetricSync({
        GiveawayModel: model,
        trackProgress: async (...args) => tracked.push(args),
        getGuild: async id => ({ id }),
        getMember: async (_guild, userId) => ({ user: { id: userId } })
    });
    const result = await sync();
    assert.deepEqual(result, { processed: 3, skipped: 0 });
    assert.deepEqual(tracked.map(call => [call[2], call[3], call[4]?.absolute]), [
        ["giveaways_created", 2, true],
        ["giveaways_entered", 3, true],
        ["giveaways_won", 1, true]
    ]);
    const emptySync = createGiveawayAchievementMetricSync({
        GiveawayModel: { aggregate: async () => [{ _id: { guildId: "guild-1", userId: "missing" }, total: 0 }] },
        trackProgress: async () => { throw new Error("zero totals must not be tracked"); },
        getGuild: async id => ({ id }),
        getMember: async (_guild, id) => ({ user: { id } })
    });
    assert.deepEqual(await emptySync(), { processed: 0, skipped: 3 });
    console.log("Giveaway achievement metrics validation passed.");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
