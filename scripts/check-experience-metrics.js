const assert = require("node:assert/strict");
const path = require("node:path");
const {
    normalizeExperienceAmount,
    recordExperience,
    createExperienceMetricSync
} = require("../Functions/experienceMetrics");

assert.equal(normalizeExperienceAmount(1250), 1250);
assert.equal(normalizeExperienceAmount("25.5"), 25.5);
assert.equal(normalizeExperienceAmount(0), 0);
assert.equal(normalizeExperienceAmount(-1), 0);
assert.equal(normalizeExperienceAmount(Infinity), 0);
assert.equal(normalizeExperienceAmount(0.105), 0.11);

const rows = new Map();
const trackerCalls = [];
const modelPath = path.join(__dirname, "../Models/ExperienceTransaction.js");
const trackerPath = path.join(__dirname, "../Functions/achievementTracker.js");
const fakeModel = {
    async updateOne(filter, update) {
        const key = [filter.guildId, filter.userId, filter.operationId].join(":");
        if (rows.has(key)) return { upsertedCount: 0 };
        rows.set(key, update.$setOnInsert);
        return { upsertedCount: 1 };
    },
    async aggregate(pipeline) {
        const match = pipeline[0]?.$match;
        if (match) {
            const total = [...rows.values()]
                .filter(row => row.guildId === match.guildId && row.userId === match.userId)
                .reduce((sum, row) => sum + row.amount, 0);
            return total ? [{ _id: null, total }] : [];
        }
        const grouped = new Map();
        for (const row of rows.values()) {
            const key = [row.guildId, row.userId].join(":");
            grouped.set(key, (grouped.get(key) || 0) + row.amount);
        }
        return [...grouped].map(([key, total]) => {
            const [guildId, userId] = key.split(":");
            return { _id: { guildId, userId }, total };
        });
    }
};
require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: fakeModel };
require.cache[trackerPath] = {
    id: trackerPath, filename: trackerPath, loaded: true,
    exports: {
        async trackAchievementProgress(guild, user, metric, total, options) {
            trackerCalls.push({ guildId: guild.id, userId: user.id, metric, total, options });
        }
    }
};

async function run() {
    const guild = { id: "guild-a" }, user = { id: "user-a" };
    assert.deepEqual(await recordExperience({
        guild, user, amount: 100, category: "message_xp", operationId: "message:1"
    }), { recorded: true, totalXp: 100 });
    assert.deepEqual(await recordExperience({
        guild, user, amount: 100, category: "message_xp", operationId: "message:1"
    }), { recorded: false, totalXp: 100 });
    assert.deepEqual(await recordExperience({
        guild, user, amount: 25, category: "voice_xp", operationId: "voice:1"
    }), { recorded: true, totalXp: 125 });
    assert.deepEqual(await recordExperience({
        guild, user, amount: 50, category: "achievement_reward_xp", operationId: "achievement:1", syncProgress: false
    }), { recorded: true, totalXp: 175 });
    assert.deepEqual(await recordExperience({
        guild, user: { id: "user-b" }, amount: 40, category: "message_xp", operationId: "message:1"
    }), { recorded: true, totalXp: 40 });
    assert.equal(rows.size, 4, "duplicate XP events must not duplicate the ledger");

    const syncCalls = [];
    const sync = createExperienceMetricSync({
        ExperienceModel: fakeModel,
        trackProgress: async (...args) => syncCalls.push(args),
        getGuild: async id => ({ id }),
        getMember: async (_guild, id) => ({ user: { id } })
    });
    assert.deepEqual(await sync(), { processed: 2, skipped: 0 });
    assert.deepEqual(syncCalls.map(args => args[3]).sort((a, b) => a - b), [40, 175]);
    assert(syncCalls.every(args => args[2] === "xp" && args[4].absolute === true));
    assert(trackerCalls.every(call => call.metric === "xp" && call.options.absolute === true));

    console.log("XP metric tests passed: normalization, idempotency, per-user totals, deferred sync and recovery.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
