const MiniGameStats = require("../Models/MiniGameStats");
const { trackAchievementProgress } = require("./achievementTracker");

function normalizeMiniGameResult(result) {
    const status = typeof result?.result === "string" ? result.result.toLowerCase() : "";
    if (status === "win") return "win";
    if (status === "lose") return "lose";
    if (status === "tie") return "tie";
    if (status === "finish") return "finish";
    return null;
}

function buildMiniGameStatsPipeline(won) {
    const nextStreak = won
        ? { $add: [{ $ifNull: ["$currentStreak", 0] }, 1] }
        : 0;
    return [{
        $set: {
            totalGames: { $add: [{ $ifNull: ["$totalGames", 0] }, 1] },
            totalWins: { $add: [{ $ifNull: ["$totalWins", 0] }, won ? 1 : 0] },
            currentStreak: nextStreak,
            bestStreak: { $max: [{ $ifNull: ["$bestStreak", 0] }, nextStreak] }
        }
    }];
}

async function recordPlayerResult(guild, user, outcome) {
    if (!guild?.id || !user?.id || user.bot || !["win", "lose", "tie", "finish"].includes(outcome)) return null;

    const stats = await MiniGameStats.findOneAndUpdate(
        { guildId: guild.id, userId: user.id },
        buildMiniGameStatsPipeline(outcome === "win"),
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const updates = [
        trackAchievementProgress(guild, user, "games_played", 1),
        trackAchievementProgress(guild, user, "games_streak", stats.bestStreak, { absolute: true })
    ];
    if (outcome === "win") updates.push(trackAchievementProgress(guild, user, "games_won", 1));

    await Promise.all(updates.map(promise => promise.catch(error => {
        console.warn("[Achievements] No se pudieron actualizar las métricas de minijuegos:", error.message);
    })));
    return stats;
}

async function recordSinglePlayerGame(guild, user, result) {
    const outcome = normalizeMiniGameResult(result);
    if (!outcome) return null;
    return recordPlayerResult(guild, user, outcome);
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
    recordSinglePlayerGame,
    recordMultiplayerGame
};
