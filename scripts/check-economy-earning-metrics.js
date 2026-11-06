const assert = require("node:assert/strict");
const path = require("node:path");
const {
    normalizeEarningAmount,
    recordEconomyEarning,
    createTotalEarnedMetricSync
} = require("../Functions/economyEarningMetrics");

assert.equal(normalizeEarningAmount(1250), 1250);
assert.equal(normalizeEarningAmount("250.25"), 250.25);
assert.equal(normalizeEarningAmount(0), 0);
assert.equal(normalizeEarningAmount(-1), 0);
assert.equal(normalizeEarningAmount(Infinity), 0);
assert.equal(normalizeEarningAmount(0.105), 0.11);

const rows = new Map();
const trackerCalls = [];
const modelPath = path.join(__dirname, "../Models/EconomyEarningTransaction.js");
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
    assert.deepEqual(await recordEconomyEarning({
        guild, user, amount: 100, category: "daily_reward", operationId: "daily:1"
    }), { recorded: true, totalEarned: 100 });
    assert.deepEqual(await recordEconomyEarning({
        guild, user, amount: 100, category: "daily_reward", operationId: "daily:1"
    }), { recorded: false, totalEarned: 100 });
    assert.deepEqual(await recordEconomyEarning({
        guild, user, amount: 25.5, category: "work_reward", operationId: "work:2"
    }), { recorded: true, totalEarned: 125.5 });
    assert.deepEqual(await recordEconomyEarning({
        guild, user: { id: "user-b" }, amount: 50, category: "referral_reward", operationId: "ref:1"
    }), { recorded: true, totalEarned: 50 });
    assert.equal(rows.size, 3, "duplicate operation IDs must not duplicate earnings");

    const syncCalls = [];
    const sync = createTotalEarnedMetricSync({
        EarningModel: fakeModel,
        trackProgress: async (...args) => syncCalls.push(args),
        getGuild: async id => ({ id }),
        getMember: async (_guild, id) => ({ user: { id } })
    });
    const syncResult = await sync();
    assert.deepEqual(syncResult, { processed: 2, skipped: 0 });
    assert.deepEqual(syncCalls.map(args => args[3]).sort((a, b) => a - b), [50, 125.5]);
    assert(syncCalls.every(args => args[2] === "total_earned" && args[4].absolute === true));
    assert(trackerCalls.every(call => call.metric === "total_earned" && call.options.absolute === true));

    console.log("Economy earned metric tests passed: normalization, idempotency, per-user totals and retryable sync.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
