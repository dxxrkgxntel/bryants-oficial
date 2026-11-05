const assert = require("assert");
const { createWarningAchievementMetricTracker } = require("../Functions/warningAchievementMetrics");

async function run() {
    const records = new Map();
    const calls = [];
    const tracker = createWarningAchievementMetricTracker({
        createWarning: async warning => {
            if (records.has(warning.interactionId)) {
                const error = new Error("duplicate");
                error.code = 11000;
                throw error;
            }
            records.set(warning.interactionId, warning);
        },
        countWarnings: async (guildId, moderatorId) => [...records.values()]
            .filter(item => item.guildId === guildId && item.moderatorId === moderatorId).length,
        trackProgress: async (...args) => calls.push(args)
    });

    const interaction = {
        id: "warning-interaction-1",
        guild: { id: "guild-1" },
        user: { id: "moderator-1", bot: false }
    };
    const target = { id: "target-1", bot: false };

    assert.strictEqual(await tracker(interaction, target, "Spam"), true);
    assert.strictEqual(await tracker(interaction, target, "Spam"), true);
    assert.strictEqual(records.size, 1);
    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls[0].slice(2), ["warns_issued", 1, { absolute: true }]);
    assert.strictEqual(records.get("warning-interaction-1").reason, "Spam");

    assert.strictEqual(await tracker({ ...interaction, id: "warning-interaction-2" }, { id: "bot-target", bot: true }), false);
    assert.strictEqual(await tracker({ ...interaction, id: "warning-interaction-3", guild: null }, target), false);
    assert.strictEqual(await tracker({ ...interaction, id: "warning-interaction-4", user: { id: "bot", bot: true } }, target), false);

    console.log("Warning achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
