function parseAchievementLevelValues(value, parser = Number) {
    const source = String(value ?? "").trim();
    if (!source) return [];
    return source.split(",").map(item => parser(item.trim()));
}

function resolveAchievementLevelPoints({ levelPoints, levelIndex, achievementPoints, multiplier = 1 } = {}) {
    const parsed = parseAchievementLevelValues(levelPoints);
    const configured = parsed[levelIndex];
    const basePoints = Number.isFinite(configured) && configured >= 0
        ? configured
        : Number(achievementPoints ?? 10);
    const safeBase = Number.isFinite(basePoints) ? Math.max(0, basePoints) : 10;
    const safeMultiplier = Number.isFinite(Number(multiplier))
        ? Math.max(0, Math.min(100, Number(multiplier)))
        : 1;
    return Math.max(0, Math.round(safeBase * safeMultiplier));
}

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
    parseAchievementLevelValues,
    resolveAchievementLevelPoints,
    buildTotalAchievementPointsPipeline,
    normalizeTotalAchievementPoints
};
