function getCasinoAchievementSnapshot(stats = {}) {
    return {
        games_played: Math.max(0, Number(stats.totalGames) || 0),
        games_won: Math.max(0, Number(stats.totalWins) || 0),
        games_streak: Math.max(0, Number(stats.bestStreak ?? stats.currentStreak) || 0)
    };
}

module.exports = { getCasinoAchievementSnapshot };
