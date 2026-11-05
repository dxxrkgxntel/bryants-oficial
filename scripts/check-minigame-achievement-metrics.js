const assert = require("node:assert/strict");
const {
    normalizeMiniGameResult,
    buildMiniGameStatsPipeline
} = require("../Functions/minigameAchievementMetrics");

assert.equal(normalizeMiniGameResult({ result: "win" }), "win");
assert.equal(normalizeMiniGameResult({ result: "lose" }), "lose");
assert.equal(normalizeMiniGameResult({ result: "tie" }), "tie");
assert.equal(normalizeMiniGameResult({ result: "finish" }), "finish");
assert.equal(normalizeMiniGameResult({ result: "timeout" }), null);
assert.equal(normalizeMiniGameResult({}), null);

const winPipeline = buildMiniGameStatsPipeline(true);
assert.equal(winPipeline.length, 1);
assert.deepEqual(winPipeline[0].$set.totalGames, { $add: [{ $ifNull: ["$totalGames", 0] }, 1] });
assert.deepEqual(winPipeline[0].$set.totalWins, { $add: [{ $ifNull: ["$totalWins", 0] }, 1] });
assert.deepEqual(winPipeline[0].$set.currentStreak, { $add: [{ $ifNull: ["$currentStreak", 0] }, 1] });
assert.deepEqual(winPipeline[0].$set.bestStreak, {
    $max: [{ $ifNull: ["$bestStreak", 0] }, { $add: [{ $ifNull: ["$currentStreak", 0] }, 1] }]
});

const lossPipeline = buildMiniGameStatsPipeline(false);
assert.deepEqual(lossPipeline[0].$set.totalWins, { $add: [{ $ifNull: ["$totalWins", 0] }, 0] });
assert.equal(lossPipeline[0].$set.currentStreak, 0);
assert.deepEqual(lossPipeline[0].$set.bestStreak, { $max: [{ $ifNull: ["$bestStreak", 0] }, 0] });

console.log("Mini-game achievement metrics regression checks passed.");
