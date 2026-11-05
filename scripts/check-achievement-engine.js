const assert = require("node:assert/strict");
const { achievementComparatorReached } = require("../Functions/achievementTracker");

const cases = [
    ["gte accepts equality", 10, 10, "gte", true],
    ["gte accepts greater values", 11, 10, "gte", true],
    ["gte rejects lower values", 9, 10, "gte", false],
    ["gt rejects equality", 10, 10, "gt", false],
    ["gt accepts greater values", 11, 10, "gt", true],
    ["eq accepts equality", 10, 10, "eq", true],
    ["eq rejects different values", 9, 10, "eq", false],
    ["lte accepts equality", 10, 10, "lte", true],
    ["lte accepts lower values", 9, 10, "lte", true],
    ["lte rejects greater values", 11, 10, "lte", false],
    ["lt rejects equality", 10, 10, "lt", false],
    ["lt accepts lower values", 9, 10, "lt", true],
    ["lt rejects greater values", 11, 10, "lt", false],
    ["invalid progress is rejected", Number.NaN, 10, "gte", false],
    ["unknown comparator safely defaults to gte", 10, 10, "unknown", true]
];

for (const [name, value, goal, comparator, expected] of cases) {
    assert.equal(achievementComparatorReached(value, goal, comparator), expected, name);
}

console.log(`Achievement comparator tests passed: ${cases.length} cases.`);
