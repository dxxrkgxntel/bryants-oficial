const assert = require("node:assert/strict");
const {
    normalizeMiniGameResult,
    buildMiniGameStatsPipeline
} = require("../Functions/minigameAchievementMetrics");
const { getCasinoAchievementSnapshot } = require("../Functions/casinoAchievementMetrics");

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

assert.deepEqual(
    getCasinoAchievementSnapshot(
        { totalGames: 10, totalWins: 6, bestStreak: 3 },
        { totalGames: 5, totalWins: 2, bestStreak: 4 }
    ),
    { games_played: 15, games_won: 8, games_streak: 4 }
);

console.log("Mini-game achievement metrics regression checks passed.");
