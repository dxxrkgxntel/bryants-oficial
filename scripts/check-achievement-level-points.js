const assert = require("node:assert/strict");
const {
    parseAchievementLevelValues,
    resolveAchievementLevelPoints,
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

// An empty levelPoints string must not become [0]; it must fall back to achievement.points.
assert.deepEqual(parseAchievementLevelValues(""), []);
assert.deepEqual(parseAchievementLevelValues("   "), []);
assert.deepEqual(parseAchievementLevelValues("5, 10, 20"), [5, 10, 20]);
assert.equal(resolveAchievementLevelPoints({ levelPoints: "", levelIndex: 0, achievementPoints: 5 }), 5);
assert.equal(resolveAchievementLevelPoints({ levelPoints: "", levelIndex: 0, achievementPoints: 20 }), 20);
assert.equal(resolveAchievementLevelPoints({ levelPoints: "0, 15", levelIndex: 0, achievementPoints: 5 }), 0);
assert.equal(resolveAchievementLevelPoints({ levelPoints: "0, 15", levelIndex: 1, achievementPoints: 5 }), 15);
assert.equal(resolveAchievementLevelPoints({ levelPoints: "15", levelIndex: 1, achievementPoints: 20 }), 20);
assert.equal(resolveAchievementLevelPoints({ levelPoints: "", levelIndex: 0, achievementPoints: 20, multiplier: 0.5 }), 10);
assert.equal(resolveAchievementLevelPoints({ levelPoints: "", levelIndex: 0, achievementPoints: 20, multiplier: 0 }), 0);

console.log("Total achievement points and empty levelPoints regression checks passed.");
