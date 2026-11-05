const assert = require("node:assert/strict");
const { normalizeSpendAmount } = require("../Functions/economySpendMetrics");

assert.equal(normalizeSpendAmount(1250), 1250);
assert.equal(normalizeSpendAmount("250.25"), 250.25);
assert.equal(normalizeSpendAmount(0), 0);
assert.equal(normalizeSpendAmount(-10), 0);
assert.equal(normalizeSpendAmount("invalid"), 0);
assert.equal(normalizeSpendAmount(Infinity), 0);
assert.equal(normalizeSpendAmount(0.105), 0.11);

console.log("Economy spend metric tests passed: 7 scenarios.");
