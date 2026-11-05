function normalizeMiniGameResult(result) {
    const status = typeof result?.result === "string" ? result.result.toLowerCase() : "";
    if (status === "win") return "win";
    if (status === "lose") return "lose";
    if (status === "tie") return "tie";
    if (status === "finish") return "finish";
    return null;
}

function buildMiniGameStatsPipeline(won, gameMetrics = {}) {
    const nextStreak = won
        ? { $add: [{ $ifNull: ["$currentStreak", 0] }, 1] }
        : 0;
    return [{
        $set: {
            totalGames: { $add: [{ $ifNull: ["$totalGames", 0] }, 1] },
            totalWins: { $add: [{ $ifNull: ["$totalWins", 0] }, won ? 1 : 0] },
            currentStreak: nextStreak,
            bestStreak: { $max: [{ $ifNull: ["$bestStreak", 0] }, nextStreak] },
            totalGuesses: { $add: [{ $ifNull: ["$totalGuesses", 0] }, Math.max(0, Math.floor(Number(gameMetrics.guesses) || 0))] },
            perfectGames: { $add: [{ $ifNull: ["$perfectGames", 0] }, gameMetrics.perfect === true ? 1 : 0] }
        }
    }];
}

/** Returns only attempts explicitly exposed by Gamecord's terminal game payload. */
function extractMiniGameGuessCount(result) {
    if (!result || typeof result !== "object") return 0;
    if (Array.isArray(result.guessed)) return result.guessed.length;
    for (const key of ["turns", "tilesTurned", "blocksTurned"]) {
        const value = Number(result[key]);
        if (Number.isSafeInteger(value) && value > 0) return value;
    }
    if (result.selected !== undefined && result.selected !== null) return 1;
    if (result.selectedEmoji !== undefined && result.selectedEmoji !== null) return 1;
    return 0;
}

function isPerfectMiniGame(result, outcome) {
    if (!result || outcome !== "win") return false;
    if (Array.isArray(result.guessed)) {
        if (Number.isFinite(result.damage)) return result.damage === 0;
        return result.guessed.length === 1;
    }
    if (result.selectedEmoji !== undefined && result.correctEmoji !== undefined) {
        return result.selectedEmoji === result.correctEmoji;
    }
    if (result.selected !== undefined && result.selected !== null) return true;
    if (Number.isSafeInteger(result.blocksTurned) && result.blocksTurned > 0) return true;
    return false;
}

async function recordPlayerResult(guild, user, outcome, gameMetrics = {}) {
    const MiniGameStats = require("../Models/MiniGameStats");
    const CasinoStats = require("../Models/CasinoStats");
    const { trackAchievementProgress } = require("./achievementTracker");
    const { getCasinoAchievementSnapshot } = require("./casinoAchievementMetrics");
    if (!guild?.id || !user?.id || user.bot || !["win", "lose", "tie", "finish"].includes(outcome)) return null;

    const stats = await MiniGameStats.findOneAndUpdate(
        { guildId: guild.id, userId: user.id },
        buildMiniGameStatsPipeline(outcome === "win", gameMetrics),
        { upsert: true, new: true }
    );

    const casinoStats = await CasinoStats.findOne({ guildId: guild.id, userId: user.id }).lean();
    const snapshot = getCasinoAchievementSnapshot(casinoStats, stats);
    snapshot.game_guesses = Math.max(0, Number(stats.totalGuesses) || 0);
    snapshot.games_perfect = Math.max(0, Number(stats.perfectGames) || 0);
    const updates = Object.entries(snapshot).map(([metric, value]) =>
        trackAchievementProgress(guild, user, metric, value, { absolute: true })
    );

    await Promise.all(updates.map(promise => promise.catch(error => {
        console.warn("[Achievements] No se pudieron actualizar las métricas de minijuegos:", error.message);
    })));
    return stats;
}

async function recordSinglePlayerGame(guild, user, result) {
    const outcome = normalizeMiniGameResult(result);
    if (!outcome) return null;
    return recordPlayerResult(guild, user, outcome, {
        guesses: extractMiniGameGuessCount(result),
        perfect: isPerfectMiniGame(result, outcome)
    });
}

async function recordMultiplayerGame(result) {
    const outcome = normalizeMiniGameResult(result);
    if (!outcome || outcome === "finish") return null;
    const players = [result?.player, result?.opponent].filter(player => player?.id);
    if (players.length !== 2 || players[0].id === players[1].id) return null;

    const winnerId = outcome === "win" && typeof result?.winner === "string" ? result.winner : null;
    return Promise.all(players.map(player =>
        recordPlayerResult(result.guild || result.message?.guild || null, player, winnerId
            ? (player.id === winnerId ? "win" : "lose")
            : outcome === "tie" ? "tie" : "finish")
    ));
}

module.exports = {
    normalizeMiniGameResult,
    buildMiniGameStatsPipeline,
    extractMiniGameGuessCount,
    isPerfectMiniGame,
    recordSinglePlayerGame,
    recordMultiplayerGame
};
