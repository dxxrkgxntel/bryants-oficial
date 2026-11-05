const assert = require("node:assert/strict");
const path = require("node:path");
const { normalizeSpendAmount, recordEconomySpend } = require("../Functions/economySpendMetrics");

assert.equal(normalizeSpendAmount(1250), 1250);
assert.equal(normalizeSpendAmount("250.25"), 250.25);
assert.equal(normalizeSpendAmount(0), 0);
assert.equal(normalizeSpendAmount(-10), 0);
assert.equal(normalizeSpendAmount("invalid"), 0);
assert.equal(normalizeSpendAmount(Infinity), 0);
assert.equal(normalizeSpendAmount(0.105), 0.11);

const rows = new Map();
const trackerCalls = [];
let failNextTracker = false;
const transactionModelPath = path.join(__dirname, "../Models/EconomyTransaction.js");
const trackerPath = path.join(__dirname, "../Functions/achievementTracker.js");

require.cache[transactionModelPath] = {
    id: transactionModelPath,
    filename: transactionModelPath,
    loaded: true,
    exports: {
        async updateOne(filter, update) {
            const key = [filter.guildId, filter.userId, filter.operationId].join(":");
            if (rows.has(key)) return { upsertedCount: 0 };
            rows.set(key, update.$setOnInsert);
            return { upsertedCount: 1 };
        },
        async aggregate() {
            const match = arguments[0][0].$match;
            const total = [...rows.values()]
                .filter(row => row.guildId === match.guildId && row.userId === match.userId)
                .reduce((sum, row) => sum + row.amount, 0);
            return total ? [{ _id: null, total }] : [];
        }
    }
};
require.cache[trackerPath] = {
    id: trackerPath,
    filename: trackerPath,
    loaded: true,
    exports: {
        async trackAchievementProgress(guild, user, metric, total, options) {
            if (failNextTracker) {
                failNextTracker = false;
                throw new Error("simulated tracker failure");
            }
            trackerCalls.push({ guildId: guild.id, userId: user.id, metric, total, options });
        }
    }
};

async function run() {
    const guild = { id: "guild-a" };
    const user = { id: "user-a" };

    const first = await recordEconomySpend({
        guild, user, amount: 100, category: "shop_item", operationId: "interaction-1"
    });
    assert.deepEqual(first, { recorded: true, totalSpent: 100 });

    const duplicate = await recordEconomySpend({
        guild, user, amount: 100, category: "shop_item", operationId: "interaction-1"
    });
    assert.deepEqual(duplicate, { recorded: false, totalSpent: 100 });
    assert.equal(rows.size, 1, "a repeated operation must not create another ledger row");

    const second = await recordEconomySpend({
        guild, user, amount: "25.50", category: "casino_bet", operationId: "interaction-2"
    });
    assert.deepEqual(second, { recorded: true, totalSpent: 125.5 });

    const otherUser = await recordEconomySpend({
        guild, user: { id: "user-b" }, amount: 40, category: "outgoing_transfer", operationId: "interaction-1"
    });
    assert.deepEqual(otherUser, { recorded: true, totalSpent: 40 }, "operation IDs are scoped to each user");

    failNextTracker = true;
    await assert.rejects(
        recordEconomySpend({ guild, user, amount: 10, category: "debt_payment", operationId: "interaction-3" }),
        /simulated tracker failure/
    );
    const retry = await recordEconomySpend({
        guild, user, amount: 10, category: "debt_payment", operationId: "interaction-3"
    });
    assert.deepEqual(retry, { recorded: false, totalSpent: 135.5 });
    assert.equal(rows.size, 4, "retrying after tracker failure must not duplicate the transaction");

    const callsForUser = trackerCalls.filter(call => call.userId === user.id);
    assert.deepEqual(callsForUser.map(call => call.total), [100, 100, 125.5, 135.5]);
    assert(callsForUser.every(call => call.metric === "total_spent" && call.options.absolute === true));

    const beforeInvalid = rows.size;
    const invalid = await recordEconomySpend({
        guild, user, amount: 0, category: "invalid", operationId: "interaction-invalid"
    });
    assert.deepEqual(invalid, { recorded: false, totalSpent: null });
    assert.equal(rows.size, beforeInvalid);

    console.log("Economy spend metric tests passed: normalization, per-user ledger identity, duplicate protection, cumulative totals and retry recovery.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
