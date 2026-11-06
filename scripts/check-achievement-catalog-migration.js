const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(__dirname, "../Functions/achievementCatalogMigration.js");
const categoryPath = path.join(__dirname, "../data/locales/achievement-categories.es.json");
const catalogPath = path.join(__dirname, "../data/backups/notoq-achievements.json");
const categories = require(categoryPath).categories;
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const source = fs.readFileSync(migrationPath, "utf8");

assert.match(source, /filter:\s*\{\s*guildId,\s*achievementId:\s*item\.id,\s*source:\s*"notoq"/);
assert.match(source, /\$set:\s*\{\s*name:\s*item\.name,\s*description:\s*item\.description,\s*category:\s*item\.category\s*\}/);
assert.doesNotMatch(source, /UserAchievement|pointsEarned|unlockedLevels|unlockedAt|progress\s*:/);
assert.match(source, /upsert:\s*false/);
assert.match(source, /notoqCatalogLocaleVersion/);
assert.match(source, /achievements\.length !== 397/);
assert.match(source, /catalog/);
assert.match(source, /locale !== "es"/);
assert.equal(Object.keys(categories).length, 23, "All 23 achievement categories need Spanish labels");
for (const category of new Set(catalog.achievements.map(item => item.category))) {
    assert.ok(categories[category], `Missing Spanish label for category: ${category}`);
}

console.log("Achievement catalog migration safety checks passed.");
