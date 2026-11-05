const assert = require("node:assert/strict");
const { createAssistantAchievementMetricSync } = require("../Functions/assistantAchievementMetrics");

async function run() {
    const calls = [];
    let rows = [{
        _id: { guildId: "guild-1", userId: "user-1" },
        ai_conversations: 2,
        ai_messages: 8,
        questions_asked: 4
    }];
    const sync = createAssistantAchievementMetricSync({
        UsageModel: { aggregate: async pipeline => {
            const group = pipeline[0].$group;
            assert.equal(group._id.guildId, "$guildId");
            assert.equal(group._id.userId, "$userId");
            assert.deepEqual(group.ai_conversations, { $sum: { $cond: ["$conversationStarted", 1, 0] } });
            assert.deepEqual(group.ai_messages, { $sum: { $add: ["$userMessages", "$assistantMessages"] } });
            assert.deepEqual(group.questions_asked, { $sum: "$userMessages" });
            return rows;
        } },
        trackProgress: async (...args) => calls.push(args),
        getGuild: async id => ({ id }),
        getMember: async (_guild, id) => ({ user: { id } })
    });

    assert.deepEqual(await sync(), { processed: 1, skipped: 0 });
    assert.deepEqual(calls.map(call => [call[2], call[3], call[4]?.absolute]), [
        ["ai_conversations", 2, true],
        ["ai_messages", 8, true],
        ["questions_asked", 4, true]
    ]);

    calls.length = 0;
    await sync();
    assert.equal(calls.length, 3);
    assert(calls.every(call => call[4]?.absolute === true));

    const noMember = createAssistantAchievementMetricSync({
        UsageModel: { aggregate: async () => [{ _id: { guildId: "g", userId: "u" }, ai_conversations: 1, ai_messages: 2, questions_asked: 1 }] },
        trackProgress: async (...args) => calls.push(args),
        getGuild: async id => ({ id }),
        getMember: async () => null
    });
    assert.deepEqual(await noMember(), { processed: 0, skipped: 1 });

    const failing = createAssistantAchievementMetricSync({
        UsageModel: { aggregate: async () => [{ _id: { guildId: "g", userId: "u" }, ai_conversations: 1, ai_messages: 2, questions_asked: 1 }] },
        trackProgress: async () => { throw new Error("temporary tracker failure"); },
        getGuild: async id => ({ id }),
        getMember: async (_guild, id) => ({ user: { id } })
    });
    assert.deepEqual(await failing(), { processed: 0, skipped: 1 });

    console.log("Assistant achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
