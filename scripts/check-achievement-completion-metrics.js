const assert = require("assert");
const { createAchievementCompletionRecorder } = require("../Functions/achievementCompletionMetrics");

async function run() {
    const progressCalls = [];
    const firstUnlockCalls = [];
    const recorder = createAchievementCompletionRecorder({
        trackProgress: async (...args) => progressCalls.push(args),
        recordFirstUnlock: async value => {
            firstUnlockCalls.push(value);
            return value.achievementId !== "already-claimed";
        }
    });

    const result = await recorder({
        guild: { id: "guild-1" },
        user: { id: "user-1" },
        achievementIds: ["alpha", "alpha", "already-claimed", "beta", ""]
    });

    assert.deepStrictEqual(result, { completed: 3, firstUnlocks: 2 });
    assert.strictEqual(progressCalls.length, 1);
    assert.strictEqual(progressCalls[0][2], "achievements_unlocked");
    assert.strictEqual(progressCalls[0][3], 3);
    assert.deepStrictEqual(firstUnlockCalls.map(value => value.achievementId), ["alpha", "already-claimed", "beta"]);

    const invalid = await recorder({ guild: null, user: { id: "user-1" }, achievementIds: ["alpha"] });
    assert.deepStrictEqual(invalid, { completed: 0, firstUnlocks: 0 });
    const empty = await recorder({ guild: { id: "guild-1" }, user: { id: "user-1" }, achievementIds: [] });
    assert.deepStrictEqual(empty, { completed: 0, firstUnlocks: 0 });
    assert.strictEqual(progressCalls.length, 1);

    console.log("Achievement completion metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
