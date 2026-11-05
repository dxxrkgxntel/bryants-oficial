const assert = require("node:assert/strict");
const { getCasinoAchievementSnapshot } = require("../Functions/casinoAchievementMetrics");

assert.deepEqual(getCasinoAchievementSnapshot({ totalGames: 15, totalWins: 8, currentStreak: 3, bestStreak: 6 }), {
    games_played: 15, games_won: 8, games_streak: 6
});
assert.deepEqual(getCasinoAchievementSnapshot({ totalGames: 2, totalWins: 1, currentStreak: 1 }), {
    games_played: 2, games_won: 1, games_streak: 1
});
assert.deepEqual(getCasinoAchievementSnapshot({ totalGames: -2, totalWins: "4", bestStreak: -1 }), {
    games_played: 0, games_won: 4, games_streak: 0
});
assert.deepEqual(getCasinoAchievementSnapshot(null), {
    games_played: 0, games_won: 0, games_streak: 0
});

console.log("Casino achievement metric tests passed: 4 scenarios.");
