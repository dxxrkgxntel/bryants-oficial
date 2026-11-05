const assert = require("node:assert/strict");
const { createCommandUsageRecorder } = require("../Functions/commandAchievementMetrics");

(async () => {
    const calls = [];
    const record = createCommandUsageRecorder(async (...args) => calls.push(args));

    assert.equal(await record(null, { id: "user-1" }), false);
    assert.equal(await record({ id: "guild-1" }, null), false);
    assert.equal(await record({ id: "guild-1" }, { id: "user-1" }), true);
    assert.deepEqual(calls, [[{ id: "guild-1" }, { id: "user-1" }, "commands_used", 1]]);

    console.log("Command usage achievement metric regression checks passed.");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
