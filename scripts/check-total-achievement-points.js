const assert = require("node:assert/strict");
const {
    buildTotalAchievementPointsPipeline,
    normalizeTotalAchievementPoints
} = require("../Functions/achievementPoints");

assert.deepEqual(buildTotalAchievementPointsPipeline("guild-1", "user-1"), [
    { $match: { guildId: "guild-1", userId: "user-1" } },
    { $group: { _id: null, totalPoints: { $sum: "$pointsEarned" } } }
]);
assert.equal(normalizeTotalAchievementPoints({ totalPoints: 525 }), 525);
assert.equal(normalizeTotalAchievementPoints({ totalPoints: "120" }), 120);
assert.equal(normalizeTotalAchievementPoints({ totalPoints: -5 }), 0);
assert.equal(normalizeTotalAchievementPoints(null), 0);

console.log("Total achievement points regression checks passed.");
