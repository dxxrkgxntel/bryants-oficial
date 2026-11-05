const assert = require("assert");
const { createModerationAchievementMetricTracker } = require("../Functions/moderationAchievementMetrics");

async function run() {
    const saved = new Set();
    const calls = [];
    const tracker = createModerationAchievementMetricTracker({
        createAction: async action => {
            if (saved.has(action.interactionId)) {
                const error = new Error("duplicate");
                error.code = 11000;
                throw error;
            }
            saved.add(action.interactionId);
        },
        countActions: async (guildId, userId) => saved.size,
        trackProgress: async (...args) => calls.push(args)
    });

    const interaction = {
        id: "interaction-1",
        guild: { id: "guild-1" },
        user: { id: "moderator-1", bot: false }
    };

    assert.strictEqual(await tracker(interaction, "ban", { id: "target-1" }), true);
    assert.strictEqual(await tracker(interaction, "ban", { id: "target-1" }), true);
    assert.strictEqual(saved.size, 1);
    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls[0].slice(2), ["mod_actions", 1, { absolute: true }]);

    assert.strictEqual(await tracker({ ...interaction, id: "interaction-2" }, "warn"), false);
    assert.strictEqual(await tracker({ ...interaction, id: "interaction-3", user: { id: "bot", bot: true } }, "kick"), false);
    assert.strictEqual(await tracker({ ...interaction, id: "interaction-4", guild: null }, "kick"), false);

    console.log("Moderation achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
