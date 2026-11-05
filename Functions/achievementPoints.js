function buildTotalAchievementPointsPipeline(guildId, userId) {
    return [
        { $match: { guildId, userId } },
        { $group: { _id: null, totalPoints: { $sum: "$pointsEarned" } } }
    ];
}

function normalizeTotalAchievementPoints(result) {
    return Math.max(0, Number(result?.totalPoints) || 0);
}

module.exports = {
    buildTotalAchievementPointsPipeline,
    normalizeTotalAchievementPoints
};
