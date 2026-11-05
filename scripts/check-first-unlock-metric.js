const assert = require("assert");
const { createFirstUnlockRecorder } = require("../Functions/firstUnlockAchievementMetric");

async function run() {
    const claimed = new Map();
    const callbacks = [];
    const fakeModel = {
        async updateOne(filter, update) {
            const key = filter.guildId + ":" + filter.achievementId;
            if (claimed.has(key)) return { acknowledged: true, matchedCount: 1, modifiedCount: 0, upsertedCount: 0 };
            claimed.set(key, update.$setOnInsert);
            return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
    };

    const record = createFirstUnlockRecorder({
        model: fakeModel,
        onFirstUnlock: async value => callbacks.push(value)
    });

    assert.strictEqual(await record({ guildId: "guild-1", userId: "user-a", achievementId: "first_steps" }), true);
    assert.strictEqual(await record({ guildId: "guild-1", userId: "user-b", achievementId: "first_steps" }), false);
    assert.strictEqual(await record({ guildId: "guild-1", userId: "user-b", achievementId: "chatty_100" }), true);
    assert.strictEqual(await record({ guildId: "guild-2", userId: "user-c", achievementId: "first_steps" }), true);
    assert.strictEqual(await record({ guildId: "guild-1", userId: "user-c", achievementId: "" }), false);
    assert.strictEqual(callbacks.length, 3);
    assert.strictEqual(claimed.get("guild-1:first_steps").userId, "user-a");
    assert.strictEqual(claimed.get("guild-1:chatty_100").userId, "user-b");

    const duplicateModel = {
        async updateOne() {
            const error = new Error("duplicate key");
            error.code = 11000;
            throw error;
        }
    };
    const duplicateRecord = createFirstUnlockRecorder({ model: duplicateModel });
    assert.strictEqual(await duplicateRecord({ guildId: "guild-1", userId: "user-d", achievementId: "first_steps" }), false);

    console.log("First-unlock achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
