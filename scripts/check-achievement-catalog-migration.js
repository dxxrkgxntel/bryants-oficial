const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(__dirname, "../Functions/achievementCatalogMigration.js");
const source = fs.readFileSync(migrationPath, "utf8");

assert.match(source, /filter:\s*\{\s*guildId,\s*achievementId:\s*item\.id,\s*source:\s*"notoq"/);
assert.match(source, /\$set:\s*\{\s*name:\s*item\.name,\s*description:\s*item\.description,\s*category:\s*item\.category\s*\}/);
assert.doesNotMatch(source, /UserAchievement|pointsEarned|unlockedLevels|unlockedAt|progress\s*:/);
assert.match(source, /upsert:\s*false/);
assert.match(source, /notoqCatalogLocaleVersion/);
assert.match(source, /achievements\.length !== 397/);
assert.match(source, /catalog/);
assert.match(source, /locale !== "es"/);

console.log("Achievement catalog migration safety checks passed.");
