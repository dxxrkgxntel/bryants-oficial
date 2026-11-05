function activityDayKeys(date = new Date()) {
    const current = new Date(date);
    if (!Number.isFinite(current.getTime())) return null;
    const today = current.toISOString().slice(0, 10);
    const yesterday = new Date(Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate() - 1
    )).toISOString().slice(0, 10);
    return { today, yesterday };
}

function calculateActivityTransition(previous = {}, date = new Date()) {
    const keys = activityDayKeys(date);
    if (!keys) return null;
    const sameDay = previous.lastActiveDay === keys.today;
    const daysActive = Number(previous.daysActive || 0) + (sameDay ? 0 : 1);
    const currentStreak = sameDay
        ? Number(previous.currentStreak || 0)
        : previous.lastActiveDay === keys.yesterday
            ? Number(previous.currentStreak || 0) + 1
            : 1;
    const bestStreak = Math.max(Number(previous.bestStreak || 0), currentStreak);
    return {
        today: keys.today,
        daysActive,
        currentStreak,
        bestStreak,
        daysActiveProgressDelta: Math.max(0, daysActive - Number(previous.daysActiveReported ?? previous.daysActive ?? 0)),
        bestStreakProgressDelta: Math.max(0, bestStreak - Number(previous.bestStreakReported ?? previous.bestStreak ?? 0))
    };
}

module.exports = { activityDayKeys, calculateActivityTransition };
