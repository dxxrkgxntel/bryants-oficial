const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const catalogPath = path.join(__dirname, "../data/backups/notoq-achievements.json");
const matrixPath = path.join(__dirname, "../docs/achievement-metrics-matrix.md");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const matrix = fs.readFileSync(matrixPath, "utf8");
const excluded = ["tickets_claimed", "tickets_closed", "tickets_opened"];
const expected = [...new Set(catalog.achievements.map(item => item.metric))].filter(metric => !excluded.includes(metric)).sort();
const actual = [...matrix.matchAll(/^\|\s*\d+\s*\|\s*`([^\`]+)`\s*\|/gm)].map(match => match[1]).sort();

assert.equal(catalog.achievements.length, 397, "The imported catalog must contain 397 achievements");
assert.equal(expected.length, 103, "The active audit matrix must contain 103 metrics after excluding ticket achievements");
assert.equal(actual.length, expected.length, "The matrix must contain one row per unique metric");
assert.deepEqual(actual, expected, "The matrix metric names must match the catalog exactly");

console.log(`Achievement matrix validation passed: ${catalog.achievements.length} achievements, ${actual.length} audited metrics, and ${excluded.length} excluded ticket metrics.`);
