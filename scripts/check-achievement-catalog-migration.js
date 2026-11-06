const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(__dirname, "../Functions/achievementCatalogMigration.js");
const trackerPath = path.join(__dirname, "../Functions/achievementTracker.js");
const dashboardClientPath = path.join(__dirname, "../dashboard/public/server.js");
const categoryPath = path.join(__dirname, "../data/locales/achievement-categories.es.json");
const sourcePath = path.join(__dirname, "../data/backups/notoq-achievements.json");
const catalogPath = path.join(__dirname, "../data/locales/notoq-achievements.es.json");
const categories = require(categoryPath).categories;
const sourceCatalog = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const migration = fs.readFileSync(migrationPath, "utf8");
const tracker = fs.readFileSync(trackerPath, "utf8");
const dashboardClient = fs.readFileSync(dashboardClientPath, "utf8");

assert.match(migration, /filter:\s*\{\s*guildId,\s*achievementId:\s*item\.id,\s*source:\s*"notoq"/);
assert.match(migration, /\$set:\s*\{\s*name:\s*item\.name,\s*description:\s*item\.description,\s*category:\s*item\.category\s*\}/);
assert.doesNotMatch(migration, /UserAchievement|pointsEarned|unlockedLevels|unlockedAt|progress\s*:/);
assert.match(migration, /upsert:\s*false/);
assert.match(migration, /notoqCatalogLocaleVersion/);
assert.match(migration, /achievements\.length !== 397/);
assert.match(migration, /locale !== "es"/);
assert.match(tracker, /data\/locales\/notoq-achievements\.es\.json/);
assert.match(tracker, /if \(NOTOQ_BACKUP\.locale === "es"\)/);

assert.ok(dashboardClient.includes("item.categoryLabel || item.category"));

assert.equal(catalog.locale, "es");
assert.equal(catalog.achievements.length, 397);
assert.equal(sourceCatalog.achievements.length, 397);
assert.equal(Object.keys(categories).length, 23, "All 23 achievement categories need Spanish labels");

const sourceById = new Map(sourceCatalog.achievements.map(item => [item.id, item]));
const localizedIds = new Set();
for (const item of catalog.achievements) {
    assert.ok(item.id, "Achievement IDs must not be empty");
    assert.ok(!localizedIds.has(item.id), `Duplicate localized achievement ID: ${item.id}`);
    localizedIds.add(item.id);
    assert.ok(item.name?.trim(), `Missing Spanish name: ${item.id}`);
    assert.ok(item.description?.trim(), `Missing Spanish description: ${item.id}`);
    assert.ok(categories[item.category], `Missing Spanish category label: ${item.category}`);
    assert.equal(sourceById.get(item.id)?.metric, item.metric, `Metric changed for ${item.id}`);
    assert.equal(sourceById.get(item.id)?.threshold, item.threshold, `Threshold changed for ${item.id}`);
    assert.equal(sourceById.get(item.id)?.points, item.points, `Points changed for ${item.id}`);
}
assert.equal(localizedIds.size, 397);
assert.deepEqual([...localizedIds].sort(), [...sourceById.keys()].sort(), "Localized catalog must preserve every source ID");

const untranslatedTerms = /(?:^|[^A-Za-z])(?:Season|Starboard|Hall of Fame|boost|raid)(?:$|[^A-Za-z])/i;
for (const item of catalog.achievements) {
    assert.doesNotMatch(item.description, untranslatedTerms, `English wording remains in description: ${item.id}`);
}

console.log("Achievement catalog migration and localization checks passed.");
