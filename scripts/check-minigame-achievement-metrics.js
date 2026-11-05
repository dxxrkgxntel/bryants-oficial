const assert = require("node:assert/strict");
const {
    normalizeMiniGameResult,
    extractMiniGameGuessCount,
    isPerfectMiniGame,
    buildMiniGameStatsPipeline
} = require("../Functions/minigameAchievementMetrics");
const { getCasinoAchievementSnapshot } = require("../Functions/casinoAchievementMetrics");

assert.equal(normalizeMiniGameResult({ result: "win" }), "win");
assert.equal(normalizeMiniGameResult({ result: "lose" }), "lose");
assert.equal(normalizeMiniGameResult({ result: "tie" }), "tie");
assert.equal(normalizeMiniGameResult({ result: "finish" }), "finish");
assert.equal(normalizeMiniGameResult({ result: "timeout" }), null);
assert.equal(normalizeMiniGameResult({}), null);

assert.equal(extractMiniGameGuessCount({ guessed: ["casa", "perro"] }), 2);
assert.equal(extractMiniGameGuessCount({ turns: 4 }), 4);
assert.equal(extractMiniGameGuessCount({ tilesTurned: 8 }), 8);
assert.equal(extractMiniGameGuessCount({ blocksTurned: 6 }), 6);
assert.equal(extractMiniGameGuessCount({ selected: "answer" }), 1);
assert.equal(extractMiniGameGuessCount({ selectedEmoji: "🍉" }), 1);
assert.equal(extractMiniGameGuessCount({ result: "lose" }), 0);

assert.equal(isPerfectMiniGame({ guessed: ["casa"] }, "win"), true);
assert.equal(isPerfectMiniGame({ guessed: ["casa", "perro"] }, "win"), false);
assert.equal(isPerfectMiniGame({ guessed: ["a"], damage: 0 }, "win"), true);
assert.equal(isPerfectMiniGame({ guessed: ["a", "b"], damage: 1 }, "win"), false);
assert.equal(isPerfectMiniGame({ selectedEmoji: "🍉", correctEmoji: "🍉" }, "win"), true);
assert.equal(isPerfectMiniGame({ selectedEmoji: "🍉", correctEmoji: "🍇" }, "win"), false);
assert.equal(isPerfectMiniGame({ selected: "correct answer" }, "win"), true);
assert.equal(isPerfectMiniGame({ blocksTurned: 20 }, "win"), true);
assert.equal(isPerfectMiniGame({ blocksTurned: 20 }, "lose"), false);
assert.equal(isPerfectMiniGame({ turns: 2 }, "win"), false);

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
