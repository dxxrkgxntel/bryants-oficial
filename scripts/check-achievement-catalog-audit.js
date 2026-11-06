const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "audit-achievement-catalog.js"), "utf8");

assert.match(source, /mode:\s*"READ_ONLY"/);
assert.match(source, /process\.env\.MONGODB_URI/);
assert.match(source, /process\.env\.DATABASE_URL/);
assert.match(source, /secondaryPreferred/);
assert.match(source, /EXPECTED_COUNT\s*=\s*397/);
assert.match(source, /Achievement\.distinct/);
assert.match(source, /missingIds/);
assert.match(source, /unexpectedIds/);
assert.match(source, /duplicateAchievementIds/);
assert.match(source, /metadataDifferenceCount/);
assert.match(source, /notoqCatalogLocaleVersion/);
assert.match(source, /UserAchievement\.aggregate/);
assert.match(source, /pointsEarned/);
assert.match(source, /unlockedLevels/);
assert.match(source, /\$isArray/);
assert.match(source, /checks\.seeded/);
assert.match(source, /mongoose\.disconnect/);
assert.match(source, /require\.main\s*===\s*module/);

console.log("Read-only achievement catalog audit checks passed.");
