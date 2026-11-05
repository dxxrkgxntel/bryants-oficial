function normalizeSeasonKey(value) {
    const key = String(value || "").trim().toLowerCase();
    return /^[a-z0-9][a-z0-9_-]{0,79}$/.test(key) ? key : null;
}

function buildSeasonRanking(scores = []) {
    const unique = new Map();
    for (const score of Array.isArray(scores) ? scores : []) {
        const userId = String(score?.userId || "").trim();
        if (!userId || unique.has(userId)) continue;
        unique.set(userId, {
            userId,
            points: Math.max(0, Number(score.points) || 0),
            unlocks: Math.max(0, Number(score.unlocks) || 0)
        });
    }
    return [...unique.values()]
        .sort((a, b) => b.points - a.points || b.unlocks - a.unlocks || a.userId.localeCompare(b.userId))
        .map((score, index) => ({ ...score, rank: index + 1 }));
}

function buildSeasonAwardEvents(ranking = [], seasonKey) {
    const key = normalizeSeasonKey(seasonKey);
    if (!key) return [];
    const events = [];
    for (const entry of ranking) {
        if (!entry?.userId || !Number.isInteger(entry.rank) || entry.rank < 1 || entry.rank > 3) continue;
        events.push({
            userId: String(entry.userId),
            rank: entry.rank,
            metric: "season_podiums",
            idempotencyKey: `season:${key}:podium`
        });
        if (entry.rank === 1) {
            events.push({
                userId: String(entry.userId),
                rank: entry.rank,
                metric: "season_wins",
                idempotencyKey: `season:${key}:win`
            });
        }
    }
    return events;
}

module.exports = { normalizeSeasonKey, buildSeasonRanking, buildSeasonAwardEvents };
