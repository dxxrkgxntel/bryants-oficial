const assert = require("node:assert/strict");
const { getEconomyAchievementSnapshot } = require("../Functions/economyAchievementMetrics");

assert.deepEqual(getEconomyAchievementSnapshot({ wallet: 1500, bank: 2500, debt: 500 }), {
    coins: 1500, bank_balance: 2500, net_worth: 3500
});
assert.deepEqual(getEconomyAchievementSnapshot({ wallet: 0, bank: 100000, debt: 125000 }), {
    coins: 0, bank_balance: 100000, net_worth: 0
});
assert.deepEqual(getEconomyAchievementSnapshot({ wallet: "1200", bank: "300", debt: 0 }), {
    coins: 1200, bank_balance: 300, net_worth: 1500
});
assert.deepEqual(getEconomyAchievementSnapshot(null), {
    coins: 0, bank_balance: 0, net_worth: 0
});

console.log("Economy achievement snapshot tests passed: 4 scenarios.");
